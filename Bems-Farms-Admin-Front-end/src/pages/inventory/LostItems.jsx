import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const REASONS = [
  'Expiry Date Passed',
  'Spoilage / Rotting',
  'Pest Damage',
  'Physical Damage',
  'Theft',
  'Miscount',
  'Other'
]

const REASON_CFG = {
  'Expiry Date Passed':   { icon:'ri-time-line',          color:'var(--text-muted)' },
  'Spoilage / Rotting':   { icon:'ri-leaf-line',         color:'#10b981' },
  'Pest Damage':          { icon:'ri-bug-line',          color:'#f59e0b' },
  'Physical Damage':      { icon:'ri-hammer-line',        color:'#ef4444' },
  'Theft':                { icon:'ri-spy-line',           color:'#3b82f6' },
  'Miscount':             { icon:'ri-calculator-line',    color:'#8b5cf6' },
  'Other':                { icon:'ri-more-line',          color:'var(--text-muted)' },
}

const inp  = { display:'block', width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:8, fontFamily:'var(--body-font)', fontSize:13, outline:'none', background:'var(--bg-card)', color:'var(--text-primary)', boxSizing:'border-box' }
const btnP = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:'var(--orange-accent)', color:'#fff', cursor:'pointer', fontFamily:'var(--body-font)', fontWeight:700, fontSize:13 }
const btnL = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'1.5px solid var(--border)', background:'var(--bg-card)', color:'var(--text-secondary)', cursor:'pointer', fontFamily:'var(--body-font)', fontWeight:600, fontSize:13 }
const TH   = { padding:'10px 16px', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left', whiteSpace:'nowrap' }
const TD   = { padding:'12px 16px', verticalAlign:'middle', borderBottom:'1px solid var(--border)', fontSize:13, color:'var(--text-primary)' }
const LBL  = { display:'block', fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:6 }

function Modal({ title, onClose, maxWidth, children }) {
  return <>
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1054 }}/>
    <div style={{ position:'fixed', inset:0, zIndex:1055, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, width:'100%', maxWidth:maxWidth||640, boxShadow:'0 8px 40px rgba(0,0,0,0.18)', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ background:'var(--orange-accent)', color:'#fff', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontFamily:'var(--heading-font)', fontWeight:700, fontSize:15 }}>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer', fontSize:20, display:'flex', padding:4 }}><i className="ri-close-line"/></button>
        </div>
        <div style={{ padding:24, overflowY:'auto' }}>{children}</div>
      </div>
    </div>
  </>
}

const BLANK_FORM = { product_id:'', warehouse_id:'', quantity:1, reason:'Expiry Date Passed', date: new Date().toISOString().slice(0,10), estimated_value:0, notes:'' }

