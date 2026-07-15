import { useState, useMemo, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const STATUS_CFG = {
  draft:     { label:'Draft',     color:'#6b7280', bg:'#f3f4f6', icon:'ri-draft-line'          },
  sent:      { label:'Sent',      color:'#3b82f6', bg:'#dbeafe', icon:'ri-send-plane-line'      },
  paid:      { label:'Paid',      color:'#22c55e', bg:'#dcfce7', icon:'ri-checkbox-circle-line' },
  overdue:   { label:'Overdue',   color:'#ef4444', bg:'#fee2e2', icon:'ri-error-warning-line'   },
  cancelled: { label:'Cancelled', color:'#9ca3af', bg:'#f3f4f6', icon:'ri-close-circle-line'    },
}

const CHANNEL_CFG = {
  online:    { label:'Online',         icon:'ri-global-line',     color:'#3b82f6' },
  mobile_app:{ label:'Mobile App',     icon:'ri-smartphone-line', color:'#8b5cf6' },
  chef_bems: { label:'Chef Bems AI',   icon:'ri-robot-line',      color:'#a855f7' },
  physical:  { label:'Physical Store', icon:'ri-store-2-line',    color:'#10b981' },
  manual:    { label:'Manual',         icon:'ri-edit-line',       color:'#f59e0b' },
}

const CUSTOMERS = [
  { name:'Ngozi Obi',          phone:'08123456789', email:'ngozi@email.com',    address:'14 Ikeja GRA, Lagos'        },
  { name:'Adaeze Nwosu',       phone:'07098765432', email:'adaeze@email.com',   address:'7 Lekki Phase 1, Lagos'     },
  { name:'Bimpe Fashola',      phone:'08055566677', email:'bimpe@gmail.com',    address:'22 Agege Motor Road, Lagos' },
  { name:'Seun Adesanya',      phone:'09012341234', email:'seun.a@email.com',   address:'5 Victoria Island, Lagos'   },
  { name:'Kemi Balogun',       phone:'08167891234', email:'kemi.b@gmail.com',   address:'18 Surulere, Lagos'         },
  { name:'Funmi Ogundele',     phone:'08123450987', email:'funmi@email.com',    address:'9 Gbagada, Lagos'           },
  { name:'Rasheedat Lawal',    phone:'07023456789', email:'rasheedat@email.com',address:'15 Maryland, Lagos'         },
  { name:'Chukwuemeka Nze',    phone:'08098761234', email:'emeka.n@email.com',  address:'11 Isolo, Lagos'            },
  { name:'Yetunde Adeniyi',    phone:'08056781234', email:'yetunde@email.com',  address:'20 Ikorodu Road, Lagos'     },
  { name:'Corporate — Mega Catering Ltd', phone:'0700MEGA01', email:'orders@megacatering.ng', address:'2 Marina, Lagos' },
]

const PRODUCTS_CATALOG = [
  { id:1,  name:'Fresh Tomatoes',        unit:'kg',    price:2800 },
  { id:2,  name:'Red Bell Pepper',       unit:'kg',    price:3500 },
  { id:3,  name:'Scotch Bonnet',         unit:'kg',    price:4200 },
  { id:4,  name:'Fresh Spinach',         unit:'bunch', price:800  },
  { id:5,  name:'Ugwu (Fluted Pumpkin)',unit:'bunch', price:600  },
  { id:6,  name:'Plantain',             unit:'hand',  price:2500 },
  { id:7,  name:'Yam (White)',          unit:'tuber', price:3200 },
  { id:8,  name:'Ginger',              unit:'kg',    price:5500 },
  { id:9,  name:'Garlic',              unit:'kg',    price:4800 },
  { id:10, name:'Palm Oil',            unit:'litre', price:2100 },
  { id:11, name:'Onion (Red)',         unit:'kg',    price:1800 },
  { id:12, name:'Sweet Corn',         unit:'cob',   price:400  },
]

const p = (id, qty) => { const prod=PRODUCTS_CATALOG.find(x=>x.id===id); return { ...prod, qty, total:prod.price*qty } }

const INVOICES_INIT = []

const fmt       = (n) => `₦${Number(n).toLocaleString()}`
const calcSub   = (items) => items.reduce((s,i)=>s+i.total,0)
const calcTotal = (items,fee,disc) => calcSub(items)+Number(fee||0)-Number(disc||0)

const BLANK_FORM = { customer:'', customName:'', customPhone:'', customEmail:'', customAddress:'', paymentMethod:'Bank Transfer', dueDate:'', notes:'', discount:0, deliveryFee:0, items:[{ name:'',qty:1,unit:'kg',price:0,total:0 }] }

const inp  = { display:'block',width:'100%',padding:'9px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box' }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }

