import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'medium',
  closeLabel = 'Close dialog',
}) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="ui-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section
        className={`ui-modal ui-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={title ? undefined : 'Dialog'}
        tabIndex={-1}
        ref={panelRef}
      >
        {(title || onClose) && (
          <header className="ui-modal-header">
            <div>{title && <h2 id={titleId}>{title}</h2>}{description && <p id={descriptionId}>{description}</p>}</div>
            {onClose && <button className="ui-modal-close" type="button" aria-label={closeLabel} onClick={onClose}><FiX /></button>}
          </header>
        )}
        <div className="ui-modal-content">{children}</div>
        {footer && <footer className="ui-modal-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}