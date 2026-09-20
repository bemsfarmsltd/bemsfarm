import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

// ── Config ───────────────────────────────────────────────────────────────────

const RETURN_REASONS = [
  'Damaged on delivery',
  'Wrong item sent',
  'Quality below standard',
  'Spoiled / Already expired',
  'Item missing from order',
  'Customer changed mind',
  'Incorrect quantity',
  'Packaging damaged',
]

const REFUND_METHODS = ['Bank Transfer', 'Cash', 'Wallet Credit', 'Paystack']

const CONDITION_CFG = {
  resalable:    { label: 'Resalable',           cls: 'bg-success-subtle text-success',  dot: '#0ab39c', action: 'Return to stock' },
  damaged:      { label: 'Damaged / Spoiled',    cls: 'bg-danger-subtle text-danger',    dot: '#f06548', action: 'Write off to Lost & Damaged' },
  partial:      { label: 'Partially Good',      cls: 'bg-warning-subtle text-warning',  dot: '#f7b84b', action: 'Split — partial stock return' },
  pending_check:{ label: 'Awaiting Inspection', cls: 'bg-secondary-subtle text-secondary', dot: '#adb5bd', action: '' },
}

const STATUS_CFG = {
  pending:    { label: 'Pending',     cls: 'bg-warning-subtle text-warning' },
  inspecting: { label: 'Inspecting',  cls: 'bg-info-subtle text-info'       },
  approved:   { label: 'Approved',    cls: 'bg-primary-subtle text-primary' },
  refunded:   { label: 'Refunded',    cls: 'bg-success-subtle text-success' },
  rejected:   { label: 'Rejected',    cls: 'bg-danger-subtle text-danger'   },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Refunds() {
  const [records, setRecords]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [customers, setCustomers]       = useState([])
  const [products, setProducts]         = useState([])
  const [staffList, setStaffList]       = useState([])
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)   // 'log' | 'process' | 'view' | 'delete'
  const [selected, setSelected]         = useState(null)
  const [processTab, setProcessTab]     = useState('inspect')  // 'inspect' | 'refund'
  const [submitting, setSubmitting]     = useState(false)

  // Log Return form
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    ordRef: '',
    customerId: '',
    customer: '',
    phone: '',
    productId: '',
    product: '',
    qty: 1,
    unit: 'kg',
    unitPrice: 0,
    reason: RETURN_REASONS[0],
    notes: '',
    refundMethod: 'Bank Transfer',
  })

  // Process form (inspection + refund decision)
  const [procForm, setProcForm] = useState({
    condition: 'resalable',
    goodsAction: 'back_to_stock',
    resalableQty: 0,
    writeOffQty: 0,
    inspectionNotes: '',
    processedBy: '',
    refundAmount: 0,
    refundMethod: 'Bank Transfer',
    refundRef: '',
  })

  // ── Fetch Returns ────────────────────────────────────────────────────────────
  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true)
      const params = { limit: 100 }
      if (search.trim()) params.search = search.trim()
      if (filterStatus !== 'all') params.status = filterStatus

      const res = await api.get('/admin/orders/returns', { params })
      const rawList = res.data?.returns || []

      const normalized = rawList.map(r => {
        const qty = Number(r.quantity || 1)
        const price = parseFloat(r.product_price || 0)
        const total = parseFloat(r.refund_amount) || (qty * price)

        return {
          id: r.id,
          numericId: r.id,
          ref: r.refund_ref || `RTN-2026-${String(r.id).padStart(3, '0')}`,
          date: (r.created_at || '').slice(0, 10),
          ordRef: r.order_id || '',
          customerId: r.customer_id,
          customer: r.customer_name || 'Customer',
          phone: r.customer_phone || '',
          productId: r.product_id,
          product: r.product_name || `Product #${r.product_id || r.id}`,
          qty,
          unit: r.product_unit || 'kg',
          unitPrice: price || (qty > 0 ? (total / qty) : 0),
          totalValue: total,
          reason: r.reason || 'Damaged on delivery',
          notes: r.description || '',
          condition: r.goods_condition || (r.status === 'pending' ? 'pending_check' : 'resalable'),
          goodsAction: r.goods_action || '',
          resalableQty: r.resalable_qty || (r.status === 'refunded' ? qty : 0),
          writeOffQty: r.write_off_qty || 0,
          refundAmount: parseFloat(r.refund_amount) || total,
          refundMethod: r.refund_method || 'Bank Transfer',
          refundRef: r.refund_ref || '',
          status: r.status || 'pending',
          processedBy: r.processed_by_name || 'Staff',
          processedOn: (r.updated_at || r.created_at || '').slice(0, 10),
          inspectionNotes: r.inspection_notes || r.description || '',
        }
      })

      setRecords(normalized)
    } catch (err) {
      console.error('Failed to load returns:', err)
      toast.error('Failed to load customer returns')
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus])

  // ── Fetch Lookups ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  useEffect(() => {
    api.get('/admin/customers?limit=100').then(res => {
      if (res.data?.customers) setCustomers(res.data.customers)
    }).catch(err => console.warn('Could not load customers:', err.message))

    api.get('/admin/products?limit=100').then(res => {
      if (res.data?.products) setProducts(res.data.products)
    }).catch(err => console.warn('Could not load products:', err.message))

    api.get('/admin/orders/form-data/staff').then(res => {
      if (res.data?.staff) setStaffList(res.data.staff)
    }).catch(err => console.warn('Could not load staff list:', err.message))
  }, [])

  // ── Derived Stats & Filtering ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return records.filter(r => {
      const matchSearch = !q ||
        r.ref.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.ordRef.toLowerCase().includes(q)
      const matchStatus = filterStatus === 'all' || r.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [records, search, filterStatus])

  const stats = useMemo(() => ({
    total:    records.length,
    pending:  records.filter(r => r.status === 'pending' || r.status === 'inspecting').length,
    approved: records.filter(r => r.status === 'approved').length,
    refunded: records.filter(r => r.status === 'refunded').reduce((s, r) => s + (r.refundAmount || 0), 0),
  }), [records])

  // ── Modal Handlers ──────────────────────────────────────────────────────────
  function openLog() {
    setLogForm({
      date: new Date().toISOString().slice(0, 10),
      ordRef: '',
      customerId: customers[0]?.id || '',
      customer: customers[0]?.name || '',
      phone: customers[0]?.phone || '',
      productId: products[0]?.id || '',
      product: products[0]?.name || '',
      qty: 1,
      unit: products[0]?.unit || 'kg',
      unitPrice: parseFloat(products[0]?.unit_price || products[0]?.price || 0),
      reason: RETURN_REASONS[0],
      notes: '',
      refundMethod: 'Bank Transfer',
    })
    setActiveModal('log')
  }

  function handleLogCustomerChange(val) {
    const cust = customers.find(c => String(c.id) === String(val) || c.name === val)
    if (cust) {
      setLogForm(f => ({
        ...f,
        customerId: cust.id,
        customer: cust.name,
        phone: cust.phone || f.phone,
      }))
    } else {
      setLogForm(f => ({ ...f, customerId: '', customer: val }))
    }
  }

  function handleLogProductChange(val) {
    const prod = products.find(p => String(p.id) === String(val) || p.name === val)
    if (prod) {
      setLogForm(f => ({
        ...f,
        productId: prod.id,
        product: prod.name,
        unit: prod.unit || 'kg',
        unitPrice: parseFloat(prod.unit_price || prod.price || 0),
      }))
    } else {
      setLogForm(f => ({ ...f, productId: '', product: val }))
    }
  }

  function openProcess(r) {
    setSelected(r)
    setProcForm({
      condition: r.condition === 'pending_check' ? 'resalable' : r.condition,
      goodsAction: r.goodsAction || 'back_to_stock',
      resalableQty: r.resalableQty || r.qty,
      writeOffQty: r.writeOffQty || 0,
      inspectionNotes: r.inspectionNotes || '',
      processedBy: staffList[0]?.name || r.processedBy || 'Admin',
      refundAmount: r.refundAmount || r.totalValue,
      refundMethod: r.refundMethod || 'Bank Transfer',
      refundRef: r.refundRef || '',
    })
    setProcessTab('inspect')
    setActiveModal('process')
  }

  function openView(r) { setSelected(r); setActiveModal('view') }
  function openDelete(r) { setSelected(r); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setSelected(null); setSubmitting(false) }

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function saveLog(e) {
    e.preventDefault()
    if (!logForm.customer.trim()) {
      toast.error('Customer name is required')
      return
    }
    if (!logForm.product.trim()) {
      toast.error('Product name is required')
      return
    }
    if (Number(logForm.qty) <= 0) {
      toast.error('Quantity must be greater than 0')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        ordRef: logForm.ordRef.trim() || undefined,
        customer_id: logForm.customerId || undefined,
        customer: logForm.customer.trim(),
        product_id: logForm.productId || undefined,
        product: logForm.product.trim(),
        qty: Number(logForm.qty),
        unitPrice: Number(logForm.unitPrice || 0),
        reason: logForm.reason,
        notes: logForm.notes.trim() || undefined,
        refundMethod: logForm.refundMethod || 'Bank Transfer',
      }

      await api.post('/admin/orders/returns', payload)
      toast.success('Return logged successfully')
      closeModal()
      fetchReturns()
    } catch (err) {
      console.error('Failed to log return:', err)
      toast.error(err.response?.data?.message || 'Failed to log return')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveInspection() {
    try {
      setSubmitting(true)
      await api.patch(`/admin/orders/returns/${selected.id}/status`, {
        status: 'inspecting',
        description: procForm.inspectionNotes || undefined,
        refund_amount: Number(procForm.refundAmount || 0),
        refund_method: procForm.refundMethod,
      })
      toast.success('Inspection notes saved')
      setProcessTab('refund')
      fetchReturns()
    } catch (err) {
      console.error('Failed to save inspection:', err)
      toast.error(err.response?.data?.message || 'Failed to save inspection')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveRefundDecision(decision) {
    try {
      setSubmitting(true)
      const statusMap = {
        approve: 'approved',
        refunded: 'refunded',
        reject: 'rejected',
      }
      const newStatus = statusMap[decision] || decision
      const finalAmount = decision === 'reject' ? 0 : Number(procForm.refundAmount || 0)

      await api.patch(`/admin/orders/returns/${selected.id}/status`, {
        status: newStatus,
        description: procForm.inspectionNotes || undefined,
        refund_amount: finalAmount,
        refund_method: procForm.refundMethod,
      })

      toast.success(
        decision === 'reject'
          ? 'Return rejected'
          : decision === 'refunded'
            ? 'Refund completed and recorded'
            : 'Return approved for refund'
      )
      closeModal()
      fetchReturns()
    } catch (err) {
      console.error('Failed to save refund decision:', err)
      toast.error(err.response?.data?.message || 'Failed to update return decision')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    try {
      setSubmitting(true)
      await api.delete(`/admin/orders/returns/${selected.id}`)
      toast.success('Return record deleted')
      closeModal()
      fetchReturns()
    } catch (err) {
      console.error('Failed to delete return:', err)
      toast.error(err.response?.data?.message || 'Failed to delete return')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Condition auto-logic ──────────────────────────────────────────────────────
  function handleConditionChange(val) {
    const qty = selected?.qty || 0
    let goodsAction = 'back_to_stock', resalableQty = qty, writeOffQty = 0
    if (val === 'damaged') { goodsAction = 'write_off'; resalableQty = 0; writeOffQty = qty }
    if (val === 'partial') { goodsAction = 'split'; resalableQty = 0; writeOffQty = 0 }
    setProcForm(f => ({ ...f, condition: val, goodsAction, resalableQty, writeOffQty }))
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="container-fluid py-2">
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h5 className="mb-0 fw-bold">Customer Returns &amp; Refunds</h5>
          <span className="text-muted small">Track product return requests, goods quality inspections, and refund disbursements</span>
        </div>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/orders">Orders</Link></li>
          <li className="breadcrumb-item active">Returns &amp; Refunds</li>
        </ul>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Returns',
            value: stats.total,
            icon: 'ri-arrow-go-back-line',
            glow: 'bg-card-glow-indigo',
            iconBg: 'rgba(64, 81, 137, 0.12)',
            iconColor: '#405189',
            subLeft: 'All Return Logs',
            subRight: '100% audited',
            filter: 'all',
          },
          {
            label: 'Pending / Inspecting',
            value: stats.pending,
            icon: 'ri-time-line',
            glow: 'bg-card-glow-amber',
            iconBg: 'rgba(247, 184, 75, 0.14)',
            iconColor: '#d97706',
            valColor: stats.pending > 0 ? 'text-warning-emphasis' : 'text-dark',
            subLeft: 'Awaiting review',
            subRight: `${stats.pending} cases`,
            filter: 'pending',
          },
          {
            label: 'Awaiting Refund',
            value: stats.approved,
            icon: 'ri-checkbox-circle-line',
            glow: 'bg-card-glow-cyan',
            iconBg: 'rgba(41, 156, 219, 0.14)',
            iconColor: '#0284c7',
            valColor: stats.approved > 0 ? 'text-info' : 'text-dark',
            subLeft: 'Approved items',
            subRight: 'Pending payout',
            filter: 'approved',
          },
          {
            label: 'Total Refunded',
            value: `₦${Number(stats.refunded).toLocaleString()}`,
            icon: 'ri-refund-2-line',
            glow: 'bg-card-glow-green',
            iconBg: 'rgba(10, 179, 156, 0.14)',
            iconColor: '#059669',
            valColor: 'text-success',
            subLeft: 'Disbursed to date',
            subRight: 'Completed',
            filter: 'refunded',
          },
        ].map(c => {
          const isSelected = filterStatus === c.filter
          return (
            <div className="col-12 col-sm-6 col-xl-3" key={c.label}>
              <div
                className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow} cursor-pointer`}
                style={{
                  outline: isSelected ? '2px solid var(--vz-primary, #405189)' : 'none',
                  outlineOffset: '2px',
                  cursor: 'pointer',
                }}
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
                  <div className={`fs-24 fw-bolder mb-1 font-display text-truncate ${c.valColor || 'text-dark'}`}>
                    {c.value}
                  </div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                    <span className="text-truncate me-2">{c.subLeft}</span>
                    <strong className="text-dark font-monospace flex-shrink-0">{c.subRight}</strong>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white border-bottom-0 py-3 d-flex flex-wrap gap-3 align-items-center justify-content-between">
          <div className="position-relative" style={{ maxWidth: 300, width: '100%' }}>
            <input
              className="form-control ps-4"
              placeholder="Search by customer, ref, product…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <i className="ri-search-line position-absolute top-50 start-0 ms-2 translate-middle-y text-muted"/>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap align-items-center">
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="inspecting">Inspecting</option>
              <option value="approved">Approved</option>
              <option value="refunded">Refunded</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="btn btn-sm btn-outline-secondary" onClick={fetchReturns} title="Reload returns">
              <i className={`ri-refresh-line me-1 ${loading ? 'ri-spin' : ''}`}/>Refresh
            </button>
            <button className="btn btn-sm btn-primary d-flex align-items-center gap-1" onClick={openLog}>
              <i className="ri-add-line"/>Log Return
            </button>
          </div>
        </div>

        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle text-nowrap mb-0">
              <thead className="table-light">
                <tr style={{ fontSize: 12 }}>
                  <th className="fw-medium text-muted">Return Ref</th>
                  <th className="fw-medium text-muted">Date</th>
                  <th className="fw-medium text-muted">Customer</th>
                  <th className="fw-medium text-muted">Order Ref</th>
                  <th className="fw-medium text-muted">Product</th>
                  <th className="fw-medium text-muted">Qty</th>
                  <th className="fw-medium text-muted">Reason</th>
                  <th className="fw-medium text-muted">Goods Condition</th>
                  <th className="fw-medium text-muted">Refund Amount</th>
                  <th className="fw-medium text-muted">Refund Method</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={12} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"/>
                      Loading live return records...
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center py-5 text-muted">
                      <i className="ri-arrow-go-back-line fs-2 d-block mb-2 text-muted"/>
                      No return records found. Click "Log Return" to record a new return.
                    </td>
                  </tr>
                )}
                {!loading && filtered.map(r => {
                  const sc = STATUS_CFG[r.status] || STATUS_CFG.pending
                  const cc = CONDITION_CFG[r.condition] || CONDITION_CFG.pending_check
                  return (
                    <tr key={r.id} style={{ fontSize: 13 }}>
                      <td>
                        <button
                          className="btn btn-link p-0 fw-bold text-primary text-decoration-none"
                          onClick={() => openView(r)}
                        >
                          {r.ref}
                        </button>
                      </td>
                      <td style={{ fontSize: 12 }}>{r.date}</td>
                      <td>
                        <div className="fw-medium">{r.customer}</div>
                        {r.phone && <div className="text-muted" style={{ fontSize: 11 }}>{r.phone}</div>}
                      </td>
                      <td>
                        {r.ordRef ? (
                          <Link to={`/orders/${r.ordRef}`} className="text-decoration-none" style={{ fontSize: 12 }}>
                            <i className="ri-link me-1"/>{r.ordRef}
                          </Link>
                        ) : (
                          <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>{r.product}</td>
                      <td className="fw-medium">{r.qty} {r.unit}</td>
                      <td style={{ maxWidth: 160, whiteSpace: 'normal', fontSize: 12 }}>{r.reason}</td>
                      <td>
                        <span className={`badge ${cc.cls}`} style={{ fontSize: 11 }}>{cc.label}</span>
                      </td>
                      <td className="fw-bold" style={{ color: r.refundAmount > 0 ? '#f06548' : '#adb5bd' }}>
                        {r.refundAmount > 0 ? `₦${Number(r.refundAmount).toLocaleString()}` : '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {r.refundMethod ? (
                          <span className="badge bg-light text-dark border">{r.refundMethod}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1">
                          {(r.status === 'pending' || r.status === 'inspecting') && (
                            <button className="btn btn-sm btn-outline-primary py-0 px-2" onClick={() => openProcess(r)} title="Process Inspection / Decision">
                              <i className="ri-check-double-line"/>
                            </button>
                          )}
                          <button className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => openView(r)} title="View Details">
                            <i className="ri-eye-line"/>
                          </button>
                          {r.status !== 'refunded' && (
                            <button className="btn btn-sm btn-light text-danger py-0 px-2" onClick={() => openDelete(r)} title="Delete Record">
                              <i className="ri-delete-bin-line"/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-muted" style={{ fontSize: 13 }}>Showing {filtered.length} of {records.length} records</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          LOG RETURN MODAL
      ══════════════════════════════════════════════════════════ */}
      {activeModal === 'log' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h6 className="modal-title mb-0 d-flex align-items-center gap-2 fw-bold">
                      <i className="ri-arrow-go-back-line text-warning"/> Log Customer Return
                    </h6>
                    <div className="text-muted" style={{ fontSize: 12 }}>Record a returned goods request from a customer</div>
                  </div>
                  <button className="btn-close" onClick={closeModal}/>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveLog}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Original Order Ref (optional)</label>
                        <input
                          className="form-control form-control-sm"
                          placeholder="e.g. ORD-2026-0001"
                          value={logForm.ordRef}
                          onChange={e => setLogForm(f => ({ ...f, ordRef: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Date <span className="text-danger">*</span></label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          required
                          value={logForm.date}
                          onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Customer <span className="text-danger">*</span></label>
                        <input
                          className="form-control form-control-sm"
                          placeholder="Select or enter customer..."
                          list="return-customer-options"
                          required
                          value={logForm.customer}
                          onChange={e => handleLogCustomerChange(e.target.value)}
                        />
                        <datalist id="return-customer-options">
                          {customers.map(c => (
                            <option key={c.id} value={c.name}>
                              {c.phone ? `${c.phone} — ` : ''}{c.email || ''}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Customer Phone</label>
                        <input
                          className="form-control form-control-sm"
                          placeholder="0800 000 0000"
                          value={logForm.phone}
                          onChange={e => setLogForm(f => ({ ...f, phone: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-5">
                        <label className="form-label fw-medium small">Product Returned <span className="text-danger">*</span></label>
                        <input
                          className="form-control form-control-sm"
                          placeholder="Select or type product name..."
                          list="return-product-options"
                          required
                          value={logForm.product}
                          onChange={e => handleLogProductChange(e.target.value)}
                        />
                        <datalist id="return-product-options">
                          {products.map(p => (
                            <option key={p.id} value={p.name}>
                              ₦{Number(p.unit_price || p.price || 0).toLocaleString()} / {p.unit || 'kg'}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-medium small">Qty <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          min="0.1"
                          step="any"
                          required
                          value={logForm.qty}
                          onChange={e => setLogForm(f => ({ ...f, qty: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-medium small">Unit</label>
                        <input
                          className="form-control form-control-sm"
                          placeholder="kg, bunch..."
                          value={logForm.unit}
                          onChange={e => setLogForm(f => ({ ...f, unit: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-medium small">Unit Price (₦)</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          min="0"
                          value={logForm.unitPrice}
                          onChange={e => setLogForm(f => ({ ...f, unitPrice: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Return Reason <span className="text-danger">*</span></label>
                        <select
                          className="form-select form-select-sm"
                          required
                          value={logForm.reason}
                          onChange={e => setLogForm(f => ({ ...f, reason: e.target.value }))}
                        >
                          {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Refund Method</label>
                        <select
                          className="form-select form-select-sm"
                          value={logForm.refundMethod}
                          onChange={e => setLogForm(f => ({ ...f, refundMethod: e.target.value }))}
                        >
                          {REFUND_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium small">Customer Notes</label>
                        <textarea
                          className="form-control form-control-sm"
                          rows="3"
                          placeholder="What did the customer state regarding the condition or cause for return?"
                          value={logForm.notes}
                          onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded mt-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: 12 }}>
                      <i className="ri-information-line text-info me-1"/>
                      After logging, click <strong>Process</strong> to inspect the physical condition and issue a decision.
                    </div>

                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal} disabled={submitting}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                        {submitting ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="ri-check-line me-1"/>}
                        Log Return
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={closeModal}/>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          PROCESS MODAL (Inspection + Refund Decision)
      ══════════════════════════════════════════════════════════ */}
      {activeModal === 'process' && selected && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-xl">
              <div className="modal-content">
                <div className="modal-header" style={{ background: '#f8f9fa' }}>
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i className="ri-search-2-line fs-18 text-primary"/>
                      <h6 className="modal-title mb-0 fw-bold">Process Return — {selected.ref}</h6>
                      <span className={`badge ${STATUS_CFG[selected.status]?.cls}`}>{STATUS_CFG[selected.status]?.label}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {selected.customer} · {selected.product} · {selected.qty} {selected.unit}
                    </div>
                  </div>
                  <button className="btn-close" onClick={closeModal}/>
                </div>

                <div className="modal-body p-0">
                  {/* Tab switcher */}
                  <div className="d-flex border-bottom" style={{ background: '#f0f3f9' }}>
                    {[
                      { id: 'inspect', icon: 'ri-search-2-line',  label: '1 · Inspect Goods'    },
                      { id: 'refund',  icon: 'ri-refund-2-line',  label: '2 · Refund Decision'  },
                    ].map(t => (
                      <button
                        key={t.id}
                        className={`btn btn-sm flex-grow-1 rounded-0 d-flex align-items-center justify-content-center gap-2 py-3
                          ${processTab === t.id ? 'btn-primary' : 'btn-link text-muted text-decoration-none'}`}
                        style={{ fontSize: 13, fontWeight: processTab === t.id ? 600 : 400 }}
                        onClick={() => setProcessTab(t.id)}
                      >
                        <i className={t.icon}/> {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="row g-0">
                    {/* LEFT: Return summary */}
                    <div className="col-lg-4 p-4 border-end" style={{ background: '#fafbfc' }}>
                      <h6 className="fw-semibold mb-3 text-muted" style={{ fontSize: 12, letterSpacing: 1 }}>RETURN DETAILS</h6>

                      <div className="card mb-3" style={{ background: '#fff8ec', border: '1px solid #f7b84b33' }}>
                        <div className="card-body py-3">
                          <div className="fw-bold mb-1">{selected.product}</div>
                          <div className="text-muted mb-3" style={{ fontSize: 12 }}>{selected.customer} · {selected.ordRef || 'No Order Ref'}</div>
                          <div className="row g-2">
                            <div className="col-4">
                              <div style={{ fontSize: 11, color: '#adb5bd' }}>QTY</div>
                              <div className="fw-bold">{selected.qty} {selected.unit}</div>
                            </div>
                            <div className="col-4">
                              <div style={{ fontSize: 11, color: '#adb5bd' }}>UNIT PRICE</div>
                              <div className="fw-bold">₦{Number(selected.unitPrice || 0).toLocaleString()}</div>
                            </div>
                            <div className="col-4">
                              <div style={{ fontSize: 11, color: '#adb5bd' }}>TOTAL</div>
                              <div className="fw-bold text-danger">₦{Number(selected.totalValue || 0).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3 p-3 rounded border" style={{ fontSize: 12 }}>
                        <div className="fw-medium mb-2 text-muted" style={{ fontSize: 11 }}>CUSTOMER COMPLAINT</div>
                        <div className="fw-medium mb-1">{selected.reason}</div>
                        {selected.notes && <div className="text-muted fst-italic">"{selected.notes}"</div>}
                      </div>

                      <div className="p-3 rounded border" style={{ fontSize: 12 }}>
                        <div className="fw-medium mb-2 text-muted" style={{ fontSize: 11 }}>RETURN INFO</div>
                        <div className="d-flex justify-content-between mb-1"><span className="text-muted">Return Date</span><span>{selected.date}</span></div>
                        <div className="d-flex justify-content-between mb-1"><span className="text-muted">Phone</span><span>{selected.phone || '—'}</span></div>
                        <div className="d-flex justify-content-between"><span className="text-muted">Order Ref</span><span>{selected.ordRef || '—'}</span></div>
                      </div>
                    </div>

                    {/* RIGHT: Inspection / Refund tabs */}
                    <div className="col-lg-8 p-4">

                      {/* ── INSPECTION TAB ── */}
                      {processTab === 'inspect' && (
                        <>
                          <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                            <i className="ri-search-2-line text-primary"/> Goods Inspection
                          </h6>

                          <div className="mb-3">
                            <label className="form-label fw-medium small">Inspected By</label>
                            <select
                              className="form-select form-select-sm"
                              value={procForm.processedBy}
                              onChange={e => setProcForm(f => ({ ...f, processedBy: e.target.value }))}
                            >
                              {staffList.length > 0 ? (
                                staffList.map(s => <option key={s.id} value={s.name}>{s.name} ({s.role})</option>)
                              ) : (
                                ['Admin', 'Manager', 'Store Staff'].map(s => <option key={s} value={s}>{s}</option>)
                              )}
                            </select>
                          </div>

                          <div className="mb-4">
                            <label className="form-label fw-medium small">Goods Condition <span className="text-danger">*</span></label>
                            <div className="row g-2">
                              {[
                                { val: 'resalable', icon: 'ri-checkbox-circle-line', color: '#0ab39c', title: 'Resalable', desc: 'Goods are intact, can return to stock' },
                                { val: 'damaged',   icon: 'ri-close-circle-line',    color: '#f06548', title: 'Damaged / Spoiled', desc: 'Cannot resell — write off to Lost & Damaged' },
                                { val: 'partial',   icon: 'ri-indeterminate-circle-line', color: '#f7b84b', title: 'Partially Good', desc: 'Split — some to stock, rest written off' },
                              ].map(opt => (
                                <div className="col-md-4" key={opt.val}>
                                  <div
                                    className="p-3 rounded border text-center"
                                    style={{
                                      borderColor: procForm.condition === opt.val ? opt.color : '#dee2e6',
                                      background: procForm.condition === opt.val ? `${opt.color}12` : '#fff',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => handleConditionChange(opt.val)}
                                  >
                                    <i className={`${opt.icon} fs-22 d-block mb-1`} style={{ color: opt.color }}/>
                                    <div className="fw-medium" style={{ fontSize: 13, color: opt.color }}>{opt.title}</div>
                                    <div className="text-muted mt-1" style={{ fontSize: 11 }}>{opt.desc}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Qty split for partial */}
                          {procForm.condition === 'partial' && (
                            <div className="row g-3 mb-3 p-3 rounded" style={{ background: '#fff8ec', border: '1px solid #f7b84b44' }}>
                              <div className="col-6">
                                <label className="form-label fw-medium text-success" style={{ fontSize: 13 }}>
                                  <i className="ri-arrow-down-circle-line me-1"/>Back to Stock (qty)
                                </label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  min="0"
                                  max={selected.qty}
                                  value={procForm.resalableQty}
                                  onChange={e => setProcForm(f => ({ ...f, resalableQty: Number(e.target.value), writeOffQty: selected.qty - Number(e.target.value) }))}
                                />
                              </div>
                              <div className="col-6">
                                <label className="form-label fw-medium text-danger" style={{ fontSize: 13 }}>
                                  <i className="ri-error-warning-line me-1"/>Write Off (qty)
                                </label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm bg-light"
                                  readOnly
                                  value={selected.qty - Number(procForm.resalableQty)}
                                />
                              </div>
                            </div>
                          )}

                          {procForm.condition !== 'partial' && (
                            <div
                              className="mb-3 p-3 rounded d-flex align-items-center gap-3"
                              style={{ background: '#f8f9fa', border: '1px solid #dee2e6', fontSize: 13 }}
                            >
                              <i className={`fs-18 ${procForm.condition === 'resalable' ? 'ri-arrow-down-circle-line text-success' : 'ri-error-warning-line text-danger'}`}/>
                              <span>
                                All <strong>{selected.qty} {selected.unit}</strong> will be{' '}
                                {procForm.condition === 'resalable' ? <span className="text-success fw-medium">returned to stock</span> : <span className="text-danger fw-medium">written off to Lost &amp; Damaged</span>}.
                              </span>
                            </div>
                          )}

                          <div className="mb-4">
                            <label className="form-label fw-medium small">Inspection Notes</label>
                            <textarea
                              className="form-control"
                              rows="3"
                              placeholder="Describe findings during inspection — condition, evidence, decision rationale…"
                              value={procForm.inspectionNotes}
                              onChange={e => setProcForm(f => ({ ...f, inspectionNotes: e.target.value }))}
                              style={{ fontSize: 13 }}
                            />
                          </div>

                          <button
                            className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                            onClick={saveInspection}
                            disabled={submitting}
                          >
                            {submitting ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="ri-arrow-right-line"/>}
                            Save Inspection &amp; Proceed to Refund
                          </button>
                        </>
                      )}

                      {/* ── REFUND DECISION TAB ── */}
                      {processTab === 'refund' && (
                        <>
                          <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                            <i className="ri-refund-2-line text-success"/> Refund Decision
                          </h6>

                          {/* Inspection summary */}
                          <div className="mb-4 p-3 rounded" style={{ background: '#f8f9fa', border: '1px solid #dee2e6', fontSize: 13 }}>
                            <div className="fw-medium mb-2 text-muted" style={{ fontSize: 11 }}>INSPECTION OUTCOME</div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className={`badge ${CONDITION_CFG[procForm.condition]?.cls}`}>{CONDITION_CFG[procForm.condition]?.label}</span>
                              <span className="text-muted">·</span>
                              {procForm.condition === 'partial' ? (
                                <span>{procForm.resalableQty} {selected.unit} to stock · {selected.qty - procForm.resalableQty} {selected.unit} written off</span>
                              ) : (
                                <span>{CONDITION_CFG[procForm.condition]?.action}</span>
                              )}
                            </div>
                            {procForm.inspectionNotes && (
                              <div className="text-muted fst-italic mt-1" style={{ fontSize: 12 }}>"{procForm.inspectionNotes}"</div>
                            )}
                          </div>

                          <div className="row g-3 mb-3">
                            <div className="col-md-6">
                              <label className="form-label fw-medium small">Refund Amount (₦)</label>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                min="0"
                                max={selected.totalValue}
                                value={procForm.refundAmount}
                                onChange={e => setProcForm(f => ({ ...f, refundAmount: e.target.value }))}
                              />
                              <div className="form-text" style={{ fontSize: 11 }}>Max: ₦{Number(selected.totalValue || 0).toLocaleString()}</div>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-medium small">Refund Method</label>
                              <select
                                className="form-select form-select-sm"
                                value={procForm.refundMethod}
                                onChange={e => setProcForm(f => ({ ...f, refundMethod: e.target.value }))}
                              >
                                {REFUND_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                          </div>

                          {/* Decision buttons */}
                          <div className="p-3 rounded mt-2" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>
                            <div className="fw-medium mb-3" style={{ fontSize: 13 }}>Select Final Action</div>
                            <div className="row g-2">
                              <div className="col-md-4">
                                <button
                                  className="btn btn-outline-success w-100 d-flex align-items-center justify-content-center gap-1 btn-sm py-2"
                                  onClick={() => saveRefundDecision('approve')}
                                  disabled={submitting}
                                >
                                  <i className="ri-checkbox-circle-line"/> Approve (pending payout)
                                </button>
                              </div>
                              <div className="col-md-4">
                                <button
                                  className="btn btn-success w-100 d-flex align-items-center justify-content-center gap-1 btn-sm py-2"
                                  onClick={() => saveRefundDecision('refunded')}
                                  disabled={submitting || !Number(procForm.refundAmount)}
                                >
                                  <i className="ri-refund-2-line"/> Complete &amp; Refund Now
                                </button>
                              </div>
                              <div className="col-md-4">
                                <button
                                  className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-1 btn-sm py-2"
                                  onClick={() => saveRefundDecision('reject')}
                                  disabled={submitting}
                                >
                                  <i className="ri-close-circle-line"/> Reject Return
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-light btn-sm" onClick={closeModal}>Close</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={closeModal}/>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW MODAL
      ══════════════════════════════════════════════════════════ */}
      {activeModal === 'view' && selected && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h6 className="modal-title mb-0 fw-bold">{selected.ref}</h6>
                      <span className={`badge ${STATUS_CFG[selected.status]?.cls}`}>{STATUS_CFG[selected.status]?.label}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{selected.date} · {selected.customer}</div>
                  </div>
                  <button className="btn-close" onClick={closeModal}/>
                </div>
                <div className="modal-body">
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="p-3 rounded border h-100" style={{ fontSize: 13 }}>
                        <div className="fw-medium mb-3 text-muted" style={{ fontSize: 11 }}>RETURN DETAILS</div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Product</span><span className="fw-medium">{selected.product}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Qty Returned</span><span className="fw-medium">{selected.qty} {selected.unit}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Unit Price</span><span>₦{Number(selected.unitPrice || 0).toLocaleString()}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Total Value</span><span className="fw-bold text-danger">₦{Number(selected.totalValue || 0).toLocaleString()}</span></div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Order Ref</span>
                          {selected.ordRef ? (
                            <Link to={`/orders/${selected.ordRef}`} className="text-decoration-none">
                              {selected.ordRef}
                            </Link>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Reason</span><span style={{ maxWidth: 160, textAlign: 'right' }}>{selected.reason}</span></div>
                        {selected.notes && (
                          <div className="mt-3 pt-3 border-top">
                            <div className="text-muted mb-1" style={{ fontSize: 11 }}>CUSTOMER NOTES</div>
                            <div className="fst-italic">"{selected.notes}"</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 rounded border h-100" style={{ fontSize: 13 }}>
                        <div className="fw-medium mb-3 text-muted" style={{ fontSize: 11 }}>INSPECTION &amp; REFUND</div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Goods Condition</span>
                          <span className={`badge ${CONDITION_CFG[selected.condition]?.cls}`}>{CONDITION_CFG[selected.condition]?.label}</span>
                        </div>
                        {selected.condition === 'partial' && (
                          <>
                            <div className="d-flex justify-content-between mb-2"><span className="text-muted">Back to Stock</span><span className="text-success fw-medium">{selected.resalableQty} {selected.unit}</span></div>
                            <div className="d-flex justify-content-between mb-2"><span className="text-muted">Written Off</span><span className="text-danger fw-medium">{selected.writeOffQty} {selected.unit}</span></div>
                          </>
                        )}
                        {selected.condition === 'resalable' && selected.resalableQty > 0 && (
                          <div className="d-flex justify-content-between mb-2"><span className="text-muted">Back to Stock</span><span className="text-success fw-medium">{selected.resalableQty} {selected.unit}</span></div>
                        )}
                        {selected.condition === 'damaged' && (
                          <div className="d-flex justify-content-between mb-2"><span className="text-muted">Written Off</span><span className="text-danger fw-medium">{selected.writeOffQty} {selected.unit}</span></div>
                        )}
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Refund Amount</span><span className="fw-bold text-danger">{selected.refundAmount > 0 ? `₦${Number(selected.refundAmount).toLocaleString()}` : '—'}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Refund Method</span><span>{selected.refundMethod || '—'}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Processed By</span><span>{selected.processedBy || '—'}</span></div>
                        <div className="d-flex justify-content-between"><span className="text-muted">Processed On</span><span>{selected.processedOn || '—'}</span></div>
                        {selected.inspectionNotes && (
                          <div className="mt-3 pt-3 border-top">
                            <div className="text-muted mb-1" style={{ fontSize: 11 }}>INSPECTION NOTES</div>
                            <div className="fst-italic text-muted">"{selected.inspectionNotes}"</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer gap-2">
                  {(selected.status === 'pending' || selected.status === 'inspecting') && (
                    <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={() => { closeModal(); setTimeout(() => openProcess(selected), 50) }}>
                      <i className="ri-check-double-line"/> Process Return
                    </button>
                  )}
                  <button className="btn btn-light btn-sm" onClick={closeModal}>Close</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={closeModal}/>
        </>
      )}

      {/* ── DELETE MODAL ─────────────────────────────────── */}
      {activeModal === 'delete' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
              <div className="modal-content p-4 text-center">
                <div className="d-flex justify-content-center mb-3">
                  <div className="rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center" style={{ width: 56, height: 56 }}>
                    <i className="ri-delete-bin-line text-danger fs-22"/>
                  </div>
                </div>
                <h6 className="mb-1 fw-bold">Delete Return Record?</h6>
                <p className="text-muted mb-4" style={{ fontSize: 13 }}>{selected?.ref} — {selected?.customer}</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-light w-100 btn-sm" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className="btn btn-danger w-100 btn-sm" onClick={confirmDelete} disabled={submitting}>
                    {submitting ? <span className="spinner-border spinner-border-sm me-1"/> : null}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={closeModal}/>
        </>
      )}
    </div>
  )
}
