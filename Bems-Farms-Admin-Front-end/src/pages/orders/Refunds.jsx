import { useState, useMemo, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const STAFF = ['Admin','Emeka Adeola','Ngozi Bello','Tunde Okafor','Chike Nwosu']
const RETURN_REASONS = ['Damaged on delivery','Wrong item sent','Quality below standard','Spoiled / Already expired','Item missing from order','Customer changed mind','Incorrect quantity','Packaging damaged']
const REFUND_METHODS = ['Cash','Wallet Credit','Bank Transfer']
const UNITS = ['kg','g','litre','pack','piece','bunch','bag','crate','tuber','bottle','can']

const CONDITION_CFG = {
  resalable:    { label:'Reusable',            color:'#0ab39c', bg:'#d1fae5', action:'Return to stock'              },
  damaged:      { label:'Damaged',             color:'#f06548', bg:'#fee2e2', action:'Write off to Lost & Damaged'  },
  partial:      { label:'Partial Goods',       color:'#f7b84b', bg:'#fef3c7', action:'Split — partial stock return' },
  partial_goods:{ label:'Partial Goods',       color:'#f7b84b', bg:'#fef3c7', action:'Split — partial stock return' },
  pending_check:{ label:'Awaiting Inspection', color:'var(--text-muted)', bg:'var(--border)', action:''                             },
}

const STATUS_CFG = {
  pending:    { label:'Pending',    color:'#92400e', bg:'#fef3c7' },
  inspecting: { label:'Inspecting', color:'#075985', bg:'#e0f2fe' },
  approved:   { label:'Approved',   color:'#1d4ed8', bg:'#dbeafe' },
  refunded:   { label:'Refunded',   color:'#166534', bg:'#dcfce7' },
  rejected:   { label:'Rejected',   color:'#991b1b', bg:'#fee2e2' },
}

function nextRef(list) {
  const max=list.reduce((m,r)=>Math.max(m,Number((r.refund_ref||'').split('-')[2])||0),0)
  return `RTN-${new Date().getFullYear()}-${String(max+1).padStart(3,'0')}`
}

const inp  = { display:'block',width:'100%',padding:'9px 12px',border:'1.5px solid var(--border)',borderRadius:8,fontFamily:'var(--body-font)',fontSize:13,outline:'none',background:'var(--bg-card)',boxSizing:'border-box' }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'var(--body-font)',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:9,border:'1.5px solid var(--border)',background:'var(--bg-card)',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'var(--body-font)',fontWeight:600,fontSize:13 }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'var(--text-secondary)',marginBottom:6 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid var(--border)',fontSize:13,color:'var(--text-primary)' }

