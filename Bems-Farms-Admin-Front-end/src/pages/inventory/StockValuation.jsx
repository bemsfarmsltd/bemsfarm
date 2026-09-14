import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

export default function StockValuation() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData((await api.get('/admin/inventory/valuation')).data) }
    catch (err) { setError(err.response?.data?.message || 'Stock valuation could not be loaded.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const rows = useMemo(() => (data?.products || []).filter((item) => {
    const query = search.trim().toLowerCase()
    return !query || [item.name, item.sku, item.category].some((value) => value?.toLowerCase().includes(query))
  }), [data, search])
  const summary = data?.summary || {}
  const profit = Number(summary.retail_value || 0) - Number(summary.cost_value || 0)
  const margin = Number(summary.retail_value) > 0 ? profit / Number(summary.retail_value) * 100 : 0

  return <div className="container-fluid">
    <div className="page-heading d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
      <div><h5 className="mb-1 fw-bold">Stock valuation</h5><p className="text-muted mb-0 fs-13">Live inventory value from current product quantities and prices.</p></div>
      <div className="d-flex gap-2"><button className="btn btn-outline-secondary" onClick={load} disabled={loading}><i className="ri-refresh-line me-1" /> Refresh</button><Link to="/inventory/stock" className="btn btn-primary">View stock list</Link></div>
    </div>
    {error && <div className="alert alert-danger d-flex justify-content-between" role="alert"><span>{error}</span><button className="btn btn-sm btn-danger" onClick={load}>Retry</button></div>}
    {loading && <div className="card p-5 text-center" role="status"><div className="spinner-border text-primary mx-auto mb-2" />Calculating live valuation…</div>}
    {!loading && data && <>
      <div className="row g-3 mb-4">{[
        ['Cost value', money(summary.cost_value), 'Current stock at recorded cost price', 'ri-price-tag-3-line', '#405189'],
        ['Retail value', money(summary.retail_value), 'Current stock at selling price', 'ri-store-2-line', '#0d8065'],
        ['Potential gross profit', money(profit), 'Before expenses, shrinkage and tax', 'ri-line-chart-line', '#1677b8'],
        ['Potential gross margin', `${margin.toFixed(1)}%`, `${Number(summary.total_skus || 0).toLocaleString()} active SKUs`, 'ri-percent-line', '#b7791f'],
      ].map(([label,value,hint,icon,color]) => <div className="col-12 col-sm-6 col-xl-3" key={label}><div className="card h-100 mb-0 border-0 shadow-sm"><div className="card-body p-3"><div className="d-flex align-items-center gap-3"><span className="rounded-3 p-2" style={{background:`${color}16`,color}}><i className={`${icon} fs-20`} /></span><div><div className="text-muted fs-12 text-uppercase fw-semibold">{label}</div><div className="fs-20 fw-bold" style={{color}}>{value}</div></div></div><p className="text-muted fs-12 mb-0 mt-3">{hint}</p></div></div></div>)}</div>
      <div className="card mb-4"><div className="card-header"><h6 className="mb-0 fw-bold">Valuation by category</h6></div><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Category</th><th>SKUs</th><th>Units</th><th>Cost value</th><th>Retail value</th><th>Potential profit</th></tr></thead><tbody>{(data.by_category || []).map(row => <tr key={row.category}><td className="fw-semibold">{row.category || 'Uncategorised'}</td><td>{row.skus}</td><td>{row.total_units}</td><td>{money(row.cost_value)}</td><td>{money(row.retail_value)}</td><td className="text-success fw-semibold">{money(Number(row.retail_value)-Number(row.cost_value))}</td></tr>)}</tbody></table></div></div>
      <div className="card"><div className="card-header d-flex align-items-center justify-content-between gap-3 flex-wrap"><div><h6 className="mb-0 fw-bold">Product valuation</h6><small className="text-muted">Potential profit uses current cost and selling prices.</small></div><input aria-label="Search product valuation" className="form-control" style={{maxWidth:320}} placeholder="Search product, SKU or category…" value={search} onChange={e=>setSearch(e.target.value)} /></div><div className="table-responsive"><table className="table align-middle text-nowrap mb-0"><thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Cost price</th><th>Selling price</th><th>Cost value</th><th>Retail value</th><th>Potential profit</th><th>Margin</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.name}</strong><small className="d-block text-muted">{row.sku || 'No SKU'}</small></td><td>{row.category || 'Uncategorised'}</td><td>{row.stock} {row.unit || 'units'}</td><td>{money(row.cost_price)}</td><td>{money(row.unit_price)}</td><td>{money(row.cost_value)}</td><td>{money(row.retail_value)}</td><td className={Number(row.potential_profit)<0?'text-danger fw-semibold':'text-success fw-semibold'}>{money(row.potential_profit)}</td><td>{Number(row.margin_pct || 0).toFixed(1)}%</td></tr>)}{!rows.length&&<tr><td colSpan="9" className="text-center text-muted py-5">No matching active products.</td></tr>}</tbody></table></div></div>
    </>}
  </div>
}
