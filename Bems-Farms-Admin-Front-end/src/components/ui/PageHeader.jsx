/**
 * PageHeader — GotPOS Bootstrap page title bar
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
      <div>
        <h5 className="mb-0 fw-semibold">{title}</h5>
        {subtitle && <p className="text-muted fs-sm mb-0 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="d-flex align-items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
