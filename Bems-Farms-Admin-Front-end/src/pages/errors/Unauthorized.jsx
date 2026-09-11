import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META } from '../../lib/roles'

export default function Unauthorized() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const meta = user ? ROLE_META[user.role] : null

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ background: '#f8fafc' }}>
      <div className="text-center" style={{ maxWidth: 480 }}>
        {/* Icon */}
        <div className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-4"
          style={{ width: 88, height: 88, background: '#fee2e2' }}>
          <i className="ri-lock-line" style={{ fontSize: 40, color: '#dc2626' }}></i>
        </div>

        {/* Heading */}
        <h3 className="fw-bold mb-2" style={{ color: '#1e293b' }}>Access Restricted</h3>
        <p className="text-muted mb-4" style={{ fontSize: 15 }}>
          You don't have permission to view this page.
        </p>

        {/* Current role badge */}
        {meta && (
          <div className="d-inline-flex align-items-center gap-2 rounded-pill px-4 py-2 mb-5"
            style={{ background: meta.bg, border: `1px solid ${meta.color}22` }}>
            <i className={`${meta.icon}`} style={{ color: meta.color, fontSize: 16 }}></i>
            <span style={{ color: meta.color, fontWeight: 600, fontSize: 13 }}>
              Signed in as {meta.label}
            </span>
          </div>
        )}

        <p className="text-muted mb-5" style={{ fontSize: 13 }}>
          Your current role <strong>({meta?.label ?? user?.role})</strong> does not have access to this section.
          Contact your administrator if you believe this is a mistake.
        </p>

        {/* Actions */}
        <div className="d-flex gap-3 justify-content-center">
          <button className="btn btn-light" onClick={() => navigate(-1)}>
            <i className="ri-arrow-left-line me-1"></i>Go Back
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            <i className="ri-dashboard-2-line me-1"></i>Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
