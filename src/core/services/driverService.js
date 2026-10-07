import { DEFAULT_MAP_CENTER } from '../../config/appConfig.js'
import { calculateDriverEarnings } from '../algorithms/fareCalculator.js'
import { validateCoordinates } from '../algorithms/haversine.js'
import { eventBus } from '../eventBus/eventBus.js'
import { getItem, setItem } from '../../shared/utils/storage.js'

const USERS_KEY = 'gr_users'
const LOCATIONS_KEY = 'gr_driver_locations'
const RIDES_KEY = 'gr_rides'

function readUsers() {
  const users = getItem(USERS_KEY, [])
  return Array.isArray(users) ? users : []
}

function writeUsers(users) {
  if (!setItem(USERS_KEY, users)) throw new Error('Unable to save driver records in this browser.')
}

function readLocations() {
  const locations = getItem(LOCATIONS_KEY, [])
  return Array.isArray(locations) ? locations : []
}

function updateUser(driverId, updater) {
  const users = readUsers()
  const index = users.findIndex((user) => user.id === driverId && user.userType === 'driver')
  if (index < 0) return null
  users[index] = updater(users[index])
  writeUsers(users)
  const activeUser = getItem('gr_current_user', null)
  if (activeUser?.id === driverId) setItem('gr_current_user', users[index])
  return users[index]
}

function readRides() {
  const rides = getItem(RIDES_KEY, [])
  return Array.isArray(rides) ? rides : []
}

export function getAllDrivers() {
  return readUsers().filter((user) => user.userType === 'driver')
}

export function getDriverById(userId) {
  return getAllDrivers().find((driver) => driver.id === userId) ?? null
}

export function getOnlineDrivers() {
  const drivers = getAllDrivers()
  const locations = readLocations()
  const locationById = new Map(locations.map((entry) => [entry.driverId, entry]))
  return drivers.flatMap((driver) => {
    const entry = locationById.get(driver.id)
    const isOnline = entry ? entry.online === true : getItem(`gr_driver_online_${driver.id}`, false) === true
    const isApproved = (driver.driverProfile?.approvalStatus ?? driver.approvalStatus) === 'approved'
    if (!isOnline || !isApproved || driver.status === 'suspended') return []
    return [{
      ...driver,
      location: entry?.location ?? driver.location ?? driver.currentLocation ?? DEFAULT_MAP_CENTER,
      isOnline: true,
      isAvailable: true,
      rating: driver.driverProfile?.rating ?? driver.rating ?? 0,
      acceptanceRate: driver.driverProfile?.acceptanceRate ?? driver.acceptanceRate ?? 0,
      rideTypes: driver.driverProfile?.rideTypes ?? driver.rideTypes,
    }]
  })
}

export function updateLocation(driverId, lat, lng) {
  const location = { lat: Number(lat), lng: Number(lng) }
  if (!validateCoordinates(location)) throw new RangeError('Driver location must contain valid coordinates.')
  const driver = getDriverById(driverId)
  if (!driver) throw new Error(`Driver not found: ${driverId}`)

  const locations = readLocations()
  const existing = locations.find((entry) => entry.driverId === driverId)
  const entry = {
    ...(existing ?? {}),
    driverId,
    location,
    online: existing?.online ?? getItem(`gr_driver_online_${driverId}`, false) === true,
    updatedAt: new Date().toISOString(),
  }
  const next = existing
    ? locations.map((item) => item.driverId === driverId ? entry : item)
    : [...locations, entry]
  if (!setItem(LOCATIONS_KEY, next)) throw new Error('Unable to save driver location in this browser.')
  eventBus.emit('driver:location', entry)
  return entry
}

