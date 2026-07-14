import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const SEV_CFG = {
  out_of_stock: { label:'Out of Stock', bg:'#dc2626', color:'#fff',    icon:'ri-close-circle-fill',  border:'#f06548' },
  critical:     { label:'Critical',     bg:'#fee2e2', color:'#991b1b', icon:'ri-error-warning-fill', border:'#f06548' },
  low:          { label:'Low Stock',    bg:'#fef9c3', color:'#854d0e', icon:'ri-alert-fill',         border:'#f7b84b' },
}

const inp  = { display:'block', width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontFamily:'Nunito,sans-serif', fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box' }
const btnP = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:'#1B4332', color:'#fff', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:13 }
const btnL = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:600, fontSize:13 }
const TH   = { padding:'10px 16px', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left', whiteSpace:'nowrap' }
const TD   = { padding:'12px 16px', verticalAlign:'middle', borderBottom:'1px solid #f3f4f6', fontSize:13, color:'#111827' }
const LBL  = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }

function getSeverity(item) {
  if (item.stock_quantity === 0) return 'out_of_stock'
  const pct = item.reorder_level > 0 ? item.stock_quantity / item.reorder_level : 1
  if (pct <= 0.5) return 'critical'
  return 'low'
}

export default function StockAlerts() {
  const [alerts,      setAlerts]   = useState([])
  const [loading,     setLoading]  = useState(false)
  const [search,      setSearch]   = useState('')
  const [filterSev,   setSev]      = useState('all')
  const [editReorder, setEditReorder] = useState(null)  // { id, reorder_level }
  const [saving,      setSaving]   = useState(false)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/alerts')
      setAlerts(res.data.alerts || [])
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load alerts') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const enriched = alerts.map(a => ({ ...a, severity: getSeverity(a) }))

  const visible = enriched.filter(a => {
    const m = (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
              (a.sku  || '').toLowerCase().includes(search.toLowerCase())
    return m && (filterSev === 'all' || a.severity === filterSev)
  })

  const stats = {
    total:    alerts.length,
    out:      enriched.filter(a => a.severity === 'out_of_stock').length,
    critical: enriched.filter(a => a.severity === 'critical').length,
    low:      enriched.filter(a => a.severity === 'low').length,
  }

  function openReorder(a) { setEditReorder({ id: a.id, reorder_level: a.reorder_level }) }
  function closeReorder() { setEditReorder(null) }

  async function saveReorder(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch(`/admin/inventory/products/${editReorder.id}/reorder`, { reorder_level: Number(editReorder.reorder_level) })
      toast.success('Reorder level updated')
      closeReorder()
      fetchAlerts()
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'#111827' }}>Low Stock Alerts</div>
          <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Inventory / Low Stock Alerts</div>
        </div>
      </div>

      {/* Critical banner */}
      {stats.out > 0 && (
        <div style={{ background:'#fef0ed', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:20, color:'#7f1d1d' }}>
          <i className="ri-close-circle-fill" style={{ fontSize:18, color:'#dc2626', flexShrink:0 }}/>
          <span style={{ fontSize:13 }}><strong>{stats.out} product{stats.out > 1 ? 's' : ''} are completely out of stock</strong> — adjust stock levels or contact suppliers.</span>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Alerts', value:stats.total,    icon:'ri-alert-line',        color:'#405189', filter:'all'          },
          { label:'Out of Stock', value:stats.out,      icon:'ri-close-circle-line',  color:'#f06548', filter:'out_of_stock' },
          { label:'Critical',     value:stats.critical, icon:'ri-error-warning-line', color:'#ef4444', filter:'critical'     },
          { label:'Low Stock',    value:stats.low,      icon:'ri-subtract-line',      color:'#f7b84b', filter:'low'          },
        ].map(c => (
          <div key={c.label} onClick={() => setSev(c.filter)}
            style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', borderLeft:`3px solid ${c.color}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:12, cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
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

      {/* Alert table card */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f3f4f6', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:15 }}/>
            <input style={{ ...inp, paddingLeft:32 }} placeholder="Search product, SKU…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select style={{ ...inp, width:'auto', minWidth:140 }} value={filterSev} onChange={e => setSev(e.target.value)}>
            <option value="all">All Alerts</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="critical">Critical</option>
            <option value="low">Low Stock</option>
          </select>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, fontFamily:'Nunito,sans-serif' }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                {['Product','SKU','Category','Warehouse','Current Stock','Reorder Level','Shortage','Severity','Action'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:'40px 0' }}>
                  <div className="spinner-border spinner-border-sm text-primary me-2"/>Loading...
                </td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={9} style={{ ...TD, textAlign:'center', padding:40, color:'#9ca3af' }}>
                  <i className="ri-checkbox-circle-line" style={{ fontSize:32, display:'block', marginBottom:8, color:'#0ab39c' }}/>
                  {alerts.length === 0 ? 'No alerts — all products well stocked!' : 'No alerts match your filters.'}
                </td></tr>
              ) : visible.map(a => {
                const sc       = SEV_CFG[a.severity]
                const shortage = Math.max(0, a.reorder_level - a.stock_quantity)
                return (
                  <tr key={a.id} style={{ borderLeft:`3px solid ${sc.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={TD}>
                      <div style={{ fontWeight:600 }}>{a.name}</div>
                    </td>
                    <td style={TD}><code style={{ fontSize:12, background:'#f3f4f6', padding:'2px 6px', borderRadius:4 }}>{a.sku}</code></td>
                    <td style={TD}><span style={{ background:'#f9fafb', color:'#374151', border:'1px solid #e5e7eb', borderRadius:50, padding:'3px 10px', fontSize:11, fontWeight:600 }}>{a.category_name || '—'}</span></td>
                    <td style={TD}>{a.warehouse_name || '—'}</td>
                    <td style={TD}><span style={{ fontWeight:700, color: a.stock_quantity === 0 ? '#f06548' : '#f7b84b' }}>{a.stock_quantity}</span></td>
                    <td style={TD}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ color:'#6b7280' }}>{a.reorder_level}</span>
                        <button onClick={() => openReorder(a)} title="Edit reorder level" style={{ width:22, height:22, borderRadius:5, border:'none', background:'#dbeafe', color:'#1d4ed8', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>
                          <i className="ri-pencil-line"/>
                        </button>
                      </div>
                    </td>
                    <td style={TD}><span style={{ fontWeight:700, color:'#dc2626' }}>{shortage > 0 ? `-${shortage}` : '—'}</span></td>
                    <td style={TD}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700, background:sc.bg, color:sc.color }}>
                        <i className={sc.icon}/>{sc.label}
                      </span>
                    </td>
                    <td style={TD}>
                      <a href="/inventory/stock-in" title="Reorder" style={{ width:30, height:30, borderRadius:7, border:'none', background:'#dbeafe', color:'#1d4ed8', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', textDecoration:'none' }}>
                        <i className="ri-shopping-cart-add-line"/>
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'12px 20px', fontSize:12, color:'#6b7280', borderTop:'1px solid #f3f4f6' }}>
          Showing {visible.length} of {stats.total} alerts
        </div>
      </div>

      {/* Edit reorder level modal */}
      {editReorder && <>
        <div onClick={closeReorder} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1054 }}/>
        <div style={{ position:'fixed', inset:0, zIndex:1055, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:360, boxShadow:'0 8px 40px rgba(0,0,0,0.18)', padding:28 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, marginBottom:4 }}>Update Reorder Level</div>
            <div style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>Set the minimum quantity that triggers a reorder alert.</div>
            <form onSubmit={saveReorder}>
              <div style={{ marginBottom:20 }}>
                <label style={LBL}>New Reorder Level <span style={{ color:'#dc2626' }}>*</span></label>
                <input type="number" style={inp} min="0" required value={editReorder.reorder_level} onChange={e => setEditReorder(r => ({...r, reorder_level: e.target.value}))}/>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" onClick={closeReorder} style={{ ...btnL, flex:1, justifyContent:'center' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ ...btnP, flex:1, justifyContent:'center', opacity:saving?0.7:1 }}>
                  {saving ? 'Saving…' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </>}
    </div>
  )
}
