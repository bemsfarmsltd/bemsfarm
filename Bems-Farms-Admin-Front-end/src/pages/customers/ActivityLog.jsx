import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const TYPE_CFG = {
  login:                 { label: 'Signed In',       icon: 'ri-login-circle-line',    color: '#2563eb', bg: '#eff6ff' },
  registered:            { label: 'Account Created', icon: 'ri-user-add-line',        color: '#16a34a', bg: '#f0fdf4' },
  email_verified_login:  { label: 'Email Verified',  icon: 'ri-mail-check-line',      color: '#0891b2', bg: '#ecfeff' },
  order_created:         { label: 'Placed an Order', icon: 'ri-shopping-bag-3-line',  color: '#d97706', bg: '#fffbeb' },
  product_viewed:        { label: 'Viewed a Product',icon: 'ri-eye-line',             color: '#7c3aed', bg: '#f5f3ff' },
  onboarding_completed:  { label: 'Completed Setup', icon: 'ri-checkbox-circle-line', color: '#0ab39c', bg: '#f0fdfa' },
  profile_updated:       { label: 'Updated Profile', icon: 'ri-edit-2-line',          color: '#64748b', bg: '#f8fafc' },
}
const DEFAULT_CFG = { label: 'Customer Activity', icon: 'ri-pulse-line', color: '#64748b', bg: '#f8fafc' }

const ini = (name) => (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const AVATAR_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ec4899', '#f97316']

function fmtWhen(d) {
  const date = new Date(d)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ActivityLog() {
  const [rows, setRows] = useState([])
  const [typeCounts, setTypeCounts] = useState({})
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/customers/site-activity', { params: { search: search || undefined, type: type || undefined, limit: 100 } })
      setRows(res.data.activity || [])
      setTypeCounts(res.data.type_counts || {})
      setError('')
    } catch {
      setError('Customer activity could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [search, type])

  useEffect(() => {
    const t = setTimeout(fetchActivity, 250)
    return () => clearTimeout(t)
  }, [fetchActivity])

  const totalCount = useMemo(() => Object.values(typeCounts).reduce((a, b) => a + b, 0), [typeCounts])

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Customer Activity</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/customers">Customers</Link></li>
            <li className="breadcrumb-item active">Activity</li>
          </ul>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-3">
          <p className="text-muted fs-13 mb-3">
            Recent customer sign-ins, orders, and product interest. Staff and system events belong in{' '}
            <Link to="/god-eye">System Audit</Link>.
          </p>

          <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
            <div className="search-box" style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  placeholder="Search customer name, email or order..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 14 }}></i>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-1">
              <button
                type="button"
                className={`btn btn-sm ${!type ? 'btn-dark text-white' : 'btn-light text-dark'}`}
                onClick={() => setType('')}
              >
                All <span className="badge bg-light text-dark border ms-1">{totalCount}</span>
              </button>
              {Object.entries(TYPE_CFG).map(([key, cfg]) => (
                typeCounts[key] > 0 && (
                  <button
                    key={key}
                    type="button"
                    className={`btn btn-sm d-flex align-items-center gap-1 ${type === key ? 'btn-dark text-white' : 'btn-light text-dark'}`}
                    onClick={() => setType(type === key ? '' : key)}
                  >
                    <i className={cfg.icon}></i> {cfg.label}
                    <span className="badge bg-light text-dark border ms-1">{typeCounts[key]}</span>
                  </button>
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {error && (
            <div className="alert alert-danger m-3 mb-0" role="alert">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
              <span className="text-muted">Loading activity...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ri-pulse-line fs-32 text-secondary mb-2 d-block"></i>
              No recorded customer activity.
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {rows.map((a) => {
                const cfg = TYPE_CFG[a.type] || DEFAULT_CFG
                const name = a.user_name || 'Customer'
                const avatarColor = AVATAR_COLORS[(a.user_id || 0) % AVATAR_COLORS.length]
                return (
                  <div key={a.id} className="list-group-item d-flex align-items-center gap-3 py-3 px-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                      style={{ width: 38, height: 38, background: avatarColor, fontSize: 13 }}
                    >
                      {ini(name)}
                    </div>

                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {a.user_id ? (
                          <Link to={`/customers/${a.user_id}`} className="fw-semibold text-dark text-decoration-none">
                            {name}
                          </Link>
                        ) : (
                          <span className="fw-semibold text-dark">{name}</span>
                        )}
                        {a.user_email && <span className="text-muted fs-13">{a.user_email}</span>}
                      </div>
                      <div className="d-flex align-items-center gap-1 mt-1">
                        <span className="badge d-flex align-items-center gap-1" style={{ background: cfg.bg, color: cfg.color, fontSize: 11 }}>
                          <i className={cfg.icon}></i> {cfg.label}
                        </span>
                        {a.type === 'order_created' && a.entity_id && (
                          <Link to={`/orders/${a.entity_id}`} className="fs-13 text-muted text-decoration-none">
                            Order #{a.entity_id}
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="text-muted fs-13 text-end flex-shrink-0" title={new Date(a.created_at).toLocaleString()}>
                      {fmtWhen(a.created_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
