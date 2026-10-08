export default function Skeleton({ variant = 'line', count = 1, className = '', label = 'Loading content' }) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 1))
  return (
    <div className={`ui-skeleton-group${className ? ` ${className}` : ''}`} role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: safeCount }, (_, index) => (
        <span className={`ui-skeleton ui-skeleton--${variant}`} key={index} aria-hidden="true" />
      ))}
    </div>
  )
}