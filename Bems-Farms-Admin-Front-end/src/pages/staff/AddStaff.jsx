import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { toast } from 'react-hot-toast'

export default function AddStaff() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [createdStaffInfo, setCreatedStaffInfo] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    system_role: 'cashier',
    department: 'Store Operations',
    role: 'POS Cashier',
    shift: 'morning',
    basic_salary: '',
    hire_date: new Date().toISOString().slice(0, 10),
    bank_name: '',
    account_number: '',
    account_name: '',
    emergency_contact: '',
    emergency_phone: '',
    address: '',
    notes: '',
  })

  const handleChange = (e) => {
    const { id, name, value } = e.target
    const key = name || id
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Full name and email are required')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        basic_salary: formData.basic_salary ? parseFloat(formData.basic_salary) : undefined,
      }
      const res = await api.post('/admin/staff', payload)
      toast.success(res.data.message || 'Staff account created successfully!')
      
      if (res.data.temp_password) {
        setCreatedStaffInfo({
          name: formData.name,
          email: formData.email,
          temp_password: res.data.temp_password,
          system_role: formData.system_role,
        })
      } else {
        navigate('/staff')
      }
    } catch (err) {
      console.error('Failed to add staff:', err)
      toast.error(err?.response?.data?.message || 'Failed to create staff account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex justify-content-between align-items-md-center">
        <div>
          <h6 className="mb-0 fw-bold">Add Staff Member</h6>
          <p className="text-muted fs-sm mb-0">Create staff credentials, configure department, assign system permissions & roles.</p>
        </div>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/staff">Staff</Link></li>
          <li className="breadcrumb-item active">Add Staff</li>
        </ul>
      </div>

      {createdStaffInfo && (
        <div className="alert alert-success alert-dismissible fade show p-4 shadow-sm mb-4 border-2 border-success" role="alert">
          <div className="d-flex align-items-center gap-3">
            <div className="size-12 rounded-circle bg-success bg-opacity-20 d-flex align-items-center justify-content-center text-success flex-shrink-0">
              <i className="ri-checkbox-circle-fill fs-2xl"></i>
            </div>
            <div className="flex-grow-1">
              <h5 className="alert-heading mb-1 text-success fw-bold">Staff Account Created Successfully!</h5>
              <p className="mb-2 text-dark">
                An account for <strong>{createdStaffInfo.name}</strong> ({createdStaffInfo.email}) has been generated.
              </p>
              <div className="p-3 bg-light rounded border d-inline-block">
                <span className="text-muted me-2">Temporary Login Password:</span>
                <code className="fs-base fw-bold text-primary">{createdStaffInfo.temp_password}</code>
              </div>
              <p className="text-muted fs-xs mt-2 mb-0">
                Please share this temporary password with the staff member. They can change it after their first login.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/staff')}
            >
              Go to Staff List
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          <div className="col-xl-8">
            {/* Basic Information */}
            <div className="card mb-4 shadow-sm">
              <div className="card-header bg-transparent border-bottom">
                <h5 className="card-title mb-0">
                  <i className="ri-user-line me-2 text-primary"></i>Personal & Contact Details
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="name" className="form-label fw-semibold">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-control"
                      placeholder="e.g. Ibrahim Adebayo"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="email" className="form-label fw-semibold">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-control"
                      placeholder="e.g. ibrahim@bemsfarms.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="phone" className="form-label fw-semibold">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="form-control"
                      placeholder="e.g. 08012345678"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="password" className="form-label fw-semibold">
                      Initial Password <span className="text-muted fs-xs fw-normal">(Leave blank to auto-generate)</span>
                    </label>
                    <input
                      type="text"
                      id="password"
                      name="password"
                      className="form-control"
                      placeholder="Leave blank for auto-generated temporary password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12">
                    <label htmlFor="address" className="form-label fw-semibold">Residential Address</label>
                    <textarea
                      id="address"
                      name="address"
                      className="form-control"
                      rows="2"
                      placeholder="Full residential address..."
                      value={formData.address}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact & Notes */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-transparent border-bottom">
                <h5 className="card-title mb-0">
                  <i className="ri-contacts-line me-2 text-primary"></i>Emergency Contact & Notes
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="emergency_contact" className="form-label fw-semibold">Emergency Contact Person</label>
                    <input
                      type="text"
                      id="emergency_contact"
                      name="emergency_contact"
                      className="form-control"
                      placeholder="e.g. Funke Adebayo (Spouse / Next of Kin)"
                      value={formData.emergency_contact}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="emergency_phone" className="form-label fw-semibold">Emergency Phone Number</label>
                    <input
                      type="tel"
                      id="emergency_phone"
                      name="emergency_phone"
                      className="form-control"
                      placeholder="e.g. 08098765432"
                      value={formData.emergency_phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12">
                    <label htmlFor="notes" className="form-label fw-semibold">Administrative Notes</label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      rows="2"
                      placeholder="Any additional notes or employment specifications..."
                      value={formData.notes}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            {/* Role & Access Controls */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-transparent border-bottom">
                <h5 className="card-title mb-0">
                  <i className="ri-shield-user-line me-2 text-primary"></i>Role & System Access
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="system_role" className="form-label fw-semibold">
                    System Access Level <span className="text-danger">*</span>
                  </label>
                  <select
                    id="system_role"
                    name="system_role"
                    className="form-select"
                    value={formData.system_role}
                    onChange={handleChange}
                    required
                  >
                    <option value="cashier">POS Cashier (POS & Sales)</option>
                    <option value="storekeeper">Storekeeper (Stock & Receiving)</option>
                    <option value="delivery_manager">Delivery Manager (Dispatch & Logistics)</option>
                    <option value="kitchen_staff">Kitchen Staff (Chef Bems Orders)</option>
                    <option value="accountant">Accountant (Reports & Ledger)</option>
                    <option value="manager">Store Manager (Full Store Operations)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                  <div className="form-text fs-xs text-muted">
                    Determines admin dashboard permissions and accessible feature modules.
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="department" className="form-label fw-semibold">
                    Department <span className="text-danger">*</span>
                  </label>
                  <select
                    id="department"
                    name="department"
                    className="form-select"
                    value={formData.department}
                    onChange={handleChange}
                    required
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

                <div className="mb-3">
                  <label htmlFor="role" className="form-label fw-semibold">
                    Job Title / Position <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    className="form-control"
                    placeholder="e.g. Lead POS Cashier"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="shift" className="form-label fw-semibold">Shift Timing</label>
                  <select
                    id="shift"
                    name="shift"
                    className="form-select"
                    value={formData.shift}
                    onChange={handleChange}
                  >
                    <option value="morning">Morning Shift (08:00 - 16:00)</option>
                    <option value="afternoon">Afternoon Shift (14:00 - 22:00)</option>
                    <option value="evening">Evening Shift (18:00 - Close)</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="hire_date" className="form-label fw-semibold">Hire Date</label>
                  <input
                    type="date"
                    id="hire_date"
                    name="hire_date"
                    className="form-control"
                    value={formData.hire_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="basic_salary" className="form-label fw-semibold">Monthly Basic Salary (₦)</label>
                  <input
                    type="number"
                    id="basic_salary"
                    name="basic_salary"
                    className="form-control"
                    placeholder="e.g. 150000"
                    min="0"
                    step="1000"
                    value={formData.basic_salary}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="card shadow-sm">
              <div className="card-body d-flex flex-column gap-2">
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <i className="ri-user-add-line me-1 align-middle"></i>
                      Save Staff Account
                    </>
                  )}
                </button>
                <Link to="/staff" className="btn btn-outline-secondary w-100">
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
