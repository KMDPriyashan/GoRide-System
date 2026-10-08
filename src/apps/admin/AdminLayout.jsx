import { Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { FiActivity, FiBarChart2, FiClipboard, FiDollarSign, FiMap, FiSettings, FiUsers } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext.jsx'
import './admin.css'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: FiActivity, end: true },
  { to: '/admin/drivers', label: 'Drivers', icon: FiUsers },
  { to: '/admin/rides', label: 'Rides', icon: FiMap },
  { to: '/admin/analytics', label: 'Analytics', icon: FiBarChart2 },
  { to: '/admin/pricing', label: 'Pricing', icon: FiDollarSign },
  { to: '/admin/audit-logs', label: 'Audit logs', icon: FiClipboard },
]

export default function AdminLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const active = NAV_ITEMS.find((item) => item.end ? pathname === item.to : pathname.startsWith(item.to))
  const adminName = user?.fullName ?? user?.username ?? 'Operations admin'

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink className="admin-brand" to="/admin"><span className="admin-brand-mark">G</span><span>GoRide<small>OPERATIONS</small></span></NavLink>
        <span className="admin-nav-caption">WORKSPACE</span>
        <nav className="admin-nav" aria-label="Admin navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer"><span className="admin-online-dot" />All systems operational</div>
      </aside>
      <div className="admin-main-column">
        <header className="admin-topbar">
          <div><span className="admin-breadcrumb">Operations <b>/</b> {active?.label ?? 'Dashboard'}</span><span className="admin-topbar-title">{active?.label ?? 'Dashboard'}</span></div>
          <div className="admin-account"><span className="admin-avatar">{adminName.slice(0, 1).toUpperCase()}</span><span><strong>{adminName}</strong><small>Administrator</small></span><FiSettings aria-hidden="true" /></div>
        </header>
        <main className="admin-content"><Suspense fallback={<div className="admin-loading">Loading workspace...</div>}><Outlet /></Suspense></main>
      </div>
    </div>
  )
}