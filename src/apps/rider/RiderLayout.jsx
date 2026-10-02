import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { FiClock, FiHome, FiUser } from 'react-icons/fi'

const NAV_ITEMS = [
  { to: '/rider', label: 'Home', icon: FiHome, end: true },
  { to: '/rider/rides', label: 'My rides', icon: FiClock },
  { to: '/rider/profile', label: 'Profile', icon: FiUser },
]

export default function RiderLayout() {
  const { pathname } = useLocation()
  const showBottomNav = !pathname.includes('/booking') && !pathname.includes('/tracking/')

  return (
    <div className={`rider-shell${showBottomNav ? ' rider-shell--with-nav' : ''}`}>
      <Outlet />
      {showBottomNav && (
        <nav className="rider-bottom-nav" aria-label="Rider navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `rider-nav-item${isActive ? ' is-active' : ''}`}
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