export function setOnlineStatus(driverId, isOnline) {
  if (typeof isOnline !== 'boolean') throw new TypeError('isOnline must be a boolean.')
  const driver = getDriverById(driverId)
  if (!driver) throw new Error(`Driver not found: ${driverId}`)
  if (isOnline && ((driver.driverProfile?.approvalStatus ?? driver.approvalStatus) !== 'approved' || driver.status === 'suspended')) {
    throw new Error('Only approved, active drivers can go online.')
  }
  const location = readLocations()
  const existing = location.find((entry) => entry.driverId === driverId)
  const entry = {
    ...(existing ?? {}),
    driverId,
    location: existing?.location ?? driver.location ?? driver.currentLocation ?? DEFAULT_MAP_CENTER,
    online: isOnline,
    updatedAt: new Date().toISOString(),
  }
  const next = existing
    ? location.map((item) => item.driverId === driverId ? entry : item)
    : [...location, entry]
  if (!setItem(LOCATIONS_KEY, next) || !setItem(`gr_driver_online_${driverId}`, isOnline)) {
    throw new Error('Unable to save driver status in this browser.')
  }
  const currentUser = getItem('gr_current_user', null)
  if (currentUser?.id === driverId) setItem('gr_driver_online', isOnline)
  eventBus.emit(isOnline ? 'driver:online' : 'driver:offline', entry)
  return entry
}

export function approveDriver(driverId) {
  return updateUser(driverId, (driver) => ({
    ...driver,
    status: 'active',
    driverProfile: { ...driver.driverProfile, approvalStatus: 'approved' },
    updatedAt: new Date().toISOString(),
  }))
}

export function rejectDriver(driverId, reason = '') {
  return updateUser(driverId, (driver) => ({
    ...driver,
    status: 'rejected',
    driverProfile: { ...driver.driverProfile, approvalStatus: 'rejected', rejectionReason: reason },
    updatedAt: new Date().toISOString(),
  }))
}

export function suspendDriver(driverId) {
  const suspended = updateUser(driverId, (driver) => ({
    ...driver,
    status: 'suspended',
    updatedAt: new Date().toISOString(),
  }))
  if (suspended) setOnlineStatus(driverId, false)
  return suspended
}

export function getDriverStats(driverId) {
  const rides = readRides().filter((ride) => ride.driverId === driverId)
  const completed = rides.filter((ride) => (ride.status ?? ride.state) === 'completed')
  const requestsValue = getItem(`gr_driver_requests_${driverId}`, [])
  const decisions = (Array.isArray(requestsValue) ? requestsValue : [])
    .filter((request) => ['accepted', 'rejected'].includes(request.status))
  const acceptedRequests = decisions.filter((request) => request.status === 'accepted').length
  const fareTotal = completed.reduce((total, ride) => {
    const fare = Number(ride.finalFare ?? ride.estimatedFare ?? 0)
    return total + (Number.isFinite(fare) && fare >= 0 ? fare : 0)
  }, 0)
  const storedStats = getItem(`gr_driver_stats_${driverId}`, {}) ?? {}
  return {
    ...storedStats,
    totalTrips: completed.length,
    completedTrips: completed.length,
    activeTrips: rides.filter((ride) => ['accepted', 'arrived', 'started'].includes(ride.status ?? ride.state)).length,
    grossEarnings: fareTotal,
    earnings: completed.reduce((total, ride) => total + Number(ride.driverEarnings ?? calculateDriverEarnings(ride.finalFare ?? ride.estimatedFare ?? 0)), 0),
    acceptedRequests,
    totalRequests: decisions.length,
    acceptanceRate: decisions.length ? Math.round((acceptedRequests / decisions.length) * 100) : 0,
  }
}

export function updateDriverStats(driverId, ride) {
  if (!getDriverById(driverId)) throw new Error(`Driver not found: ${driverId}`)
  const stats = getDriverStats(driverId)
  const updatedAt = new Date().toISOString()
  const savedStats = { ...stats, lastRideId: ride?.id ?? stats.lastRideId, updatedAt }
  if (!setItem(`gr_driver_stats_${driverId}`, savedStats)) throw new Error('Unable to save driver statistics in this browser.')
  updateUser(driverId, (driver) => ({
    ...driver,
    driverProfile: {
      ...driver.driverProfile,
      totalTrips: stats.totalTrips,
      earnings: stats.earnings,
      acceptanceRate: stats.acceptanceRate,
    },
  }))
  return savedStats
}