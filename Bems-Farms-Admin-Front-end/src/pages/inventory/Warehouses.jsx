import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import PremiumModal from '../../components/ui/PremiumModal'

function formatNaira(amount) {
  const n = parseFloat(amount) || 0
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)

  // Warehouse Detail & Inventory View State
  const [selectedWarehouse, setSelectedWarehouse] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [warehouseProducts, setWarehouseProducts] = useState([])
  const [warehouseMovements, setWarehouseMovements] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [activeTab, setActiveTab] = useState('products') // 'products' | 'movements'

  const [form, setForm] = useState({
    name: '',
    code: '',
    location: '',
    manager: '',
    capacity: 0,
    status: 'active',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [wRes, sRes] = await Promise.all([
        api.get('/admin/inventory/warehouses'),
        api.get('/admin/staff').catch(() => ({ data: { staff: [] } })),
      ])
      setWarehouses(wRes.data.warehouses || [])
      if (sRes.data?.staff) setStaffList(sRes.data.staff)
    } catch {
      toast.error('Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totals = useMemo(() => {
    return {
      total: warehouses.length,
      active: warehouses.filter((w) => w.status === 'active').length,
      products: warehouses.reduce((s, w) => s + Number(w.product_count || 0), 0),
      units: warehouses.reduce((s, w) => s + Number(w.total_units || 0), 0),
      capacity: warehouses.reduce((s, w) => s + Number(w.capacity || 0), 0),
      value: warehouses.reduce((s, w) => s + Number(w.total_value || 0), 0),
    }
  }, [warehouses])

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', code: '', location: '', manager: '', capacity: 2000, status: 'active' })
    setActiveModal('form')
  }

  function openEdit(w, e) {
    e?.stopPropagation()
    setEditItem(w)
    setForm({
      name: w.name || '',
      code: w.code || '',
      location: w.location || '',
      manager: w.manager || '',
      capacity: w.capacity || 0,
      status: w.status || 'active',
    })
    setActiveModal('form')
  }

  function openDelete(w, e) {
    e?.stopPropagation()
    setEditItem(w)
    setActiveModal('delete')
  }

  function closeModal() {
    setActiveModal(null)
    setEditItem(null)
  }

  async function handleOpenDetail(w) {
    setSelectedWarehouse(w)
    setDetailLoading(true)
    setProductSearch('')
    setActiveTab('products')
    try {
      const res = await api.get(`/admin/inventory/warehouses/${w.id}/products`)
      setWarehouseProducts(res.data.products || [])
      setWarehouseMovements(res.data.recent_movements || [])
    } catch (err) {
      console.error('Failed to load warehouse products:', err)
      toast.error('Failed to load warehouse product inventory')
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredWarehouseProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return warehouseProducts
    return warehouseProducts.filter((p) => {
      return (
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      )
    })
  }, [warehouseProducts, productSearch])

  async function saveForm(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Warehouse name is required')
    setSaving(true)
    try {
      if (editItem) {
        await api.patch(`/admin/inventory/warehouses/${editItem.id}`, form)
        toast.success('Warehouse updated successfully')
      } else {
        await api.post('/admin/inventory/warehouses', form)
        toast.success('Warehouse added successfully')
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
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Warehouses & Storage Facilities</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/inventory/stock">Inventory</Link></li>
            <li className="breadcrumb-item active">Warehouses</li>
          </ul>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm" onClick={openAdd}>
            <i className="ri-add-line"></i> + Add Warehouse
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Facilities',
            value: totals.total,
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-building-2-line',
            subLeft: 'Storage Locations',
            subRight: `${totals.active} Active`
          },
          {
            label: 'Catalog Stored',
            value: totals.products,
            glow: 'bg-card-glow-blue',
            iconBg: '#EFF6FF',
            iconColor: '#2563EB',
            icon: 'ri-box-3-line',
            subLeft: 'Distinct Products',
            subRight: 'In Inventory'
          },
          {
            label: 'Total Physical Units',
            value: totals.units.toLocaleString(),
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-stack-line',
            subLeft: 'Capacity Utilization',
            subRight: `${totals.capacity.toLocaleString()} Max Cap`
          },
          {
            label: 'Total Facility Value',
            value: formatNaira(totals.value),
            glow: 'bg-card-glow-amber',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            icon: 'ri-money-dollar-circle-line',
            subLeft: 'Asset Valuation',
            subRight: 'Across All Hubs'
          },
        ].map((c) => (
          <div className="col-12 col-sm-6 col-xl-3" key={c.label}>
            <div className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow}`}>
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
                  {c.value}
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

      {loading && (
        <div className="text-center text-muted py-5">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
          Loading warehouses & storage data…
        </div>
      )}

      {!loading && warehouses.length === 0 && (
        <div className="card border-0 shadow-sm p-5 text-center text-muted">
          <i className="ri-building-2-line fs-1 d-block mb-2 text-secondary opacity-50"></i>
          <h5>No Warehouses Registered</h5>
          <p className="fs-sm mb-3">Click "+ Add Warehouse" to create your first storage location.</p>
          <div>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <i className="ri-add-line me-1"></i> Add Warehouse
            </button>
          </div>
        </div>
      )}

      {/* Warehouse Cards Grid */}
      <div className="row g-4">
        {warehouses.map((w) => {
          const capacity = Number(w.capacity || 0)
          const used = Number(w.total_units || 0)
          const usePct = capacity > 0 ? Math.round((used / capacity) * 100) : 0
          const barColor = usePct > 85 ? '#f06548' : usePct > 60 ? '#f7b84b' : '#0ab39c'
          const freeSpace = capacity > 0 ? Math.max(0, capacity - used) : '—'

          return (
            <div className="col-md-6 col-xl-3" key={w.id}>
              <div
                className="card h-100 shadow-sm border-0 warehouse-card"
                style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
                onClick={() => handleOpenDetail(w)}
              >
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    {/* Header */}
                    <div className="d-flex align-items-start justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 42, height: 42, background: '#40518915' }}
                        >
                          <i className="ri-store-2-line fs-20 text-primary"></i>
                        </div>
                        <div>
                          <div className="fw-bold text-dark fs-15">{w.name}</div>
                          <div className="text-muted fs-11">
                            {w.code ? <span className="font-monospace badge bg-light text-secondary border py-0">{w.code}</span> : '—'}
                          </div>
                        </div>
                      </div>
                      <span className={`badge ${w.status === 'active' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                        {w.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Capacity bar */}
                    <div className="mb-3 bg-light p-2 rounded-2 border">
                      <div className="d-flex justify-content-between mb-1" style={{ fontSize: 12 }}>
                        <span className="text-muted fw-medium">Capacity Utilization</span>
                        <span className="fw-bold" style={{ color: barColor }}>
                          {capacity > 0 ? `${usePct}%` : 'No limit set'}
                        </span>
                      </div>
                      <div className="progress" style={{ height: 7, borderRadius: 4 }}>
                        <div
                          className="progress-bar"
                          style={{ width: `${Math.min(usePct, 100)}%`, background: barColor, borderRadius: 4 }}
                        ></div>
                      </div>
                      <div className="d-flex justify-content-between mt-1 text-muted" style={{ fontSize: 11 }}>
                        <span className="fw-semibold text-dark">{used.toLocaleString()} units stored</span>
                        <span>{capacity > 0 ? `${capacity.toLocaleString()} max cap` : 'Flexible'}</span>
                      </div>
                    </div>

                    {/* Info rows */}
                    <div className="d-flex flex-column gap-1 mb-3 fs-13">
                      <div className="d-flex align-items-center gap-2 text-dark">
                        <i className="ri-user-line text-muted"></i>
                        <span className="fw-medium">{w.manager || 'No manager assigned'}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 text-muted fs-12">
                        <i className="ri-map-pin-line text-muted"></i>
                        <span className="text-truncate">{w.location || 'Central Facility'}</span>
                      </div>
                      {w.total_value > 0 && (
                        <div className="d-flex align-items-center gap-2 text-success fs-12 mt-1">
                          <i className="ri-money-dollar-circle-line"></i>
                          <span>Valuation: <strong>{formatNaira(w.total_value)}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer stats & Actions */}
                  <div className="border-top pt-3 mt-2">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-bold text-dark fs-15">{w.product_count || 0}</div>
                        <div className="text-muted fs-11">Products</div>
                      </div>
                      <div>
                        <div className="fw-bold text-dark fs-15">{typeof freeSpace === 'number' ? freeSpace.toLocaleString() : freeSpace}</div>
                        <div className="text-muted fs-11">Free Space</div>
                      </div>
                      <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary px-2"
                          onClick={() => handleOpenDetail(w)}
                          title="View Warehouse Inventory & Products"
                        >
                          <i className="ri-box-3-line me-1"></i> View
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light text-dark px-2"
                          onClick={(e) => openEdit(w, e)}
                          title="Edit Warehouse"
                        >
                          <i className="ri-pencil-line"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light text-danger px-2"
                          onClick={(e) => openDelete(w, e)}
                          title="Deactivate Warehouse"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Modal: Warehouse Products & Inventory Detail ────────────────── */}
      {selectedWarehouse && (
        <PremiumModal
          open={Boolean(selectedWarehouse)}
          onClose={() => setSelectedWarehouse(null)}
          title={`${selectedWarehouse.name} (${selectedWarehouse.code || 'WH'})`}
          description={`Location: ${selectedWarehouse.location || 'Central Facility'} • Manager: ${selectedWarehouse.manager || 'Unassigned'}`}
          icon="ri-store-2-line"
          tone="brand"
          size="xl"
          footer={(
            <button type="button" className="btn btn-light px-4" onClick={() => setSelectedWarehouse(null)}>
              Close
            </button>
          )}
        >
          <div>
            {/* Quick Metrics Bar */}
            <div className="row g-2 mb-3">
              <div className="col-4">
                <div className="p-2 bg-light rounded-3 text-center border">
                  <span className="text-muted fs-11 d-block">Products Assigned</span>
                  <span className="fw-bold fs-15 text-dark">{warehouseProducts.length}</span>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 bg-light rounded-3 text-center border">
                  <span className="text-muted fs-11 d-block">Total Units in Stock</span>
                  <span className="fw-bold fs-15 text-success">
                    {warehouseProducts.reduce((s, p) => s + Number(p.stock || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 bg-light rounded-3 text-center border">
                  <span className="text-muted fs-11 d-block">Warehouse Stock Value</span>
                  <span className="fw-bold fs-15 text-primary">
                    {formatNaira(
                      warehouseProducts.reduce(
                        (s, p) => s + Number(p.stock || 0) * Number(p.unit_price || 0),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 border-bottom pb-2">
              <ul className="nav nav-pills gap-1">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link btn-sm py-1 px-3 ${activeTab === 'products' ? 'active' : ''}`}
                    onClick={() => setActiveTab('products')}
                  >
                    <i className="ri-box-3-line me-1"></i> Stored Products ({warehouseProducts.length})
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link btn-sm py-1 px-3 ${activeTab === 'movements' ? 'active' : ''}`}
                    onClick={() => setActiveTab('movements')}
                  >
                    <i className="ri-history-line me-1"></i> Recent Movements ({warehouseMovements.length})
                  </button>
                </li>
              </ul>

              {activeTab === 'products' && (
                <div className="input-group input-group-sm" style={{ width: '250px' }}>
                  <span className="input-group-text bg-white text-muted">
                    <i className="ri-search-line"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search stored products…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  {productSearch && (
                    <button type="button" className="btn btn-light" onClick={() => setProductSearch('')}>
                      &times;
                    </button>
                  )}
                </div>
              )}
            </div>

            {detailLoading ? (
              <div className="text-center py-5 text-muted">
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                Loading warehouse inventory breakdown…
              </div>
            ) : activeTab === 'products' ? (
              filteredWarehouseProducts.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="ri-inbox-line fs-2 d-block mb-1 text-secondary opacity-50"></i>
                  No products found for this query in {selectedWarehouse.name}.
                </div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '350px' }}>
                  <table className="table table-hover align-middle mb-0 fs-13">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>SKU / Barcode</th>
                        <th className="text-end">Unit Price</th>
                        <th className="text-end">Current Stock</th>
                        <th className="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWarehouseProducts.map((p) => {
                        const isLow = p.low_stock_threshold && p.stock <= p.low_stock_threshold
                        const isOut = p.stock === 0
                        return (
                          <tr key={p.id}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                {p.image_url ? (
                                  <img
                                    src={p.image_url}
                                    alt={p.name}
                                    className="rounded-1 object-fit-cover border flex-shrink-0"
                                    style={{ width: '32px', height: '32px' }}
                                  />
                                ) : (
                                  <div
                                    className="rounded-1 bg-light d-flex align-items-center justify-content-center text-muted border flex-shrink-0"
                                    style={{ width: '32px', height: '32px' }}
                                  >
                                    <i className="ri-box-3-line"></i>
                                  </div>
                                )}
                                <div className="fw-semibold text-dark">{p.name}</div>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border">{p.category || 'General'}</span>
                            </td>
                            <td>
                              <div>
                                <span className="font-monospace text-dark">{p.sku || '—'}</span>
                                {p.barcode && (
                                  <div className="font-monospace fs-11 text-success">
                                    <i className="ri-barcode-line me-1"></i>{p.barcode}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="text-end fw-semibold text-dark">{formatNaira(p.unit_price)}</td>
                            <td className="text-end fw-bold text-dark">{p.stock}</td>
                            <td className="text-center">
                              {isOut ? (
                                <span className="badge bg-danger-subtle text-danger">Out of Stock</span>
                              ) : isLow ? (
                                <span className="badge bg-warning-subtle text-warning">Low Stock</span>
                              ) : (
                                <span className="badge bg-success-subtle text-success">In Stock</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              // Movements Tab
              warehouseMovements.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="ri-history-line fs-2 d-block mb-1 text-secondary opacity-50"></i>
                  No recent stock movements recorded specifically for this facility.
                </div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '350px' }}>
                  <table className="table table-hover align-middle mb-0 fs-13">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Date & Time</th>
                        <th>Product</th>
                        <th>Type</th>
                        <th className="text-center">Quantity Delta</th>
                        <th>Reason / Notes</th>
                        <th>Processed By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseMovements.map((m) => {
                        const diff = m.after_qty !== undefined && m.before_qty !== undefined
                          ? m.after_qty - m.before_qty
                          : m.quantity
                        return (
                          <tr key={m.id}>
                            <td className="text-muted fs-12">
                              {m.created_at ? new Date(m.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                            </td>
                            <td>
                              <span className="fw-semibold text-dark">{m.product_name || 'Product'}</span>
                              <span className="text-muted fs-11 d-block font-monospace">{m.sku || '—'}</span>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border text-capitalize">{m.type || 'Adjustment'}</span>
                            </td>
                            <td className="text-center">
                              {diff > 0 ? (
                                <span className="badge bg-success-subtle text-success">+{diff}</span>
                              ) : diff < 0 ? (
                                <span className="badge bg-danger-subtle text-danger">{diff}</span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary">0</span>
                              )}
                            </td>
                            <td>
                              <span className="fw-medium text-dark">{m.reason || 'Count Update'}</span>
                              {m.reference && <small className="text-muted d-block">Ref: {m.reference}</small>}
                            </td>
                            <td><small className="text-muted">{m.created_by_name || 'Admin'}</small></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </PremiumModal>
      )}

      {/* Form Modal */}
      {activeModal === 'form' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 shadow border-0">
                <div className="modal-header border-0 pb-0">
                  <div>
                    <h6 className="modal-title fw-bold">{editItem ? 'Edit Warehouse Location' : 'Add New Warehouse Location'}</h6>
                    <p className="text-muted fs-xs mb-0">Configure storage capacity, manager, and operational facility details.</p>
                  </div>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveForm}>
                    <div className="row g-3">
                      <div className="col-md-8">
                        <label className="form-label fw-semibold fs-sm">Warehouse Name <span className="text-danger">*</span></label>
                        <input
                          className="form-control"
                          required
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="e.g., Cold Storage Hub"
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold fs-sm">Facility Code</label>
                        <input
                          className="form-control font-monospace"
                          value={form.code}
                          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                          placeholder="e.g., WH-COLD"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold fs-sm">Assigned Facility Manager</label>
                        {staffList.length > 0 ? (
                          <select
                            className="form-select"
                            value={form.manager}
                            onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))}
                          >
                            <option value="">— Select Staff Manager —</option>
                            {staffList.map((s) => (
                              <option key={s.id} value={s.name}>
                                {s.name} ({s.role || 'Staff'})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="form-control"
                            value={form.manager}
                            onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))}
                            placeholder="Manager full name"
                          />
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold fs-sm">Storage Capacity (Units)</label>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          value={form.capacity}
                          onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                          placeholder="e.g., 3000"
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold fs-sm">Location / Physical Address</label>
                        <input
                          className="form-control"
                          value={form.location}
                          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                          placeholder="e.g., 14 Farm Road, Epe, Lagos"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold fs-sm">Operational Status</label>
                        <select
                          className="form-select"
                          value={form.status}
                          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                        >
                          <option value="active">Active & Operational</option>
                          <option value="inactive">Inactive / Under Maintenance</option>
                        </select>
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                      <button type="button" className="btn btn-light px-4" onClick={closeModal}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                        {saving ? 'Saving…' : editItem ? 'Save Changes' : 'Create Warehouse'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {activeModal === 'delete' && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content rounded-4 shadow border-0 p-4 text-center">
              <div className="d-flex justify-content-center mb-3">
                <div
                  className="rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center"
                  style={{ width: 56, height: 56 }}
                >
                  <i className="ri-delete-bin-line text-danger fs-22"></i>
                </div>
              </div>
              <h6 className="fw-bold mb-1">Deactivate Warehouse?</h6>
              <p className="text-muted mb-4 fs-13">{editItem?.name}</p>
              <div className="d-flex gap-2">
                <button className="btn btn-light w-100" onClick={closeModal}>
                  Cancel
                </button>
                <button className="btn btn-danger w-100" onClick={confirmDelete}>
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
