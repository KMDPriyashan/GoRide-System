import { Link } from 'react-router-dom'
import { FiInbox } from 'react-icons/fi'

export default function EmptyState({
  icon,
  eyebrow,
  title = 'Nothing here yet',
  message = 'There is no information to show right now.',
  actionLabel,
  to,
  onAction,
  className = '',
}) {
  const ActionIcon = icon ?? FiInbox
  return (
    <section className={`ui-empty-state${className ? ` ${className}` : ''}`}>
      <span className="ui-empty-state-icon"><ActionIcon aria-hidden="true" /></span>
      {eyebrow && <span className="ui-empty-state-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && to && <Link className="ui-empty-state-action" to={to}>{actionLabel}</Link>}
      {actionLabel && !to && onAction && <button className="ui-empty-state-action" type="button" onClick={onAction}>{actionLabel}</button>}
    </section>
  )
}