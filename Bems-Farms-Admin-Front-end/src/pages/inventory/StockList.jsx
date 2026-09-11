import { useState, useMemo } from 'react'

const MOCK_STOCK = [
  { id:1, name:'Basmati Rice (5kg)', sku:'GRN-RIC-001', category:'Grains & Carbs', unit:'bag',   stock:120, reorder:20, cost:4800,  price:6500,  status:'in_stock',    updated:'2026-06-25' },
  { id:2, name:'Fresh Tomatoes',      sku:'VEG-TOM-001', category:'Vegetables',    unit:'kg',    stock:8,   reorder:15, cost:800,   price:1200,  status:'low_stock',   updated:'2026-06-26' },
  { id:3, name:'Palm Oil (25L)',       sku:'OIL-PLM-001', category:'Grains & Carbs',unit:'crate', stock:0,   reorder:5,  cost:18000, price:24000, status:'out_of_stock', updated:'2026-06-20' },
  { id:4, name:'Catfish (Smoked)',     sku:'SEA-CAT-001', category:'Seafood',       unit:'kg',    stock:35,  reorder:10, cost:3200,  price:4500,  status:'in_stock',    updated:'2026-06-24' },
  { id:5, name:'Fresh Pepper (Tatashe)',sku:'VEG-PEP-001',category:'Vegetables',   unit:'kg',    stock:6,   reorder:10, cost:700,   price:1100,  status:'low_stock',   updated:'2026-06-26' },
  { id:6, name:'Chicken (Whole)',      sku:'MEA-CHK-001', category:'Meat',          unit:'kg',    stock:52,  reorder:20, cost:2800,  price:3800,  status:'in_stock',    updated:'2026-06-25' },
  { id:7, name:'Fresh Yam (Tuber)',    sku:'GRN-YAM-001', category:'Grains & Carbs',unit:'tuber', stock:90,  reorder:30, cost:1200,  price:1800,  status:'in_stock',    updated:'2026-06-23' },
  { id:8, name:'Cassava Flour (2kg)', sku:'GRN-CAS-001', category:'Grains & Carbs',unit:'pack',  stock:14,  reorder:15, cost:1100,  price:1600,  status:'low_stock',   updated:'2026-06-22' },
  { id:9, name:'Fresh Milk (1L)',      sku:'DAI-MLK-001', category:'Dairy & Eggs',  unit:'bottle',stock:40,  reorder:12, cost:900,   price:1400,  status:'in_stock',    updated:'2026-06-26' },
  { id:10,'name':'Plantain (Bunch)',   sku:'FRM-PLT-001', category:'Fresh Farm',    unit:'bunch', stock:25,  reorder:10, cost:1500,  price:2200,  status:'in_stock',    updated:'2026-06-24' },
]

const STATUS_CONFIG = {
  in_stock:    { label:'In Stock',     cls:'bg-success-subtle text-success' },
  low_stock:   { label:'Low Stock',    cls:'bg-warning-subtle text-warning' },
  out_of_stock:{ label:'Out of Stock', cls:'bg-danger-subtle text-danger'   },
}

