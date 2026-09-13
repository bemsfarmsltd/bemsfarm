import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function PremiumModal({
  open,
  onClose,
  title,
  description,
  icon = 'ri-sparkling-2-line',
  tone = 'brand',
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    previousFocus.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = window.setTimeout(() => {
      const focusable = dialogRef.current?.querySelector(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus()
    }, 0)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const items = [...dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="premium-modal-layer" role="presentation" onMouseDown={(event) => {
      if (closeOnBackdrop && event.target === event.currentTarget) onClose?.()
    }}>
      <section
        ref={dialogRef}
        className={`premium-modal premium-modal--${size} premium-modal--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="premium-modal__header">
          <span className="premium-modal__icon" aria-hidden="true"><i className={icon} /></span>
          <div className="premium-modal__heading">
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button type="button" className="premium-modal__close" onClick={onClose} aria-label={`Close ${title}`}>
            <i className="ri-close-line" aria-hidden="true" />
          </button>
        </header>
        <div className="premium-modal__body">{children}</div>
        {footer && <footer className="premium-modal__footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}
