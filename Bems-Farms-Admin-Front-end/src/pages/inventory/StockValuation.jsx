import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const CAT_COLORS = ['#405189','#0ab39c','#f7b84b','#f06548','#299cdb','#845ec2','#ff9671','#4b8bbe']

const TH = { padding:'10px 16px', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left', whiteSpace:'nowrap' }
const TD = { padding:'12px 16px', verticalAlign:'middle', borderBottom:'1px solid #f3f4f6', fontSize:13, color:'#111827' }
const inp= { display:'block', width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontFamily:'Nunito,sans-serif', fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box' }

export default function StockValuation() {
  const [products,   setProducts]  = useState([])
  const [loading,    setLoading]   = useState(false)
  const [search,     setSearch]    = useState('')
  const [filterCat,  setCat]       = useState('all')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all products without pagination (limit=1000 for full valuation view)
      const res = await api.get('/admin/inventory', { params: { limit:1000, page:1 } })
      setProducts(res.data.products || [])
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load products') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const enriched = useMemo(() => products.map(p => ({
    ...p,
    costValue:   (p.stock_quantity || 0) * (p.cost_price  || 0),
    retailValue: (p.stock_quantity || 0) * (p.unit_price  || 0),
    profit:      (p.stock_quantity || 0) * ((p.unit_price || 0) - (p.cost_price || 0)),
    margin:      (p.unit_price || 0) > 0 ? Math.round(((p.unit_price - (p.cost_price||0)) / p.unit_price) * 100) : 0,
  })), [products])

  const totals = useMemo(() => enriched.reduce((acc,p) => ({
    costValue:   acc.costValue   + p.costValue,
    retailValue: acc.retailValue + p.retailValue,
    profit:      acc.profit      + p.profit,
    units:       acc.units       + (p.stock_quantity || 0),
  }), { costValue:0, retailValue:0, profit:0, units:0 }), [enriched])

  const categories = useMemo(() => [...new Set(products.map(p => p.category_name).filter(Boolean))], [products])

  const byCategory = useMemo(() => categories.map((cat, i) => {
    const items    = enriched.filter(p => p.category_name === cat)
    const catValue = items.reduce((s,p) => s + p.retailValue, 0)
    const pct      = totals.retailValue > 0 ? Math.round((catValue / totals.retailValue) * 100) : 0
    return { cat, count: items.length, value: catValue, pct, color: CAT_COLORS[i % CAT_COLORS.length] }
  }), [categories, enriched, totals])

  const filtered = useMemo(() => enriched.filter(p => {
    const m = (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
              (p.sku  || '').toLowerCase().includes(search.toLowerCase())
    return m && (filterCat === 'all' || p.category_name === filterCat)
  }), [enriched, search, filterCat])

  const filteredTotals = useMemo(() => filtered.reduce((acc,p) => ({
    costValue:   acc.costValue   + p.costValue,
    retailValue: acc.retailValue + p.retailValue,
    profit:      acc.profit      + p.profit,
  }), { costValue:0, retailValue:0, profit:0 }), [filtered])

  const avgMargin = totals.retailValue > 0
    ? Math.round((totals.profit / totals.retailValue) * 100)
    : 0

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'#111827' }}>Stock Valuation</div>
        <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Inventory / Valuation</div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:40, color:'#9ca3af' }}>
          <div className="spinner-border spinner-border-sm text-primary me-2"/>Computing valuation…
        </div>
      )}

      {!loading && <>
        {/* Top stat cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[
            { label:'Total Items',        value:`${products.length}`,                    icon:'ri-box-3-line',            color:'#405189' },
            { label:'Total Units',        value:totals.units.toLocaleString(),            icon:'ri-stack-line',            color:'#0ab39c' },
            { label:'Total Cost Value',   value:`₦${totals.costValue.toLocaleString()}`,  icon:'ri-money-cny-box-line',    color:'#f7b84b' },
            { label:'Total Retail Value', value:`₦${totals.retailValue.toLocaleString()}`,icon:'ri-store-line',            color:'#299cdb' },
          ].map(c => (
            <div key={c.label} style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', borderLeft:`3px solid ${c.color}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:`${c.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className={c.icon} style={{ fontSize:20, color:c.color }}/>
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:c.color }}>{c.value}</div>
                <div style={{ fontSize:11, color:'#6b7280' }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Secondary stat row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16, marginBottom:24 }}>
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', borderLeft:'3px solid #0ab39c', padding:'16px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'#0ab39c18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className="ri-line-chart-line" style={{ fontSize:20, color:'#0ab39c' }}/>
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:'#0ab39c' }}>₦{totals.profit.toLocaleString()}</div>
              <div style={{ fontSize:11, color:'#6b7280' }}>Gross Profit (Retail - Cost)</div>
            </div>
          </div>
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', borderLeft:'3px solid #f06548', padding:'16px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'#f0654818', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className="ri-percent-line" style={{ fontSize:20, color:'#f06548' }}/>
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:'#f06548' }}>{avgMargin}%</div>
              <div style={{ fontSize:11, color:'#6b7280' }}>Avg Gross Margin</div>
            </div>
          </div>
        </div>

        {/* Two-column: category breakdown + table */}
        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20 }}>
          {/* Category breakdown */}
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', padding:20 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:16, color:'#111827' }}>Value by Category</div>
            {byCategory.length === 0 && (
              <div style={{ color:'#9ca3af', fontSize:12 }}>No category data</div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {byCategory.map(c => (
                <div key={c.cat}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:12 }}>
                    <span style={{ fontWeight:600, color:'#374151' }}>{c.cat}</span>
                    <span style={{ color:'#6b7280' }}>{c.pct}%</span>
                  </div>
                  <div style={{ height:6, background:'#f3f4f6', borderRadius:50, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${c.pct}%`, background:c.color, borderRadius:50 }}/>
                  </div>
                  <div style={{ fontSize:11, color:'#6b7280', marginTop:3 }}>₦{c.value.toLocaleString()} · {c.count} item{c.count>1?'s':''}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Valuation table */}
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden', minWidth:0 }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #f3f4f6', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ position:'relative', flex:1, minWidth:180 }}>
                <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:15 }}/>
                <input style={{ ...inp, paddingLeft:32 }} placeholder="Search product, SKU…" value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
              <select style={{ ...inp, width:'auto', minWidth:150 }} value={filterCat} onChange={e => setCat(e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                    {['Product','SKU','Category','Stock Qty','Cost Price','Retail Price','Cost Value','Retail Value','Profit','Margin'].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} style={{ ...TD, textAlign:'center', padding:40, color:'#9ca3af' }}>
                      <i className="ri-bar-chart-line" style={{ fontSize:32, display:'block', marginBottom:8 }}/>No products found
                    </td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id}
                      onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background=''}>
                      <td style={{ ...TD, fontWeight:600 }}>{p.name}</td>
                      <td style={TD}><code style={{ fontSize:11, background:'#f3f4f6', padding:'2px 6px', borderRadius:4 }}>{p.sku}</code></td>
                      <td style={TD}><span style={{ background:'#f9fafb', color:'#374151', border:'1px solid #e5e7eb', borderRadius:50, padding:'3px 8px', fontSize:11, fontWeight:600 }}>{p.category_name || '—'}</span></td>
                      <td style={{ ...TD, fontWeight:600 }}>{p.stock_quantity}</td>
                      <td style={TD}>₦{Number(p.cost_price || 0).toLocaleString()}</td>
                      <td style={TD}>₦{Number(p.unit_price || 0).toLocaleString()}</td>
                      <td style={TD}>₦{p.costValue.toLocaleString()}</td>
                      <td style={{ ...TD, fontWeight:600 }}>₦{p.retailValue.toLocaleString()}</td>
                      <td style={{ ...TD, fontWeight:600, color:'#0ab39c' }}>₦{p.profit.toLocaleString()}</td>
                      <td style={TD}>
                        <span style={{ background: p.margin >= 30 ? '#dcfce7' : p.margin >= 15 ? '#fef9c3' : '#fee2e2', color: p.margin >= 30 ? '#166534' : p.margin >= 15 ? '#854d0e' : '#991b1b', borderRadius:50, padding:'3px 8px', fontSize:11, fontWeight:700 }}>
                          {p.margin}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:'#f9fafb', borderTop:'2px solid #e5e7eb' }}>
                    <td colSpan={6} style={{ ...TD, fontWeight:700, fontSize:12 }}>TOTALS ({filtered.length} products)</td>
                    <td style={{ ...TD, fontWeight:700 }}>₦{filteredTotals.costValue.toLocaleString()}</td>
                    <td style={{ ...TD, fontWeight:700 }}>₦{filteredTotals.retailValue.toLocaleString()}</td>
                    <td style={{ ...TD, fontWeight:700, color:'#0ab39c' }}>₦{filteredTotals.profit.toLocaleString()}</td>
                    <td style={TD}/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </>}
    </div>
  )
}
