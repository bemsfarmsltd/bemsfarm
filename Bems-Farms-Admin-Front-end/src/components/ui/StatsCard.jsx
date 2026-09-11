/**
 * StatsCard — GotPOS Bootstrap card widget
 */
const BG_MAP = {
  green:  'bg-success-subtle text-success',
  blue:   'bg-primary-subtle text-primary',
  amber:  'bg-warning-subtle text-warning',
  red:    'bg-danger-subtle text-danger',
  purple: 'bg-info-subtle text-info',
  teal:   'bg-info-subtle text-info',
  slate:  'bg-secondary-subtle text-secondary',
}

export default function StatsCard({ title, value, sub, icon: Icon, riIcon, color = 'green', trend }) {
  const cls = BG_MAP[color] ?? BG_MAP.green

  return (
    <div className="card mb-0">
      <div className="card-body">
        <div className="d-flex align-items-start justify-content-between">
          <div>
            <p className="text-muted fs-sm text-uppercase fw-medium mb-1">{title}</p>
            <h4 className="fw-bold mb-1">{value}</h4>
            {sub && <p className="text-muted fs-xs mb-0">{sub}</p>}
            {trend !== undefined && (
              <p className={`fs-xs mb-0 fw-medium ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
              </p>
            )}
          </div>
          <div className={`avatar size-10 rounded d-flex align-items-center justify-content-center ${cls}`}>
            {riIcon
              ? <i className={`${riIcon} fs-4`}></i>
              : Icon ? <Icon size={20} /> : null
            }
          </div>
        </div>
      </div>
    </div>
  )
}
