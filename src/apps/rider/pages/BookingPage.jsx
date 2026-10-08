import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiCheck, FiMapPin } from 'react-icons/fi'
import { FaCar, FaCarSide, FaMotorcycle, FaShuttleVan } from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext.jsx'
import { createRide } from '../../../core/models/Ride.js'
import { haversineDistance } from '../../../core/algorithms/haversine.js'
import { estimateETA, calculateFare } from '../../../core/algorithms/fareCalculator.js'
import { eventBus } from '../../../core/eventBus/eventBus.js'
import { PRICING_CONFIG } from '../../../config/pricingConfig.js'
import { DEFAULT_MAP_CENTER } from '../../../config/appConfig.js'
import { getItem, setItem } from '../../../shared/utils/storage.js'
import { formatCurrency } from '../../../shared/utils/formatters.js'
import { formatDistance } from '../../../shared/utils/geoUtils.js'
import MapView from '../../../shared/components/Map/MapView.jsx'
import LocationPicker from '../components/LocationPicker.jsx'

const RIDE_TYPES = [
  { id: 'mini', name: 'GoRide Mini', detail: 'Everyday rides', icon: FaCar, multiplier: 1, speed: 26, seats: '3 seats' },
  { id: 'comfort', name: 'Comfort', detail: 'A little more room', icon: FaCarSide, multiplier: 1.28, speed: 28, seats: '3 seats' },
  { id: 'xl', name: 'XL', detail: 'Room for everyone', icon: FaShuttleVan, multiplier: 1.62, speed: 25, seats: '6 seats' },
  { id: 'bike', name: 'Bike', detail: 'Quick solo trips', icon: FaMotorcycle, multiplier: 0.72, speed: 32, seats: '1 seat' },
]

function getFare(rideType, distanceKm, durationMin, pickupLocation) {
  const multiplier = rideType.multiplier
  const pricingConfig = {
    ...PRICING_CONFIG,
    baseFare: PRICING_CONFIG.baseFare * multiplier,
    perKilometer: PRICING_CONFIG.perKilometer * multiplier,
    perMinute: PRICING_CONFIG.perMinute * multiplier,
    minimumFare: PRICING_CONFIG.minimumFare * multiplier,
  }

  return calculateFare({
    rideType: rideType.id,
    distanceKm,
    durationMin,
    pickupLocation,
    pricingConfig,
  })
}

export default function BookingPage() {
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const { user } = useAuth()
  const initialPickup = routeLocation.state?.pickup ?? { ...DEFAULT_MAP_CENTER, name: 'Current location' }
  const initialDropoff = routeLocation.state?.destination ?? null
  const [pickup, setPickup] = useState(initialPickup)
  const [dropoff, setDropoff] = useState(initialDropoff)
  const [selectedRide, setSelectedRide] = useState('mini')
  const [pickerTarget, setPickerTarget] = useState(null)

  const distanceKm = useMemo(() => {
    if (!dropoff) return 0
    return haversineDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) * 1.18
  }, [pickup, dropoff])
  const selectedType = RIDE_TYPES.find((rideType) => rideType.id === selectedRide) ?? RIDE_TYPES[0]
  const selectedETA = estimateETA(distanceKm, selectedType.speed)
  const markers = [
    { id: 'pickup', position: pickup, kind: 'pickup' },
    ...(dropoff ? [{ id: 'dropoff', position: dropoff, kind: 'dropoff' }] : []),
  ]

  const confirmRide = () => {
    if (!dropoff) {
      setPickerTarget('dropoff')
      return
    }

    const ride = createRide({
      status: 'requested',
      state: 'requested',
      riderId: user?.id,
      riderName: user?.fullName,
      rideType: selectedType.id,
      pickup,
      dropoff,
      distanceKm,
      estimatedDurationMin: selectedETA,
      estimatedFare: getFare(selectedType, distanceKm, selectedETA, pickup),
    })
    const rides = getItem('gr_rides', [])
    setItem('gr_rides', [...(Array.isArray(rides) ? rides : []), ride])
    eventBus.emit('ride:requested', ride)
    navigate(`/rider/tracking/${ride.id}`, { state: { ride } })
  }

  return (
    <main className="booking-page">
      <div className="booking-map-wrap">
        <MapView
          center={dropoff ?? pickup}
          zoom={13}
          markers={markers}
          polyline={dropoff ? [pickup, dropoff] : []}
          className="booking-map"
        />
        <button type="button" className="back-map-button" aria-label="Go back" onClick={() => navigate('/rider')}>
          <FiArrowLeft />
        </button>
        <div className="map-distance-tag"><span />{formatDistance(distanceKm)} route estimate</div>
      </div>

      <section className="booking-sheet">
        <div className="sheet-grip" />
        <div className="booking-title-row">
          <div><span className="eyebrow">YOUR TRIP</span><h1>Choose your ride</h1></div>
          <span className="trip-distance">{formatDistance(distanceKm)}</span>
        </div>
        <div className="route-inputs">
          <div className="route-rail"><span className="route-origin-dot" /><span className="route-stem" /><span className="route-destination-dot" /></div>
          <button type="button" onClick={() => setPickerTarget('pickup')} className="route-location">
            <span><small>Pickup</small><strong>{pickup.name}</strong></span><FiMapPin />
          </button>
          <button type="button" onClick={() => setPickerTarget('dropoff')} className="route-location">
            <span><small>Drop-off</small><strong>{dropoff?.name ?? 'Choose destination'}</strong></span><FiMapPin />
          </button>
        </div>

        <div className="ride-type-grid" role="radiogroup" aria-label="Ride type">
          {RIDE_TYPES.map(({ id, name, detail, icon: Icon, multiplier, speed, seats }) => {
            const rideType = { id, name, detail, icon: Icon, multiplier, speed, seats }
            const duration = estimateETA(distanceKm, speed)
            const isSelected = selectedRide === id
            return (
              <button
                type="button"
                className={`ride-type-option${isSelected ? ' is-selected' : ''}`}
                key={id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedRide(id)}
              >
                <span className="ride-type-icon"><Icon /></span>
                <span className="ride-type-name">{name}</span>
                <span className="ride-type-meta">{duration} min · {seats}</span>
                <strong className="ride-type-price">{formatCurrency(getFare(rideType, distanceKm, duration))}</strong>
                {isSelected && <span className="ride-type-check"><FiCheck /></span>}
              </button>
            )
          })}
        </div>
        <div className="booking-bottom-row">
          <div><span className="eyebrow">ESTIMATED FARE</span><strong>{formatCurrency(getFare(selectedType, distanceKm, selectedETA))}</strong></div>
          <button type="button" className="confirm-ride-button" onClick={confirmRide}>
            Confirm GoRide {selectedType.id === 'mini' ? 'Mini' : selectedType.name}
          </button>
        </div>
      </section>

      <LocationPicker
        open={Boolean(pickerTarget)}
        title={pickerTarget === 'pickup' ? 'Choose your pickup' : 'Choose your destination'}
        onClose={() => setPickerTarget(null)}
        onSelect={(location) => {
          if (pickerTarget === 'pickup') setPickup(location)
          else setDropoff(location)
        }}
      />
    </main>
  )
}