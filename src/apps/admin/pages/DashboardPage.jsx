import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiActivity, FiAlertTriangle, FiClock, FiDollarSign, FiUsers } from 'react-icons/fi'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts'
import MapView from '../../../shared/components/Map/MapView.jsx'
import { DEFAULT_MAP_CENTER } from '../../../config/appConfig.js'
import { getItem } from '../../../shared/utils/storage.js'
import { dateLabel, driverName, getDrivers, getRides, localDayKey, money, rideFare, rideState, riderName } from '../adminUtils.js'

function buildCharts(rides) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (6 - index))
    const key = localDayKey(day)
    return { key, label: day.toLocaleDateString(undefined, { weekday: 'short' }), rides: rides.filter((ride) => localDayKey(new Date(ride.createdAt ?? ride.updatedAt ?? today)) === key).length }
  })
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, revenue: rides.filter((ride) => rideState(ride) === 'completed' && new Date(ride.completedAt ?? ride.updatedAt ?? ride.createdAt).getHours() === hour && localDayKey(new Date(ride.completedAt ?? ride.updatedAt ?? ride.createdAt)) === localDayKey(today)).reduce((sum, ride) => sum + rideFare(ride), 0) }))
  return { days, hours }
}

export default function DashboardPage() {
  const [, refresh] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => refresh((value) => value + 1), 4000)
    const onStorage = () => refresh((value) => value + 1)
    window.addEventListener('storage', onStorage)
    return () => { window.clearInterval(timer); window.removeEventListener('storage', onStorage) }
  }, [])
  const rides = getRides()
  const drivers = getDrivers()
  const todayKey = localDayKey(new Date())
  const todayRides = rides.filter((ride) => localDayKey(new Date(ride.createdAt ?? ride.updatedAt ?? Date.now())) === todayKey)
  const completedToday = todayRides.filter((ride) => rideState(ride) === 'completed')
  const activeRides = rides.filter((ride) => ['accepted', 'arrived', 'started'].includes(rideState(ride)))
  const pendingDrivers = drivers.filter((driver) => (driver.driverProfile?.approvalStatus ?? driver.approvalStatus ?? 'pending') === 'pending')
  const chartData = buildCharts(rides)
  const locations = getItem('gr_driver_locations', [])
  const savedLocations = Array.isArray(locations) ? locations : []
  const legacyOnline = getItem('gr_driver_online', false) === true
  const currentUser = getItem('gr_current_user', null)
  const onlineDrivers = savedLocations.filter((entry) => entry.online).map((entry) => ({ ...entry, driver: drivers.find((driver) => driver.id === entry.driverId) })).filter((entry) => entry.driver)
  if (legacyOnline && currentUser?.userType === 'driver' && !onlineDrivers.some((entry) => entry.driverId === currentUser.id)) onlineDrivers.push({ driverId: currentUser.id, location: DEFAULT_MAP_CENTER, online: true, driver: currentUser })
  const markers = onlineDrivers.map((entry) => ({ id: entry.driverId, position: entry.location ?? DEFAULT_MAP_CENTER, kind: 'current' }))
  const polylines = activeRides.flatMap((ride) => {
    const points = ride.route ?? [ride.pickup, ride.dropoff].filter(Boolean).map((point) => ({ lat: point.lat ?? point.latitude, lng: point.lng ?? point.longitude }))
    return points.length > 1 ? [{ id: ride.id, positions: points }] : []
  })
  const stats = [
    { label: 'Active drivers', value: onlineDrivers.length, note: `${drivers.length} registered drivers`, icon: FiUsers },
    { label: 'Rides today', value: todayRides.length, note: `${completedToday.length} completed`, icon: FiActivity },
    { label: 'Revenue today', value: money(completedToday.reduce((sum, ride) => sum + rideFare(ride), 0)), note: 'From completed rides', icon: FiDollarSign },
    { label: 'Active rides', value: activeRides.length, note: 'In progress now', icon: FiClock },
  ]

  return (
    <>
      <div className="admin-page-heading"><div><span className="admin-eyebrow">LIVE OPERATIONS</span><h1>Dashboard</h1><p>Today at a glance across the GoRide network.</p></div><span className="admin-status admin-status--online">Live updates</span></div>
      {pendingDrivers.length > 0 && <section className="admin-alert"><div><FiAlertTriangle className="admin-alert-icon" /><div><strong>{pendingDrivers.length} driver approval{pendingDrivers.length === 1 ? '' : 's'} need review</strong><p>Review applications to get eligible drivers on the road.</p></div></div><Link className="admin-inline-link" to="/admin/drivers">Review applications →</Link></section>}
      <section className="admin-stat-grid" aria-label="Today's key metrics">{stats.map(({ label, value, note, icon: Icon }) => <article className="admin-stat" key={label}><div className="admin-stat-top"><span>{label}</span><span className="admin-stat-icon"><Icon /></span></div><strong className="admin-stat-value">{value}</strong><small className="admin-stat-note">{note}</small></article>)}</section>
      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-map-panel"><div className="admin-panel-heading"><div><h2>Network map</h2><p>{onlineDrivers.length} online drivers · {activeRides.length} active rides</p></div><span className="admin-status admin-status--online">Live</span></div><div className="admin-live-map"><MapView center={DEFAULT_MAP_CENTER} zoom={12} markers={markers} polylines={polylines} className="admin-map" /></div><div className="admin-map-legend"><span><i className="admin-legend-dot" />Online drivers</span><span><i className="admin-legend-line" />Active rides</span></div></section>
        <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Rides last 7 days</h2><p>Requests by day</p></div></div><div className="admin-chart-wrap">{rides.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData.days} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}><CartesianGrid stroke="#edf1ee" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#86928a', fontSize: 9 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#86928a', fontSize: 9 }} /><Tooltip contentStyle={{ borderRadius: 5, borderColor: '#e3e9e5', fontSize: 10 }} /><Line type="monotone" dataKey="rides" stroke="#10a873" strokeWidth={2.5} dot={{ r: 3, fill: '#10a873' }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer> : <div className="admin-chart-empty">Ride activity will appear here</div>}</div></section>
        <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Revenue by hour</h2><p>Today · completed rides</p></div></div><div className="admin-chart-wrap">{completedToday.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.hours} margin={{ top: 5, right: 8, bottom: 0, left: -14 }}><CartesianGrid stroke="#edf1ee" vertical={false} /><XAxis interval={5} dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: '#86928a', fontSize: 8 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#86928a', fontSize: 8 }} /><Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 5, borderColor: '#e3e9e5', fontSize: 10 }} /><Bar dataKey="revenue" fill="#63c799" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="admin-chart-empty">Completed ride revenue will appear here</div>}</div></section>
        <section className="admin-panel admin-recent-panel"><div className="admin-panel-heading"><div><h2>Recent rides</h2><p>Latest requests across the network</p></div><Link className="admin-inline-link" to="/admin/rides">All rides →</Link></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Ride</th><th>Rider</th><th>Driver</th><th>Route</th><th>Fare</th><th>Status</th><th>Created</th></tr></thead><tbody>{rides.length ? [...rides].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10).map((ride) => <tr key={ride.id}><td>{ride.rideNumber ?? ride.id?.slice(0, 8)}</td><td>{riderName(ride)}</td><td>{driverName(drivers.find((driver) => driver.id === ride.driverId))}</td><td>{ride.pickup?.name ?? 'Pickup'} → {ride.dropoff?.name ?? 'Dropoff'}</td><td>{money(rideFare(ride))}</td><td><span className={`admin-status admin-status--${rideState(ride)}`}>{rideState(ride)}</span></td><td>{dateLabel(ride.createdAt)}</td></tr>) : <tr><td colSpan="7" className="admin-empty">No rides have been recorded yet.</td></tr>}</tbody></table></div></section>
      </div>
    </>
  )
}