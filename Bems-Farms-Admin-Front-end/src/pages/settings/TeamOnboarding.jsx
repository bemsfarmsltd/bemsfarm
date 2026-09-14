import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

// Available permissions for granular role management
const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard & Analytics', desc: 'View high level store metrics & sales KPI cards' },
  { id: 'pos', label: 'POS & Cashier Hub', desc: 'Create cash/card/transfer orders on the POS terminal' },
  { id: 'orders', label: 'Orders Management', desc: 'Process, fulfill, cancel, or dispute orders' },
  { id: 'inventory', label: 'Inventory & Stock In', desc: 'Manage stock levels, batch intakes, and stock variance adjustments' },
  { id: 'products', label: 'Products & Pricing', desc: 'Create, edit, pricing, and category configuration' },
  { id: 'deliveries', label: 'Dispatch & Deliveries', desc: 'Assign riders, track live shipments, and record handover status' },
  { id: 'kitchen', label: 'Chef Bems Kitchen', desc: 'View and manage ready-to-eat and custom processed orders' },
  { id: 'reports', label: 'Financial & Sales Reports', desc: 'Access sales, profit margins, revenue, and tax reporting' },
  { id: 'staff', label: 'Staff & User Accounts', desc: 'Create employee profiles, credentials, and manage system roles' },
  { id: 'customers', label: 'Customer Directory', desc: 'View customer accounts, purchase history, and store credits' },
  { id: 'settings', label: 'System Configuration', desc: 'Manage payment gateways, store settings, and tax policies' },
]

const DEFAULT_SYSTEM_ROLES = [
  {
    id: 1,
    name: 'superadmin',
    description: 'Full unrestricted system access, administrative controls & billing.',
    permissions: ['*'],
    is_system: true,
    staff_count: 1,
  },
  {
    id: 2,
    name: 'manager',
    description: 'Store manager with operations, inventory, customer & team oversight.',
    permissions: ['dashboard', 'pos', 'orders', 'inventory', 'products', 'deliveries', 'kitchen', 'reports', 'staff', 'customers', 'settings'],
    is_system: true,
    staff_count: 0,
  },
  {
    id: 3,
    name: 'cashier',
    description: 'POS cashier for point-of-sale checkout, receipts & customer lookups.',
    permissions: ['pos', 'orders', 'customers'],
    is_system: true,
    staff_count: 0,
  },
  {
    id: 4,
    name: 'storekeeper',
    description: 'Warehouse inventory, stock batch receipt & stock level adjustments.',
    permissions: ['inventory', 'products'],
    is_system: true,
    staff_count: 0,
  },
  {
    id: 5,
    name: 'delivery_manager',
    description: 'Delivery dispatch, rider assignments, routing & tracking.',
    permissions: ['deliveries', 'orders'],
    is_system: true,
    staff_count: 0,
  },
  {
    id: 6,
    name: 'accountant',
    description: 'Financial ledger, revenue & expenditure reporting.',
    permissions: ['reports', 'dashboard'],
    is_system: true,
    staff_count: 0,
  },
]

