import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const STATUS_CFG = {
  in_stock:     { label:'In Stock',     bg:'#dcfce7', color:'#166534' },
  low_stock:    { label:'Low Stock',    bg:'#fef9c3', color:'#854d0e' },
  out_of_stock: { label:'Out of Stock', bg:'#fee2e2', color:'#991b1b' },
  active:       { label:'Active',       bg:'#dcfce7', color:'#166534' },
  inactive:     { label:'Inactive',     bg:'#f3f4f6', color:'#6b7280' },
}

const UNITS = ['kg','g','litre','ml','pack','piece','bunch','bag','crate','tuber','bottle','dozen','carton']

const btnL = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:600, fontSize:13 }
const TH   = { padding:'10px 16px', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left', whiteSpace:'nowrap' }
const TD   = { padding:'12px 16px', verticalAlign:'middle', borderBottom:'1px solid #f3f4f6', fontSize:13, color:'#111827' }
const inp  = { display:'block', width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontFamily:'Nunito,sans-serif', fontSize:13, outline:'none', background:'#fff', color:'#111827', boxSizing:'border-box' }

export default function StockList() {
  const [products,    setProducts]  = useState([])
  const [loading,     setLoading]   = useState(false)
  const [page,        setPage]      = useState(1)
  const [search,      setSearch]    = useState('')
  const [meta,        setMeta]      = useState({ total:0, pages:1, stats:{} })
  const [categories,  setCats]      = useState([])
  const [warehouses,  setWarehouses]= useState([])
  const [filterCat,   setFilterCat] = useState('')
  const [filterWH,    setFilterWH]  = useState('')
  const [stockStatus, setStockStatus] = useState('')
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit:20, search }
      if (filterCat)        params.category_id  = filterCat
      if (filterWH)         params.warehouse_id = filterWH
      if (stockStatus)      params.stock_status = stockStatus
      const res = await api.get('/admin/inventory', { params })
      setProducts(res.data.products || [])
      setMeta({ total: res.data.total || 0, pages: res.data.pages || 1, stats: res.data.stats || {} })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load products') }
    finally { setLoading(false) }
  }, [page, search, filterCat, filterWH, stockStatus])

  const fetchMeta = useCallback(async () => {
    try {
      const [catRes, whRes] = await Promise.all([
        api.get('/categories'),
        api.get('/admin/inventory/warehouses'),
      ])
      setCats(catRes.data.categories || catRes.data || [])
      setWarehouses(whRes.data.warehouses || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchMeta() }, [fetchMeta])
  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Debounce search: reset page to 1 on search change
  useEffect(() => { setPage(1) }, [search, filterCat, filterWH, stockStatus])

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

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'#111827' }}>Stock List</div>
          <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Inventory / Stock List</div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total SKUs',   value:totals.all, icon:'ri-box-3-line',          color:'#405189' },
          { label:'In Stock',     value:Math.max(0, totals.all - totals.low - totals.out), icon:'ri-checkbox-circle-line', color:'#0ab39c' },
          { label:'Low Stock',    value:totals.low, icon:'ri-alert-line',           color:'#f7b84b' },
          { label:'Out of Stock', value:totals.out, icon:'ri-close-circle-line',    color:'#f06548' },
        ].map(c => (
          <div key={c.label} style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', borderLeft:`3px solid ${c.color}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:`${c.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:20, color:c.color }}/>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:c.color }}>{c.value}</div>
              <div style={{ fontSize:11, color:'#6b7280' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f3f4f6', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:15 }}/>
            <input style={{ ...inp, paddingLeft:32 }} placeholder="Search product, SKU…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select style={{ ...inp, width:'auto', minWidth:140 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select style={{ ...inp, width:'auto', minWidth:140 }} value={filterWH} onChange={e => setFilterWH(e.target.value)}>
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select style={{ ...inp, width:'auto', minWidth:140 }} value={stockStatus} onChange={e => setStockStatus(e.target.value)}>
            <option value="">All Stock Status</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, fontFamily:'Nunito,sans-serif' }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                {['Image','Product','SKU','Category','Warehouse','Stock','Reorder','Unit Price','Status'].map(h => (
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
                const isLow = p.stock > 0 && p.stock <= (p.low_stock_threshold || 0)
                return (
                  <tr key={p.id}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={TD}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{ width:36, height:36, borderRadius:8, objectFit:'cover', border:'1px solid #e5e7eb' }}/>
                        : <div style={{ width:36, height:36, borderRadius:8, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="ri-image-line" style={{ color:'#9ca3af' }}/></div>
                      }
                    </td>
                    <td style={TD}>
                      <div style={{ fontWeight:600 }}>{p.name}</div>
                      <div style={{ fontSize:11, color:'#6b7280' }}>{p.unit_of_measure}</div>
                    </td>
                    <td style={TD}><code style={{ fontSize:12, background:'#f3f4f6', padding:'2px 6px', borderRadius:4 }}>{p.sku}</code></td>
                    <td style={TD}><span style={{ background:'#f9fafb', color:'#374151', border:'1px solid #e5e7eb', borderRadius:50, padding:'3px 10px', fontSize:11, fontWeight:600 }}>{p.category_name || '—'}</span></td>
                    <td style={TD}>{p.warehouse_name || '—'}</td>
                    <td style={TD}>
                      <span style={{ fontWeight:700, color:stockColor(p) }}>{p.stock}</span>
                      {isLow && p.stock > 0 && (
                        <span style={{ marginLeft:6, fontSize:10, background:'#fef9c3', color:'#854d0e', borderRadius:4, padding:'1px 5px', fontWeight:700 }}>LOW</span>
                      )}
                      {p.stock === 0 && (
                        <span style={{ marginLeft:6, fontSize:10, background:'#fee2e2', color:'#991b1b', borderRadius:4, padding:'1px 5px', fontWeight:700 }}>OUT</span>
                      )}
                    </td>
                    <td style={{ ...TD, color:'#6b7280' }}>{p.low_stock_threshold || 0}</td>
                    <td style={TD}>₦{Number(p.unit_price || 0).toLocaleString()}</td>
                    <td style={TD}><span style={{ background:sc.bg, color:sc.color, borderRadius:50, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{sc.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding:'12px 20px', fontSize:12, color:'#6b7280', borderTop:'1px solid #f3f4f6', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
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
