import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })

const EMPTY_ITEM = { product_id: '', product_name: '', quantity: 1, unit_cost: '', total: 0 }

export default function AddPurchase() {
  const navigate = useNavigate()

  const [suppliers, setSuppliers] = useState([])
  const [form, setForm] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    notes: '',
  })
  const [lineItems, setLineItems] = useState([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)

  // Product search
  const [productSearch, setProductSearch] = useState({})   // { [rowIndex]: searchTerm }
  const [productResults, setProductResults] = useState({}) // { [rowIndex]: [] }
  const [searching, setSearching] = useState({})
  const searchTimers = useRef({})

  // Load suppliers
  useEffect(() => {
    api.get('/admin/suppliers', { params: { limit: 200, status: 'active' } })
      .then(res => setSuppliers(res.data.suppliers || []))
      .catch(() => {})
  }, [])

  const searchProducts = useCallback(async (index, term) => {
    if (!term || term.length < 2) {
      setProductResults(r => ({ ...r, [index]: [] }))
      return
    }
    setSearching(s => ({ ...s, [index]: true }))
    try {
      const res = await api.get('/admin/inventory', { params: { search: term, limit: 10 } })
      setProductResults(r => ({ ...r, [index]: res.data.products || res.data || [] }))
    } catch {
      setProductResults(r => ({ ...r, [index]: [] }))
    } finally {
      setSearching(s => ({ ...s, [index]: false }))
    }
  }, [])

  const handleProductSearch = (index, value) => {
    setProductSearch(s => ({ ...s, [index]: value }))
    clearTimeout(searchTimers.current[index])
    searchTimers.current[index] = setTimeout(() => searchProducts(index, value), 350)
  }

  const selectProduct = (index, product) => {
    setLineItems(items => items.map((item, i) =>
      i === index
        ? {
            ...item,
            product_id: product.id,
            product_name: product.name,
            unit_cost: product.cost_price || product.price || '',
            total: (item.quantity || 1) * (product.cost_price || product.price || 0),
          }
        : item
    ))
    setProductSearch(s => ({ ...s, [index]: product.name }))
    setProductResults(r => ({ ...r, [index]: [] }))
  }

  const updateItem = (index, field, value) => {
    setLineItems(items => items.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_cost') {
        updated.total = (Number(updated.quantity) || 0) * (Number(updated.unit_cost) || 0)
      }
      return updated
    }))
  }

  const addRow = () => setLineItems(items => [...items, { ...EMPTY_ITEM }])

  const removeRow = (index) => {
    if (lineItems.length === 1) return
    setLineItems(items => items.filter((_, i) => i !== index))
    setProductSearch(s => { const n = { ...s }; delete n[index]; return n })
    setProductResults(r => { const n = { ...r }; delete n[index]; return n })
  }

  const grandTotal = lineItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.supplier_id) { toast.error('Please select a supplier'); return }
    const validItems = lineItems.filter(i => i.product_id && Number(i.quantity) > 0 && Number(i.unit_cost) >= 0)
    if (validItems.length === 0) { toast.error('Add at least one valid line item'); return }

    setSaving(true)
    try {
      await api.post('/admin/purchases', {
        ...form,
        items: validItems.map(i => ({
          product_id: i.product_id,
          quantity: Number(i.quantity),
          unit_cost: Number(i.unit_cost),
        })),
      })
      toast.success('Purchase order created successfully')
      navigate('/purchase/list')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create purchase order')
    } finally {
      setSaving(false)
    }
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Add Purchase</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Purchase</a></li>
          <li className="breadcrumb-item active">Add</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Create Purchase Order</h5>
          </div>
          <div className="card-body">
            <div className="row g-4 mb-4">
              <div className="col-md-4">
                <label className="form-label">Supplier <span className="text-danger">*</span></label>
                <select
                  className="form-select"
                  value={form.supplier_id}
                  onChange={set('supplier_id')}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Order Date <span className="text-danger">*</span></label>
                <input
                  type="date"
                  className="form-control"
                  value={form.order_date}
                  onChange={set('order_date')}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Expected Delivery Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.expected_date}
                  onChange={set('expected_date')}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Line Items</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addRow}>
                <i className="ri-add-line me-1"></i>Add Row
              </button>
            </div>

            <div className="table-responsive mb-4">
              <table className="table table-bordered align-middle text-nowrap">
                <thead className="bg-light">
                  <tr>
                    <th style={{ minWidth: 220 }}>Product <span className="text-danger">*</span></th>
                    <th style={{ width: 100 }}>Qty <span className="text-danger">*</span></th>
                    <th style={{ width: 140 }}>Unit Cost (₦) <span className="text-danger">*</span></th>
                    <th style={{ width: 140 }}>Line Total</th>
                    <th style={{ width: 60 }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="position-relative">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search product..."
                          value={productSearch[i] || ''}
                          onChange={e => handleProductSearch(i, e.target.value)}
                          autoComplete="off"
                        />
                        {searching[i] && (
                          <div className="position-absolute end-0 top-50 translate-middle-y me-2">
                            <span className="spinner-border spinner-border-sm text-primary" />
                          </div>
                        )}
                        {productResults[i] && productResults[i].length > 0 && (
                          <ul className="list-group position-absolute w-100 shadow" style={{ zIndex: 1000, top: '100%', left: 0 }}>
                            {productResults[i].map(p => (
                              <li
                                key={p.id}
                                className="list-group-item list-group-item-action"
                                style={{ cursor: 'pointer' }}
                                onMouseDown={() => selectProduct(i, p)}
                              >
                                <span className="fw-medium">{p.name}</span>
                                {p.sku && <small className="text-muted ms-2">({p.sku})</small>}
                                {(p.cost_price || p.price) && (
                                  <span className="float-end text-muted small">{fmt(p.cost_price || p.price)}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unit_cost}
                          onChange={e => updateItem(i, 'unit_cost', e.target.value)}
                        />
                      </td>
                      <td className="fw-medium">{fmt(item.total)}</td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sub-danger btn-icon size-8"
                          onClick={() => removeRow(i)}
                          disabled={lineItems.length === 1}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals summary */}
            <div className="row justify-content-end mb-4">
              <div className="col-md-4">
                <table className="table table-borderless text-end mb-0">
                  <tbody>
                    <tr>
                      <td className="text-muted">Subtotal</td>
                      <td className="fw-medium">{fmt(grandTotal)}</td>
                    </tr>
                    <tr className="fw-bold fs-5">
                      <td>Grand Total</td>
                      <td className="text-primary">{fmt(grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-12 mb-4">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Additional notes for this purchase order..."
                value={form.notes}
                onChange={set('notes')}
              />
            </div>

            <div className="d-flex gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => navigate('/purchase/list')}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm me-1" />Creating...</>
                  : 'Create Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
