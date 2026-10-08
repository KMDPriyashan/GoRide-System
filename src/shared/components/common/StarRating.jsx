import { useId } from 'react'
import { FiStar } from 'react-icons/fi'

export default function StarRating({ value = 0, max = 5, onChange, readOnly = !onChange, label = 'Rating', className = '' }) {
  const id = useId()
  const safeMax = Math.max(1, Math.min(10, Math.floor(Number(max) || 5)))
  const rating = Math.max(0, Math.min(safeMax, Number(value) || 0))
  return (
    <span className={`ui-star-rating${readOnly ? ' is-read-only' : ''}${className ? ` ${className}` : ''}`} role={readOnly ? 'img' : 'group'} aria-label={`${label}: ${rating} out of ${safeMax}`}>
      {Array.from({ length: safeMax }, (_, index) => {
        const starValue = index + 1
        const filled = starValue <= rating
        return readOnly ? (
          <FiStar className={filled ? 'is-filled' : ''} key={`${id}-${starValue}`} aria-hidden="true" />
        ) : (
          <button type="button" key={`${id}-${starValue}`} aria-label={`${starValue} star${starValue === 1 ? '' : 's'}`} aria-pressed={rating === starValue} onClick={() => onChange(starValue)}>
            <FiStar className={filled ? 'is-filled' : ''} aria-hidden="true" />
          </button>
        )
      })}
    </span>
  )
}