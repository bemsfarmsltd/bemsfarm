import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const STATUS_CFG = {
  paid:              { label:"New Order",          color:"#0ea5e9", bg:"#e0f2fe", icon:"ri-money-dollar-circle-line" },
  new_order:         { label:"New Order",          color:"#0ea5e9", bg:"#e0f2fe", icon:"ri-money-dollar-circle-line" },
  pending:           { label:"New Order",          color:"#0ea5e9", bg:"#e0f2fe", icon:"ri-money-dollar-circle-line" },
  processing:        { label:"Processing",         color:"#f59e0b", bg:"#fef3c7", icon:"ri-loader-line"              },
  packed_ready:      { label:"Packed & Ready",     color:"#8b5cf6", bg:"#ede9fe", icon:"ri-archive-line"             },
  packed:            { label:"Packed & Ready",     color:"#8b5cf6", bg:"#ede9fe", icon:"ri-archive-line"             },
  driver_assigned:   { label:"Driver Assigned",    color:"#06b6d4", bg:"#cffafe", icon:"ri-user-location-line"       },
  assigned:          { label:"Driver Assigned",    color:"#06b6d4", bg:"#cffafe", icon:"ri-user-location-line"       },
  out_for_delivery:  { label:"Out for Delivery",   color:"#3b82f6", bg:"#dbeafe", icon:"ri-truck-line"               },
  shipped:           { label:"Out for Delivery",   color:"#3b82f6", bg:"#dbeafe", icon:"ri-truck-line"               },
  delivery_attempted:{ label:"Delivery Attempted", color:"#f97316", bg:"#ffedd5", icon:"ri-route-line"               },
  delivered:         { label:"Delivered",          color:"#22c55e", bg:"#dcfce7", icon:"ri-checkbox-circle-line"     },
  dispute:           { label:"Dispute",            color:"#ef4444", bg:"#fee2e2", icon:"ri-alert-line"               },
  cancelled:         { label:"Cancelled",          color:'var(--text-muted)', bg:"var(--border)", icon:"ri-close-circle-line"        },
}

const CHANNEL_CFG = {
  online:       { label:"Online",       icon:"ri-global-line",     color:"#2563eb", bg:"#eff6ff" },
  chef_bems_ai: { label:"Chef Bems AI", icon:"ri-sparkling-line",  color:"#7c3aed", bg:"#faf5ff" },
  pos:          { label:"Physical Store", icon:"ri-store-2-line",  color:"#16a34a", bg:"#f0fdf4" },
  mobile_app:   { label:"Mobile App",   icon:"ri-smartphone-line", color:"#4f46e5", bg:"#f5f3ff" },
}

function getChannelCfg(channel, source) {
  const ch = String(channel || source || 'online').toLowerCase()
  if (ch.includes('online') || ch.includes('web')) return CHANNEL_CFG.online
  if (ch.includes('chef') || ch.includes('ai') || ch.includes('agent')) return CHANNEL_CFG.chef_bems_ai
  if (ch.includes('physical') || ch.includes('pos') || ch.includes('store')) return CHANNEL_CFG.pos
  if (ch.includes('mobile')) return CHANNEL_CFG.mobile_app
  return CHANNEL_CFG.online
}

const PIPELINE = ["paid","processing","packed_ready","driver_assigned","out_for_delivery","delivered"]

