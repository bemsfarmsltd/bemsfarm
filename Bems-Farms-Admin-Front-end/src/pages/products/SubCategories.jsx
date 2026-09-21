import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import ImportModal from '../../components/ImportModal'

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Meals' }, { id: 2, name: 'Seafood' }, { id: 3, name: 'Meat' },
  { id: 4, name: 'Grains & Carbs' }, { id: 5, name: 'Vegetables' },
  { id: 6, name: 'Dairy & Eggs' }, { id: 7, name: 'Beverages' }, { id: 8, name: 'Fresh Farm' },
]

function genSubCode(name, categoryName, existingCodes = []) {
  const catSlug = (categoryName || 'CAT').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X')
  const nameSlug = (name || 'SUB').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X')
  let n = 1, code
  do {
    code = `${catSlug}-${nameSlug}-${String(n).padStart(3, '0')}`
    n++
  } while (existingCodes.includes(code))
  return code
}

const IMPORT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'parent', label: 'Parent Category', required: true },
  { key: 'status', label: 'Status', required: false },
]

const BLANK = { name: '', category_id: '', code: '', description: '', status: 'active', showPOS: true }

export default function SubCategories() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [activeModal, setActiveModal] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  // ── Load live subcategories and categories ─────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [subRes, catRes] = await Promise.allSettled([
        api.get('/admin/products/subcategories'),
        api.get('/categories')
      ])

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value.data?.categories || catRes.value.data)) {
        const cats = catRes.value.data?.categories || catRes.value.data
        if (cats.length > 0) setCategories(cats)
      }

      if (subRes.status === 'fulfilled' && subRes.value.data?.subcategories) {
        setItems(subRes.value.data.subcategories.map(s => ({
          id: s.id,
          name: s.name,
          category_id: s.category_id,
          parent: s.category_name || (categories.find(c => c.id === s.category_id)?.name) || 'General',
          code: s.code || `SUB-${s.id}`,
          status: s.status || 'active',
          product_count: parseInt(s.product_count || 0),
          created: s.created_at ? s.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          showPOS: true
        })))
      }
    } catch (err) {
      console.error('Error fetching subcategories:', err)
      toast.error('Failed to load subcategories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-generate code when name or parent changes (add mode)
  useEffect(() => {
    if (!editItem && form.name.trim() && form.category_id) {
      const selectedCat = categories.find(c => String(c.id) === String(form.category_id))
      setForm(f => ({
        ...f,
        code: genSubCode(f.name, selectedCat?.name || 'CAT', items.map(i => i.code))
      }))
    }
  }, [form.name, form.category_id, categories, editItem, items])

  const filtered = useMemo(() => items.filter(r => {
    const m = (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
              (r.code || '').toLowerCase().includes(search.toLowerCase()) ||
              (r.parent || '').toLowerCase().includes(search.toLowerCase())
    return m &&
      (filterStatus === 'all' || r.status === filterStatus) &&
      (filterCat === 'all' || String(r.category_id) === String(filterCat) || r.parent === filterCat)
  }), [items, search, filterStatus, filterCat])

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.status === 'active').length,
    inactive: items.filter(i => i.status === 'inactive').length,
    onPOS: items.filter(i => i.showPOS).length,
  }), [items])

  // ── Modal helpers ────────────────────────────────────────────────────────
  function openAdd() {
    setEditItem(null)
    setForm({ ...BLANK, category_id: categories[0]?.id || '' })
    setActiveModal('form')
  }

  function openEdit(r) {
    setEditItem(r)
    setForm({
      name: r.name,
      category_id: r.category_id || (categories.find(c => c.name === r.parent)?.id) || '',
      code: r.code,
      description: r.description || '',
      status: r.status || 'active',
      showPOS: r.showPOS !== false
    })
    setActiveModal('form')
  }

  function openDelete(r) {
    setEditItem(r)
    setActiveModal('delete')
  }

  function closeModal() {
    setActiveModal(null)
    setEditItem(null)
  }

  async function saveForm(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Sub-category name is required')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category_id: form.category_id ? parseInt(form.category_id) : null,
        code: form.code,
        description: form.description,
        status: form.status
      }

      if (editItem) {
        await api.put(`/admin/products/subcategories/${editItem.id}`, payload)
        toast.success(`Sub-category "${form.name}" updated successfully!`)
      } else {
        await api.post('/admin/products/subcategories', payload)
        toast.success(`Sub-category "${form.name}" created successfully!`)
      }
      closeModal()
      fetchData()
    } catch (err) {
      console.error('Error saving subcategory:', err)
      toast.error(err.response?.data?.message || 'Failed to save sub-category')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!editItem) return
    setSaving(true)
    try {
      await api.delete(`/admin/products/subcategories/${editItem.id}`)
      toast.success('Sub-category deleted successfully')
      closeModal()
      fetchData()
    } catch (err) {
      console.error('Error deleting subcategory:', err)
      toast.error(err.response?.data?.message || 'Failed to delete sub-category')
    } finally {
      setSaving(false)
    }
  }

  async function handleImport(rows) {
    let importedCount = 0
    for (const row of rows) {
      const name = row.name?.trim()
      if (!name) continue
      const parentCat = categories.find(c => c.name.toLowerCase() === (row.parent || '').toLowerCase()) || categories[0]
      try {
        await api.post('/admin/products/subcategories', {
          name,
          category_id: parentCat?.id || null,
          status: row.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'
        })
        importedCount++
      } catch (err) {
        console.warn('Import skip:', err.message)
      }
    }
    toast.success(`Imported ${importedCount} sub-categories successfully`)
    closeModal()
    fetchData()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Sub-Categories</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/products">Products</Link></li>
          <li className="breadcrumb-item active">Sub-Categories</li>
        </ul>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Sub-Categories',
            value: stats.total,
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-price-tag-2-line',
            filter: 'all',
            subLeft: 'Taxonomy Breakdown',
            subRight: `${stats.total} Total`
          },
          {
            label: 'Active Groups',
            value: stats.active,
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-checkbox-circle-line',
            filter: 'active',
            subLeft: 'Live Online & Store',
            subRight: `${stats.active} Active`
          },
          {
            label: 'Inactive Groups',
            value: stats.inactive,
            glow: 'bg-card-glow-amber',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            icon: 'ri-close-circle-line',
            filter: 'inactive',
            subLeft: 'Hidden from Buyers',
            subRight: `${stats.inactive} Paused`
          },
          {
            label: 'Shown on POS',
            value: stats.onPOS,
            glow: 'bg-card-glow-blue',
            iconBg: '#EFF6FF',
            iconColor: '#2563EB',
            icon: 'ri-store-2-line',
            filter: 'all',
            subLeft: 'Terminal Quick Grid',
            subRight: `${stats.onPOS} Synced`
          },
        ].map(c => (
          <div className="col-12 col-sm-6 col-xl-3" key={c.label}>
            <div
              className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow} cursor-pointer`}
              style={{ cursor: 'pointer' }}
              onClick={() => setFilterStatus(c.filter)}
            >
              <div className="card-body p-3.5">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2" title={c.label}>
                    {c.label}
                  </span>
                  <span className="kpi-icon-pill" style={{ background: c.iconBg, color: c.iconColor }}>
                    <i className={`${c.icon} fs-18`}></i>
                  </span>
                </div>
                <div className="fs-24 fw-bolder text-dark mb-1 font-display">
                  {loading ? '…' : c.value}
                </div>
                <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                  <span className="text-truncate me-2">{c.subLeft}</span>
                  <strong className="text-dark font-monospace flex-shrink-0">{c.subRight}</strong>
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
              onChange={e => setSearch(e.target.value)} style={{ minWidth: 220 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <select className="form-select" style={{ width: 'auto' }} value={filterCat}
              onChange={e => setFilterCat(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={filterStatus}
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
                  <th className="fw-medium text-muted">Linked Products</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Created</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div> Loading sub-categories...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      <i className="ri-price-tag-2-line fs-2 d-block mb-2"></i>No sub-categories found
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id}>
                      <td className="fw-medium">{r.name}</td>
                      <td>
                        <span className="badge bg-light text-dark border">{r.parent}</span>
                      </td>
                      <td><code style={{ fontSize: 12 }}>{r.code}</code></td>
                      <td>
                        <span className="badge bg-info-subtle text-info">
                          {r.product_count || 0} product(s)
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${r.status === 'active' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                          {r.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-muted">{r.created}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-soft-primary px-2" onClick={() => openEdit(r)} title="Edit">
                            <i className="ri-pencil-line"></i>
                          </button>
                          <button className="btn btn-sm btn-soft-danger px-2" onClick={() => openDelete(r)} title="Delete">
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-muted" style={{ fontSize: 13 }}>
            Showing {filtered.length} of {items.length} sub-categories
          </div>
        </div>
      </div>

      {/* ── ADD / EDIT MODAL ─────────────────────────────────── */}
      {activeModal === 'form' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h6 className="modal-title">{editItem ? 'Edit Sub-Category' : 'Add New Sub-Category'}</h6>
                  <button className="btn-close" onClick={closeModal} disabled={saving}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveForm}>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Sub-Category Name <span className="text-danger">*</span></label>
                      <input className="form-control" required value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g., Leafy Greens" disabled={saving} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Parent Category <span className="text-danger">*</span></label>
                      <select className="form-select" required value={form.category_id}
                        onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} disabled={saving}>
                        <option value="">— Select Category —</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">
                        Code <span className="text-muted fw-normal">(auto-generated or custom)</span>
                      </label>
                      <input className="form-control bg-light" value={form.code}
                        onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                        placeholder="Select category and enter name" disabled={saving} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Status</label>
                      <select className="form-select" value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))} disabled={saving}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal} disabled={saving}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                        {saving ? (
                          <span><span className="spinner-border spinner-border-sm me-2"></span>Saving...</span>
                        ) : (
                          editItem ? 'Save Changes' : 'Add Sub-Category'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={closeModal}></div>
        </>
      )}

      {/* ── DELETE MODAL ─────────────────────────────────────── */}
      {activeModal === 'delete' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
              <div className="modal-content p-4 text-center">
                <div className="d-flex justify-content-center mb-3">
                  <div className="rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center" style={{ width: 56, height: 56 }}>
                    <i className="ri-delete-bin-line text-danger fs-22"></i>
                  </div>
                </div>
                <h6 className="mb-1">Delete Sub-Category?</h6>
                <p className="text-muted mb-4" style={{ fontSize: 13 }}>{editItem?.name}</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-light w-100" onClick={closeModal} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger w-100" onClick={confirmDelete} disabled={saving}>
                    {saving ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={closeModal}></div>
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
