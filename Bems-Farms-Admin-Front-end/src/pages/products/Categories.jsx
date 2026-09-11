import { useState, useMemo, useEffect } from 'react'
import ImportModal from '../../components/ImportModal'

// ── Code generator ───────────────────────────────────────────────────────────
function genCode(name, existingCodes = []) {
  const slug = name.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X')
  let n = 1, code
  do { code = `CAT-${slug}-${String(n).padStart(3,'0')}`; n++ }
  while (existingCodes.includes(code))
  return code
}

// ── Import field definitions ─────────────────────────────────────────────────
const IMPORT_FIELDS = [
  { key:'name',   label:'Name',   required:true  },
  { key:'status', label:'Status', required:false },
]

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK = [
  { id:1, name:'Meals',          code:'CAT-MEA-001', products:12, status:'active',   created:'2026-01-15' },
  { id:2, name:'Seafood',        code:'CAT-SEA-001', products:8,  status:'active',   created:'2026-01-15' },
  { id:3, name:'Meat',           code:'CAT-MEA-002', products:6,  status:'active',   created:'2026-01-15' },
  { id:4, name:'Grains & Carbs', code:'CAT-GRA-001', products:15, status:'active',   created:'2026-01-15' },
  { id:5, name:'Vegetables',     code:'CAT-VEG-001', products:9,  status:'active',   created:'2026-01-20' },
  { id:6, name:'Dairy & Eggs',   code:'CAT-DAI-001', products:7,  status:'active',   created:'2026-01-20' },
  { id:7, name:'Beverages',      code:'CAT-BEV-001', products:5,  status:'inactive', created:'2026-02-01' },
  { id:8, name:'Fresh Farm',     code:'CAT-FRE-001', products:11, status:'active',   created:'2026-02-01' },
]

const BLANK = { name:'', code:'', products:0, status:'active' }

