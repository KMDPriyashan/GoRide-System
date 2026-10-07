import { LOCATION_UPDATE_INTERVAL_MS } from '../../config/appConfig.js'
import { validateCoordinates } from '../algorithms/haversine.js'
import { eventBus } from '../eventBus/eventBus.js'
import { updateLocation } from './driverService.js'

const simulations = new Map()
const RIDE_EVENTS = [
  'ride:requested',
  'ride:rejected',
  'ride:accepted',
  'ride:arrived',
  'ride:started',
  'ride:completed',
  'ride:cancelled',
]

function stopSimulation(driverId) {
  const simulation = simulations.get(driverId)
  if (!simulation) return false
  globalThis.clearInterval(simulation.intervalId)
  simulations.delete(driverId)
  return true
}

export function startDriverSimulation(driverId, from, to) {
  if (!driverId) throw new TypeError('driverId is required.')
  if (!validateCoordinates(from) || !validateCoordinates(to)) {
    throw new RangeError('Simulation endpoints must contain valid coordinates.')
  }
  stopSimulation(driverId)
  const start = { lat: Number(from.lat ?? from.latitude), lng: Number(from.lng ?? from.longitude) }
  const end = { lat: Number(to.lat ?? to.latitude), lng: Number(to.lng ?? to.longitude) }
  const steps = Math.max(1, Math.ceil(LOCATION_UPDATE_INTERVAL_MS / 500))
  let step = 0
  updateLocation(driverId, start.lat, start.lng)

  const intervalId = globalThis.setInterval(() => {
    step += 1
    const progress = Math.min(1, step / steps)
    const location = {
      lat: start.lat + (end.lat - start.lat) * progress,
      lng: start.lng + (end.lng - start.lng) * progress,
    }
    updateLocation(driverId, location.lat, location.lng)
    if (progress >= 1) stopSimulation(driverId)
  }, Math.max(250, Math.floor(LOCATION_UPDATE_INTERVAL_MS / steps)))
  simulations.set(driverId, { intervalId })
  return () => stopSimulation(driverId)
}

export function stopDriverSimulation(driverId) {
  return stopSimulation(driverId)
}

export function subscribeToRide(rideId, callback) {
  if (typeof callback !== 'function') throw new TypeError('callback must be a function.')
  const listeners = RIDE_EVENTS.map((eventName) => {
    const listener = (payload = {}) => {
      const eventRideId = payload.rideId ?? payload.id
      if (eventRideId === rideId) callback(payload, eventName)
    }
    eventBus.on(eventName, listener)
    return [eventName, listener]
  })
  return () => listeners.forEach(([eventName, listener]) => eventBus.off(eventName, listener))
}

export function subscribeToDriver(driverId, callback) {
  if (typeof callback !== 'function') throw new TypeError('callback must be a function.')
  const events = ['driver:location', 'driver:online', 'driver:offline']
  const listeners = events.map((eventName) => {
    const listener = (payload = {}) => {
      if (payload.driverId === driverId) callback(payload, eventName)
    }
    eventBus.on(eventName, listener)
    return [eventName, listener]
  })
  return () => listeners.forEach(([eventName, listener]) => eventBus.off(eventName, listener))
}