import { useMemo, useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import { getItem } from '../../../shared/utils/storage.js'
import { dateLabel, downloadCsv } from '../adminUtils.js'

export default function AuditLogsPage() {
  const [action, setAction] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const logs = getItem('gr_admin_audit_logs', [])
  const entries = Array.isArray(logs) ? logs : []
  const actions = [...new Set(entries.map((entry) => entry.action).filter(Boolean))]
  const filtered = useMemo(() => entries.filter((entry) => {
    const date = new Date(entry.timestamp)
    return (action === 'all' || entry.action === action)
      && (!from || date >= new Date(`${from}T00:00:00`))
      && (!to || date < new Date(`${to}T23:59:59`))
  }), [entries.length, action, from, to])

  return <>
    <div className="admin-page-heading"><div><span className="admin-eyebrow">ACCOUNTABILITY</span><h1>Audit logs</h1><p>Review administrative changes across the workspace.</p></div><button className="admin-button" type="button" disabled={!filtered.length} onClick={() => downloadCsv('goride-audit-logs.csv', filtered.map(({ timestamp, admin, action: logAction, details }) => ({ timestamp, admin, action: logAction, details })))}><FiDownload />Export CSV</button></div>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Activity history</h2><p>Showing {filtered.length} of {entries.length} records</p></div></div><div className="admin-panel-body"><div className="admin-toolbar"><select aria-label="Filter by action type" value={action} onChange={(event) => setAction(event.target.value)}><option value="all">All action types</option>{actions.map((item) => <option key={item} value={item}>{item}</option>)}</select><input type="date" aria-label="From date" value={from} onChange={(event) => setFrom(event.target.value)} /><input type="date" aria-label="To date" value={to} onChange={(event) => setTo(event.target.value)} /></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Timestamp</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead><tbody>{filtered.map((entry) => <tr key={entry.id ?? `${entry.timestamp}-${entry.action}`}><td>{dateLabel(entry.timestamp)}</td><td>{entry.admin ?? 'Operations admin'}</td><td><span className="admin-status admin-status--accepted">{entry.action}</span></td><td>{entry.details ?? '—'}</td></tr>)}{!filtered.length && <tr><td className="admin-empty" colSpan="4">No audit records match these filters.</td></tr>}</tbody></table></div></div></section>
  </>
}