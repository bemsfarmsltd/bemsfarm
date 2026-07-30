import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const STATUS_CFG = {
  in_stock:     { label:'In Stock',     bg:'#dcfce7', color:'#166534' },
  low_stock:    { label:'Low Stock',    bg:'#fef9c3', color:'#854d0e' },
  out_of_stock: { label:'Out of Stock', bg:'#fee2e2', color:'#991b1b' },
}

const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'var(--orange-accent)',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:600, fontSize:13 }
const TH   = { padding:'10px 16px', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left', whiteSpace:'nowrap' }
const TD   = { padding:'12px 16px', verticalAlign:'middle', borderBottom:'1px solid #f3f4f6', fontSize:13, color:'#111827' }
const inp  = { display:'block', width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontFamily:'Nunito,sans-serif', fontSize:13, outline:'none', background:'#fff', color:'#111827', boxSizing:'border-box' }

export default function StockList() {
  const navigate = useNavigate()
  const [products,    setProducts]  = useState([])
  const [loading,     setLoading]   = useState(false)
  const [page,        setPage]      = useState(1)
  const [search,      setSearch]    = useState('')
  const [selected,    setSelected]  = useState([])
  const [meta,        setMeta]      = useState({ total:0, pages:1, stats:{} })
  const [stockStatus, setStockStatus] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit:20, search }
      if (stockStatus) params.stock_status = stockStatus
      const res = await api.get('/admin/inventory', { params })
      setProducts(res.data.products || [])
      setMeta({ total: res.data.total || 0, pages: res.data.pages || 1, stats: res.data.stats || {} })
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to load products') 
    } finally { 
      setLoading(false) 
    }
  }, [page, search, stockStatus])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { setPage(1) }, [search, stockStatus])

  const totals = {
    all: Number(meta.stats?.total_skus || 0),
    low: Number(meta.stats?.low_stock || 0),
    out: Number(meta.stats?.out_of_stock || 0),
  }

  function stockColor(p) {
    if (p.stock === 0) return '#f06548'
    if (p.stock <= (p.low_stock_threshold || 0)) return '#f7b84b'
    return '#0ab39c'
  }

  function getStatusCfg(p) {
    if (p.stock_status === 'out_of_stock') return STATUS_CFG.out_of_stock
    if (p.stock_status === 'low') return STATUS_CFG.low_stock
    return STATUS_CFG.in_stock
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    setSelected(prev => prev.length === products.length ? [] : products.map(p => p.id))
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return date.toISOString().slice(0, 10)
  }

  const B = '#e5e7eb', S = '#6b7280'

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      {/* Page header & Breadcrumbs */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, color:'var(--text-primary)' }}>Stock List</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
          <span style={{ cursor:'pointer' }} onClick={()=>navigate('/products')}>Inventory</span>
          <i className="ri-arrow-right-s-line" style={{ fontSize:14 }} />
          <span style={{ fontWeight:600, color:'var(--text-primary)' }}>Stock List</span>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total SKUs',   value:totals.all, icon:'ri-box-3-line', color:'#405189', valueColor:'var(--text-primary)' },
          { label:'In Stock',     value:Math.max(0, totals.all - totals.low - totals.out), icon:'ri-checkbox-circle-line', color:'#0ab39c', valueColor:'var(--text-primary)' },
          { label:'Low Stock',    value:totals.low, icon:'ri-alert-line', color:'#f7b84b', valueColor:'#f59e0b' },
          { label:'Out of Stock', value:totals.out, icon:'ri-close-circle-line', color:'#f06548', valueColor:'#ef4444' },
        ].map(c => (
          <div key={c.label} style={{ background:'#fff', borderRadius:12, border:`1px solid ${B}`, borderLeft:`3px solid ${c.color}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:`${c.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:20, color:c.color }}/>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:c.valueColor }}>{c.value}</div>
              <div style={{ fontSize:11, color:S }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${B}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${B}`, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:15 }}/>
            <input style={{ ...inp, paddingLeft:32 }} placeholder="Search product, SKU..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select style={{ ...inp, width:'auto', minWidth:140 }} value={stockStatus} onChange={e => setStockStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <button style={btnP} onClick={() => navigate('/products/add')}><i className="ri-add-line"/>Add Product</button>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, fontFamily:'Nunito,sans-serif' }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${B}` }}>
                <th style={TH}>
                  <input type="checkbox" checked={selected.length === products.length && products.length > 0} onChange={toggleAll} style={{ cursor:'pointer' }}/>
                </th>
                {['Product','SKU','Category','Stock','Reorder','Status','Cost (₦)','Price (₦)','Updated'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign:'center', padding:'40px 0' }}>
                  <div className="spinner-border spinner-border-sm text-primary me-2"/>Loading...
                </td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={10} style={{ ...TD, textAlign:'center', padding:40, color:'#9ca3af' }}>
                  <i className="ri-box-3-line" style={{ fontSize:32, display:'block', marginBottom:8 }}/>No products found
                </td></tr>
              ) : products.map(p => {
                const sc = getStatusCfg(p)
                return (
                  <tr key={p.id}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={TD}>
                      <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} style={{ cursor:'pointer' }}/>
                    </td>
                    <td style={TD}>
                      <div style={{ fontWeight:600 }}>{p.name}</div>
                      <div style={{ fontSize:11, color:S }}>{p.unit_of_measure || p.unit}</div>
                    </td>
                    <td style={TD}>
                      <span style={{ fontSize:12, color:'#d53f8c', fontWeight:600, fontFamily:'var(--font-mono, monospace)' }}>{p.sku}</span>
                    </td>
                    <td style={TD}>
                      <span style={{ background:'#f9fafb', color:'#374151', border:`1px solid ${B}`, borderRadius:4, padding:'3px 10px', fontSize:11, fontWeight:600 }}>
                        {p.category_name || '—'}
                      </span>
                    </td>
                    <td style={TD}>
                      <span style={{ fontWeight:700, color:stockColor(p) }}>{p.stock}</span>
                    </td>
                    <td style={{ ...TD, color:S }}>{p.low_stock_threshold || 0}</td>
                    <td style={TD}>
                      <span style={{ fontWeight: r => r.status==='active'?700:500 }}>
                        ₦{Number(p.cost_price || 0).toLocaleString()}
                      </span>
                    </td>
                    <td style={TD}>₦{Number(p.unit_price || p.price || 0).toLocaleString()}</td>
                    <td style={TD}><span style={{ color:S }}>{formatDate(p.updated_at || p.created_at)}</span></td>
                    <td style={TD}><span style={{ background:sc.bg, color:sc.color, borderRadius:50, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{sc.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding:'12px 20px', fontSize:12, color:S, borderTop:`1px solid ${B}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <span>Showing {products.length} of {meta.total} products</span>
          {meta.pages > 1 && (
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ ...btnL, padding:'5px 12px', fontSize:12, opacity:page===1?0.4:1 }}>
                <i className="ri-arrow-left-s-line"/>Prev
              </button>
              <span style={{ display:'flex', alignItems:'center', fontSize:12, color:'#374151', fontWeight:600 }}>Page {page} / {meta.pages}</span>
              <button onClick={() => setPage(p => Math.min(meta.pages,p+1))} disabled={page===meta.pages} style={{ ...btnL, padding:'5px 12px', fontSize:12, opacity:page===meta.pages?0.4:1 }}>
                Next<i className="ri-arrow-right-s-line"/>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
