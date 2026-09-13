import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { toast } from 'react-hot-toast'
import SettingsTabs from '../settings/SettingsTabs'

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard & Analytics', desc: 'View high level store metrics & sales KPI cards' },
  { id: 'pos', label: 'POS & Cashier Hub', desc: 'Create cash/card/transfer orders on the POS terminal' },
  { id: 'orders', label: 'Orders Management', desc: 'Process, fulfill, cancel, or dispute orders' },
  { id: 'inventory', label: 'Inventory & Stock In', desc: 'Manage stock levels, batch intakes, and stock variance adjustments' },
  { id: 'products', label: 'Products & Pricing', desc: 'Create, edit, pricing, and category configuration' },
  { id: 'deliveries', label: 'Dispatch & Deliveries', desc: 'Assign riders, track live shipments, and record handover status' },
  { id: 'kitchen', label: 'Chef Bems Kitchen', desc: 'View and manage ready-to-eat and custom processed orders' },
  { id: 'reports', label: 'Financial & Sales Reports', desc: 'Access sales, profit margins, expense, and tax reporting' },
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

export default function RolesPermissions() {
  const [roles, setRoles] = useState(DEFAULT_SYSTEM_ROLES)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' | 'edit'
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [],
  })
  const [submitting, setSubmitting] = useState(false)

  // Delete State
  const [deletingRole, setDeletingRole] = useState(null)
  const [processingDelete, setProcessingDelete] = useState(false)

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get('/admin/staff/roles')
      const fetched = res.data?.roles || []
      setRoles(fetched.length > 0 ? fetched : DEFAULT_SYSTEM_ROLES)
    } catch (err) {
      console.error('Failed to fetch roles:', err)
      setRoles((prev) => (prev.length > 0 ? prev : DEFAULT_SYSTEM_ROLES))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const openAddModal = () => {
    setModalMode('add')
    setSelectedRole(null)
    setRoleForm({
      name: '',
      description: '',
      permissions: ['dashboard', 'orders'],
    })
    setShowAddModal(true)
  }

  const openEditModal = (role) => {
    setModalMode('edit')
    setSelectedRole(role)
    const perms = Array.isArray(role.permissions) ? role.permissions : []
    const initialPerms = perms.includes('*')
      ? AVAILABLE_PERMISSIONS.map((p) => p.id)
      : perms
    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissions: initialPerms,
    })
    setShowAddModal(true)
  }

  const togglePermission = (permId) => {
    setRoleForm((prev) => {
      const exists = prev.permissions.includes(permId)
      const nextPerms = exists
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId]
      return { ...prev, permissions: nextPerms }
    })
  }

  const handleSaveRole = async (e) => {
    e.preventDefault()
    if (!roleForm.name.trim()) {
      toast.error('Role name is required')
      return
    }

    setSubmitting(true)
    try {
      if (modalMode === 'add') {
        await api.post('/admin/staff/roles', roleForm)
        toast.success('Custom role created successfully')
      } else {
        const targetId = selectedRole?.id || selectedRole?.name
        await api.patch(`/admin/staff/roles/${targetId}`, {
          name: roleForm.name,
          description: roleForm.description,
          permissions: roleForm.permissions,
        })
        toast.success(`Permissions updated for ${selectedRole?.name?.replace(/_/g, ' ') || 'role'}`)
      }
      setShowAddModal(false)
      fetchRoles()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save role')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!deletingRole) return
    setProcessingDelete(true)
    try {
      await api.delete(`/admin/staff/roles/${deletingRole.id}`)
      toast.success('Role deleted successfully')
      setRoles((prev) => prev.filter((r) => r.id !== deletingRole.id))
      setDeletingRole(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete role')
    } finally {
      setProcessingDelete(false)
    }
  }

  const filteredRoles = roles.filter((r) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      r.name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="container-fluid py-3">
      {/* Settings Navigation Tabs */}
      <SettingsTabs />

      {/* Page Heading */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex justify-content-between align-items-md-center">
        <div>
          <h5 className="mb-0 fw-bold font-display text-dark">Role Permissions &amp; System Access Levels</h5>
          <p className="text-muted fs-sm mb-0">Control granular module permissions and system capabilities across various job functions.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link to="/settings/staff" className="btn btn-outline-secondary">
            <i className="ri-team-line me-1 align-middle"></i>Staff Directory
          </Link>
          <Link to="/settings/team" className="btn btn-outline-primary">
            <i className="ri-user-add-line me-1 align-middle"></i>Invite Member
          </Link>
          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            <i className="ri-add-line me-1 align-middle"></i>Create Custom Role
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-bottom">
          <div className="row g-2 align-items-center justify-content-between">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="ri-search-line text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="Search role or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4 text-md-end">
              <span className="badge bg-light text-dark border py-2 px-3">
                <i className="ri-shield-check-line me-1 text-primary"></i>
                {roles.length} Total Configured Roles
              </span>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0 text-nowrap">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Role Name</th>
                  <th>Description</th>
                  <th>Granted Module Permissions</th>
                  <th className="text-center">Staff Assigned</th>
                  <th>Type</th>
                  <th className="text-end pe-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading role permissions...
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      No roles found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => {
                    const perms = Array.isArray(role.permissions) ? role.permissions : []
                    const isAll = perms.includes('*')

                    return (
                      <tr key={role.id}>
                        <td className="ps-3">
                          <div className="d-flex align-items-center gap-2">
                            <div className="size-9 rounded-circle bg-primary bg-opacity-10 text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0">
                              <i className="ri-shield-line"></i>
                            </div>
                            <div>
                              <div className="fw-bold text-dark text-capitalize">
                                {role.name.replace(/_/g, ' ')}
                              </div>
                              <div className="text-muted fs-xs font-monospace">{role.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="text-muted fs-sm text-wrap" style={{ maxWidth: '260px' }}>
                            {role.description || 'System access role for Bems Farms operations.'}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '380px' }}>
                            {isAll ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                <i className="ri-flashlight-line me-1"></i>Full System Access (*)
                              </span>
                            ) : perms.length === 0 ? (
                              <span className="badge bg-light text-muted border">No modules assigned</span>
                            ) : (
                              perms.map((p) => (
                                <span
                                  key={p}
                                  className="badge bg-light text-dark border text-capitalize"
                                >
                                  {p.replace(/_/g, ' ')}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-light text-dark border px-2 py-1">
                            <i className="ri-user-line me-1 text-primary"></i>
                            {role.staff_count || 0} Staff
                          </span>
                        </td>
                        <td>
                          {role.is_system ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                              <i className="ri-lock-line me-1"></i>System Role
                            </span>
                          ) : (
                            <span className="badge bg-success-subtle text-success border border-success-subtle">
                              Custom Role
                            </span>
                          )}
                        </td>
                        <td className="text-end pe-3">
                          <div className="d-inline-flex gap-1 align-items-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 px-2 py-1"
                              onClick={() => openEditModal(role)}
                              title="Edit Module Permissions"
                            >
                              <i className="ri-pencil-line"></i>
                              <span>Edit Permissions</span>
                            </button>
                            {!role.is_system && (
                              <button
                                type="button"
                                className="btn btn-sm btn-sub-danger btn-icon"
                                onClick={() => setDeletingRole(role)}
                                title="Delete Custom Role"
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
        </div>
      </div>

      {/* Add / Edit Role Modal */}
      {showAddModal && (
        <div className="modal fade show d-block bg-dark bg-opacity-50" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <div>
                  <h5 className="modal-title fw-bold text-capitalize">
                    {modalMode === 'add'
                      ? 'Create New Custom Role'
                      : `Edit Permissions — ${selectedRole?.name?.replace(/_/g, ' ')}`}
                  </h5>
                  <p className="text-muted fs-xs mb-0">
                    {modalMode === 'add'
                      ? 'Configure role details and specify granted dashboard modules.'
                      : `Customize which dashboard modules this role is authorized to access.`}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSaveRole}>
                <div className="modal-body">
                  {selectedRole?.name === 'superadmin' && (
                    <div className="alert alert-info py-2 px-3 fs-xs mb-3 d-flex align-items-center gap-2">
                      <i className="ri-information-line fs-sm"></i>
                      <span>Superadmin maintains root access (<code>*</code>) across all system modules by default.</span>
                    </div>
                  )}

                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Role Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control text-capitalize"
                        placeholder="e.g. Warehouse Supervisor"
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        disabled={modalMode === 'edit' && selectedRole?.is_system}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Description</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Brief summary of duties and responsibilities..."
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <label className="form-label fw-bold mb-0">
                        <i className="ri-shield-check-line me-1 text-primary"></i>Assign Module Permissions
                      </label>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border py-1 px-2 fs-xs"
                          onClick={() =>
                            setRoleForm((prev) => ({
                              ...prev,
                              permissions: AVAILABLE_PERMISSIONS.map((p) => p.id),
                            }))
                          }
                        >
                          <i className="ri-checkbox-multiple-line me-1"></i>Select All
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border py-1 px-2 fs-xs"
                          onClick={() => setRoleForm((prev) => ({ ...prev, permissions: [] }))}
                        >
                          <i className="ri-close-circle-line me-1"></i>Clear All
                        </button>
                      </div>
                    </div>
                    <div className="row g-2">
                      {AVAILABLE_PERMISSIONS.map((perm) => {
                        const checked = roleForm.permissions.includes(perm.id)
                        return (
                          <div key={perm.id} className="col-md-6">
                            <div
                              className={`p-3 rounded border cursor-pointer h-100 transition-all ${
                                checked ? 'border-primary bg-primary bg-opacity-10' : 'bg-light'
                              }`}
                              onClick={() => togglePermission(perm.id)}
                            >
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`perm-${perm.id}`}
                                  checked={checked}
                                  onChange={() => togglePermission(perm.id)}
                                />
                                <label
                                  className="form-check-label fw-bold text-dark cursor-pointer"
                                  htmlFor={`perm-${perm.id}`}
                                >
                                  {perm.label}
                                </label>
                              </div>
                              <p className="text-muted fs-xs mb-0 mt-1 ps-4">{perm.desc}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : modalMode === 'add' ? 'Create Role' : 'Save Permissions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRole && (
        <div className="modal fade show d-block bg-dark bg-opacity-50" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content text-center p-4">
              <div className="size-14 rounded-circle bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center mx-auto mb-3 fs-2xl">
                <i className="ri-delete-bin-line"></i>
              </div>
              <h5 className="modal-title fw-bold mb-2">Delete Custom Role?</h5>
              <p className="text-muted fs-sm mb-4">
                Are you sure you want to delete <strong>{deletingRole.name}</strong>? Any staff currently assigned this role should be re-assigned first.
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <button
                  type="button"
                  className="btn btn-light w-50"
                  onClick={() => setDeletingRole(null)}
                  disabled={processingDelete}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger w-50"
                  onClick={handleDeleteRole}
                  disabled={processingDelete}
                >
                  {processingDelete ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
