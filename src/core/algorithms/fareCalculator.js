import { PRICING_CONFIG } from '../../config/pricingConfig.js'
import { getItem } from '../../shared/utils/storage.js'
import { calculateSurge } from './surgePricing.js'

function requireNonNegativeNumber(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number.`)
  }
}

function roundCurrency(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

function getPromotion(promoCode, pricingConfig) {
  if (!promoCode) return null
  if (typeof promoCode === 'object') return promoCode

  const storedPromos = getItem('gr_promo_codes', [])
  const storedPromo = (Array.isArray(storedPromos) ? storedPromos : []).find((promo) => {
    return promo.code?.toUpperCase() === String(promoCode).trim().toUpperCase()
  })
  if (storedPromo) {
    if (!storedPromo.enabled || (storedPromo.expires && new Date(`${storedPromo.expires}T23:59:59`) < new Date())) return null
    return {
      ...storedPromo,
      type: storedPromo.type ?? (storedPromo.discountAmount !== undefined ? 'fixed' : 'percent'),
      value: storedPromo.discountAmount ?? storedPromo.discount ?? storedPromo.value,
    }
  }

  const promotions = pricingConfig.promoCodes ?? pricingConfig.promotions ?? {}
  const normalizedCode = String(promoCode).trim().toUpperCase()
  const matchingCode = Object.keys(promotions).find(
    (code) => code.toUpperCase() === normalizedCode,
  )

  return matchingCode ? promotions[matchingCode] : null
}

function getPromotionDiscount(promoCode, fareBeforePromo, pricingConfig) {
  const promotion = getPromotion(promoCode, pricingConfig)
  if (!promotion) return 0

  const promotionType = String(promotion.type ?? '').toLowerCase()
  const percentValue = promotion.discountPercent ??
    (promotionType === 'percent' || promotionType === 'percentage' ? promotion.value : undefined)
  if (Number.isFinite(percentValue)) {
    const fraction = percentValue > 1 ? percentValue / 100 : percentValue
    return Math.min(fareBeforePromo, fareBeforePromo * Math.max(0, fraction))
  }

  const fixedValue = promotion.discountAmount ??
    (promotionType === 'fixed' || promotionType === 'amount' ? promotion.value : undefined)
  return Number.isFinite(fixedValue) ? Math.min(fareBeforePromo, Math.max(0, fixedValue)) : 0
}

/**
 * Calculate the passenger's final fare as a currency amount. Base, distance,
 * and time charges are multiplied by the active surge; booking fees are added
 * afterward. The minimum applies before a promotion, while a promo discount
 * cannot reduce the fare below zero. Tips are added last and are not surged.
 * Optional ride-specific rates live in pricingConfig.rideTypes[rideType], and
 * promotions may be passed as an object or looked up by code in promoCodes.
 */
export function calculateFare({
  rideType,
  distanceKm,
  durationMin,
  pickupLocation,
  activeSurgeZones = [],
  promoCode,
  tipAmount = 0,
  pricingConfig = PRICING_CONFIG,
}) {
  requireNonNegativeNumber(distanceKm, 'distanceKm')
  requireNonNegativeNumber(durationMin, 'durationMin')
  requireNonNegativeNumber(tipAmount, 'tipAmount')

  const config = pricingConfig ?? PRICING_CONFIG
  const savedFare = getItem('gr_admin_pricing', null)?.fares?.[rideType]
  const rideRates = {
    ...(config.rideTypes?.[rideType] ?? {}),
    ...(savedFare ? {
      baseFare: savedFare.base,
      perKilometer: savedFare.perKm,
      perMinute: savedFare.perMin,
      minimumFare: savedFare.minimum,
    } : {}),
  }
  const baseFare = rideRates.baseFare ?? config.baseFare ?? 0
  const perKilometer = rideRates.perKilometer ?? config.perKilometer ?? 0
  const perMinute = rideRates.perMinute ?? config.perMinute ?? 0
  const minimumFare = rideRates.minimumFare ?? config.minimumFare ?? 0
  const bookingFee = rideRates.bookingFee ?? config.bookingFee ?? 0
  const rates = [baseFare, perKilometer, perMinute, minimumFare, bookingFee]
  if (!rates.every((rate) => Number.isFinite(rate) && rate >= 0)) {
    throw new RangeError('Pricing rates must be finite non-negative numbers.')
  }

  const storedZones = getItem('gr_surge_zones', [])
  const configuredZones = Array.isArray(storedZones) ? storedZones.map((zone) => ({
    ...zone,
    radiusKm: zone.radiusKm ?? zone.radius,
  })) : []
  const surgeZones = activeSurgeZones.length ? activeSurgeZones : configuredZones
  const surgeFromZone = pickupLocation
    ? calculateSurge(pickupLocation, surgeZones)
    : config.surgeMultiplier?.default ?? 1
  const maximumSurge = config.surgeMultiplier?.maximum ?? Infinity
  const surgeMultiplier = Math.min(surgeFromZone, maximumSurge)
  const meteredFare = baseFare + distanceKm * perKilometer + durationMin * perMinute
  const fareBeforePromo = Math.max(minimumFare, meteredFare * surgeMultiplier) + bookingFee
  const discount = getPromotionDiscount(promoCode, fareBeforePromo, config)
  const finalFare = Math.max(0, fareBeforePromo - discount) + tipAmount

  return roundCurrency(finalFare)
}

/**
 * Estimate travel time in whole minutes from distance and average speed.
 * Rounding upward avoids promising an arrival earlier than the estimate.
 */
export function estimateETA(distanceKm, avgSpeedKmh = 30) {
  requireNonNegativeNumber(distanceKm, 'distanceKm')
  if (!Number.isFinite(avgSpeedKmh) || avgSpeedKmh <= 0) {
    throw new RangeError('avgSpeedKmh must be a finite positive number.')
  }

  return Math.ceil((distanceKm / avgSpeedKmh) * 60)
}

/**
 * Return the driver's net share after the configured platform commission.
 * Commission values from 0..1 are treated as fractions, while values above 1
 * are treated as percentages; absent configuration defaults to 20% commission.
 */
export function calculateDriverEarnings(totalFare, pricingConfig = PRICING_CONFIG) {
  requireNonNegativeNumber(totalFare, 'totalFare')

  const config = pricingConfig ?? PRICING_CONFIG
  const storedCommission = getItem('gr_admin_pricing', null)?.commission
  const commissionValue = Number.isFinite(storedCommission)
    ? storedCommission / 100
    : config.platformCommissionRate ?? config.commissionRate ?? 0.2
  if (!Number.isFinite(commissionValue) || commissionValue < 0) {
    throw new RangeError('Platform commission must be a finite non-negative number.')
  }

  const commissionRate = Math.min(1, commissionValue > 1 ? commissionValue / 100 : commissionValue)
  return roundCurrency(totalFare * (1 - commissionRate))
}