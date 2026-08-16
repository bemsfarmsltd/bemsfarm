import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const CAT_COLORS = ['#405189','#0ab39c','#f7b84b','#f06548','#299cdb','#845ec2','#ff9671','#4b8bbe']

const TH = { padding:'10px 16px', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left', whiteSpace:'nowrap' }
const TD = { padding:'12px 16px', verticalAlign:'middle', borderBottom:'1px solid var(--border)', fontSize:13, color:'var(--text-primary)' }

export default function StockValuation() {
  const navigate = useNavigate()
  const [products,   setProducts]  = useState([])
  const [loading,    setLoading]   = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory', { params: { limit:1000, page:1 } })
      setProducts(res.data.products || [])
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to load products') 
    } finally { 
      setLoading(false) 
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const enriched = useMemo(() => products.map(p => {
    const qty = p.stock || p.stock_quantity || 0
    const cost = p.cost_price || 0
    const price = p.unit_price || p.price || 0
    return {
      ...p,
      stock_quantity: qty,
      cost_price: cost,
      unit_price: price,
      costValue:   qty * cost,
      retailValue: qty * price,
      profit:      qty * (price - cost),
      margin:      price > 0 ? Math.round(((price - cost) / price) * 100) : 0,
    }
  }), [products])

  const totals = useMemo(() => enriched.reduce((acc,p) => ({
    costValue:   acc.costValue   + p.costValue,
    retailValue: acc.retailValue + p.retailValue,
    profit:      acc.profit      + p.profit,
    units:       acc.units       + p.stock_quantity,
  }), { costValue:0, retailValue:0, profit:0, units:0 }), [enriched])

  const categories = useMemo(() => [...new Set(products.map(p => p.category_name).filter(Boolean))], [products])

  const byCategory = useMemo(() => categories.map((cat, i) => {
    const items    = enriched.filter(p => p.category_name === cat)
    const catCost  = items.reduce((s,p) => s + p.costValue, 0)
    const catValue = items.reduce((s,p) => s + p.retailValue, 0)
    const totalQty = items.reduce((s,p) => s + p.stock_quantity, 0)
    const pct      = totals.retailValue > 0 ? Math.round((catValue / totals.retailValue) * 100) : 0
    return { cat, count: items.length, totalQty, costVal: catCost, retailVal: catValue, pct, color: CAT_COLORS[i % CAT_COLORS.length] }
  }).sort((a,b) => b.retailVal - a.retailVal), [categories, enriched, totals])

  const avgMargin = totals.retailValue > 0
    ? Math.round((totals.profit / totals.retailValue) * 100)
    : 0

  const B = 'var(--border)', S = '#6b7280'

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:300, fontFamily:'var(--body-font)', color:'var(--text-muted)' }}>
      <i className="ri-loader-4-line" style={{ fontSize:49, display:'block', marginBottom:8, textAlign:'center' }}/>
    </div>
  )

  return (
    <div style={{ fontFamily:'var(--body-font)' }}>
      {/* Header & Breadcrumbs */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'var(--heading-font)', fontWeight:800, fontSize:20, color:'var(--text-primary)' }}>Stock Valuation</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
          <span style={{ cursor:'pointer' }} onClick={()=>navigate('/products')}>Inventory</span>
          <i className="ri-arrow-right-s-line" style={{ fontSize:19 }} />
          <span style={{ fontWeight:600, color:'var(--text-primary)' }}>Valuation</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-stats-auto" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Cost Value (Stock)', value:`₦${totals.costValue.toLocaleString()}`, subText:'At purchase price', icon:'ri-box-3-line', color:'#405189', valueColor:'#405189' },
          { label:'Retail Value (Stock)', value:`₦${totals.retailValue.toLocaleString()}`, subText:'At selling price', icon:'ri-store-line', color:'#0ab39c', valueColor:'#0ab39c' },
          { label:'Potential Profit', value:`₦${totals.profit.toLocaleString()}`, subText:'If all stock sold', icon:'ri-line-chart-line', color:'#299cdb', valueColor:'#299cdb' },
          { label:'Avg Gross Margin', value:`${avgMargin}%`, subText:'Across all products', icon:'ri-percent-line', color:'#f7b84b', valueColor:'#f7b84b' },
        ].map(c => (
          <div key={c.label} style={{ background:'var(--bg-card)', borderRadius:12, border:`1px solid ${B}`, borderLeft:`3px solid ${c.color}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:`${c.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:20, color:c.color }}/>
            </div>
            <div style={{ minWidth:0, overflow:'hidden' }}>
              <div style={{ fontSize:22, fontWeight:800, color:c.valueColor, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.value}</div>
              <div style={{ fontSize:11, color:S, fontWeight:600 }}>{c.label}</div>
              <div style={{ fontSize:10, color:S, marginTop:2 }}>{c.subText}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Valuation by Category */}
      <div style={{ background:'var(--bg-card)', borderRadius:12, border:`1px solid ${B}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', padding:24, marginBottom:24 }}>
        <div style={{ fontFamily:'var(--heading-font)', fontWeight:700, fontSize:14, marginBottom:16, color:'var(--text-primary)' }}>Valuation by Category</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--bg-subtle)', borderBottom:`1px solid ${B}` }}>
                {['Category','Products','Total Qty','Cost Value','Retail Value','% of Total'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byCategory.map(c => (
                <tr key={c.cat}>
                  <td style={TD}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:c.color }}/>
                      {c.cat}
                    </div>
                  </td>
                  <td style={TD}>{c.count}</td>
                  <td style={TD}>{c.totalQty}</td>
                  <td style={TD}>₦{c.costVal.toLocaleString()}</td>
                  <td style={{ ...TD, fontWeight:600 }}>₦{c.retailVal.toLocaleString()}</td>
                  <td style={TD}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ height:6, background:'var(--bg-muted)', borderRadius:50, overflow:'hidden', flex:1, minWidth:100 }}>
                        <div style={{ height:'100%', width:`${c.pct}%`, background:c.color, borderRadius:50 }}/>
                      </div>
                      <span style={{ fontSize:11, color:S, width:26, textAlign:'right' }}>{c.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product-Level Valuation */}
      <div style={{ background:'var(--bg-card)', borderRadius:12, border:`1px solid ${B}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${B}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:'var(--heading-font)', fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>Product-Level Valuation</div>
          <span style={{ background:'var(--bg-muted)', color:S, fontSize:11, padding:'3px 10px', borderRadius:50, fontWeight:600 }}>
            {products.length} product{products.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--bg-subtle)', borderBottom:`1px solid ${B}` }}>
                {['Product','SKU','Category','Qty','Unit Cost','Sell Price','Cost Value','Retail Value','Potential Profit'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 ? (
                <tr><td colSpan={9} style={{ ...TD, textAlign:'center', padding:40, color:'var(--text-light)' }}>
                  <i className="ri-bar-chart-line" style={{ fontSize:43, display:'block', marginBottom:8 }}/>No products found
                </td></tr>
              ) : enriched.map(p => (
                <tr key={p.id}
                  onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background=''}>
                  <td style={{ ...TD, fontWeight:600 }}>{p.name}</td>
                  <td style={TD}>
                    <span style={{ fontSize:12, color:'#d53f8c', fontWeight:600, fontFamily:'var(--font-mono, monospace)' }}>{p.sku}</span>
                  </td>
                  <td style={TD}>
                    <span style={{ background:'var(--bg-subtle)', color:'var(--text-secondary)', border:`1px solid ${B}`, borderRadius:4, padding:'3px 10px', fontSize:11, fontWeight:600 }}>
                      {p.category_name || '—'}
                    </span>
                  </td>
                  <td style={{ ...TD, fontWeight:600 }}>{p.stock_quantity}</td>
                  <td style={TD}>₦{Number(p.cost_price || 0).toLocaleString()}</td>
                  <td style={TD}>₦{Number(p.unit_price || 0).toLocaleString()}</td>
                  <td style={TD}>₦{p.costValue.toLocaleString()}</td>
                  <td style={{ ...TD, fontWeight:600 }}>₦{p.retailValue.toLocaleString()}</td>
                  <td style={{ ...TD, fontWeight:600, color:'#0ab39c' }}>₦{p.profit.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:'var(--bg-subtle)', borderTop:`2px solid ${B}` }}>
                <td colSpan={6} style={{ ...TD, fontWeight:700, fontSize:12 }}>Total</td>
                <td style={{ ...TD, fontWeight:700 }}>₦{totals.costValue.toLocaleString()}</td>
                <td style={{ ...TD, fontWeight:700 }}>₦{totals.retailValue.toLocaleString()}</td>
                <td style={{ ...TD, fontWeight:700, color:'#0ab39c' }}>₦{totals.profit.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
