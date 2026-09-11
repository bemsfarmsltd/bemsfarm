/**
 * PageHeader — Bems Farms Brand Page Title Bar
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
      <div>
        <h4 className="mb-0 fw-black font-display text-dark" style={{ letterSpacing: '-0.02em' }}>{title}</h4>
        {subtitle && <p className="text-muted fw-medium mb-0 mt-1" style={{ fontSize: '0.84rem' }}>{subtitle}</p>}
      </div>
      {actions && <div className="d-flex align-items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
