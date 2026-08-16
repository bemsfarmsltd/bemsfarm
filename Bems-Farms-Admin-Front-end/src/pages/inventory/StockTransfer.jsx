import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const inp  = { display:'block', width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:8, fontFamily:'Nunito,sans-serif', fontSize:13, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)', boxSizing:'border-box' }
const btnP = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:'var(--orange-accent)', color:'#fff', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:13 }
const btnL = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'1.5px solid var(--border)', background:'var(--bg-card)', color:'var(--text-secondary)', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:600, fontSize:13 }
const TH   = { padding:'10px 16px', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left', whiteSpace:'nowrap' }
const TD   = { padding:'12px 16px', verticalAlign:'middle', borderBottom:'1px solid var(--border)', fontSize:13, color:'var(--text-primary)' }
const LBL  = { display:'block', fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:6 }

function Modal({ title, onClose, children }) {
  return <>
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1054 }}/>
    <div style={{ position:'fixed', inset:0, zIndex:1055, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, width:'100%', maxWidth:640, boxShadow:'0 8px 40px rgba(0,0,0,0.18)', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ background:'var(--orange-accent)', color:'#fff', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15 }}>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer', fontSize:20, display:'flex', padding:4 }}><i className="ri-close-line"/></button>
        </div>
        <div style={{ padding:24, overflowY:'auto' }}>{children}</div>
      </div>
    </div>
  </>
}

const BLANK_FORM = { product_id:'', warehouse_id:'', destination_warehouse_id:'', quantity:1, notes:'' }

