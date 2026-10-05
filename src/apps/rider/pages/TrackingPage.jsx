import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiCheck, FiMessageCircle, FiPhone, FiX } from 'react-icons/fi'
import { eventBus } from '../../../core/eventBus/eventBus.js'
import { canTransition } from '../../../core/stateMachine/rideStateMachine.js'
import { transitionRide } from '../../../core/models/Ride.js'
import { DEFAULT_MAP_CENTER } from '../../../config/appConfig.js'
import { getItem, setItem } from '../../../shared/utils/storage.js'
import { formatCurrency } from '../../../shared/utils/formatters.js'
import { formatDistance } from '../../../shared/utils/geoUtils.js'
import MapView from '../../../shared/components/Map/MapView.jsx'

const DRIVER_PROFILE = {
  name: 'Samith Perera',
  rating: '4.9',
  vehicle: 'Toyota Aqua · CAB-4821',
  color: 'Pearl white',
}

const EVENT_TO_STATE = {
  'ride:accepted': 'accepted',
  'ride:arrived': 'arrived',
  'ride:started': 'started',
  'ride:completed': 'completed',
}

const TIMELINE = [
  { state: 'requested', label: 'Request sent' },
  { state: 'accepted', label: 'Driver confirmed' },
  { state: 'arrived', label: 'Driver arrived' },
  { state: 'started', label: 'On your way' },
  { state: 'completed', label: 'Trip complete' },
]

function readRide(rideId, routeRide) {
  if (routeRide?.id === rideId) return routeRide
  const rides = getItem('gr_rides', [])
  return Array.isArray(rides) ? rides.find((ride) => ride.id === rideId) ?? null : null
}

function saveRide(ride) {
  const rides = getItem('gr_rides', [])
  const currentRides = Array.isArray(rides) ? rides : []
  const rideIndex = currentRides.findIndex((currentRide) => currentRide.id === ride.id)
  if (rideIndex < 0) setItem('gr_rides', [...currentRides, ride])
  else {
    currentRides[rideIndex] = ride
    setItem('gr_rides', currentRides)
  }
}

function interpolatePoint(from, to, progress) {
  return {
    lat: from.lat + (to.lat - from.lat) * progress,
    lng: from.lng + (to.lng - from.lng) * progress,
  }
}

