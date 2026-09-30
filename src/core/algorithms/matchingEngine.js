import { DRIVER_SEARCH_RADIUS_KM } from '../../config/appConfig.js'
import { haversineDistance, validateCoordinates } from './haversine.js'

const MAX_DRIVER_RATING = 5
const IDLE_TIME_SCORE_CAP_MIN = 60

function getDriverLocation(driver) {
  return driver?.location ?? driver?.currentLocation ?? driver?.coordinates
}

function normalizeRate(value) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value > 1 ? value / 100 : value))
}

function getIdleMinutes(driver, now) {
  const explicitIdleMinutes = driver.idleTimeMinutes ?? driver.idleMinutes ?? driver.idleTimeMin
  if (Number.isFinite(explicitIdleMinutes)) return Math.max(0, explicitIdleMinutes)

  const idleSince = driver.idleSince ?? driver.lastRideCompletedAt
  const idleSinceTimestamp = idleSince ? new Date(idleSince).getTime() : Number.NaN
  return Number.isFinite(idleSinceTimestamp)
    ? Math.max(0, (now - idleSinceTimestamp) / 60000)
    : 0
}

function supportsRideType(driver, rideType) {
  if (!rideType) return true
  if (Array.isArray(driver.rideTypes)) return driver.rideTypes.includes(rideType)
  return !driver.rideType || driver.rideType === rideType
}

/**
 * Rank available drivers with the requested ride type and a valid location.
 * Distance contributes 50% (closer drivers score higher within the configured
 * search radius); rating, acceptance rate, and idle time contribute 20%, 20%,
 * and 10%. Rating is normalized to five stars, rates to 0..1, and idle time
 * reaches its maximum contribution after 60 minutes. Results include score
 * and distanceKm fields, are ordered from best score to worst, and are capped
 * at five drivers. Input drivers are not mutated.
 */
export function findBestDriver(pickup, availableDrivers, rideType) {
  if (!validateCoordinates(pickup)) {
    throw new RangeError('Pickup must contain valid latitude and longitude values.')
  }
  if (!Array.isArray(availableDrivers)) return []

  const now = Date.now()
  const maximumDistanceKm = DRIVER_SEARCH_RADIUS_KM

  return availableDrivers
    .filter((driver) => driver && driver.isAvailable !== false && supportsRideType(driver, rideType))
    .map((driver) => {
      const location = getDriverLocation(driver)
      if (!validateCoordinates(location)) return null

      const distanceKm = haversineDistance(
        pickup.lat ?? pickup.latitude,
        pickup.lng ?? pickup.longitude,
        location.lat ?? location.latitude,
        location.lng ?? location.longitude,
      )
      if (distanceKm > maximumDistanceKm) return null

      const distanceScore = 1 - distanceKm / maximumDistanceKm
      const ratingScore = Math.min(1, Math.max(0, (driver.rating ?? 0) / MAX_DRIVER_RATING))
      const acceptanceScore = normalizeRate(
        driver.acceptanceRate ?? driver.acceptanceRatePercent ?? driver.acceptance,
      )
      const idleMinutes = Math.min(
        IDLE_TIME_SCORE_CAP_MIN,
        getIdleMinutes(driver, now),
      )
      const idleTimeScore = idleMinutes / IDLE_TIME_SCORE_CAP_MIN
      const score =
        distanceScore * 0.5 +
        ratingScore * 0.2 +
        acceptanceScore * 0.2 +
        idleTimeScore * 0.1

      return { ...driver, distanceKm, score }
    })
    .filter(Boolean)
    .sort((firstDriver, secondDriver) => {
      return secondDriver.score - firstDriver.score || firstDriver.distanceKm - secondDriver.distanceKm
    })
    .slice(0, 5)
}