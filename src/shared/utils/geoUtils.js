import { haversineDistance, validateCoordinates } from '../../core/algorithms/haversine.js'

const COLOMBO_AREAS = [
  { name: 'Colombo Fort', lat: 6.9344, lng: 79.8428 },
  { name: 'Pettah', lat: 6.936, lng: 79.850 },
  { name: 'Kollupitiya', lat: 6.9147, lng: 79.852 },
  { name: 'Cinnamon Gardens', lat: 6.902, lng: 79.861 },
  { name: 'Borella', lat: 6.9147, lng: 79.877 },
  { name: 'Bambalapitiya', lat: 6.8887, lng: 79.856 },
  { name: 'Narahenpita', lat: 6.895, lng: 79.883 },
  { name: 'Wellawatte', lat: 6.8741, lng: 79.860 },
  { name: 'Rajagiriya', lat: 6.906, lng: 79.895 },
  { name: 'Nugegoda', lat: 6.8728, lng: 79.889 },
  { name: 'Dehiwala', lat: 6.856, lng: 79.865 },
]

/** Format short trips in meters and longer trips in kilometers. */
export function formatDistance(km) {
  if (!Number.isFinite(km) || km < 0) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

/** Format a duration as whole minutes or combined hours and minutes. */
export function formatDuration(min) {
  if (!Number.isFinite(min) || min < 0) return ''
  const roundedMinutes = Math.round(min)
  const hours = Math.floor(roundedMinutes / 60)
  const remainingMinutes = roundedMinutes % 60

  if (hours === 0) return `${roundedMinutes} min`
  if (remainingMinutes === 0) return `${hours} hr`
  return `${hours} hr ${remainingMinutes} min`
}

/** Wrap the browser Geolocation API in a promise returning { lat, lng, accuracy }. */
export function getCurrentPosition(options = {}) {
  if (!globalThis.navigator?.geolocation) {
    return Promise.reject(new Error('Geolocation is not available in this environment.'))
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
  }

  return new Promise((resolve, reject) => {
    globalThis.navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      reject,
      { ...defaultOptions, ...options },
    )
  })
}

/** Return the nearest Colombo-area mock address for the supplied coordinates. */
export function reverseGeocode(lat, lng) {
  const point = { lat, lng }
  if (!validateCoordinates(point)) return 'Unknown location, Colombo'

  const nearestArea = COLOMBO_AREAS.reduce((closestArea, area) => {
    const distanceToArea = haversineDistance(lat, lng, area.lat, area.lng)
    return distanceToArea < closestArea.distanceKm
      ? { area, distanceKm: distanceToArea }
      : closestArea
  }, { area: COLOMBO_AREAS[0], distanceKm: Infinity })

  return `${nearestArea.area.name}, Colombo`
}