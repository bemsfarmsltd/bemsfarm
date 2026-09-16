import { useEffect } from 'react'

/**
 * Resolves theme colors and styles dynamically from the modal's icon or title.
 */
function resolveModalTheme(icon = '', title = '') {
  const combined = `${icon} ${title}`.toLowerCase()

  if (combined.includes('money') || combined.includes('dollar') || combined.includes('revenue') || combined.includes('naira') || combined.includes('paid') || combined.includes('profit')) {
    return {
      badgeBg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
      badgeText: '#065F46',
      badgeBorder: '#A7F3D0',
      badgeShadow: '0 4px 14px rgba(16, 185, 129, 0.22)',
      accentColor: '#10B981',
      headerBg: 'linear-gradient(180deg, #F6FBF8 0%, #FFFFFF 100%)',
    }
  }

  if (combined.includes('cart') || combined.includes('order') || combined.includes('time') || combined.includes('pending') || combined.includes('clock') || combined.includes('amber')) {
    return {
      badgeBg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
      badgeText: '#92400E',
      badgeBorder: '#FDE68A',
      badgeShadow: '0 4px 14px rgba(245, 158, 11, 0.22)',
      accentColor: '#F59E0B',
      headerBg: 'linear-gradient(180deg, #FDFBF7 0%, #FFFFFF 100%)',
    }
  }

  if (combined.includes('bike') || combined.includes('truck') || combined.includes('deliver') || combined.includes('driver') || combined.includes('zone') || combined.includes('logistics')) {
    return {
      badgeBg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
      badgeText: '#075985',
      badgeBorder: '#BAE6FD',
      badgeShadow: '0 4px 14px rgba(14, 165, 233, 0.22)',
      accentColor: '#0EA5E9',
      headerBg: 'linear-gradient(180deg, #F6FAFD 0%, #FFFFFF 100%)',
    }
  }

  if (combined.includes('user') || combined.includes('team') || combined.includes('group') || combined.includes('customer') || combined.includes('staff')) {
    return {
      badgeBg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
      badgeText: '#3730A3',
      badgeBorder: '#C7D2FE',
      badgeShadow: '0 4px 14px rgba(99, 102, 241, 0.22)',
      accentColor: '#6366F1',
      headerBg: 'linear-gradient(180deg, #F7F8FE 0%, #FFFFFF 100%)',
    }
  }

  if (combined.includes('robot') || combined.includes('ai') || combined.includes('brain') || combined.includes('magic') || combined.includes('spark')) {
    return {
      badgeBg: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
      badgeText: '#6B21A8',
      badgeBorder: '#E9D5FF',
      badgeShadow: '0 4px 14px rgba(168, 85, 247, 0.22)',
      accentColor: '#A855F7',
      headerBg: 'linear-gradient(180deg, #FAF7FD 0%, #FFFFFF 100%)',
    }
  }

  if (combined.includes('alert') || combined.includes('stock') || combined.includes('danger') || combined.includes('refund') || combined.includes('return') || combined.includes('expir')) {
    return {
      badgeBg: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
      badgeText: '#9F1239',
      badgeBorder: '#FECDD3',
      badgeShadow: '0 4px 14px rgba(244, 63, 94, 0.22)',
      accentColor: '#F43F5E',
      headerBg: 'linear-gradient(180deg, #FDF7F8 0%, #FFFFFF 100%)',
    }
  }

  // Default Luxury Executive Brand Theme
  return {
    badgeBg: 'linear-gradient(135deg, #EAF5EF 0%, #D1FAE5 100%)',
    badgeText: '#143C2D',
    badgeBorder: '#A7F3D0',
    badgeShadow: '0 4px 14px rgba(20, 60, 45, 0.18)',
    accentColor: '#143C2D',
    headerBg: 'linear-gradient(180deg, #FAF8F5 0%, #FFFFFF 100%)',
  }
}

