import { haversineDistance, validateCoordinates } from './haversine.js'

function getZoneCenter(zone) {
  return zone?.center ?? zone?.location ?? zone?.coordinates
}

function parseTimestamp(value) {
  if (value === undefined || value === null) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}

/**
 * Keep zones that are enabled and whose optional start/end times include now.
 * Zones without an active flag are treated as active because callers often
 * pass an already-filtered active-zone list from their API or state store.
 */
export function getActiveSurgeZones(surgeZones = [], now = Date.now()) {
  if (!Array.isArray(surgeZones)) return []

  return surgeZones.filter((zone) => {
    if (!zone || zone.active === false || zone.isActive === false) return false
    if (zone.status && String(zone.status).toLowerCase() !== 'active') return false

    const startsAt = parseTimestamp(zone.startsAt)
    const endsAt = parseTimestamp(zone.endsAt ?? zone.expiresAt)
    if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) return false
    if (startsAt !== null && startsAt > now) return false
    if (endsAt !== null && endsAt <= now) return false

    return true
  })
}

/**
 * Test whether a point is inside a circular surge zone. A zone uses a center
 * ({ lat, lng } or { latitude, longitude }) plus a radiusKm, and its boundary
 * is inclusive so pickups exactly on the edge receive that zone's surge.
 */
export function isPointInZone(point, zone) {
  const center = getZoneCenter(zone)
  const radiusKm = zone?.radiusKm

  if (
    !validateCoordinates(point) ||
    !validateCoordinates(center) ||
    !Number.isFinite(radiusKm) ||
    radiusKm < 0
  ) {
    return false
  }

  const distanceKm = haversineDistance(
    point.lat ?? point.latitude,
    point.lng ?? point.longitude,
    center.lat ?? center.latitude,
    center.lng ?? center.longitude,
  )

  return distanceKm <= radiusKm
}

/**
 * Select the strongest multiplier among active zones containing the pickup.
 * Multipliers are never allowed below 1, and no matching zone means no surge.
 */
export function calculateSurge(pickupLocation, activeSurgeZones = []) {
  if (!validateCoordinates(pickupLocation)) return 1

  return getActiveSurgeZones(activeSurgeZones).reduce((highestMultiplier, zone) => {
    if (!isPointInZone(pickupLocation, zone)) return highestMultiplier

    const multiplier = zone.multiplier ?? zone.surgeMultiplier ?? 1
    if (!Number.isFinite(multiplier)) return highestMultiplier
    return Math.max(highestMultiplier, multiplier, 1)
  }, 1)
}