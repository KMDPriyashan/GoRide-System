import { FiLoader } from 'react-icons/fi'

export default function Loader({ label = 'Loading', size = 'medium', className = '' }) {
  return (
    <span className={`ui-loader ui-loader--${size}${className ? ` ${className}` : ''}`} role="status" aria-label={label}>
      <FiLoader aria-hidden="true" />
      <span className="ui-loader-label">{label}</span>
    </span>
  )
}