function Modal({ title, onClose, children, maxWidth=620, wide=false }) {
  return <>
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1054 }}/>
    <div style={{ position:'fixed',inset:0,zIndex:1055,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ background:'var(--bg-card)',borderRadius:14,width:'100%',maxWidth:wide?960:maxWidth,boxShadow:'0 8px 40px rgba(0,0,0,0.18)',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column' }}>
        <div style={{ background:'#1B4332',color:'#fff',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <span style={{ fontFamily:'var(--heading-font)',fontWeight:700,fontSize:15 }}>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ background:'none',border:'none',color:'rgba(255,255,255,0.8)',cursor:'pointer',fontSize:20,display:'flex',padding:4 }}><i className="ri-close-line"/></button>
        </div>
        <div style={{ overflowY:'auto',flex:1 }}>{children}</div>
      </div>
    </div>
  </>
}

function Badge({ cfg }) {
  return <span style={{ display:'inline-flex',alignItems:'center',borderRadius:50,padding:'3px 9px',fontSize:11,fontWeight:600,background:cfg.bg,color:cfg.color }}>{cfg.label}</span>
}

export default function Refunds() {
  const [records,setRecords]           = useState([])
  const [search,setSearch]             = useState('')
  const [filterStatus,setFilterStatus] = useState('all')
  const [activeModal,setActiveModal]   = useState(null)
  const [selected,setSelected]         = useState(null)
  const [processTab,setProcessTab]     = useState('inspect')
  const [loading, setLoading]          = useState(true)
  const [customerOptions,setCustomerOptions] = useState([])
  const [productOptions,setProductOptions]   = useState([])

  useEffect(() => {
    api.get('/admin/customers', { params: { limit: 500 } })
      .then(res => setCustomerOptions(res.data.customers || []))
      .catch(() => toast.error('Failed to load customers'))
    api.get('/admin/products', { params: { limit: 500 } })
      .then(res => setProductOptions(res.data.products || []))
      .catch(() => toast.error('Failed to load products'))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/orders/returns', { params: { search, status: filterStatus } })
      setRecords(res.data.returns)
    } catch { toast.error('Failed to load returns') }
    finally { setLoading(false) }
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  const [logForm,setLogForm] = useState({ ref:'',date:'',ordRef:'',customer_id:'',phone:'',product_id:'',qty:1,unit:'kg',unitPrice:0,reason:RETURN_REASONS[0],notes:'' })
  const [procForm,setProcForm] = useState({ condition:'resalable',goodsAction:'back_to_stock',resalableQty:0,writeOffQty:0,inspectionNotes:'',processedBy:STAFF[0],refundAmount:0,refundMethod:REFUND_METHODS[0],refundRef:'' })

  const filtered = useMemo(()=>records.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),[records])

  const productName = useCallback(id => productOptions.find(p=>String(p.id)===String(id))?.name || '—', [productOptions])

  const stats = useMemo(()=>({
    total:    records.length,
    pending:  records.filter(r=>r.status==='pending'||r.status==='inspecting').length,
    approved: records.filter(r=>r.status==='approved').length,
    refunded: records.filter(r=>r.status==='refunded').reduce((s,r)=>s+Number(r.refund_amount||0),0),
  }),[records])

  const selQty = selected?.quantity || 0
  const selUnitPrice = selQty ? Number(selected?.refund_amount||0) / selQty : 0

  function openLog() {
    setLogForm({ ref:nextRef(records), date:new Date().toISOString().slice(0,10), ordRef:'', customer_id:'', phone:'', product_id:'', qty:1, unit:'kg', unitPrice:0, reason:RETURN_REASONS[0], notes:'' })
    setActiveModal('log')
  }

  function openProcess(r) {
    setSelected(r)
    // Goods condition / write-off split / inspector name aren't separate
    // columns on this record — they get folded into the real `description`
    // note on save, so re-opening a return always starts from a fresh
    // assessment rather than restoring fake structured state.
    setProcForm({ condition:'resalable', goodsAction:'back_to_stock', resalableQty:r.quantity||0, writeOffQty:0, inspectionNotes:'', processedBy:STAFF[0], refundAmount:Number(r.refund_amount||0), refundMethod:r.refund_method||REFUND_METHODS[0], refundRef:'' })
    setProcessTab('inspect'); setActiveModal('process')
  }

  function openView(r) { setSelected(r); setActiveModal('view') }
  function openDelete(r) { setSelected(r); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setSelected(null) }

  const updateStatus = async (status, description, extra = {}) => {
    try {
      await api.patch(`/admin/orders/returns/${selected.id}/status`, { status, description, ...extra })
      toast.success("Return status updated")
      closeModal(); load()
    } catch { toast.error("Failed to update status") }
  }

  const saveLog = async (e) => {
    e.preventDefault()
    try {
      await api.post('/admin/orders/returns', logForm)
      toast.success("Return logged successfully")
      closeModal(); load()
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log return")
    }
  }

  function saveInspection() {
    const conditionLabel = CONDITION_CFG[procForm.condition]?.label || procForm.condition
    const splitNote = procForm.condition === 'partial'
      ? ` (${procForm.resalableQty} back to stock, ${selQty - procForm.resalableQty} written off)`
      : ''
    const note = [`Inspected by ${procForm.processedBy}: ${conditionLabel}${splitNote}.`, procForm.inspectionNotes].filter(Boolean).join(' ')
    updateStatus('inspecting', note)
  }
  function saveRefundDecision(decision) {
    if(decision === 'approve') updateStatus('approved', procForm.inspectionNotes)
    else if(decision === 'reject') updateStatus('rejected', procForm.inspectionNotes)
    else {
      const refNote = procForm.refundRef ? ` Ref: ${procForm.refundRef}.` : ''
      updateStatus('refunded', `${procForm.inspectionNotes||''}${refNote}`.trim() || null, {
        refund_amount: procForm.refundAmount,
        refund_method: procForm.refundMethod,
      })
    }
  }
  async function confirmDelete() {
    try {
      await api.delete(`/admin/orders/returns/${selected.id}`)
      toast.success("Return deleted")
      closeModal(); load()
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete return")
    }
  }

  function handleConditionChange(val) {
    const qty=selected?.quantity||0
    let goodsAction='back_to_stock', resalableQty=qty, writeOffQty=0
    if (val==='damaged') { goodsAction='write_off'; resalableQty=0; writeOffQty=qty }
    if (val==='partial') { goodsAction='split'; resalableQty=0; writeOffQty=0 }
    setProcForm(f=>({ ...f,condition:val,goodsAction,resalableQty,writeOffQty }))
  }

  const btnDanger = { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#dc2626',color:'#fff',cursor:'pointer',fontFamily:'var(--body-font)',fontWeight:700,fontSize:13 }

  return (
    <div style={{ fontFamily:'var(--body-font)' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'var(--heading-font)',fontWeight:800,fontSize:22,color:'var(--text-primary)' }}>Customer Returns & Refunds</div>
        <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:2 }}>Orders / Returns & Refunds</div>
      </div>

      {/* Stat cards */}
      <div className="grid-stats-auto" style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24 }}>
        {[
          { label:'Total Returns',        value:stats.total,                            icon:'ri-arrow-go-back-line',  color:'#405189',filter:'all'      },
          { label:'Pending / Inspecting', value:stats.pending,                          icon:'ri-time-line',           color:'#f7b84b', filter:'pending'  },
          { label:'Awaiting Refund',      value:stats.approved,                         icon:'ri-checkbox-circle-line',color:'#299cdb', filter:'approved' },
          { label:'Total Refunded',       value:`₦${stats.refunded.toLocaleString()}`,  icon:'ri-refund-2-line',       color:'#0ab39c', filter:'refunded' },
        ].map(c=>(
          <div key={c.label} onClick={()=>setFilterStatus(c.filter)}
            style={{ background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border)',borderLeft:`3px solid ${c.color}`,padding:'16px 20px',display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',cursor:'pointer' }}>
            <div style={{ width:44,height:44,borderRadius:'50%',background:`${c.color}1a`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:20,color:c.color }}/>
            </div>
            <div>
              <div style={{ fontSize:18,fontWeight:800,color:c.color }}>{c.value}</div>
              <div style={{ fontSize:12,color:'var(--text-muted)' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border)',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',overflow:'hidden' }}>
        <div style={{ padding:'14px 16px',borderBottom:'1px solid var(--border)',display:'flex',flexWrap:'wrap',gap:10,alignItems:'center' }}>
          <div style={{ position:'relative',minWidth:260 }}>
            <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-light)',fontSize:20 }}/>
            <input style={{ ...inp,paddingLeft:32 }} placeholder="Search by customer, ref, product…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select style={{ ...inp,width:'auto',minWidth:140 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <button style={{ ...btnP,marginLeft:'auto' }} onClick={openLog}><i className="ri-add-line"/>Log Return</button>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-subtle)',borderBottom:'1px solid var(--border)' }}>
                {['Return Ref','Date','Customer','Order Ref','Product','Qty','Reason','Goods Condition','Refund Amount','Refund Method','Status','Actions'].map(h=>(
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0&&(
                <tr><td colSpan={12} style={{ ...TD,textAlign:'center',padding:48,color:'var(--text-light)' }}>
                  <i className="ri-arrow-go-back-line" style={{ fontSize:49,display:'block',marginBottom:8 }}/>No return records found
                </td></tr>
              )}
              {filtered.map(r=>{
                const sc=STATUS_CFG[r.status]||STATUS_CFG.pending, cc=CONDITION_CFG.pending_check
                const dateStr = r.created_at ? new Date(r.created_at).toISOString().slice(0,10) : ''
                const refundAmount = Number(r.refund_amount||0)
                return (
                  <tr key={r.id}>
                    <td style={TD}>
                      <span style={{ fontWeight:700,color:'#1B4332',cursor:'pointer' }} onClick={()=>openView(r)}>{r.refund_ref || r.id}</span>
                    </td>
                    <td style={{ ...TD,fontSize:13 }}>{dateStr}</td>
                    <td style={TD}>
                      <div style={{ fontWeight:600 }}>{r.customer_name || 'Unknown'}</div>
                      <div style={{ fontSize:11,color:'var(--text-muted)' }}>{r.customer_phone || ''}</div>
                    </td>
                    <td style={{ ...TD,fontSize:12,color:'var(--text-muted)' }}>{r.order_id}</td>
                    <td style={TD}>{productName(r.product_id)}</td>
                    <td style={{ ...TD,fontWeight:600 }}>{r.quantity ?? '—'}</td>
                    <td style={{ ...TD,maxWidth:160,whiteSpace:'normal',fontSize:12 }}>{r.reason || r.description}</td>
                    <td style={TD}><Badge cfg={cc}/></td>
                    <td style={{ ...TD,fontWeight:700,color:refundAmount>0?'#f06548':'#9ca3af' }}>
                      {refundAmount>0?`₦${refundAmount.toLocaleString()}`:'—'}
                    </td>
                    <td style={TD}>
                      {r.refund_method || <span style={{ color:'var(--text-light)' }}>—</span>}
                    </td>
                    <td style={TD}><Badge cfg={sc}/></td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        {(r.status==='pending'||r.status==='inspecting')&&(
                          <button title="Process" onClick={()=>openProcess(r)} style={{ background:'#dbeafe',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:14,color:'#1d4ed8' }}><i className="ri-check-double-line"/></button>
                        )}
                        <button title="View" onClick={()=>openView(r)} style={{ background:'var(--bg-subtle)',border:'1px solid var(--border)',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:14,color:'var(--text-secondary)' }}><i className="ri-eye-line"/></button>
                        <button title="Delete" onClick={()=>openDelete(r)} style={{ background:'#fee2e2',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:14,color:'#991b1b' }}><i className="ri-delete-bin-line"/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'10px 16px',borderTop:'1px solid var(--border)',fontSize:13,color:'var(--text-muted)' }}>Showing {filtered.length} of {records.length} records</div>
      </div>

      {/* LOG RETURN MODAL */}
      {activeModal==='log'&&(
        <Modal title="Log Customer Return" onClose={closeModal} maxWidth={640}>
          <div style={{ padding:24 }}>
            <form onSubmit={saveLog}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12 }}>
                <div><label style={LBL}>Return Ref</label><input style={{ ...inp,background:'var(--bg-subtle)' }} readOnly value={logForm.ref}/></div>
                <div><label style={LBL}>Date *</label><input type="date" style={inp} required value={logForm.date} onChange={e=>setLogForm(f=>({...f,date:e.target.value}))}/></div>
                <div><label style={LBL}>Original Order Ref</label><input style={inp} placeholder="ORD-2026-XXX" value={logForm.ordRef} onChange={e=>setLogForm(f=>({...f,ordRef:e.target.value}))}/></div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12 }}>
                <div><label style={LBL}>Customer *</label>
                  <select style={inp} required value={logForm.customer_id} onChange={e=>setLogForm(f=>({...f,customer_id:e.target.value}))}>
                    <option value="">Select a customer…</option>
                    {customerOptions.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><label style={LBL}>Customer Phone</label><input style={inp} placeholder="0800 000 0000" value={logForm.phone} onChange={e=>setLogForm(f=>({...f,phone:e.target.value}))}/></div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:12,marginBottom:12 }}>
                <div><label style={LBL}>Product Returned *</label>
                  <select style={inp} required value={logForm.product_id} onChange={e=>setLogForm(f=>({...f,product_id:e.target.value}))}>
                    <option value="">Select a product…</option>
                    {productOptions.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div><label style={LBL}>Qty *</label><input type="number" style={inp} min="1" required value={logForm.qty} onChange={e=>setLogForm(f=>({...f,qty:Number(e.target.value)}))}/></div>
                <div><label style={LBL}>Unit</label>
                  <select style={inp} value={logForm.unit} onChange={e=>setLogForm(f=>({...f,unit:e.target.value}))}>
                    {UNITS.map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div><label style={LBL}>Unit Price (₦)</label><input type="number" style={inp} min="0" value={logForm.unitPrice} onChange={e=>setLogForm(f=>({...f,unitPrice:Number(e.target.value)}))}/></div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={LBL}>Return Reason *</label>
                <select style={inp} required value={logForm.reason} onChange={e=>setLogForm(f=>({...f,reason:e.target.value}))}>
                  {RETURN_REASONS.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={LBL}>Customer Notes</label>
                <textarea style={{ ...inp,resize:'vertical' }} rows={3} placeholder="What did the customer say about the issue?" value={logForm.notes} onChange={e=>setLogForm(f=>({...f,notes:e.target.value}))}/>
              </div>
              <div style={{ background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:8,padding:'10px 14px',fontSize:12,marginBottom:20 }}>
                <i className="ri-information-line" style={{ marginRight:6,color:'#0369a1' }}/>
                After logging, click <strong>Process</strong> on the record to inspect goods and issue a refund decision.
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }}>Log Return</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* PROCESS MODAL */}
      {activeModal==='process'&&selected&&(
        <Modal title={`Process Return — ${selected.refund_ref||selected.id}`} onClose={closeModal} wide>
          <div>
            {/* Status sub-header */}
            <div style={{ padding:'10px 20px',background:'var(--bg-subtle)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10 }}>
              <Badge cfg={STATUS_CFG[selected.status]}/>
              <span style={{ fontSize:13,color:'var(--text-muted)' }}>{selected.customer_name} · {productName(selected.product_id)} · {selQty}</span>
            </div>

            {/* Tab strip */}
            <div style={{ display:'flex',borderBottom:'1px solid var(--border)',background:'#f0f3f9' }}>
              {[{ id:'inspect',icon:'ri-search-2-line',label:'1 · Inspect Goods' },{ id:'refund',icon:'ri-refund-2-line',label:'2 · Refund Decision' }].map(t=>(
                <button key={t.id} onClick={()=>setProcessTab(t.id)}
                  style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px',border:'none',cursor:'pointer',fontSize:13,fontWeight:processTab===t.id?700:400,fontFamily:'var(--body-font)',background:processTab===t.id?'#1B4332':'transparent',color:processTab===t.id?'#fff':'#6b7280',borderBottom:processTab===t.id?'none':'none' }}>
                  <i className={t.icon}/>{t.label}
                </button>
              ))}
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'280px 1fr' }}>
              {/* Left: Return summary */}
              <div style={{ padding:20,background:'#fafbfc',borderRight:'1px solid var(--border)' }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:1,marginBottom:12 }}>RETURN DETAILS</div>
                <div style={{ background:'#fff8ec',border:'1px solid #fde68a',borderRadius:10,padding:14,marginBottom:12 }}>
                  <div style={{ fontWeight:700,marginBottom:2 }}>{productName(selected.product_id)}</div>
                  <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:10 }}>{selected.customer_name} · {selected.order_id||'—'}</div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
                    {[['QTY',`${selQty}`],['UNIT PRICE',`₦${selUnitPrice.toLocaleString()}`],['TOTAL',`₦${Number(selected.refund_amount||0).toLocaleString()}`]].map(([k,v])=>(
                      <div key={k}><div style={{ fontSize:10,color:'var(--text-light)' }}>{k}</div><div style={{ fontWeight:700,fontSize:13 }}>{v}</div></div>
                    ))}
                  </div>
                </div>
                <div style={{ border:'1px solid var(--border)',borderRadius:8,padding:12,marginBottom:10,fontSize:12 }}>
                  <div style={{ fontWeight:700,fontSize:11,color:'var(--text-muted)',marginBottom:8 }}>CUSTOMER COMPLAINT</div>
                  <div style={{ fontWeight:600,marginBottom:4 }}>{selected.reason || '—'}</div>
                  {selected.description&&<div style={{ color:'var(--text-muted)',fontStyle:'italic' }}>"{selected.description}"</div>}
                </div>
                <div style={{ border:'1px solid var(--border)',borderRadius:8,padding:12,fontSize:12 }}>
                  <div style={{ fontWeight:700,fontSize:11,color:'var(--text-muted)',marginBottom:8 }}>RETURN INFO</div>
                  {[['Return Date',selected.created_at?new Date(selected.created_at).toISOString().slice(0,10):'—'],['Phone',selected.customer_phone||'—'],['Order Ref',selected.order_id||'—']].map(([k,v])=>(
                    <div key={k} style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}><span style={{ color:'var(--text-muted)' }}>{k}</span><span>{v}</span></div>
                  ))}
                </div>
              </div>

              {/* Right: Tabs */}
              <div style={{ padding:24 }}>
                {processTab==='inspect'&&(
                  <>
                    <div style={{ fontWeight:700,fontSize:14,marginBottom:16,display:'flex',alignItems:'center',gap:8 }}>
                      <i className="ri-search-2-line" style={{ color:'#1B4332' }}/>Goods Inspection
                    </div>
                    <div style={{ marginBottom:14 }}>
                      <label style={LBL}>Inspected By</label>
                      <select style={{ ...inp,maxWidth:220 }} value={procForm.processedBy} onChange={e=>setProcForm(f=>({...f,processedBy:e.target.value}))}>
                        {STAFF.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom:16 }}>
                      <label style={LBL}>Goods Condition *</label>
                      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
                        {[
                          { val:'resalable', icon:'ri-checkbox-circle-line', color:'#0ab39c', title:'Resalable',       desc:'Can go back to stock'              },
                          { val:'damaged',   icon:'ri-close-circle-line',    color:'#f06548', title:'Damaged / Spoiled',desc:'Write off to Lost & Damaged'       },
                          { val:'partial',   icon:'ri-indeterminate-circle-line',color:'#f7b84b',title:'Partially Good',desc:'Split — some stock, rest write-off'},
                        ].map(opt=>(
                          <div key={opt.val} onClick={()=>handleConditionChange(opt.val)}
                            style={{ padding:14,borderRadius:10,border:`1.5px solid ${procForm.condition===opt.val?opt.color:'var(--border)'}`,background:procForm.condition===opt.val?`${opt.color}12`:'#fff',cursor:'pointer',textAlign:'center' }}>
                            <i className={opt.icon} style={{ fontSize:22,color:opt.color,display:'block',marginBottom:4 }}/>
                            <div style={{ fontSize:13,fontWeight:600,color:opt.color }}>{opt.title}</div>
                            <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:4 }}>{opt.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {procForm.condition==='partial'&&(
                      <div style={{ background:'#fff8ec',border:'1px solid #fde68a',borderRadius:8,padding:14,marginBottom:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                        <div>
                          <label style={{ ...LBL,color:'#16a34a' }}><i className="ri-arrow-down-circle-line" style={{ marginRight:4 }}/>Back to Stock (qty)</label>
                          <input type="number" style={inp} min="0" max={selQty} value={procForm.resalableQty}
                            onChange={e=>setProcForm(f=>({...f,resalableQty:Number(e.target.value),writeOffQty:selQty-Number(e.target.value)}))}/>
                        </div>
                        <div>
                          <label style={{ ...LBL,color:'#991b1b' }}><i className="ri-error-warning-line" style={{ marginRight:4 }}/>Write Off (qty)</label>
                          <input type="number" style={{ ...inp,background:'var(--bg-subtle)' }} readOnly value={selQty-Number(procForm.resalableQty)}/>
                        </div>
                      </div>
                    )}

                    {procForm.condition!=='partial'&&(
                      <div style={{ background:'var(--bg-subtle)',border:'1px solid var(--border)',borderRadius:8,padding:12,marginBottom:14,fontSize:13,display:'flex',alignItems:'center',gap:10 }}>
                        <i className={procForm.condition==='resalable'?'ri-arrow-down-circle-line':'ri-error-warning-line'} style={{ fontSize:24,color:procForm.condition==='resalable'?'#16a34a':'#991b1b' }}/>
                        <span>All <strong>{selQty}</strong> will be{' '}
                          {procForm.condition==='resalable'
                            ? <span style={{ color:'#16a34a',fontWeight:600 }}>returned to stock</span>
                            : <span style={{ color:'#991b1b',fontWeight:600 }}>written off to Lost & Damaged</span>}.
                        </span>
                      </div>
                    )}

                    <div style={{ marginBottom:20 }}>
                      <label style={LBL}>Inspection Notes</label>
                      <textarea style={{ ...inp,resize:'vertical' }} rows={4} placeholder="Describe what was found during inspection…" value={procForm.inspectionNotes} onChange={e=>setProcForm(f=>({...f,inspectionNotes:e.target.value}))}/>
                    </div>
                    <button style={{ ...btnP,width:'100%',justifyContent:'center' }} onClick={saveInspection} disabled={!procForm.processedBy}>
                      <i className="ri-arrow-right-line"/>Save Inspection & Proceed to Refund
                    </button>
                  </>
                )}

                {processTab==='refund'&&(
                  <>
                    <div style={{ fontWeight:700,fontSize:14,marginBottom:16,display:'flex',alignItems:'center',gap:8 }}>
                      <i className="ri-refund-2-line" style={{ color:'#16a34a' }}/>Refund Decision
                    </div>
                    <div style={{ background:'var(--bg-subtle)',border:'1px solid var(--border)',borderRadius:8,padding:14,marginBottom:16 }}>
                      <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:8 }}>INSPECTION OUTCOME</div>
                      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                        <Badge cfg={CONDITION_CFG[procForm.condition]||CONDITION_CFG.pending_check}/>
                        <span style={{ fontSize:13,color:'var(--text-secondary)' }}>
                          {procForm.condition==='partial'
                            ? `${procForm.resalableQty} back to stock · ${selQty-procForm.resalableQty} written off`
                            : CONDITION_CFG[procForm.condition]?.action}
                        </span>
                      </div>
                      {procForm.inspectionNotes&&<div style={{ fontSize:12,color:'var(--text-muted)',fontStyle:'italic' }}>"{procForm.inspectionNotes}"</div>}
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16 }}>
                      <div>
                        <label style={LBL}>Refund Amount (₦)</label>
                        <input type="number" style={inp} min="0" max={Number(selected.refund_amount||0)} value={procForm.refundAmount} onChange={e=>setProcForm(f=>({...f,refundAmount:Math.min(Number(e.target.value),Number(selected.refund_amount||0))}))}/>
                        <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:4 }}>Max: ₦{Number(selected.refund_amount||0).toLocaleString()}</div>
                      </div>
                      <div>
                        <label style={LBL}>Refund Method</label>
                        <select style={inp} value={procForm.refundMethod} onChange={e=>setProcForm(f=>({...f,refundMethod:e.target.value}))}>
                          {REFUND_METHODS.map(m=><option key={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={LBL}>{procForm.refundMethod==='Bank Transfer'?'Transfer Ref':procForm.refundMethod==='Wallet Credit'?'Wallet Ref':'Receipt No'}</label>
                        <input style={inp} placeholder="Optional" value={procForm.refundRef} onChange={e=>setProcForm(f=>({...f,refundRef:e.target.value}))}/>
                      </div>
                    </div>
                    <div style={{ background:'var(--bg-subtle)',border:'1px solid var(--border)',borderRadius:8,padding:16 }}>
                      <div style={{ fontWeight:600,fontSize:13,marginBottom:12 }}>Final Decision</div>
                      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
                        <button onClick={()=>saveRefundDecision('approve')} style={{ ...btnL,justifyContent:'center',color:'#166534',borderColor:'#bbf7d0' }}>
                          <i className="ri-checkbox-circle-line"/>Approve <small style={{ opacity:0.7 }}>(refund later)</small>
                        </button>
                        <button onClick={()=>saveRefundDecision('refunded')} disabled={!procForm.refundAmount} style={{ ...btnP,justifyContent:'center',background:'#16a34a' }}>
                          <i className="ri-refund-2-line"/>Approve & Refund Now
                        </button>
                        <button onClick={()=>saveRefundDecision('reject')} style={{ ...btnL,justifyContent:'center',color:'#991b1b',borderColor:'#fca5a5' }}>
                          <i className="ri-close-circle-line"/>Reject Return
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ padding:'14px 20px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end' }}>
              <button style={btnL} onClick={closeModal}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* VIEW MODAL */}
      {activeModal==='view'&&selected&&(
        <Modal title={selected.refund_ref||selected.id} onClose={closeModal} maxWidth={680}>
          <div style={{ padding:24 }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:20 }}>
              <Badge cfg={STATUS_CFG[selected.status]}/>
              <span style={{ fontSize:13,color:'var(--text-muted)' }}>{selected.created_at?new Date(selected.created_at).toISOString().slice(0,10):'—'} · {selected.customer_name}</span>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
              <div style={{ border:'1px solid var(--border)',borderRadius:10,padding:16,fontSize:13 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:12 }}>RETURN DETAILS</div>
                {[['Product',productName(selected.product_id)],['Qty Returned',`${selQty}`],['Unit Price',`₦${selUnitPrice.toLocaleString()}`],['Total Value',`₦${Number(selected.refund_amount||0).toLocaleString()}`],['Order Ref',selected.order_id||'—'],['Reason',selected.reason||'—']].map(([k,v],i)=>(
                  <div key={i} style={{ display:'flex',justifyContent:'space-between',marginBottom:8,gap:16 }}>
                    <span style={{ color:'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight:k==='Total Value'?700:500,color:k==='Total Value'?'#f06548':'var(--text-primary)',textAlign:'right' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ border:'1px solid var(--border)',borderRadius:10,padding:16,fontSize:13 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:12 }}>REFUND</div>
                {[['Refund Amount',Number(selected.refund_amount||0)>0?`₦${Number(selected.refund_amount).toLocaleString()}`:'—'],['Refund Method',selected.refund_method||'—']].map(([k,v])=>(
                  <div key={k} style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                    <span style={{ color:'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight:k==='Refund Amount'?700:400,color:k==='Refund Amount'?'#f06548':'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
                {selected.description&&(
                  <div style={{ marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)' }}>
                    <div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:6 }}>NOTES</div>
                    <div style={{ fontStyle:'italic',color:'var(--text-muted)' }}>"{selected.description}"</div>
                  </div>
                )}
              </div>
            </div>
            {/* Items returned table */}
            {selected.items?.length > 0 && (
              <div style={{ marginTop:20,border:'1px solid var(--border)',borderRadius:10,overflow:'hidden' }}>
                <div style={{ padding:'10px 16px',background:'var(--bg-subtle)',borderBottom:'1px solid var(--border)',fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em' }}>
                  Items Returned
                </div>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'var(--bg-subtle)' }}>
                      {['Product','Ordered Qty','Returned Qty','Condition','Remarks'].map(h=>(
                        <th key={h} style={{ padding:'8px 14px',fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',textAlign:'left',whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item,i)=>{
                      const cc = CONDITION_CFG[item.condition] || CONDITION_CFG.pending_check
                      return (
                        <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                          <td style={{ padding:'10px 14px',fontSize:13,fontWeight:600,color:'var(--text-primary)' }}>{item.product_name}</td>
                          <td style={{ padding:'10px 14px',fontSize:13,color:'var(--text-muted)',textAlign:'center' }}>{item.ordered_quantity}</td>
                          <td style={{ padding:'10px 14px',fontSize:13,fontWeight:700,color:'#1B4332',textAlign:'center' }}>{item.returned_quantity}</td>
                          <td style={{ padding:'10px 14px' }}>
                            <span style={{ display:'inline-flex',alignItems:'center',borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600,background:cc.bg,color:cc.color }}>{cc.label}</span>
                          </td>
                          <td style={{ padding:'10px 14px',fontSize:12,color:'var(--text-muted)',fontStyle:item.remarks?'italic':'normal' }}>
                            {item.remarks ? `"${item.remarks}"` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,paddingTop:16,borderTop:'1px solid var(--border)' }}>
              {(selected.status==='pending'||selected.status==='inspecting')&&(
                <button style={btnP} onClick={()=>{ closeModal(); setTimeout(()=>openProcess(selected),50) }}>
                  <i className="ri-check-double-line"/>Process Return
                </button>
              )}
              <button style={btnL} onClick={closeModal}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {activeModal==='delete'&&(
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1054 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:1055,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
            <div style={{ background:'var(--bg-card)',borderRadius:14,width:'100%',maxWidth:380,boxShadow:'0 8px 40px rgba(0,0,0,0.18)',padding:32,textAlign:'center' }}>
              <div style={{ width:56,height:56,borderRadius:'50%',background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
                <i className="ri-delete-bin-line" style={{ fontSize:30,color:'#dc2626' }}/>
              </div>
              <div style={{ fontFamily:'var(--heading-font)',fontWeight:700,fontSize:16,marginBottom:6 }}>Delete Return?</div>
              <div style={{ fontSize:13,color:'var(--text-muted)',marginBottom:24 }}>{selected?.refund_ref || selected?.id} — {selected?.customer_name || 'Unknown'}</div>
              <div style={{ display:'flex',gap:10 }}>
                <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                <button style={{ ...btnDanger,flex:1 }} onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
