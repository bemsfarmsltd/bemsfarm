import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

function daysToExpiry(expDate) {
  if (!expDate) return null
  const d = new Date(expDate)
  const today = new Date(); today.setHours(0,0,0,0)
  return Math.ceil((d - today) / 86400000)
}

function getBatchStatus(status, expDate, qty) {
  if (status === 'recalled') return 'recalled'
  if (qty === 0) return 'exhausted'
  const days = daysToExpiry(expDate)
  if (days !== null && days < 0)  return 'expired'
  if (days !== null && days <= 7) return 'expiring_soon'
  return 'active'
}

const STATUS_CFG = {
  active:        { label:'Active Fresh',   cls:'bg-success-subtle text-success', icon:'ri-checkbox-circle-line' },
  expiring_soon: { label:'Expiring Soon',  cls:'bg-warning-subtle text-warning', icon:'ri-alarm-warning-line'   },
  expired:       { label:'Expired',        cls:'bg-danger-subtle text-danger',   icon:'ri-close-circle-line'    },
  exhausted:     { label:'Exhausted',      cls:'bg-secondary-subtle text-secondary', icon:'ri-archive-line'     },
  recalled:      { label:'Recalled',       cls:'bg-danger-subtle text-danger',   icon:'ri-forbid-line'          },
}

