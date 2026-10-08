import { PRICING_CONFIG } from '../config/pricingConfig.js'
import { createRide } from '../core/models/Ride.js'
import { calculateDriverEarnings, calculateFare, estimateETA } from '../core/algorithms/fareCalculator.js'
import { getItem, setItem } from '../shared/utils/storage.js'

const INITIALIZED_KEY = 'gr_initialized'
const USERS_KEY = 'gr_users'
const RIDES_KEY = 'gr_rides'

const RIDER_NAMES = [
  'Amara Perera', 'Dinuka Fernando', 'Kavindi Jayasinghe', 'Nuwan Silva', 'Ishara Wijesinghe',
  'Tharushi de Alwis', 'Kasun Abeysekara', 'Sachini Gunawardena', 'Ravindu Karunaratne', 'Madhavi Senanayake',
]

const DRIVER_NAMES = [
  'Nimal Perera', 'Saman Fernando', 'Chathura Silva', 'Ruwan Jayasinghe', 'Pradeep Wijesinghe',
  'Lahiru Abeysekara', 'Roshan Gunawardena', 'Dinesh Karunaratne', 'Asanka Senanayake', 'Kamal de Silva',
  'Thilina Bandara', 'Mahesh Kumara', 'Gayan Rajapaksha', 'Supun Madushan', 'Ajith Wickramasinghe',
  'Chaminda Weerasinghe', 'Isuru Pathirana', 'Niroshan Peris', 'Shanaka Herath', 'Buddhika Dias',
]

const VEHICLE_TYPES = [
  ...Array(5).fill('mini'),
  ...Array(5).fill('comfort'),
  ...Array(3).fill('xl'),
  ...Array(7).fill('bike'),
]

const COLOMBO_PLACES = [
  { name: 'Fort', lat: 6.9344, lng: 79.8428 },
  { name: 'Pettah', lat: 6.9360, lng: 79.8500 },
  { name: 'Bambalapitiya', lat: 6.8880, lng: 79.8560 },
  { name: 'Kollupitiya', lat: 6.9140, lng: 79.8480 },
  { name: 'Maradana', lat: 6.9270, lng: 79.8640 },
  { name: 'Wellawatte', lat: 6.8740, lng: 79.8610 },
  { name: 'Borella', lat: 6.9140, lng: 79.8780 },
  { name: 'Cinnamon Gardens', lat: 6.9050, lng: 79.8610 },
  { name: 'Slave Island', lat: 6.9210, lng: 79.8510 },
  { name: 'Dematagoda', lat: 6.9380, lng: 79.8770 },
]

const REVIEW_COMMENTS = [
  'Friendly and right on time.',
  'Smooth ride and a clean vehicle.',
  'Great communication throughout the trip.',
  'Professional driver. Would ride again.',
  'Safe and comfortable journey.',
]

const CANCELLATION_REASONS = [
  'Rider changed plans',
  'Driver could not reach pickup',
  'Pickup details were incorrect',
]

function randomInt(minimum, maximum) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum
}

function randomElement(items) {
  return items[randomInt(0, items.length - 1)]
}

function randomRating() {
  return Math.round((4.5 + Math.random() * 0.5) * 10) / 10
}

function randomCoordinate(center, spread = 0.004) {
  return Math.round((center + (Math.random() * 2 - 1) * spread) * 1e6) / 1e6
}

function encodePassword(password) {
  const bytes = new TextEncoder().encode(password)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return globalThis.btoa(binary)
}

function isoDaysAgo(daysAgo, hour = randomInt(7, 22), minute = randomInt(0, 59)) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, minute, randomInt(0, 59), 0)
  return date
}

function save(key, value) {
  if (!setItem(key, value)) throw new Error(`Unable to save seed data: ${key}`)
}

