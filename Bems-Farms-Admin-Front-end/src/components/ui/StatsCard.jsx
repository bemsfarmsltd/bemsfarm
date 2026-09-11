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
    <div className="card mb-0 h-100" style={{ borderRadius: '1rem', border: '1px solid #EFECE6', boxShadow: '0 4px 20px -2px rgba(20, 60, 45, 0.04)' }}>
      <div className="card-body p-4">
        <div className="d-flex align-items-start justify-content-between">
          <div className="flex-grow-1">
            <p className="text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '0.6875rem', letterSpacing: '0.06em' }}>{title}</p>
            <h3 className="fw-black mb-1 font-display text-dark" style={{ letterSpacing: '-0.02em', fontSize: '1.65rem' }}>{value}</h3>
            {sub && <p className="text-muted fw-medium mb-1" style={{ fontSize: '0.78rem' }}>{sub}</p>}
            {trend !== undefined && (
              <div className="d-inline-flex align-items-center gap-1 mt-1">
                <span className="badge" style={{
                  backgroundColor: trend >= 0 ? '#dcfce7' : '#ffe4e6',
                  color: trend >= 0 ? '#15803d' : '#be123c',
                  fontSize: '0.6875rem',
                  fontWeight: 800
                }}>
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
                </span>
              </div>
            )}
          </div>
          <div
            className="d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: 44,
              height: 44,
              borderRadius: '0.875rem',
              backgroundColor: tint.bg,
              color: tint.text,
              border: `1px solid ${tint.border}`
            }}
          >
            {riIcon
              ? <i className={`${riIcon} fs-4`}></i>
              : Icon ? <Icon size={22} /> : null
            }
          </div>
        </div>
      </div>
    </div>
  )
}
