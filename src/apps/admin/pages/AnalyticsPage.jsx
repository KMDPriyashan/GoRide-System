import { useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getDrivers, getRides, driverName, downloadCsv, localDayKey, money, rideFare, rideState } from '../adminUtils.js'

const dateInput = (date) => localDayKey(date)

function startState() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 29)
  return [dateInput(start), dateInput(end)]
}

function chartCard(title, detail, rows, filename, chart, emptyText) {
  return <section className="admin-panel"><div className="admin-panel-heading"><div><h2>{title}</h2><p>{detail}</p></div><button className="admin-icon-button" type="button" title={`Export ${title} as CSV`} aria-label={`Export ${title} as CSV`} onClick={() => downloadCsv(filename, rows)} disabled={!rows.length}><FiDownload /></button></div><div className="admin-chart-wrap">{rows.length ? chart : <div className="admin-chart-empty">{emptyText}</div>}</div></section>
}

export default function AnalyticsPage() {
  const [initialFrom, initialTo] = startState()
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const drivers = getDrivers()
  const rides = getRides().filter((ride) => {
    const created = new Date(ride.createdAt ?? ride.updatedAt ?? 0)
    return (!from || created >= new Date(`${from}T00:00:00`)) && (!to || created < new Date(`${to}T23:59:59`))
  })
  const data = (() => {
    const completed = rides.filter((ride) => rideState(ride) === 'completed')
    const cancellations = rides.filter((ride) => rideState(ride) === 'cancelled')
    const dayMap = new Map()
    completed.forEach((ride) => {
      const day = localDayKey(new Date(ride.completedAt ?? ride.createdAt))
      dayMap.set(day, (dayMap.get(day) ?? 0) + rideFare(ride))
    })
    const revenue = [...dayMap].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, revenue: total }))
    const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const heat = weekdayLabels.flatMap((day, weekday) => Array.from({ length: 24 }, (_, hour) => ({ day, weekday, hour, count: rides.filter((ride) => {
      const date = new Date(ride.createdAt ?? 0)
      return (date.getDay() + 6) % 7 === weekday && date.getHours() === hour
    }).length })))
    const routeMap = new Map()
    rides.forEach((ride) => {
      const route = `${ride.pickup?.name ?? 'Pickup'} → ${ride.dropoff?.name ?? 'Dropoff'}`
      routeMap.set(route, (routeMap.get(route) ?? 0) + 1)
    })
    const routes = [...routeMap].map(([route, count]) => ({ route, count })).sort((a, b) => b.count - a.count).slice(0, 10)
    const reasons = new Map()
    cancellations.forEach((ride) => {
      const reason = ride.cancellationReason ?? ride.cancelReason ?? 'Not specified'
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
    })
    const cancellationData = [...reasons].map(([reason, count]) => ({ reason, count }))
    const utilization = drivers.map((driver) => ({ driver: driverName(driver), trips: completed.filter((ride) => ride.driverId === driver.id).length }))
    return { revenue, heat, routes, cancellationData, utilization }
  })()
  const maxHeat = Math.max(1, ...data.heat.map((item) => item.count))

  return <>
    <div className="admin-page-heading"><div><span className="admin-eyebrow">NETWORK PERFORMANCE</span><h1>Analytics</h1><p>Understand demand, revenue and fleet activity.</p></div><div className="admin-toolbar" style={{ marginBottom: 0 }}><label className="admin-field">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="admin-field">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div></div>
    <div className="admin-card-grid">
      {chartCard('Revenue trend', 'Completed ride revenue by day', data.revenue, 'revenue-trend.csv', <ResponsiveContainer width="100%" height="100%"><LineChart data={data.revenue} margin={{ top: 6, right: 10, bottom: 0, left: -12 }}><CartesianGrid stroke="#edf1ee" vertical={false} /><XAxis dataKey="date" interval="preserveStartEnd" tickLine={false} axisLine={false} tick={{ fill: '#86928a', fontSize: 8 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#86928a', fontSize: 8 }} /><Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 5, borderColor: '#e3e9e5', fontSize: 10 }} /><Line type="monotone" dataKey="revenue" stroke="#10a873" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer>, 'Completed ride revenue will appear for this range.')}
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Peak hours heatmap</h2><p>Ride requests by hour and weekday</p></div><button className="admin-icon-button" type="button" title="Export peak hours as CSV" aria-label="Export peak hours as CSV" onClick={() => downloadCsv('peak-hours.csv', data.heat)} disabled={!rides.length}><FiDownload /></button></div><div className="admin-panel-body"><div style={{ display: 'grid', gridTemplateColumns: '28px repeat(24,minmax(5px,1fr))', gap: 3, alignItems: 'center' }}><span />{Array.from({ length: 24 }, (_, hour) => <span key={hour} style={{ color: '#87938b', fontSize: 7, textAlign: 'center' }}>{hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}</span>)}{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].flatMap((day) => [<span key={`${day}-label`} style={{ color: '#78847d', fontSize: 8 }}>{day}</span>, ...data.heat.filter((item) => item.day === day).map((item) => <span key={`${day}-${item.hour}`} title={`${day} ${String(item.hour).padStart(2, '0')}:00 · ${item.count} rides`} style={{ height: 17, borderRadius: 2, background: item.count ? `rgba(16,168,115,${0.15 + item.count / maxHeat * 0.8})` : '#eff3f0' }} />)])}</div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, color: '#86928a', fontSize: 8 }}><span>Fewer rides</span><span>More rides</span></div></div></section>
      {chartCard('Popular routes', 'Top 10 by ride count', data.routes, 'popular-routes.csv', <ResponsiveContainer width="100%" height="100%"><BarChart data={data.routes} layout="vertical" margin={{ top: 3, right: 12, bottom: 0, left: 15 }}><CartesianGrid stroke="#edf1ee" horizontal={false} /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#86928a', fontSize: 8 }} /><YAxis type="category" dataKey="route" width={115} tickLine={false} axisLine={false} tick={{ fill: '#66736b', fontSize: 8 }} /><Tooltip contentStyle={{ borderRadius: 5, borderColor: '#e3e9e5', fontSize: 10 }} /><Bar dataKey="count" fill="#62bd91" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer>, 'Route rankings will appear when rides are recorded.')}
      {chartCard('Cancellation rate by reason', 'Cancelled rides in selected range', data.cancellationData, 'cancellations-by-reason.csv', <ResponsiveContainer width="100%" height="100%"><BarChart data={data.cancellationData} margin={{ top: 5, right: 10, bottom: 0, left: -12 }}><CartesianGrid stroke="#edf1ee" vertical={false} /><XAxis dataKey="reason" interval={0} tickLine={false} axisLine={false} tick={{ fill: '#86928a', fontSize: 8 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#86928a', fontSize: 8 }} /><Tooltip contentStyle={{ borderRadius: 5, borderColor: '#e3e9e5', fontSize: 10 }} /><Bar dataKey="count" fill="#e58d76" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>, 'No cancellations recorded in this range.')}
      {chartCard('Driver utilization', 'Completed trips by driver', data.utilization, 'driver-utilization.csv', <ResponsiveContainer width="100%" height="100%"><BarChart data={data.utilization} margin={{ top: 5, right: 10, bottom: 0, left: -12 }}><CartesianGrid stroke="#edf1ee" vertical={false} /><XAxis dataKey="driver" interval={0} tickLine={false} axisLine={false} tick={{ fill: '#86928a', fontSize: 8 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#86928a', fontSize: 8 }} /><Tooltip contentStyle={{ borderRadius: 5, borderColor: '#e3e9e5', fontSize: 10 }} /><Bar dataKey="trips" fill="#79a5dc" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>, 'Add drivers to see fleet utilization.')}
    </div>
  </>
}