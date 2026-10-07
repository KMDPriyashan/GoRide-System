import { getItem } from '../../shared/utils/storage.js'

function readRides() {
  const rides = getItem('gr_rides', [])
  return Array.isArray(rides) ? rides : []
}

function readDrivers() {
  const users = getItem('gr_users', [])
  return (Array.isArray(users) ? users : []).filter((user) => user.userType === 'driver')
}

function stateOf(ride) {
  return ride.status ?? ride.state ?? 'requested'
}

function fareOf(ride) {
  const fare = Number(ride.finalFare ?? ride.estimatedFare ?? ride.fare ?? 0)
  return Number.isFinite(fare) && fare >= 0 ? fare : 0
}

function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dateForRide(ride, field = 'createdAt') {
  const value = field === 'completedAt'
    ? ride.completedAt ?? ride.updatedAt ?? ride.createdAt
    : ride.createdAt ?? ride.updatedAt
  const date = new Date(value ?? Number.NaN)
  return Number.isFinite(date.getTime()) ? date : null
}

function dayRows(days, rides, { revenue = false } = {}) {
  const count = Math.max(1, Math.floor(Number(days) || 1))
  const today = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (count - index - 1))
    const key = localDayKey(date)
    const dailyRides = rides.filter((ride) => {
      if (revenue && stateOf(ride) !== 'completed') return false
      const rideDate = dateForRide(ride, revenue ? 'completedAt' : 'createdAt')
      return rideDate && localDayKey(rideDate) === key
    })
    return {
      date: key,
      rides: dailyRides.length,
      revenue: dailyRides.reduce((total, ride) => total + fareOf(ride), 0),
    }
  })
}

export function getRevenueByDay(days = 7) {
  return dayRows(days, readRides(), { revenue: true }).map(({ date, revenue }) => ({ date, revenue }))
}

export function getRevenueByHour(date = new Date()) {
  const selectedDate = date instanceof Date ? date : new Date(date)
  if (!Number.isFinite(selectedDate.getTime())) throw new RangeError('date must be a valid date.')
  const selectedKey = localDayKey(selectedDate)
  const completed = readRides().filter((ride) => {
    const completedAt = dateForRide(ride, 'completedAt')
    return stateOf(ride) === 'completed' && completedAt && localDayKey(completedAt) === selectedKey
  })
  return Array.from({ length: 24 }, (_, hour) => {
    const hourlyRides = completed.filter((ride) => dateForRide(ride, 'completedAt').getHours() === hour)
    return { hour, label: `${String(hour).padStart(2, '0')}:00`, rides: hourlyRides.length, revenue: hourlyRides.reduce((total, ride) => total + fareOf(ride), 0) }
  })
}

export function getRidesByDay(days = 7) {
  return dayRows(days, readRides()).map(({ date, rides }) => ({ date, rides }))
}

export function getTopRoutes(limit = 10) {
  const maximum = Math.max(0, Math.floor(Number(limit) || 0))
  const routeMap = new Map()
  readRides().forEach((ride) => {
    const pickup = ride.pickup?.name ?? ride.pickupName ?? 'Pickup'
    const dropoff = ride.dropoff?.name ?? ride.dropoffName ?? 'Drop-off'
    const route = `${pickup} → ${dropoff}`
    const entry = routeMap.get(route) ?? { route, pickup, dropoff, count: 0, revenue: 0 }
    entry.count += 1
    if (stateOf(ride) === 'completed') entry.revenue += fareOf(ride)
    routeMap.set(route, entry)
  })
  return [...routeMap.values()].sort((first, second) => second.count - first.count || first.route.localeCompare(second.route)).slice(0, maximum)
}

export function getDriverUtilization() {
  const rides = readRides()
  return readDrivers().map((driver) => {
    const driverRides = rides.filter((ride) => ride.driverId === driver.id)
    const completedTrips = driverRides.filter((ride) => stateOf(ride) === 'completed').length
    const activeTrips = driverRides.filter((ride) => ['accepted', 'arrived', 'started'].includes(stateOf(ride))).length
    const requestsValue = getItem(`gr_driver_requests_${driver.id}`, [])
    const decisions = (Array.isArray(requestsValue) ? requestsValue : []).filter((request) => ['accepted', 'rejected'].includes(request.status))
    const accepted = decisions.filter((request) => request.status === 'accepted').length
    return {
      driverId: driver.id,
      driver: driver.fullName ?? driver.username ?? 'Driver',
      completedTrips,
      activeTrips,
      totalTrips: driverRides.length,
      acceptanceRate: decisions.length ? Math.round((accepted / decisions.length) * 100) : 0,
    }
  }).sort((first, second) => second.completedTrips - first.completedTrips)
}

export function getCancellationRate() {
  const rides = readRides()
  const cancellations = rides.filter((ride) => stateOf(ride) === 'cancelled')
  const reasons = new Map()
  cancellations.forEach((ride) => {
    const reason = ride.cancellationReason ?? ride.cancelReason ?? 'Not specified'
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
  })
  return {
    totalRides: rides.length,
    cancelledRides: cancellations.length,
    rate: rides.length ? Math.round((cancellations.length / rides.length) * 10000) / 100 : 0,
    byReason: [...reasons].map(([reason, count]) => ({ reason, count })),
  }
}