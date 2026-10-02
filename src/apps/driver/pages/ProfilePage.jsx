import { useNavigate } from 'react-router-dom'
import { FiArrowUpRight, FiFileText, FiLogOut, FiShield, FiStar, FiTruck, FiUser } from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext.jsx'
import { getItem, setItem } from '../../../shared/utils/storage.js'

const DRIVER_DEMO_ID = 'driver-demo'
const DOCUMENTS = [
  { name: 'Driver licence', number: 'B 7291846', expires: '18 Jan 2027', daysLeft: 108 },
  { name: 'Vehicle revenue licence', number: 'WP CAB-4821', expires: '02 Nov 2026', daysLeft: 31 },
  { name: 'Vehicle insurance', number: 'Ceylinco ·•• 8041', expires: '14 Oct 2026', daysLeft: 12 },
]

export default function DriverProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const driverId = user?.id ?? DRIVER_DEMO_ID
  const isOnline = getItem('gr_driver_online', false) === true
  const rides = getItem('gr_rides', [])
  const driverRides = (Array.isArray(rides) ? rides : []).filter((ride) => ride.driverId === driverId)
  const completedTrips = driverRides.filter((ride) => (ride.status ?? ride.state) === 'completed').length
  const acceptedTrips = driverRides.filter((ride) => ['accepted', 'arrived', 'started', 'completed'].includes(ride.status ?? ride.state)).length
  const acceptanceRate = driverRides.length > 0
    ? Math.round((acceptedTrips / driverRides.length) * 100)
    : 100
  const fullName = user?.fullName ?? 'Samith Perera'
  const initials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  const handleLogout = () => {
    logout()
    navigate('/driver', { replace: true })
  }

  return (
    <main className="driver-content-page driver-profile-page">
      <header className="driver-page-heading">
        <div><span className="eyebrow">DRIVER ACCOUNT</span><h1>Profile</h1></div>
        <span className={`driver-profile-status${isOnline ? ' is-online' : ''}`}><i />{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
      </header>

      <section className="driver-identity-row">
        <span className="driver-profile-avatar">{initials}</span>
        <div><h2>{fullName}</h2><p>{user?.phone ?? '+94 77 234 8120'}</p></div>
        <FiArrowUpRight />
      </section>

      <section className="driver-performance-grid" aria-label="Driver performance">
        <div><FiStar /><strong>4.9</strong><span>Rating</span></div>
        <div><FiTruck /><strong>{completedTrips}</strong><span>Total trips</span></div>
        <div><FiUser /><strong>{acceptanceRate}%</strong><span>Acceptance</span></div>
      </section>

      <section className="driver-vehicle-section">
        <header><div><span className="eyebrow">REGISTERED VEHICLE</span><h2>Vehicle details</h2></div><FiTruck /></header>
        <div className="driver-vehicle-row"><span className="vehicle-symbol">A</span><div><strong>Toyota Aqua</strong><small>Pearl white · 2019</small></div><b>WP CAB-4821</b></div>
      </section>

      <section className="driver-documents-section">
        <header><div><span className="eyebrow">KEEP THESE CURRENT</span><h2>Documents</h2></div><FiFileText /></header>
        <div className="driver-document-list">
          {DOCUMENTS.map((document) => (
            <article key={document.name} className={document.daysLeft <= 14 ? 'is-expiring' : ''}>
              <span className="document-icon"><FiFileText /></span>
              <div><strong>{document.name}</strong><small>{document.number}</small></div>
              <span className="document-expiry"><b>{document.daysLeft} days</b><small>Expires {document.expires}</small></span>
            </article>
          ))}
        </div>
        <p className="document-reminder"><FiShield /> Keep your documents up to date to stay available for trips.</p>
      </section>

      <button type="button" className="driver-signout-button" onClick={handleLogout}><FiLogOut /> Sign out</button>
    </main>
  )
}