/**
 * DetailModal — Premium, high-polish drill-down modal for dashboard analytics & tables.
 */
export default function DetailModal({
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  size = 'xl',
  countBadge = null,
}) {
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

  const maxWidth =
    size === 'sm' ? 520 :
    size === 'md' ? 700 :
    size === 'lg' ? 960 :
    size === '2xl' ? 1400 : 1220

  const theme = resolveModalTheme(icon, title)

  return (
    <div
      className="detail-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1055,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1rem',
        animation: 'detailModalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={onClose}
    >
      <div
        className="detail-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: '1.25rem',
          border: '1px solid rgba(226, 232, 240, 0.85)',
          boxShadow: '0 25px 65px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
          animation: 'detailModalPop 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Top Header */}
        <div
          className="d-flex align-items-center justify-content-between flex-shrink-0"
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid #EFECE6',
            background: theme.headerBg,
          }}
        >
          <div className="d-flex align-items-center gap-3 min-w-0">
            {icon && (
              <div
                className="d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '0.85rem',
                  background: theme.badgeBg,
                  color: theme.badgeText,
                  border: `1px solid ${theme.badgeBorder}`,
                  boxShadow: theme.badgeShadow,
                }}
              >
                <i className={icon} style={{ fontSize: 22 }} />
              </div>
            )}
            <div className="min-w-0">
              <div className="d-flex align-items-center gap-2.5 flex-wrap">
                <h4
                  className="fw-bold mb-0 font-display text-truncate"
                  style={{
                    fontSize: '1.2rem',
                    letterSpacing: '-0.02em',
                    color: '#0F172A',
                  }}
                >
                  {title}
                </h4>
                {countBadge !== null && (
                  <span
                    className="badge rounded-pill"
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.06)',
                      color: '#475569',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.6rem',
                    }}
                  >
                    {countBadge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p
                  className="text-muted mb-0 mt-0.5 text-truncate"
                  style={{ fontSize: '0.82rem', lineHeight: 1.35 }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="d-flex align-items-center justify-content-center flex-shrink-0 ms-3"
            style={{
              width: 36,
              height: 36,
              borderRadius: '0.7rem',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9'
              e.currentTarget.style.color = '#0F172A'
              e.currentTarget.style.transform = 'scale(1.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF'
              e.currentTarget.style.color = '#64748B'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <i className="ri-close-line" style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div
          className="flex-grow-1 custom-detail-modal-body"
          style={{
            overflowY: 'auto',
            minHeight: 0,
            backgroundColor: '#FFFFFF',
          }}
        >
          {children}
        </div>

        {/* Modal Bottom Footer */}
        {footer !== undefined ? (
          footer && (
            <div
              className="flex-shrink-0 d-flex align-items-center justify-content-between"
              style={{
                padding: '0.85rem 1.75rem',
                borderTop: '1px solid #EFECE6',
                backgroundColor: '#FAF8F5',
              }}
            >
              <div className="flex-grow-1">{footer}</div>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-sm btn-outline-secondary fw-semibold px-3 py-1.5 ms-3"
                style={{
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  borderColor: '#CBD5E1',
                  color: '#475569',
                }}
              >
                Close
              </button>
            </div>
          )
        ) : (
          <div
            className="flex-shrink-0 d-flex align-items-center justify-content-end"
            style={{
              padding: '0.75rem 1.75rem',
              borderTop: '1px solid #EFECE6',
              backgroundColor: '#FAF8F5',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-outline-secondary fw-semibold px-3 py-1.5"
              style={{
                borderRadius: '0.5rem',
                fontSize: '0.8rem',
                borderColor: '#CBD5E1',
                color: '#475569',
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes detailModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes detailModalPop {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .custom-detail-modal-body::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-detail-modal-body::-webkit-scrollbar-track {
          background: #FAF8F5;
        }
        .custom-detail-modal-body::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 9999px;
        }
        .custom-detail-modal-body::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>
    </div>
  )
}
