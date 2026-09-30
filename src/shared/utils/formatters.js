const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** Format an amount using the GoRide Sri Lankan rupee display convention. */
export function formatCurrency(amount) {
  if (!Number.isFinite(amount)) return ''

  const formattedAmount = new Intl.NumberFormat('en-LK', {
    maximumFractionDigits: 2,
  }).format(amount)

  return `Rs. ${formattedAmount}`
}

/** Render an ISO date value using the user's locale and timezone. */
export function formatDateTime(iso) {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/** Format a timestamp relative to now, choosing a readable unit by its scale. */
export function formatRelativeTime(iso, now = new Date()) {
  const date = new Date(iso)
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime()
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(currentTime)) return ''

  const differenceSeconds = (date.getTime() - currentTime) / 1000
  const timeUnits = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
  ]
  const matchingUnit = timeUnits.find(({ seconds }) => Math.abs(differenceSeconds) >= seconds)

  if (!matchingUnit) return relativeTimeFormatter.format(Math.round(differenceSeconds), 'second')
  return relativeTimeFormatter.format(
    Math.round(differenceSeconds / matchingUnit.seconds),
    matchingUnit.unit,
  )
}

/** Generate a local-date ride reference with a four-character base-36 suffix. */
export function generateRideNumber(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const randomSuffix = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0')

  return `GR-${year}${month}${day}-${randomSuffix}`
}