function buildUsers() {
  const now = new Date().toISOString()
  const admin = {
    id: 'seed-admin',
    username: 'admin',
    passwordHash: encodePassword('admin123'),
    userType: 'admin',
    fullName: 'GoRide Administrator',
    email: 'admin@goride.lk',
    phone: '+94770000001',
    adminProfile: { role: 'administrator' },
    createdAt: now,
    updatedAt: now,
  }
  const riders = RIDER_NAMES.map((fullName, index) => {
    const wallet = randomInt(10, 400) * 50
    const suffix = String(index + 1).padStart(2, '0')
    const createdAt = isoDaysAgo(randomInt(60, 365), 9, 0).toISOString()
    return {
      id: `seed-rider-${suffix}`,
      username: `rider${suffix}`,
      passwordHash: encodePassword('rider123'),
      userType: 'rider',
      fullName,
      email: `rider${suffix}@example.lk`,
      phone: `+9477${String(1000000 + index).slice(-7)}`,
      riderProfile: { wallet, savedPlaces: [] },
      createdAt,
      updatedAt: createdAt,
    }
  })
  const approvalStatuses = [
    ...Array(15).fill('approved'),
    ...Array(3).fill('pending'),
    ...Array(2).fill('rejected'),
  ]
  const drivers = DRIVER_NAMES.map((fullName, index) => {
    const suffix = String(index + 1).padStart(2, '0')
    const createdAt = isoDaysAgo(randomInt(60, 365), 9, 0).toISOString()
    const location = {
      lat: randomCoordinate(6.9, 0.05),
      lng: randomCoordinate(79.87, 0.03),
    }
    const vehicleType = VEHICLE_TYPES[index]
    const approvalStatus = approvalStatuses[index]
    const make = vehicleType === 'bike' ? 'Honda' : vehicleType === 'xl' ? 'Nissan' : 'Toyota'
    const model = vehicleType === 'bike' ? 'Dio' : vehicleType === 'xl' ? 'NV200' : vehicleType === 'comfort' ? 'Axio' : 'Aqua'
    return {
      id: `seed-driver-${suffix}`,
      username: `driver${suffix}`,
      passwordHash: encodePassword('driver123'),
      userType: 'driver',
      fullName,
      email: `driver${suffix}@example.lk`,
      phone: `+9476${String(1000000 + index).slice(-7)}`,
      status: approvalStatus === 'approved' ? 'active' : approvalStatus,
      location,
      currentLocation: location,
      driverProfile: {
        approvalStatus,
        vehicleType,
        vehicle: {
          make,
          model,
          name: `${make} ${model}`,
          color: randomElement(['Pearl white', 'Silver', 'Black', 'Deep blue']),
          year: randomInt(2018, 2025),
          plateNumber: `WP ${vehicleType === 'bike' ? 'B' : 'CA'}${String(1000 + index)}`,
        },
        rating: randomRating(),
        totalTrips: randomInt(50, 2000),
        acceptanceRate: Math.round((0.85 + Math.random() * 0.14) * 100) / 100,
        earnings: 0,
      },
      createdAt,
      updatedAt: createdAt,
    }
  })
  return { admin, riders, drivers }
}

function buildSurgeZones() {
  const zones = [
    ['Fort', 6.9344, 79.8428, 1.5],
    ['Pettah', 6.9360, 79.8500, 1.4],
    ['Bambalapitiya', 6.8880, 79.8560, 1.3],
    ['Kollupitiya', 6.9140, 79.8480, 1.2],
    ['Maradana', 6.9270, 79.8640, 1.5],
  ]
  return zones.map(([name, lat, lng, multiplier], index) => ({
    id: `seed-surge-${index + 1}`,
    name,
    center: { lat, lng },
    radius: 2,
    radiusKm: 2,
    multiplier,
    active: true,
  }))
}

function buildPromos() {
  return [
    { id: 'seed-promo-welcome50', code: 'WELCOME50', type: 'fixed', value: 50, discountAmount: 50, enabled: true },
    { id: 'seed-promo-first100', code: 'FIRST100', type: 'fixed', value: 100, discountAmount: 100, firstRideOnly: true, enabled: true },
    { id: 'seed-promo-weekend20', code: 'WEEKEND20', type: 'percent', value: 20, discount: 20, enabled: true },
  ]
}

