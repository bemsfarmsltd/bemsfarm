import { useState, useMemo } from 'react'

const PRODUCTS = ['Basmati Rice (5kg)','Fresh Tomatoes','Palm Oil (25L)','Catfish (Smoked)','Fresh Pepper','Chicken (Whole)','Fresh Yam','Cassava Flour','Fresh Milk (1L)','Plantain (Bunch)','Fresh Eggs (Crate)','Goat Meat (1kg)']
const CUSTOMERS = ['Mrs. Adaeze Okafor','Chioma Eze','Bayo Farms Ltd','Eko Catering Services','Mama Cee Restaurant','Sunshine Bakery','Mr. Emeka Nwosu','Funke Abiodun','Chidi Catering Ltd','Walk-in Customer']
const STAFF = ['Admin','Emeka Adeola','Ngozi Bello','Tunde Okafor','Chike Nwosu']
const RETURN_REASONS = ['Damaged on delivery','Wrong item sent','Quality below standard','Spoiled / Already expired','Item missing from order','Customer changed mind','Incorrect quantity','Packaging damaged']
const REFUND_METHODS = ['Cash','Wallet Credit','Bank Transfer']
const UNITS = ['kg','g','litre','pack','piece','bunch','bag','crate','tuber','bottle','can']

const CONDITION_CFG = {
  resalable:    { label:'Reusable',            color:'#0ab39c', bg:'#d1fae5', action:'Return to stock'              },
  damaged:      { label:'Damaged',             color:'#f06548', bg:'#fee2e2', action:'Write off to Lost & Damaged'  },
  partial:      { label:'Partial Goods',       color:'#f7b84b', bg:'#fef3c7', action:'Split — partial stock return' },
  partial_goods:{ label:'Partial Goods',       color:'#f7b84b', bg:'#fef3c7', action:'Split — partial stock return' },
  pending_check:{ label:'Awaiting Inspection', color:'#6b7280', bg:'#f3f4f6', action:''                             },
}

const STATUS_CFG = {
  pending:    { label:'Pending',    color:'#92400e', bg:'#fef3c7' },
  inspecting: { label:'Inspecting', color:'#075985', bg:'#e0f2fe' },
  approved:   { label:'Approved',   color:'#1d4ed8', bg:'#dbeafe' },
  refunded:   { label:'Refunded',   color:'#166534', bg:'#dcfce7' },
  rejected:   { label:'Rejected',   color:'#991b1b', bg:'#fee2e2' },
}

