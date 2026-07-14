import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const REASONS = ['Physical Count Correction','Spoilage/Damage','Expiry Write-off','Theft/Loss','System Error Correction','Quality Rejection','Production Use','Promotional Giveaway','Other']

const inp  = { display:'block', width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontFamily:'Nunito,sans-serif', fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box' }
const btnP = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:'#1B4332', color:'#fff', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:13 }
const btnL = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:600, fontSize:13 }
const TH   = { padding:'10px 16px', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left', whiteSpace:'nowrap' }
const TD   = { padding:'12px 16px', verticalAlign:'middle', borderBottom:'1px solid #f3f4f6', fontSize:13, color:'#111827' }
const LBL  = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }

function Modal({ title, onClose, children }) {
  return <>
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1054 }}/>
    <div style={{ position:'fixed', inset:0, zIndex:1055, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:640, boxShadow:'0 8px 40px rgba(0,0,0,0.18)', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ background:'#1B4332', color:'#fff', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15 }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer', fontSize:20, display:'flex', padding:4 }}><i className="ri-close-line"/></button>
        </div>
        <div style={{ padding:24, overflowY:'auto' }}>{children}</div>
      </div>
    </div>
  </>
}

const BLANK_FORM = { product_id:'', warehouse_id:'', quantity:1, unit_cost:0, notes:'' }

