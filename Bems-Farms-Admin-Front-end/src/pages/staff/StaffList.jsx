import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { toast } from 'react-hot-toast'

export default function StaffList() {
  const [staff, setStaff] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, on_duty_today: 0, departments: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Edit Staff State
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete / Deactivate State
  const [deletingStaff, setDeletingStaff] = useState(null)
  const [processingDelete, setProcessingDelete] = useState(false)

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        department: departmentFilter || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
      }
      const res = await api.get('/admin/staff', { params })
      setStaff(res.data.staff || [])
      setTotalPages(res.data.pages || 1)
      setTotalCount(res.data.total || 0)
      if (res.data.stats) setStats(res.data.stats)
    } catch (err) {
      console.error('Error fetching staff list:', err)
      toast.error('Failed to load staff list')
    } finally {
      setLoading(false)
    }
  }, [page, search, departmentFilter, statusFilter, roleFilter])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const handleStatusToggle = async (member) => {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active'
    try {
      await api.patch(`/admin/staff/${member.id}/status`, { status: nextStatus })
      toast.success(`Staff member marked as ${nextStatus}`)
      setStaff((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, status: nextStatus } : s))
      )
      if (stats) {
        setStats((prev) => ({
          ...prev,
          active: nextStatus === 'active' ? Number(prev.active) + 1 : Number(prev.active) - 1,
        }))
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update staff status')
    }
  }

  const openEditModal = (member) => {
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

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!selectedStaff) return
    setSavingEdit(true)
    try {
      await api.patch(`/admin/staff/${selectedStaff.id}`, {
        ...editFormData,
        basic_salary: editFormData.basic_salary ? parseFloat(editFormData.basic_salary) : null,
      })
      toast.success('Staff details updated successfully')
      fetchStaff()
      setSelectedStaff(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update staff')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return
    setProcessingDelete(true)
    try {
      await api.delete(`/admin/staff/${deletingStaff.id}`)
      toast.success('Staff account deactivated successfully')
      setStaff((prev) =>
        prev.map((s) => (s.id === deletingStaff.id ? { ...s, status: 'inactive' } : s))
      )
      setDeletingStaff(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to deactivate staff')
    } finally {
      setProcessingDelete(false)
    }
  }

  const getRoleBadgeClass = (systemRole) => {
    switch (systemRole) {
      case 'superadmin':
        return 'bg-danger text-white'
      case 'admin':
        return 'bg-purple-subtle text-purple border border-purple-subtle'
      case 'manager':
        return 'bg-primary-subtle text-primary border border-primary-subtle'
      case 'accountant':
        return 'bg-info-subtle text-info border border-info-subtle'
      case 'cashier':
        return 'bg-success-subtle text-success border border-success-subtle'
      case 'storekeeper':
        return 'bg-warning-subtle text-warning border border-warning-subtle'
      case 'delivery_manager':
        return 'bg-secondary-subtle text-secondary border border-secondary-subtle'
      case 'kitchen_staff':
        return 'bg-orange-subtle text-orange border border-orange-subtle'
      default:
        return 'bg-light text-dark'
    }
  }

  return (
    <div className="container-fluid">
      {/* Heading */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex justify-content-between align-items-md-center">
        <div>
          <h6 className="mb-0 fw-bold">Staff Directory & User Accounts</h6>
          <p className="text-muted fs-sm mb-0">Manage employee accounts, system access levels, contact records, and active credentials.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link to="/staff/add" className="btn btn-primary">
            <i className="ri-user-add-line me-1 align-middle"></i>Add Staff
          </Link>
          <Link to="/staff/roles-permissions" className="btn btn-outline-secondary">
            <i className="ri-shield-keyhole-line me-1 align-middle"></i>Roles & Permissions
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 border-start border-primary border-4 h-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="text-muted fs-sm mb-1 fw-medium">Total Staff</p>
                <h4 className="fw-bold mb-0">{stats.total || 0}</h4>
              </div>
              <div className="size-11 rounded-3 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fs-xl">
                <i className="ri-team-line"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 border-start border-success border-4 h-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="text-muted fs-sm mb-1 fw-medium">Active Accounts</p>
                <h4 className="fw-bold mb-0 text-success">{stats.active || 0}</h4>
              </div>
              <div className="size-11 rounded-3 bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center fs-xl">
                <i className="ri-checkbox-circle-line"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 border-start border-info border-4 h-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="text-muted fs-sm mb-1 fw-medium">On Duty Today</p>
                <h4 className="fw-bold mb-0 text-info">{stats.on_duty_today || 0}</h4>
              </div>
              <div className="size-11 rounded-3 bg-info bg-opacity-10 text-info d-flex align-items-center justify-content-center fs-xl">
                <i className="ri-user-follow-line"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 border-start border-warning border-4 h-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="text-muted fs-sm mb-1 fw-medium">Departments</p>
                <h4 className="fw-bold mb-0 text-warning">{stats.departments || 0}</h4>
              </div>
              <div className="size-11 rounded-3 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center fs-xl">
                <i className="ri-building-line"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-bottom">
          <div className="row g-2 align-items-center justify-content-between">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="ri-search-line text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="Search staff by name, email, code or phone..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
            </div>
            <div className="col-md-8">
              <div className="d-flex flex-wrap gap-2 justify-content-md-end">
                <select
                  className="form-select form-select-sm w-auto"
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Departments</option>
                  <option value="Store Operations">Store Operations</option>
                  <option value="Sales">Sales & POS</option>
                  <option value="Inventory / Warehouse">Inventory & Warehouse</option>
                  <option value="Logistics / Dispatch">Logistics & Dispatch</option>
                  <option value="Kitchen / Chef Bems">Kitchen / Chef Bems</option>
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Management">Management</option>
                </select>

                <select
                  className="form-select form-select-sm w-auto"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setSearch('')
                    setDepartmentFilter('')
                    setStatusFilter('')
                    setRoleFilter('')
                    setPage(1)
                  }}
                >
                  <i className="ri-refresh-line me-1"></i>Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0 text-nowrap">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Staff Member</th>
                  <th>Department & Role</th>
                  <th>System Access</th>
                  <th>Contact Info</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading staff records...
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="ri-user-unfollow-line fs-3xl d-block mb-2 opacity-50"></i>
                      No staff accounts found matching your filters.
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr key={member.id}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-2">
                          <div className="size-10 rounded-circle bg-primary bg-opacity-10 text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0">
                            {member.name ? member.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{member.name}</div>
                            <div className="text-muted fs-xs font-monospace">
                              {member.employee_code || `EMP-${String(member.id).padStart(3, '0')}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-medium">{member.role || 'Staff'}</div>
                        <div className="text-muted fs-xs">{member.department || 'General'}</div>
                      </td>
                      <td>
                        <span className={`badge text-capitalize ${getRoleBadgeClass(member.system_role || 'staff')}`}>
                          {(member.system_role || 'staff').replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="fs-sm">{member.email}</div>
                        <div className="text-muted fs-xs">{member.phone || 'No phone'}</div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border text-capitalize">
                          {member.shift || 'Morning'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`badge border-0 cursor-pointer ${
                            member.status === 'active'
                              ? 'bg-success-subtle text-success'
                              : member.status === 'on_leave'
                              ? 'bg-warning-subtle text-warning'
                              : 'bg-danger-subtle text-danger'
                          }`}
                          onClick={() => handleStatusToggle(member)}
                          title="Click to toggle active/inactive"
                        >
                          {member.status === 'active' ? '● Active' : member.status === 'on_leave' ? '● On Leave' : '● Inactive'}
                        </button>
                      </td>
                      <td className="text-end pe-3">
                        <div className="d-inline-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-sub-primary btn-icon"
                            onClick={() => openEditModal(member)}
                            title="Edit Staff Details"
                          >
                            <i className="ri-pencil-line"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-sub-danger btn-icon"
                            onClick={() => setDeletingStaff(member)}
                            title="Deactivate Staff Account"
                          >
                            <i className="ri-user-forbid-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="card-footer bg-transparent border-top py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <p className="text-muted fs-sm mb-0">
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total staff)
            </p>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setPage(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Edit Staff Modal */}
      {selectedStaff && (
        <div className="modal fade show d-block bg-dark bg-opacity-50" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">
                  Edit Staff Details - {selectedStaff.name} ({selectedStaff.employee_code})
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedStaff(null)}
                ></button>
              </div>
              <form onSubmit={handleSaveEdit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Department</label>
                      <select
                        className="form-select"
                        value={editFormData.department}
                        onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      >
                        <option value="Store Operations">Store Operations</option>
                        <option value="Sales">Sales & POS</option>
                        <option value="Inventory / Warehouse">Inventory & Warehouse</option>
                        <option value="Logistics / Dispatch">Logistics & Dispatch</option>
                        <option value="Kitchen / Chef Bems">Kitchen / Chef Bems</option>
                        <option value="Finance & Accounting">Finance & Accounting</option>
                        <option value="Management">Management</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Job Title / Role</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Shift</label>
                      <select
                        className="form-select"
                        value={editFormData.shift}
                        onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
                      >
                        <option value="morning">Morning Shift</option>
                        <option value="afternoon">Afternoon Shift</option>
                        <option value="evening">Evening Shift</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Basic Salary (₦)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editFormData.basic_salary}
                        onChange={(e) => setEditFormData({ ...editFormData, basic_salary: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Address</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={editFormData.address}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      ></textarea>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Emergency Contact</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.emergency_contact}
                        onChange={(e) => setEditFormData({ ...editFormData, emergency_contact: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Emergency Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={editFormData.emergency_phone}
                        onChange={(e) => setEditFormData({ ...editFormData, emergency_phone: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Administrative Notes</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedStaff(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                    {savingEdit ? 'Saving...' : 'Update Staff Details'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {deletingStaff && (
        <div className="modal fade show d-block bg-dark bg-opacity-50" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content text-center p-4">
              <div className="size-14 rounded-circle bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center mx-auto mb-3 fs-2xl">
                <i className="ri-user-forbid-line"></i>
              </div>
              <h5 className="modal-title fw-bold mb-2">Deactivate Staff Account?</h5>
              <p className="text-muted fs-sm mb-4">
                Are you sure you want to deactivate <strong>{deletingStaff.name}</strong>? They will no longer be able to log in to the system.
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <button
                  type="button"
                  className="btn btn-light w-50"
                  onClick={() => setDeletingStaff(null)}
                  disabled={processingDelete}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger w-50"
                  onClick={handleConfirmDelete}
                  disabled={processingDelete}
                >
                  {processingDelete ? 'Deactivating...' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
