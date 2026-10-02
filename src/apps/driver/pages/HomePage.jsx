import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiActivity, FiClock, FiMapPin, FiPower, FiTrendingUp } from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext.jsx'
import { eventBus } from '../../../core/eventBus/eventBus.js'
import { calculateDriverEarnings } from '../../../core/algorithms/fareCalculator.js'
import { DEFAULT_MAP_CENTER, LOCATION_UPDATE_INTERVAL_MS } from '../../../config/appConfig.js'
import { getItem, setItem } from '../../../shared/utils/storage.js'
import { formatCurrency } from '../../../shared/utils/formatters.js'
import MapView from '../../../shared/components/Map/MapView.jsx'
import RideRequestModal from '../components/RideRequestModal.jsx'

const ONLINE_KEY = 'gr_driver_online'
const ONLINE_SECONDS_KEY = 'gr_driver_seconds_today'
const DRIVER_DEMO_ID = 'driver-demo'

function getStoredRides() {
  const rides = getItem('gr_rides', [])
  return Array.isArray(rides) ? rides : []
}

function formatOnlineTime(seconds) {
  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

export default function DriverHomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const driverId = user?.id ?? DRIVER_DEMO_ID
  const [isOnline, setIsOnline] = useState(() => getItem(ONLINE_KEY, false) === true)
  const [driverLocation, setDriverLocation] = useState(DEFAULT_MAP_CENTER)
  const [onlineSeconds, setOnlineSeconds] = useState(() => getItem(ONLINE_SECONDS_KEY, 0) || 0)
  const [requests, setRequests] = useState([])
  const tickRef = useRef(0)
  const queuedIds = useRef(new Set())

  useEffect(() => {
    if (!isOnline) return undefined

    const intervalId = window.setInterval(() => {
      tickRef.current += 1
      setOnlineSeconds((seconds) => {
        const nextSeconds = seconds + 1
        setItem(ONLINE_SECONDS_KEY, nextSeconds)
        return nextSeconds
      })
      if (tickRef.current % Math.max(1, LOCATION_UPDATE_INTERVAL_MS / 1000) === 0) {
        setDriverLocation(() => {
          const tick = tickRef.current
          return {
            lat: DEFAULT_MAP_CENTER.lat + Math.sin(tick / 28) * 0.0018,
            lng: DEFAULT_MAP_CENTER.lng + Math.cos(tick / 31) * 0.0022,
          }
        })
      }
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isOnline])

  const onRideRequested = useCallback((ride) => {
    if (!ride?.id || ride.status !== 'requested' || queuedIds.current.has(ride.id)) return
    queuedIds.current.add(ride.id)
    setRequests((pending) => [...pending, ride])
  }, [])

  useEffect(() => {
    if (!isOnline) return undefined
    eventBus.on('ride:requested', onRideRequested)
    return () => eventBus.off('ride:requested', onRideRequested)
  }, [isOnline, onRideRequested])

  const setOnline = (nextOnline) => {
    setIsOnline(nextOnline)
    setItem(ONLINE_KEY, nextOnline)
    if (nextOnline) toast.success('You are online. Looking for rides.')
    else {
      setRequests([])
      queuedIds.current.clear()
      toast.info('You are offline.')
    }
  }

  const removeRequest = useCallback((request) => {
    queuedIds.current.delete(request.id)
    setRequests((pending) => pending.filter((ride) => ride.id !== request.id))
  }, [])

  const rejectRide = useCallback((request) => {
    removeRequest(request)
    eventBus.emit('ride:rejected', { rideId: request.id, driverId })
  }, [driverId, removeRequest])

  const acceptRide = (request) => {
    const rides = getStoredRides()
    const storedRide = rides.find((ride) => ride.id === request.id) ?? request
    const acceptedRide = {
      ...storedRide,
      driverId,
      driverLocation,
      status: 'accepted',
      state: 'accepted',
      acceptedAt: new Date().toISOString(),
    }
    const updatedRides = rides.some((ride) => ride.id === request.id)
      ? rides.map((ride) => ride.id === request.id ? acceptedRide : ride)
      : [...rides, acceptedRide]
    setItem('gr_rides', updatedRides)
    removeRequest(request)
    eventBus.emit('ride:accepted', {
      rideId: request.id,
      driverId,
      updates: { driverId, driverLocation },
    })
    navigate(`/driver/trip/${request.id}`, { state: { ride: acceptedRide } })
  }

  const assignedRides = useMemo(() => {
    return getStoredRides().filter((ride) => ride.driverId === driverId)
  }, [driverId, requests, isOnline])
  const completedRides = assignedRides.filter((ride) => (ride.status ?? ride.state) === 'completed')
  const earningsToday = completedRides.reduce((total, ride) => {
    return total + calculateDriverEarnings(ride.finalFare ?? ride.estimatedFare ?? 0)
  }, 0)
  const mapMarkers = [{ id: 'driver-location', position: driverLocation, kind: 'driver' }]

  return (
    <main className="driver-home-page">
      <MapView center={driverLocation} zoom={14} markers={mapMarkers} className="driver-home-map" />
      <header className="driver-topbar">
        <div className="driver-brand"><span>G</span><div><strong>GoRide</strong><small>DRIVER</small></div></div>
        <div className={`driver-connect-state${isOnline ? ' is-online' : ''}`}><i />{isOnline ? 'ONLINE' : 'OFFLINE'}</div>
      </header>

      <section className={`driver-online-panel${isOnline ? ' is-online' : ''}`}>
        <div className="online-panel-copy">
          <span className="eyebrow">DRIVER MODE</span>
          <h1>{isOnline ? 'You’re on the road.' : 'Ready when you are.'}</h1>
          <p>{isOnline ? 'Your location is being shared with nearby riders.' : 'Go online to see nearby ride requests.'}</p>
        </div>
        <button
          type="button"
          className={`online-toggle${isOnline ? ' is-online' : ''}`}
          role="switch"
          aria-checked={isOnline}
          aria-label={isOnline ? 'Go offline' : 'Go online'}
          onClick={() => setOnline(!isOnline)}
        >
          <span><FiPower /></span>
        </button>
        <div className="online-toggle-label">{isOnline ? 'GO OFFLINE' : 'GO ONLINE'}</div>
      </section>

      <section className="driver-stats-panel" aria-label="Today's stats">
        <div className="driver-stats-heading"><span className="eyebrow">TODAY AT A GLANCE</span><FiTrendingUp /></div>
        <div className="driver-stats-grid">
          <div><span>Earned</span><strong>{formatCurrency(earningsToday)}</strong></div>
          <div><span>Trips</span><strong>{completedRides.length}</strong></div>
          <div><span>Online</span><strong>{formatOnlineTime(onlineSeconds)}</strong></div>
        </div>
        <div className="driver-location-status"><FiMapPin /><span>{isOnline ? 'Location sharing active' : 'Location sharing paused'}</span><FiActivity /></div>
      </section>

      {isOnline && (
        <div className="driver-map-caption"><span className="driver-pulse" /> Nearby requests are coming your way</div>
      )}
      {!isOnline && (
        <div className="driver-map-locked"><FiClock /> Your shift starts when you go online.</div>
      )}
      <RideRequestModal
        request={requests[0]}
        driverLocation={driverLocation}
        onAccept={acceptRide}
        onReject={rejectRide}
      />
    </main>
  )
}