import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META, isSalesRole } from '../../lib/roles'

export default function POSLogoutModal({ isOpen, onClose, onConfirmLogout, onCloseShiftFirst, session }) {
  const { user } = useAuth()

  if (!isOpen) return null

  const isSales = isSalesRole(user?.role)
  const roleMeta = user?.role ? ROLE_META[user.role] : null
  const staffName = user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Staff'

  return (
    <div
      className="modal show d-block pos-modal-overlay-wrap"
      tabIndex="-1"
      style={{ zIndex: 10000, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: '440px', width: '92vw', margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-content shadow-2xl border-0"
          style={{
            borderRadius: '20px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
          }}
        >
          <div className="p-4 text-center">
            {/* Warning / Logout Icon */}
            <div
              className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
              style={{
                width: 64,
                height: 64,
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontSize: 28,
              }}
            >
              <i className="ri-logout-circle-r-line"></i>
            </div>

            <h5 className="fw-bold mb-1" style={{ color: '#0f172a' }}>Sign Out of POS?</h5>
            <p className="text-muted fs-13 mb-3">
              Signed in as <strong>{staffName}</strong> ({roleMeta?.label || (isSales ? 'Sales Person' : 'Staff')})
            </p>

            {session && (
              <div
                className="p-3 rounded-3 mb-3 text-start fs-12"
                style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e' }}
              >
                <div className="fw-bold d-flex align-items-center gap-1.5 mb-1">
                  <i className="ri-alert-fill text-warning"></i>
                  <span>Active Shift Session ({session.session_ref || 'Open'})</span>
                </div>
                <span>You currently have an active register session. If your shift is ending, you should count the cash drawer and close shift.</span>
              </div>
            )}

            <div className="d-flex flex-column gap-2 mt-4">
              {session && onCloseShiftFirst && (
                <button
                  type="button"
                  className="btn btn-warning py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2"
                  onClick={() => {
                    onClose()
                    onCloseShiftFirst()
                  }}
                  style={{ borderRadius: '12px', fontSize: '13.5px' }}
                >
                  <i className="ri-safe-2-line"></i>
                  <span>Count Drawer &amp; End Shift (Z-Report)</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-danger py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2"
                onClick={() => {
                  onClose()
                  onConfirmLogout()
                }}
                style={{ borderRadius: '12px', fontSize: '13.5px' }}
              >
                <i className="ri-logout-box-r-line"></i>
                <span>Sign Out Now</span>
              </button>

              <button
                type="button"
                className="btn btn-light py-2 text-muted fw-bold"
                onClick={onClose}
                style={{ borderRadius: '12px', fontSize: '13px' }}
              >
                Continue Working
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
