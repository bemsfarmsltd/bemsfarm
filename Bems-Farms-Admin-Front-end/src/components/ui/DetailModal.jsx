import { useEffect } from 'react'

/**
 * DetailModal — generic "view details" popup for dashboard cards/charts.
 * Large by default; pass `size="md"` to shrink for short lists.
 */
export default function DetailModal({ title, subtitle, icon, onClose, children, footer, size = 'xl' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!title) return null

  const maxWidth = size === 'md' ? 620 : size === 'lg' ? 920 : 1240

  return (
    <div
      className="detail-modal-backdrop"
      style={{
        position: 'fixed', inset: 0, zIndex: 1055,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1rem',
      }}
      onClick={onClose}
    >
      <div
        className="detail-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bs-body-bg, #fff)',
          borderRadius: '1rem',
          boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.35), 0 4px 16px rgba(15,23,42,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          className="d-flex align-items-start justify-content-between flex-shrink-0"
          style={{
            padding: '1.35rem 1.75rem',
            borderBottom: '1px solid #EFECE6',
            background: 'linear-gradient(180deg, #FAF8F5 0%, #FFFFFF 100%)',
          }}
        >
          <div className="d-flex align-items-center gap-3">
            {icon && (
              <div
                className="d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44, borderRadius: '0.75rem', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}
              >
                <i className={icon} style={{ fontSize: 20 }} />
              </div>
            )}
            <div>
              <h5 className="fw-bold mb-0 font-display" style={{ fontSize: '1.15rem', letterSpacing: '-0.01em' }}>{title}</h5>
              {subtitle && <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.8rem' }}>{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 34, height: 34, borderRadius: '0.6rem', border: '1px solid #EFECE6', backgroundColor: '#fff', color: '#6b7280', cursor: 'pointer' }}
          >
            <i className="ri-close-line" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="flex-grow-1" style={{ overflowY: 'auto', minHeight: 0 }}>
          {children}
        </div>

        {footer !== undefined ? (
          footer && (
            <div className="flex-shrink-0" style={{ padding: '0.9rem 1.75rem', borderTop: '1px solid #EFECE6', backgroundColor: '#FAF8F5' }}>
              {footer}
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
