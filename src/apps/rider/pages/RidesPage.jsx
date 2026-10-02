import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowUpRight, FiClock } from 'react-icons/fi'
import { getItem } from '../../../shared/utils/storage.js'
import { formatCurrency, formatDateTime } from '../../../shared/utils/formatters.js'

export default function RidesPage() {
  const navigate = useNavigate()
  const rides = useMemo(() => {
    const storedRides = getItem('gr_rides', [])
    return Array.isArray(storedRides) ? [...storedRides].reverse() : []
  }, [])

  return (
    <main className="content-page rides-page">
      <header className="content-page-header">
        <div><span className="eyebrow">YOUR JOURNEY</span><h1>My rides</h1></div>
        <span className="ride-count">{String(rides.length).padStart(2, '0')}</span>
      </header>
      {rides.length === 0 ? (
        <section className="empty-state">
          <span className="empty-state-icon"><FiClock /></span>
          <span className="eyebrow">NOTHING ON THE MAP YET</span>
          <h2>Your first ride is waiting.</h2>
          <p>Pick a destination and we’ll take it from there.</p>
          <button type="button" className="plan-ride-button" onClick={() => navigate('/rider')}>
            Find a ride <FiArrowUpRight />
          </button>
        </section>
      ) : (
        <div className="ride-history-list">
          {rides.map((ride) => (
            <button
              type="button"
              className="ride-history-item"
              key={ride.id}
              onClick={() => navigate(`/rider/tracking/${ride.id}`, { state: { ride } })}
            >
              <span className="ride-history-route"><i /><b /><i /></span>
              <span className="ride-history-main">
                <strong>{ride.pickup?.name ?? 'Colombo pickup'}</strong>
                <small>{ride.dropoff?.name ?? 'Destination'}</small>
                <small>{formatDateTime(ride.createdAt)}</small>
              </span>
              <span className="ride-history-aside">
                <strong>{formatCurrency(ride.estimatedFare ?? 0)}</strong>
                <small className={`status-label status-label--${ride.status ?? ride.state}`}>
                  {ride.status ?? ride.state}
                </small>
                <FiArrowUpRight />
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}