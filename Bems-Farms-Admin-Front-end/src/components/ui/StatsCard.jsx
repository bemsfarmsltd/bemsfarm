/**
 * StatsCard — Modern Executive Valuation KPI Card
 */
const TINT_MAP = {
  green:   { bg: '#ECFDF5', text: '#059669', glow: 'bg-card-glow-green',  valColor: 'text-dark' },
  emerald: { bg: '#ECFDF5', text: '#059669', glow: 'bg-card-glow-green',  valColor: 'text-emerald' },
  blue:    { bg: '#EFF6FF', text: '#2563EB', glow: 'bg-card-glow-blue',   valColor: 'text-dark' },
  cyan:    { bg: '#F0F9FF', text: '#0284C7', glow: 'bg-card-glow-cyan',   valColor: 'text-dark' },
  amber:   { bg: '#FEF3C7', text: '#D97706', glow: 'bg-card-glow-amber',  valColor: 'text-amber' },
  yellow:  { bg: '#FEF3C7', text: '#D97706', glow: 'bg-card-glow-amber',  valColor: 'text-dark' },
  red:     { bg: '#FFF1F2', text: '#E11D48', glow: 'bg-card-glow-red',    valColor: 'text-danger' },
  rose:    { bg: '#FFF1F2', text: '#E11D48', glow: 'bg-card-glow-rose',   valColor: 'text-danger' },
  purple:  { bg: '#FAF5FF', text: '#7C3AED', glow: 'bg-card-glow-purple', valColor: 'text-dark' },
  indigo:  { bg: '#EEF2FF', text: '#4F46E5', glow: 'bg-card-glow-indigo', valColor: 'text-dark' },
  teal:    { bg: '#F0FDFA', text: '#0D9488', glow: 'bg-card-glow-teal',   valColor: 'text-dark' },
  slate:   { bg: '#F8FAFC', text: '#475569', glow: 'bg-card-glow-slate',  valColor: 'text-dark' },
}

export default function StatsCard({
  title,
  value,
  sub,
  subLeft,
  subRight,
  icon: Icon,
  riIcon,
  color = 'green',
  trend,
  badge,
  onClick
}) {
  const cfg = TINT_MAP[color] ?? TINT_MAP.green
  const clickable = typeof onClick === 'function'

  // Decide bottom sub label and value
  const displaySubLeft = subLeft || sub || ''
  const hasSub = Boolean(displaySubLeft || subRight || trend !== undefined || badge)

  return (
    <div
      className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${cfg.glow}${clickable ? ' cursor-pointer' : ''}`}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e) } } : undefined}
    >
      <div className="card-body p-3.5">
        {/* Top Title & Icon Pill */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2" title={title}>
            {title}
          </span>
          <span className="kpi-icon-pill" style={{ background: cfg.bg, color: cfg.text }}>
            {riIcon ? (
              <i className={`${riIcon} fs-18`}></i>
            ) : Icon ? (
              <Icon size={18} />
            ) : null}
          </span>
        </div>

        {/* Big Bold Display Metric */}
        <div className={`fs-24 fw-bolder mb-1 font-display text-truncate ${cfg.valColor}`} title={String(value)}>
          {value}
        </div>

        {/* Bottom Sub-row with Divider */}
        {hasSub && (
          <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
            <span className="text-truncate me-2" style={{ maxWidth: '65%' }}>{displaySubLeft}</span>
            {subRight ? (
              <strong className="text-dark font-monospace flex-shrink-0">{subRight}</strong>
            ) : badge ? (
              <span className="badge bg-light text-dark border font-monospace text-xs px-2 flex-shrink-0">
                {badge}
              </span>
            ) : trend !== undefined ? (
              <span
                className="badge font-monospace text-xs px-2 flex-shrink-0"
                style={{
                  backgroundColor: trend >= 0 ? '#DCFCE7' : '#FFE4E6',
                  color: trend >= 0 ? '#15803D' : '#BE123C',
                }}
              >
                {trend >= 0 ? '↑ +' : '↓ '}{Math.abs(trend)}%
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

