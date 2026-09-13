import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState(null)
  const [editItem, setEditItem]       = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', code: '', location: '', manager: '', capacity: 0, status: 'active',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/warehouses')
      setWarehouses(res.data.warehouses || [])
    } catch {
      toast.error('Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totals = {
    total:    warehouses.length,
    active:   warehouses.filter(w => w.status === 'active').length,
    products: warehouses.reduce((s,w) => s + Number(w.product_count || 0), 0),
    capacity: warehouses.reduce((s,w) => s + Number(w.capacity || 0), 0),
  }

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', code: '', location: '', manager: '', capacity: 0, status: 'active' })
    setActiveModal('form')
  }
  function openEdit(w) {
    setEditItem(w)
    setForm({ name: w.name || '', code: w.code || '', location: w.location || '', manager: w.manager || '', capacity: w.capacity || 0, status: w.status || 'active' })
    setActiveModal('form')
  }
  function openDelete(w) { setEditItem(w); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setEditItem(null) }

  async function saveForm(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Warehouse name is required')
    setSaving(true)
    try {
      if (editItem) {
        await api.patch(`/admin/inventory/warehouses/${editItem.id}`, form)
        toast.success('Warehouse updated')
      } else {
        await api.post('/admin/inventory/warehouses', form)
        toast.success('Warehouse added')
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save warehouse')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    try {
      await api.delete(`/admin/inventory/warehouses/${editItem.id}`)
      toast.success('Warehouse deactivated')
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate warehouse')
    }
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Warehouses</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/inventory/stock">Inventory</Link></li>
          <li className="breadcrumb-item active">Warehouses</li>
        </ul>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Warehouses', value: totals.total,    icon:'ri-building-2-line',    color:'#405189' },
          { label:'Active',           value: totals.active,   icon:'ri-checkbox-circle-line',color:'#0ab39c' },
          { label:'Total Products',   value: totals.products, icon:'ri-box-3-line',          color:'#299cdb' },
          { label:'Total Capacity',   value:`${totals.capacity} units`, icon:'ri-stack-line', color:'#f7b84b' },
        ].map(c => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card mb-0" style={{ borderLeft:`3px solid ${c.color}` }}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width:44, height:44, background:`${c.color}1a` }}>
                  <i className={`${c.icon} fs-20`} style={{ color:c.color }}></i>
                </div>
                <div>
                  <div className="fs-20 fw-bold" style={{ color:c.color }}>{c.value}</div>
                  <div className="text-muted" style={{ fontSize:12 }}>{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add warehouse button */}
      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openAdd}>
          <i className="ri-add-line"></i> Add Warehouse
        </button>
      </div>

      {loading && <div className="text-center text-muted py-5">Loading warehouses…</div>}
      {!loading && warehouses.length === 0 && (
        <div className="text-center text-muted py-5">
          <i className="ri-building-2-line fs-2 d-block mb-2"></i>No warehouses yet. Click "Add Warehouse" to create one.
        </div>
      )}

      {/* Warehouse cards */}
      <div className="row g-4">
        {warehouses.map(w => {
          const capacity = Number(w.capacity || 0)
          const used = Number(w.total_units || 0)
          const usePct  = capacity > 0 ? Math.round((used / capacity) * 100) : 0
          const barColor = usePct > 85 ? '#f06548' : usePct > 60 ? '#f7b84b' : '#0ab39c'
          return (
            <div className="col-md-6 col-xl-3" key={w.id}>
              <div className="card h-100">
                <div className="card-body">
                  {/* Header */}
                  <div className="d-flex align-items-start justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width:44, height:44, background:'#4051891a' }}>
                        <i className="ri-store-2-line fs-20" style={{ color:'#405189' }}></i>
                      </div>
                      <div>
                        <div className="fw-bold" style={{ fontSize:15 }}>{w.name}</div>
                        <div className="text-muted" style={{ fontSize:11 }}>{w.code ? <code>{w.code}</code> : '—'}</div>
                      </div>
                    </div>
                    <span className={`badge ${w.status === 'active' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                      {w.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Capacity bar */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1" style={{ fontSize:12 }}>
                      <span className="text-muted">Capacity Used</span>
                      <span className="fw-bold" style={{ color: barColor }}>{capacity > 0 ? `${usePct}%` : 'No limit set'}</span>
                    </div>
                    <div className="progress" style={{ height:8, borderRadius:4 }}>
                      <div className="progress-bar" style={{ width:`${Math.min(usePct,100)}%`, background: barColor, borderRadius:4 }}></div>
                    </div>
                    <div className="d-flex justify-content-between mt-1" style={{ fontSize:11, color:'#adb5bd' }}>
                      <span>{used} units in stock</span>
                      <span>{capacity > 0 ? `${capacity} total` : ''}</span>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="d-flex flex-column gap-1 mb-3" style={{ fontSize:13 }}>
                    <div className="d-flex gap-2"><i className="ri-user-line text-muted"></i><span>{w.manager || 'No manager assigned'}</span></div>
                    <div className="d-flex gap-2"><i className="ri-map-pin-line text-muted"></i><span style={{ color:'#6c757d' }}>{w.location || '—'}</span></div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between border-top pt-3">
                    <div className="text-center">
                      <div className="fw-bold fs-16">{w.product_count}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>Products</div>
                    </div>
                    <div className="text-center">
                      <div className="fw-bold fs-16">{capacity > 0 ? Math.max(0, capacity - used) : '—'}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>Free Space</div>
                    </div>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-soft-primary px-2" onClick={() => openEdit(w)}><i className="ri-pencil-line"></i></button>
                      <button className="btn btn-sm btn-soft-danger px-2" onClick={() => openDelete(w)}><i className="ri-delete-bin-line"></i></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Form Modal */}
      {activeModal === 'form' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h6 className="modal-title">{editItem ? 'Edit Warehouse' : 'Add New Warehouse'}</h6>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveForm}>
                    <div className="row g-3">
                      <div className="col-md-8">
                        <label className="form-label fw-medium">Warehouse Name <span className="text-danger">*</span></label>
                        <input className="form-control" required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g., Cold Room" />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Code</label>
                        <input className="form-control" value={form.code} onChange={e => setForm(f=>({...f,code:e.target.value}))} placeholder="e.g., WH-002" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Manager</label>
                        <input className="form-control" value={form.manager} onChange={e => setForm(f=>({...f,manager:e.target.value}))} placeholder="Manager name" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Capacity (units)</label>
                        <input type="number" className="form-control" min="0" value={form.capacity} onChange={e => setForm(f=>({...f,capacity:Number(e.target.value)}))} />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Location / Address</label>
                        <input className="form-control" value={form.location} onChange={e => setForm(f=>({...f,location:e.target.value}))} placeholder="e.g., Bems HQ, Block A" />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Status</label>
                        <select className="form-select" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                        {saving ? 'Saving…' : (editItem ? 'Save Changes' : 'Add Warehouse')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={closeModal}></div>
        </>
      )}

      {activeModal === 'delete' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
              <div className="modal-content p-4 text-center">
                <div className="d-flex justify-content-center mb-3">
                  <div className="rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center" style={{ width:56, height:56 }}>
                    <i className="ri-delete-bin-line text-danger fs-22"></i>
                  </div>
                </div>
                <h6 className="mb-1">Deactivate Warehouse?</h6>
                <p className="text-muted mb-4" style={{ fontSize:13 }}>{editItem?.name}</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger w-100" onClick={confirmDelete}>Deactivate</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={closeModal}></div>
        </>
      )}
    </div>
  )
}