export default function StockList() {
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [stock, setStock]       = useState(MOCK_STOCK)
  const [form, setForm]         = useState({ name:'', sku:'', category:'', unit:'', stock:0, reorder:10, cost:0, price:0 })

  const filtered = useMemo(() => stock.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.sku.toLowerCase().includes(search.toLowerCase()) ||
                        s.category.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || s.status === filterStatus
    return matchSearch && matchStatus
  }), [stock, search, filterStatus])

  const totals = useMemo(() => ({
    all:      stock.length,
    in_stock: stock.filter(s => s.status === 'in_stock').length,
    low:      stock.filter(s => s.status === 'low_stock').length,
    out:      stock.filter(s => s.status === 'out_of_stock').length,
  }), [stock])

  function openAdd() {
    setEditItem(null)
    setForm({ name:'', sku:'', category:'', unit:'piece', stock:0, reorder:10, cost:0, price:0 })
    setActiveModal('add')
  }
  function openEdit(item) {
    setEditItem(item)
    setForm({ name:item.name, sku:item.sku, category:item.category, unit:item.unit, stock:item.stock, reorder:item.reorder, cost:item.cost, price:item.price })
    setActiveModal('add')
  }
  function openDelete(item) { setEditItem(item); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setEditItem(null) }

  function computeStatus(qty, reorder) {
    if (qty === 0) return 'out_of_stock'
    if (qty <= reorder) return 'low_stock'
    return 'in_stock'
  }

  function saveForm(e) {
    e.preventDefault()
    const status = computeStatus(Number(form.stock), Number(form.reorder))
    const today  = new Date().toISOString().slice(0,10)
    if (editItem) {
      setStock(prev => prev.map(s => s.id === editItem.id ? { ...s, ...form, status, updated: today } : s))
    } else {
      const newId = Math.max(...stock.map(s => s.id)) + 1
      setStock(prev => [...prev, { id:newId, ...form, status, updated: today }])
    }
    closeModal()
  }

  function confirmDelete() {
    setStock(prev => prev.filter(s => s.id !== editItem.id))
    closeModal()
  }

  return (
    <div className="container-fluid">
      {/* Breadcrumb */}
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Stock List</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Inventory</a></li>
          <li className="breadcrumb-item active">Stock List</li>
        </ul>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total SKUs',    value: totals.all,      icon:'ri-box-3-line',           color:'#405189', filter:'all' },
          { label:'In Stock',      value: totals.in_stock, icon:'ri-checkbox-circle-line',  color:'#0ab39c', filter:'in_stock' },
          { label:'Low Stock',     value: totals.low,      icon:'ri-alert-line',            color:'#f7b84b', filter:'low_stock' },
          { label:'Out of Stock',  value: totals.out,      icon:'ri-close-circle-line',     color:'#f06548', filter:'out_of_stock' },
        ].map(c => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card mb-0 cursor-pointer" style={{ borderLeft:`3px solid ${c.color}` }} onClick={() => setFilterStatus(c.filter)}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width:44, height:44, background:`${c.color}1a` }}>
                  <i className={`${c.icon} fs-20`} style={{ color:c.color }}></i>
                </div>
                <div>
                  <div className="fs-22 fw-bold" style={{ color:c.color }}>{c.value}</div>
                  <div className="text-muted" style={{ fontSize:12 }}>{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div className="position-relative">
            <input type="text" className="form-control ps-9" placeholder="Search product, SKU…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth:220 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <select className="form-select" style={{ width:'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openAdd}>
              <i className="ri-add-line"></i> Add Product
            </button>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th><input type="checkbox" className="form-check-input" /></th>
                  <th className="fw-medium text-muted">Product</th>
                  <th className="fw-medium text-muted">SKU</th>
                  <th className="fw-medium text-muted">Category</th>
                  <th className="fw-medium text-muted">Stock</th>
                  <th className="fw-medium text-muted">Reorder</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Cost (₦)</th>
                  <th className="fw-medium text-muted">Price (₦)</th>
                  <th className="fw-medium text-muted">Updated</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-5 text-muted">
                    <i className="ri-box-3-line fs-2 d-block mb-2"></i>No products found
                  </td></tr>
                )}
                {filtered.map(s => {
                  const sc = STATUS_CONFIG[s.status]
                  return (
                    <tr key={s.id}>
                      <td><input type="checkbox" className="form-check-input" /></td>
                      <td>
                        <div className="fw-medium">{s.name}</div>
                        <div className="text-muted" style={{ fontSize:11 }}>{s.unit}</div>
                      </td>
                      <td><code style={{ fontSize:12 }}>{s.sku}</code></td>
                      <td><span className="badge bg-light text-dark border">{s.category}</span></td>
                      <td>
                        <span className="fw-bold" style={{ color: s.status === 'out_of_stock' ? '#f06548' : s.status === 'low_stock' ? '#f7b84b' : '#0ab39c' }}>
                          {s.stock}
                        </span>
                      </td>
                      <td className="text-muted">{s.reorder}</td>
                      <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                      <td>₦{s.cost.toLocaleString()}</td>
                      <td>₦{s.price.toLocaleString()}</td>
                      <td className="text-muted">{s.updated}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-soft-primary p-1 px-2" onClick={() => openEdit(s)} title="Edit"><i className="ri-pencil-line"></i></button>
                          <button className="btn btn-sm btn-soft-danger p-1 px-2" onClick={() => openDelete(s)} title="Delete"><i className="ri-delete-bin-line"></i></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-muted" style={{ fontSize:13 }}>Showing {filtered.length} of {stock.length} products</div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {activeModal === 'add' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h6 className="modal-title">{editItem ? 'Edit Product Stock' : 'Add Product to Stock'}</h6>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveForm}>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-medium">Product Name <span className="text-danger">*</span></label>
                        <input className="form-control" required value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} placeholder="e.g., Basmati Rice 5kg" />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">SKU <span className="text-danger">*</span></label>
                        <input className="form-control" required value={form.sku} onChange={e => setForm(f => ({...f, sku:e.target.value}))} placeholder="e.g., GRN-RIC-001" />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Category</label>
                        <select className="form-select" value={form.category} onChange={e => setForm(f => ({...f, category:e.target.value}))}>
                          <option value="">— Select —</option>
                          {['Grains & Carbs','Vegetables','Meat','Seafood','Dairy & Eggs','Beverages','Fresh Farm','Meals'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Unit</label>
                        <select className="form-select" value={form.unit} onChange={e => setForm(f => ({...f, unit:e.target.value}))}>
                          {['kg','g','litre','ml','pack','piece','bunch','bag','crate','tuber','bottle','dozen','carton'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-medium">Stock Qty <span className="text-danger">*</span></label>
                        <input type="number" className="form-control" min="0" required value={form.stock} onChange={e => setForm(f => ({...f, stock:e.target.value}))} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-medium">Reorder Level</label>
                        <input type="number" className="form-control" min="0" value={form.reorder} onChange={e => setForm(f => ({...f, reorder:e.target.value}))} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-medium">Cost (₦)</label>
                        <input type="number" className="form-control" min="0" value={form.cost} onChange={e => setForm(f => ({...f, cost:e.target.value}))} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-medium">Selling Price (₦)</label>
                        <input type="number" className="form-control" min="0" value={form.price} onChange={e => setForm(f => ({...f, price:e.target.value}))} />
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100">{editItem ? 'Save Changes' : 'Add to Stock'}</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={closeModal}></div>
        </>
      )}

      {/* Delete Modal */}
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
                <h6 className="mb-1">Remove from Stock?</h6>
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
