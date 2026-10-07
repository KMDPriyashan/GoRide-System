import { createRide, transitionRide } from '../models/Ride.js'
import { canTransition } from '../stateMachine/rideStateMachine.js'
import { findBestDriver } from '../algorithms/matchingEngine.js'
import { eventBus } from '../eventBus/eventBus.js'
import { getItem, setItem } from '../../shared/utils/storage.js'
import { getOnlineDrivers, updateDriverStats } from './driverService.js'

const RIDES_KEY = 'gr_rides'

function readRides() {
  const rides = getItem(RIDES_KEY, [])
  return Array.isArray(rides) ? rides : []
}

function writeRides(rides) {
  if (!setItem(RIDES_KEY, rides)) throw new Error('Unable to save rides in this browser.')
}

function currentState(ride) {
  return ride.state ?? ride.status ?? 'requested'
}

function recordDecision(driverId, rideId, status) {
  const key = `gr_driver_requests_${driverId}`
  const stored = getItem(key, [])
  const requests = Array.isArray(stored) ? stored : []
  const existing = requests.find((request) => request.rideId === rideId)
  if (existing) existing.status = status
  else requests.push({ rideId, status, offeredAt: new Date().toISOString() })
  setItem(key, requests)
}

function transition(rideId, nextState, updates = {}) {
  const rides = readRides()
  const index = rides.findIndex((ride) => ride.id === rideId)
  if (index < 0) throw new Error(`Ride not found: ${rideId}`)

  const ride = { ...rides[index], state: currentState(rides[index]) }
  if (!canTransition(ride.state, nextState)) {
    throw new Error(`Invalid ride transition: ${ride.state} -> ${nextState}`)
  }

  const updatedRide = transitionRide(ride, nextState, { ...updates, status: nextState })
  rides[index] = updatedRide
  writeRides(rides)
  return updatedRide
}

export function requestRide(rideData = {}) {
  const ride = createRide({ ...rideData, state: 'requested', status: 'requested' })
  writeRides([...readRides(), ride])
  eventBus.emit('ride:requested', ride)
  return ride
}

export function acceptRide(rideId, driverId) {
  if (!driverId) throw new TypeError('driverId is required.')
  const ride = transition(rideId, 'accepted', { driverId })
  recordDecision(driverId, rideId, 'accepted')
  eventBus.emit('ride:accepted', { rideId, driverId, updates: { driverId } })
  return ride
}

export function rejectRide(rideId, driverId) {
  if (!driverId) throw new TypeError('driverId is required.')
  const rides = readRides()
  const index = rides.findIndex((ride) => ride.id === rideId)
  if (index < 0) throw new Error(`Ride not found: ${rideId}`)
  const ride = rides[index]
  if (currentState(ride) !== 'requested') throw new Error('Only requested rides can be rejected.')

  const rejectedBy = Array.isArray(ride.rejectedBy) ? ride.rejectedBy : []
  const updatedRide = rejectedBy.includes(driverId)
    ? ride
    : { ...ride, rejectedBy: [...rejectedBy, driverId], updatedAt: new Date().toISOString() }
  rides[index] = updatedRide
  writeRides(rides)
  recordDecision(driverId, rideId, 'rejected')
  eventBus.emit('ride:rejected', { rideId, driverId })
  return updatedRide
}

export function markArrived(rideId) {
  const ride = transition(rideId, 'arrived', { arrivedAt: new Date().toISOString() })
  eventBus.emit('ride:arrived', { rideId, driverId: ride.driverId })
  return ride
}

export function startRide(rideId) {
  const ride = transition(rideId, 'started', { tripStartedAt: new Date().toISOString() })
  eventBus.emit('ride:started', { rideId, driverId: ride.driverId })
  return ride
}

export function completeRide(rideId, fare) {
  if (!Number.isFinite(fare) || fare < 0) throw new RangeError('fare must be a finite non-negative number.')
  const ride = transition(rideId, 'completed', { finalFare: fare })
  if (ride.driverId) updateDriverStats(ride.driverId, ride)
  eventBus.emit('ride:completed', { rideId, driverId: ride.driverId, updates: { finalFare: fare } })
  return ride
}

export function cancelRide(rideId, cancelledBy, reason = '') {
  const cancelledAt = new Date().toISOString()
  const updates = { cancelledBy, cancellationReason: reason, cancelledAt }
  const ride = transition(rideId, 'cancelled', {
    ...updates,
  })
  eventBus.emit('ride:cancelled', {
    rideId,
    driverId: ride.driverId,
    updates,
  })
  return ride
}

export function getRideById(id) {
  return readRides().find((ride) => ride.id === id) ?? null
}

export function getRidesByRider(riderId) {
  return readRides().filter((ride) => ride.riderId === riderId)
}

export function getRidesByDriver(driverId) {
  return readRides().filter((ride) => ride.driverId === driverId)
}

export function getActiveRides() {
  return readRides().filter((ride) => ['accepted', 'arrived', 'started'].includes(currentState(ride)))
}

export function getTodaysRides(date = new Date()) {
  const targetDay = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return readRides().filter((ride) => {
    const createdAt = new Date(ride.createdAt ?? ride.updatedAt ?? 0)
    if (!Number.isFinite(createdAt.getTime())) return false
    const rideDay = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`
    return rideDay === targetDay
  })
}

export function findDriverForRide(rideId) {
  const ride = getRideById(rideId)
  if (!ride?.pickup) return null
  const eligibleDrivers = getOnlineDrivers().filter((driver) => {
    const rejectedBy = Array.isArray(ride.rejectedBy) ? ride.rejectedBy : []
    return !rejectedBy.includes(driver.id)
  })
  return findBestDriver(ride.pickup, eligibleDrivers, ride.rideType)[0] ?? null
}