export default function BatchManagement() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [warehouses, setWarehouses] = useState([])
  const [search, setSearch]   = useState('')
  const [activeBatch, setActiveBatch] = useState(null)
  const [activeItemModal, setActiveItemModal] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [saving, setSaving] = useState(false)

  // Item Action states
  const [actionQuantity, setActionQuantity] = useState(1)
  const [actionTargetWarehouse, setActionTargetWarehouse] = useState('')
  const [actionReason, setActionReason] = useState('')
  const [actionNotes, setActionNotes] = useState('')
  const [editForm, setEditForm] = useState({ expiry_date: '', quantity: 0, notes: '' })

  useEffect(() => {
    async function loadWarehouses() {
      try {
        const whRes = await api.get('/admin/inventory/warehouses').catch(() => ({ data: { warehouses: [] } }))
        if (whRes.data?.warehouses) setWarehouses(whRes.data.warehouses)
      } catch (err) {
        console.error('Error loading warehouses:', err)
      }
    }
    loadWarehouses()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/batches')
      const batchData = res.data.batches || []
      setBatches(batchData)
      // If we are currently viewing an active batch, refresh its reference
      if (activeBatch) {
        const updatedActive = batchData.find(b => b.batch_no === activeBatch.batch_no)
        if (updatedActive) setActiveBatch(updatedActive)
      }
    } catch {
      toast.error('Failed to load batches')
    } finally {
      setLoading(false)
    }
  }, [activeBatch])

  useEffect(() => { load() }, [])

  // Filter batches for top-level view
  const filteredBatches = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return batches
    return batches.filter(b => 
      b.batch_no.toLowerCase().includes(q) ||
      (b.warehouse_name || '').toLowerCase().includes(q) ||
      b.items.some(i => (i.product_name || '').toLowerCase().includes(q))
    )
  }, [batches, search])

  // Filter items within the active batch
  const filteredItemsInActiveBatch = useMemo(() => {
    if (!activeBatch) return []
    const q = search.toLowerCase().trim()
    if (!q) return activeBatch.items || []
    return (activeBatch.items || []).filter(i => 
      (i.product_name || '').toLowerCase().includes(q) ||
      (i.sku || '').toLowerCase().includes(q)
    )
  }, [activeBatch, search])

  // Overall system KPI stats
  const totalStats = useMemo(() => {
    let totalBatches = batches.length
    let totalItems = 0
    let totalUnits = 0
    let totalValuation = 0
    let nearExpiryBatches = 0

    batches.forEach(b => {
      totalItems += b.item_count || 0
      totalUnits += b.total_units || 0
      totalValuation += b.total_valuation || 0
      if (b.min_days_until_expiry !== null && b.min_days_until_expiry <= 7 && b.min_days_until_expiry >= 0) {
        nearExpiryBatches++
      }
    })

    return { totalBatches, totalItems, totalUnits, totalValuation, nearExpiryBatches }
  }, [batches])

  function openItemAction(item) {
    setSelectedItem(item)
    setActionQuantity(item.quantity > 0 ? Math.min(item.quantity, 10) : 0)
    setActionTargetWarehouse(warehouses.find(w => w.name !== item.warehouse_name)?.id || '')
    setActionReason('Damaged / spoiled produce write-off')
    setActionNotes('')
    setEditForm({
      expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
      quantity: item.quantity,
      notes: item.notes || '',
    })
    setActiveItemModal('action')
  }

  function closeItemModal() {
    setActiveItemModal(null)
    setSelectedItem(null)
    setSaving(false)
  }

  async function handleRouteKitchen() {
    if (!selectedItem) return
    if (actionQuantity <= 0 || actionQuantity > selectedItem.quantity) {
      toast.error(`Please select a valid quantity (1 to ${selectedItem.quantity})`)
      return
    }
    setSaving(true)
    try {
      const res = await api.post(`/admin/inventory/batches/${selectedItem.batch_item_id || selectedItem.id}/route-kitchen`, {
        quantity: actionQuantity,
        notes: actionNotes || 'Routed to Chef Bems Kitchen',
      })
      toast.success(res.data.message || 'Dispatched to Chef Bems Kitchen')
      closeItemModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch to kitchen')
    } finally {
      setSaving(false)
    }
  }

  async function handleTransferWarehouse() {
    if (!selectedItem) return
    if (!actionTargetWarehouse) {
      toast.error('Please select destination warehouse')
      return
    }
    if (actionQuantity <= 0 || actionQuantity > selectedItem.quantity) {
      toast.error(`Please select a valid transfer quantity (1 to ${selectedItem.quantity})`)
      return
    }
    setSaving(true)
    try {
      const res = await api.post(`/admin/inventory/batches/${selectedItem.batch_item_id || selectedItem.id}/transfer`, {
        target_warehouse_id: parseInt(actionTargetWarehouse),
        quantity: actionQuantity,
        notes: actionNotes,
      })
      toast.success(res.data.message || 'Stock transferred')
      closeItemModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer stock')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogDamage() {
    if (!selectedItem) return
    if (actionQuantity <= 0 || actionQuantity > selectedItem.quantity) {
      toast.error(`Please select a valid quantity (1 to ${selectedItem.quantity})`)
      return
    }
    setSaving(true)
    try {
      const res = await api.post(`/admin/inventory/batches/${selectedItem.batch_item_id || selectedItem.id}/log-damage`, {
        quantity: actionQuantity,
        reason: actionReason || 'Damaged / expired produce',
        notes: actionNotes,
      })
      toast.success(res.data.message || 'Stock written-off to loss registry')
      closeItemModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log damage')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!selectedItem) return
    setSaving(true)
    try {
      await api.patch(`/admin/inventory/batches/${selectedItem.batch_item_id || selectedItem.id}`, {
        quantity: parseInt(editForm.quantity) || 0,
        expiry_date: editForm.expiry_date || undefined,
        notes: editForm.notes,
      })
      toast.success('Produce lot updated')
      closeItemModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update produce lot')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-fluid py-3">
      {/* Page Header */}
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <i className="ri-archive-stack-fill text-success"></i>
            {activeBatch ? (
              <span>
                <span className="text-muted fw-normal">Batch:</span> {activeBatch.batch_no}
              </span>
            ) : (
              'Produce Consignments & Batches'
            )}
          </h4>
          <p className="text-muted mb-0 fs-13">
            {activeBatch ? (
              <span>Viewing all produce goods registered in this intake consignment. Click any item to dispatch to kitchen or transfer.</span>
            ) : (
              'All uploaded produce lots and restock intakes grouped by batch consignment. Click any batch to view its items manifest.'
            )}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {activeBatch ? (
            <button 
              className="btn btn-outline-dark btn-sm rounded-pill px-3 shadow-sm"
              onClick={() => { setActiveBatch(null); setSearch(''); }}
            >
              <i className="ri-arrow-left-line me-1"></i> Back to All Batches
            </button>
          ) : (
            <Link to="/inventory/stock-in" className="btn btn-success btn-sm rounded-pill px-3 shadow-sm">
              <i className="ri-add-circle-line me-1"></i> Restock Products
            </Link>
          )}
          <button 
            className="btn btn-light btn-sm rounded-pill px-3 border shadow-sm"
            onClick={load}
            title="Refresh batches"
          >
            <i className="ri-refresh-line me-1"></i> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Visible on top-level batches view) */}
      {!activeBatch && (
        <div className="row g-3 mb-4">
          {[
            {
              label: 'Total Batch Consignments',
              value: totalStats.totalBatches,
              glow: 'bg-card-glow-indigo',
              iconBg: '#EEF2FF',
              iconColor: '#4F46E5',
              icon: 'ri-archive-stack-line',
              subLeft: 'Intake Sessions',
              subRight: `${totalStats.totalBatches} Lots`
            },
            {
              label: 'Total Produce Goods',
              value: totalStats.totalItems,
              glow: 'bg-card-glow-green',
              iconBg: '#ECFDF5',
              iconColor: '#059669',
              icon: 'ri-plant-line',
              subLeft: 'Distinct Products',
              subRight: `${totalStats.totalItems} Items`
            },
            {
              label: 'Total Stock Volume',
              value: totalStats.totalUnits.toLocaleString(),
              glow: 'bg-card-glow-teal',
              iconBg: '#F0FDFA',
              iconColor: '#0D9488',
              icon: 'ri-inbox-archive-line',
              subLeft: 'Units In-Storage',
              subRight: 'Fresh Stock'
            },
            {
              label: 'Batch Inventory Value',
              value: `₦${totalStats.totalValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              glow: 'bg-card-glow-amber',
              iconBg: '#FEF3C7',
              iconColor: '#D97706',
              icon: 'ri-money-dollar-circle-line',
              subLeft: 'Consignment Value',
              subRight: 'Active Valuation'
            },
          ].map(c => (
            <div className="col-12 col-sm-6 col-xl-3" key={c.label}>
              <div className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow}`}>
                <div className="card-body p-3.5">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2" title={c.label}>
                      {c.label}
                    </span>
                    <span className="kpi-icon-pill p-2 rounded-circle" style={{ background: c.iconBg, color: c.iconColor }}>
                      <i className={`${c.icon} fs-18`}></i>
                    </span>
                  </div>
                  <div className="fs-22 fw-bolder text-dark mb-1 font-display">
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
      )}

      {/* ── VIEW 1: BATCH CONSIGNMENTS LIST ──────────────────────────────── */}
      {!activeBatch && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap gap-3 justify-content-between align-items-center">
            <div className="position-relative">
              <input 
                className="form-control ps-5 rounded-pill" 
                placeholder="Search batch no, warehouse, or produce inside…" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ minWidth: 320, fontSize: 13 }} 
              />
              <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
            </div>
            <div className="text-muted fs-13">
              Click any batch to inspect all goods inside
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table align-middle text-nowrap mb-0 table-hover">
                <thead className="bg-light">
                  <tr className="text-uppercase fs-11 text-muted border-bottom">
                    <th className="ps-4">Batch Consignment ID</th>
                    <th>Intake Date</th>
                    <th>Produce Diversity</th>
                    <th>Total Batch Volume</th>
                    <th>Consignment Value</th>
                    <th>Warehouse Location</th>
                    <th>Earliest Expiry</th>
                    <th className="text-end pe-4">Batch Goods Manifest</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                        Loading produce batches…
                      </td>
                    </tr>
                  )}
                  {!loading && filteredBatches.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-5">
                        <div className="py-4">
                          <div className="avatar-lg mx-auto mb-3 bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: 64, height: 64 }}>
                            <i className="ri-archive-stack-line fs-1 text-muted"></i>
                          </div>
                          <h6 className="fw-bold mb-1">No Batches Found</h6>
                          <p className="text-muted mx-auto mb-4" style={{ maxWidth: 480, fontSize: 13 }}>
                            Whenever products are uploaded or restocked, they are automatically organized into batch consignments.
                          </p>
                          <Link to="/inventory/stock-in" className="btn btn-success btn-sm rounded-pill px-3 shadow-sm">
                            <i className="ri-add-circle-line me-1"></i> Restock Products
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading && filteredBatches.map(b => {
                    const days = b.min_days_until_expiry
                    const daysColor = days === null ? '#adb5bd' : days < 0 ? '#f06548' : days <= 7 ? '#f7b84b' : '#0ab39c'
                    
                    return (
                      <tr 
                        key={b.batch_no} 
                        className="cursor-pointer" 
                        onClick={() => { setActiveBatch(b); setSearch(''); }}
                      >
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-success-subtle text-success font-monospace fs-13 border border-success-subtle px-2.5 py-1.5 rounded">
                              <i className="ri-archive-line me-1"></i> {b.batch_no}
                            </span>
                          </div>
                        </td>
                        <td className="text-dark fs-13 fw-semibold">
                          {b.intake_date ? new Date(b.intake_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border px-2.5 py-1 fs-12">
                            <i className="ri-plant-line text-success me-1"></i>
                            <strong>{b.item_count}</strong> Produce Items
                          </span>
                        </td>
                        <td>
                          <span className="fw-bold text-dark fs-13">
                            {b.total_units.toLocaleString()} <span className="text-muted fs-12 font-normal">units</span>
                          </span>
                        </td>
                        <td>
                          <span className="fw-bold text-success fs-13 font-monospace">
                            ₦{b.total_valuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-muted border px-2.5 py-1 fs-12">
                            <i className="ri-store-2-line me-1"></i> {b.warehouse_name || 'Main Central Coldroom'}
                          </span>
                        </td>
                        <td>
                          <span className="fw-bold fs-12 px-2 py-0.5 rounded" style={{ color: daysColor, background: `${daysColor}15` }}>
                            {days === null ? '—' : days < 0 ? `${Math.abs(days)}d expired` : `${days} days left`}
                          </span>
                        </td>
                        <td className="text-end pe-4" onClick={e => e.stopPropagation()}>
                          <button 
                            className="btn btn-sm btn-primary rounded-pill px-3 fs-12 d-inline-flex align-items-center gap-1.5 shadow-sm"
                            onClick={() => { setActiveBatch(b); setSearch(''); }}
                          >
                            <span>View All Goods ({b.item_count})</span>
                            <i className="ri-arrow-right-line"></i>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: DRILLDOWN INTO ALL GOODS IN ACTIVE BATCH ─────────────── */}
      {activeBatch && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          {/* Active Batch Summary Banner */}
          <div className="card-header bg-dark text-white p-3.5 d-flex flex-wrap gap-3 justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
                <i className="ri-archive-stack-fill fs-22"></i>
              </div>
              <div>
                <h5 className="fw-bold text-white mb-0 d-flex align-items-center gap-2">
                  <span>Batch: {activeBatch.batch_no}</span>
                  <span className="badge bg-success text-white fs-11 fw-normal px-2 py-0.5 rounded-pill">
                    {activeBatch.item_count} Produce Items
                  </span>
                </h5>
                <span className="text-white-50 fs-12">
                  Intake Date: {activeBatch.intake_date ? new Date(activeBatch.intake_date).toLocaleDateString() : '—'} • Location: {activeBatch.warehouse_name} • Total Stock: {activeBatch.total_units} Units
                </span>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <div className="position-relative">
                <input 
                  className="form-control form-control-sm bg-white bg-opacity-15 text-white border-0 ps-4 rounded-pill placeholder-white-50" 
                  placeholder="Search goods in this batch…" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  style={{ minWidth: 240, fontSize: 12, color: '#fff' }} 
                />
                <i className="ri-search-line position-absolute top-50 start-0 ms-2.5 translate-middle-y text-white-50 fs-12"></i>
              </div>
              <button 
                className="btn btn-outline-light btn-sm rounded-pill px-3"
                onClick={() => { setActiveBatch(null); setSearch(''); }}
              >
                <i className="ri-close-line me-1"></i> Close Batch
              </button>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table align-middle text-nowrap mb-0 table-hover">
                <thead className="bg-light">
                  <tr className="text-uppercase fs-11 text-muted border-bottom">
                    <th className="ps-4">Produce &amp; Goods Item</th>
                    <th>SKU / ID</th>
                    <th>Intake Date</th>
                    <th>Expiry Date</th>
                    <th>Shelf Life Countdown</th>
                    <th>Batch Qty</th>
                    <th>Unit Retail Price</th>
                    <th>Status</th>
                    <th className="text-end pe-4">Item Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItemsInActiveBatch.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-5 text-muted">
                        No goods match "{search}" in this batch.
                      </td>
                    </tr>
                  )}
                  {filteredItemsInActiveBatch.map(item => {
                    const sc = STATUS_CFG[item.status] || STATUS_CFG.active
                    const days = daysToExpiry(item.expiry_date)
                    const daysColor = days === null ? '#adb5bd' : days < 0 ? '#f06548' : days <= 7 ? '#f7b84b' : '#0ab39c'

                    return (
                      <tr key={item.id || item.batch_item_id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-2.5">
                            {item.product_image ? (
                              <img src={item.product_image} alt="" className="rounded-circle object-fit-cover border shadow-sm" style={{ width: 36, height: 36 }} />
                            ) : (
                              <div className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center border" style={{ width: 36, height: 36 }}>
                                <i className="ri-plant-line fs-16"></i>
                              </div>
                            )}
                            <div>
                              <div className="fw-bold text-dark fs-13">{item.product_name}</div>
                              <div className="text-muted fs-11">Product #{item.product_id}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-primary font-monospace fs-12 border">
                            {item.sku}
                          </span>
                        </td>
                        <td className="text-muted fs-12">
                          {item.received_at || item.created_at ? new Date(item.received_at || item.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="text-dark fs-12 fw-medium">
                          {item.expiry_date ? item.expiry_date.slice(0, 10) : '—'}
                        </td>
                        <td>
                          <span className="fw-bold fs-12 px-2.5 py-1 rounded" style={{ color: daysColor, background: `${daysColor}15` }}>
                            {days === null ? '—' : days < 0 ? `${Math.abs(days)}d expired` : days === 0 ? 'Expires Today!' : `${days} days left`}
                          </span>
                        </td>
                        <td>
                          <span className="fw-bold text-dark fs-13">{item.quantity}</span> <span className="text-muted fs-11">units</span>
                        </td>
                        <td>
                          <span className="fw-semibold text-dark font-monospace fs-13">
                            ₦{Number(item.product_price || 0).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${sc.cls} px-2.5 py-1 fs-12`}>
                            <i className={`${sc.icon} me-1`}></i>{sc.label}
                          </span>
                        </td>
                        <td className="text-end pe-4">
                          <button 
                            className="btn btn-sm btn-soft-success d-inline-flex align-items-center gap-1 px-2.5 py-1 rounded-pill fs-12"
                            onClick={() => openItemAction(item)}
                            title="Route to kitchen, transfer, or write off"
                          >
                            <i className="ri-flashlight-line"></i> Actions
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-light border-top d-flex justify-content-between align-items-center text-muted fs-13">
              <span>Showing <strong>{filteredItemsInActiveBatch.length}</strong> of <strong>{activeBatch.items?.length || 0}</strong> goods in Batch <strong>{activeBatch.batch_no}</strong></span>
              <button 
                className="btn btn-link btn-sm text-decoration-none text-muted p-0"
                onClick={() => { setActiveBatch(null); setSearch(''); }}
              >
                ← Return to Batch Consignments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCE ITEM ACTIONS MODAL ───────────────────────────────────── */}
      {activeItemModal === 'action' && selectedItem && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                <div className="modal-header bg-dark text-white p-3.5">
                  <div className="d-flex align-items-center gap-2.5">
                    <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                      <i className="ri-plant-fill fs-18"></i>
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold text-white mb-0">{selectedItem.product_name}</h5>
                      <span className="text-white-50 fs-12">Batch: {selectedItem.batch_no} • In-Batch Qty: {selectedItem.quantity} Units</span>
                    </div>
                  </div>
                  <button className="btn-close btn-close-white" onClick={closeItemModal}></button>
                </div>

                <div className="modal-body p-4">
                  {/* Produce Overview Card */}
                  <div className="card bg-light border-0 rounded-3 p-3 mb-4">
                    <div className="row g-3">
                      <div className="col-6 col-md-3">
                        <div className="text-muted fs-11 text-uppercase fw-semibold">SKU / Code</div>
                        <div className="fw-bold fs-13 text-dark">{selectedItem.sku}</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="text-muted fs-11 text-uppercase fw-semibold">In Batch</div>
                        <div className="fw-bold fs-14 text-success">{selectedItem.quantity} Units</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="text-muted fs-11 text-uppercase fw-semibold">Intake Date</div>
                        <div className="fw-bold fs-13 text-dark">{selectedItem.received_at ? new Date(selectedItem.received_at).toLocaleDateString() : '—'}</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="text-muted fs-11 text-uppercase fw-semibold">Expiry Countdown</div>
                        <div className="fw-bold fs-13 text-danger">{selectedItem.expiry_date ? selectedItem.expiry_date.slice(0, 10) : '—'}</div>
                      </div>
                    </div>
                  </div>

                  <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <i className="ri-flashlight-fill text-warning"></i> Quick Operations for this Produce Item
                  </h6>

                  <div className="row g-3">
                    {/* Action 1: Route to Chef Bems Kitchen */}
                    <div className="col-md-6">
                      <div className="card h-100 border border-success-subtle rounded-3 p-3 bg-success-subtle bg-opacity-25">
                        <div className="d-flex align-items-center gap-2 mb-2 text-success fw-bold">
                          <i className="ri-restaurant-2-line fs-18"></i>
                          <span>Route to Chef Bems Kitchen</span>
                        </div>
                        <p className="text-muted fs-12 mb-3">
                          Dispatch units of this produce item to the kitchen for food preparation.
                        </p>
                        <div className="mb-2">
                          <label className="form-label fs-12 fw-semibold mb-1">Dispatch Quantity (Max {selectedItem.quantity})</label>
                          <input 
                            type="number" 
                            className="form-control form-control-sm" 
                            min="1" 
                            max={selectedItem.quantity} 
                            value={actionQuantity} 
                            onChange={e => setActionQuantity(Math.max(1, Math.min(selectedItem.quantity, parseInt(e.target.value) || 1)))} 
                          />
                        </div>
                        <div className="mb-3">
                          <input 
                            type="text" 
                            className="form-control form-control-sm" 
                            placeholder="Optional prep note (e.g. Daily lunch stew)" 
                            value={actionNotes} 
                            onChange={e => setActionNotes(e.target.value)} 
                          />
                        </div>
                        <button 
                          className="btn btn-success btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-1.5 rounded-pill"
                          onClick={handleRouteKitchen}
                          disabled={saving || selectedItem.quantity <= 0}
                        >
                          <i className="ri-send-plane-fill"></i> Dispatch {actionQuantity} to Kitchen
                        </button>
                      </div>
                    </div>

                    {/* Action 2: Inter-Warehouse Transfer */}
                    <div className="col-md-6">
                      <div className="card h-100 border border-primary-subtle rounded-3 p-3 bg-primary-subtle bg-opacity-25">
                        <div className="d-flex align-items-center gap-2 mb-2 text-primary fw-bold">
                          <i className="ri-exchange-line fs-18"></i>
                          <span>Inter-Warehouse Transfer</span>
                        </div>
                        <p className="text-muted fs-12 mb-3">
                          Move units of this produce item to another warehouse or cold room.
                        </p>
                        <div className="mb-2">
                          <label className="form-label fs-12 fw-semibold mb-1">Destination Warehouse</label>
                          <select 
                            className="form-select form-select-sm" 
                            value={actionTargetWarehouse} 
                            onChange={e => setActionTargetWarehouse(e.target.value)}
                          >
                            <option value="">— Select Warehouse —</option>
                            {warehouses.map(w => (
                              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                            ))}
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label fs-12 fw-semibold mb-1">Transfer Units</label>
                          <input 
                            type="number" 
                            className="form-control form-control-sm" 
                            min="1" 
                            max={selectedItem.quantity} 
                            value={actionQuantity} 
                            onChange={e => setActionQuantity(Math.max(1, Math.min(selectedItem.quantity, parseInt(e.target.value) || 1)))} 
                          />
                        </div>
                        <button 
                          className="btn btn-primary btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-1.5 rounded-pill"
                          onClick={handleTransferWarehouse}
                          disabled={saving || selectedItem.quantity <= 0 || !actionTargetWarehouse}
                        >
                          <i className="ri-truck-line"></i> Transfer Stock
                        </button>
                      </div>
                    </div>

                    {/* Action 3: Write-Off Damaged / Expired */}
                    <div className="col-12">
                      <div className="card border border-danger-subtle rounded-3 p-3 bg-danger-subtle bg-opacity-20">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                          <div className="d-flex align-items-center gap-2 text-danger fw-bold">
                            <i className="ri-close-circle-line fs-18"></i>
                            <span>Write-Off Damaged or Expired Stock</span>
                          </div>
                          <span className="fs-12 text-muted">Transfers directly to Lost &amp; Damaged Ledger</span>
                        </div>
                        <div className="row g-2 align-items-center">
                          <div className="col-md-5">
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              placeholder="Reason (e.g. Transit bruise, overripe)" 
                              value={actionReason} 
                              onChange={e => setActionReason(e.target.value)} 
                            />
                          </div>
                          <div className="col-md-3">
                            <input 
                              type="number" 
                              className="form-control form-control-sm" 
                              placeholder="Write-off Qty" 
                              min="1" 
                              max={selectedItem.quantity} 
                              value={actionQuantity} 
                              onChange={e => setActionQuantity(Math.max(1, Math.min(selectedItem.quantity, parseInt(e.target.value) || 1)))} 
                            />
                          </div>
                          <div className="col-md-4">
                            <button 
                              className="btn btn-danger btn-sm w-100 fw-semibold rounded-pill"
                              onClick={handleLogDamage}
                              disabled={saving || selectedItem.quantity <= 0}
                            >
                              <i className="ri-delete-bin-7-line me-1"></i> Write-Off {actionQuantity} Units
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action 4: Edit Produce Lot Expiry */}
                    <div className="col-12">
                      <div className="card border rounded-3 p-3 bg-white">
                        <div className="fw-bold text-dark fs-13 mb-2">
                          <i className="ri-edit-line me-1 text-primary"></i> Adjust Produce Expiry Date &amp; Notes
                        </div>
                        <form onSubmit={handleSaveEdit} className="row g-2 align-items-end">
                          <div className="col-md-4">
                            <label className="form-label fs-11 text-muted mb-0">Expiry Date</label>
                            <input 
                              type="date" 
                              className="form-control form-control-sm" 
                              value={editForm.expiry_date} 
                              onChange={e => setEditForm(f => ({ ...f, expiry_date: e.target.value }))} 
                            />
                          </div>
                          <div className="col-md-5">
                            <label className="form-label fs-11 text-muted mb-0">Lot Notes</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={editForm.notes} 
                              onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} 
                              placeholder="Harvest batch notes…" 
                            />
                          </div>
                          <div className="col-md-3">
                            <button type="submit" className="btn btn-dark btn-sm w-100 rounded-pill" disabled={saving}>
                              Save Info
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={closeItemModal}>Close</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={closeItemModal}></div>
        </>
      )}
    </div>
  )
}
