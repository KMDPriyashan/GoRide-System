import { v4 as uuidv4 } from 'uuid'
import { getItem, setItem } from '../../shared/utils/storage.js'

const USERS_KEY = 'gr_users'
const RIDES_KEY = 'gr_rides'

function readUsers() {
  const users = getItem(USERS_KEY, [])
  return Array.isArray(users) ? users : []
}

function writeUsers(users) {
  if (!setItem(USERS_KEY, users)) throw new Error('Unable to save rider records in this browser.')
}

function updateRiderProfile(riderId, update) {
  const users = readUsers()
  const index = users.findIndex((user) => user.id === riderId && user.userType === 'rider')
  if (index < 0) return null
  const currentUser = users[index]
  users[index] = {
    ...currentUser,
    riderProfile: update(currentUser.riderProfile ?? {}),
    updatedAt: new Date().toISOString(),
  }
  writeUsers(users)
  const session = getItem('gr_current_user', null)
  if (session?.id === riderId) setItem('gr_current_user', users[index])
  return users[index]
}

export function getRiderById(userId) {
  return readUsers().find((user) => user.id === userId && user.userType === 'rider') ?? null
}

export function updateRider(riderId, data = {}) {
  const users = readUsers()
  const index = users.findIndex((user) => user.id === riderId && user.userType === 'rider')
  if (index < 0) return null
  const user = users[index]
  const { riderProfile = {}, ...publicData } = data
  users[index] = {
    ...user,
    ...publicData,
    id: user.id,
    userType: 'rider',
    passwordHash: user.passwordHash,
    riderProfile: { ...user.riderProfile, ...riderProfile },
    updatedAt: new Date().toISOString(),
  }
  writeUsers(users)
  const session = getItem('gr_current_user', null)
  if (session?.id === riderId) setItem('gr_current_user', users[index])
  return users[index]
}

export function addSavedPlace(riderId, place) {
  if (!place || typeof place !== 'object') throw new TypeError('place must be an object.')
  const rider = getRiderById(riderId)
  if (!rider) return null
  const places = Array.isArray(rider.riderProfile?.savedPlaces) ? rider.riderProfile.savedPlaces : []
  const savedPlace = { ...place, id: place.id ?? uuidv4(), createdAt: place.createdAt ?? new Date().toISOString() }
  const updated = updateRiderProfile(riderId, (profile) => ({ ...profile, savedPlaces: [...places, savedPlace] }))
  return updated?.riderProfile.savedPlaces.at(-1) ?? null
}

export function removeSavedPlace(riderId, placeId) {
  const rider = getRiderById(riderId)
  if (!rider) return null
  const places = Array.isArray(rider.riderProfile?.savedPlaces) ? rider.riderProfile.savedPlaces : []
  const nextPlaces = places.filter((place) => place.id !== placeId)
  if (nextPlaces.length === places.length) return rider
  return updateRiderProfile(riderId, (profile) => ({ ...profile, savedPlaces: nextPlaces }))
}

export function getRiderStats(riderId) {
  const storedRides = getItem(RIDES_KEY, [])
  const rides = (Array.isArray(storedRides) ? storedRides : []).filter((ride) => ride.riderId === riderId)
  const completed = rides.filter((ride) => (ride.status ?? ride.state) === 'completed')
  return {
    totalTrips: rides.length,
    completedTrips: completed.length,
    activeTrips: rides.filter((ride) => ['requested', 'accepted', 'arrived', 'started'].includes(ride.status ?? ride.state)).length,
    cancelledTrips: rides.filter((ride) => (ride.status ?? ride.state) === 'cancelled').length,
    totalSpent: completed.reduce((total, ride) => {
      const fare = Number(ride.finalFare ?? ride.estimatedFare ?? 0)
      return total + (Number.isFinite(fare) && fare >= 0 ? fare : 0)
    }, 0),
  }
}