function buildRides(riders, drivers, surgeZones) {
  const approvedDrivers = drivers.filter((driver) => driver.driverProfile.approvalStatus === 'approved')
  const rides = []
  const reviews = []
  const transactions = riders.map((rider) => ({
    id: `seed-wallet-${rider.id}`,
    userId: rider.id,
    type: 'credit',
    amount: rider.riderProfile.wallet,
    balanceAfter: rider.riderProfile.wallet,
    description: 'Welcome wallet balance',
    createdAt: rider.createdAt,
  }))

  for (let index = 0; index < 100; index += 1) {
    const suffix = String(index + 1).padStart(3, '0')
    const rider = randomElement(riders)
    const driver = randomElement(approvedDrivers)
    const pickupPlace = randomElement(COLOMBO_PLACES)
    let dropoffPlace = randomElement(COLOMBO_PLACES)
    while (dropoffPlace.name === pickupPlace.name) dropoffPlace = randomElement(COLOMBO_PLACES)
    const pickup = {
      name: pickupPlace.name,
      lat: randomCoordinate(pickupPlace.lat),
      lng: randomCoordinate(pickupPlace.lng),
    }
    const dropoff = {
      name: dropoffPlace.name,
      lat: randomCoordinate(dropoffPlace.lat),
      lng: randomCoordinate(dropoffPlace.lng),
    }
    const rideType = randomElement(VEHICLE_TYPES)
    const distanceKm = Math.round((2 + Math.random() * 14) * 100) / 100
    const estimatedDurationMin = estimateETA(distanceKm, randomInt(20, 34))
    const status = index < 85
      ? 'completed'
      : index < 95
        ? 'cancelled'
        : ['requested', 'accepted', 'arrived', 'started', 'requested'][index - 95]
    const createdAt = isoDaysAgo(randomInt(0, 29))
    const completedAt = new Date(createdAt.getTime() + randomInt(12, 70) * 60_000)
    const multiplier = { mini: 1, comfort: 1.28, xl: 1.62, bike: 0.72 }[rideType]
    const finalFare = calculateFare({
      rideType,
      distanceKm,
      durationMin: estimatedDurationMin,
      pickupLocation: pickup,
      activeSurgeZones: surgeZones,
      pricingConfig: {
        ...PRICING_CONFIG,
        baseFare: PRICING_CONFIG.baseFare * multiplier,
        perKilometer: PRICING_CONFIG.perKilometer * multiplier,
        perMinute: PRICING_CONFIG.perMinute * multiplier,
        minimumFare: PRICING_CONFIG.minimumFare * multiplier,
      },
    })
    const ride = createRide({
      id: `seed-ride-${suffix}`,
      rideNumber: `GR${String(700000 + index)}`,
      riderId: rider.id,
      riderName: rider.fullName,
      riderRating: randomRating(),
      driverId: status === 'requested' ? undefined : driver.id,
      rideType,
      pickup,
      dropoff,
      distanceKm,
      estimatedDurationMin,
      estimatedFare: finalFare,
      finalFare: status === 'completed' ? finalFare : undefined,
      driverEarnings: status === 'completed' ? calculateDriverEarnings(finalFare) : undefined,
      state: status,
      status,
      createdAt: createdAt.toISOString(),
    })
    ride.updatedAt = status === 'completed' ? completedAt.toISOString() : createdAt.toISOString()
    if (['accepted', 'arrived', 'started', 'completed'].includes(status)) {
      ride.acceptedAt = new Date(createdAt.getTime() + 2 * 60_000).toISOString()
    }
    if (['arrived', 'started', 'completed'].includes(status)) {
      ride.arrivedAt = new Date(createdAt.getTime() + 8 * 60_000).toISOString()
    }
    if (['started', 'completed'].includes(status)) {
      ride.startedAt = new Date(createdAt.getTime() + 10 * 60_000).toISOString()
      ride.tripStartedAt = ride.startedAt
    }
    if (status === 'completed') {
      ride.completedAt = completedAt.toISOString()
      reviews.push({
        id: `seed-review-${suffix}`,
        rideId: ride.id,
        riderId: rider.id,
        driverId: driver.id,
        rating: randomInt(4, 5),
        comment: randomElement(REVIEW_COMMENTS),
        createdAt: completedAt.toISOString(),
      })
      transactions.push({
        id: `seed-wallet-trip-${suffix}`,
        userId: rider.id,
        rideId: ride.id,
        type: 'debit',
        amount: finalFare,
        description: `Ride ${ride.rideNumber}`,
        createdAt: completedAt.toISOString(),
      })
    }
    if (status === 'cancelled') {
      ride.cancelledAt = new Date(createdAt.getTime() + randomInt(1, 10) * 60_000).toISOString()
      ride.cancelledBy = Math.random() < 0.5 ? rider.id : driver.id
      ride.cancellationReason = randomElement(CANCELLATION_REASONS)
    }
    rides.push(ride)
  }

  const reconciledTransactions = []
  riders.forEach((rider) => {
    let balance = 0
    const riderTransactions = transactions
      .filter((transaction) => transaction.userId === rider.id)
      .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt))

    riderTransactions.forEach((transaction) => {
      if (transaction.type === 'debit' && balance < transaction.amount) {
        const topUp = Math.round((transaction.amount - balance) * 100) / 100
        balance = Math.round((balance + topUp) * 100) / 100
        reconciledTransactions.push({
          id: `seed-wallet-topup-${transaction.rideId}`,
          userId: rider.id,
          rideId: transaction.rideId,
          type: 'credit',
          amount: topUp,
          balanceAfter: balance,
          description: 'Wallet top-up',
          createdAt: transaction.createdAt,
        })
      }
      balance = Math.round((balance + (transaction.type === 'credit' ? transaction.amount : -transaction.amount)) * 100) / 100
      reconciledTransactions.push({ ...transaction, balanceAfter: balance })
    })
    rider.riderProfile.wallet = balance
  })
  reconciledTransactions.sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt))
  return { rides, reviews, transactions: reconciledTransactions }
}

