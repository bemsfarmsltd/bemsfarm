/**
 * PageHeader — Bems Farms Brand Page Title Bar
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <div className="d-flex align-items-center gap-3">
        <h5 className="mb-0 fw-bold font-display text-dark" style={{ letterSpacing: '-0.02em', fontSize: '1.2rem' }}>{title}</h5>
        {subtitle && (
          <span className="badge fw-medium" style={{ backgroundColor: '#FAF8F5', color: '#64748B', border: '1px solid #E2DDD5', fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}>
            {subtitle}
          </span>
        )}
      </div>
      {actions && <div className="d-flex align-items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
