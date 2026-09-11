/**
 * StatsCard — Luxury Executive Stat Widget
 */
const TINT_MAP = {
  green:  { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  blue:   { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  amber:  { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  red:    { bg: '#ffe4e6', text: '#be123c', border: '#fecdd3' },
  purple: { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
  teal:   { bg: '#ccfbf1', text: '#0f766e', border: '#99f6e4' },
  slate:  { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
}

export default function StatsCard({ title, value, sub, icon: Icon, riIcon, color = 'green', trend }) {
  const tint = TINT_MAP[color] ?? TINT_MAP.green

  return (
    <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6', boxShadow: '0 2px 12px -2px rgba(20, 60, 45, 0.04)' }}>
      <div className="card-body p-3">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div className="flex-grow-1 overflow-hidden">
            <p className="text-muted text-uppercase fw-bold mb-1 text-truncate" style={{ fontSize: '0.625rem', letterSpacing: '0.05em' }}>{title}</p>
            <h4 className="fw-black mb-0.5 font-display text-dark text-truncate" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem' }}>{value}</h4>
            {sub && <p className="text-muted fw-medium mb-1 text-truncate" style={{ fontSize: '0.72rem' }}>{sub}</p>}
            {trend !== undefined && (
              <div className="d-inline-flex align-items-center gap-1">
                <span className="badge" style={{
                  backgroundColor: trend >= 0 ? '#dcfce7' : '#ffe4e6',
                  color: trend >= 0 ? '#15803d' : '#be123c',
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.45rem'
                }}>
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
                </span>
              </div>
            )}
          </div>
          <div
            className="d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              borderRadius: '0.625rem',
              backgroundColor: tint.bg,
              color: tint.text,
              border: `1px solid ${tint.border}`
            }}
          >
            {riIcon
              ? <i className={`${riIcon} fs-5`}></i>
              : Icon ? <Icon size={16} /> : null
            }
          </div>
        </div>
      </div>
    </div>
  )
}
