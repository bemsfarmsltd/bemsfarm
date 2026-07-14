import { useState, useMemo } from 'react'

const MOCK_POLICIES = [
  { id:1,  name:'Fresh Produce Guarantee', type:'freshness', days:3,   products:24, description:'All fresh produce guaranteed fresh for 3 days or we replace it.',         status:'active',   created:'2026-01-10' },
  { id:2,  name:'Meat Quality Assurance',  type:'quality',   days:2,   products:12, description:'Meat products guaranteed for quality and freshness within 2 days.',       status:'active',   created:'2026-01-15' },
  { id:3,  name:'Seafood Freshness',       type:'freshness', days:1,   products:9,  description:'All seafood guaranteed fresh day of delivery. Next-day replacement.',     status:'active',   created:'2026-01-15' },
  { id:4,  name:'Dairy Shelf Life',        type:'shelf_life',days:7,   products:6,  description:'Dairy products guaranteed to last at least 7 days from delivery.',        status:'active',   created:'2026-01-20' },
  { id:5,  name:'Packaged Goods',          type:'seal',      days:30,  products:15, description:'All sealed packaged goods covered for 30 days if seal is intact.',        status:'active',   created:'2026-02-01' },
  { id:6,  name:'Premium Farm Bundle',     type:'quality',   days:5,   products:8,  description:'Bems Farms premium bundle — quality guaranteed for 5 days.',             status:'inactive', created:'2026-02-10' },
]

const MOCK_CLAIMS = [
  { id:1,  order:'#ORD-2026-0412', customer:'Amaka O.',   product:'Catfish (Fresh)',    policy:'Seafood Freshness',       issue:'Fish had off smell on arrival',    status:'approved',  date:'2026-04-12', resolution:'Replaced with fresh batch' },
  { id:2,  order:'#ORD-2026-0398', customer:'Emeka D.',   product:'Chicken (Whole)',    policy:'Meat Quality Assurance',  issue:'Chicken looked pale, not fresh',   status:'pending',   date:'2026-04-10', resolution:'' },
  { id:3,  order:'#ORD-2026-0381', customer:'Ngozi A.',   product:'Farm Eggs (Crate)', policy:'Fresh Produce Guarantee', issue:'3 eggs cracked on arrival',        status:'approved',  date:'2026-04-08', resolution:'Partial refund issued' },
  { id:4,  order:'#ORD-2026-0375', customer:'Tunde B.',   product:'Whole Milk (1L)',    policy:'Dairy Shelf Life',        issue:'Milk turned sour in 3 days',       status:'pending',   date:'2026-04-07', resolution:'' },
  { id:5,  order:'#ORD-2026-0362', customer:'Chioma N.',  product:'Local Tomatoes',     policy:'Fresh Produce Guarantee', issue:'Tomatoes already soft on delivery', status:'rejected',  date:'2026-04-05', resolution:'Claim outside coverage window' },
  { id:6,  order:'#ORD-2026-0340', customer:'Samuel K.',  product:'Beef (Boneless)',    policy:'Meat Quality Assurance',  issue:'Different cut than ordered',       status:'approved',  date:'2026-04-03', resolution:'Full replacement sent' },
]

const POLICY_TYPES = ['freshness','quality','shelf_life','seal']
const BLANK_POLICY = { name:'', type:'freshness', days:3, products:0, description:'', status:'active' }

const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const btnD = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#f06548',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'#f9fafb' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }

const CLAIM_STATUS_STYLE = {
  approved: { background:'#dcfce7',color:'#166534' },
  pending:  { background:'#fef3c7',color:'#92400e' },
  rejected: { background:'#fee2e2',color:'#991b1b' },
}

const TYPE_COLOR = { freshness:'#0ab39c', quality:'#405189', shelf_life:'#299cdb', seal:'#a78bfa' }

