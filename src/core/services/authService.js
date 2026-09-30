import { v4 as uuidv4 } from 'uuid'
import { getItem, removeItem, setItem } from '../../shared/utils/storage.js'
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
} from '../../shared/utils/validators.js'

const USERS_STORAGE_KEY = 'gr_users'
const CURRENT_USER_STORAGE_KEY = 'gr_current_user'

function readStoredUsers() {
  const users = getItem(USERS_STORAGE_KEY, [])
  return Array.isArray(users) ? users : []
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function normalizeUsername(username) {
  return username.trim().toLowerCase()
}

function normalizePhone(phone) {
  return phone.replace(/[\s()-]/g, '')
}

function toPublicUser(user) {
  if (!user) return null
  const { passwordHash, ...publicUser } = user
  return publicUser
}

function encodePassword(password) {
  const bytes = new TextEncoder().encode(password)
  let binaryString = ''
  for (const byte of bytes) binaryString += String.fromCharCode(byte)
  return globalThis.btoa(binaryString)
}

function findStoredUser(identifier, users = readStoredUsers()) {
  if (typeof identifier !== 'string') return null
  const normalizedIdentifier = identifier.trim().toLowerCase()

  return users.find((user) => {
    return (
      normalizeUsername(user.username) === normalizedIdentifier ||
      normalizeEmail(user.email) === normalizedIdentifier
    )
  }) ?? null
}

/** Return safe user records without exposing their stored password encodings. */
export function getAllUsers() {
  return readStoredUsers().map(toPublicUser)
}

/** Find a safe user record by case-insensitive username or email. */
export function findUserByUsernameOrEmail(identifier) {
  return toPublicUser(findStoredUser(identifier))
}

/**
 * Register a rider or driver after validating required fields and uniqueness.
 * Admins must come from trusted seed data; public signup cannot assign admin.
 */
export function signup({ userType, username, password, email, phone, fullName } = {}) {
  if (!['rider', 'driver'].includes(userType)) {
    return { success: false, user: null, message: 'Choose a valid account type.' }
  }

  if (![username, password, email, phone, fullName].every(validateRequired)) {
    return { success: false, user: null, message: 'Complete all required fields.' }
  }
  if (!validateEmail(email)) {
    return { success: false, user: null, message: 'Enter a valid email address.' }
  }
  if (!validatePhone(phone)) {
    return { success: false, user: null, message: 'Enter a valid Sri Lankan phone number in +94 format.' }
  }
  if (!validatePassword(password)) {
    return { success: false, user: null, message: 'Password must contain at least 6 characters.' }
  }

  const normalizedUsername = username.trim()
  const normalizedEmail = normalizeEmail(email)
  const normalizedPhone = normalizePhone(phone)
  const users = readStoredUsers()
  const usernameTaken = users.some(
    (user) => normalizeUsername(user.username) === normalizeUsername(normalizedUsername),
  )
  if (usernameTaken) {
    return { success: false, user: null, message: 'That username is already in use.' }
  }
  if (users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
    return { success: false, user: null, message: 'That email address is already in use.' }
  }
  if (users.some((user) => normalizePhone(user.phone) === normalizedPhone)) {
    return { success: false, user: null, message: 'That phone number is already in use.' }
  }

  let passwordHash
  try {
    passwordHash = encodePassword(password)
  } catch {
    return { success: false, user: null, message: 'Unable to securely process the password.' }
  }

  const timestamp = new Date().toISOString()
  const newUser = {
    id: uuidv4(),
    userType,
    username: normalizedUsername,
    passwordHash,
    email: normalizedEmail,
    phone: normalizedPhone,
    fullName: fullName.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(userType === 'driver'
      ? { driverProfile: { approvalStatus: 'pending' } }
      : { riderProfile: { wallet: 0 } }),
  }

  if (!setItem(USERS_STORAGE_KEY, [...users, newUser])) {
    return { success: false, user: null, message: 'Unable to save the account in this browser.' }
  }

  const message = userType === 'driver'
    ? 'Account created. Your driver profile is pending approval.'
    : 'Account created successfully.'

  return { success: true, user: toPublicUser(newUser), message }
}

/** Validate credentials and persist an approved account as the current user. */
export function login(usernameOrEmail, password) {
  const users = readStoredUsers()
  if (users.length === 0) {
    return {
      success: false,
      user: null,
      message: 'No accounts exist yet. Create an account to continue.',
      redirectToSignup: true,
    }
  }

  if (!validateRequired(usernameOrEmail) || !validateRequired(password)) {
    return { success: false, user: null, message: 'Enter your username or email and password.' }
  }

  const storedUser = findStoredUser(usernameOrEmail, users)
  if (!storedUser || storedUser.passwordHash !== encodePassword(password)) {
    return { success: false, user: null, message: 'Incorrect username/email or password.' }
  }

  if (storedUser.userType === 'driver') {
    const approvalStatus = storedUser.driverProfile?.approvalStatus ?? storedUser.approvalStatus
    if (approvalStatus !== 'approved') {
      const message = approvalStatus === 'rejected'
        ? 'Your driver application was not approved.'
        : 'Your driver account is pending approval.'
      return { success: false, user: null, message }
    }
  }

  const user = toPublicUser(storedUser)
  if (!setItem(CURRENT_USER_STORAGE_KEY, user)) {
    return { success: false, user: null, message: 'Unable to save the session in this browser.' }
  }

  return { success: true, user, message: 'Logged in successfully.' }
}

/** Clear only the active session, leaving registered accounts intact. */
export function logout() {
  return removeItem(CURRENT_USER_STORAGE_KEY)
}

/** Restore the safe current-user record, if the browser has a saved session. */
export function getCurrentUser() {
  const user = getItem(CURRENT_USER_STORAGE_KEY, null)
  if (!user || typeof user !== 'object' || !user.id || !user.userType) return null

  const storedUser = readStoredUsers().find((candidate) => candidate.id === user.id)
  return storedUser ? toPublicUser(storedUser) : null
}

/** Determine whether a valid current-user session exists. */
export function isAuthenticated() {
  return getCurrentUser() !== null
}

/** Update a stored account's status and the current session copy when needed. */
export function updateUserStatus(userId, status) {
  if (!validateRequired(userId) || !validateRequired(status)) return false

  const users = readStoredUsers()
  const userIndex = users.findIndex((user) => user.id === userId)
  if (userIndex < 0) return false

  const timestamp = new Date().toISOString()
  const updatedUser = { ...users[userIndex], status, updatedAt: timestamp }
  users[userIndex] = updatedUser
  if (!setItem(USERS_STORAGE_KEY, users)) return false

  const currentUser = getItem(CURRENT_USER_STORAGE_KEY, null)
  if (currentUser?.id === userId) setItem(CURRENT_USER_STORAGE_KEY, toPublicUser(updatedUser))
  return true
}