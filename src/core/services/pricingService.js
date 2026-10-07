import { PRICING_CONFIG } from '../../config/pricingConfig.js'
import { getItem, setItem } from '../../shared/utils/storage.js'
import { getActiveSurgeZones as filterActiveZones } from '../algorithms/surgePricing.js'
import { validateCoordinates } from '../algorithms/haversine.js'

const PRICING_KEY = 'gr_admin_pricing'
const SURGE_ZONES_KEY = 'gr_surge_zones'
const PROMO_CODES_KEY = 'gr_promo_codes'

function storedPricing() {
  return getItem(PRICING_KEY, {}) ?? {}
}

function storedZones() {
  const zones = getItem(SURGE_ZONES_KEY, [])
  return Array.isArray(zones) ? zones : []
}

function storedPromos() {
  const promos = getItem(PROMO_CODES_KEY, [])
  return Array.isArray(promos) ? promos : []
}

function toFareRates(rate) {
  return {
    baseFare: rate.baseFare ?? rate.base,
    perKilometer: rate.perKilometer ?? rate.perKm,
    perMinute: rate.perMinute ?? rate.perMin,
    minimumFare: rate.minimumFare ?? rate.minimum,
    ...(rate.bookingFee === undefined ? {} : { bookingFee: rate.bookingFee }),
  }
}

export function getPricingConfig() {
  const saved = storedPricing()
  const fares = saved.fares ?? {}
  const defaultCommission = (PRICING_CONFIG.platformCommissionRate ?? PRICING_CONFIG.commissionRate ?? 0.2) * 100
  const rideTypes = { ...(PRICING_CONFIG.rideTypes ?? {}) }
  Object.entries(fares).forEach(([type, rate]) => {
    rideTypes[type] = { ...(rideTypes[type] ?? {}), ...toFareRates(rate) }
  })
  return {
    ...PRICING_CONFIG,
    ...saved,
    fares,
    commission: saved.commission ?? defaultCommission,
    platformCommissionRate: (saved.commission ?? defaultCommission) / 100,
    rideTypes,
  }
}

export function updatePricingConfig(config = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError('Pricing configuration must be an object.')
  }
  const existing = storedPricing()
  const fares = { ...(existing.fares ?? {}) }
  Object.entries(config.fares ?? {}).forEach(([type, rate]) => {
    fares[type] = { ...(fares[type] ?? {}), ...rate }
  })
  Object.entries(config.rideTypes ?? {}).forEach(([type, rates]) => {
    fares[type] = {
      ...(fares[type] ?? {}),
      ...(rates.baseFare === undefined ? {} : { base: rates.baseFare }),
      ...(rates.perKilometer === undefined ? {} : { perKm: rates.perKilometer }),
      ...(rates.perMinute === undefined ? {} : { perMin: rates.perMinute }),
      ...(rates.minimumFare === undefined ? {} : { minimum: rates.minimumFare }),
    }
  })
  const commission = config.commission ?? (config.platformCommissionRate === undefined
    ? existing.commission
    : config.platformCommissionRate * 100)
  if (commission !== undefined && (!Number.isFinite(commission) || commission < 0 || commission > 100)) {
    throw new RangeError('Commission must be between 0 and 100 percent.')
  }
  const next = { ...existing, ...config, fares, ...(commission === undefined ? {} : { commission }) }
  if (!setItem(PRICING_KEY, next)) throw new Error('Unable to save pricing configuration in this browser.')
  return getPricingConfig()
}

export function getActiveSurgeZones(now = Date.now()) {
  return filterActiveZones(storedZones(), now).map((zone) => ({
    ...zone,
    radiusKm: zone.radiusKm ?? zone.radius,
  }))
}

export function addSurgeZone(zone = {}) {
  const center = zone.center ?? zone.location
  const radius = zone.radiusKm ?? zone.radius
  const multiplier = zone.multiplier ?? zone.surgeMultiplier
  const normalizedCenter = center && {
    lat: Number(center.lat ?? center.latitude),
    lng: Number(center.lng ?? center.longitude),
  }
  if (!validateCoordinates(normalizedCenter)) throw new TypeError('A surge zone requires a valid center coordinate.')
  if (!Number.isFinite(Number(radius)) || Number(radius) <= 0) throw new RangeError('Surge radius must be greater than zero.')
  if (!Number.isFinite(Number(multiplier)) || Number(multiplier) < 1) throw new RangeError('Surge multiplier must be at least 1.')
  const zones = storedZones()
  const nextZone = {
    ...zone,
    id: zone.id ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    center: normalizedCenter,
    radius: Number(radius),
    radiusKm: Number(radius),
    multiplier: Number(multiplier),
    active: zone.active ?? true,
  }
  if (!setItem(SURGE_ZONES_KEY, [...zones, nextZone])) throw new Error('Unable to save surge zones in this browser.')
  return nextZone
}

export function removeSurgeZone(id) {
  const zones = storedZones()
  const next = zones.filter((zone) => zone.id !== id)
  if (next.length === zones.length) return false
  if (!setItem(SURGE_ZONES_KEY, next)) throw new Error('Unable to save surge zones in this browser.')
  return true
}

export function validatePromo(code) {
  const normalizedCode = String(code ?? '').trim().toUpperCase()
  if (!normalizedCode) return { valid: false, reason: 'empty' }
  const promo = storedPromos().find((item) => item.code?.trim().toUpperCase() === normalizedCode)
  if (!promo) return { valid: false, reason: 'not_found' }
  if (promo.enabled === false) return { valid: false, reason: 'disabled', promo }
  if (promo.expires && new Date(`${promo.expires}T23:59:59`).getTime() < Date.now()) {
    return { valid: false, reason: 'expired', promo }
  }
  return { valid: true, promo }
}

export function applyPromo(code, amount) {
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError('amount must be a finite non-negative number.')
  const result = validatePromo(code)
  if (!result.valid) return amount
  const promo = result.promo
  const discountValue = Number(promo.discountAmount ?? promo.discount ?? promo.value ?? 0)
  if (!Number.isFinite(discountValue) || discountValue < 0) return amount
  const isPercent = (promo.type ?? 'percent') === 'percent' || promo.type === 'percentage'
  const discount = isPercent ? amount * Math.min(100, discountValue) / 100 : discountValue
  return Math.round(Math.max(0, amount - discount) * 100) / 100
}