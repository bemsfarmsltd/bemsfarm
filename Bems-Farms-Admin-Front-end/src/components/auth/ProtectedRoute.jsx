import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading, canAccess } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-body-secondary">
        <div className="d-flex flex-column align-items-center gap-3">
          <div className="spinner-border text-success" role="status" style={{ width: 40, height: 40, borderWidth: 4 }}>
            <span className="visually-hidden">Loading…</span>
          </div>
          <span className="text-muted fs-sm">Loading…</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !canAccess(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
