import { useEffect, useState } from 'react'
import { FiMapPin, FiNavigation, FiStar, FiX } from 'react-icons/fi'
import { haversineDistance } from '../../../core/algorithms/haversine.js'
import { calculateDriverEarnings } from '../../../core/algorithms/fareCalculator.js'
import { formatCurrency } from '../../../shared/utils/formatters.js'
import { formatDistance } from '../../../shared/utils/geoUtils.js'

function getDistance(from, to) {
  if (!from || !to) return 0
  return haversineDistance(from.lat, from.lng, to.lat, to.lng)
}

export default function RideRequestModal({ request, driverLocation, onAccept, onReject }) {
  const [secondsLeft, setSecondsLeft] = useState(15)

  useEffect(() => {
    if (!request) return undefined

    setSecondsLeft(15)
    const intervalId = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    const timeoutId = window.setTimeout(() => onReject(request), 15000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [onReject, request?.id])

  if (!request) return null

  const pickupDistance = getDistance(driverLocation, request.pickup)
  const tripDistance = request.distanceKm ?? getDistance(request.pickup, request.dropoff)
  const riderEarnings = calculateDriverEarnings(request.estimatedFare ?? 0)
  const riderRating = request.riderRating ?? request.rider?.rating ?? 4.8

  return (
    <div className="driver-request-scrim" role="presentation">
      <section className="driver-request-modal" role="dialog" aria-modal="true" aria-labelledby="request-title">
        <div className="request-countdown-row">
          <span className="eyebrow">NEW RIDE REQUEST</span>
          <span className="request-countdown" aria-label={`${secondsLeft} seconds remaining`}>
            <i style={{ '--countdown-progress': `${(secondsLeft / 15) * 100}%` }} />
            {secondsLeft}s
          </span>
        </div>
        <header className="request-route-heading">
          <div>
            <h2 id="request-title">Colombo pickup</h2>
            <p>{request.pickup?.name ?? 'Pickup point'}</p>
          </div>
          <span className="request-rider-rating"><FiStar /> {riderRating}</span>
        </header>
        <div className="request-route-points">
          <span><i className="request-pickup-dot" /><strong>{request.pickup?.name ?? 'Pickup location'}</strong></span>
          <b />
          <span><i className="request-dropoff-dot" /><strong>{request.dropoff?.name ?? 'Drop-off location'}</strong></span>
        </div>
        <div className="request-metrics">
          <div><FiMapPin /><strong>{formatDistance(pickupDistance)}</strong><small>to pickup</small></div>
          <div><FiNavigation /><strong>{formatDistance(tripDistance)}</strong><small>trip distance</small></div>
          <div className="request-earnings"><strong>{formatCurrency(riderEarnings)}</strong><small>est. earnings</small></div>
        </div>
        <div className="request-progress-track" aria-hidden="true"><span style={{ width: `${(secondsLeft / 15) * 100}%` }} /></div>
        <div className="request-actions">
          <button type="button" className="request-reject" onClick={() => onReject(request)}><FiX /> Skip</button>
          <button type="button" className="request-accept" onClick={() => onAccept(request)}>Accept ride</button>
        </div>
      </section>
    </div>
  )
}