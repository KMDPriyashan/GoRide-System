import { useMemo, useState } from 'react'
import { FiEye, FiRefreshCw, FiX } from 'react-icons/fi'
import { dateLabel, driverForRide, driverName, getDrivers, getRides, getRiders, money, rideFare, riderName, rideState, writeAudit, writeRides } from '../adminUtils.js'

const TIMELINE = [
  ['requested', ['createdAt']],
  ['accepted', ['acceptedAt']],
  ['driver arrived', ['arrivedAt']],
  ['ride started', ['startedAt']],
  ['completed', ['completedAt']],
  ['cancelled', ['cancelledAt']],
]

export default function RidesPage() {
  const [rides, setRides] = useState(getRides)
  const drivers = getDrivers()
  const riders = getRiders()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [status, setStatus] = useState('all')
  const [driverId, setDriverId] = useState('all')
  const [riderId, setRiderId] = useState('all')
  const [selected, setSelected] = useState(null)
  const filtered = useMemo(() => rides.filter((ride) => {
    const created = new Date(ride.createdAt ?? ride.updatedAt ?? 0)
    return (!fromDate || created >= new Date(`${fromDate}T00:00:00`))
      && (!toDate || created < new Date(`${toDate}T23:59:59`))
      && (status === 'all' || rideState(ride) === status)
      && (driverId === 'all' || ride.driverId === driverId)
      && (riderId === 'all' || ride.riderId === riderId)
  }), [rides, fromDate, toDate, status, driverId, riderId])

  function updateRide(ride, changes, action) {
    const updated = { ...ride, ...changes, updatedAt: new Date().toISOString() }
    const next = rides.map((item) => item.id === ride.id ? updated : item)
    if (writeRides(next)) {
      setRides(next)
      setSelected(updated)
      writeAudit(action, `Ride ${ride.rideNumber ?? ride.id}`)
    }
  }

  return <>
    <div className="admin-page-heading"><div><span className="admin-eyebrow">TRIP OPERATIONS</span><h1>Rides</h1><p>Search ride history, inspect timelines and resolve issues.</p></div><span className="admin-filter-count">{filtered.length} rides</span></div>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Ride history</h2><p>Filter by trip date, status and account</p></div></div><div className="admin-panel-body"><div className="admin-toolbar"><input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /><input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /><select aria-label="Filter by ride status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{['requested', 'accepted', 'arrived', 'started', 'completed', 'cancelled'].map((value) => <option key={value} value={value}>{value}</option>)}</select><select aria-label="Filter by driver" value={driverId} onChange={(event) => setDriverId(event.target.value)}><option value="all">All drivers</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driverName(driver)}</option>)}</select><select aria-label="Filter by rider" value={riderId} onChange={(event) => setRiderId(event.target.value)}><option value="all">All riders</option>{riders.map((rider) => <option key={rider.id} value={rider.id}>{rider.fullName ?? rider.username}</option>)}</select></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Ride #</th><th>Rider</th><th>Driver</th><th>Route</th><th>Fare</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((ride) => <tr key={ride.id}><td>{ride.rideNumber ?? ride.id?.slice(0, 8)}</td><td>{riderName(ride, riders)}</td><td>{driverName(driverForRide(ride, drivers))}</td><td>{ride.pickup?.name ?? 'Pickup'} → {ride.dropoff?.name ?? 'Dropoff'}</td><td>{money(rideFare(ride))}{ride.refunded && <small> · refunded</small>}</td><td><span className={`admin-status admin-status--${rideState(ride)}`}>{rideState(ride)}</span></td><td><button className="admin-icon-button" aria-label={`View ride ${ride.rideNumber ?? ride.id}`} title="View details" type="button" onClick={() => setSelected(ride)}><FiEye /></button></td></tr>)}{!filtered.length && <tr><td className="admin-empty" colSpan="7">No rides match these filters.</td></tr>}</tbody></table></div></div></section>
    {selected && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="ride-modal-title"><header className="admin-modal-header"><div><span className="admin-eyebrow">{selected.rideNumber ?? selected.id}</span><h2 id="ride-modal-title">Ride details</h2></div><button className="admin-icon-button" aria-label="Close" type="button" onClick={() => setSelected(null)}><FiX /></button></header><div className="admin-modal-content"><div className="admin-detail-grid admin-section">{[['Rider', riderName(selected, riders)], ['Driver', driverName(driverForRide(selected, drivers))], ['Pickup', selected.pickup?.name ?? '—'], ['Dropoff', selected.dropoff?.name ?? '—'], ['Vehicle', selected.rideType ?? selected.vehicleType ?? '—'], ['Fare', money(rideFare(selected))], ['Status', rideState(selected)], ['Distance', selected.distanceKm ? `${selected.distanceKm} km` : '—']].map(([label, value]) => <div className="admin-detail" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><h3 className="admin-eyebrow">RIDE TIMELINE</h3><div className="admin-timeline">{TIMELINE.map(([label, fields]) => { const timestamp = fields.map((field) => selected[field]).find(Boolean); return timestamp ? <div className="admin-timeline-item" key={label}><strong>{label}</strong><small>{dateLabel(timestamp)}</small></div> : null })}{!selected.createdAt && <div className="admin-timeline-item"><strong>{rideState(selected)}</strong><small>{dateLabel(selected.updatedAt)}</small></div>}</div><div className="admin-row-actions">{!['completed', 'cancelled'].includes(rideState(selected)) && <button className="admin-button admin-button--danger" type="button" onClick={() => updateRide(selected, { state: 'cancelled', status: 'cancelled', cancelledAt: new Date().toISOString() }, 'Ride cancelled')}><FiX />Cancel ride</button>}{rideState(selected) === 'completed' && !selected.refunded && <button className="admin-button" type="button" onClick={() => updateRide(selected, { refunded: true, refundedAt: new Date().toISOString() }, 'Ride refunded')}><FiRefreshCw />Mark refunded</button>}{selected.refunded && <span className="admin-status admin-status--completed">Refunded</span>}</div></div></section></div>}
  </>
}