export default function LostItems() {
  const navigate = useNavigate()
  const [items,      setItems]    = useState([])
  const [loading,    setLoading]  = useState(false)
  const [page,       setPage]     = useState(1)
  const [search,     setSearch]   = useState('')
  const [meta,       setMeta]     = useState({ total:0, pages:1 })
  const [products,   setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [showForm,   setShowForm] = useState(false)
  const [viewItem,   setViewItem] = useState(null)
  const [form,       setForm]     = useState(BLANK_FORM)
  const [saving,     setSaving]   = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [error, setError] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit:20 }
      const res = await api.get('/admin/inventory/lost-items', { params })
      setItems(res.data.items || [])
      setMeta({ total: res.data.total || 0, pages: res.data.pages || 1 })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load lost items')
      setError(err.response?.data?.message || 'Failed to load lost items')
      setItems([])
      setMeta({ total: 0, pages: 1 })
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus])

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
  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { setPage(1) }, [search, filterStatus])

  // The backend (see PATCH /admin/inventory/lost-items/:id/approve) only
  // ever sets status to 'pending', 'approved', or 'rejected' — no
  // "investigating" state exists server-side, so that's not represented here.
  function getStatusCfg(r) {
    const status = (r.status || '').toLowerCase()
    if (status === 'approved') {
      return { label: 'Confirmed Loss', bg: '#fee2e2', color: '#ef4444', border: '#fee2e2' }
    }
    if (status === 'rejected') {
      return { label: 'Rejected', bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' }
    }
    return { label: 'Pending', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
  }

  // The Report-Loss form only ever submits a value straight from REASONS
  // above, so there are no legacy reason strings to remap — a real reason
  // just passes through, and a missing one defaults sensibly.
  const getMappedReason = (r) => r.reason || 'Expiry Date Passed'

  const filtered = useMemo(() => {
    return items.filter(r => {
      const refNo = `LST-${yearOf(r.created_at)}-${String(r.id).padStart(3, '0')}`
      const matchText = (r.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (r.reason || '').toLowerCase().includes(search.toLowerCase()) ||
                        refNo.toLowerCase().includes(search.toLowerCase())
      
      if (!matchText) return false
      
      if (!filterStatus) return true
      const sc = getStatusCfg(r).label.toLowerCase()
      return sc === filterStatus.toLowerCase()
    })
  }, [items, search, filterStatus])

  const totals = useMemo(() => {
    const reports = items.length
    const pending = items.filter(r => getStatusCfg(r).label === 'Pending').length
    const rejected = items.filter(r => getStatusCfg(r).label === 'Rejected').length
    const confirmedLoss = items.reduce((s, r) => {
      return getStatusCfg(r).label === 'Confirmed Loss' ? s + Number(r.estimated_value || 0) : s;
    }, 0)
    return {
      reports,
      pending,
      rejected,
      confirmedLoss: `₦${confirmedLoss.toLocaleString()}`
    }
  }, [items])

  const pendingCount = useMemo(() => {
    return items.filter(r => getStatusCfg(r).label === 'Pending').length
  }, [items])

  function openForm()     { setForm(BLANK_FORM); setShowForm(true) }
  function closeForm()    { setShowForm(false) }
  function openView(item) { setViewItem(item) }
  function closeView()    { setViewItem(null) }

  async function handleDelete(id) {
    setConfirmDeleteId(null)
    try {
      await api.delete(`/admin/inventory/lost-items/${id}`)
      toast.success('Report deleted successfully')
      setItems(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete report')
    }
  }

  async function saveForm(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (form.id) {
        // Editing an existing report — corrects the report's own fields only;
        // does not touch stock (that was already applied at creation time).
        await api.patch(`/admin/inventory/lost-items/${form.id}`, {
          warehouse_id: form.warehouse_id,
          quantity: Number(form.quantity),
          reason: form.reason,
          notes: form.notes,
        })
        toast.success('Report updated')
      } else {
        await api.post('/admin/inventory/lost-items', {
          ...form,
          quantity: Number(form.quantity),
          estimated_value: Number(form.estimated_value)
        })
        toast.success('Lost item reported')
      }
      closeForm()
      fetchItems()
    } catch (err) {
      toast.error(err.response?.data?.message || (form.id ? 'Failed to update report' : 'Failed to report'))
    } finally {
      setSaving(false)
    }
  }

  function formatDate(d) {
    if (!d) return '—'
    const date = new Date(d)
    return date.toISOString().slice(0, 10)
  }

  function yearOf(d) {
    return new Date(d || Date.now()).getFullYear()
  }

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
          <div style={{ fontFamily:'var(--heading-font)', fontWeight:800, fontSize:20, color:'var(--text-primary)' }}>Lost & Damaged Items</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
          <span style={{ cursor:'pointer' }} onClick={()=>navigate('/products')}>Inventory</span>
          <i className="ri-arrow-right-s-line" style={{ fontSize:19 }} />
          <span style={{ fontWeight:600, color:'var(--text-primary)' }}>Lost & Damaged</span>
        </div>
      </div>

      {/* Alert Banner */}
      {pendingCount > 0 && (
        <div style={{ background: '#fffdf5', border: '1px solid #fef3c7', color: '#b45309', padding: '12px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, fontWeight: 600 }}>
          <i className="ri-information-line" style={{ fontSize: 22, color: '#d97706' }}/>
          <span>{pendingCount} report{pendingCount !== 1 ? 's' : ''} waiting for investigation.</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid-stats-auto" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Reports',         value:totals.reports, icon:'ri-file-text-line', color:'#405189', valueColor:'var(--text-primary)' },
          { label:'Pending Review',        value:totals.pending, icon:'ri-time-line', color:'#f7b84b', valueColor:'#f7b84b' },
          { label:'Rejected',              value:totals.rejected, icon:'ri-close-circle-line', color:'#64748b', valueColor:'#64748b' },
          { label:'Confirmed Value Lost',  value:totals.confirmedLoss, icon:'ri-coins-line', color:'#ef4444', valueColor:'#ef4444' },
        ].map(c => (
          <div key={c.label} style={{ background:'var(--bg-card)', borderRadius:12, border:`1px solid ${B}`, borderLeft:`3px solid ${c.color}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:`${c.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:20, color:c.color }}/>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:c.valueColor }}>{c.value}</div>
              <div style={{ fontSize:11, color:S, fontWeight:600 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background:'var(--bg-card)', borderRadius:12, border:`1px solid ${B}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${B}`, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-light)', fontSize:20 }}/>
            <input style={{ ...inp, paddingLeft:32 }} placeholder="Search product, reason, ref..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select style={{ ...inp, width:'auto', minWidth:140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Records</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="confirmed loss">Confirmed Loss</option>
          </select>
          <button style={btnP} onClick={openForm}><i className="ri-add-line"/>Report Loss</button>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, fontFamily:'var(--body-font)' }}>
            <thead>
              <tr style={{ background:'var(--bg-subtle)', borderBottom:`1px solid ${B}` }}>
                {['Ref No','Date','Product','Qty Lost','Total Loss','Reason','Warehouse','Reported By','Investigator', 'Status', 'Action'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr><td colSpan={11} style={{ ...TD, textAlign:'center', padding:40, color:'#f06548' }}>
                  <i className="ri-error-warning-line" style={{ fontSize:43, display:'block', marginBottom:8 }}/>
                  {error}
                  <div style={{ marginTop:12 }}>
                    <button style={btnL} onClick={fetchItems}>Retry</button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} style={{ ...TD, textAlign:'center', padding:40, color:'var(--text-light)' }}>
                  <i className="ri-shield-check-line" style={{ fontSize:43, display:'block', marginBottom:8, color:'#0ab39c' }}/>No lost item reports found
                </td></tr>
              ) : filtered.map(r => {
                const sc = getStatusCfg(r)
                const refNo = `LST-${yearOf(r.created_at)}-${String(r.id).padStart(3, '0')}`
                const reasonMapped = getMappedReason(r)
                const ri = REASON_CFG[reasonMapped] || { icon:'ri-question-line', color:S }
                return (
                  <tr key={r.id}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background=''}
                    style={{ background: 'var(--bg-card)' }}>
                    <td style={{ ...TD, borderLeft:`3px solid ${sc.border}`, color:'#f06548', fontWeight:700 }}>
                      {refNo}
                    </td>
                    <td style={TD}><span style={{ color:S }}>{formatDate(r.created_at)}</span></td>
                    <td style={TD}>
                      <div style={{ fontWeight:700, color:'var(--text-primary)' }}>{r.product_name}</div>
                      <div style={{ fontSize:11, color:S, fontWeight:400 }}>{r.category_name || 'Product'}</div>
                    </td>
                    <td style={TD}>
                      <span style={{ color:'#ef4444', fontWeight:700 }}>{r.quantity}</span>{' '}
                      <span style={{ color:S, fontSize:12 }}>{r.unit || 'pcs'}</span>
                    </td>
                    <td style={{ ...TD, fontWeight:700, color:'#ef4444' }}>
                      ₦{Number(r.estimated_value || 0).toLocaleString()}
                    </td>
                    <td style={TD}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:500 }}>
                        <i className={ri.icon} style={{ color:ri.color, fontSize:14 }} />
                        {reasonMapped}
                      </span>
                    </td>
                    <td style={TD}>
                      <span style={{ background:'var(--bg-muted)', color:'var(--text-secondary)', borderRadius:4, padding:'3px 8px', fontSize:11, fontWeight:600 }}>
                        {r.warehouse_name || 'Main Store'}
                      </span>
                    </td>
                    <td style={TD}>{r.reported_by_name || 'Staff'}</td>
                    <td style={TD}>
                      {r.approved_by_name ? (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, color:'#3b82f6', fontWeight:600 }}>
                          <i className="ri-user-line" style={{ color:'#3b82f6', fontSize:16 }} />
                          {r.approved_by_name}
                        </span>
                      ) : (
                        <span style={{ color:S }}>—</span>
                      )}
                    </td>
                    <td style={TD}>
                      <span style={{ display:'inline-flex', alignItems:'center', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:50, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={TD}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <button onClick={() => openView(r)} title="View Details" style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', padding:4, display:'inline-flex', alignItems:'center' }}>
                          <i className="ri-search-line" style={{ fontSize:20 }}/>
                        </button>
                        <button onClick={() => { setForm({ ...r, date: formatDate(r.created_at) }); setShowForm(true); }} title="Edit Report" style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', padding:4, display:'inline-flex', alignItems:'center' }}>
                          <i className="ri-pencil-line" style={{ fontSize:20 }}/>
                        </button>
                        <button onClick={() => setConfirmDeleteId(r.id)} title="Delete Report" style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', padding:4, display:'inline-flex', alignItems:'center' }}>
                          <i className="ri-delete-bin-line" style={{ fontSize:20 }}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding:'12px 20px', fontSize:12, color:S, borderTop:`1px solid ${B}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <span>Showing {filtered.length} of {meta.total} records</span>
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

      {/* Report Loss Modal */}
      {showForm && (
        <Modal title={form.id ? 'Edit Report' : 'Report Lost Item'} onClose={closeForm}>
          <form onSubmit={saveForm}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div>
                <label style={LBL}>Product <span style={{ color:'#dc2626' }}>*</span></label>
                <select style={{ ...inp, opacity: form.id ? 0.6 : 1 }} required disabled={!!form.id} value={form.product_id} onChange={e => setForm(f=>({...f,product_id:e.target.value}))}>
                  <option value="">— Select Product —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {form.id && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Product can't be changed on an existing report — delete and re-report if it's wrong.</div>}
              </div>
              <div>
                <label style={LBL}>Warehouse</label>
                <select style={inp} value={form.warehouse_id} onChange={e => setForm(f=>({...f,warehouse_id:e.target.value}))}>
                  <option value="">— Select Warehouse —</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div>
                <label style={LBL}>Estimated Value (₦)</label>
                <input type="number" style={{ ...inp, opacity: form.id ? 0.6 : 1 }} min="0" disabled={!!form.id} value={form.estimated_value} onChange={e => setForm(f=>({...f,estimated_value:e.target.value}))} placeholder="0"/>
                {form.id && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Recalculated automatically from quantity.</div>}
              </div>
              <div>
                <label style={LBL}>Date <span style={{ color:'#dc2626' }}>*</span></label>
                <input type="date" style={inp} required value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))}/>
              </div>
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
                { label:'Date',       value: formatDate(viewItem.created_at) },
                { label:'Product',    value: viewItem.product_name },
                { label:'Quantity',   value: `${viewItem.quantity} ${viewItem.unit || 'pcs'}` },
                { label:'Reason',     value: getMappedReason(viewItem) },
                { label:'Reported By',value: viewItem.reported_by_name || '—' },
                { label:'Est. Value', value: viewItem.estimated_value ? `₦${Number(viewItem.estimated_value).toLocaleString()}` : '—' },
              ].map(s => (
                <div key={s.label} style={{ background:'var(--bg-subtle)', borderRadius:8, padding:'10px 14px', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:11, color:'var(--text-light)', fontWeight:600, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)' }}>{s.value}</div>
                </div>
              ))}
            </div>
            {viewItem.notes && (
              <div style={{ background:'var(--bg-subtle)', border:'1px solid #fecaca', borderRadius:10, padding:'12px 14px', fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>
                <strong style={{ color:'var(--text-secondary)' }}>Notes: </strong>{viewItem.notes}
              </div>
            )}
            <div style={{ marginTop:16 }}>
              <button onClick={closeView} style={{ ...btnL, justifyContent:'center', width:'100%' }}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <Modal title="Delete Report?" onClose={() => setConfirmDeleteId(null)} maxWidth={400}>
          <div style={{ textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <i className="ri-delete-bin-line" style={{ fontSize:32, color:'#dc2626' }} />
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>
              This lost-item report will be permanently deleted. This cannot be undone.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ ...btnL, flex:1, justifyContent:'center' }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', cursor:'pointer', fontFamily:'var(--body-font)', fontWeight:700, fontSize:13 }}>Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
