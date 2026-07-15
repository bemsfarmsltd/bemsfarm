import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const REASONS = ['Theft','Spoilage','Damage','System Error','Miscount','Unknown','Other']

const REASON_ICON = {
  Theft:          { icon:'ri-spy-line',          color:'#dc2626' },
  Spoilage:       { icon:'ri-leaf-line',         color:'#f59e0b' },
  Damage:         { icon:'ri-error-warning-line',color:'#f59e0b' },
  'System Error': { icon:'ri-bug-line',          color:'#8b5cf6' },
  Miscount:       { icon:'ri-calculator-line',   color:'#3b82f6' },
  Unknown:        { icon:'ri-question-line',     color:'#6b7280' },
  Other:          { icon:'ri-more-line',         color:'#6b7280' },
}

const inp  = { display:'block', width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontFamily:'Nunito,sans-serif', fontSize:13, outline:'none', background:'#fff', color:'#111827', boxSizing:'border-box' }
const btnP = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:'#1B4332', color:'#fff', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:13 }
const btnL = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:600, fontSize:13 }
const TH   = { padding:'10px 16px', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left', whiteSpace:'nowrap' }
const TD   = { padding:'12px 16px', verticalAlign:'middle', borderBottom:'1px solid #f3f4f6', fontSize:13, color:'#111827' }
const LBL  = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }

function Modal({ title, onClose, maxWidth, children }) {
  return <>
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1054 }}/>
    <div style={{ position:'fixed', inset:0, zIndex:1055, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:maxWidth||640, boxShadow:'0 8px 40px rgba(0,0,0,0.18)', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ background:'#1B4332', color:'#fff', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15 }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer', fontSize:20, display:'flex', padding:4 }}><i className="ri-close-line"/></button>
        </div>
        <div style={{ padding:24, overflowY:'auto' }}>{children}</div>
      </div>
    </div>
  </>
}

const BLANK_FORM = { product_id:'', quantity:1, reason:'Unknown', date: new Date().toISOString().slice(0,10), estimated_value:0, notes:'' }