export default function StockAdjustment() {
  const [movements,  setMovements] = useState([])
  const [loading,    setLoading]   = useState(false)
  const [page,       setPage]      = useState(1)
  const [search,     setSearch]    = useState('')
  const [dateFrom,   setDateFrom]  = useState('')
  const [dateTo,     setDateTo]    = useState('')
  const [meta,       setMeta]      = useState({ total:0, pages:1 })
  const [products,   setProducts]  = useState([])
  const [warehouses, setWarehouses]= useState([])
  const [showForm,   setShowForm]  = useState(false)
  const [form,       setForm]      = useState(BLANK_FORM)
  const [reason,     setReason]    = useState(REASONS[0])
  const [adjType,    setAdjType]   = useState('subtract')  // visual toggle: subtract = negative qty
  const [saving,     setSaving]    = useState(false)

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit:20, type:'adjustment', search }
      if (dateFrom) params.from = dateFrom
      if (dateTo)   params.to   = dateTo
      const res = await api.get('/admin/inventory/movements', { params })
      setMovements(res.data.movements || [])
      setMeta({ total: res.data.total || 0, pages: res.data.pages || 1 })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load adjustments') }
    finally { setLoading(false) }
  }, [page, search, dateFrom, dateTo])

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
  useEffect(() => { setPage(1) }, [search, dateFrom, dateTo])

  function openForm() { setForm(BLANK_FORM); setReason(REASONS[0]); setAdjType('subtract'); setShowForm(true) }
  function close()    { setShowForm(false) }

  async function saveForm(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const selectedProduct = products.find(p => p.id === Number(form.product_id))
      const currentStock = selectedProduct ? (selectedProduct.stock_quantity || selectedProduct.stock || 0) : 0
      const delta = adjType === 'add' ? Number(form.quantity) : -Number(form.quantity)
      const newQty = Math.max(0, currentStock + delta)

      // Encode reason + adjustment direction in notes
      const notes = `[${adjType === 'add' ? '+Addition' : '-Deduction'}] Reason: ${reason}${form.notes ? '. ' + form.notes : ''}`
      await api.post('/admin/inventory/adjust', {
        product_id: Number(form.product_id),
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
        new_quantity: newQty,
        reason: reason,
        notes,
      })
      toast.success('Adjustment recorded')
      close()
      fetchMovements()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to record adjustment') }
    finally { setSaving(false) }
  }

  const totalAdj = movements.reduce((s,m) => s + (m.quantity || 0), 0)

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB')
  }

  function getAdjType(m) {
    const notes = m.notes || ''
    if (notes.includes('+Addition')) return { label:'+Addition', bg:'#dcfce7', color:'#166534' }
    if (notes.includes('-Deduction')) return { label:'-Deduction', bg:'#fee2e2', color:'#991b1b' }
    return { label:'Adjustment', bg:'#f3f4f6', color:'#374151' }
  }

  function extractReason(m) {
    const notes = m.notes || ''
    const match = notes.match(/Reason: ([^.]+)/)
    return match ? match[1] : notes
  }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'#111827' }}>Stock Adjustments</div>
          <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Inventory / Adjustments</div>
        </div>
        <button onClick={openForm} style={btnP}><i className="ri-add-line"/>Add Adjustment</button>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Adjustments', value:meta.total,       icon:'ri-equalizer-line',  color:'#405189' },
          { label:'This Page',         value:movements.length, icon:'ri-file-list-line',  color:'#0ab39c' },
          { label:'Total Units',       value:totalAdj,         icon:'ri-stack-line',      color:'#f7b84b' },
          { label:'Additions',         value:movements.filter(m=>(m.notes||'').includes('+Addition')).length, icon:'ri-add-circle-line', color:'#0ab39c' },
        ].map(c => (
          <div key={c.label} style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', borderLeft:`3px solid ${c.color}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:`${c.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:20, color:c.color }}/>
            </div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:c.color }}>{c.value}</div>
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
            <input style={{ ...inp, paddingLeft:32 }} placeholder="Search product, reference…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#374151' }}>
            <span>From</span>
            <input type="date" style={{ ...inp, width:'auto', padding:'7px 10px' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
            <span>To</span>
            <input type="date" style={{ ...inp, width:'auto', padding:'7px 10px' }} value={dateTo} onChange={e => setDateTo(e.target.value)}/>
          </div>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, fontFamily:'Nunito,sans-serif' }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                {['Date','Product','Warehouse','Type','Quantity','Reason','Recorded By'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'40px 0' }}>
                  <div className="spinner-border spinner-border-sm text-primary me-2"/>Loading...
                </td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={7} style={{ ...TD, textAlign:'center', padding:40, color:'#9ca3af' }}>
                  <i className="ri-equalizer-line" style={{ fontSize:32, display:'block', marginBottom:8 }}/>No adjustments found
                </td></tr>
              ) : movements.map(m => {
                const tc = getAdjType(m)
                return (
                  <tr key={m.id}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={TD}>{formatDate(m.created_at)}</td>
                    <td style={{ ...TD, fontWeight:600 }}>{m.product_name}</td>
                    <td style={TD}><span style={{ background:'#f9fafb', color:'#374151', border:'1px solid #e5e7eb', borderRadius:50, padding:'3px 10px', fontSize:11, fontWeight:600 }}>{m.warehouse_name}</span></td>
                    <td style={TD}><span style={{ background:tc.bg, color:tc.color, borderRadius:50, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{tc.label}</span></td>
                    <td style={TD}>
                      <span style={{ fontWeight:700, color: tc.label.includes('+') ? '#0ab39c' : '#f06548' }}>
                        {tc.label.includes('+') ? '+' : '-'}{m.quantity}
                      </span>
                    </td>
                    <td style={{ ...TD, maxWidth:160, whiteSpace:'normal', fontSize:12 }}>{extractReason(m)}</td>
                    <td style={TD}>{m.created_by_name || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding:'12px 20px', fontSize:12, color:'#6b7280', borderTop:'1px solid #f3f4f6', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <span>Showing {movements.length} of {meta.total} adjustments</span>
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

      {/* Form Modal */}
      {showForm && (
        <Modal title="New Stock Adjustment" onClose={close}>
          <form onSubmit={saveForm}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div>
                <label style={LBL}>Product <span style={{ color:'#dc2626' }}>*</span></label>
                <select style={inp} required value={form.product_id} onChange={e => setForm(f=>({...f,product_id:e.target.value}))}>
                  <option value="">— Select Product —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={LBL}>Warehouse</label>
                <select style={inp} value={form.warehouse_id} onChange={e => setForm(f=>({...f,warehouse_id:e.target.value}))}>
                  <option value="">— Select Warehouse —</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={LBL}>Adjustment Type</label>
              <div style={{ display:'flex', gap:10 }}>
                {[
                  { val:'add',      label:'+ Addition (increase stock)',  color:'#0ab39c' },
                  { val:'subtract', label:'- Deduction (decrease stock)', color:'#f06548' },
                ].map(opt => (
                  <label key={opt.val} style={{ flex:1, display:'flex', alignItems:'center', gap:8, cursor:'pointer', background: adjType === opt.val ? `${opt.color}12` : '#f9fafb', border:`1.5px solid ${adjType === opt.val ? opt.color : '#e5e7eb'}`, borderRadius:8, padding:'10px 14px', fontSize:13 }}>
                    <input type="radio" name="adjType" value={opt.val} checked={adjType === opt.val} onChange={() => setAdjType(opt.val)} style={{ accentColor: opt.color }}/>
                    <span style={{ fontWeight:600, color: adjType === opt.val ? opt.color : '#374151' }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div>
                <label style={LBL}>Quantity <span style={{ color:'#dc2626' }}>*</span></label>
                <input type="number" style={inp} min="1" required value={form.quantity} onChange={e => setForm(f=>({...f,quantity:e.target.value}))}/>
              </div>
              <div>
                <label style={LBL}>Unit Cost (₦) <span style={{ fontSize:10, fontWeight:400, color:'#9ca3af' }}>optional</span></label>
                <input type="number" style={inp} min="0" value={form.unit_cost} onChange={e => setForm(f=>({...f,unit_cost:e.target.value}))}/>
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={LBL}>Reason <span style={{ color:'#dc2626' }}>*</span></label>
              <select style={inp} required value={reason} onChange={e => setReason(e.target.value)}>
                {REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={LBL}>Additional Notes</label>
              <textarea style={{ ...inp, resize:'vertical', minHeight:70 }} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes…"/>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={close} style={{ ...btnL, flex:1, justifyContent:'center' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...btnP, flex:1, justifyContent:'center', opacity:saving?0.7:1 }}>
                {saving ? 'Submitting…' : 'Submit Adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
