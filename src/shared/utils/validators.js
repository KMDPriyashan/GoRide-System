const SRI_LANKA_PROVINCE_CODES = '(?:WP|CP|SP|NP|EP|NC|NW|SG|UV)'

/** Validate a conventional email address without accepting whitespace. */
export function validateEmail(value) {
  if (typeof value !== 'string') return false
  return /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i.test(
    value.trim(),
  )
}

/** Accept Sri Lankan mobile numbers in +94 format, with optional separators. */
export function validatePhone(value) {
  if (typeof value !== 'string') return false
  const normalizedPhone = value.replace(/[\s()-]/g, '')
  return /^\+947\d{8}$/.test(normalizedPhone)
}

/** Require a password containing at least six characters. */
export function validatePassword(value) {
  return typeof value === 'string' && value.length >= 6
}

/** Treat blank strings, empty arrays, nullish values, and false as missing. */
export function validateRequired(value) {
  if (value === null || value === undefined || value === false) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'number') return Number.isFinite(value)
  return true
}

/**
 * Validate common Sri Lankan registration marks such as WP CAB-1234 and
 * ABC-1234. Spaces and hyphens are ignored; province-prefixed and legacy
 * letter-series formats are both supported.
 */
export function validateLicensePlate(value) {
  if (typeof value !== 'string') return false
  const normalizedPlate = value.toUpperCase().replace(/[\s-]/g, '')
  const provincePrefixedPlate = new RegExp(`^${SRI_LANKA_PROVINCE_CODES}[A-Z]{1,3}\\d{4}$`)
  const legacyPlate = /^[A-Z]{2,3}\d{4}$/

  return provincePrefixedPlate.test(normalizedPlate) || legacyPlate.test(normalizedPlate)
}