const MOCK_RETURNS = [
  { id:1, ref:'RTN-2026-001', date:'2026-06-12', ordRef:'ORD-2026-092', customer:'Mrs. Adaeze Okafor', phone:'0803 456 7890', product:'Fresh Tomatoes', qty:3, unit:'kg', unitPrice:800, totalValue:2400, reason:'Spoiled / Already expired', notes:'Tomatoes were soft and mouldy when opened at home. Purchased same day.', condition:'damaged', goodsAction:'write_off', resalableQty:0, writeOffQty:3, refundAmount:2400, refundMethod:'Cash', refundRef:'', status:'refunded', processedBy:'Ngozi Bello', processedOn:'2026-06-12', inspectionNotes:'Confirmed spoilage — all 3kg written off to Lost & Damaged.',
    items:[
      { product_name:'Fresh Tomatoes', ordered_quantity:3, returned_quantity:3, condition:'damaged', remarks:'All soft and mouldy' },
    ]},
  { id:2, ref:'RTN-2026-002', date:'2026-06-15', ordRef:'ORD-2026-105', customer:'Bayo Farms Ltd', phone:'0812 345 6789', product:'Palm Oil (25L)', qty:1, unit:'can', unitPrice:18000, totalValue:18000, reason:'Damaged on delivery', notes:'Can arrived dented, lid not properly sealed. Oil may be contaminated.', condition:'damaged', goodsAction:'write_off', resalableQty:0, writeOffQty:1, refundAmount:18000, refundMethod:'Bank Transfer', refundRef:'TRF-BF-0015', status:'refunded', processedBy:'Admin', processedOn:'2026-06-15', inspectionNotes:'Can seal broken — cannot resell. Written off. Refund transferred to Bayo Farms account.',
    items:[
      { product_name:'Palm Oil (25L)', ordered_quantity:1, returned_quantity:1, condition:'damaged', remarks:'Can dented, lid not sealed' },
    ]},
  { id:3, ref:'RTN-2026-003', date:'2026-06-18', ordRef:'ORD-2026-118', customer:'Eko Catering Services', phone:'0901 234 5678', product:'Chicken (Whole)', qty:5, unit:'kg', unitPrice:2800, totalValue:14000, reason:'Wrong item sent', notes:'Ordered boneless chicken breast, received whole chicken instead.', condition:'resalable', goodsAction:'back_to_stock', resalableQty:5, writeOffQty:0, refundAmount:14000, refundMethod:'Wallet Credit', refundRef:'WLT-ECS-003', status:'refunded', processedBy:'Emeka Adeola', processedOn:'2026-06-18', inspectionNotes:'Goods in perfect condition — unopened. Returned to Cold Room stock.',
    items:[
      { product_name:'Chicken (Whole)', ordered_quantity:5, returned_quantity:5, condition:'reusable', remarks:'Unopened, perfect condition' },
    ]},
  { id:4, ref:'RTN-2026-004', date:'2026-06-20', ordRef:'ORD-2026-125', customer:'Mama Cee Restaurant', phone:'0705 678 9012', product:'Fresh Pepper', qty:4, unit:'kg', unitPrice:700, totalValue:2800, reason:'Quality below standard', notes:"Pepper was shrivelled and dry, not fresh as expected for today's order.", condition:'partial', goodsAction:'split', resalableQty:1, writeOffQty:3, refundAmount:2800, refundMethod:'Cash', refundRef:'', status:'approved', processedBy:'Tunde Okafor', processedOn:'2026-06-20', inspectionNotes:'1kg still firm and sellable — returned to stock. 3kg shrivelled — written off.',
    items:[
      { product_name:'Fresh Pepper', ordered_quantity:4, returned_quantity:4, condition:'partial_goods', remarks:'1kg firm, 3kg shrivelled' },
    ]},
  { id:5, ref:'RTN-2026-005', date:'2026-06-22', ordRef:'ORD-2026-133', customer:'Chioma Eze', phone:'0818 901 2345', product:'Fresh Milk (1L)', qty:3, unit:'bottle', unitPrice:900, totalValue:2700, reason:'Packaging damaged', notes:'Two bottles had cracked caps. One bottle was leaking.', condition:'pending_check', goodsAction:'', resalableQty:0, writeOffQty:0, refundAmount:2700, refundMethod:'Cash', refundRef:'', status:'inspecting', processedBy:'Ngozi Bello', processedOn:'', inspectionNotes:'',
    items:[
      { product_name:'Fresh Milk (1L)', ordered_quantity:3, returned_quantity:2, condition:'damaged',  remarks:'Cracked caps' },
      { product_name:'Fresh Milk (1L)', ordered_quantity:3, returned_quantity:1, condition:'reusable', remarks:'Sealed, no damage' },
    ]},
  { id:6, ref:'RTN-2026-006', date:'2026-06-24', ordRef:'ORD-2026-138', customer:'Sunshine Bakery', phone:'0703 456 7890', product:'Cassava Flour', qty:5, unit:'pack', unitPrice:1100, totalValue:5500, reason:'Incorrect quantity', notes:'Ordered 10 packs, only received 5. Requesting refund for the 5 missing packs.', condition:'pending_check', goodsAction:'', resalableQty:0, writeOffQty:0, refundAmount:5500, refundMethod:'Bank Transfer', refundRef:'', status:'pending', processedBy:'', processedOn:'', inspectionNotes:'',
    items:[
      { product_name:'Cassava Flour', ordered_quantity:10, returned_quantity:5, condition:'reusable', remarks:'Missing packs — not received' },
    ]},
  { id:7, ref:'RTN-2026-007', date:'2026-06-25', ordRef:'ORD-2026-141', customer:'Mr. Emeka Nwosu', phone:'0806 789 0123', product:'Basmati Rice (5kg)', qty:2, unit:'bag', unitPrice:4500, totalValue:9000, reason:'Customer changed mind', notes:'Purchased by mistake. Has not been opened.', condition:'resalable', goodsAction:'back_to_stock', resalableQty:2, writeOffQty:0, refundAmount:0, refundMethod:'', refundRef:'', status:'rejected', processedBy:'Admin', processedOn:'2026-06-25', inspectionNotes:'Return rejected — "change of mind" is outside Bems Farms return policy (7-day return only covers quality issues and wrong items).',
    items:[
      { product_name:'Basmati Rice (5kg)', ordered_quantity:2, returned_quantity:2, condition:'reusable', remarks:'Unopened bags' },
    ]},
]

