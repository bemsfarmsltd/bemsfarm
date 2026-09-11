import { useState, useMemo, useEffect } from 'react'
import ImportModal from '../../components/ImportModal'

const CATEGORIES = [
  { id:1, name:'Meals' }, { id:2, name:'Seafood' }, { id:3, name:'Meat' },
  { id:4, name:'Grains & Carbs' }, { id:5, name:'Vegetables' },
  { id:6, name:'Dairy & Eggs' }, { id:7, name:'Beverages' }, { id:8, name:'Fresh Farm' },
]

function genSubCode(name, categoryName, existingCodes = []) {
  const catSlug = categoryName.replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,3).padEnd(3,'X')
  const nameSlug = name.trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,3).padEnd(3,'X')
  let n = 1, code
  do { code = `${catSlug}-${nameSlug}-${String(n).padStart(3,'0')}`; n++ }
  while (existingCodes.includes(code))
  return code
}

const IMPORT_FIELDS = [
  { key:'name',     label:'Name',            required:true  },
  { key:'parent',   label:'Parent Category', required:true  },
  { key:'status',   label:'Status',          required:false },
]

const MOCK = [
  { id:1,  name:'Grilled Fish',       parent:'Meals',         code:'MEA-GRI-001', status:'active',   created:'2026-01-15', showPOS:true  },
  { id:2,  name:'Rice Dishes',        parent:'Meals',         code:'MEA-RIC-001', status:'active',   created:'2026-01-15', showPOS:true  },
  { id:3,  name:'Fresh Catfish',      parent:'Seafood',       code:'SEA-CAT-001', status:'active',   created:'2026-01-16', showPOS:true  },
  { id:4,  name:'Smoked Fish',        parent:'Seafood',       code:'SEA-SMO-001', status:'active',   created:'2026-01-16', showPOS:false },
  { id:5,  name:'Chicken',            parent:'Meat',          code:'MEA-CHI-001', status:'active',   created:'2026-01-17', showPOS:true  },
  { id:6,  name:'Beef',               parent:'Meat',          code:'MEA-BEE-001', status:'active',   created:'2026-01-17', showPOS:true  },
  { id:7,  name:'Long Grain Rice',    parent:'Grains & Carbs',code:'GRA-LON-001', status:'active',   created:'2026-01-18', showPOS:true  },
  { id:8,  name:'Cassava Products',   parent:'Grains & Carbs',code:'GRA-CAS-001', status:'active',   created:'2026-01-18', showPOS:false },
  { id:9,  name:'Leafy Greens',       parent:'Vegetables',    code:'VEG-LEA-001', status:'active',   created:'2026-01-20', showPOS:true  },
  { id:10, name:'Root Vegetables',    parent:'Vegetables',    code:'VEG-ROO-001', status:'inactive', created:'2026-01-20', showPOS:false },
  { id:11, name:'Fresh Milk',         parent:'Dairy & Eggs',  code:'DAI-FRE-001', status:'active',   created:'2026-01-22', showPOS:true  },
  { id:12, name:'Farm Eggs',          parent:'Dairy & Eggs',  code:'DAI-FAR-001', status:'active',   created:'2026-01-22', showPOS:true  },
]

const BLANK = { name:'', parent:'', code:'', status:'active', showPOS:true }

