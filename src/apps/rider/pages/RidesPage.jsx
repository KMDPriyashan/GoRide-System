import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { FiArrowUpRight, FiClock } from 'react-icons/fi'
import { getItem } from '../../../shared/utils/storage.js'
import { formatCurrency, formatDateTime } from '../../../shared/utils/formatters.js'
import EmptyState from '../../../shared/components/common/EmptyState.jsx'
import RideStatusBadge from '../../../shared/components/common/RideStatusBadge.jsx'

export default function RidesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const rides = useMemo(() => {
    const storedRides = getItem('gr_rides', [])
    return Array.isArray(storedRides)
      ? storedRides.filter((ride) => ride.riderId === user?.id).reverse()
      : []
  }, [user?.id])

  return (
    <main className="content-page rides-page">
      <header className="content-page-header">
        <div><span className="eyebrow">YOUR JOURNEY</span><h1>My rides</h1></div>
        <span className="ride-count">{String(rides.length).padStart(2, '0')}</span>
      </header>
      {rides.length === 0 ? (
        <EmptyState icon={FiClock} eyebrow="NOTHING ON THE MAP YET" title="Your first ride is waiting." message="Pick a destination and we’ll take it from there." actionLabel="Find a ride" to="/rider/booking" className="empty-state" />
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
                <RideStatusBadge status={ride.status ?? ride.state} />
                <FiArrowUpRight />
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}