import Badge from './Badge.jsx'

const STATUS_TONES = {
  requested: 'yellow',
  accepted: 'blue',
  arrived: 'purple',
  started: 'green',
  completed: 'slate',
  cancelled: 'red',
}

export default function RideStatusBadge({ status, className = '' }) {
  const normalized = String(status ?? 'requested').toLowerCase()
  return <Badge tone={STATUS_TONES[normalized] ?? 'neutral'} dot className={className}>{normalized}</Badge>
}