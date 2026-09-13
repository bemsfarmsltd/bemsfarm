import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import SettingsTabs from './SettingsTabs'

export default function TeamOnboarding() {
  const { user } = useAuth()

  // Form State
  const [email, setEmail] = useState('')
  const [systemRole, setSystemRole] = useState('cashier')
  const [department, setDepartment] = useState('Store Operations')
  const [submitting, setSubmitting] = useState(false)

  // Success state for newly created invite
  const [lastInvite, setLastInvite] = useState(null)

  // Invitations & Team State
  const [invitations, setInvitations] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  // Fetch pending invitations & current team
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, staffRes] = await Promise.all([
        api.get('/admin/staff/invitations').catch(() => ({ data: { invitations: [] } })),
        api.get('/admin/staff', { params: { limit: 100 } }).catch(() => ({ data: { staff: [] } })),
      ])
      setInvitations(invRes.data?.invitations || [])
      setTeamMembers(staffRes.data?.staff || [])
    } catch (err) {
      console.error('Failed to load team data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle Send Invitation
  const handleSendInvite = async (e) => {
    e.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      toast.error('Please enter the team member email address')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/admin/staff/invite', {
        email: trimmedEmail,
        system_role: systemRole,
        department: department || undefined,
      })

      toast.success(res.data?.message || 'Onboarding invitation sent!')
      setLastInvite(res.data?.invitation || null)
      setEmail('')
      fetchData()
    } catch (err) {
      console.error('Invite error:', err)
      toast.error(err.response?.data?.message || 'Failed to send invitation')
    } finally {
      setSubmitting(false)
    }
  }

  // Copy Link Helper
  const handleCopyLink = (url) => {
    if (!url) return
    navigator.clipboard.writeText(url)
    toast.success('Onboarding link copied to clipboard!')
  }

  // Resend Invite
  const handleResend = async (id) => {
    setActionLoadingId(id)
    try {
      const res = await api.post(`/admin/staff/invitations/${id}/resend`)
      toast.success(res.data?.message || 'Invitation resent successfully!')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend invitation')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Revoke Invite
  const handleRevoke = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this invitation link?')) return
    setActionLoadingId(id)
    try {
      await api.delete(`/admin/staff/invitations/${id}`)
      toast.success('Invitation link revoked')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke invitation')
    } finally {
      setActionLoadingId(null)
    }
  }

  const formatRoleLabel = (role) => {
    switch (role) {
      case 'superadmin':
        return 'Super Admin'
      case 'admin':
        return 'Administrator'
      case 'manager':
        return 'Store Manager'
      case 'cashier':
        return 'POS Cashier'
      case 'kitchen_staff':
        return 'Kitchen / Storekeeper'
      case 'delivery_manager':
        return 'Delivery Manager'
      case 'accountant':
        return 'Accountant'
      default:
        return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member'
    }
  }

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'superadmin':
        return 'bg-dark text-white'
      case 'admin':
        return 'bg-primary-subtle text-primary border border-primary-subtle'
      case 'manager':
        return 'bg-purple-subtle text-purple border border-purple-subtle'
      case 'cashier':
        return 'bg-success-subtle text-success border border-success-subtle'
      case 'kitchen_staff':
        return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
      case 'delivery_manager':
        return 'bg-info-subtle text-info border border-info-subtle'
      default:
        return 'bg-light text-dark border'
    }
  }

  const pendingCount = invitations.filter((i) => (i.effective_status || i.status) === 'pending').length

  return (
    <div className="container-fluid py-3">
      {/* Settings Navigation Tabs */}
      <SettingsTabs />

      {/* Page Heading */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="fw-bold font-display text-dark mb-1">Team Onboarding &amp; Roles</h5>
          <p className="text-muted fs-sm mb-0">
            Invite colleagues by email and assign system permissions. They will receive a link to set up their name and password.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/staff" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
            <i className="ri-team-line"></i> Staff Directory
          </Link>
          <Link to="/staff/roles" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
            <i className="ri-shield-keyhole-line"></i> Roles &amp; Permissions
          </Link>
        </div>
      </div>

      {/* Quick Invite Form Card */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
        <div className="card-header bg-white border-bottom p-3.5 d-flex align-items-center gap-2">
          <div className="bg-emerald-subtle text-emerald p-2 rounded-3">
            <i className="ri-mail-send-line fs-5"></i>
          </div>
          <div>
            <h6 className="fw-bold text-dark mb-0">Invite Team Member</h6>
            <small className="text-muted">Enter email and choose role — no tedious forms required</small>
          </div>
        </div>

        <div className="card-body p-4 bg-white">
          <form onSubmit={handleSendInvite}>
            <div className="row g-3 align-items-end">
              {/* Email Address */}
              <div className="col-12 col-md-5">
                <label className="form-label fw-semibold text-dark fs-sm mb-1.5">
                  Work Email Address <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="ri-mail-line text-muted"></i>
                  </span>
                  <input
                    type="email"
                    className="form-control border-start-0 ps-0"
                    placeholder="e.g. colleague@bemsfarms.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* System Access Role */}
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-dark fs-sm mb-1.5">
                  System Access Role <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={systemRole}
                  onChange={(e) => setSystemRole(e.target.value)}
                >
                  <option value="cashier">POS Cashier (Storefront &amp; Sales)</option>
                  <option value="kitchen_staff">Kitchen / Storekeeper (Inventory &amp; Batches)</option>
                  <option value="delivery_manager">Delivery Manager (Dispatch &amp; Drivers)</option>
                  <option value="manager">Store Manager (Full Operations &amp; Reports)</option>
                  <option value="admin">Administrator (Settings &amp; Store Management)</option>
                  <option value="accountant">Accountant (Financial Statements &amp; Reports)</option>
                  {user?.role === 'superadmin' && (
                    <option value="superadmin">Super Admin (Unrestricted System Access)</option>
                  )}
                </select>
              </div>

              {/* Department */}
              <div className="col-12 col-md-3">
                <label className="form-label fw-semibold text-dark fs-sm mb-1.5">Department</label>
                <select
                  className="form-select"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="Store Operations">Store Operations</option>
                  <option value="Sales & POS">Sales &amp; POS</option>
                  <option value="Kitchen & Processing">Kitchen &amp; Processing</option>
                  <option value="Logistics & Dispatch">Logistics &amp; Dispatch</option>
                  <option value="Finance & Accounts">Finance &amp; Accounts</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="col-12 mt-3 pt-2 border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
                <small className="text-muted fs-xs">
                  <i className="ri-information-line me-1"></i>
                  The recipient will receive an onboarding email valid for <strong>7 days</strong> to set their password.
                </small>

                <button
                  type="submit"
                  className="btn btn-primary px-4 d-inline-flex align-items-center gap-1.5 shadow-sm"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Sending Invite…
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-fill"></i> Send Onboarding Invitation
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Last Generated Invite Banner */}
          {lastInvite && (
            <div className="alert alert-success border-2 border-success bg-success-subtle p-3 mt-4 rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <div className="fw-bold text-success d-flex align-items-center gap-1.5">
                  <i className="ri-checkbox-circle-fill fs-5"></i>
                  Invitation link created for {lastInvite.email}!
                </div>
                <div className="text-muted fs-xs mt-0.5">
                  Role: <strong>{formatRoleLabel(lastInvite.role)}</strong> &bull; Share this direct link if the member cannot access email right now.
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-success d-inline-flex align-items-center gap-1 shadow-xs"
                  onClick={() => handleCopyLink(lastInvite.invite_url)}
                >
                  <i className="ri-file-copy-line"></i> Copy Invite Link
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setLastInvite(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs / Sections: Pending Invitations & Active Members */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <h6 className="fw-bold text-dark mb-0 font-display">Onboarding Invitations</h6>
            <span className="badge bg-light text-dark border">{invitations.length} total</span>
            {pendingCount > 0 && (
              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                {pendingCount} Pending
              </span>
            )}
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={fetchData}
            title="Refresh list"
          >
            <i className="ri-refresh-line"></i> Refresh
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 text-nowrap fs-sm">
            <thead className="table-light text-muted fs-xs text-uppercase">
              <tr>
                <th>Invited Member</th>
                <th>Assigned Role</th>
                <th>Department</th>
                <th>Invited By</th>
                <th>Sent Date</th>
                <th>Status</th>
                <th className="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    Loading invitations…
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <i className="ri-mail-line fs-1 d-block mb-2 text-muted opacity-50"></i>
                    No invitations sent yet. Use the simple form above to invite your team.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => {
                  const status = inv.effective_status || inv.status
                  const isPending = status === 'pending'
                  const isAccepted = status === 'accepted'
                  const isExpired = status === 'expired'
                  const isRevoked = status === 'revoked'

                  return (
                    <tr key={inv.id}>
                      <td>
                        <div className="fw-bold text-dark">{inv.email}</div>
                        {inv.name && <small className="text-muted fs-xs">{inv.name}</small>}
                      </td>
                      <td>
                        <span className={`badge ${getRoleBadgeClass(inv.role)}`}>
                          {formatRoleLabel(inv.role)}
                        </span>
                      </td>
                      <td>
                        <span className="text-muted">{inv.department || 'General'}</span>
                      </td>
                      <td>
                        <span className="text-dark">{inv.invited_by_name || 'Admin'}</span>
                      </td>
                      <td>
                        <span className="text-muted fs-xs">
                          {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td>
                        {isAccepted ? (
                          <span className="badge bg-success-subtle text-success">
                            <i className="ri-check-line me-0.5"></i> Accepted
                          </span>
                        ) : isPending ? (
                          <span className="badge bg-warning-subtle text-warning-emphasis">
                            <i className="ri-time-line me-0.5"></i> Pending Sign-up
                          </span>
                        ) : isExpired ? (
                          <span className="badge bg-secondary-subtle text-secondary">
                            Expired
                          </span>
                        ) : (
                          <span className="badge bg-danger-subtle text-danger">
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="text-end pe-3">
                        <div className="btn-group btn-group-sm">
                          {/* Copy Link */}
                          {inv.token && !isAccepted && !isRevoked && (
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => {
                                const adminUrl = window.location.origin + '/admin/onboard?token=' + inv.token
                                handleCopyLink(adminUrl)
                              }}
                              title="Copy onboarding link"
                            >
                              <i className="ri-file-copy-line"></i>
                            </button>
                          )}

                          {/* Resend Email */}
                          {isPending && (
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              disabled={actionLoadingId === inv.id}
                              onClick={() => handleResend(inv.id)}
                              title="Resend invitation email"
                            >
                              {actionLoadingId === inv.id ? (
                                <span className="spinner-border spinner-border-sm"></span>
                              ) : (
                                <i className="ri-restart-line"></i>
                              )}
                            </button>
                          )}

                          {/* Revoke */}
                          {isPending && (
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              disabled={actionLoadingId === inv.id}
                              onClick={() => handleRevoke(inv.id)}
                              title="Revoke invitation"
                            >
                              <i className="ri-close-circle-line"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