export default function TrackingPage() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [ride, setRide] = useState(() => readRide(rideId, location.state?.ride))
  const rideRef = useRef(ride)
  const [driverLocation, setDriverLocation] = useState(() => {
    const pickup = ride?.pickup ?? DEFAULT_MAP_CENTER
    return { lat: pickup.lat + 0.014, lng: pickup.lng - 0.009 }
  })

  useEffect(() => { rideRef.current = ride }, [ride])

  const moveRideToState = useCallback((nextState, updates = {}) => {
    setRide((currentRide) => {
      if (!currentRide || currentRide.state === nextState || !canTransition(currentRide.state, nextState)) {
        return currentRide
      }

      const nextRide = transitionRide(currentRide, nextState, { ...updates, status: nextState })
      rideRef.current = nextRide
      saveRide(nextRide)
      return nextRide
    })
  }, [])

  useEffect(() => {
    const subscriptions = Object.entries(EVENT_TO_STATE).map(([eventName, nextState]) => {
      const listener = (payload = {}) => {
        if (payload.rideId && payload.rideId !== rideId) return
        if (payload.id && payload.id !== rideId) return
        moveRideToState(nextState, payload.updates ?? {})
      }
      eventBus.on(eventName, listener)
      return [eventName, listener]
    })

    return () => {
      subscriptions.forEach(([eventName, listener]) => eventBus.off(eventName, listener))
    }
  }, [moveRideToState, rideId])

  useEffect(() => {
    const currentRide = rideRef.current
    if (!currentRide || currentRide.state !== 'accepted') return undefined

    const pickup = currentRide.pickup ?? DEFAULT_MAP_CENTER
    const driverStart = currentRide.driverLocation ?? { lat: pickup.lat + 0.014, lng: pickup.lng - 0.009 }
    const totalSteps = 10
    let step = 0

    const intervalId = window.setInterval(() => {
      step += 1
      setDriverLocation(interpolatePoint(driverStart, pickup, Math.min(1, step / totalSteps)))
      if (step >= totalSteps) window.clearInterval(intervalId)
    }, 1100)

    return () => window.clearInterval(intervalId)
  }, [ride?.state, rideId])

  const cancelRide = () => {
    moveRideToState('cancelled')
    eventBus.emit('ride:cancelled', { rideId })
    toast.info('Ride cancelled')
    navigate('/rider/rides')
  }

  const mapMarkers = useMemo(() => {
    if (!ride) return []
    const markers = [
      { id: 'pickup', position: ride.pickup, kind: 'pickup' },
      ...(ride.dropoff ? [{ id: 'dropoff', position: ride.dropoff, kind: 'dropoff' }] : []),
    ]
    if (ride.state !== 'completed' && ride.state !== 'cancelled') {
      markers.push({ id: 'driver', position: driverLocation, kind: 'driver' })
    }
    return markers
  }, [driverLocation, ride])

  if (!ride) {
    return (
      <main className="tracking-missing">
        <h1>Ride not found</h1>
        <p>This ride may have expired from this browser.</p>
        <button type="button" className="confirm-ride-button" onClick={() => navigate('/rider/rides')}>View my rides</button>
      </main>
    )
  }

  const timelineIndex = TIMELINE.findIndex(({ state }) => state === ride.state)
  const driverEnRoute = ['requested', 'accepted'].includes(ride.state)
  const linePositions = driverEnRoute
    ? [driverLocation, ride.pickup]
    : ride.state === 'started' ? [ride.pickup, ride.dropoff] : []
  const mapCenter = ride.state === 'started' ? ride.dropoff : driverLocation
  const statusTitle = {
    requested: 'Finding your driver',
    accepted: 'Your driver is on the way',
    arrived: 'Your driver is here',
    started: 'Enjoy the ride',
    completed: 'You have arrived',
    cancelled: 'Ride cancelled',
  }[ride.state]

  return (
    <main className="tracking-page">
      <MapView center={mapCenter} zoom={14} markers={mapMarkers} polyline={linePositions} className="tracking-map" />
      <header className="tracking-topbar">
        <button type="button" className="back-map-button" aria-label="Back to rides" onClick={() => navigate('/rider/rides')}>
          <FiArrowLeft />
        </button>
        <div><span className="eyebrow">{ride.rideNumber}</span><strong>{statusTitle}</strong></div>
        <span className="live-indicator"><i /> LIVE</span>
      </header>
      <section className="tracking-sheet">
        <div className="sheet-grip" />
        <div className="tracking-status-row">
          <div><span className="eyebrow">YOUR GOride {ride.rideType?.toUpperCase() ?? 'MINI'}</span><h1>{statusTitle}</h1></div>
          <div className="tracking-eta"><strong>{ride.estimatedDurationMin ?? 8}</strong><span>MIN</span></div>
        </div>

        <div className="driver-card">
          <div className="driver-avatar" aria-label="Driver photo placeholder">SP</div>
          <div className="driver-details">
            <strong>{DRIVER_PROFILE.name}</strong>
            <span><b>★ {DRIVER_PROFILE.rating}</b> · {DRIVER_PROFILE.vehicle}</span>
          </div>
          <div className="driver-actions">
            <button type="button" aria-label="Call driver" onClick={() => toast.info('Calling your driver…')}><FiPhone /></button>
            <button type="button" aria-label="Chat with driver" onClick={() => toast.info('Driver chat is coming soon.')}><FiMessageCircle /></button>
          </div>
        </div>

        <div className="tracking-route-summary">
          <span className="route-origin-dot" /><span className="tracking-route-line" /><span className="route-destination-dot" />
          <div><strong>{ride.pickup?.name ?? 'Pickup location'}</strong><small>{ride.dropoff?.name ?? 'Destination'}</small></div>
          <strong>{formatCurrency(ride.estimatedFare ?? 0)}</strong>
        </div>

        <ol className="ride-timeline" aria-label="Ride status timeline">
          {TIMELINE.map(({ state, label }, index) => {
            const isComplete = timelineIndex >= index && timelineIndex >= 0
            const isCurrent = ride.state === state
            return (
              <li key={state} className={`${isComplete ? 'is-complete' : ''}${isCurrent ? ' is-current' : ''}`}>
                <span className="timeline-node">{isComplete && index < timelineIndex ? <FiCheck /> : null}</span>
                <span>{label}</span>
              </li>
            )
          })}
        </ol>

        {ride.state !== 'completed' && ride.state !== 'cancelled' && (
          <button type="button" className="cancel-ride-button" onClick={cancelRide}><FiX /> Cancel ride</button>
        )}
        {ride.state === 'completed' && (
          <div className="trip-complete-note"><FiCheck /> Trip complete · {formatDistance(ride.distanceKm ?? 0)}</div>
        )}
      </section>
    </main>
  )
}