function nextRef(list) {
  const max=list.reduce((m,r)=>Math.max(m,Number(r.ref.split('-')[2])),0)
  return `RTN-2026-${String(max+1).padStart(3,'0')}`
}

const inp  = { display:'block',width:'100%',padding:'9px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box' }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }

function Modal({ title, onClose, children, maxWidth=620, wide=false }) {
  return <>
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1054 }}/>
    <div style={{ position:'fixed',inset:0,zIndex:1055,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:wide?960:maxWidth,boxShadow:'0 8px 40px rgba(0,0,0,0.18)',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column' }}>
        <div style={{ background:'#1B4332',color:'#fff',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15 }}>{title}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.8)',cursor:'pointer',fontSize:20,display:'flex',padding:4 }}><i className="ri-close-line"/></button>
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
  const [records,setRecords]           = useState(MOCK_RETURNS)
  const [search,setSearch]             = useState('')
  const [filterStatus,setFilterStatus] = useState('all')
  const [activeModal,setActiveModal]   = useState(null)
  const [selected,setSelected]         = useState(null)
  const [processTab,setProcessTab]     = useState('inspect')

  const [logForm,setLogForm] = useState({ ref:'',date:'',ordRef:'',customer:CUSTOMERS[0],phone:'',product:PRODUCTS[0],qty:1,unit:'kg',unitPrice:0,reason:RETURN_REASONS[0],notes:'' })

  const [procForm,setProcForm] = useState({ condition:'resalable',goodsAction:'back_to_stock',resalableQty:0,writeOffQty:0,inspectionNotes:'',processedBy:STAFF[0],refundAmount:0,refundMethod:REFUND_METHODS[0],refundRef:'' })

  const filtered = useMemo(()=>records.filter(r=>{
    const q=search.toLowerCase()
    const m=r.ref.toLowerCase().includes(q)||r.customer.toLowerCase().includes(q)||r.product.toLowerCase().includes(q)||r.ordRef.toLowerCase().includes(q)
    return m&&(filterStatus==='all'||r.status===filterStatus)
  }),[records,search,filterStatus])

  const stats = useMemo(()=>({
    total:    records.length,
    pending:  records.filter(r=>r.status==='pending'||r.status==='inspecting').length,
    approved: records.filter(r=>r.status==='approved').length,
    refunded: records.filter(r=>r.status==='refunded').reduce((s,r)=>s+r.refundAmount,0),
  }),[records])

  function openLog() {
    setLogForm({ ref:nextRef(records), date:new Date().toISOString().slice(0,10), ordRef:'', customer:CUSTOMERS[0], phone:'', product:PRODUCTS[0], qty:1, unit:'kg', unitPrice:0, reason:RETURN_REASONS[0], notes:'' })
    setActiveModal('log')
  }

  function openProcess(r) {
    setSelected(r)
    setProcForm({ condition:r.condition==='pending_check'?'resalable':r.condition, goodsAction:r.goodsAction||'back_to_stock', resalableQty:r.resalableQty, writeOffQty:r.writeOffQty, inspectionNotes:r.inspectionNotes||'', processedBy:r.processedBy||STAFF[0], refundAmount:r.refundAmount, refundMethod:r.refundMethod||REFUND_METHODS[0], refundRef:r.refundRef||'' })
    setProcessTab('inspect'); setActiveModal('process')
  }

  function openView(r) { setSelected(r); setActiveModal('view') }
  function openDelete(r) { setSelected(r); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setSelected(null) }

  function saveLog(e) {
    e.preventDefault()
    setRecords(prev=>[...prev,{ id:Math.max(...prev.map(r=>r.id))+1, ...logForm, totalValue:Number(logForm.qty)*Number(logForm.unitPrice), condition:'pending_check', goodsAction:'', resalableQty:0, writeOffQty:0, refundAmount:Number(logForm.qty)*Number(logForm.unitPrice), refundMethod:'', refundRef:'', status:'pending', processedBy:'', processedOn:'', inspectionNotes:'' }])
    closeModal()
  }

  function saveInspection() {
    const today=new Date().toISOString().slice(0,10)
    setRecords(prev=>prev.map(r=>r.id!==selected.id?r:{ ...r, condition:procForm.condition, goodsAction:procForm.goodsAction, resalableQty:Number(procForm.resalableQty), writeOffQty:Number(procForm.writeOffQty), inspectionNotes:procForm.inspectionNotes, processedBy:procForm.processedBy, processedOn:today, status:'inspecting' }))
    setProcessTab('refund')
    setSelected(prev=>({ ...prev, status:'inspecting', condition:procForm.condition, processedBy:procForm.processedBy }))
  }

  function saveRefundDecision(decision) {
    const today=new Date().toISOString().slice(0,10)
    setRecords(prev=>prev.map(r=>r.id!==selected.id?r:{ ...r, condition:procForm.condition, goodsAction:procForm.goodsAction, resalableQty:Number(procForm.resalableQty), writeOffQty:Number(procForm.writeOffQty), inspectionNotes:procForm.inspectionNotes, processedBy:procForm.processedBy, processedOn:today, refundAmount:decision==='reject'?0:Number(procForm.refundAmount), refundMethod:procForm.refundMethod, refundRef:procForm.refundRef, status:decision==='reject'?'rejected':decision==='approve'?'approved':'refunded' }))
    closeModal()
  }

  function confirmDelete() { setRecords(prev=>prev.filter(r=>r.id!==selected.id)); closeModal() }

  function handleConditionChange(val) {
    const qty=selected?.qty||0
    let goodsAction='back_to_stock', resalableQty=qty, writeOffQty=0
    if (val==='damaged') { goodsAction='write_off'; resalableQty=0; writeOffQty=qty }
    if (val==='partial') { goodsAction='split'; resalableQty=0; writeOffQty=0 }
    setProcForm(f=>({ ...f,condition:val,goodsAction,resalableQty,writeOffQty }))
  }

  const btnDanger = { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#dc2626',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:22,color:'#111827' }}>Customer Returns & Refunds</div>
        <div style={{ fontSize:12,color:'#6b7280',marginTop:2 }}>Orders / Returns & Refunds</div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24 }}>
        {[
          { label:'Total Returns',        value:stats.total,                            icon:'ri-arrow-go-back-line',  color:'#405189',filter:'all'      },
          { label:'Pending / Inspecting', value:stats.pending,                          icon:'ri-time-line',           color:'#f7b84b', filter:'pending'  },
          { label:'Awaiting Refund',      value:stats.approved,                         icon:'ri-checkbox-circle-line',color:'#299cdb', filter:'approved' },
          { label:'Total Refunded',       value:`₦${stats.refunded.toLocaleString()}`,  icon:'ri-refund-2-line',       color:'#0ab39c', filter:'refunded' },
        ].map(c=>(
          <div key={c.label} onClick={()=>setFilterStatus(c.filter)}
            style={{ background:'#fff',borderRadius:12,border:'1px solid #f3f4f6',borderLeft:`3px solid ${c.color}`,padding:'16px 20px',display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',cursor:'pointer' }}>
            <div style={{ width:44,height:44,borderRadius:'50%',background:`${c.color}1a`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:20,color:c.color }}/>
            </div>
            <div>
              <div style={{ fontSize:18,fontWeight:800,color:c.color }}>{c.value}</div>
              <div style={{ fontSize:12,color:'#6b7280' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background:'#fff',borderRadius:12,border:'1px solid #f3f4f6',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',overflow:'hidden' }}>
        <div style={{ padding:'14px 16px',borderBottom:'1px solid #f3f4f6',display:'flex',flexWrap:'wrap',gap:10,alignItems:'center' }}>
          <div style={{ position:'relative',minWidth:260 }}>
            <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',fontSize:15 }}/>
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
              <tr style={{ background:'#f9fafb',borderBottom:'1px solid #e5e7eb' }}>
                {['Return Ref','Date','Customer','Order Ref','Product','Qty','Reason','Goods Condition','Refund Amount','Refund Method','Status','Actions'].map(h=>(
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0&&(
                <tr><td colSpan={12} style={{ ...TD,textAlign:'center',padding:48,color:'#9ca3af' }}>
                  <i className="ri-arrow-go-back-line" style={{ fontSize:36,display:'block',marginBottom:8 }}/>No return records found
                </td></tr>
              )}
              {filtered.map(r=>{
                const sc=STATUS_CFG[r.status], cc=CONDITION_CFG[r.condition]||CONDITION_CFG.pending_check
                return (
                  <tr key={r.id}>
                    <td style={TD}>
                      <span style={{ fontWeight:700,color:'#1B4332',cursor:'pointer' }} onClick={()=>openView(r)}>{r.ref}</span>
                    </td>
                    <td style={{ ...TD,fontSize:13 }}>{r.date}</td>
                    <td style={TD}>
                      <div style={{ fontWeight:600 }}>{r.customer}</div>
                      <div style={{ fontSize:11,color:'#6b7280' }}>{r.phone}</div>
                    </td>
                    <td style={{ ...TD,fontSize:12,color:'#6b7280' }}>{r.ordRef}</td>
                    <td style={TD}>{r.product}</td>
                    <td style={{ ...TD,fontWeight:600 }}>{r.qty} {r.unit}</td>
                    <td style={{ ...TD,maxWidth:160,whiteSpace:'normal',fontSize:12 }}>{r.reason}</td>
                    <td style={TD}><Badge cfg={cc}/></td>
                    <td style={{ ...TD,fontWeight:700,color:r.refundAmount>0?'#f06548':'#9ca3af' }}>
                      {r.refundAmount>0?`₦${r.refundAmount.toLocaleString()}`:'—'}
                    </td>
                    <td style={TD}>
                      {r.refundMethod
                        ? <span style={{ background:'#f9fafb',color:'#374151',border:'1px solid #e5e7eb',borderRadius:6,padding:'3px 8px',fontSize:12 }}>{r.refundMethod}</span>
                        : <span style={{ color:'#9ca3af' }}>—</span>}
                    </td>
                    <td style={TD}><Badge cfg={sc}/></td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        {(r.status==='pending'||r.status==='inspecting')&&(
                          <button title="Process" onClick={()=>openProcess(r)} style={{ background:'#dbeafe',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:14,color:'#1d4ed8' }}><i className="ri-check-double-line"/></button>
                        )}
                        <button title="View" onClick={()=>openView(r)} style={{ background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:14,color:'#374151' }}><i className="ri-eye-line"/></button>
                        <button title="Delete" onClick={()=>openDelete(r)} style={{ background:'#fee2e2',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:14,color:'#991b1b' }}><i className="ri-delete-bin-line"/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'10px 16px',borderTop:'1px solid #f3f4f6',fontSize:13,color:'#6b7280' }}>Showing {filtered.length} of {records.length} records</div>
      </div>

      {/* LOG RETURN MODAL */}
      {activeModal==='log'&&(
        <Modal title="Log Customer Return" onClose={closeModal} maxWidth={640}>
          <div style={{ padding:24 }}>
            <form onSubmit={saveLog}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12 }}>
                <div><label style={LBL}>Return Ref</label><input style={{ ...inp,background:'#f9fafb' }} readOnly value={logForm.ref}/></div>
                <div><label style={LBL}>Date *</label><input type="date" style={inp} required value={logForm.date} onChange={e=>setLogForm(f=>({...f,date:e.target.value}))}/></div>
                <div><label style={LBL}>Original Order Ref</label><input style={inp} placeholder="ORD-2026-XXX" value={logForm.ordRef} onChange={e=>setLogForm(f=>({...f,ordRef:e.target.value}))}/></div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12 }}>
                <div><label style={LBL}>Customer *</label>
                  <select style={inp} required value={logForm.customer} onChange={e=>setLogForm(f=>({...f,customer:e.target.value}))}>
                    {CUSTOMERS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={LBL}>Customer Phone</label><input style={inp} placeholder="0800 000 0000" value={logForm.phone} onChange={e=>setLogForm(f=>({...f,phone:e.target.value}))}/></div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:12,marginBottom:12 }}>
                <div><label style={LBL}>Product Returned *</label>
                  <select style={inp} required value={logForm.product} onChange={e=>setLogForm(f=>({...f,product:e.target.value}))}>
                    {PRODUCTS.map(p=><option key={p}>{p}</option>)}
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
        <Modal title={`Process Return — ${selected.ref}`} onClose={closeModal} wide>
          <div>
            {/* Status sub-header */}
            <div style={{ padding:'10px 20px',background:'#f9fafb',borderBottom:'1px solid #f3f4f6',display:'flex',alignItems:'center',gap:10 }}>
              <Badge cfg={STATUS_CFG[selected.status]}/>
              <span style={{ fontSize:13,color:'#6b7280' }}>{selected.customer} · {selected.product} · {selected.qty} {selected.unit}</span>
            </div>

            {/* Tab strip */}
            <div style={{ display:'flex',borderBottom:'1px solid #f3f4f6',background:'#f0f3f9' }}>
              {[{ id:'inspect',icon:'ri-search-2-line',label:'1 · Inspect Goods' },{ id:'refund',icon:'ri-refund-2-line',label:'2 · Refund Decision' }].map(t=>(
                <button key={t.id} onClick={()=>setProcessTab(t.id)}
                  style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px',border:'none',cursor:'pointer',fontSize:13,fontWeight:processTab===t.id?700:400,fontFamily:'Nunito,sans-serif',background:processTab===t.id?'#1B4332':'transparent',color:processTab===t.id?'#fff':'#6b7280',borderBottom:processTab===t.id?'none':'none' }}>
                  <i className={t.icon}/>{t.label}
                </button>
              ))}
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'280px 1fr' }}>
              {/* Left: Return summary */}
              <div style={{ padding:20,background:'#fafbfc',borderRight:'1px solid #f3f4f6' }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#6b7280',letterSpacing:1,marginBottom:12 }}>RETURN DETAILS</div>
                <div style={{ background:'#fff8ec',border:'1px solid #fde68a',borderRadius:10,padding:14,marginBottom:12 }}>
                  <div style={{ fontWeight:700,marginBottom:2 }}>{selected.product}</div>
                  <div style={{ fontSize:12,color:'#6b7280',marginBottom:10 }}>{selected.customer} · {selected.ordRef}</div>
                  {/* Per-item list */}
                  {selected.items?.length > 0 ? (
                    <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                      {selected.items.map((item,i)=>{
                        const cc=CONDITION_CFG[item.condition]||CONDITION_CFG.pending_check
                        return (
                          <div key={i} style={{ background:'#fff',borderRadius:8,padding:'8px 10px',border:'1px solid #fde68a' }}>
                            <div style={{ fontWeight:600,fontSize:12,marginBottom:4 }}>{item.product_name}</div>
                            <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
                              <span style={{ fontSize:11,color:'#6b7280' }}>Ordered: {item.ordered_quantity}</span>
                              <span style={{ fontSize:11,color:'#92400e',fontWeight:700 }}>Returning: {item.returned_quantity}</span>
                              <span style={{ display:'inline-flex',alignItems:'center',borderRadius:50,padding:'1px 8px',fontSize:10,fontWeight:600,background:cc.bg,color:cc.color }}>{cc.label}</span>
                            </div>
                            {item.remarks&&<div style={{ fontSize:11,color:'#9ca3af',fontStyle:'italic',marginTop:3 }}>"{item.remarks}"</div>}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
                      {[['QTY',`${selected.qty} ${selected.unit}`],['UNIT PRICE',`₦${selected.unitPrice?.toLocaleString()}`],['TOTAL',`₦${selected.totalValue?.toLocaleString()}`]].map(([k,v])=>(
                        <div key={k}><div style={{ fontSize:10,color:'#9ca3af' }}>{k}</div><div style={{ fontWeight:700,fontSize:13 }}>{v}</div></div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ border:'1px solid #e5e7eb',borderRadius:8,padding:12,marginBottom:10,fontSize:12 }}>
                  <div style={{ fontWeight:700,fontSize:11,color:'#6b7280',marginBottom:8 }}>CUSTOMER COMPLAINT</div>
                  <div style={{ fontWeight:600,marginBottom:4 }}>{selected.reason}</div>
                  {selected.notes&&<div style={{ color:'#6b7280',fontStyle:'italic' }}>"{selected.notes}"</div>}
                </div>
                <div style={{ border:'1px solid #e5e7eb',borderRadius:8,padding:12,fontSize:12 }}>
                  <div style={{ fontWeight:700,fontSize:11,color:'#6b7280',marginBottom:8 }}>RETURN INFO</div>
                  {[['Return Date',selected.date],['Phone',selected.phone||'—'],['Order Ref',selected.ordRef||'—']].map(([k,v])=>(
                    <div key={k} style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}><span style={{ color:'#6b7280' }}>{k}</span><span>{v}</span></div>
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
                            style={{ padding:14,borderRadius:10,border:`1.5px solid ${procForm.condition===opt.val?opt.color:'#e5e7eb'}`,background:procForm.condition===opt.val?`${opt.color}12`:'#fff',cursor:'pointer',textAlign:'center' }}>
                            <i className={opt.icon} style={{ fontSize:22,color:opt.color,display:'block',marginBottom:4 }}/>
                            <div style={{ fontSize:13,fontWeight:600,color:opt.color }}>{opt.title}</div>
                            <div style={{ fontSize:11,color:'#6b7280',marginTop:4 }}>{opt.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {procForm.condition==='partial'&&(
                      <div style={{ background:'#fff8ec',border:'1px solid #fde68a',borderRadius:8,padding:14,marginBottom:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                        <div>
                          <label style={{ ...LBL,color:'#16a34a' }}><i className="ri-arrow-down-circle-line" style={{ marginRight:4 }}/>Back to Stock (qty)</label>
                          <input type="number" style={inp} min="0" max={selected.qty} value={procForm.resalableQty}
                            onChange={e=>setProcForm(f=>({...f,resalableQty:Number(e.target.value),writeOffQty:selected.qty-Number(e.target.value)}))}/>
                        </div>
                        <div>
                          <label style={{ ...LBL,color:'#991b1b' }}><i className="ri-error-warning-line" style={{ marginRight:4 }}/>Write Off (qty)</label>
                          <input type="number" style={{ ...inp,background:'#f9fafb' }} readOnly value={selected.qty-Number(procForm.resalableQty)}/>
                        </div>
                      </div>
                    )}

                    {procForm.condition!=='partial'&&(
                      <div style={{ background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:12,marginBottom:14,fontSize:13,display:'flex',alignItems:'center',gap:10 }}>
                        <i className={procForm.condition==='resalable'?'ri-arrow-down-circle-line':'ri-error-warning-line'} style={{ fontSize:18,color:procForm.condition==='resalable'?'#16a34a':'#991b1b' }}/>
                        <span>All <strong>{selected.qty} {selected.unit}</strong> will be{' '}
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
                    <div style={{ background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:14,marginBottom:16 }}>
                      <div style={{ fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:8 }}>INSPECTION OUTCOME</div>
                      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                        <Badge cfg={CONDITION_CFG[procForm.condition]||CONDITION_CFG.pending_check}/>
                        <span style={{ fontSize:13,color:'#374151' }}>
                          {procForm.condition==='partial'
                            ? `${procForm.resalableQty} ${selected.unit} back to stock · ${selected.qty-procForm.resalableQty} ${selected.unit} written off`
                            : CONDITION_CFG[procForm.condition]?.action}
                        </span>
                      </div>
                      {procForm.inspectionNotes&&<div style={{ fontSize:12,color:'#6b7280',fontStyle:'italic' }}>"{procForm.inspectionNotes}"</div>}
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16 }}>
                      <div>
                        <label style={LBL}>Refund Amount (₦)</label>
                        <input type="number" style={inp} min="0" value={procForm.refundAmount} onChange={e=>setProcForm(f=>({...f,refundAmount:Number(e.target.value)}))}/>
                        <div style={{ fontSize:11,color:'#6b7280',marginTop:4 }}>Max: ₦{selected.totalValue?.toLocaleString()}</div>
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
                    <div style={{ background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:16 }}>
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

            <div style={{ padding:'14px 20px',borderTop:'1px solid #f3f4f6',display:'flex',justifyContent:'flex-end' }}>
              <button style={btnL} onClick={closeModal}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* VIEW MODAL */}
      {activeModal==='view'&&selected&&(
        <Modal title={selected.ref} onClose={closeModal} maxWidth={680}>
          <div style={{ padding:24 }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:20 }}>
              <Badge cfg={STATUS_CFG[selected.status]}/>
              <span style={{ fontSize:13,color:'#6b7280' }}>{selected.date} · {selected.customer}</span>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
              <div style={{ border:'1px solid #e5e7eb',borderRadius:10,padding:16,fontSize:13 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:12 }}>RETURN DETAILS</div>
                {[['Product',selected.product],['Qty Returned',`${selected.qty} ${selected.unit}`],['Unit Price',`₦${selected.unitPrice?.toLocaleString()}`],['Total Value',`₦${selected.totalValue?.toLocaleString()}`],['Order Ref',selected.ordRef||'—'],['Reason',selected.reason]].map(([k,v],i)=>(
                  <div key={i} style={{ display:'flex',justifyContent:'space-between',marginBottom:8,gap:16 }}>
                    <span style={{ color:'#6b7280' }}>{k}</span>
                    <span style={{ fontWeight:k==='Total Value'?700:500,color:k==='Total Value'?'#f06548':'#111827',textAlign:'right' }}>{v}</span>
                  </div>
                ))}
                {selected.notes&&(
                  <div style={{ marginTop:12,paddingTop:12,borderTop:'1px solid #f3f4f6' }}>
                    <div style={{ fontSize:11,color:'#6b7280',marginBottom:6 }}>CUSTOMER NOTES</div>
                    <div style={{ fontStyle:'italic' }}>"{selected.notes}"</div>
                  </div>
                )}
              </div>
              <div style={{ border:'1px solid #e5e7eb',borderRadius:10,padding:16,fontSize:13 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:12 }}>INSPECTION & REFUND</div>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                  <span style={{ color:'#6b7280' }}>Goods Condition</span>
                  <Badge cfg={CONDITION_CFG[selected.condition]||CONDITION_CFG.pending_check}/>
                </div>
                {selected.condition==='partial'&&<>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}><span style={{ color:'#6b7280' }}>Back to Stock</span><span style={{ fontWeight:600,color:'#16a34a' }}>{selected.resalableQty} {selected.unit}</span></div>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}><span style={{ color:'#6b7280' }}>Written Off</span><span style={{ fontWeight:600,color:'#991b1b' }}>{selected.writeOffQty} {selected.unit}</span></div>
                </>}
                {selected.condition==='resalable'&&selected.resalableQty>0&&<div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}><span style={{ color:'#6b7280' }}>Back to Stock</span><span style={{ fontWeight:600,color:'#16a34a' }}>{selected.resalableQty} {selected.unit}</span></div>}
                {selected.condition==='damaged'&&<div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}><span style={{ color:'#6b7280' }}>Written Off</span><span style={{ fontWeight:600,color:'#991b1b' }}>{selected.writeOffQty} {selected.unit}</span></div>}
                {[['Refund Amount',selected.refundAmount>0?`₦${selected.refundAmount.toLocaleString()}`:'—'],['Refund Method',selected.refundMethod||'—'],selected.refundRef&&['Ref / Receipt',selected.refundRef],['Processed By',selected.processedBy||'—'],['Processed On',selected.processedOn||'—']].filter(Boolean).map(([k,v])=>(
                  <div key={k} style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                    <span style={{ color:'#6b7280' }}>{k}</span>
                    <span style={{ fontWeight:k==='Refund Amount'?700:400,color:k==='Refund Amount'?'#f06548':'#111827' }}>{v}</span>
                  </div>
                ))}
                {selected.inspectionNotes&&(
                  <div style={{ marginTop:12,paddingTop:12,borderTop:'1px solid #f3f4f6' }}>
                    <div style={{ fontSize:11,color:'#6b7280',marginBottom:6 }}>INSPECTION NOTES</div>
                    <div style={{ fontStyle:'italic',color:'#6b7280' }}>"{selected.inspectionNotes}"</div>
                  </div>
                )}
              </div>
            </div>
            {/* Items returned table */}
            {selected.items?.length > 0 && (
              <div style={{ marginTop:20,border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden' }}>
                <div style={{ padding:'10px 16px',background:'#f9fafb',borderBottom:'1px solid #e5e7eb',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em' }}>
                  Items Returned
                </div>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f9fafb' }}>
                      {['Product','Ordered Qty','Returned Qty','Condition','Remarks'].map(h=>(
                        <th key={h} style={{ padding:'8px 14px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.05em',textAlign:'left',whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item,i)=>{
                      const cc = CONDITION_CFG[item.condition] || CONDITION_CFG.pending_check
                      return (
                        <tr key={i} style={{ borderTop:'1px solid #f3f4f6' }}>
                          <td style={{ padding:'10px 14px',fontSize:13,fontWeight:600,color:'#111827' }}>{item.product_name}</td>
                          <td style={{ padding:'10px 14px',fontSize:13,color:'#6b7280',textAlign:'center' }}>{item.ordered_quantity}</td>
                          <td style={{ padding:'10px 14px',fontSize:13,fontWeight:700,color:'#1B4332',textAlign:'center' }}>{item.returned_quantity}</td>
                          <td style={{ padding:'10px 14px' }}>
                            <span style={{ display:'inline-flex',alignItems:'center',borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600,background:cc.bg,color:cc.color }}>{cc.label}</span>
                          </td>
                          <td style={{ padding:'10px 14px',fontSize:12,color:'#6b7280',fontStyle:item.remarks?'italic':'normal' }}>
                            {item.remarks ? `"${item.remarks}"` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,paddingTop:16,borderTop:'1px solid #f3f4f6' }}>
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
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:380,boxShadow:'0 8px 40px rgba(0,0,0,0.18)',padding:32,textAlign:'center' }}>
              <div style={{ width:56,height:56,borderRadius:'50%',background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
                <i className="ri-delete-bin-line" style={{ fontSize:22,color:'#dc2626' }}/>
              </div>
              <div style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:16,marginBottom:6 }}>Delete Return?</div>
              <div style={{ fontSize:13,color:'#6b7280',marginBottom:24 }}>{selected?.ref} — {selected?.customer}</div>
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
