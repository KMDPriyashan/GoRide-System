import { getItem, setItem } from '../../shared/utils/storage.js'

export const money = (amount = 0) => `LKR ${Number(amount || 0).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`
export const rideState = (ride) => ride?.status ?? ride?.state ?? 'requested'
export const getUsers = () => {
  const users = getItem('gr_users', [])
  return Array.isArray(users) ? users : []
}
export const getRides = () => {
  const rides = getItem('gr_rides', [])
  return Array.isArray(rides) ? rides : []
}
export const getDrivers = () => getUsers().filter((user) => user.userType === 'driver')
export const getRiders = () => getUsers().filter((user) => user.userType === 'rider')
export const driverName = (driver) => driver?.fullName ?? driver?.username ?? 'Unassigned'
export const riderName = (ride, riders = getRiders()) => {
  const rider = riders.find((item) => item.id === ride?.riderId)
  return rider?.fullName ?? ride?.riderName ?? 'Guest rider'
}
export const driverForRide = (ride, drivers = getDrivers()) => drivers.find((driver) => driver.id === ride?.driverId)
export const rideFare = (ride) => Number(ride?.finalFare ?? ride?.estimatedFare ?? ride?.fare ?? 0)
export const dateLabel = (value) => value ? new Date(value).toLocaleString() : '—'

export function writeUsers(users) {
  return setItem('gr_users', users)
}

export function writeRides(rides) {
  return setItem('gr_rides', rides)
}

export function writeAudit(action, details) {
  const entries = getItem('gr_admin_audit_logs', [])
  const logs = Array.isArray(entries) ? entries : []
  const admin = getItem('gr_current_user', null)
  setItem('gr_admin_audit_logs', [{
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    admin: admin?.fullName ?? admin?.username ?? 'Operations admin',
    action,
    details,
  }, ...logs])
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return
  const columns = Object.keys(rows[0])
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [columns.map(quote).join(','), ...rows.map((row) => columns.map((key) => quote(row[key])).join(','))].join('\r\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export const localDayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`