import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FiArrowDownLeft, FiArrowUpRight, FiCalendar } from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext.jsx'
import { calculateDriverEarnings } from '../../../core/algorithms/fareCalculator.js'
import { getItem } from '../../../shared/utils/storage.js'
import { formatCurrency, formatDateTime } from '../../../shared/utils/formatters.js'

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]
const DRIVER_DEMO_ID = 'driver-demo'

function getCompletedRides(driverId) {
  const rides = getItem('gr_rides', [])
  return (Array.isArray(rides) ? rides : []).filter((ride) => {
    return ride.driverId === driverId && (ride.status ?? ride.state) === 'completed'
  })
}

function getDriverAmount(ride) {
  return ride.driverEarnings ?? calculateDriverEarnings(ride.finalFare ?? ride.estimatedFare ?? 0)
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dateIsInPeriod(dateValue, period, now = new Date()) {
  const date = new Date(dateValue)
  if (!Number.isFinite(date.getTime())) return false
  if (period === 'today') return localDateKey(date) === localDateKey(now)
  if (period === 'month') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }

  const startOfWeek = new Date(now)
  const daysSinceMonday = (startOfWeek.getDay() + 6) % 7
  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday)
  startOfWeek.setHours(0, 0, 0, 0)
  return date >= startOfWeek && date <= now
}

function createChartData(rides) {
  const today = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const dateKey = localDateKey(date)
    const earnings = rides
      .filter((ride) => localDateKey(new Date(ride.completedAt ?? ride.updatedAt)) === dateKey)
      .reduce((sum, ride) => sum + getDriverAmount(ride), 0)

    return {
      day: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date),
      date: dateKey,
      earnings: Math.round(earnings),
    }
  })
}

function EarningsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="earnings-tooltip">
      <span>{label}</span>
      <strong>{formatCurrency(payload[0].value)}</strong>
    </div>
  )
}

export default function DriverEarningsPage() {
  const { user } = useAuth()
  const driverId = user?.id ?? DRIVER_DEMO_ID
  const [period, setPeriod] = useState('today')
  const rides = useMemo(() => getCompletedRides(driverId), [driverId])
  const periodRides = rides.filter((ride) => dateIsInPeriod(ride.completedAt ?? ride.updatedAt, period))
  const periodEarnings = periodRides.reduce((sum, ride) => sum + getDriverAmount(ride), 0)
  const chartData = createChartData(rides)

  return (
    <main className="driver-content-page earnings-page">
      <header className="driver-page-heading">
        <div><span className="eyebrow">YOUR PAYOUTS</span><h1>Earnings</h1></div>
        <span className="earnings-calendar-icon"><FiCalendar /></span>
      </header>

      <section className="earnings-overview">
        <div className="earnings-period-row">
          <span className="eyebrow">NET EARNINGS</span>
          <div className="driver-period-tabs" role="tablist" aria-label="Earnings period">
            {PERIODS.map(({ id, label }) => (
              <button
                type="button"
                key={id}
                role="tab"
                aria-selected={period === id}
                className={period === id ? 'is-active' : ''}
                onClick={() => setPeriod(id)}
              >{label}</button>
            ))}
          </div>
        </div>
        <strong className="earnings-total">{formatCurrency(periodEarnings)}</strong>
        <span className="earnings-period-caption">{periodRides.length} completed {periodRides.length === 1 ? 'trip' : 'trips'} · LKR</span>
        <div className="earnings-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 14, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e8eeea" strokeDasharray="4 5" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#79857d', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#79857d', fontSize: 9 }} tickFormatter={(value) => value === 0 ? '0' : `${Math.round(value / 1000)}k`} />
              <Tooltip content={<EarningsTooltip />} />
              <Line type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="earnings-payout-row">
        <div><span className="eyebrow">AVAILABLE BALANCE</span><strong>{formatCurrency(periodEarnings)}</strong></div>
        <button type="button" onClick={() => toast.success('Withdrawal request received.')}><FiArrowDownLeft /> Withdraw</button>
      </section>

      <section className="driver-trip-history">
        <header><div><span className="eyebrow">COMPLETED WORK</span><h2>Trip history</h2></div><span>{rides.length} trips</span></header>
        {rides.length === 0 ? (
          <div className="driver-empty-history">Complete your first trip to see it here.</div>
        ) : (
          [...rides].reverse().map((ride) => (
            <article className="driver-earnings-trip" key={ride.id}>
              <span className="driver-earnings-trip-icon"><FiArrowUpRight /></span>
              <div><strong>{ride.pickup?.name ?? 'Pickup'} <FiArrowUpRight /> {ride.dropoff?.name ?? 'Drop-off'}</strong><small>{formatDateTime(ride.completedAt ?? ride.updatedAt)} · {ride.rideNumber}</small></div>
              <strong>{formatCurrency(getDriverAmount(ride))}</strong>
            </article>
          ))
        )}
      </section>
    </main>
  )
}