export default function Categories() {
  const [items, setItems]           = useState(MOCK)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal] = useState(null)  // 'form' | 'delete' | 'import'
  const [editItem, setEditItem]     = useState(null)
  const [form, setForm]             = useState(BLANK)

  // Auto-generate code when name changes (add only)
  useEffect(() => {
    if (!editItem && form.name.trim()) {
      setForm(f => ({ ...f, code: genCode(f.name, items.map(i => i.code)) }))
    }
  }, [form.name])  // eslint-disable-line

  const filtered = useMemo(() => items.filter(r => {
    const m = r.name.toLowerCase().includes(search.toLowerCase()) ||
              r.code.toLowerCase().includes(search.toLowerCase())
    return m && (filterStatus === 'all' || r.status === filterStatus)
  }), [items, search, filterStatus])

  const stats = useMemo(() => ({
    total:    items.length,
    active:   items.filter(i => i.status === 'active').length,
    inactive: items.filter(i => i.status === 'inactive').length,
    products: items.reduce((s, i) => s + i.products, 0),
  }), [items])

  // ── Modal helpers ────────────────────────────────────────────────────────
  function openAdd() {
    setEditItem(null)
    setForm({ ...BLANK, code: genCode('', items.map(i => i.code)) })
    setActiveModal('form')
  }
  function openEdit(r) { setEditItem(r); setForm({ ...r }); setActiveModal('form') }
  function openDelete(r) { setEditItem(r); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setEditItem(null) }

  function saveForm(e) {
    e.preventDefault()
    if (editItem) {
      setItems(prev => prev.map(r => r.id === editItem.id ? { ...r, ...form } : r))
    } else {
      const code = form.code || genCode(form.name, items.map(i => i.code))
      setItems(prev => [...prev, { id: Math.max(...prev.map(r=>r.id))+1, ...form, code, products:0, created: new Date().toISOString().slice(0,10) }])
    }
    closeModal()
  }

  function confirmDelete() {
    setItems(prev => prev.filter(r => r.id !== editItem.id))
    closeModal()
  }

  function handleImport(rows) {
    const existingCodes = items.map(i => i.code)
    const today = new Date().toISOString().slice(0,10)
    const newItems = rows.map((row, idx) => {
      const name = row.name?.trim() || `Imported ${idx + 1}`
      const code = genCode(name, [...existingCodes])
      existingCodes.push(code)
      return {
        id: Math.max(...items.map(i=>i.id), 0) + idx + 1,
        name, code,
        products: 0,
        status: row.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active',
        created: today,
      }
    })
    setItems(prev => [...prev, ...newItems])
    closeModal()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Categories</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Products</a></li>
          <li className="breadcrumb-item active">Categories</li>
        </ul>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Categories', value:stats.total,    icon:'ri-price-tag-3-line',     color:'#405189', filter:'all'      },
          { label:'Active',           value:stats.active,   icon:'ri-checkbox-circle-line', color:'#0ab39c', filter:'active'   },
          { label:'Inactive',         value:stats.inactive, icon:'ri-close-circle-line',    color:'#f7b84b', filter:'inactive' },
          { label:'Total Products',   value:stats.products, icon:'ri-box-3-line',           color:'#299cdb', filter:'all'      },
        ].map(c => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card mb-0 cursor-pointer" style={{ borderLeft:`3px solid ${c.color}` }}
              onClick={() => setFilterStatus(c.filter)}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width:44, height:44, background:`${c.color}1a` }}>
                  <i className={`${c.icon} fs-20`} style={{ color:c.color }}></i>
                </div>
                <div>
                  <div className="fw-bold fs-18" style={{ color:c.color }}>{c.value}</div>
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
            <input className="form-control ps-9" placeholder="Search categories…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ minWidth:220 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <select className="form-select" style={{ width:'auto' }} value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="btn btn-outline-secondary d-flex align-items-center gap-1"
              onClick={() => setActiveModal('import')}>
              <i className="ri-upload-cloud-2-line"></i> Import
            </button>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openAdd}>
              <i className="ri-add-line"></i> Add Category
            </button>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Category</th>
                  <th className="fw-medium text-muted">Code</th>
                  <th className="fw-medium text-muted">Products</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Created</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-5 text-muted">
                    <i className="ri-price-tag-3-line fs-2 d-block mb-2"></i>No categories found
                  </td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td className="fw-medium">{r.name}</td>
                    <td><code style={{ fontSize:12 }}>{r.code}</code></td>
                    <td>
                      <span className="badge bg-light text-dark border">{r.products}</span>
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'active' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                        {r.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-muted">{r.created}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-soft-primary px-2" onClick={() => openEdit(r)}>
                          <i className="ri-pencil-line"></i>
                        </button>
                        <button className="btn btn-sm btn-soft-danger px-2" onClick={() => openDelete(r)}>
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-muted" style={{ fontSize:13 }}>
            Showing {filtered.length} of {items.length} categories
          </div>
        </div>
      </div>

      {/* ── ADD / EDIT MODAL ─────────────────────────────────── */}
      {activeModal === 'form' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h6 className="modal-title">{editItem ? 'Edit Category' : 'Add New Category'}</h6>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveForm}>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Category Name <span className="text-danger">*</span></label>
                      <input className="form-control" required value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g., Fresh Produce" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">
                        Code <span className="text-muted fw-normal">(auto-generated)</span>
                      </label>
                      <input className="form-control bg-light" readOnly value={form.code}
                        placeholder="Type name above to generate code" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Status</label>
                      <select className="form-select" value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100">
                        {editItem ? 'Save Changes' : 'Add Category'}
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

      {/* ── DELETE MODAL ─────────────────────────────────────── */}
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
                <h6 className="mb-1">Delete Category?</h6>
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

      {/* ── IMPORT MODAL ─────────────────────────────────────── */}
      {activeModal === 'import' && (
        <ImportModal
          entityName="Categories"
          fields={IMPORT_FIELDS}
          onImport={handleImport}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
