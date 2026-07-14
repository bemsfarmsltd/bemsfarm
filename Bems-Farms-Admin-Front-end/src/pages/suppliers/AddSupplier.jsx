import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const INITIAL = {
  name: '', company: '', email: '', phone: '', address: '', city: '', state: '',
  contact_person: '', category: '', payment_terms: '', credit_limit: '', notes: '', status: 'active',
}

export default function AddSupplier() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL)
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Supplier name is required'); return }
    setSaving(true)
    try {
      await api.post('/admin/suppliers', form)
      toast.success('Supplier added successfully')
      navigate('/suppliers/list')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add supplier')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Add Supplier</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Suppliers</a></li>
          <li className="breadcrumb-item active">Add Supplier</li>
        </ul>
      </div>

      <div className="row">
        <div className="col-xxl-8">
          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">Supplier Information</h6>
              </div>
              <div className="card-body">
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label">Supplier Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter supplier name"
                      value={form.name}
                      onChange={set('name')}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter company name"
                      value={form.company}
                      onChange={set('company')}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Enter email"
                      value={form.email}
                      onChange={set('email')}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone / Contact <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+234 800 000 0000"
                      value={form.phone}
                      onChange={set('phone')}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contact person name"
                      value={form.contact_person}
                      onChange={set('contact_person')}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Category</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Produce, Dairy"
                      value={form.category}
                      onChange={set('category')}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter city"
                      value={form.city}
                      onChange={set('city')}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter state"
                      value={form.state}
                      onChange={set('state')}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Payment Terms</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Net 30"
                      value={form.payment_terms}
                      onChange={set('payment_terms')}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Credit Limit (₦)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0.00"
                      value={form.credit_limit}
                      onChange={set('credit_limit')}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={set('status')}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Enter full address"
                      value={form.address}
                      onChange={set('address')}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Additional notes..."
                      value={form.notes}
                      onChange={set('notes')}
                    />
                  </div>
                  <div className="col-12 d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-light border"
                      onClick={() => navigate('/suppliers/list')}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving
                        ? <><span className="spinner-border spinner-border-sm me-1" />Adding...</>
                        : 'Add Supplier'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="col-xxl-4">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Tips</h6>
            </div>
            <div className="card-body">
              <ul className="list-unstyled text-muted small">
                <li className="mb-2"><i className="ri-checkbox-circle-line text-success me-1"></i>Supplier Name and Phone are required.</li>
                <li className="mb-2"><i className="ri-checkbox-circle-line text-success me-1"></i>Credit limit sets the maximum outstanding balance.</li>
                <li className="mb-2"><i className="ri-checkbox-circle-line text-success me-1"></i>Payment Terms (e.g. Net 30) control due dates.</li>
                <li className="mb-2"><i className="ri-checkbox-circle-line text-success me-1"></i>Category helps group suppliers for reporting.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
