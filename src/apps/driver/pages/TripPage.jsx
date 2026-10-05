import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiArrowUpRight, FiCheck, FiCornerUpLeft, FiFlag, FiNavigation } from 'react-icons/fi'
import { canTransition } from '../../../core/stateMachine/rideStateMachine.js'
import { transitionRide } from '../../../core/models/Ride.js'
import { calculateDriverEarnings, calculateFare } from '../../../core/algorithms/fareCalculator.js'
import { eventBus } from '../../../core/eventBus/eventBus.js'
import { DEFAULT_MAP_CENTER, LOCATION_UPDATE_INTERVAL_MS } from '../../../config/appConfig.js'
import { PRICING_CONFIG } from '../../../config/pricingConfig.js'
import { getItem, setItem } from '../../../shared/utils/storage.js'
import { formatCurrency } from '../../../shared/utils/formatters.js'
import { formatDistance } from '../../../shared/utils/geoUtils.js'
import MapView from '../../../shared/components/Map/MapView.jsx'

const DRIVER_DEMO_ID = 'driver-demo'
const MOCK_TURNS = [
  { direction: 'Straight ahead', detail: 'Continue along the current road', distance: '450 m', icon: FiNavigation },
  { direction: 'Turn left', detail: 'Turn left at the next junction', distance: '300 m', icon: FiCornerUpLeft },
  { direction: 'Pickup is nearby', detail: 'Your rider is at the destination pin', distance: '120 m', icon: FiFlag },
]

function findRide(rideId, routeRide) {
  if (routeRide?.id === rideId) return routeRide
  const rides = getItem('gr_rides', [])
  return Array.isArray(rides) ? rides.find((ride) => ride.id === rideId) ?? null : null
}

function persistRide(nextRide) {
  const storedRides = getItem('gr_rides', [])
  const rides = Array.isArray(storedRides) ? storedRides : []
  const index = rides.findIndex((ride) => ride.id === nextRide.id)
  if (index < 0) setItem('gr_rides', [...rides, nextRide])
  else setItem('gr_rides', rides.map((ride) => ride.id === nextRide.id ? nextRide : ride))
}

function interpolateLocation(start, end, progress) {
  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lng: start.lng + (end.lng - start.lng) * progress,
  }
}

function calculateFinalFare(ride, elapsedSeconds) {
  return calculateFare({
    rideType: ride.rideType,
    distanceKm: ride.distanceKm ?? 0,
    durationMin: elapsedSeconds / 60,
    pickupLocation: null,
    pricingConfig: PRICING_CONFIG,
  })
}

function formatElapsedTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export default function DriverTripPage() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [ride, setRide] = useState(() => findRide(rideId, location.state?.ride))
  const rideRef = useRef(ride)
  const [driverLocation, setDriverLocation] = useState(() => {
    const pickup = ride?.pickup ?? DEFAULT_MAP_CENTER
    return { lat: pickup.lat + 0.012, lng: pickup.lng + 0.008 }
  })
  const [tripElapsedSeconds, setTripElapsedSeconds] = useState(0)
  const [earningsSummary, setEarningsSummary] = useState(null)

  useEffect(() => { rideRef.current = ride }, [ride])

  const updateStatus = useCallback((nextState, updates = {}) => {
    const currentRide = rideRef.current
    if (!currentRide || !canTransition(currentRide.state, nextState)) return null

    const updatedRide = transitionRide(currentRide, nextState, { ...updates, status: nextState })
    rideRef.current = updatedRide
    persistRide(updatedRide)
    setRide(updatedRide)
    return updatedRide
  }, [])

  useEffect(() => {
    const currentRide = rideRef.current
    if (!currentRide || currentRide.state !== 'accepted') return undefined

    const pickup = currentRide.pickup ?? DEFAULT_MAP_CENTER
    const start = { lat: pickup.lat + 0.012, lng: pickup.lng + 0.008 }
    let progress = 0
    const intervalId = window.setInterval(() => {
      progress = Math.min(1, progress + 0.08)
      setDriverLocation(interpolateLocation(start, pickup, progress))
      if (progress >= 1) window.clearInterval(intervalId)
    }, LOCATION_UPDATE_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [ride?.id, ride?.state])

  useEffect(() => {
    if (ride?.state !== 'started') return undefined
    const intervalId = window.setInterval(() => {
      setTripElapsedSeconds((seconds) => seconds + 1)
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [ride?.state])

  useEffect(() => {
    if (!earningsSummary) return undefined
    const timeoutId = window.setTimeout(() => navigate('/driver'), 6000)
    return () => window.clearTimeout(timeoutId)
  }, [earningsSummary, navigate])

  if (!ride) {
    return (
      <main className="driver-trip-missing">
        <h1>Trip not found</h1>
        <p>This request may have expired from this browser.</p>
        <button type="button" className="driver-primary-button" onClick={() => navigate('/driver')}>Return to dashboard</button>
      </main>
    )
  }

  const isApproaching = ride.state === 'accepted'
  const isArrived = ride.state === 'arrived'
  const isStarted = ride.state === 'started'
  const isCompleted = ride.state === 'completed'
  const target = isStarted ? ride.dropoff ?? DEFAULT_MAP_CENTER : ride.pickup ?? DEFAULT_MAP_CENTER
  const currentFare = isStarted
    ? calculateFinalFare(ride, tripElapsedSeconds)
    : ride.estimatedFare ?? PRICING_CONFIG.minimumFare
  const routeMarkers = [
    { id: 'driver', position: driverLocation, kind: 'driver' },
    { id: 'target', position: target, kind: isStarted ? 'dropoff' : 'pickup' },
  ]
  const routeLine = [driverLocation, target]

  const markArrived = () => {
    const updatedRide = updateStatus('arrived', { driverLocation: ride.pickup })
    if (!updatedRide) return
    setDriverLocation(ride.pickup ?? DEFAULT_MAP_CENTER)
    eventBus.emit('ride:arrived', { rideId, driverId: ride.driverId, updates: { driverLocation: ride.pickup } })
    toast.success('Pickup marked as arrived')
  }

  const startTrip = () => {
    const updatedRide = updateStatus('started', { tripStartedAt: new Date().toISOString() })
    if (!updatedRide) return
    eventBus.emit('ride:started', { rideId, driverId: ride.driverId })
    toast.success('Trip started')
  }

  const completeTrip = () => {
    const finalFare = calculateFinalFare(ride, tripElapsedSeconds)
    const driverEarnings = calculateDriverEarnings(finalFare)
    const completedRide = updateStatus('completed', {
      finalFare,
      driverEarnings,
      actualDurationMin: (ride.estimatedDurationMin ?? 0) + tripElapsedSeconds / 60,
      completedAt: new Date().toISOString(),
    })
    if (!completedRide) return

    eventBus.emit('ride:completed', {
      rideId,
      driverId: ride.driverId,
      updates: { finalFare, driverEarnings },
    })
    setEarningsSummary({ finalFare, driverEarnings, elapsedSeconds: tripElapsedSeconds })
  }

  const statusHeadline = isCompleted
    ? 'Trip complete'
    : isStarted
      ? `Trip in progress · ${formatElapsedTime(tripElapsedSeconds)}`
      : isArrived
        ? 'Pickup reached'
        : isApproaching
          ? 'Head to pickup'
          : 'Trip request'

  return (
    <main className="driver-trip-page">
      <MapView center={driverLocation} zoom={15} markers={routeMarkers} polyline={routeLine} className="driver-trip-map" />
      <header className="driver-trip-topbar">
        <button type="button" aria-label="Back to dashboard" onClick={() => navigate('/driver')}><FiArrowLeft /></button>
        <div><span className="eyebrow">{ride.rideNumber}</span><strong>{statusHeadline}</strong></div>
        <span className="trip-map-distance">{formatDistance(ride.distanceKm ?? 0)}</span>
      </header>

      <section className="driver-trip-panel">
        <div className="driver-trip-panel-heading">
          <div><span className="eyebrow">{isStarted ? 'RIDER DESTINATION' : 'PICKUP NAVIGATION'}</span><h1>{target.name ?? 'Colombo'}</h1></div>
          <div className="driver-meter"><small>FARE METER</small><strong>{formatCurrency(currentFare)}</strong></div>
        </div>
        <div className="driver-trip-route">
          <span className="driver-route-pin"><FiNavigation /></span>
          <div><strong>{isStarted ? 'Navigate to drop-off' : 'Navigate to pickup'}</strong><small>{formatDistance(ride.distanceKm ?? 0)} estimated trip distance</small></div>
          <FiArrowUpRight />
        </div>
        <div className="driver-turn-list" aria-label="Navigation instructions">
          {MOCK_TURNS.map(({ direction, detail, distance, icon: Icon }) => (
            <div className="driver-turn" key={direction}>
              <span><Icon /></span><div><strong>{direction}</strong><small>{detail}</small></div><small>{distance}</small>
            </div>
          ))}
        </div>

        {!isCompleted && !isStarted && !isArrived && (
          <button type="button" className="driver-primary-button" onClick={markArrived}>Arrived at Pickup</button>
        )}
        {isArrived && (
          <button type="button" className="driver-primary-button" onClick={startTrip}>Start Trip</button>
        )}
        {isStarted && (
          <button type="button" className="driver-primary-button" onClick={completeTrip}>Complete Trip</button>
        )}
        {isCompleted && (
          <button type="button" className="driver-primary-button" onClick={() => navigate('/driver')}>Back to Home</button>
        )}
      </section>

      {earningsSummary && (
        <div className="driver-summary-scrim" role="presentation">
          <section className="driver-summary-modal" role="dialog" aria-modal="true" aria-labelledby="earnings-summary-title">
            <span className="driver-summary-check"><FiCheck /></span>
            <span className="eyebrow">NICE WORK</span>
            <h2 id="earnings-summary-title">Trip complete</h2>
            <p>{ride.pickup?.name ?? 'Pickup'} to {ride.dropoff?.name ?? 'Drop-off'}</p>
            <div className="summary-fare"><span>Rider paid</span><strong>{formatCurrency(earningsSummary.finalFare)}</strong></div>
            <div className="summary-fare summary-fare--net"><span>Your earnings</span><strong>{formatCurrency(earningsSummary.driverEarnings)}</strong></div>
            <small>Trip time {formatElapsedTime(earningsSummary.elapsedSeconds)}</small>
            <button type="button" className="driver-primary-button" onClick={() => navigate('/driver')}>Done</button>
          </section>
        </div>
      )}
    </main>
  )
}