export default function StockTransfer() {
  const navigate = useNavigate()
  const [movements,  setMovements] = useState([])
  const [loading,    setLoading]   = useState(false)
  const [page,       setPage]      = useState(1)
  const [search,     setSearch]    = useState('')
  const [meta,       setMeta]      = useState({ total:0, pages:1 })
  const [products,   setProducts]  = useState([])
  const [warehouses, setWarehouses]= useState([])
  const [showForm,   setShowForm]  = useState(false)
  const [form,       setForm]      = useState(BLANK_FORM)
  const [saving,     setSaving]    = useState(false)

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit:20, type:'transfer', search }
      const res = await api.get('/admin/inventory/movements', { params })
      setMovements(res.data.movements || [])
      setMeta({ total: res.data.total || 0, pages: res.data.pages || 1 })
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to load transfers') 
    } finally { 
      setLoading(false) 
    }
  }, [page, search])

  const fetchLookups = useCallback(async () => {
    try {
      const [pRes, wRes] = await Promise.all([
        api.get('/admin/inventory', { params: { limit:200 } }),
        api.get('/admin/inventory/warehouses'),
      ])
      setProducts(pRes.data.products || [])
      setWarehouses(wRes.data.warehouses || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchLookups() }, [fetchLookups])
  useEffect(() => { fetchMovements() }, [fetchMovements])
  useEffect(() => { setPage(1) }, [search])

  function openForm() { setForm(BLANK_FORM); setShowForm(true) }
  function close()    { setShowForm(false) }

  async function saveForm(e) {
    e.preventDefault()
    if (form.warehouse_id === form.destination_warehouse_id) {
      toast.error('Source and destination warehouses must be different')
      return
    }
    setSaving(true)
    try {
      const destWarehouse = warehouses.find(w => String(w.id) === String(form.destination_warehouse_id))
      const notes = form.notes
        ? `→ ${destWarehouse?.name || form.destination_warehouse_id} | ${form.notes}`
        : `→ ${destWarehouse?.name || form.destination_warehouse_id}`

      await api.post('/admin/inventory/transfer', {
        product_id:        Number(form.product_id),
        from_warehouse_id: Number(form.warehouse_id),
        to_warehouse_id:   Number(form.destination_warehouse_id),
        quantity:          Number(form.quantity),
        notes,
      })
      toast.success('Transfer recorded')
      close()
      fetchMovements()
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to record transfer') 
    } finally { 
      setSaving(false) 
    }
  }

  function getDestination(m) {
    const notes = m.notes || ''
    const match = notes.match(/→ ([^\|]+)/)
    return match ? match[1].trim() : 'Dry Store'
  }

  function getExtraNotes(m) {
    const notes = m.notes || ''
    const parts = notes.split('|')
    return parts.length > 1 ? parts.slice(1).join('|').trim() : notes.includes('→') ? 'Restock' : notes
  }

  // Transfers are recorded as an already-applied stock movement pair — the
  // backend has no pending/in-transit workflow, so every real transfer is
  // Completed the moment it's created. (Previously this badge was randomly
  // derived from `id % 4` / `id % 5`, which was meaningless.)
  const getStatusCfg = () => ({ label: 'Completed', bg: '#dcfce7', color: '#15803d' })

  const statValues = useMemo(() => ({
    total: meta.total,
    completed: movements.length,
  }), [movements, meta])

  function formatDate(d) {
    if (!d) return '—'
    const date = new Date(d)
    return date.toISOString().slice(0, 10)
  }

  function yearOf(d) {
    return new Date(d || Date.now()).getFullYear()
  }

  const B = 'var(--border)', S = '#6b7280'

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      {/* Header & Breadcrumbs */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, color:'var(--text-primary)' }}>Stock Transfer</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
          <span style={{ cursor:'pointer' }} onClick={()=>navigate('/products')}>Inventory</span>
          <i className="ri-arrow-right-s-line" style={{ fontSize:19 }} />
          <span style={{ fontWeight:600, color:'var(--text-primary)' }}>Stock Transfer</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-stats-auto" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Transfers', value:statValues.total,     icon:'ri-file-text-line', color:'#405189', valueColor:'var(--text-primary)' },
          { label:'Completed',       value:statValues.completed, icon:'ri-checkbox-circle-line', color:'#0ab39c', valueColor:'#0ab39c' },
        ].map(c => (
          <div key={c.label} style={{ background:'var(--bg-card)', borderRadius:12, border:`1px solid ${B}`, borderLeft:`3px solid ${c.color}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
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
      <div style={{ background:'var(--bg-card)', borderRadius:12, border:`1px solid ${B}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${B}`, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:220 }}>
            <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-light)', fontSize:20 }}/>
            <input style={{ ...inp, paddingLeft:32 }} placeholder="Search reference, product, w..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <button style={btnP} onClick={openForm}><i className="ri-add-line"/>New Transfer</button>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, fontFamily:'Nunito,sans-serif' }}>
            <thead>
              <tr style={{ background:'var(--bg-subtle)', borderBottom:`1px solid ${B}` }}>
                {['Ref No','Date','From','To','Products','Total Qty','Status','Notes'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:'40px 0' }}>
                  <div className="spinner-border spinner-border-sm text-primary me-2"/>Loading...
                </td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={8} style={{ ...TD, textAlign:'center', padding:40, color:'var(--text-light)' }}>
                  <i className="ri-swap-box-line" style={{ fontSize:43, display:'block', marginBottom:8 }}/>No transfers found
                </td></tr>
              ) : movements.map(m => {
                const sc = getStatusCfg(m)
                const refNo = `TRF-${yearOf(m.created_at)}-00${m.id}`
                const dest = getDestination(m)
                const source = m.warehouse_name || 'Main Store'
                return (
                  <tr key={m.id}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={{ ...TD, color:'#b45309', fontWeight:600 }}>{refNo}</td>
                    <td style={TD}><span style={{ color:S }}>{formatDate(m.created_at)}</span></td>
                    <td style={TD}>
                      <span style={{ background:'var(--bg-muted)', color:'var(--text-secondary)', borderRadius:4, padding:'3px 8px', fontSize:11, fontWeight:600, display:'inline-flex', alignItems:'center', gap:4 }}>
                        <i className="ri-store-2-line"/>{source}
                      </span>
                    </td>
                    <td style={TD}>
                      <span style={{ background:'#ffedd5', color:'#d97706', borderRadius:4, padding:'3px 8px', fontSize:11, fontWeight:600, display:'inline-flex', alignItems:'center', gap:4 }}>
                        <i className="ri-store-3-line"/>{dest}
                      </span>
                    </td>
                    <td style={{ ...TD, fontWeight:600 }}>{m.product_name || 'Chicken, Fresh Milk'}</td>
                    <td style={{ ...TD, fontWeight:700 }}>{m.quantity}</td>
                    <td style={TD}>
                      <span style={{ background:sc.bg, color:sc.color, borderRadius:4, padding:'3px 10px', fontSize:11, fontWeight:700 }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ ...TD, maxWidth:180, whiteSpace:'normal', fontSize:12, color:S }}>{getExtraNotes(m)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding:'12px 20px', fontSize:12, color:S, borderTop:`1px solid ${B}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <span>Showing {movements.length} of {meta.total} transfers</span>
          {meta.pages > 1 && (
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ ...btnL, padding:'5px 12px', fontSize:12, opacity:page===1?0.4:1 }}>
                <i className="ri-arrow-left-s-line"/>Prev
              </button>
              <span style={{ display:'flex', alignItems:'center', fontSize:12, color:'var(--text-secondary)', fontWeight:600 }}>Page {page} / {meta.pages}</span>
              <button onClick={() => setPage(p => Math.min(meta.pages,p+1))} disabled={page===meta.pages} style={{ ...btnL, padding:'5px 12px', fontSize:12, opacity:page===meta.pages?0.4:1 }}>
                Next<i className="ri-arrow-right-s-line"/>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Transfer Modal */}
      {showForm && (
        <Modal title="New Stock Transfer" onClose={close}>
          <form onSubmit={saveForm}>
            <div style={{ marginBottom:16 }}>
              <label style={LBL}>Product <span style={{ color:'#dc2626' }}>*</span></label>
              <select style={inp} required value={form.product_id} onChange={e => setForm(f=>({...f,product_id:e.target.value}))}>
                <option value="">— Select Product —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Transfer direction visual */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center', marginBottom:16 }}>
              <div>
                <label style={LBL}>From Warehouse <span style={{ color:'#dc2626' }}>*</span></label>
                <select style={inp} required value={form.warehouse_id} onChange={e => setForm(f=>({...f,warehouse_id:e.target.value}))}>
                  <option value="">— Source —</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div style={{ textAlign:'center', paddingTop:22 }}>
                <i className="ri-arrow-right-line" style={{ fontSize:30, color:'#299cdb' }}/>
              </div>
              <div>
                <label style={LBL}>To Warehouse <span style={{ color:'#dc2626' }}>*</span></label>
                <select style={inp} required value={form.destination_warehouse_id} onChange={e => setForm(f=>({...f,destination_warehouse_id:e.target.value}))}>
                  <option value="">— Destination —</option>
                  {warehouses.filter(w => String(w.id) !== String(form.warehouse_id)).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={LBL}>Quantity <span style={{ color:'#dc2626' }}>*</span></label>
              <input type="number" style={inp} min="1" required value={form.quantity} onChange={e => setForm(f=>({...f,quantity:e.target.value}))}/>
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={LBL}>Notes</label>
              <textarea style={{ ...inp, resize:'vertical', minHeight:70 }} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional transfer notes…"/>
            </div>

            {form.warehouse_id && form.destination_warehouse_id && form.warehouse_id === form.destination_warehouse_id && (
              <div style={{ background:'#fee2e2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#991b1b' }}>
                Source and destination warehouses cannot be the same.
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={close} style={{ ...btnL, flex:1, justifyContent:'center' }}>Cancel</button>
              <button type="submit" disabled={saving || form.warehouse_id === form.destination_warehouse_id} style={{ ...btnP, flex:1, justifyContent:'center', opacity:saving?0.7:1 }}>
                {saving ? 'Creating…' : 'Create Transfer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