/** Populate a fresh browser with local GoRide demo records once per origin. */
export function initializeGoRideSeed() {
  if (getItem(INITIALIZED_KEY, false) === true) return false

  const { admin, riders, drivers } = buildUsers()
  const seededUsers = [admin, ...riders, ...drivers]
  const seededIds = new Set(seededUsers.map((user) => user.id))
  const existingUsers = getItem(USERS_KEY, [])
  const users = (Array.isArray(existingUsers) ? existingUsers : []).filter((user) => {
    return !seededIds.has(user.id) && user.username?.toLowerCase() !== 'admin'
  })
  const allUsers = [...users, ...seededUsers]

  const existingRides = getItem(RIDES_KEY, [])
  const surgeZones = buildSurgeZones()
  const rides = buildRides(riders, drivers, surgeZones)
  const preservedRides = (Array.isArray(existingRides) ? existingRides : []).filter((ride) => !ride.id?.startsWith('seed-ride-'))
  const existingLocations = getItem('gr_driver_locations', [])
  const onlineDriverLocations = drivers
    .filter((driver) => driver.driverProfile.approvalStatus === 'approved' && Math.random() < 0.45)
    .map((driver) => ({ driverId: driver.id, location: driver.location, online: true, updatedAt: new Date().toISOString() }))
  const locations = (Array.isArray(existingLocations) ? existingLocations : []).filter((entry) => !entry.driverId?.startsWith('seed-driver-'))
  const seededOnlineIds = new Set(onlineDriverLocations.map((entry) => entry.driverId))

  save(USERS_KEY, allUsers)
  save(RIDES_KEY, [...preservedRides, ...rides.rides])
  save('gr_driver_locations', [...locations, ...onlineDriverLocations])
  for (const driver of drivers) save(`gr_driver_online_${driver.id}`, seededOnlineIds.has(driver.id))
  save('gr_surge_zones', [
    ...(Array.isArray(getItem('gr_surge_zones', [])) ? getItem('gr_surge_zones', []).filter((zone) => !zone.id?.startsWith('seed-surge-')) : []),
    ...surgeZones,
  ])
  save('gr_promo_codes', [
    ...(Array.isArray(getItem('gr_promo_codes', [])) ? getItem('gr_promo_codes', []).filter((promo) => !promo.id?.startsWith('seed-promo-')) : []),
    ...buildPromos(),
  ])
  save('gr_reviews', [
    ...(Array.isArray(getItem('gr_reviews', [])) ? getItem('gr_reviews', []).filter((review) => !review.id?.startsWith('seed-review-')) : []),
    ...rides.reviews,
  ])
  save('gr_wallet_transactions', [
    ...(Array.isArray(getItem('gr_wallet_transactions', [])) ? getItem('gr_wallet_transactions', []).filter((transaction) => !transaction.id?.startsWith('seed-wallet')) : []),
    ...rides.transactions,
  ])
  save(INITIALIZED_KEY, true)
  console.info('✅ GoRide seed data loaded. Login: admin/admin123')
  return true
}