function Modal({ title, onClose, children, maxWidth=600 }) {
  return <>
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1054 }}/>
    <div style={{ position:'fixed',inset:0,zIndex:1055,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth,boxShadow:'0 8px 40px rgba(0,0,0,0.18)',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column' }}>
        <div style={{ background:'#1B4332',color:'#fff',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15 }}>{title}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.8)',cursor:'pointer',fontSize:20,display:'flex',padding:4 }}><i className="ri-close-line"/></button>
        </div>
        <div style={{ padding:24,overflowY:'auto' }}>{children}</div>
      </div>
    </div>
  </>
}

export default function Invoices() {
  const [invoices,setInvoices]           = useState([])
  const [search,setSearch]               = useState('')
  const [filterStatus,setFilterStatus]   = useState('all')
  const [activeModal,setActiveModal]     = useState(null)
  const [selected,setSelected]           = useState(null)
  const [form,setForm]                   = useState(BLANK_FORM)
  const [markPaidRef,setMarkPaidRef]     = useState('')
  const [loading, setLoading]            = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/orders/invoices', { params: { search, status: filterStatus } })
      setInvoices(res.data.invoices)
    } catch { toast.error('Failed to load invoices') }
    finally { setLoading(false) }
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  const openModal  = (type,inv) => { setSelected(inv); setActiveModal(type); setMarkPaidRef('') }
  const closeModal = () => { setActiveModal(null); setSelected(null) }

  const stats = useMemo(()=>({
    total:             invoices.length,
    paid:              invoices.filter(i=>i.status==='paid').length,
    outstanding:       invoices.filter(i=>['sent','draft'].includes(i.status)).length,
    overdue:           invoices.filter(i=>i.status==='overdue').length,
    revenue:           invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+Number(i.amount||0),0),
    outstanding_value: invoices.filter(i=>['sent','overdue'].includes(i.status)).reduce((s,i)=>s+Number(i.amount||0),0),
  }),[invoices])

  const filtered = useMemo(() => invoices.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)), [invoices])

  const setField = (f,v) => setForm(p=>({...p,[f]:v}))

  const updateItem = (idx,field,val) => {
    setForm(prev=>{
      const items=prev.items.map((item,i)=>{
        if (i!==idx) return item
        const updated={...item,[field]:val}
        updated.total=Number(updated.qty||0)*Number(updated.price||0)
        return updated
      })
      return {...prev,items}
    })
  }

  const addItem    = ()=>setForm(p=>({...p,items:[...p.items,{name:'',qty:1,unit:'kg',price:0,total:0}]}))
  const removeItem = (idx)=>setForm(p=>({...p,items:p.items.filter((_,i)=>i!==idx)}))

  const formTotal = calcTotal(form.items,form.deliveryFee,form.discount)

  const createInvoice = async (asDraft) => {
    toast.error("Not implemented: manual invoice creation via UI");
    setForm(BLANK_FORM); closeModal();
  }

  const updateStatus = async (status, notes) => {
    try {
      await api.patch(`/admin/orders/invoices/${selected.id}/status`, { status, notes })
      toast.success("Status updated")
      closeModal(); load()
    } catch { toast.error("Failed to update status") }
  }

  const markAsPaid = ()=>updateStatus('paid', markPaidRef||'Manual')
  const sendInvoice   = ()=>updateStatus('sent')
  const cancelInvoice = ()=>updateStatus('cancelled')

  const STATUS_TABS = [{ key:'all',label:'All Invoices' },...Object.entries(STATUS_CFG).map(([k,v])=>({ key:k,label:v.label }))]

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:22,color:'#111827' }}>Invoices</div>
        <div style={{ fontSize:12,color:'#6b7280',marginTop:2 }}>Orders / Invoices</div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:24 }}>
        {[
          { label:'Total Invoices',    value:stats.total,                         color:'#6366f1',icon:'ri-file-list-3-line',        filter:'all'     },
          { label:'Paid',              value:stats.paid,                           color:'#22c55e',icon:'ri-checkbox-circle-line',    filter:'paid'    },
          { label:'Sent / Draft',      value:stats.outstanding,                   color:'#3b82f6',icon:'ri-send-plane-line',          filter:'sent'    },
          { label:'Overdue',           value:stats.overdue,                       color:'#ef4444',icon:'ri-error-warning-line',       filter:'overdue' },
          { label:'Total Collected',   value:fmt(stats.revenue),                  color:'#10b981',icon:'ri-money-dollar-circle-line', filter:null      },
          { label:'Outstanding Value', value:fmt(stats.outstanding_value),        color:'#f59e0b',icon:'ri-time-line',                filter:'overdue' },
        ].map(c=>(
          <div key={c.label} onClick={()=>c.filter&&setFilterStatus(c.filter)}
            style={{ background:'#fff',borderRadius:12,border:'1px solid #f3f4f6',borderLeft:`3px solid ${c.color}`,padding:'14px 16px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',cursor:c.filter?'pointer':'default' }}>
            <div style={{ width:38,height:38,borderRadius:8,background:`${c.color}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:17,color:c.color }}/>
            </div>
            <div>
              <div style={{ fontSize:16,fontWeight:800,color:'#111827' }}>{c.value}</div>
              <div style={{ fontSize:11,color:'#6b7280' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background:'#fff',borderRadius:12,border:'1px solid #f3f4f6',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',marginBottom:16 }}>
        <div style={{ padding:'12px 16px',display:'flex',flexWrap:'wrap',gap:10,alignItems:'center' }}>
          <div style={{ position:'relative',minWidth:260 }}>
            <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',fontSize:15 }}/>
            <input style={{ ...inp,paddingLeft:32 }} placeholder="Invoice ref, customer, order..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          {filterStatus!=='all'&&(
            <button style={btnL} onClick={()=>setFilterStatus('all')}><i className="ri-close-line"/>Clear Filter</button>
          )}
          <div style={{ marginLeft:'auto',display:'flex',gap:10,alignItems:'center' }}>
            <span style={{ fontSize:12,color:'#6b7280' }}>{filtered.length} invoice{filtered.length!==1?'s':''}</span>
            <button style={btnP} onClick={()=>{ setForm(BLANK_FORM); setActiveModal('create') }}>
              <i className="ri-add-line"/>Create Invoice
            </button>
          </div>
        </div>
        <div style={{ borderTop:'1px solid #f3f4f6',overflowX:'auto' }}>
          <div style={{ display:'flex',whiteSpace:'nowrap',padding:'0 8px' }}>
            {STATUS_TABS.map(t=>(
              <button key={t.key} onClick={()=>setFilterStatus(t.key)}
                style={{ background:'none',border:'none',cursor:'pointer',padding:'10px 12px',fontSize:13,fontWeight:filterStatus===t.key?700:400,color:filterStatus===t.key?'#1B4332':'#6b7280',borderBottom:filterStatus===t.key?'2px solid #1B4332':'2px solid transparent',fontFamily:'Nunito,sans-serif',whiteSpace:'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'#fff',borderRadius:12,border:'1px solid #f3f4f6',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f9fafb',borderBottom:'1px solid #e5e7eb' }}>
                {['Invoice','Customer','Channel','Date Issued','Due Date','Amount','Payment','Status','Actions'].map(h=>(
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0&&(
                <tr><td colSpan={9} style={{ ...TD,textAlign:'center',padding:48,color:'#9ca3af' }}>
                  <i className="ri-file-list-3-line" style={{ fontSize:36,display:'block',marginBottom:8 }}/>No invoices found
                </td></tr>
              )}
              {filtered.map(inv=>{
                const cfg=STATUS_CFG[inv.status] || STATUS_CFG.draft, chCfg=CHANNEL_CFG[inv.channel] || CHANNEL_CFG.online
                const total=Number(inv.amount||0)
                const dueDateString = inv.due_date ? new Date(inv.due_date).toISOString().slice(0,10) : ''
                const issuedDateString = inv.date_issued ? new Date(inv.date_issued).toISOString().slice(0,10) : new Date(inv.created_at||Date.now()).toISOString().slice(0,10)
                const overdue=inv.status!=='paid'&&inv.status!=='cancelled'&&inv.due_date&&new Date(inv.due_date)<new Date()
                return (
                  <tr key={inv.id}>
                    <td style={TD}>
                      <div style={{ fontWeight:700,color:'#1B4332',cursor:'pointer' }} onClick={()=>openModal('view',inv)}>{inv.invoice_ref || inv.id}</div>
                      {inv.order_id&&<div style={{ fontSize:11,color:'#6b7280',marginTop:2 }}><i className="ri-link me-1"/>{inv.order_id}</div>}
                      {inv.type==='manual'&&<span style={{ display:'inline-block',background:'#fef3c7',color:'#92400e',borderRadius:50,padding:'1px 6px',fontSize:9,fontWeight:700,marginTop:2 }}>Manual</span>}
                    </td>
                    <td style={TD}>
                      <div style={{ fontWeight:600 }}>{inv.customer_name || 'Walk-in'}</div>
                      <div style={{ fontSize:11,color:'#6b7280' }}>{inv.customer_phone || ''}</div>
                    </td>
                    <td style={TD}>
                      <span style={{ display:'inline-flex',alignItems:'center',gap:4,background:`${chCfg.color}18`,color:chCfg.color,borderRadius:50,padding:'3px 8px',fontSize:11,fontWeight:600 }}>
                        <i className={chCfg.icon}/>{chCfg.label}
                      </span>
                    </td>
                    <td style={{ ...TD,fontSize:13 }}>{issuedDateString}</td>
                    <td style={TD}>
                      <div style={{ fontSize:13,color:overdue?'#ef4444':'inherit',fontWeight:overdue?600:400 }}>{dueDateString}</div>
                      {overdue&&<div style={{ fontSize:10,color:'#ef4444',fontWeight:700 }}>OVERDUE</div>}
                    </td>
                    <td style={TD}>
                      <div style={{ fontWeight:700 }}>{fmt(total)}</div>
                      {inv.discount_amount>0&&<div style={{ fontSize:11,color:'#16a34a' }}>-{fmt(inv.discount_amount)} disc.</div>}
                    </td>
                    <td style={{ ...TD,fontSize:12 }}>{inv.payment_method}</td>
                    <td style={TD}>
                      <span style={{ display:'inline-flex',alignItems:'center',gap:4,background:cfg.bg,color:cfg.color,borderRadius:50,padding:'3px 8px',fontSize:11,fontWeight:600 }}>
                        <i className={cfg.icon}/>{cfg.label}
                      </span>
                      {inv.paidDate&&<div style={{ fontSize:10,color:'#6b7280',marginTop:2 }}>{inv.paidDate}</div>}
                    </td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        <button title="View" onClick={()=>openModal('view',inv)} style={{ background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:14,color:'#374151' }}><i className="ri-eye-line"/></button>
                        {inv.status==='draft'&&(
                          <button title="Send Invoice" onClick={()=>openModal('send',inv)} style={{ background:'#dbeafe',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:14,color:'#1d4ed8' }}><i className="ri-send-plane-line"/></button>
                        )}
                        {['sent','overdue'].includes(inv.status)&&(
                          <button title="Mark as Paid" onClick={()=>openModal('markpaid',inv)} style={{ background:'#dcfce7',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:14,color:'#166534' }}><i className="ri-checkbox-circle-line"/></button>
                        )}
                        {!['paid','cancelled'].includes(inv.status)&&(
                          <button title="Cancel Invoice" onClick={()=>openModal('cancel',inv)} style={{ background:'#fee2e2',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:14,color:'#991b1b' }}><i className="ri-close-circle-line"/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {activeModal&&<>

        {/* VIEW */}
        {activeModal==='view'&&selected&&(()=>{
          const total=calcTotal(selected.items,selected.deliveryFee,selected.discount)
          const cfg=STATUS_CFG[selected.status], chCfg=CHANNEL_CFG[selected.channel]
          return (
            <>
              <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1054 }}/>
              <div style={{ position:'fixed',inset:0,zIndex:1055,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
                <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:720,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 8px 40px rgba(0,0,0,0.18)' }}>
                  {/* Invoice header band */}
                  <div style={{ background:'#1e293b',color:'#fff',borderRadius:'14px 14px 0 0',padding:'24px 32px' }}>
                    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:18,marginBottom:4 }}>BEMS FARMS</div>
                        <div style={{ fontSize:12,opacity:0.7 }}>Premium Fresh Produce · Lagos, Nigeria</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:20,marginBottom:6 }}>{selected.id}</div>
                        <span style={{ display:'inline-flex',alignItems:'center',gap:4,background:cfg.bg,color:cfg.color,borderRadius:50,padding:'4px 10px',fontSize:11,fontWeight:600 }}>
                          <i className={cfg.icon}/>{cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:'24px 32px' }}>
                    {/* Meta */}
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:24 }}>
                      <div>
                        <div style={{ fontSize:11,color:'#6b7280',marginBottom:6 }}>Billed To</div>
                        <div style={{ fontWeight:600 }}>{selected.customer.name}</div>
                        <div style={{ fontSize:13 }}>{selected.customer.phone}</div>
                        <div style={{ fontSize:13,color:'#6b7280' }}>{selected.customer.email}</div>
                        <div style={{ fontSize:13,color:'#6b7280' }}>{selected.customer.address}</div>
                      </div>
                      <div>
                        {[['Issue Date',selected.issuedDate,'inherit'],['Due Date',selected.dueDate,selected.status==='overdue'?'#ef4444':'inherit'],selected.orderId&&['Order Ref',selected.orderId,'inherit'],['Channel',null,''],['Payment',selected.paymentMethod,'inherit']].filter(Boolean).map((row,i)=>(
                          row[1]===null ? (
                            <div key={i} style={{ display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13 }}>
                              <span style={{ color:'#6b7280' }}>Channel</span>
                              <span style={{ display:'inline-flex',alignItems:'center',gap:4,background:`${chCfg.color}18`,color:chCfg.color,borderRadius:50,padding:'2px 8px',fontSize:11,fontWeight:600 }}>
                                <i className={chCfg.icon}/>{chCfg.label}
                              </span>
                            </div>
                          ) : (
                            <div key={i} style={{ display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13 }}>
                              <span style={{ color:'#6b7280' }}>{row[0]}</span>
                              <span style={{ fontWeight:600,color:row[2] }}>{row[1]}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>

                    {/* Line items */}
                    <table style={{ width:'100%',borderCollapse:'collapse',border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden',marginBottom:16 }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          {['Product','Qty','Unit Price','Total'].map((h,i)=>(
                            <th key={h} style={{ ...TH,textAlign:i>1?'right':'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selected.items.map((item,i)=>(
                          <tr key={i}>
                            <td style={TD}>{item.name}</td>
                            <td style={TD}>{item.qty} {item.unit}</td>
                            <td style={{ ...TD,textAlign:'right' }}>{fmt(item.price)}</td>
                            <td style={{ ...TD,textAlign:'right',fontWeight:600 }}>{fmt(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:16 }}>
                      <div style={{ minWidth:240 }}>
                        <div style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',fontSize:13,color:'#6b7280' }}><span>Subtotal</span><span>{fmt(calcSub(selected.items))}</span></div>
                        {selected.deliveryFee>0&&<div style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',fontSize:13,color:'#6b7280' }}><span>Delivery Fee</span><span>{fmt(selected.deliveryFee)}</span></div>}
                        {selected.discount>0&&<div style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',fontSize:13,color:'#16a34a' }}><span>Discount</span><span>-{fmt(selected.discount)}</span></div>}
                        <div style={{ display:'flex',justifyContent:'space-between',padding:'10px 0',fontSize:16,fontWeight:700,borderTop:'1px solid #e5e7eb',marginTop:4 }}><span>Total</span><span>{fmt(total)}</span></div>
                      </div>
                    </div>

                    {selected.paidDate&&(
                      <div style={{ background:'#dcfce7',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#166534',marginBottom:12 }}>
                        <i className="ri-checkbox-circle-line" style={{ marginRight:6 }}/><strong>Payment received</strong> on {selected.paidDate}{selected.paymentRef&&<> · Ref: <strong>{selected.paymentRef}</strong></>}
                      </div>
                    )}

                    {selected.notes&&(
                      <div style={{ borderTop:'1px solid #f3f4f6',paddingTop:12,fontSize:13,color:'#6b7280',marginBottom:16 }}>
                        <strong>Notes:</strong> {selected.notes}
                      </div>
                    )}

                    <div style={{ borderTop:'1px solid #f3f4f6',paddingTop:16,display:'flex',gap:10,flexWrap:'wrap' }}>
                      {selected.status==='draft'&&<button style={btnP} onClick={()=>{ closeModal(); setTimeout(()=>openModal('send',selected),100) }}><i className="ri-send-plane-line"/>Send Invoice</button>}
                      {['sent','overdue'].includes(selected.status)&&<button style={{ ...btnP,background:'#16a34a' }} onClick={()=>{ closeModal(); setTimeout(()=>openModal('markpaid',selected),100) }}><i className="ri-checkbox-circle-line"/>Mark as Paid</button>}
                      {!['paid','cancelled'].includes(selected.status)&&<button style={{ ...btnL,color:'#991b1b',borderColor:'#fca5a5' }} onClick={()=>{ closeModal(); setTimeout(()=>openModal('cancel',selected),100) }}><i className="ri-close-circle-line"/>Cancel Invoice</button>}
                      <button style={{ ...btnL,marginLeft:'auto' }} onClick={closeModal}><i className="ri-close-line"/>Close</button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )
        })()}

        {/* CREATE */}
        {activeModal==='create'&&(
          <Modal title="Create Invoice" onClose={closeModal} maxWidth={700}>
            <label style={LBL}>Customer</label>
            <select style={{ ...inp,marginBottom:10 }} value={form.customer} onChange={e=>setField('customer',e.target.value)}>
              <option value="">— Enter manually —</option>
              {CUSTOMERS.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            {!form.customer&&(
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16 }}>
                <input style={inp} placeholder="Full name *" value={form.customName} onChange={e=>setField('customName',e.target.value)}/>
                <input style={inp} placeholder="Phone" value={form.customPhone} onChange={e=>setField('customPhone',e.target.value)}/>
                <input style={inp} placeholder="Email" value={form.customEmail} onChange={e=>setField('customEmail',e.target.value)}/>
                <input style={inp} placeholder="Address" value={form.customAddress} onChange={e=>setField('customAddress',e.target.value)}/>
              </div>
            )}

            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
              <label style={{ ...LBL,marginBottom:0 }}>Line Items</label>
              <button style={btnL} onClick={addItem}><i className="ri-add-line"/>Add Item</button>
            </div>
            {form.items.map((item,idx)=>(
              <div key={idx} style={{ display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto auto',gap:8,marginBottom:8,alignItems:'center' }}>
                <select style={inp} value={item.name} onChange={e=>{
                  const prod=PRODUCTS_CATALOG.find(p=>p.name===e.target.value)
                  if (prod) {
                    setForm(prev=>({ ...prev, items:prev.items.map((it,i)=>i!==idx?it:{ ...it,name:prod.name,unit:prod.unit,price:prod.price,total:prod.price*it.qty }) }))
                  } else { updateItem(idx,'name',e.target.value) }
                }}>
                  <option value="">Select product...</option>
                  {PRODUCTS_CATALOG.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
                <input type="number" style={inp} placeholder="Qty" min={0} value={item.qty} onChange={e=>updateItem(idx,'qty',e.target.value)}/>
                <input style={inp} placeholder="Unit" value={item.unit} onChange={e=>updateItem(idx,'unit',e.target.value)}/>
                <input type="number" style={inp} placeholder="Price" value={item.price} onChange={e=>updateItem(idx,'price',e.target.value)}/>
                <span style={{ fontSize:13,fontWeight:600,color:'#374151',whiteSpace:'nowrap' }}>{fmt(item.total)}</span>
                {form.items.length>1&&<button onClick={()=>removeItem(idx)} style={{ background:'#fee2e2',border:'none',borderRadius:6,padding:'8px',cursor:'pointer',color:'#991b1b',fontSize:14 }}><i className="ri-delete-bin-line"/></button>}
              </div>
            ))}

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,margin:'16px 0' }}>
              <div><label style={LBL}>Delivery Fee (₦)</label><input type="number" style={inp} value={form.deliveryFee} onChange={e=>setField('deliveryFee',e.target.value)}/></div>
              <div><label style={LBL}>Discount (₦)</label><input type="number" style={inp} value={form.discount} onChange={e=>setField('discount',e.target.value)}/></div>
              <div><label style={LBL}>Due Date</label><input type="date" style={inp} value={form.dueDate} onChange={e=>setField('dueDate',e.target.value)}/></div>
              <div><label style={LBL}>Payment Method</label>
                <select style={inp} value={form.paymentMethod} onChange={e=>setField('paymentMethod',e.target.value)}>
                  {['Bank Transfer','Cash','Paystack','POS'].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'span 2' }}><label style={LBL}>Notes</label><input style={inp} placeholder="Optional notes..." value={form.notes} onChange={e=>setField('notes',e.target.value)}/></div>
            </div>

            <div style={{ background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'12px 16px',textAlign:'right',marginBottom:20 }}>
              <div style={{ fontSize:12,color:'#6b7280' }}>Subtotal: {fmt(calcSub(form.items))}</div>
              {Number(form.deliveryFee)>0&&<div style={{ fontSize:12,color:'#6b7280' }}>+ Delivery: {fmt(form.deliveryFee)}</div>}
              {Number(form.discount)>0&&<div style={{ fontSize:12,color:'#16a34a' }}>- Discount: {fmt(form.discount)}</div>}
              <div style={{ fontSize:15,fontWeight:700,marginTop:4 }}>Total: {fmt(formTotal)}</div>
            </div>

            <div style={{ display:'flex',gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnL,flex:1,justifyContent:'center',color:'#1d4ed8',borderColor:'#bfdbfe' }} onClick={()=>createInvoice(true)}><i className="ri-draft-line"/>Save as Draft</button>
              <button style={{ ...btnP,flex:1,justifyContent:'center' }} onClick={()=>createInvoice(false)}><i className="ri-send-plane-line"/>Create & Send</button>
            </div>
          </Modal>
        )}

        {/* SEND */}
        {activeModal==='send'&&selected&&(
          <Modal title="Send Invoice" onClose={closeModal} maxWidth={420}>
            <div style={{ background:'#e0f2fe',border:'1px solid #bae6fd',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13 }}>
              <i className="ri-information-line" style={{ marginRight:6,color:'#0369a1' }}/>
              This will mark the invoice as <strong>Sent</strong>. The customer will receive a notification.
            </div>
            <div style={{ border:'1px solid #e5e7eb',borderRadius:10,padding:14,marginBottom:20,fontSize:13 }}>
              <div style={{ fontWeight:600 }}>{selected.id}</div>
              <div style={{ color:'#6b7280' }}>{selected.customer.name} · {fmt(calcTotal(selected.items,selected.deliveryFee,selected.discount))}</div>
              <div style={{ color:'#6b7280' }}>Due: {selected.dueDate} · {selected.paymentMethod}</div>
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP,flex:1,justifyContent:'center' }} onClick={sendInvoice}><i className="ri-send-plane-line"/>Send Invoice</button>
            </div>
          </Modal>
        )}

        {/* MARK PAID */}
        {activeModal==='markpaid'&&selected&&(
          <Modal title="Mark as Paid" onClose={closeModal} maxWidth={420}>
            <div style={{ border:'1px solid #e5e7eb',borderRadius:10,padding:14,marginBottom:16,fontSize:13 }}>
              <div style={{ fontWeight:600 }}>{selected.id}</div>
              <div style={{ color:'#6b7280' }}>{selected.customer.name}</div>
              <div style={{ fontSize:16,fontWeight:700,marginTop:4 }}>{fmt(calcTotal(selected.items,selected.deliveryFee,selected.discount))}</div>
            </div>
            <label style={LBL}>Payment Reference / Transaction ID (optional)</label>
            <input style={{ ...inp,marginBottom:20 }} placeholder="e.g. TRF-20260627-001, PST-XXXXX..." value={markPaidRef} onChange={e=>setMarkPaidRef(e.target.value)}/>
            <div style={{ display:'flex',gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP,flex:1,justifyContent:'center',background:'#16a34a' }} onClick={markAsPaid}><i className="ri-checkbox-circle-line"/>Confirm Payment Received</button>
            </div>
          </Modal>
        )}

        {/* CANCEL */}
        {activeModal==='cancel'&&selected&&(
          <Modal title="Cancel Invoice" onClose={closeModal} maxWidth={400}>
            <div style={{ background:'#fef3c7',border:'1px solid #fde68a',borderRadius:8,padding:'10px 14px',marginBottom:20,fontSize:13 }}>
              <i className="ri-alert-line" style={{ marginRight:6,color:'#92400e' }}/>
              Are you sure you want to cancel <strong>{selected.id}</strong>? This action cannot be undone.
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Go Back</button>
              <button style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#dc2626',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13,flex:1 }} onClick={cancelInvoice}>
                <i className="ri-close-circle-line"/>Cancel Invoice
              </button>
            </div>
          </Modal>
        )}
      </>}
    </div>
  )
}
