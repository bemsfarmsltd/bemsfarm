import { useState } from 'react'

const MOCK_WAREHOUSES = [
  { id:1, name:'Main Store',  code:'WH-001', type:'General',    manager:'Emeka Adeola',   location:'Bems HQ, Block A',        capacity:500, used:312, products:48, phone:'08012345678', status:'active' },
  { id:2, name:'Cold Room',   code:'WH-002', type:'Cold Chain', manager:'Ngozi Bello',    location:'Bems HQ, Block B (Rear)', capacity:200, used:133, products:22, phone:'08023456789', status:'active' },
  { id:3, name:'Dry Store',   code:'WH-003', type:'Dry Goods',  manager:'Tunde Okafor',   location:'Bems HQ, Annex Building', capacity:400, used:180, products:31, phone:'08034567890', status:'active' },
  { id:4, name:'Farm Store',  code:'WH-004', type:'Farm',       manager:'Chike Nwosu',    location:'Bems Farm Site, Km 12',   capacity:600, used:88,  products:15, phone:'08045678901', status:'active' },
]

const TYPE_ICON = {
  'General':   { icon:'ri-store-2-line',    color:'#405189' },
  'Cold Chain':{ icon:'ri-temp-cold-line',  color:'#299cdb' },
  'Dry Goods': { icon:'ri-archive-line',    color:'#f7b84b' },
  'Farm':      { icon:'ri-plant-line',      color:'#0ab39c' },
}

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState(MOCK_WAREHOUSES)
  const [activeModal, setActiveModal] = useState(null)
  const [editItem, setEditItem]       = useState(null)
  const [form, setForm] = useState({
    name:'', code:'', type:'General', manager:'', location:'', capacity:0, used:0, products:0, phone:'', status:'active'
  })

  const totals = {
    total:    warehouses.length,
    active:   warehouses.filter(w => w.status === 'active').length,
    products: warehouses.reduce((s,w) => s + w.products, 0),
    capacity: warehouses.reduce((s,w) => s + w.capacity, 0),
  }

  function openAdd() {
    setEditItem(null)
    const nextNum = Math.max(...warehouses.map(w => Number(w.code.split('-')[1]))) + 1
    setForm({ name:'', code:`WH-${String(nextNum).padStart(3,'0')}`, type:'General', manager:'', location:'', capacity:0, used:0, products:0, phone:'', status:'active' })
    setActiveModal('form')
  }
  function openEdit(w) { setEditItem(w); setForm({ ...w }); setActiveModal('form') }
  function openDelete(w) { setEditItem(w); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setEditItem(null) }

  function saveForm(e) {
    e.preventDefault()
    if (editItem) {
      setWarehouses(prev => prev.map(w => w.id === editItem.id ? { ...w, ...form } : w))
    } else {
      setWarehouses(prev => [...prev, { id: Math.max(...prev.map(w=>w.id))+1, ...form }])
    }
    closeModal()
  }

  function confirmDelete() {
    setWarehouses(prev => prev.filter(w => w.id !== editItem.id))
    closeModal()
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Warehouses</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Inventory</a></li>
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

      {/* Warehouse cards */}
      <div className="row g-4">
        {warehouses.map(w => {
          const usePct  = Math.round((w.used / w.capacity) * 100)
          const ti      = TYPE_ICON[w.type] || TYPE_ICON['General']
          const barColor = usePct > 85 ? '#f06548' : usePct > 60 ? '#f7b84b' : '#0ab39c'
          return (
            <div className="col-md-6 col-xl-3" key={w.id}>
              <div className="card h-100">
                <div className="card-body">
                  {/* Header */}
                  <div className="d-flex align-items-start justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width:44, height:44, background:`${ti.color}1a` }}>
                        <i className={`${ti.icon} fs-20`} style={{ color:ti.color }}></i>
                      </div>
                      <div>
                        <div className="fw-bold" style={{ fontSize:15 }}>{w.name}</div>
                        <div className="text-muted" style={{ fontSize:11 }}><code>{w.code}</code> · {w.type}</div>
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
                      <span className="fw-bold" style={{ color: barColor }}>{usePct}%</span>
                    </div>
                    <div className="progress" style={{ height:8, borderRadius:4 }}>
                      <div className="progress-bar" style={{ width:`${usePct}%`, background: barColor, borderRadius:4 }}></div>
                    </div>
                    <div className="d-flex justify-content-between mt-1" style={{ fontSize:11, color:'#adb5bd' }}>
                      <span>{w.used} used</span>
                      <span>{w.capacity} total</span>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="d-flex flex-column gap-1 mb-3" style={{ fontSize:13 }}>
                    <div className="d-flex gap-2"><i className="ri-user-line text-muted"></i><span>{w.manager}</span></div>
                    <div className="d-flex gap-2"><i className="ri-map-pin-line text-muted"></i><span style={{ color:'#6c757d' }}>{w.location}</span></div>
                    <div className="d-flex gap-2"><i className="ri-phone-line text-muted"></i><span>{w.phone}</span></div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between border-top pt-3">
                    <div className="text-center">
                      <div className="fw-bold fs-16">{w.products}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>Products</div>
                    </div>
                    <div className="text-center">
                      <div className="fw-bold fs-16">{w.capacity - w.used}</div>
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
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Warehouse Name <span className="text-danger">*</span></label>
                        <input className="form-control" required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g., Cold Room" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-medium">Code</label>
                        <input className="form-control bg-light" readOnly value={form.code} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-medium">Type</label>
                        <select className="form-select" value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                          {['General','Cold Chain','Dry Goods','Farm'].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Manager</label>
                        <input className="form-control" value={form.manager} onChange={e => setForm(f=>({...f,manager:e.target.value}))} placeholder="Manager name" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Phone</label>
                        <input className="form-control" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="08xxxxxxxxx" />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Location / Address</label>
                        <input className="form-control" value={form.location} onChange={e => setForm(f=>({...f,location:e.target.value}))} placeholder="e.g., Bems HQ, Block A" />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Capacity (units)</label>
                        <input type="number" className="form-control" min="0" value={form.capacity} onChange={e => setForm(f=>({...f,capacity:Number(e.target.value)}))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Current Used</label>
                        <input type="number" className="form-control" min="0" value={form.used} onChange={e => setForm(f=>({...f,used:Number(e.target.value)}))} />
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
                      <button type="submit" className="btn btn-primary w-100">{editItem ? 'Save Changes' : 'Add Warehouse'}</button>
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
                <h6 className="mb-1">Delete Warehouse?</h6>
                <p className="text-muted mb-4" style={{ fontSize:13 }}>{editItem?.name}</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger w-100" onClick={confirmDelete}>Delete</button>
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