export default function TeamOnboarding({ initialTab }) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Active view driven by sidebar sub-nav (URL ?tab= param)
  const activeView = searchParams.get('tab') || initialTab || 'staff'

  // ── 1. ONBOARDING & INVITE STATE ──────────────────────────────────────────
  const [email, setEmail] = useState('')
  const [systemRole, setSystemRole] = useState('cashier')
  const [department, setDepartment] = useState('Store Operations')
  const [submittingInvite, setSubmittingInvite] = useState(false)
  const [lastInvite, setLastInvite] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [invitationsLoading, setInvitationsLoading] = useState(true)
  const [inviteActionId, setInviteActionId] = useState(null)

  // ── 2. STAFF DIRECTORY STATE ──────────────────────────────────────────────
  const [staff, setStaff] = useState([])
  const [staffStats, setStaffStats] = useState({ total: 0, active: 0, on_duty_today: 0, departments: 0 })
  const [staffLoading, setStaffLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [staffPage, setStaffPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Edit Staff Modal
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Deactivate Staff Modal
  const [deactivatingStaff, setDeactivatingStaff] = useState(null)
  const [processingDeactivate, setProcessingDeactivate] = useState(false)
  const [deletingStaff, setDeletingStaff] = useState(null)
  const [processingDelete, setProcessingDelete] = useState(false)
  const [deleteCanForce, setDeleteCanForce] = useState(false)

  // ── 3. ROLES & PERMISSIONS STATE ──────────────────────────────────────────
  const [roles, setRoles] = useState(DEFAULT_SYSTEM_ROLES)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [roleSearch, setRoleSearch] = useState('')

  // Edit/Add Role Modal
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [roleModalMode, setRoleModalMode] = useState('add') // 'add' | 'edit'
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: [] })
  const [submittingRole, setSubmittingRole] = useState(false)

  // ── DATA FETCHING ─────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setInvitationsLoading(true)
    setStaffLoading(true)
    setRolesLoading(true)

    // Parallel fetch
    const [invRes, staffRes, rolesRes] = await Promise.all([
      api.get('/admin/staff/invitations').catch(() => ({ data: { invitations: [] } })),
      api.get('/admin/staff', {
        params: {
          page: staffPage,
          limit: 30,
          search: search.trim() || undefined,
          department: deptFilter || undefined,
          status: statusFilter || undefined,
          role: roleFilter || undefined,
        },
      }).catch(() => ({ data: { staff: [], stats: { total: 0, active: 0, on_duty_today: 0, departments: 0 } } })),
      api.get('/admin/staff/roles').catch(() => ({ data: { roles: DEFAULT_SYSTEM_ROLES } })),
    ])

    setInvitations(invRes.data?.invitations || [])
    setInvitationsLoading(false)

    setStaff(staffRes.data?.staff || [])
    if (staffRes.data?.stats) setStaffStats(staffRes.data.stats)
    setTotalPages(staffRes.data?.pages || 1)
    setStaffLoading(false)

    const fetchedRoles = rolesRes.data?.roles || []
    setRoles(fetchedRoles.length > 0 ? fetchedRoles : DEFAULT_SYSTEM_ROLES)
    setRolesLoading(false)
  }, [staffPage, search, deptFilter, statusFilter, roleFilter])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // ── ONBOARDING HANDLERS ───────────────────────────────────────────────────
  const handleSendInvite = async (e) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      toast.error('Please enter the team member email address')
      return
    }

    setSubmittingInvite(true)
    try {
      const res = await api.post('/admin/staff/invite', {
        email: trimmed,
        system_role: systemRole,
        department: department || undefined,
      })

      toast.success(res.data?.message || 'Onboarding invitation sent!')
      setLastInvite(res.data?.invitation || null)
      setEmail('')
      // Refresh list
      const invRes = await api.get('/admin/staff/invitations').catch(() => null)
      if (invRes?.data?.invitations) setInvitations(invRes.data.invitations)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation')
    } finally {
      setSubmittingInvite(false)
    }
  }

  const handleCopyLink = (url) => {
    if (!url) return
    navigator.clipboard.writeText(url)
    toast.success('Onboarding link copied to clipboard!')
  }

  const handleResend = async (id) => {
    setInviteActionId(id)
    try {
      const res = await api.post(`/admin/staff/invitations/${id}/resend`)
      toast.success(res.data?.message || 'Invitation resent!')
      const invRes = await api.get('/admin/staff/invitations').catch(() => null)
      if (invRes?.data?.invitations) setInvitations(invRes.data.invitations)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend invitation')
    } finally {
      setInviteActionId(null)
    }
  }

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this invitation link?')) return
    setInviteActionId(id)
    try {
      await api.delete(`/admin/staff/invitations/${id}`)
      toast.success('Invitation link revoked')
      const invRes = await api.get('/admin/staff/invitations').catch(() => null)
      if (invRes?.data?.invitations) setInvitations(invRes.data.invitations)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke invitation')
    } finally {
      setInviteActionId(null)
    }
  }

  // ── STAFF DIRECTORY HANDLERS ──────────────────────────────────────────────
  const handleStatusToggle = async (member) => {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active'
    try {
      await api.patch(`/admin/staff/${member.id}/status`, { status: nextStatus })
      toast.success(`Staff account marked as ${nextStatus}`)
      setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, status: nextStatus } : s)))
      setStaffStats((prev) => ({
        ...prev,
        active: nextStatus === 'active' ? Number(prev.active) + 1 : Math.max(0, Number(prev.active) - 1),
      }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const openEditStaffModal = (member) => {
    setSelectedStaff(member)
    setEditFormData({
      name: member.name || '',
      phone: member.phone || '',
      department: member.department || '',
      role: member.role || '',
      shift: member.shift || 'morning',
      basic_salary: member.basic_salary || '',
      address: member.address || '',
      emergency_contact: member.emergency_contact || '',
      emergency_phone: member.emergency_phone || '',
      notes: member.notes || '',
    })
  }

  const handleSaveStaffEdit = async (e) => {
    e.preventDefault()
    if (!selectedStaff) return
    setSavingEdit(true)
    try {
      await api.patch(`/admin/staff/${selectedStaff.id}`, {
        ...editFormData,
        basic_salary: editFormData.basic_salary ? parseFloat(editFormData.basic_salary) : null,
      })
      toast.success('Staff profile updated successfully')
      setSelectedStaff(null)
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update staff profile')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleConfirmDeactivate = async () => {
    if (!deactivatingStaff) return
    setProcessingDeactivate(true)
    try {
      await api.delete(`/admin/staff/${deactivatingStaff.id}`)
      toast.success('Staff member account deactivated')
      setDeactivatingStaff(null)
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate staff')
    } finally {
      setProcessingDeactivate(false)
    }
  }

  const handleConfirmDelete = async (force = false) => {
    if (!deletingStaff) return
    setProcessingDelete(true)
    try {
      await api.delete(`/admin/staff/${deletingStaff.id}/permanent`, { params: force ? { force: true } : undefined })
      toast.success(force ? 'Staff member and related records purged' : 'Staff member permanently deleted')
      setDeletingStaff(null)
      setDeleteCanForce(false)
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete staff member')
      setDeleteCanForce(!!err.response?.data?.can_force)
    } finally {
      setProcessingDelete(false)
    }
  }

  // ── ROLES HANDLERS ────────────────────────────────────────────────────────
  const openEditRoleModal = (role) => {
    setRoleModalMode('edit')
    setSelectedRole(role)
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    })
    setShowRoleModal(true)
  }

  const openAddRoleModal = () => {
    setRoleModalMode('add')
    setSelectedRole(null)
    setRoleForm({
      name: '',
      description: '',
      permissions: ['dashboard', 'orders'],
    })
    setShowRoleModal(true)
  }

  const handleTogglePermission = (permId) => {
    if (selectedRole?.name === 'superadmin') {
      toast.error('Super Admin permissions cannot be modified')
      return
    }
    setRoleForm((prev) => {
      const current = prev.permissions || []
      return {
        ...prev,
        permissions: current.includes(permId)
          ? current.filter((p) => p !== permId)
          : [...current, permId],
      }
    })
  }

  const handleSaveRole = async (e) => {
    e.preventDefault()
    if (!roleForm.name.trim()) {
      toast.error('Role name is required')
      return
    }

    setSubmittingRole(true)
    try {
      if (roleModalMode === 'edit') {
        const res = await api.patch(`/admin/staff/roles/${selectedRole.id}`, {
          description: roleForm.description,
          permissions: roleForm.permissions,
        })
        toast.success(res.data?.message || 'Role permissions updated!')
      } else {
        const res = await api.post('/admin/staff/roles', {
          name: roleForm.name.toLowerCase().trim().replace(/\s+/g, '_'),
          description: roleForm.description,
          permissions: roleForm.permissions,
        })
        toast.success(res.data?.message || 'Custom role created!')
      }
      setShowRoleModal(false)
      const rolesRes = await api.get('/admin/staff/roles').catch(() => null)
      if (rolesRes?.data?.roles) setRoles(rolesRes.data.roles)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save role')
    } finally {
      setSubmittingRole(false)
    }
  }

  // Helpers
  const formatRoleLabel = (role) => {
    switch (role) {
      case 'superadmin':       return 'Super Admin'
      case 'admin':            return 'Administrator'
      case 'manager':          return 'Store Manager'
      case 'cashier':          return 'POS Cashier'
      case 'kitchen_staff':
      case 'kitchen':          return 'Kitchen / Cook'
      case 'storekeeper':      return 'Storekeeper'
      case 'delivery_manager': return 'Delivery Manager'
      case 'accountant':       return 'Accountant'
      default:
        return role ? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Member'
    }
  }

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'superadmin':       return { bg: '#1e293b', text: '#f8fafc', border: '#334155' }
      case 'admin':            return { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' }
      case 'manager':          return { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' }
      case 'cashier':          return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }
      case 'kitchen_staff':
      case 'kitchen':          return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }
      case 'storekeeper':      return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' }
      case 'delivery_manager': return { bg: '#cffafe', text: '#0e7490', border: '#a5f3fc' }
      case 'accountant':       return { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' }
      default:                 return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
    }
  }

  const pendingInvitesCount = useMemo(
    () => invitations.filter((i) => (i.effective_status || i.status) === 'pending').length,
    [invitations]
  )

  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles
    const q = roleSearch.toLowerCase()
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q))
    )
  }, [roles, roleSearch])

  return (
    <div className="container-fluid py-3">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h4 className="fw-bold font-display text-dark mb-0">Team Onboarding &amp; Staff</h4>
            <span className="badge bg-emerald-subtle text-emerald border border-emerald-subtle px-2.5 py-1">
              Onboarding Hub
            </span>
          </div>
          <p className="text-muted fs-sm mb-0">
            Invite team members, track onboarding invitations, manage employee credentials, and configure system role permissions.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1.5 shadow-xs"
            onClick={fetchAllData}
            title="Refresh all team data"
          >
            <i className="ri-refresh-line"></i> Refresh All
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1.5 shadow-xs"
            onClick={() => {
              setView('roles')
              openAddRoleModal()
            }}
          >
            <i className="ri-shield-keyhole-line"></i> + Create Custom Role
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1.5 shadow-sm"
            onClick={() => setView('onboarding')}
          >
            <i className="ri-mail-send-line"></i> + Invite Member
          </button>
        </div>
      </div>

      {/* 3. KPI Stats Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div
            className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100"
            style={{ cursor: 'pointer' }}
            onClick={() => setView('staff')}
            title="View Staff Directory"
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted text-uppercase fw-bold fs-xs">Total Staff</small>
                <div className="fs-3 fw-bold text-dark mt-1">{staffStats.total || staff.length}</div>
              </div>
              <div className="p-2.5 rounded-3 bg-primary-subtle text-primary">
                <i className="ri-team-line fs-4"></i>
              </div>
            </div>
            <small className="text-muted fs-xs mt-2 d-block">
              {staffStats.active || staff.filter((s) => s.status === 'active').length} active credentials
            </small>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div
            className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100"
            style={{ cursor: 'pointer' }}
            onClick={() => setView('staff')}
            title="View Active Staff"
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted text-uppercase fw-bold fs-xs">Active Accounts</small>
                <div className="fs-3 fw-bold text-success mt-1">
                  {staffStats.active || staff.filter((s) => s.status === 'active').length}
                </div>
              </div>
              <div className="p-2.5 rounded-3 bg-success-subtle text-success">
                <i className="ri-user-follow-line fs-4"></i>
              </div>
            </div>
            <small className="text-muted fs-xs mt-2 d-block">Ready to access system</small>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div
            className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100"
            style={{ cursor: 'pointer' }}
            onClick={() => setView('onboarding')}
            title="View Onboarding Invitations"
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted text-uppercase fw-bold fs-xs">Pending Invites</small>
                <div className="fs-3 fw-bold text-warning-emphasis mt-1">{pendingInvitesCount}</div>
              </div>
              <div className="p-2.5 rounded-3 bg-warning-subtle text-warning-emphasis">
                <i className="ri-mail-open-line fs-4"></i>
              </div>
            </div>
            <small className="text-muted fs-xs mt-2 d-block">{invitations.length} total invitations</small>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div
            className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100"
            style={{ cursor: 'pointer' }}
            onClick={() => setView('roles')}
            title="View Roles & Permissions"
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <small className="text-muted text-uppercase fw-bold fs-xs">System Roles</small>
                <div className="fs-3 fw-bold text-dark mt-1">{roles.length}</div>
              </div>
              <div className="p-2.5 rounded-3 bg-purple-subtle text-purple">
                <i className="ri-shield-user-line fs-4"></i>
              </div>
            </div>
            <small className="text-muted fs-xs mt-2 d-block">Configured permission profiles</small>
          </div>
        </div>
      </div>



      {/* ═════════════════════════════════════════════════════════════════════════
          SECTION 1: TEAM ONBOARDING & QUICK INVITE
      ═════════════════════════════════════════════════════════════════════════ */}
      {activeView === 'onboarding' && (
        <div className="mb-5" id="invite-section">
          {/* Quick Invite Card */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4" id="invite-form-card">
            <div className="card-header bg-white border-bottom p-3.5 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-emerald-subtle text-emerald p-2 rounded-3">
                  <i className="ri-mail-send-line fs-5"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-0 font-display">Invite New Team Member</h6>
                  <small className="text-muted">Generate instant onboarding link and email password setup</small>
                </div>
              </div>
              <span className="badge bg-light text-muted border">Step 1 of Onboarding</span>
            </div>

            <div className="card-body p-4 bg-white">
              <form onSubmit={handleSendInvite}>
                <div className="row g-3 align-items-end">
                  {/* Work Email */}
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

                  {/* System Role */}
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
                      The recipient will receive an onboarding email valid for <strong>7 days</strong> to set their name and password.
                    </small>

                    <button
                      type="submit"
                      className="btn btn-primary px-4 d-inline-flex align-items-center gap-1.5 shadow-sm"
                      disabled={submittingInvite}
                    >
                      {submittingInvite ? (
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

              {/* Newly Created Invite Banner */}
              {lastInvite && (
                <div className="alert alert-success border-2 border-success bg-success-subtle p-3 mt-4 rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <div className="fw-bold text-success d-flex align-items-center gap-1.5">
                      <i className="ri-checkbox-circle-fill fs-5"></i>
                      Invitation link active for {lastInvite.email}!
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
                      <i className="ri-file-copy-line"></i> Copy Direct Link
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

          {/* Onboarding Invitations Table Card */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header bg-white border-bottom p-3.5 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <h6 className="fw-bold text-dark mb-0 font-display">Onboarding Invitations Queue</h6>
                <span className="badge bg-light text-dark border">{invitations.length} total</span>
                {pendingInvitesCount > 0 && (
                  <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {pendingInvitesCount} Pending Sign-up
                  </span>
                )}
              </div>
              <small className="text-muted fs-xs">Tokens auto-expire after 7 days</small>
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
                  {invitationsLoading ? (
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
                        No invitations sent yet. Use the invite form above to invite team members.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((inv) => {
                      const status = inv.effective_status || inv.status
                      const isPending = status === 'pending'
                      const isAccepted = status === 'accepted'
                      const isExpired = status === 'expired'
                      const badgeStyle = getRoleBadgeStyle(inv.role)

                      return (
                        <tr key={inv.id}>
                          <td>
                            <div className="fw-bold text-dark">{inv.email}</div>
                            {inv.name && <small className="text-muted fs-xs">{inv.name}</small>}
                          </td>
                          <td>
                            <span
                              className="badge px-2.5 py-1"
                              style={{
                                background: badgeStyle.bg,
                                color: badgeStyle.text,
                                border: `1px solid ${badgeStyle.border}`,
                              }}
                            >
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
                              <span className="badge bg-success-subtle text-success border border-success-subtle">
                                <i className="ri-check-line me-0.5"></i> Accepted
                              </span>
                            ) : isPending ? (
                              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                                <i className="ri-time-line me-0.5"></i> Pending Sign-up
                              </span>
                            ) : isExpired ? (
                              <span className="badge bg-secondary-subtle text-secondary border">
                                Expired
                              </span>
                            ) : (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                Revoked
                              </span>
                            )}
                          </td>
                          <td className="text-end pe-3">
                            <div className="btn-group btn-group-sm shadow-xs">
                              {inv.token && !isAccepted && status !== 'revoked' && (
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

                              {isPending && (
                                <button
                                  type="button"
                                  className="btn btn-outline-primary"
                                  disabled={inviteActionId === inv.id}
                                  onClick={() => handleResend(inv.id)}
                                  title="Resend invitation email"
                                >
                                  {inviteActionId === inv.id ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                  ) : (
                                    <i className="ri-restart-line"></i>
                                  )}
                                </button>
                              )}

                              {isPending && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  disabled={inviteActionId === inv.id}
                                  onClick={() => handleRevoke(inv.id)}
                                  title="Revoke invitation link"
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
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          SECTION 2: STAFF DIRECTORY & USER ACCOUNTS
      ═════════════════════════════════════════════════════════════════════════ */}
      {activeView === 'staff' && (
        <div className="mb-5" id="staff-section">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header bg-white border-bottom p-3.5 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-primary-subtle text-primary p-2 rounded-3">
                  <i className="ri-team-line fs-5"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-0 font-display">Staff Directory &amp; User Accounts</h6>
                  <small className="text-muted">Manage active employee profiles, credentials, and system status</small>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setSearch('')
                    setDeptFilter('')
                    setStatusFilter('')
                    setRoleFilter('')
                  }}
                >
                  <i className="ri-filter-off-line me-1"></i> Reset Filters
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3 bg-light border-bottom">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-4">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="ri-search-line text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0 ps-0"
                      placeholder="Search staff by name, email, code, phone…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <select
                    className="form-select form-select-sm"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    <option value="Store Operations">Store Operations</option>
                    <option value="Sales & POS">Sales &amp; POS</option>
                    <option value="Kitchen & Processing">Kitchen &amp; Processing</option>
                    <option value="Logistics & Dispatch">Logistics &amp; Dispatch</option>
                    <option value="Finance & Accounts">Finance &amp; Accounts</option>
                    <option value="Administration">Administration</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>

                <div className="col-6 col-md-3">
                  <select
                    className="form-select form-select-sm"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="">All System Roles</option>
                    <option value="superadmin">Super Admin</option>
                    <option value="manager">Store Manager</option>
                    <option value="cashier">POS Cashier</option>
                    <option value="kitchen_staff">Kitchen Staff</option>
                    <option value="delivery_manager">Delivery Manager</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>

                <div className="col-12 col-md-2">
                  <select
                    className="form-select form-select-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Staff Table */}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 text-nowrap fs-sm">
                <thead className="table-light text-muted fs-xs text-uppercase">
                  <tr>
                    <th>Staff Member</th>
                    <th>Department &amp; Job Title</th>
                    <th>System Role</th>
                    <th>Contact Info</th>
                    <th>Shift</th>
                    <th>Account Status</th>
                    <th className="text-end pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffLoading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                        Loading staff directory…
                      </td>
                    </tr>
                  ) : staff.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <i className="ri-team-line fs-1 d-block mb-2 text-muted opacity-50"></i>
                        No staff accounts matching your filters.
                      </td>
                    </tr>
                  ) : (
                    staff.map((member) => {
                      const badgeStyle = getRoleBadgeStyle(member.system_role || member.role)
                      const isActive = member.status === 'active'

                      return (
                        <tr key={member.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2.5">
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '50%',
                                  background: '#e0e7ff',
                                  color: '#3730a3',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: 13,
                                }}
                              >
                                {(member.name || member.email || '?').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="fw-bold text-dark">{member.name || 'Staff Member'}</div>
                                <div className="text-muted fs-xs d-flex align-items-center gap-1">
                                  <span className="badge bg-light text-muted border font-monospace fs-2xs">
                                    {member.employee_code || member.employee_id || `EMP-${member.id}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="text-dark fw-medium">{member.department || 'Store Operations'}</div>
                            <small className="text-muted fs-xs">{member.role || 'Staff'}</small>
                          </td>
                          <td>
                            <span
                              className="badge px-2.5 py-1"
                              style={{
                                background: badgeStyle.bg,
                                color: badgeStyle.text,
                                border: `1px solid ${badgeStyle.border}`,
                              }}
                            >
                              {formatRoleLabel(member.system_role || member.role)}
                            </span>
                          </td>
                          <td>
                            <div className="text-dark fs-xs">{member.email}</div>
                            {member.phone && <small className="text-muted fs-2xs">{member.phone}</small>}
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border text-capitalize">
                              {member.shift || 'morning'}
                            </span>
                          </td>
                          <td>
                            <div className="form-check form-switch m-0">
                              <input
                                className="form-check-input cursor-pointer"
                                type="checkbox"
                                role="switch"
                                checked={isActive}
                                onChange={() => handleStatusToggle(member)}
                              />
                              <label className="form-check-label fs-xs ms-1">
                                {isActive ? (
                                  <span className="text-success fw-semibold">Active</span>
                                ) : (
                                  <span className="text-muted">Inactive</span>
                                )}
                              </label>
                            </div>
                          </td>
                          <td className="text-end pe-3">
                            <div className="btn-group btn-group-sm shadow-xs">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => openEditStaffModal(member)}
                                title="Edit staff profile"
                              >
                                <i className="ri-pencil-line"></i>
                              </button>
                              {user?.role === 'superadmin' && member.user_id !== user.id && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => setDeactivatingStaff(member)}
                                  title="Deactivate account"
                                >
                                  <i className="ri-user-unfollow-line"></i>
                                </button>
                              )}
                              {user?.role === 'superadmin' && member.user_id !== user.id && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => { setDeletingStaff(member); setDeleteCanForce(false) }}
                                  title="Permanently delete staff member"
                                >
                                  <i className="ri-delete-bin-line"></i>
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

            {/* Pagination footer if multi-page */}
            {totalPages > 1 && (
              <div className="card-footer bg-white border-top p-3 d-flex justify-content-between align-items-center">
                <small className="text-muted">Page {staffPage} of {totalPages}</small>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={staffPage <= 1}
                    onClick={() => setStaffPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={staffPage >= totalPages}
                    onClick={() => setStaffPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                  </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ═════════════════════════════════════════════════════════════════════════
          SECTION 3: ROLES & PERMISSIONS MATRIX
      ═════════════════════════════════════════════════════════════════════════ */}
      {activeView === 'roles' && (
        <div className="mb-5" id="roles-section">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header bg-white border-bottom p-3.5 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-purple-subtle text-purple p-2 rounded-3">
                  <i className="ri-shield-keyhole-line fs-5"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-0 font-display">Role Permissions &amp; System Access Levels</h6>
                  <small className="text-muted">Configure module visibility and granular access control for staff roles</small>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1.5 shadow-sm"
                  onClick={openAddRoleModal}
                >
                  <i className="ri-add-line"></i> + Create Custom Role
                </button>
              </div>
            </div>

            {/* Role Search */}
            <div className="p-3 bg-light border-bottom">
              <div className="input-group input-group-sm" style={{ maxWidth: 350 }}>
                <span className="input-group-text bg-white border-end-0">
                  <i className="ri-search-line text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search role or description…"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Roles Table */}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 text-nowrap fs-sm">
                <thead className="table-light text-muted fs-xs text-uppercase">
                  <tr>
                    <th>Role Name</th>
                    <th>Description</th>
                    <th>Granted Module Permissions</th>
                    <th>Assigned Staff</th>
                    <th>Type</th>
                    <th className="text-end pe-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rolesLoading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                        Loading role definitions…
                      </td>
                    </tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        No roles matching search.
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((r) => {
                      const isSuper = r.name === 'superadmin'
                      const isAllPerms = Array.isArray(r.permissions) && r.permissions.includes('*')

                      return (
                        <tr key={r.id || r.name}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="p-1.5 rounded-2 bg-light text-dark">
                                <i className="ri-shield-line fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold text-dark font-display">{formatRoleLabel(r.name)}</div>
                                <small className="text-muted fs-2xs font-monospace">{r.name}</small>
                              </div>
                            </div>
                          </td>
                          <td style={{ maxWidth: 280, whiteSpace: 'normal' }}>
                            <span className="text-muted fs-xs">{r.description || 'System access role'}</span>
                          </td>
                          <td style={{ maxWidth: 380, whiteSpace: 'normal' }}>
                            {isAllPerms ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
                                <i className="ri-flashlight-fill me-1"></i> Full System Access (*)
                              </span>
                            ) : Array.isArray(r.permissions) && r.permissions.length > 0 ? (
                              <div className="d-flex flex-wrap gap-1">
                                {r.permissions.map((p) => (
                                  <span key={p} className="badge bg-light text-dark border fs-2xs px-1.5 py-0.5">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted fs-xs">No permissions assigned</span>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              <i className="ri-user-line me-1"></i>
                              {r.staff_count || 0} Staff
                            </span>
                          </td>
                          <td>
                            {r.is_system ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle">
                                System Role
                              </span>
                            ) : (
                              <span className="badge bg-purple-subtle text-purple border border-purple-subtle">
                                Custom Role
                              </span>
                            )}
                          </td>
                          <td className="text-end pe-3">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm shadow-xs"
                              disabled={isSuper}
                              onClick={() => openEditRoleModal(r)}
                              title={isSuper ? 'Superadmin has all permissions' : 'Edit permissions'}
                            >
                              <i className="ri-edit-line me-1"></i> Edit Permissions
                            </button>
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
      )}


      {/* ═════════════════════════════════════════════════════════════════════════
          MODALS
      ═════════════════════════════════════════════════════════════════════════ */}

      {/* ── MODAL 1: EDIT STAFF PROFILE ──────────────────────────────────────── */}
      {selectedStaff && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1060 }}
          onClick={() => setSelectedStaff(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-white border-bottom p-3.5">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary-subtle text-primary p-2 rounded-3">
                    <i className="ri-user-settings-line fs-5"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-dark mb-0">Edit Staff Profile</h6>
                    <small className="text-muted">{selectedStaff.email}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedStaff(null)}
                ></button>
              </div>

              <form onSubmit={handleSaveStaffEdit}>
                <div className="modal-body p-4 bg-white">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold text-dark fs-sm">Full Legal Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold text-dark fs-sm">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold text-dark fs-sm">Department</label>
                      <select
                        className="form-select"
                        value={editFormData.department}
                        onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      >
                        <option value="Store Operations">Store Operations</option>
                        <option value="Sales & POS">Sales &amp; POS</option>
                        <option value="Kitchen & Processing">Kitchen &amp; Processing</option>
                        <option value="Logistics & Dispatch">Logistics &amp; Dispatch</option>
                        <option value="Finance & Accounts">Finance &amp; Accounts</option>
                        <option value="Administration">Administration</option>
                        <option value="Executive">Executive</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold text-dark fs-sm">Job Title / Designation</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Senior POS Cashier"
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold text-dark fs-sm">Work Shift</label>
                      <select
                        className="form-select"
                        value={editFormData.shift}
                        onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
                      >
                        <option value="morning">Morning Shift</option>
                        <option value="afternoon">Afternoon Shift</option>
                        <option value="evening">Evening Shift</option>
                        <option value="night">Night Shift</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold text-dark fs-sm">Basic Salary (Monthly)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="0.00"
                        value={editFormData.basic_salary}
                        onChange={(e) => setEditFormData({ ...editFormData, basic_salary: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold text-dark fs-sm">Emergency Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.emergency_phone}
                        onChange={(e) => setEditFormData({ ...editFormData, emergency_phone: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold text-dark fs-sm">Residential Address</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.address}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold text-dark fs-sm">Admin Notes</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light border-top p-3 d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setSelectedStaff(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-4 shadow-sm"
                    disabled={savingEdit}
                  >
                    {savingEdit ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: DEACTIVATE STAFF CONFIRMATION ────────────────────────────── */}
      {deactivatingStaff && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1060 }}
          onClick={() => setDeactivatingStaff(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-danger-subtle border-bottom border-danger-subtle p-3.5">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-danger text-white p-2 rounded-3">
                    <i className="ri-alert-line fs-5"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-danger mb-0">Deactivate Staff Account</h6>
                    <small className="text-muted">{deactivatingStaff.name || deactivatingStaff.email}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeactivatingStaff(null)}
                ></button>
              </div>

              <div className="modal-body p-4 bg-white">
                <p className="text-muted fs-sm mb-0">
                  Are you sure you want to deactivate <strong>{deactivatingStaff.name || deactivatingStaff.email}</strong>?
                  Their active sessions will be revoked and they will no longer be able to sign in to the portal.
                </p>
              </div>

              <div className="modal-footer bg-light border-top p-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setDeactivatingStaff(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-4 shadow-sm"
                  disabled={processingDeactivate}
                  onClick={handleConfirmDeactivate}
                >
                  {processingDeactivate ? 'Deactivating…' : 'Yes, Deactivate Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2b: PERMANENTLY DELETE STAFF CONFIRMATION ──────────────────── */}
      {deletingStaff && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1060 }}
          onClick={() => { setDeletingStaff(null); setDeleteCanForce(false) }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-danger-subtle border-bottom border-danger-subtle p-3.5">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-danger text-white p-2 rounded-3">
                    <i className="ri-delete-bin-line fs-5"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-danger mb-0">Permanently Delete Staff Member</h6>
                    <small className="text-muted">{deletingStaff.name || deletingStaff.email}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => { setDeletingStaff(null); setDeleteCanForce(false) }}
                ></button>
              </div>

              <div className="modal-body p-4 bg-white">
                <p className="text-muted fs-sm mb-0">
                  This permanently erases <strong>{deletingStaff.name || deletingStaff.email}</strong>'s staff record,
                  login account, and attendance/payroll history. This cannot be undone — if you only want to revoke
                  their access, use <strong>Deactivate</strong> instead.
                </p>
                {deleteCanForce && (
                  <p className="text-warning fs-sm mb-0 mt-3 p-3 rounded-3 bg-warning-subtle">
                    <i className="ri-alert-line me-1"></i>
                    They have related records (things they created, approved, or were assigned) blocking a plain
                    delete. <strong>Force Delete</strong> will reassign those records to a placeholder account —
                    real business data (coupons, expenses, stock movements, etc.) is never deleted — and then remove
                    this staff member for good.
                  </p>
                )}
              </div>

              <div className="modal-footer bg-light border-top p-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => { setDeletingStaff(null); setDeleteCanForce(false) }}
                >
                  Cancel
                </button>
                <div className="d-flex gap-2">
                  {!deleteCanForce && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm px-4 shadow-sm"
                      disabled={processingDelete}
                      onClick={() => handleConfirmDelete(false)}
                    >
                      {processingDelete ? 'Deleting…' : 'Yes, Delete Permanently'}
                    </button>
                  )}
                  {deleteCanForce && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm px-4 shadow-sm"
                      disabled={processingDelete}
                      onClick={() => handleConfirmDelete(true)}
                    >
                      {processingDelete ? 'Purging…' : 'Force Delete Anyway'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: EDIT / CREATE ROLE PERMISSIONS ──────────────────────────── */}
      {showRoleModal && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1060 }}
          onClick={() => setShowRoleModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-white border-bottom p-3.5">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-purple-subtle text-purple p-2 rounded-3">
                    <i className="ri-shield-keyhole-line fs-5"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-dark mb-0 font-display">
                      {roleModalMode === 'edit'
                        ? `Edit Permissions — ${formatRoleLabel(selectedRole?.name)}`
                        : 'Create Custom System Role'}
                    </h6>
                    <small className="text-muted">Toggle accessible modules and capabilities</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRoleModal(false)}
                ></button>
              </div>

              <form onSubmit={handleSaveRole}>
                <div className="modal-body p-4 bg-white">
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold text-dark fs-sm">Role Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. inventory_auditor"
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        disabled={roleModalMode === 'edit'}
                        required
                      />
                      {roleModalMode === 'add' && (
                        <small className="text-muted fs-2xs">Lowercase identifier, e.g. "shift_supervisor"</small>
                      )}
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold text-dark fs-sm">Description</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Manages store warehouse stock and batch audits"
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <h6 className="fw-bold text-dark fs-sm mb-3">Module Permissions Checklist</h6>
                  <div className="row g-2">
                    {AVAILABLE_PERMISSIONS.map((perm) => {
                      const checked =
                        roleForm.permissions?.includes('*') ||
                        roleForm.permissions?.includes(perm.id)

                      return (
                        <div key={perm.id} className="col-12 col-md-6">
                          <div
                            className={`p-2.5 rounded-3 border d-flex align-items-start gap-2.5 cursor-pointer transition-all ${
                              checked ? 'bg-primary-subtle border-primary-subtle' : 'bg-light border-light'
                            }`}
                            onClick={() => handleTogglePermission(perm.id)}
                          >
                            <input
                              type="checkbox"
                              className="form-check-input mt-1"
                              checked={checked}
                              readOnly
                            />
                            <div>
                              <div className="fw-bold text-dark fs-sm">{perm.label}</div>
                              <small className="text-muted fs-xs d-block">{perm.desc}</small>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="modal-footer bg-light border-top p-3 d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowRoleModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-4 shadow-sm"
                    disabled={submittingRole}
                  >
                    {submittingRole ? 'Saving…' : 'Save Role & Permissions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
