import { useMemo, useState } from 'react'
import { FiCheck, FiEye, FiPauseCircle, FiPlayCircle, FiX } from 'react-icons/fi'
import { getDrivers, getRides, getUsers, driverName, writeAudit, writeUsers } from '../adminUtils.js'

const approvalOf = (driver) => driver.driverProfile?.approvalStatus ?? driver.approvalStatus ?? 'pending'
const vehicleOf = (driver) => driver.driverProfile?.vehicleType ?? driver.vehicleType ?? 'Not set'

export default function DriversPage() {
  const [drivers, setDrivers] = useState(getDrivers)
  const [rides] = useState(getRides)
  const [status, setStatus] = useState('all')
  const [vehicle, setVehicle] = useState('all')
  const [approval, setApproval] = useState('all')
  const [selected, setSelected] = useState(null)
  const pending = drivers.filter((driver) => approvalOf(driver) === 'pending')
  const filtered = useMemo(() => drivers.filter((driver) => {
    const driverStatus = driver.status === 'suspended' ? 'suspended' : 'active'
    return (status === 'all' || status === driverStatus)
      && (vehicle === 'all' || vehicleOf(driver).toLowerCase() === vehicle)
      && (approval === 'all' || approvalOf(driver) === approval)
  }), [drivers, status, vehicle, approval])

  function approve(driver) {
    const allUsers = getUsers().map((user) => user.id === driver.id ? { ...user, status: 'active', driverProfile: { ...user.driverProfile, approvalStatus: 'approved' } } : user)
    if (writeUsers(allUsers)) {
      setDrivers(getDrivers())
      writeAudit('Driver approved', driverName(driver))
    }
  }

  function changeAccountStatus(driver, nextStatus) {
    const allUsers = getUsers().map((user) => user.id === driver.id ? { ...user, status: nextStatus } : user)
    if (writeUsers(allUsers)) {
      setDrivers(getDrivers())
      writeAudit(nextStatus === 'suspended' ? 'Driver suspended' : 'Driver activated', driverName(driver))
    }
  }

  const pendingCards = pending.map((driver) => <article className="admin-zone-row" key={driver.id}><div className="admin-person"><span className="admin-person-avatar">{driverName(driver).slice(0, 1)}</span><span><strong>{driverName(driver)}</strong><small>{driver.email ?? 'No email'} · {vehicleOf(driver)}</small></span></div><div className="admin-row-actions"><button className="admin-button admin-button--primary" type="button" onClick={() => approve(driver)}><FiCheck />Approve</button><button className="admin-icon-button" aria-label={`View ${driverName(driver)}`} type="button" onClick={() => setSelected(driver)}><FiEye /></button></div></article>)

  return <>
    <div className="admin-page-heading"><div><span className="admin-eyebrow">FLEET MANAGEMENT</span><h1>Drivers</h1><p>Review applications and manage driver accounts.</p></div><span className="admin-filter-count">{drivers.length} total</span></div>
    {pending.length > 0 && <section className="admin-panel admin-section"><div className="admin-panel-heading"><div><h2>Pending approvals</h2><p>{pending.length} application{pending.length === 1 ? '' : 's'} awaiting review</p></div><span className="admin-status admin-status--pending">{pending.length} pending</span></div><div className="admin-panel-body admin-zone-grid">{pendingCards}</div></section>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>All drivers</h2><p>Account status, vehicle and trip performance</p></div></div><div className="admin-panel-body"><div className="admin-toolbar"><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select><select aria-label="Filter by vehicle type" value={vehicle} onChange={(event) => setVehicle(event.target.value)}><option value="all">All vehicles</option><option value="mini">Mini</option><option value="sedan">Sedan</option><option value="van">Van</option><option value="tuk">Tuk</option></select><select aria-label="Filter by approval" value={approval} onChange={(event) => setApproval(event.target.value)}><option value="all">All approval states</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><span className="admin-spacer" /><span className="admin-filter-count">{filtered.length} results</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Driver</th><th>Vehicle</th><th>Rating</th><th>Trips</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((driver) => {
      const trips = rides.filter((ride) => ride.driverId === driver.id)
      const completedTrips = trips.filter((ride) => (ride.status ?? ride.state) === 'completed').length
      return <tr key={driver.id}><td><div className="admin-person"><span className="admin-person-avatar">{driverName(driver).slice(0, 1).toUpperCase()}</span><span><strong>{driverName(driver)}</strong><small>{driver.email ?? driver.username}</small></span></div></td><td>{vehicleOf(driver)}</td><td>{driver.driverProfile?.rating ?? driver.rating ?? '—'}</td><td>{completedTrips}</td><td><span className={`admin-status admin-status--${approvalOf(driver) === 'approved' ? driver.status === 'suspended' ? 'suspended' : 'active' : approvalOf(driver)}`}>{approvalOf(driver) === 'approved' ? driver.status === 'suspended' ? 'Suspended' : 'Active' : approvalOf(driver)}</span></td><td><div className="admin-row-actions"><button className="admin-icon-button" aria-label={`View ${driverName(driver)}`} title="View" type="button" onClick={() => setSelected(driver)}><FiEye /></button>{approvalOf(driver) === 'pending' ? <button className="admin-button admin-button--primary" type="button" onClick={() => approve(driver)}><FiCheck />Approve</button> : driver.status === 'suspended' ? <button className="admin-button" type="button" onClick={() => changeAccountStatus(driver, 'active')}><FiPlayCircle />Activate</button> : <button className="admin-button admin-button--danger" type="button" onClick={() => changeAccountStatus(driver, 'suspended')}><FiPauseCircle />Suspend</button>}</div></td></tr>
    })}{!filtered.length && <tr><td className="admin-empty" colSpan="6">No drivers match these filters.</td></tr>}</tbody></table></div></div></section>
    {selected && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="driver-modal-title"><header className="admin-modal-header"><h2 id="driver-modal-title">Driver profile</h2><button className="admin-icon-button" aria-label="Close" type="button" onClick={() => setSelected(null)}><FiX /></button></header><div className="admin-modal-content"><div className="admin-detail-grid">{[['Name', driverName(selected)], ['Email', selected.email], ['Phone', selected.phone], ['Vehicle', vehicleOf(selected)], ['Approval', approvalOf(selected)], ['Status', selected.status ?? 'active'], ['Rating', selected.driverProfile?.rating ?? selected.rating ?? 'Not rated'], ['Completed trips', rides.filter((ride) => ride.driverId === selected.id && (ride.status ?? ride.state) === 'completed').length]].map(([label, value]) => <div className="admin-detail" key={label}><span>{label}</span><strong>{value ?? '—'}</strong></div>)}</div></div></section></div>}
  </>
}