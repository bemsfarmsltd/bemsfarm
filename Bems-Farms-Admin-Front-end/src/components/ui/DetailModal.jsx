import { useEffect } from 'react'

/**
 * DetailModal — generic "view details" popup for dashboard cards/charts.
 * Controlled: pass `open` (or just conditionally render) and `onClose`.
 */
export default function DetailModal({ title, subtitle, icon, onClose, children, size = 'lg' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!title) return null

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }}
      tabIndex="-1"
      onClick={onClose}
    >
      <div
        className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size === 'xl' ? 'modal-xl' : size === 'md' ? '' : 'modal-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.9rem', overflow: 'hidden' }}>
          <div className="modal-header">
            <div>
              <h5 className="modal-title fw-bold d-flex align-items-center gap-2 mb-0">
                {icon && <i className={icon} />}
                {title}
              </h5>
              {subtitle && <p className="text-muted fs-xs mb-0 mt-1">{subtitle}</p>}
            </div>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body p-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