export default function LostItems() {
  const [items,      setItems]    = useState([])
  const [loading,    setLoading]  = useState(false)
  const [page,       setPage]     = useState(1)
  const [search,     setSearch]   = useState('')
  const [dateFrom,   setDateFrom] = useState('')
  const [dateTo,     setDateTo]   = useState('')
  const [meta,       setMeta]     = useState({ total:0, pages:1 })
  const [products,   setProducts] = useState([])
  const [showForm,   setShowForm] = useState(false)
  const [viewItem,   setViewItem] = useState(null)
  const [form,       setForm]     = useState(BLANK_FORM)
  const [saving,     setSaving]   = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit:20 }
      if (dateFrom) params.from = dateFrom
      if (dateTo)   params.to   = dateTo
      const res = await api.get('/admin/inventory/lost-items', { params })
      setItems(res.data.items || [])
      setMeta({ total: res.data.total || 0, pages: res.data.pages || 1 })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load lost items') }
    finally { setLoading(false) }
  }, [page, dateFrom, dateTo])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get('/admin/inventory', { params: { limit:200 } })
      setProducts(res.data.products || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { setPage(1) }, [dateFrom, dateTo])

  const filtered = search
    ? items.filter(r =>
        (r.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.reason || '').toLowerCase().includes(search.toLowerCase())
      )
    : items

  const totalLoss = items.reduce((s,r) => s + (r.estimated_value || 0), 0)

  function openForm()     { setForm(BLANK_FORM); setShowForm(true) }
  function closeForm()    { setShowForm(false) }
  function openView(item) { setViewItem(item) }
  function closeView()    { setViewItem(null) }

  async function saveForm(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/inventory/lost-items', { ...form, quantity: Number(form.quantity), estimated_value: Number(form.estimated_value) })
      toast.success('Lost item reported')
      closeForm()
      fetchItems()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to report') }
    finally { setSaving(false) }
  }

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB')
  }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'#111827' }}>Lost Items</div>
          <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Inventory / Lost Items</div>
        </div>
        <button onClick={openForm} style={btnP}><i className="ri-add-line"/>Report Loss</button>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Reports',    value:meta.total,                              icon:'ri-file-damage-line',      color:'#405189' },
          { label:'This Page',        value:items.length,                            icon:'ri-file-list-line',        color:'#f06548' },
          { label:'Total Loss Value', value:`₦${totalLoss.toLocaleString()}`,        icon:'ri-money-dollar-box-line', color:'#dc2626' },
          { label:'Theft Reports',    value:items.filter(r=>r.reason==='Theft').length, icon:'ri-spy-line',          color:'#8b5cf6' },
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
            <input style={{ ...inp, paddingLeft:32 }} placeholder="Search product, reason…" value={search} onChange={e => setSearch(e.target.value)}/>
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
                {['Date','Product','Quantity','Reason','Reported By','Est. Value','Notes','Action'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:'40px 0' }}>
                  <div className="spinner-border spinner-border-sm text-primary me-2"/>Loading...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ ...TD, textAlign:'center', padding:40, color:'#9ca3af' }}>
                  <i className="ri-shield-check-line" style={{ fontSize:32, display:'block', marginBottom:8, color:'#0ab39c' }}/>No lost item reports found
                </td></tr>
              ) : filtered.map(r => {
                const ri = REASON_ICON[r.reason] || { icon:'ri-question-line', color:'#6b7280' }
                return (
                  <tr key={r.id}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={TD}>{formatDate(r.date || r.created_at)}</td>
                    <td style={{ ...TD, fontWeight:600 }}>{r.product_name}</td>
                    <td style={{ ...TD, fontWeight:700, color:'#dc2626' }}>{r.quantity}</td>
                    <td style={TD}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12 }}>
                        <i className={ri.icon} style={{ color:ri.color }}/>{r.reason}
                      </span>
                    </td>
                    <td style={TD}>{r.reported_by || '—'}</td>
                    <td style={{ ...TD, fontWeight:700 }}>{r.estimated_value ? `₦${Number(r.estimated_value).toLocaleString()}` : '—'}</td>
                    <td style={{ ...TD, maxWidth:180, whiteSpace:'normal', fontSize:12, color:'#6b7280' }}>{r.notes || '—'}</td>
                    <td style={TD}>
                      <button onClick={() => openView(r)} title="View" style={{ width:30, height:30, borderRadius:7, border:'none', background:'#dbeafe', color:'#1d4ed8', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <i className="ri-eye-line"/>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding:'12px 20px', fontSize:12, color:'#6b7280', borderTop:'1px solid #f3f4f6', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <span>Showing {filtered.length} of {meta.total} reports</span>
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

      {/* Report Loss Modal */}
      {showForm && (
        <Modal title="Report Lost Item" onClose={closeForm}>
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
                <label style={LBL}>Date <span style={{ color:'#dc2626' }}>*</span></label>
                <input type="date" style={inp} required value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))}/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div>
                <label style={LBL}>Quantity Lost <span style={{ color:'#dc2626' }}>*</span></label>
                <input type="number" style={inp} min="1" required value={form.quantity} onChange={e => setForm(f=>({...f,quantity:e.target.value}))}/>
              </div>
              <div>
                <label style={LBL}>Reason</label>
                <select style={inp} value={form.reason} onChange={e => setForm(f=>({...f,reason:e.target.value}))}>
                  {REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={LBL}>Estimated Value (₦)</label>
              <input type="number" style={inp} min="0" value={form.estimated_value} onChange={e => setForm(f=>({...f,estimated_value:e.target.value}))} placeholder="0"/>
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={LBL}>Notes</label>
              <textarea style={{ ...inp, resize:'vertical', minHeight:80 }} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Describe what happened…"/>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={closeForm} style={{ ...btnL, flex:1, justifyContent:'center' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...btnP, flex:1, justifyContent:'center', opacity:saving?0.7:1 }}>
                {saving ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View detail modal */}
      {viewItem && (
        <Modal title={`Loss Report — ${viewItem.product_name}`} onClose={closeView} maxWidth={500}>
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              {[
                { label:'Date',       value: new Date(viewItem.date || viewItem.created_at).toLocaleDateString('en-GB') },
                { label:'Product',    value: viewItem.product_name },
                { label:'Quantity',   value: viewItem.quantity },
                { label:'Reason',     value: viewItem.reason },
                { label:'Reported By',value: viewItem.reported_by || '—' },
                { label:'Est. Value', value: viewItem.estimated_value ? `₦${Number(viewItem.estimated_value).toLocaleString()}` : '—' },
              ].map(s => (
                <div key={s.label} style={{ background:'#f9fafb', borderRadius:8, padding:'10px 14px', border:'1px solid #f3f4f6' }}>
                  <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{s.value}</div>
                </div>
              ))}
            </div>
            {viewItem.notes && (
              <div style={{ background:'#fef9f9', border:'1px solid #fecaca', borderRadius:10, padding:'12px 14px', fontSize:13, color:'#6b7280', lineHeight:1.6 }}>
                <strong style={{ color:'#374151' }}>Notes: </strong>{viewItem.notes}
              </div>
            )}
            <div style={{ marginTop:16 }}>
              <button onClick={closeView} style={{ ...btnL, justifyContent:'center', width:'100%' }}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
