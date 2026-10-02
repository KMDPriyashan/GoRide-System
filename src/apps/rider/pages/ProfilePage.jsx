import { useNavigate } from 'react-router-dom'
import { FiArrowUpRight, FiLogOut, FiShield, FiUser } from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext.jsx'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const fullName = user?.fullName || 'Guest rider'
  const initials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  const handleLogout = () => {
    logout()
    navigate('/rider', { replace: true })
  }

  return (
    <main className="content-page profile-page">
      <header className="content-page-header">
        <div><span className="eyebrow">YOUR ACCOUNT</span><h1>Profile</h1></div>
        <span className="profile-header-icon"><FiUser /></span>
      </header>
      <section className="profile-identity">
        <span className="profile-avatar">{initials}</span>
        <div><h2>{fullName}</h2><p>{user?.email || 'Sign in to sync your rides'}</p></div>
        <FiArrowUpRight />
      </section>
      <div className="profile-detail-list">
        <div><span>Phone</span><strong>{user?.phone || 'Not added'}</strong></div>
        <div><span>Account type</span><strong>{user?.userType || 'Rider'}</strong></div>
      </div>
      <section className="profile-safety-row">
        <span><FiShield /></span>
        <div><strong>Your safety matters</strong><small>Ride details stay with you.</small></div>
        <FiArrowUpRight />
      </section>
      {user ? (
        <button type="button" className="logout-button" onClick={handleLogout}><FiLogOut /> Sign out</button>
      ) : (
        <button type="button" className="logout-button" onClick={() => navigate('/login')}>Sign in</button>
      )}
    </main>
  )
}