export default function SubCategories() {
  const [items, setItems]           = useState(MOCK)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCat, setFilterCat]   = useState('all')
  const [activeModal, setActiveModal] = useState(null)
  const [editItem, setEditItem]     = useState(null)
  const [form, setForm]             = useState(BLANK)

  // Auto-generate code when name or parent changes (add mode)
  useEffect(() => {
    if (!editItem && form.name.trim() && form.parent) {
      setForm(f => ({ ...f, code: genSubCode(f.name, f.parent, items.map(i => i.code)) }))
    }
  }, [form.name, form.parent])  // eslint-disable-line

  const filtered = useMemo(() => items.filter(r => {
    const m = r.name.toLowerCase().includes(search.toLowerCase()) ||
              r.code.toLowerCase().includes(search.toLowerCase()) ||
              r.parent.toLowerCase().includes(search.toLowerCase())
    return m &&
      (filterStatus === 'all' || r.status === filterStatus) &&
      (filterCat === 'all' || r.parent === filterCat)
  }), [items, search, filterStatus, filterCat])

  const stats = useMemo(() => ({
    total:    items.length,
    active:   items.filter(i => i.status === 'active').length,
    inactive: items.filter(i => i.status === 'inactive').length,
    onPOS:    items.filter(i => i.showPOS).length,
  }), [items])

  // ── Modal helpers ────────────────────────────────────────────────────────
  function openAdd() {
    setEditItem(null)
    setForm({ ...BLANK })
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
      const code = form.code || genSubCode(form.name, form.parent, items.map(i => i.code))
      setItems(prev => [...prev, {
        id: Math.max(...prev.map(r=>r.id))+1, ...form, code,
        created: new Date().toISOString().slice(0,10)
      }])
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
      const name   = row.name?.trim() || `Imported ${idx + 1}`
      const parent = row.parent?.trim() || CATEGORIES[0].name
      const code   = genSubCode(name, parent, [...existingCodes])
      existingCodes.push(code)
      return {
        id: Math.max(...items.map(i=>i.id), 0) + idx + 1,
        name, parent, code, showPOS: true,
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
        <h6 className="flex-grow-1 mb-0">Sub-Categories</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Products</a></li>
          <li className="breadcrumb-item active">Sub-Categories</li>
        </ul>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Sub-Categories', value:stats.total,    icon:'ri-price-tag-2-line',     color:'#405189', filter:'all'      },
          { label:'Active',               value:stats.active,   icon:'ri-checkbox-circle-line', color:'#0ab39c', filter:'active'   },
          { label:'Inactive',             value:stats.inactive, icon:'ri-close-circle-line',    color:'#f7b84b', filter:'inactive' },
          { label:'Shown on POS',         value:stats.onPOS,    icon:'ri-store-2-line',         color:'#299cdb', filter:'all'      },
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

      {/* Table */}
      <div className="card">
        <div className="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div className="position-relative">
            <input className="form-control ps-9" placeholder="Search sub-categories…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ minWidth:220 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <select className="form-select" style={{ width:'auto' }} value={filterCat}
              onChange={e => setFilterCat(e.target.value)}>
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
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
              <i className="ri-add-line"></i> Add Sub-Category
            </button>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Sub-Category</th>
                  <th className="fw-medium text-muted">Parent Category</th>
                  <th className="fw-medium text-muted">Code</th>
                  <th className="fw-medium text-muted">POS</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Created</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-5 text-muted">
                    <i className="ri-price-tag-2-line fs-2 d-block mb-2"></i>No sub-categories found
                  </td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td className="fw-medium">{r.name}</td>
                    <td>
                      <span className="badge bg-light text-dark border">{r.parent}</span>
                    </td>
                    <td><code style={{ fontSize:12 }}>{r.code}</code></td>
                    <td>
                      {r.showPOS
                        ? <span className="badge bg-success-subtle text-success"><i className="ri-checkbox-circle-line me-1"></i>Yes</span>
                        : <span className="badge bg-light text-muted">No</span>}
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
            Showing {filtered.length} of {items.length} sub-categories
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
                  <h6 className="modal-title">{editItem ? 'Edit Sub-Category' : 'Add New Sub-Category'}</h6>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveForm}>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Sub-Category Name <span className="text-danger">*</span></label>
                      <input className="form-control" required value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g., Leafy Greens" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Parent Category <span className="text-danger">*</span></label>
                      <select className="form-select" required value={form.parent}
                        onChange={e => setForm(f => ({ ...f, parent: e.target.value }))}>
                        <option value="">— Select Category —</option>
                        {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">
                        Code <span className="text-muted fw-normal">(auto-generated)</span>
                      </label>
                      <input className="form-control bg-light" readOnly value={form.code}
                        placeholder="Select category and enter name" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Status</label>
                      <select className="form-select" value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="mb-3 d-flex align-items-center gap-3">
                      <label className="form-label mb-0 fw-medium">Show on POS</label>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={form.showPOS}
                          onChange={e => setForm(f => ({ ...f, showPOS: e.target.checked }))} />
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100">
                        {editItem ? 'Save Changes' : 'Add Sub-Category'}
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
                <h6 className="mb-1">Delete Sub-Category?</h6>
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
          entityName="Sub-Categories"
          fields={IMPORT_FIELDS}
          onImport={handleImport}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