export default function Warranty() {
  const [tab, setTab]                   = useState('policies')
  const [policies, setPolicies]         = useState(MOCK_POLICIES)
  const [claims, setClaims]             = useState(MOCK_CLAIMS)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [editItem, setEditItem]         = useState(null)
  const [viewItem, setViewItem]         = useState(null)
  const [form, setForm]                 = useState(BLANK_POLICY)

  const filteredPolicies = useMemo(() => policies.filter(r => {
    const m = r.name.toLowerCase().includes(search.toLowerCase())
    return m && (filterStatus==='all'||r.status===filterStatus)
  }), [policies, search, filterStatus])

  const filteredClaims = useMemo(() => claims.filter(r => {
    const m = r.product.toLowerCase().includes(search.toLowerCase()) ||
              r.customer.toLowerCase().includes(search.toLowerCase()) ||
              r.order.toLowerCase().includes(search.toLowerCase())
    return m && (filterStatus==='all'||r.status===filterStatus)
  }), [claims, search, filterStatus])

  const stats = useMemo(() => ({
    policies:  policies.length,
    active:    policies.filter(p=>p.status==='active').length,
    totalClaims: claims.length,
    pending:   claims.filter(c=>c.status==='pending').length,
    approved:  claims.filter(c=>c.status==='approved').length,
  }), [policies, claims])

  function openAdd() { setEditItem(null); setForm({...BLANK_POLICY}); setActiveModal('form') }
  function openEdit(r) { setEditItem(r); setForm({...r}); setActiveModal('form') }
  function openDelete(r) { setEditItem(r); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setEditItem(null); setViewItem(null) }

  function saveForm(e) {
    e.preventDefault()
    if (editItem) {
      setPolicies(p=>p.map(r=>r.id===editItem.id?{...r,...form}:r))
    } else {
      setPolicies(p=>[...p,{ id:Math.max(...p.map(r=>r.id))+1,...form,created:new Date().toISOString().slice(0,10) }])
    }
    closeModal()
  }

  function confirmDelete() { setPolicies(p=>p.filter(r=>r.id!==editItem.id)); closeModal() }

  function approveClaim(id) { setClaims(p=>p.map(c=>c.id===id?{...c,status:'approved',resolution:'Approved by admin'}:c)) }
  function rejectClaim(id)  { setClaims(p=>p.map(c=>c.id===id?{...c,status:'rejected',resolution:'Rejected by admin'}:c)) }

  const B = '#e5e7eb', S = '#6b7280'

  const TABS = [
    { key:'policies', label:'Warranty Policies', count:policies.length },
    { key:'claims',   label:'Claims',             count:claims.length  },
  ]

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Warranty & Quality</div>
          <div style={{ fontSize:12,color:S,marginTop:2 }}>Products → Warranty</div>
        </div>
        {tab==='policies'&&<button style={btnP} onClick={openAdd}><i className="ri-add-line"/>Add Policy</button>}
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:24 }}>
        {[
          { label:'Policies',       value:stats.policies,    icon:'ri-shield-check-line',    color:'#405189' },
          { label:'Active',         value:stats.active,      icon:'ri-checkbox-circle-line', color:'#0ab39c' },
          { label:'Total Claims',   value:stats.totalClaims, icon:'ri-file-list-3-line',     color:'#299cdb' },
          { label:'Pending Claims', value:stats.pending,     icon:'ri-time-line',            color:'#f7b84b' },
          { label:'Approved',       value:stats.approved,    icon:'ri-check-double-line',    color:'#16a34a' },
        ].map(c=>(
          <div key={c.label} style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,borderLeft:`4px solid ${c.color}`,padding:14,boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:'50%',background:`${c.color}1a`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:20,color:c.color }}/>
            </div>
            <div>
              <div style={{ fontWeight:800,fontSize:20,color:c.color,fontFamily:'Syne,sans-serif' }}>{c.value}</div>
              <div style={{ fontSize:11,color:S }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding:'0 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:0 }}>
          <div style={{ display:'flex' }}>
            {TABS.map(t=>(
              <button key={t.key} onClick={()=>{ setTab(t.key); setSearch(''); setFilterStatus('all') }}
                style={{ padding:'14px 18px',border:'none',borderBottom:tab===t.key?'2px solid #1B4332':'2px solid transparent',background:'transparent',fontFamily:'Nunito,sans-serif',fontWeight:tab===t.key?700:500,fontSize:13,color:tab===t.key?'#1B4332':S,cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
                {t.label}
                <span style={{ background:tab===t.key?'#1B4332':B,color:tab===t.key?'#fff':S,borderRadius:20,padding:'1px 7px',fontSize:10,fontWeight:700 }}>{t.count}</span>
              </button>
            ))}
          </div>
          <div style={{ display:'flex',gap:8,padding:'10px 0 10px 20px',borderLeft:`1px solid ${B}` }}>
            <div style={{ position:'relative' }}>
              <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:S,fontSize:15,pointerEvents:'none' }}/>
              <input type="text" placeholder={tab==='policies'?'Search policies…':'Search claims…'} value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp,paddingLeft:34,width:200 }}/>
            </div>
            <select style={{ ...inp,width:'auto' }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="all">All</option>
              {tab==='policies'?<><option value="active">Active</option><option value="inactive">Inactive</option></>
                :<><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></>}
            </select>
          </div>
        </div>

        {/* Policies table */}
        {tab==='policies'&&(
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead><tr>{['Policy Name','Type','Coverage','Products','Status','Created','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {filteredPolicies.length===0&&(
                  <tr><td colSpan={7} style={{ ...TD,textAlign:'center',padding:'60px 0',color:S }}>
                    <i className="ri-shield-check-line" style={{ fontSize:36,display:'block',marginBottom:8 }}/>No policies found
                  </td></tr>
                )}
                {filteredPolicies.map(r=>(
                  <tr key={r.id}>
                    <td style={TD}>
                      <div style={{ fontWeight:600 }}>{r.name}</div>
                      <div style={{ fontSize:11,color:S,marginTop:2,maxWidth:240,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.description}</div>
                    </td>
                    <td style={TD}><span style={{ background:`${TYPE_COLOR[r.type]}1a`,color:TYPE_COLOR[r.type],borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600,textTransform:'capitalize' }}>{r.type.replace('_',' ')}</span></td>
                    <td style={{ ...TD,fontWeight:600 }}>{r.days} day{r.days>1?'s':''}</td>
                    <td style={TD}><span style={{ background:'#f3f4f6',color:'#374151',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:600 }}>{r.products}</span></td>
                    <td style={TD}><span style={{ background:r.status==='active'?'#dcfce7':'#fee2e2',color:r.status==='active'?'#166534':'#991b1b',borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600 }}>{r.status==='active'?'Active':'Inactive'}</span></td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{r.created}</td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        <button onClick={()=>openEdit(r)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0f4ff',color:'#405189',cursor:'pointer' }}><i className="ri-pencil-line"/></button>
                        <button onClick={()=>openDelete(r)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#fff0f0',color:'#f06548',cursor:'pointer' }}><i className="ri-delete-bin-line"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Claims table */}
        {tab==='claims'&&(
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead><tr>{['Order','Customer','Product','Policy','Issue','Status','Date','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {filteredClaims.length===0&&(
                  <tr><td colSpan={8} style={{ ...TD,textAlign:'center',padding:'60px 0',color:S }}>
                    <i className="ri-file-list-3-line" style={{ fontSize:36,display:'block',marginBottom:8 }}/>No claims found
                  </td></tr>
                )}
                {filteredClaims.map(r=>(
                  <tr key={r.id}>
                    <td style={TD}><code style={{ fontSize:11,background:'#f3f4f6',padding:'2px 6px',borderRadius:4,color:'#374151' }}>{r.order}</code></td>
                    <td style={{ ...TD,fontWeight:600 }}>{r.customer}</td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{r.product}</td>
                    <td style={{ ...TD,fontSize:11 }}><span style={{ background:'#f3f4f6',color:'#374151',borderRadius:20,padding:'2px 8px' }}>{r.policy}</span></td>
                    <td style={{ ...TD,color:S,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:12 }}>{r.issue}</td>
                    <td style={TD}><span style={{ ...CLAIM_STATUS_STYLE[r.status],borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600,textTransform:'capitalize' }}>{r.status}</span></td>
                    <td style={{ ...TD,color:S,fontSize:12,whiteSpace:'nowrap' }}>{r.date}</td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        <button onClick={()=>{ setViewItem(r); setActiveModal('claim') }} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0f4ff',color:'#405189',cursor:'pointer' }}><i className="ri-eye-line"/></button>
                        {r.status==='pending'&&<>
                          <button onClick={()=>approveClaim(r.id)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0fdf4',color:'#16a34a',cursor:'pointer' }}><i className="ri-check-line"/></button>
                          <button onClick={()=>rejectClaim(r.id)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#fff0f0',color:'#f06548',cursor:'pointer' }}><i className="ri-close-line"/></button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ padding:'10px 20px',borderTop:`1px solid ${B}`,fontSize:12,color:S }}>
          {tab==='policies'?`Showing ${filteredPolicies.length} of ${policies.length} policies`:`Showing ${filteredClaims.length} of ${claims.length} claims`}
        </div>
      </div>

      {/* ADD/EDIT POLICY MODAL */}
      {activeModal==='form'&&(
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:500,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-shield-check-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>{editItem?'Edit Policy':'Add Warranty Policy'}</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={saveForm} style={{ padding:24 }}>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Policy Name <span style={{ color:'#f06548' }}>*</span></label>
                  <input style={inp} required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g., Fresh Produce Guarantee"/>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Type</label>
                    <select style={inp} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                      {POLICY_TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Coverage (days)</label>
                    <input type="number" style={inp} min={1} value={form.days} onChange={e=>setForm(f=>({...f,days:parseInt(e.target.value)||1}))}/>
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Description</label>
                  <textarea style={{ ...inp,resize:'vertical' }} rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Describe what this policy covers…"/>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={LBL}>Status</label>
                  <select style={inp} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }}>{editItem?'Save Changes':'Add Policy'}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* CLAIM DETAIL MODAL */}
      {activeModal==='claim'&&viewItem&&(
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:500,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-file-list-3-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Claim Detail</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24 }}>
                {[
                  ['Order', viewItem.order], ['Customer', viewItem.customer], ['Product', viewItem.product],
                  ['Policy', viewItem.policy], ['Date', viewItem.date],
                ].map(([k,v])=>(
                  <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid #f3f4f6`,fontSize:13 }}>
                    <span style={{ color:S,fontWeight:600 }}>{k}</span>
                    <span style={{ color:'#111827',fontWeight:500 }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:12,fontWeight:700,color:'#374151',marginBottom:6 }}>Issue Reported</div>
                  <p style={{ fontSize:13,color:'#374151',background:'#f9fafb',borderRadius:8,padding:'10px 14px',margin:0,lineHeight:1.6 }}>{viewItem.issue}</p>
                </div>
                {viewItem.resolution&&(
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:12,fontWeight:700,color:'#374151',marginBottom:6 }}>Resolution</div>
                    <p style={{ fontSize:13,color:'#374151',background:'#f0fdf4',borderRadius:8,padding:'10px 14px',margin:0 }}>{viewItem.resolution}</p>
                  </div>
                )}
                <div style={{ marginTop:16,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                  <span style={{ ...CLAIM_STATUS_STYLE[viewItem.status],borderRadius:50,padding:'4px 12px',fontSize:12,fontWeight:600,textTransform:'capitalize' }}>{viewItem.status}</span>
                  {viewItem.status==='pending'&&(
                    <div style={{ display:'flex',gap:8 }}>
                      <button style={{ ...btnP,background:'#16a34a' }} onClick={()=>{ approveClaim(viewItem.id); closeModal() }}><i className="ri-check-line"/>Approve</button>
                      <button style={btnD} onClick={()=>{ rejectClaim(viewItem.id); closeModal() }}><i className="ri-close-line"/>Reject</button>
                    </div>
                  )}
                  {viewItem.status!=='pending'&&<button style={btnL} onClick={closeModal}>Close</button>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* DELETE MODAL */}
      {activeModal==='delete'&&editItem&&(
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:360,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#7f1d1d',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-delete-bin-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Delete Policy?</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24,textAlign:'center' }}>
                <p style={{ color:S,fontSize:14,marginBottom:24 }}>Delete policy <strong style={{ color:'#111827' }}>{editItem.name}</strong>? Products using it will lose warranty coverage.</p>
                <div style={{ display:'flex',gap:10 }}>
                  <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button style={{ ...btnD,flex:1,justifyContent:'center' }} onClick={confirmDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
