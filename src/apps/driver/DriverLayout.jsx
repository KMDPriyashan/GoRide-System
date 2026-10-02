import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { FiDollarSign, FiHome, FiUser } from 'react-icons/fi'

const NAV_ITEMS = [
  { to: '/driver', label: 'Home', icon: FiHome, end: true },
  { to: '/driver/earnings', label: 'Earnings', icon: FiDollarSign },
  { to: '/driver/profile', label: 'Profile', icon: FiUser },
]

export default function DriverLayout() {
  const { pathname } = useLocation()
  const showBottomNav = !pathname.includes('/trip/')

  return (
    <div className="driver-shell">
      <Outlet />
      {showBottomNav && (
        <nav className="driver-bottom-nav" aria-label="Driver navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `driver-nav-item${isActive ? ' is-active' : ''}`}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}