const fmt = (n) => `₦${Number(n||0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const yearOf = (d) => new Date(d || Date.now()).getFullYear()
const pipeIdx = (s) => {
  const map = { paid:1,new_order:1,pending:1,processing:2,packed_ready:3,packed:3,driver_assigned:4,assigned:4,out_for_delivery:5,shipped:5,delivered:6 }
  return (map[s]||0)-1
}

const inp  = { display:"block",width:"100%",padding:"9px 12px",border:"1.5px solid var(--border)",borderRadius:8,fontFamily:"var(--body-font)",fontSize:13,outline:"none",background:'var(--bg-card)',boxSizing:"border-box" }
const btnP = { display:"inline-flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:9,border:"none",background:"var(--orange-accent)",color:"#fff",cursor:"pointer",fontFamily:"var(--body-font)",fontWeight:700,fontSize:13 }
const btnL = { display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,border:"1.5px solid var(--border)",background:'var(--bg-card)',color:'var(--text-secondary)',cursor:"pointer",fontFamily:"var(--body-font)",fontWeight:600,fontSize:13 }
const TH   = { padding:"10px 16px",fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"left",whiteSpace:"nowrap" }
const TD   = { padding:"12px 16px",verticalAlign:"middle",borderBottom:"1px solid var(--border)",fontSize:13,color:'var(--text-primary)' }
// Was referenced in the dispute/reschedule/cancel modals below but never
// defined anywhere in this file — opening any of those 3 modals threw
// "ReferenceError: LBL is not defined" and crashed. Matches the style
// already used inline for the process/pack modals' labels.
const LBL  = { display:"block",fontSize:12,fontWeight:700,color:'var(--text-secondary)',marginBottom:6 }

function Modal({ title, onClose, children, maxWidth=600, danger=false }) {
  return <>
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1054 }}/>
    <div style={{ position:"fixed",inset:0,zIndex:1055,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:'var(--bg-card)',borderRadius:14,width:"100%",maxWidth,boxShadow:"0 8px 40px rgba(0,0,0,0.18)",overflow:"hidden",maxHeight:"90vh",display:"flex",flexDirection:"column" }}>
        <div style={{ background:danger?"#7f1d1d":"var(--orange-accent)",color:"#fff",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
          <span style={{ fontFamily:"var(--heading-font)",fontWeight:700,fontSize:15 }}>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ background:"none",border:"none",color:"rgba(255,255,255,0.8)",cursor:"pointer",fontSize:20,display:"flex",padding:4 }}><i className="ri-close-line"/></button>
        </div>
        <div style={{ padding:24,overflowY:"auto" }}>{children}</div>
      </div>
    </div>
  </>
}

const STATUS_TABS = [
  { key:"all", label:"All Orders" },
  ...Object.entries(STATUS_CFG).filter(([k])=>!["new_order","pending","packed","assigned","shipped"].includes(k)).map(([k,v])=>({ key:k,label:v.label }))
]

export default function OrdersList() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === "superadmin"

  const [orders,setOrders]               = useState([])
  const [stats,setStats]                 = useState({})
  const [total,setTotal]                 = useState(0)
  const [page,setPage]                   = useState(1)
  const [loading,setLoading]             = useState(true)
  const [search,setSearch]               = useState("")
  const [filterStatus,setFilterStatus]   = useState("all")
  const [filterChannel,setFilterChannel] = useState("all")
  const [activeModal,setActiveModal]     = useState(null)
  const [selected,setSelected]           = useState(null)
  const [drivers,setDrivers]             = useState([])
  const [submitting,setSubmitting]       = useState(false)
  const [pickingStaff,setPickingStaff]       = useState("")
  const [assignDriverId,setAssignDriverId]   = useState("")
  const [assignType,setAssignType]           = useState("initial")
  const [disputeDecision,setDisputeDecision] = useState("")
  const [disputeNote,setDisputeNote]         = useState("")
  const [disputeAmount,setDisputeAmount]     = useState("")
  const [cancelReason,setCancelReason]       = useState("")
  const [rescheduleNote,setRescheduleNote]   = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("/admin/orders",{ params:{ page,limit:20,search,status:filterStatus==="all"?"":filterStatus,channel:filterChannel==="all"?"":filterChannel } })
      setOrders(res.data.orders)
      setTotal(res.data.total)
      setStats(res.data.stats||{})
    } catch { 
      toast.error("Failed to load orders") 
    } finally { 
      setLoading(false) 
    }
  },[page,search,filterStatus,filterChannel])

  useEffect(()=>{ load() },[load])
  useEffect(()=>{ const t=setTimeout(()=>{ setPage(1); load() },400); return ()=>clearTimeout(t) },[search])
  useEffect(()=>{ api.get("/admin/orders/form-data/drivers").then(r=>setDrivers(r.data.drivers||[])).catch(()=>{}) },[])

  const openModal = (type, order, meta={}) => {
    setSelected(order); setActiveModal(type)
    setAssignDriverId(""); setDisputeDecision(""); setDisputeNote("")
    setDisputeAmount(""); setCancelReason(""); setRescheduleNote(""); setPickingStaff("")
    if (type==="assign") setAssignType(meta.assignType||"initial")
  }
  const closeModal = () => { setActiveModal(null); setSelected(null) }

  const updateStatus = async (orderId, status, notes, extra={}) => {
    setSubmitting(true)
    try {
      await api.patch(`/admin/orders/${orderId}/status`,{ status,notes,...extra })
      toast.success("Order updated"); closeModal(); load()
    } catch (err) { 
      toast.error(err.response?.data?.message||"Failed to update order") 
    } finally { 
      setSubmitting(false) 
    }
  }

  const processOrder = ()=>updateStatus(selected.id,"processing",`Order sent to picking queue. Picking staff: ${pickingStaff}`,{ picking_staff:pickingStaff })
  const markPacked   = ()=>updateStatus(selected.id,"packed_ready",`Goods picked, packed and labelled. Staff: ${pickingStaff}`,{ picking_staff:pickingStaff })

  const assignDriver = async () => {
    if (!assignDriverId) return; setSubmitting(true)
    try {
      await api.patch(`/admin/orders/${selected.id}/assign-driver`,{ driver_id:parseInt(assignDriverId),reassign:assignType==="manual_reassign" })
      toast.success(assignType==="manual_reassign"?"Driver reassigned":"Driver assigned"); closeModal(); load()
    } catch (err) { 
      toast.error(err.response?.data?.message||"Failed to assign driver") 
    } finally { 
      setSubmitting(false) 
    }
  }

  const resolveDispute = async () => {
    if (!disputeDecision) return; setSubmitting(true)
    try {
      await api.patch(`/admin/orders/${selected.id}/resolve-dispute`,{ decision:disputeDecision,notes:disputeNote,refund_amount:disputeAmount })
      toast.success("Dispute resolved"); closeModal(); load()
    } catch (err) { 
      toast.error(err.response?.data?.message||"Failed to resolve dispute") 
    } finally { 
      setSubmitting(false) 
    }
  }

  const cancelOrder = async () => {
    if (!cancelReason) return; setSubmitting(true)
    try {
      await api.patch(`/admin/orders/${selected.id}/cancel`,{ reason:cancelReason })
      toast.success("Order cancelled"); closeModal(); load()
    } catch (err) { 
      toast.error(err.response?.data?.message||"Failed to cancel order") 
    } finally { 
      setSubmitting(false) 
    }
  }

  const rescheduleDelivery = async () => {
    if (!rescheduleNote) return
    await updateStatus(selected.id,"driver_assigned",`Delivery rescheduled (attempt ${(selected.attempts||0)+1}). ${rescheduleNote}. Driver: ${selected.driver_name||"—"}`)
  }

  const deleteOrder = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/admin/orders/${selected.id}`)
      toast.success(`Order ${selected.id} deleted`)
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete order")
    } finally {
      setSubmitting(false)
    }
  }

  const getItemsSummary = (order) => {
    if (!order.item_names) return '—'
    const names = order.item_names.split(', ')
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
  }

  const B = 'var(--border)', S = '#6b7280'

  return (
    <div style={{ fontFamily:"var(--body-font)" }}>
      {/* Page Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'var(--heading-font)', fontWeight:800, fontSize:20, color:'var(--text-primary)' }}>All Orders</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
          <span>Orders</span>
          <i className="ri-arrow-right-s-line" style={{ fontSize:19 }} />
          <span style={{ fontWeight:600, color:'var(--text-primary)' }}>All Orders</span>
        </div>
      </div>

      {/* Stat cards — auto-fill/minmax collapses naturally on narrow screens, no media query needed */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))",gap:16,marginBottom:24 }}>
        {[
          { label:"Total Orders",       value:stats.total||0,              color:"#405189",icon:"ri-inbox-archive-line" },
          { label:"New Orders",         value:stats.new_orders||0,         color:"#299cdb",icon:"ri-file-list-line" },
          { label:"In Progress",        value:stats.in_progress||0,        color:"#f7b84b",icon:"ri-loader-4-line" },
          { label:"Out for Delivery",   value:stats.out_for_delivery||0,   color:"#65a30d",icon:"ri-truck-line" },
          { label:"Delivery Attempted", value:stats.delivery_attempted||0, color:"#ea580c",icon:"ri-alert-line" },
          { label:"Delivered",          value:stats.delivered||0,          color:"#10b981",icon:"ri-checkbox-circle-line" },
          { label:"Disputes",           value:stats.disputes||0,           color:"#ef4444",icon:"ri-error-warning-line" },
          { label:"Total Revenue",      value:fmt(stats.revenue||0),       color:"#059669",icon:"ri-coins-line" },
        ].map(c=>(
          <div key={c.label}
            style={{ background:'var(--bg-card)',borderRadius:12,border:`1px solid ${B}`,borderLeft:`3px solid ${c.color}`,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ width:40,height:40,borderRadius:8,background:`${c.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:18,color:c.color }}/>
            </div>
            <div>
              <div style={{ fontSize:20,fontWeight:800,color:"var(--text-primary)" }}>{c.value}</div>
              <div style={{ fontSize:11,color:S,fontWeight:600 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background:'var(--bg-card)',borderRadius:12,border:`1px solid ${B}`,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",marginBottom:16 }}>
        <div style={{ padding:"12px 16px",display:"flex",flexWrap:"wrap",gap:10,alignItems:"center" }}>
          <div style={{ position:"relative",minWidth:240,flex:1 }}>
            <i className="ri-search-line" style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:'var(--text-light)',fontSize:20 }}/>
            <input style={{ ...inp,paddingLeft:32 }} placeholder="Order ref, name, phone..." value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }}/>
          </div>
          <select style={{ ...inp,width:"auto",minWidth:150 }} value={filterChannel} onChange={e=>{ setFilterChannel(e.target.value); setPage(1) }}>
            <option value="all">All Channels</option>
            <option value="online">Online</option>
            <option value="chef_bems_ai">Chef Bems AI</option>
            <option value="pos">Physical Store</option>
            <option value="mobile_app">Mobile App</option>
          </select>
          <div style={{ fontSize:12,color:S,fontWeight:600 }}>{total} order{total!==1?"s":""}</div>
        </div>
        <div style={{ borderTop:`1px solid ${B}`,overflowX:"auto" }}>
          <div style={{ display:"flex",whiteSpace:"nowrap",padding:"0 8px" }}>
            {STATUS_TABS.map(t=>(
              <button key={t.key} onClick={()=>{ setFilterStatus(t.key); setPage(1) }}
                style={{ background:"none",border:"none",cursor:"pointer",padding:"10px 12px",fontSize:13,fontWeight:filterStatus===t.key?700:400,color:filterStatus===t.key?"var(--orange-accent)":S,borderBottom:filterStatus===t.key?"2px solid var(--orange-accent)":"2px solid transparent",fontFamily:"var(--body-font)",whiteSpace:"nowrap" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg-card)',borderRadius:12,border:`1px solid ${B}`,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:'var(--bg-subtle)',borderBottom:`1px solid ${B}` }}>
                {["Order Ref","Date","Customer","Channel","Items","Total","Driver","Status","Actions"].map(h=>(
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading&&[...Array(5)].map((_,i)=>(
                <tr key={i}>{[...Array(9)].map((_,j)=>(
                  <td key={j} style={TD}><div style={{ height:14,background:'var(--bg-muted)',borderRadius:4 }}/></td>
                ))}</tr>
              ))}
              {!loading&&orders.length===0&&(
                <tr><td colSpan={9} style={{ ...TD,textAlign:"center",padding:48,color:'var(--text-light)' }}>
                  <i className="ri-inbox-line" style={{ fontSize:49,display:"block",marginBottom:8 }}/>No orders found
                </td></tr>
              )}
              {!loading&&orders.map(order=>{
                const cfg=STATUS_CFG[order.status]||STATUS_CFG.pending
                const chCfg=getChannelCfg(order.channel, order.source)
                const refNo = `ORD-${yearOf(order.created_at)}-${String(order.id).padStart(4, '0')}`
                
                return (
                  <tr key={order.id}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={TD}>
                      <div style={{ fontWeight:700,color:"#b45309",cursor:"pointer" }} onClick={()=>openModal("view",order)}>{refNo}</div>
                      <div style={{ fontSize:11,color:S,marginTop:2,display:'flex',alignItems:'center',gap:4 }}>
                        {order.payment_method==="monnify"?(
                          <><span style={{ width:6,height:6,borderRadius:'50%',background:'#09a5db' }}/>Monnify</>
                        ):order.payment_method==="paystack"?(
                          <><span style={{ width:6,height:6,borderRadius:'50%',background:'#09a5db' }}/>Paystack</>
                        ):order.payment_method==="cash"?(
                          <><i className="ri-money-dollar-circle-line" style={{ color:'#10b981' }}/>Cash</>
                        ):(
                          <><i className="ri-bank-card-line" style={{ color:'#3b82f6' }}/>POS</>
                        )}
                      </div>
                    </td>
                    <td style={TD}>
                      <div style={{ fontSize:13 }}>{new Date(order.created_at).toLocaleDateString("en-NG")}</div>
                      <div style={{ fontSize:11,color:S }}>{new Date(order.created_at).toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"})}</div>
                    </td>
                    <td style={TD}>
                      <div style={{ fontWeight:600 }}>{order.customer_name}</div>
                      <div style={{ fontSize:11,color:S }}>{order.customer_phone}</div>
                    </td>
                    <td style={TD}>
                      <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:chCfg.bg,color:chCfg.color,borderRadius:4,padding:"3px 8px",fontSize:11,fontWeight:600 }}>
                        <i className={chCfg.icon}/>{chCfg.label}
                      </span>
                    </td>
                    <td style={TD}>
                      <div style={{ fontWeight:600 }}>{order.item_count} item{order.item_count!=1?"s":""}</div>
                      <div style={{ fontSize:11,color:S }}>{getItemsSummary(order)}</div>
                    </td>
                    <td style={{ ...TD,fontWeight:700 }}>{fmt(order.total)}</td>
                    <td style={TD}>
                      {order.driver_name?<>
                        <div style={{ fontWeight:600 }}>{order.driver_name}</div>
                        <div style={{ fontSize:11,color:S }}>{order.driver_phone}</div>
                      </>:<span style={{ color:'var(--text-light)' }}>—</span>}
                    </td>
                    <td style={TD}>
                      <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:cfg.bg,color:cfg.color,borderRadius:4,padding:"4px 10px",fontSize:11,fontWeight:700 }}>
                        <i className={cfg.icon}/>{cfg.label}
                      </span>
                      {order.status==="delivery_attempted"&&<div style={{ fontSize:10,color:S,marginTop:2,fontWeight:600 }}>Attempt {order.attempts||1}/2</div>}
                    </td>
                    <td style={TD}>
                      <div style={{ display:"inline-flex", border:`1px solid ${B}`, borderRadius:6, overflow:"hidden", background:'var(--bg-card)' }}>
                        <button title="View" onClick={()=>openModal("view",order)} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, border:'none', borderRight:`1px solid ${B}`, background:'none', color:'var(--text-secondary)', cursor:'pointer', fontSize:14 }}><i className="ri-eye-line"/></button>
                        {["paid","new_order","pending"].includes(order.status)&&(
                          <button title="Process" onClick={()=>openModal("process",order)} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, border:'none', borderRight:`1px solid ${B}`, background:'none', color:'#3b82f6', cursor:'pointer', fontSize:14 }}><i className="ri-play-line"/></button>
                        )}
                        {order.status==="processing"&&(
                          <button title="Mark Packed" onClick={()=>openModal("pack",order)} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, border:'none', borderRight:`1px solid ${B}`, background:'none', color:'#7c3aed', cursor:'pointer', fontSize:14 }}><i className="ri-archive-line"/></button>
                        )}
                        {["packed_ready","packed"].includes(order.status)&&(
                          <button title="Assign Driver" onClick={()=>openModal("assign",order,{assignType:"initial"})} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, border:'none', borderRight:`1px solid ${B}`, background:'none', color:'#16a34a', cursor:'pointer', fontSize:14 }}><i className="ri-user-add-line"/></button>
                        )}
                        {["driver_assigned","assigned","out_for_delivery","shipped","delivery_attempted"].includes(order.status)&&order.driver_name&&(
                          <button title="Reassign Driver" onClick={()=>openModal("assign",order,{assignType:"manual_reassign"})} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, border:'none', borderRight:`1px solid ${B}`, background:'none', color:'#d97706', cursor:'pointer', fontSize:14 }}><i className="ri-user-follow-line"/></button>
                        )}
                        {order.status==="dispute"&&(
                          <button title="Resolve" onClick={()=>openModal("dispute",order)} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, border:'none', borderRight:`1px solid ${B}`, background:'none', color:'#ef4444', cursor:'pointer', fontSize:14 }}><i className="ri-shield-check-line"/></button>
                        )}
                        {order.status==="delivery_attempted"&&(
                          <button title="Reschedule" onClick={()=>openModal("reschedule",order)} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, border:'none', borderRight:`1px solid ${B}`, background:'none', color:'var(--text-secondary)', cursor:'pointer', fontSize:14 }}><i className="ri-calendar-line"/></button>
                        )}
                        {["paid","new_order","pending","processing","packed_ready","packed","driver_assigned","assigned","delivery_attempted"].includes(order.status)&&(
                          <button title="Cancel" onClick={()=>openModal("cancel",order)} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, border:'none', borderRight:isSuperAdmin?`1px solid ${B}`:'none', background:'none', color:'#ef4444', cursor:'pointer', fontSize:14 }}><i className="ri-close-circle-line"/></button>
                        )}
                        {isSuperAdmin&&(
                          <button title="Delete Order" onClick={()=>openModal("delete",order)} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, border:'none', background:'none', color:'#dc2626', cursor:'pointer', fontSize:14 }}><i className="ri-delete-bin-line"/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {Math.ceil(total/20)>1&&(
          <div style={{ padding:"12px 16px",borderTop:`1px solid ${B}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ fontSize:13,color:S }}>Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</div>
            <div style={{ display:"flex",gap:6 }}>
              <button style={btnL} disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹ Prev</button>
              <button style={btnL} disabled={page>=Math.ceil(total/20)} onClick={()=>setPage(p=>p+1)}>Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {activeModal&&selected&&<>
        {activeModal==="view"&&(
          <OrderViewModal order={selected} onClose={closeModal}
            onProcess={()=>{ closeModal(); setTimeout(()=>openModal("process",selected),100) }}
            onPack={()=>{ closeModal(); setTimeout(()=>openModal("pack",selected),100) }}
            onAssign={t=>{ closeModal(); setTimeout(()=>openModal("assign",selected,{assignType:t}),100) }}
            onDispute={()=>{ closeModal(); setTimeout(()=>openModal("dispute",selected),100) }}
            onReschedule={()=>{ closeModal(); setTimeout(()=>openModal("reschedule",selected),100) }}
            onCancel={()=>{ closeModal(); setTimeout(()=>openModal("cancel",selected),100) }}
          />
        )}

        {activeModal==="process"&&(
          <Modal title="Process Order" onClose={closeModal} maxWidth={480}>
            <div style={{ background:"#e0f2fe",border:"1px solid #bae6fd",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13 }}>
              <i className="ri-information-line" style={{ marginRight:6,color:"#0369a1" }}/>
              Moves the order into the <strong>picking queue</strong>.
            </div>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:'var(--text-secondary)',marginBottom:6 }}>Assign Picking Staff</label>
            <input style={{ ...inp,marginBottom:20 }} placeholder="Staff name" value={pickingStaff} onChange={e=>setPickingStaff(e.target.value)}/>
            <div style={{ display:"flex",gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP,flex:1,justifyContent:"center" }} onClick={processOrder} disabled={submitting}>
                <i className="ri-send-plane-line"/>{submitting?"Processing...":"Start Processing"}
              </button>
            </div>
          </Modal>
        )}

        {activeModal==="pack"&&(
          <Modal title="Mark as Packed" onClose={closeModal} maxWidth={440}>
            <div style={{ background:"#dcfce7",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13 }}>
              <i className="ri-archive-line" style={{ marginRight:6,color:"#15803d" }}/>
              Confirm all items have been picked, packed and labelled.
            </div>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:'var(--text-secondary)',marginBottom:6 }}>Packed by</label>
            <input style={{ ...inp,marginBottom:20 }} placeholder="Staff name" value={pickingStaff} onChange={e=>setPickingStaff(e.target.value)}/>
            <div style={{ display:"flex",gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP,flex:1,justifyContent:"center" }} onClick={markPacked} disabled={submitting}>
                <i className="ri-checkbox-circle-line"/>{submitting?"Saving...":"Confirm Packed & Ready"}
              </button>
            </div>
          </Modal>
        )}

        {activeModal==="assign"&&(
          <Modal title={assignType==="manual_reassign"?"Manual Driver Reassignment":"Assign Driver"} onClose={closeModal} maxWidth={480}>
            {assignType==="manual_reassign"&&(
              <div style={{ background:"#fef3c7",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13 }}>
                <i className="ri-alert-line" style={{ marginRight:6,color:"#92400e" }}/><strong>Manual override.</strong> A reassignment event will be logged on the timeline.
              </div>
            )}
            {drivers.length===0?(
              <div style={{ textAlign:"center",color:'var(--text-muted)',padding:"32px 0" }}>No active drivers found. Add drivers first.</div>
            ):(
              <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
                {drivers.map(driver=>(
                  <div key={driver.id} onClick={()=>setAssignDriverId(String(driver.id))}
                    style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:`1.5px solid ${Number(assignDriverId)===driver.id?"#8b5cf6":"var(--border)"}`,borderRadius:10,cursor:"pointer",background:Number(assignDriverId)===driver.id?"#ede9fe":"#fff" }}>
                    <div style={{ width:36,height:36,borderRadius:"50%",background:"#6366f1",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
                      {(driver.name||"D").split(" ").map(n=>n[0]).join("")}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600,fontSize:13 }}>{driver.name}</div>
                      <div style={{ fontSize:11,color:S }}>{driver.phone} · {driver.vehicle_plate||driver.vehicle_type}</div>
                    </div>
                    {Number(assignDriverId)===driver.id&&<i className="ri-checkbox-circle-fill" style={{ fontSize:24,color:"#6366f1" }}/>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:"flex",gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP,flex:1,justifyContent:"center",background:assignType==="manual_reassign"?"#d97706":"var(--orange-accent)" }} onClick={assignDriver} disabled={!assignDriverId||submitting}>
                {submitting?"Assigning...":assignType==="manual_reassign"?"Reassign & Notify":"Assign & Notify"}
              </button>
            </div>
          </Modal>
        )}

        {activeModal==="dispute"&&(
          <Modal title="Resolve Dispute" onClose={closeModal} maxWidth={540}>
            <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
              {[
                { key:"full_refund",    label:"Full Refund",    desc:`Refund ${fmt(selected.total)} to customer`,    color:"#22c55e",icon:"ri-refund-2-line"           },
                { key:"partial_refund", label:"Partial Refund", desc:"Specify refund amount",                        color:"#f59e0b",icon:"ri-money-dollar-circle-line"  },
                { key:"replacement",    label:"Replacement",    desc:"Driver collects goods, replacement arranged.", color:"#f97316",icon:"ri-refresh-line"              },
                { key:"reject",         label:"Reject Claim",   desc:"Customer receives written rejection reason.",  color:'var(--text-muted)',icon:"ri-close-circle-line"         },
              ].map(d=>(
                <div key={d.key} onClick={()=>setDisputeDecision(d.key)}
                  style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:`1.5px solid ${disputeDecision===d.key?d.color:"var(--border)"}`,borderRadius:10,cursor:"pointer",background:disputeDecision===d.key?`${d.color}12`:"#fff" }}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:`${d.color}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <i className={d.icon} style={{ fontSize:16,color:d.color }}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600,fontSize:13 }}>{d.label}</div>
                    <div style={{ fontSize:11,color:S }}>{d.desc}</div>
                  </div>
                  {disputeDecision===d.key&&<i className="ri-checkbox-circle-fill" style={{ fontSize:24,color:d.color }}/>}
                </div>
              ))}
            </div>

            {disputeDecision==="partial_refund"&&(
              <div style={{ marginBottom:16 }}>
                <label style={LBL}>Refund Amount (₦) <span style={{ color:'#dc2626' }}>*</span></label>
                <input type="number" style={inp} min="1" max={selected.total} required value={disputeAmount} onChange={e=>setDisputeAmount(e.target.value)} placeholder="Enter amount"/>
              </div>
            )}

            <div style={{ marginBottom:20 }}>
              <label style={LBL}>Notes / Rationale <span style={{ color:'#dc2626' }}>*</span></label>
              <textarea style={{ ...inp,resize:"vertical",minHeight:80 }} required value={disputeNote} onChange={e=>setDisputeNote(e.target.value)} placeholder="Provide context for customer support..."/>
            </div>

            <div style={{ display:"flex",gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP,flex:1,justifyContent:"center",background:"#dc2626" }} onClick={resolveDispute} disabled={!disputeDecision||!disputeNote||submitting}>
                {submitting?"Resolving...":"Confirm Decision"}
              </button>
            </div>
          </Modal>
        )}

        {activeModal==="reschedule"&&(
          <Modal title="Reschedule Delivery" onClose={closeModal} maxWidth={440}>
            <div style={{ background:"#fef3c7",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13 }}>
              <i className="ri-alert-line" style={{ marginRight:6,color:"#92400e" }}/>
              Increments the delivery attempts counter (currently {selected.attempts||0}).
            </div>
            <label style={LBL}>Reschedule Notes <span style={{ color:'#dc2626' }}>*</span></label>
            <textarea style={{ ...inp,marginBottom:20,resize:"vertical",minHeight:85 }} required placeholder="e.g. Customer unavailable, rescheduled for tomorrow morning..." value={rescheduleNote} onChange={e=>setRescheduleNote(e.target.value)}/>
            <div style={{ display:"flex",gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP,flex:1,justifyContent:"center",background:"#d97706" }} onClick={rescheduleDelivery} disabled={submitting}>
                {submitting?"Rescheduling...":"Reschedule Order"}
              </button>
            </div>
          </Modal>
        )}

        {activeModal==="cancel"&&(
          <Modal title="Cancel Order" onClose={closeModal} maxWidth={440} danger={true}>
            <div style={{ background:"#fee2e2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#991b1b" }}>
              <i className="ri-error-warning-line" style={{ marginRight:6 }}/>
              <strong>Warning.</strong> This cancels payment collections and releases back inventory.
            </div>
            <label style={LBL}>Reason for Cancellation <span style={{ color:'#dc2626' }}>*</span></label>
            <textarea style={{ ...inp,marginBottom:20,resize:"vertical",minHeight:80 }} required placeholder="e.g. Customer request, out of stock..." value={cancelReason} onChange={e=>setCancelReason(e.target.value)}/>
            <div style={{ display:"flex",gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP,flex:1,justifyContent:"center",background:"#dc2626" }} onClick={cancelOrder} disabled={submitting}>
                {submitting?"Cancelling...":"Cancel Order"}
              </button>
            </div>
          </Modal>
        )}

        {activeModal==="delete"&&(
          <Modal title="Delete Order Permanently" onClose={closeModal} maxWidth={440} danger={true}>
            <div style={{ background:"#fee2e2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#991b1b" }}>
              <i className="ri-error-warning-line" style={{ marginRight:6 }}/>
              <strong>Critical.</strong> This permanently purges the order record. This action is irreversible.
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP,flex:1,justifyContent:"center",background:"#7f1d1d" }} onClick={deleteOrder} disabled={submitting}>
                {submitting?"Deleting...":"Delete Permanently"}
              </button>
            </div>
          </Modal>
        )}
      </>}
    </div>
  )
}

function OrderViewModal({ order, onClose, onProcess, onPack, onAssign, onDispute, onReschedule, onCancel }) {
  const [detail,setDetail]   = useState(null)
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    api.get(`/admin/orders/${order.id}`)
      .then(r=>setDetail(r.data))
      .catch(()=>setDetail(order))
      .finally(()=>setLoading(false))
  },[order.id])

  const o=detail||order, cfg=STATUS_CFG[o.status]||STATUS_CFG.pending, idx=pipeIdx(o.status)
  const btnP2={ display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"none",background:"var(--orange-accent)",color:"#fff",cursor:"pointer",fontFamily:"var(--body-font)",fontWeight:700,fontSize:13 }
  const btnL2={ display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"1.5px solid var(--border)",background:'var(--bg-card)',color:'var(--text-secondary)',cursor:"pointer",fontFamily:"var(--body-font)",fontWeight:600,fontSize:13 }

  return <>
    {/* The modal's 2-column body (1fr 300px) and the customer/address info
        grid (1fr 1fr) inside it are both fixed-ratio — on a 375px phone the
        modal itself is only ~340px wide, less than the 300px sidebar column
        alone needs. Force single-column below tablet width. */}
    <style>{`
      @media (max-width: 700px) {
        .ord-modal-grid { grid-template-columns: 1fr !important; }
        .ord-info-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1054 }}/>
    <div style={{ position:"fixed",inset:0,zIndex:1055,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:'var(--bg-card)',borderRadius:14,width:"100%",maxWidth:900,maxHeight:"90vh",boxShadow:"0 8px 40px rgba(0,0,0,0.18)",overflow:"hidden",display:"flex",flexDirection:"column" }}>
        <div style={{ background:"var(--orange-accent)",color:"#fff",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"var(--heading-font)",fontWeight:700,fontSize:16 }}>ORD-{yearOf(o.created_at)}-{String(o.id).padStart(4, '0')}</div>
            <div style={{ fontSize:12,opacity:0.75,marginTop:2 }}>{new Date(o.created_at).toLocaleString("en-NG")} · {getChannelCfg(o.channel, o.source).label}</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:cfg.bg,color:cfg.color,borderRadius:50,padding:"4px 10px",fontSize:12,fontWeight:600 }}>
              <i className={cfg.icon}/>{cfg.label}
            </span>
            <button onClick={onClose} aria-label="Close" style={{ background:"none",border:"none",color:"rgba(255,255,255,0.8)",cursor:"pointer",fontSize:20,display:"flex",padding:4 }}><i className="ri-close-line"/></button>
          </div>
        </div>

        {!["physical","pos","Physical Store (POS)"].includes(o.source)&&!["physical","pos","Physical Store (POS)"].includes(o.channel)&&!["dispute","cancelled"].includes(o.status)&&(
          <div style={{ padding:"14px 24px",borderBottom:"1px solid var(--border)",background:'var(--bg-subtle)',flexShrink:0 }}>
            <div style={{ display:"flex",alignItems:"center" }}>
              {PIPELINE.map((step,i)=>{
                const c=STATUS_CFG[step],done=i<=idx,now=i===idx
                return (
                  <div key={step} style={{ display:"flex",alignItems:"center",flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0 }}>
                      <div style={{ width:28,height:28,borderRadius:"50%",background:done?c.color:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:now?`0 0 0 4px ${c.color}35`:"none" }}>
                        <i className={c.icon} style={{ color:done?"#fff":"#9ca3af",fontSize:11 }}/>
                      </div>
                      <div style={{ fontSize:9,color:done?c.color:'var(--text-light)',whiteSpace:"nowrap",fontWeight:now?700:400 }}>{c.label}</div>
                    </div>
                    {i<PIPELINE.length-1&&<div style={{ flex:1,height:2,background:i<idx?"#22c55e":"var(--border)",borderRadius:1,margin:"0 4px",marginBottom:14 }}/>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ overflowY:"auto",flex:1 }}>
          {loading?(
            <div style={{ textAlign:"center",padding:48,color:'var(--text-muted)' }}>
              <i className="ri-loader-4-line" style={{ fontSize:43,display:"block",marginBottom:8 }}/>Loading order details...
            </div>
          ):(
            <div className="ord-modal-grid" style={{ padding:24,display:"grid",gridTemplateColumns:"1fr 300px",gap:24 }}>
              <div>
                <div style={{ border:"1px solid var(--border)",borderRadius:10,padding:16,marginBottom:16 }}>
                  <div className="ord-info-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
                    <div>
                      <div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:4 }}>Customer</div>
                      <div style={{ fontWeight:600 }}>{o.customer_name}</div>
                      <div style={{ fontSize:13 }}>{o.customer_phone}</div>
                      <div style={{ fontSize:13,color:'var(--text-muted)' }}>{o.customer_email}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:4 }}>Delivery Address</div>
                      <div style={{ fontSize:13 }}>{o.delivery_address||o.address||"—"}</div>
                    </div>
                    {o.driver_name&&<div style={{ gridColumn:"1/-1" }}>
                      <div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:4 }}>Assigned Driver</div>
                      <div style={{ fontWeight:600,fontSize:13 }}>{o.driver_name} · {o.driver_phone}</div>
                      <div style={{ fontSize:11,color:'var(--text-muted)' }}>{o.driver_plate}</div>
                    </div>}
                    {o.notes&&<div style={{ gridColumn:"1/-1" }}>
                      <div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:4 }}>Notes</div>
                      <div style={{ fontSize:13 }}>{o.notes}</div>
                    </div>}
                  </div>
                </div>
                <div style={{ border:"1px solid var(--border)",borderRadius:10,overflow:"hidden" }}>
                  <div style={{ padding:"10px 16px",borderBottom:"1px solid var(--border)",fontWeight:600,fontSize:13 }}>Order Items</div>
                  {o.items?.length>0?<>
                    <table style={{ width:"100%",borderCollapse:"collapse" }}>
                      <thead><tr style={{ background:'var(--bg-subtle)' }}>
                        {["Product","Qty","Unit Price","Total"].map(h=><th key={h} style={{ ...({padding:"10px 16px",fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:"uppercase",letterSpacing:"0.06em",textAlign:h==="Total"?"right":"left",whiteSpace:"nowrap"}) }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {o.items.map((item,i)=>(
                          <tr key={i}>
                            <td style={{ padding:"12px 16px",borderBottom:"1px solid var(--border)",fontSize:13 }}>{item.name}</td>
                            <td style={{ padding:"12px 16px",borderBottom:"1px solid var(--border)",fontSize:13 }}>{item.quantity}</td>
                            <td style={{ padding:"12px 16px",borderBottom:"1px solid var(--border)",fontSize:13 }}>{fmt(item.unit_price||item.price)}</td>
                            <td style={{ padding:"12px 16px",borderBottom:"1px solid var(--border)",fontSize:13,textAlign:"right",fontWeight:600 }}>{fmt(item.subtotal||item.quantity*(item.unit_price||item.price))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ padding:"10px 16px",borderTop:"1px solid var(--border)" }}>
                      {[["Subtotal",fmt(o.subtotal)],["Delivery Fee",fmt(o.delivery_fee)]].map(([k,v])=>(
                        <div key={k} style={{ display:"flex",justifyContent:"space-between",fontSize:13,color:'var(--text-muted)',marginBottom:4 }}><span>{k}</span><span>{v}</span></div>
                      ))}
                      <div style={{ display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,borderTop:"1px solid var(--border)",paddingTop:8,marginTop:4 }}><span>Total</span><span>{fmt(o.total)}</span></div>
                    </div>
                  </>:<div style={{ padding:16,fontSize:13,color:'var(--text-muted)' }}>No item details available</div>}
                </div>
              </div>
              <div>
                <div style={{ fontWeight:600,fontSize:13,marginBottom:12 }}>Order Timeline</div>
                {(o.timeline||[]).length===0?(
                  <div style={{ fontSize:13,color:'var(--text-muted)' }}>No timeline events yet</div>
                ):(
                  (o.timeline||[]).map((ev,i)=>{
                    const c=STATUS_CFG[ev.to_status]||STATUS_CFG.pending
                    return (
                      <div key={i} style={{ display:"flex",gap:12,marginBottom:16 }}>
                        <div style={{ width:32,height:32,borderRadius:"50%",background:c?.bg||"var(--border)",border:`2px solid ${c?.color||"var(--border-strong)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          <i className={c?.icon||"ri-circle-line"} style={{ color:c?.color||"#6b7280",fontSize:15 }}/>
                        </div>
                        <div>
                          <div style={{ fontWeight:600,fontSize:13 }}>{c?.label||ev.to_status}</div>
                          <div style={{ fontSize:10,color:'var(--text-muted)' }}>{new Date(ev.created_at).toLocaleString("en-NG")}</div>
                          {ev.notes&&<div style={{ fontSize:12,color:'var(--text-muted)',marginTop:4 }}>{ev.notes}</div>}
                        </div>
                      </div>
                    )
                  })
                )}
                <div style={{ borderTop:"1px solid var(--border)",paddingTop:16,marginTop:8,display:"flex",flexDirection:"column",gap:8 }}>
                  {["paid","new_order","pending"].includes(o.status)&&<button style={btnP2} onClick={onProcess}><i className="ri-play-circle-line"/>Process Order</button>}
                  {o.status==="processing"&&<button style={btnP2} onClick={onPack}><i className="ri-archive-line"/>Mark as Packed</button>}
                  {["packed_ready","packed"].includes(o.status)&&<button style={btnP2} onClick={()=>onAssign("initial")}><i className="ri-user-add-line"/>Assign Driver</button>}
                  {["driver_assigned","assigned","out_for_delivery","shipped","delivery_attempted"].includes(o.status)&&o.driver_name&&(
                    <button style={{ ...btnP2,background:"#d97706" }} onClick={()=>onAssign("manual_reassign")}><i className="ri-user-follow-line"/>Reassign Driver</button>
                  )}
                  {o.status==="dispute"&&<button style={{ ...btnP2,background:"#dc2626" }} onClick={onDispute}><i className="ri-shield-check-line"/>Resolve Dispute</button>}
                  {o.status==="delivery_attempted"&&<button style={btnL2} onClick={onReschedule}><i className="ri-calendar-line"/>Reschedule</button>}
                  {["paid","new_order","pending","processing","packed_ready","packed","driver_assigned","assigned","delivery_attempted"].includes(o.status)&&(
                    <button style={{ ...btnL2,color:"#991b1b",borderColor:"#fca5a5" }} onClick={onCancel}><i className="ri-close-circle-line"/>Cancel Order</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </>
}
