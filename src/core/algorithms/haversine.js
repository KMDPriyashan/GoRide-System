const EARTH_RADIUS_KM = 6371.0088

/**
 * Check that a location is a latitude/longitude object with finite values
 * inside the legal ranges. Both { lat, lng } and { latitude, longitude } are
 * accepted so map and API models can be passed without conversion.
 */
export function validateCoordinates(location) {
  if (!location || typeof location !== 'object') return false

  const latitude = location.lat ?? location.latitude
  const longitude = location.lng ?? location.longitude

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

/**
 * Compute the great-circle distance between two WGS84 coordinates using the
 * haversine formula. The result is in kilometers; invalid coordinate pairs
 * throw rather than silently producing a misleading match or fare.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const coordinateValues = [lat1, lng1, lat2, lng2]
  const validValues = coordinateValues.every(Number.isFinite)

  if (
    !validValues ||
    lat1 < -90 || lat1 > 90 ||
    lat2 < -90 || lat2 > 90 ||
    lng1 < -180 || lng1 > 180 ||
    lng2 < -180 || lng2 > 180
  ) {
    throw new RangeError('Coordinates must be finite latitude/longitude values in range.')
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(lat2 - lat1)
  const longitudeDelta = toRadians(lng2 - lng1)
  const firstLatitude = toRadians(lat1)
  const secondLatitude = toRadians(lat2)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))

  return EARTH_RADIUS_KM * centralAngle
}