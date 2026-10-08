const TONE_CLASSES = new Set(['neutral', 'yellow', 'blue', 'purple', 'green', 'slate', 'red', 'success', 'warning', 'info'])

export default function Badge({ children, tone = 'neutral', className = '', dot = false }) {
  const safeTone = TONE_CLASSES.has(tone) ? tone : 'neutral'
  return (
    <span className={`ui-badge ui-badge--${safeTone}${dot ? ' ui-badge--dot' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}