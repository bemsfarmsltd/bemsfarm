import { useState, useEffect, useCallback } from "react";
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
  cancelled:         { label:"Cancelled",          color:"#6b7280", bg:"#f3f4f6", icon:"ri-close-circle-line"        },
}

const CHANNEL_CFG = {
  'Web App':              { label:"Web App",              icon:"ri-global-line",     color:"#3b82f6" },
  'Mobile App':           { label:"Mobile App",           icon:"ri-smartphone-line", color:"#8b5cf6" },
  'AI Agent':             { label:"AI Agent",             icon:"ri-robot-line",      color:"#a855f7" },
  'Physical Store (POS)': { label:"Physical Store (POS)", icon:"ri-store-2-line",    color:"#10b981" },
  // Legacies
  online:                 { label:"Web App",              icon:"ri-global-line",     color:"#3b82f6" },
  mobile_app:             { label:"Mobile App",           icon:"ri-smartphone-line", color:"#8b5cf6" },
  chef_bems:              { label:"AI Agent",             icon:"ri-robot-line",      color:"#a855f7" },
  chef_bems_ai:           { label:"AI Agent",             icon:"ri-robot-line",      color:"#a855f7" },
  physical:               { label:"Physical Store (POS)", icon:"ri-store-2-line",    color:"#10b981" },
  pos:                    { label:"Physical Store (POS)", icon:"ri-store-2-line",    color:"#10b981" },
}

const PIPELINE = ["paid","processing","packed_ready","driver_assigned","out_for_delivery","delivered"]

const fmt = (n) => `₦${Number(n||0).toLocaleString("en-NG")}`
const pipeIdx = (s) => {
  const map = { paid:1,new_order:1,pending:1,processing:2,packed_ready:3,packed:3,driver_assigned:4,assigned:4,out_for_delivery:5,shipped:5,delivered:6 }
  return (map[s]||0)-1
}

const inp  = { display:"block",width:"100%",padding:"9px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontFamily:"Nunito,sans-serif",fontSize:13,outline:"none",background:"#fff",boxSizing:"border-box" }
const btnP = { display:"inline-flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:9,border:"none",background:"#1B4332",color:"#fff",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13 }
const btnL = { display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,border:"1.5px solid #e5e7eb",background:"#fff",color:"#374151",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:600,fontSize:13 }
const TH   = { padding:"10px 16px",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"left",whiteSpace:"nowrap" }
const TD   = { padding:"12px 16px",verticalAlign:"middle",borderBottom:"1px solid #f3f4f6",fontSize:13,color:"#111827" }

function Modal({ title, onClose, children, maxWidth=600, danger=false }) {
  return <>
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1054 }}/>
    <div style={{ position:"fixed",inset:0,zIndex:1055,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:14,width:"100%",maxWidth,boxShadow:"0 8px 40px rgba(0,0,0,0.18)",overflow:"hidden",maxHeight:"90vh",display:"flex",flexDirection:"column" }}>
        <div style={{ background:danger?"#7f1d1d":"#1B4332",color:"#fff",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
          <span style={{ fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:15 }}>{title}</span>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.8)",cursor:"pointer",fontSize:20,display:"flex",padding:4 }}><i className="ri-close-line"/></button>
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
const CHANNEL_OPTS = [
  ['Web App', 'Web App'],
  ['Mobile App', 'Mobile App'],
  ['AI Agent', 'AI Agent'],
  ['Physical Store (POS)', 'Physical Store (POS)'],
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
      setOrders(res.data.orders); setTotal(res.data.total); setStats(res.data.stats||{})
    } catch { toast.error("Failed to load orders") }
    finally { setLoading(false) }
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
    } catch (err) { toast.error(err.response?.data?.message||"Failed to update order") }
    finally { setSubmitting(false) }
  }

  const processOrder = ()=>updateStatus(selected.id,"processing",`Order sent to picking queue. Picking staff: ${pickingStaff}`,{ picking_staff:pickingStaff })
  const markPacked   = ()=>updateStatus(selected.id,"packed_ready",`Goods picked, packed and labelled. Staff: ${pickingStaff}`,{ picking_staff:pickingStaff })

  const assignDriver = async () => {
    if (!assignDriverId) return; setSubmitting(true)
    try {
      await api.patch(`/admin/orders/${selected.id}/assign-driver`,{ driver_id:parseInt(assignDriverId),reassign:assignType==="manual_reassign" })
      toast.success(assignType==="manual_reassign"?"Driver reassigned":"Driver assigned"); closeModal(); load()
    } catch (err) { toast.error(err.response?.data?.message||"Failed to assign driver") }
    finally { setSubmitting(false) }
  }

  const resolveDispute = async () => {
    if (!disputeDecision) return; setSubmitting(true)
    try {
      await api.patch(`/admin/orders/${selected.id}/resolve-dispute`,{ decision:disputeDecision,notes:disputeNote,refund_amount:disputeAmount })
      toast.success("Dispute resolved"); closeModal(); load()
    } catch (err) { toast.error(err.response?.data?.message||"Failed to resolve dispute") }
    finally { setSubmitting(false) }
  }

  const cancelOrder = async () => {
    if (!cancelReason) return; setSubmitting(true)
    try {
      await api.patch(`/admin/orders/${selected.id}/cancel`,{ reason:cancelReason })
      toast.success("Order cancelled"); closeModal(); load()
    } catch (err) { toast.error(err.response?.data?.message||"Failed to cancel order") }
    finally { setSubmitting(false) }
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

  const btnDanger = { display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px 18px",borderRadius:9,border:"none",background:"#dc2626",color:"#fff",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13,flex:1 }

  return (
    <div style={{ fontFamily:"Nunito,sans-serif" }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:22,color:"#111827" }}>All Orders</div>
        <div style={{ fontSize:12,color:"#6b7280",marginTop:2 }}>Orders / All Orders</div>
      </div>

      {/* Stat cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24 }}>
        {[
          { label:"Total Orders",       value:stats.total||0,              color:"#6366f1",icon:"ri-shopping-bag-3-line",    filter:"all"                },
          { label:"New Orders",         value:stats.new_orders||0,         color:"#0ea5e9",icon:"ri-money-dollar-circle-line",filter:"paid"               },
          { label:"In Progress",        value:stats.in_progress||0,        color:"#f59e0b",icon:"ri-loader-line",             filter:"processing"         },
          { label:"Out for Delivery",   value:stats.out_for_delivery||0,   color:"#3b82f6",icon:"ri-truck-line",              filter:"out_for_delivery"   },
          { label:"Delivery Attempted", value:stats.delivery_attempted||0, color:"#f97316",icon:"ri-route-line",              filter:"delivery_attempted" },
          { label:"Delivered",          value:stats.delivered||0,          color:"#22c55e",icon:"ri-checkbox-circle-line",   filter:"delivered"          },
          { label:"Disputes",           value:stats.disputes||0,           color:"#ef4444",icon:"ri-alert-line",              filter:"dispute"            },
          { label:"Total Revenue",      value:fmt(stats.revenue||0),       color:"#10b981",icon:"ri-bar-chart-2-line",        filter:null                 },
        ].map(c=>(
          <div key={c.label} onClick={()=>c.filter&&setFilterStatus(c.filter)}
            style={{ background:"#fff",borderRadius:12,border:"1px solid #f3f4f6",borderLeft:`3px solid ${c.color}`,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",cursor:c.filter?"pointer":"default" }}>
            <div style={{ width:40,height:40,borderRadius:8,background:`${c.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:18,color:c.color }}/>
            </div>
            <div>
              <div style={{ fontSize:18,fontWeight:800,color:"#111827" }}>{c.value}</div>
              <div style={{ fontSize:11,color:"#6b7280" }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background:"#fff",borderRadius:12,border:"1px solid #f3f4f6",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",marginBottom:16 }}>
        <div style={{ padding:"12px 16px",display:"flex",flexWrap:"wrap",gap:10,alignItems:"center" }}>
          <div style={{ position:"relative",minWidth:240 }}>
            <i className="ri-search-line" style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:15 }}/>
            <input style={{ ...inp,paddingLeft:32 }} placeholder="Order ref, name, phone..." value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }}/>
          </div>
          <select style={{ ...inp,width:"auto",minWidth:150 }} value={filterChannel} onChange={e=>{ setFilterChannel(e.target.value); setPage(1) }}>
            <option value="all">All Channels</option>
            {CHANNEL_OPTS.map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          {filterStatus!=="all"&&(
            <button style={btnL} onClick={()=>setFilterStatus("all")}><i className="ri-close-line"/>Clear Filter</button>
          )}
          <div style={{ marginLeft:"auto",fontSize:12,color:"#6b7280" }}>{total} order{total!==1?"s":""}</div>
          <button style={btnL} onClick={load}><i className="ri-refresh-line"/>Refresh</button>
        </div>
        <div style={{ borderTop:"1px solid #f3f4f6",overflowX:"auto" }}>
          <div style={{ display:"flex",whiteSpace:"nowrap",padding:"0 8px" }}>
            {STATUS_TABS.map(t=>(
              <button key={t.key} onClick={()=>{ setFilterStatus(t.key); setPage(1) }}
                style={{ background:"none",border:"none",cursor:"pointer",padding:"10px 12px",fontSize:13,fontWeight:filterStatus===t.key?700:400,color:filterStatus===t.key?"#1B4332":"#6b7280",borderBottom:filterStatus===t.key?"2px solid #1B4332":"2px solid transparent",fontFamily:"Nunito,sans-serif",whiteSpace:"nowrap" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:"#fff",borderRadius:12,border:"1px solid #f3f4f6",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#f9fafb",borderBottom:"1px solid #e5e7eb" }}>
                {["Order Ref","Date","Customer","Channel","Items","Total","Driver","Status","Actions"].map(h=>(
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading&&[...Array(5)].map((_,i)=>(
                <tr key={i}>{[...Array(9)].map((_,j)=>(
                  <td key={j} style={TD}><div style={{ height:14,background:"#f3f4f6",borderRadius:4 }}/></td>
                ))}</tr>
              ))}
              {!loading&&orders.length===0&&(
                <tr><td colSpan={9} style={{ ...TD,textAlign:"center",padding:48,color:"#9ca3af" }}>
                  <i className="ri-inbox-line" style={{ fontSize:36,display:"block",marginBottom:8 }}/>No orders found
                </td></tr>
              )}
              {!loading&&orders.map(order=>{
                const cfg=STATUS_CFG[order.status]||STATUS_CFG.pending
                const chCfg=CHANNEL_CFG[order.source]||CHANNEL_CFG[order.channel]||CHANNEL_CFG['Web App']
                return (
                  <tr key={order.id}>
                    <td style={TD}>
                      <div style={{ fontWeight:700,color:"#1B4332",cursor:"pointer" }} onClick={()=>openModal("view",order)}>{order.id}</div>
                      <div style={{ fontSize:11,color:"#6b7280",marginTop:2 }}>
                        {order.payment_method==="paystack"?"💳 Paystack":order.payment_method==="cash"?"💵 Cash":`💳 ${order.payment_method||"N/A"}`}
                      </div>
                    </td>
                    <td style={TD}>
                      <div style={{ fontSize:13 }}>{new Date(order.created_at).toLocaleDateString("en-NG")}</div>
                      <div style={{ fontSize:11,color:"#6b7280" }}>{new Date(order.created_at).toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"})}</div>
                    </td>
                    <td style={TD}>
                      <div style={{ fontWeight:600 }}>{order.customer_name}</div>
                      <div style={{ fontSize:11,color:"#6b7280" }}>{order.customer_phone}</div>
                    </td>
                    <td style={TD}>
                      <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:`${chCfg.color}18`,color:chCfg.color,borderRadius:50,padding:"3px 8px",fontSize:11,fontWeight:600 }}>
                        <i className={chCfg.icon}/>{chCfg.label}
                      </span>
                    </td>
                    <td style={TD}>{order.item_count} item{order.item_count!=1?"s":""}</td>
                    <td style={{ ...TD,fontWeight:700 }}>{fmt(order.total)}</td>
                    <td style={TD}>
                      {order.driver_name?<>
                        <div style={{ fontSize:13 }}>{order.driver_name}</div>
                        <div style={{ fontSize:11,color:"#6b7280" }}>{order.driver_phone}</div>
                      </>:<span style={{ color:"#9ca3af" }}>—</span>}
                    </td>
                    <td style={TD}>
                      <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:cfg.bg,color:cfg.color,borderRadius:50,padding:"4px 10px",fontSize:11,fontWeight:600 }}>
                        <i className={cfg.icon}/>{cfg.label}
                      </span>
                      {order.status==="delivery_attempted"&&<div style={{ fontSize:10,color:"#6b7280",marginTop:2 }}>Attempt {order.attempts||0}/2</div>}
                    </td>
                    <td style={TD}>
                      <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                        <button title="View" onClick={()=>openModal("view",order)} style={{ background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:14,color:"#374151" }}><i className="ri-eye-line"/></button>
                        {["paid","new_order","pending"].includes(order.status)&&(
                          <button title="Process" onClick={()=>openModal("process",order)} style={{ background:"#dbeafe",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:14,color:"#1d4ed8" }}><i className="ri-play-circle-line"/></button>
                        )}
                        {order.status==="processing"&&(
                          <button title="Mark Packed" onClick={()=>openModal("pack",order)} style={{ background:"#dcfce7",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:14,color:"#166534" }}><i className="ri-archive-line"/></button>
                        )}
                        {["packed_ready","packed"].includes(order.status)&&(
                          <button title="Assign Driver" onClick={()=>openModal("assign",order,{assignType:"initial"})} style={{ background:"#dcfce7",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:14,color:"#166534" }}><i className="ri-user-add-line"/></button>
                        )}
                        {["driver_assigned","assigned","out_for_delivery","shipped","delivery_attempted"].includes(order.status)&&order.driver_name&&(
                          <button title="Reassign Driver" onClick={()=>openModal("assign",order,{assignType:"manual_reassign"})} style={{ background:"#fef3c7",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:14,color:"#92400e" }}><i className="ri-user-follow-line"/></button>
                        )}
                        {order.status==="dispute"&&(
                          <button title="Resolve" onClick={()=>openModal("dispute",order)} style={{ background:"#fee2e2",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:14,color:"#991b1b" }}><i className="ri-shield-check-line"/></button>
                        )}
                        {order.status==="delivery_attempted"&&(
                          <button title="Reschedule" onClick={()=>openModal("reschedule",order)} style={{ background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:14,color:"#374151" }}><i className="ri-calendar-line"/></button>
                        )}
                        {["paid","new_order","pending","processing","packed_ready","packed","driver_assigned","assigned"].includes(order.status)&&(
                          <button title="Cancel" onClick={()=>openModal("cancel",order)} style={{ background:"#fee2e2",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:14,color:"#991b1b" }}><i className="ri-close-circle-line"/></button>
                        )}
                        {isSuperAdmin&&(
                          <button title="Delete Order" onClick={()=>openModal("delete",order)} style={{ background:"#7f1d1d",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:14,color:"#fff" }}><i className="ri-delete-bin-line"/></button>
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
          <div style={{ padding:"12px 16px",borderTop:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ fontSize:13,color:"#6b7280" }}>Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</div>
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
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6 }}>Assign Picking Staff</label>
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
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6 }}>Packed by</label>
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
              <div style={{ textAlign:"center",color:"#6b7280",padding:"32px 0" }}>No active drivers found. Add drivers first.</div>
            ):(
              <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
                {drivers.map(driver=>(
                  <div key={driver.id} onClick={()=>setAssignDriverId(String(driver.id))}
                    style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:`1.5px solid ${Number(assignDriverId)===driver.id?"#8b5cf6":"#e5e7eb"}`,borderRadius:10,cursor:"pointer",background:Number(assignDriverId)===driver.id?"#ede9fe":"#fff" }}>
                    <div style={{ width:36,height:36,borderRadius:"50%",background:"#6366f1",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
                      {(driver.name||"D").split(" ").map(n=>n[0]).join("")}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600,fontSize:13 }}>{driver.name}</div>
                      <div style={{ fontSize:11,color:"#6b7280" }}>{driver.phone} · {driver.vehicle_plate||driver.vehicle_type}</div>
                    </div>
                    {Number(assignDriverId)===driver.id&&<i className="ri-checkbox-circle-fill" style={{ fontSize:18,color:"#6366f1" }}/>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:"flex",gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP,flex:1,justifyContent:"center",background:assignType==="manual_reassign"?"#d97706":"#1B4332" }} onClick={assignDriver} disabled={!assignDriverId||submitting}>
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
                { key:"reject",         label:"Reject Claim",   desc:"Customer receives written rejection reason.",  color:"#6b7280",icon:"ri-close-circle-line"         },
              ].map(d=>(
                <div key={d.key} onClick={()=>setDisputeDecision(d.key)}
                  style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:`1.5px solid ${disputeDecision===d.key?d.color:"#e5e7eb"}`,borderRadius:10,cursor:"pointer",background:disputeDecision===d.key?`${d.color}12`:"#fff" }}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:`${d.color}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <i className={d.icon} style={{ fontSize:16,color:d.color }}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600,fontSize:13 }}>{d.label}</div>
                    <div style={{ fontSize:11,color:"#6b7280" }}>{d.desc}</div>
                  </div>
                  {disputeDecision===d.key&&<i className="ri-checkbox-circle-fill" style={{ fontSize:18,color:d.color }}/>}
                </div>
              ))}
            </div>
            {disputeDecision==="partial_refund"&&(
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6 }}>Refund Amount (₦)</label>
                <input type="number" style={inp} value={disputeAmount} onChange={e=>setDisputeAmount(e.target.value)}/>
              </div>
            )}
            {["reject","partial_refund"].includes(disputeDecision)&&(
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6 }}>{disputeDecision==="reject"?"Rejection Reason":"Admin Notes"}</label>
                <textarea style={{ ...inp,resize:"vertical" }} rows={3} value={disputeNote} onChange={e=>setDisputeNote(e.target.value)}/>
              </div>
            )}
            <div style={{ display:"flex",gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnDanger }} onClick={resolveDispute}
                disabled={!disputeDecision||submitting||(disputeDecision==="partial_refund"&&!disputeAmount)||(["reject","partial_refund"].includes(disputeDecision)&&!disputeNote)}>
                {submitting?"Resolving...":"Confirm Resolution"}
              </button>
            </div>
          </Modal>
        )}

        {activeModal==="cancel"&&(
          <Modal title="Cancel Order" onClose={closeModal} maxWidth={440} danger>
            <div style={{ background:"#fef3c7",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13 }}>
              <i className="ri-alert-line" style={{ marginRight:6,color:"#92400e" }}/>
              Cancelling <strong>{selected.id}</strong>. A refund of <strong>{fmt(selected.total)}</strong> will be triggered.
            </div>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6 }}>Cancellation Reason</label>
            <textarea style={{ ...inp,resize:"vertical",marginBottom:20 }} rows={3} placeholder="Why is this order being cancelled?" value={cancelReason} onChange={e=>setCancelReason(e.target.value)}/>
            <div style={{ display:"flex",gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Go Back</button>
              <button style={btnDanger} onClick={cancelOrder} disabled={!cancelReason||submitting}>
                {submitting?"Cancelling...":"Cancel & Trigger Refund"}
              </button>
            </div>
          </Modal>
        )}

        {activeModal==="delete"&&(
          <Modal title="Delete Order" onClose={closeModal} maxWidth={440} danger>
            <div style={{ textAlign:"center",padding:"8px 0 20px" }}>
              <div style={{ width:56,height:56,borderRadius:"50%",background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
                <i className="ri-delete-bin-line" style={{ fontSize:28,color:"#dc2626" }}/>
              </div>
              <div style={{ fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:16,color:"#111827",marginBottom:8 }}>
                Permanently delete order?
              </div>
              <div style={{ fontSize:13,color:"#6b7280",marginBottom:4 }}>
                Order <strong style={{ color:"#111827" }}>{selected.id}</strong> — {selected.customer_name}
              </div>
              <div style={{ fontSize:13,color:"#6b7280",marginBottom:20 }}>
                This will permanently remove the order and all its items from the database. <strong style={{ color:"#dc2626" }}>This cannot be undone.</strong>
              </div>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
              <button style={btnDanger} onClick={deleteOrder} disabled={submitting}>
                <i className="ri-delete-bin-line"/>{submitting?"Deleting...":"Yes, Delete Order"}
              </button>
            </div>
          </Modal>
        )}

        {activeModal==="reschedule"&&(
          <div onClick={e=>e.target===e.currentTarget&&closeModal()} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1054,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
            <div style={{ background:"#fff",borderRadius:14,width:"100%",maxWidth:500,boxShadow:"0 8px 40px rgba(0,0,0,0.18)",overflow:"hidden" }}>
              <div style={{ background:"#1e293b",padding:"18px 24px",color:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:15 }}>
                    <i className="ri-route-line" style={{ marginRight:8,color:"#f59e0b" }}/>Customer Unavailable
                  </div>
                  <div style={{ fontSize:12,opacity:0.7,marginTop:2 }}>{selected.id} · {selected.customer_name}</div>
                </div>
                <button onClick={closeModal} style={{ background:"none",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"6px 10px",fontSize:14 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24 }}>
                {(selected.attempts||0)<2&&(
                  <div style={{ border:"1px solid #e5e7eb",borderRadius:10,padding:16,marginBottom:16 }}>
                    <div style={{ fontWeight:600,fontSize:13,marginBottom:10 }}>Schedule New Delivery Attempt</div>
                    <textarea style={{ ...inp,resize:"vertical",marginBottom:12 }} rows={2} placeholder="Re-attempt notes..." value={rescheduleNote} onChange={e=>setRescheduleNote(e.target.value)}/>
                    <button style={{ ...btnP,width:"100%",background:"#d97706",justifyContent:"center" }} onClick={rescheduleDelivery} disabled={!rescheduleNote||submitting}>
                      {submitting?"Saving...":"Confirm — Schedule New Attempt"}
                    </button>
                  </div>
                )}
                <div style={{ border:"1.5px solid #fca5a5",borderRadius:10,padding:16 }}>
                  <div style={{ fontWeight:600,fontSize:13,color:"#991b1b",marginBottom:10 }}>Cancel Order & Trigger Refund</div>
                  <textarea style={{ ...inp,resize:"vertical",marginBottom:12 }} rows={2} placeholder="Cancellation reason..." value={cancelReason} onChange={e=>setCancelReason(e.target.value)}/>
                  <button style={{ display:"flex",alignItems:"center",justifyContent:"center",width:"100%",gap:6,padding:"9px 18px",borderRadius:9,border:"none",background:"#dc2626",color:"#fff",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13 }}
                    onClick={cancelOrder} disabled={!cancelReason||submitting}>
                    {submitting?"Cancelling...":"Cancel Order & Trigger Refund"}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
  const btnP2={ display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"none",background:"#1B4332",color:"#fff",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13 }
  const btnL2={ display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",color:"#374151",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:600,fontSize:13 }

  return <>
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1054 }}/>
    <div style={{ position:"fixed",inset:0,zIndex:1055,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:14,width:"100%",maxWidth:900,maxHeight:"90vh",boxShadow:"0 8px 40px rgba(0,0,0,0.18)",overflow:"hidden",display:"flex",flexDirection:"column" }}>
        <div style={{ background:"#1B4332",color:"#fff",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:16 }}>{o.id}</div>
            <div style={{ fontSize:12,opacity:0.75,marginTop:2 }}>{new Date(o.created_at).toLocaleString("en-NG")} · {(CHANNEL_CFG[o.source]||CHANNEL_CFG[o.channel]||CHANNEL_CFG['Web App']).label}</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:cfg.bg,color:cfg.color,borderRadius:50,padding:"4px 10px",fontSize:12,fontWeight:600 }}>
              <i className={cfg.icon}/>{cfg.label}
            </span>
            <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.8)",cursor:"pointer",fontSize:20,display:"flex",padding:4 }}><i className="ri-close-line"/></button>
          </div>
        </div>

        {!["physical","pos","Physical Store (POS)"].includes(o.source)&&!["physical","pos","Physical Store (POS)"].includes(o.channel)&&!["dispute","cancelled"].includes(o.status)&&(
          <div style={{ padding:"14px 24px",borderBottom:"1px solid #f3f4f6",background:"#f9fafb",flexShrink:0 }}>
            <div style={{ display:"flex",alignItems:"center" }}>
              {PIPELINE.map((step,i)=>{
                const c=STATUS_CFG[step],done=i<=idx,now=i===idx
                return (
                  <div key={step} style={{ display:"flex",alignItems:"center",flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0 }}>
                      <div style={{ width:28,height:28,borderRadius:"50%",background:done?c.color:"#e5e7eb",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:now?`0 0 0 4px ${c.color}35`:"none" }}>
                        <i className={c.icon} style={{ color:done?"#fff":"#9ca3af",fontSize:11 }}/>
                      </div>
                      <div style={{ fontSize:9,color:done?c.color:"#9ca3af",whiteSpace:"nowrap",fontWeight:now?700:400 }}>{c.label}</div>
                    </div>
                    {i<PIPELINE.length-1&&<div style={{ flex:1,height:2,background:i<idx?"#22c55e":"#e5e7eb",borderRadius:1,margin:"0 4px",marginBottom:14 }}/>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ overflowY:"auto",flex:1 }}>
          {loading?(
            <div style={{ textAlign:"center",padding:48,color:"#6b7280" }}>
              <i className="ri-loader-4-line" style={{ fontSize:32,display:"block",marginBottom:8 }}/>Loading order details...
            </div>
          ):(
            <div style={{ padding:24,display:"grid",gridTemplateColumns:"1fr 300px",gap:24 }}>
              <div>
                <div style={{ border:"1px solid #f3f4f6",borderRadius:10,padding:16,marginBottom:16 }}>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
                    <div>
                      <div style={{ fontSize:11,color:"#6b7280",marginBottom:4 }}>Customer</div>
                      <div style={{ fontWeight:600 }}>{o.customer_name}</div>
                      <div style={{ fontSize:13 }}>{o.customer_phone}</div>
                      <div style={{ fontSize:13,color:"#6b7280" }}>{o.customer_email}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:11,color:"#6b7280",marginBottom:4 }}>Delivery Address</div>
                      <div style={{ fontSize:13 }}>{o.delivery_address||o.address||"—"}</div>
                    </div>
                    {o.driver_name&&<div style={{ gridColumn:"1/-1" }}>
                      <div style={{ fontSize:11,color:"#6b7280",marginBottom:4 }}>Assigned Driver</div>
                      <div style={{ fontWeight:600,fontSize:13 }}>{o.driver_name} · {o.driver_phone}</div>
                      <div style={{ fontSize:11,color:"#6b7280" }}>{o.driver_plate}</div>
                    </div>}
                    {o.notes&&<div style={{ gridColumn:"1/-1" }}>
                      <div style={{ fontSize:11,color:"#6b7280",marginBottom:4 }}>Notes</div>
                      <div style={{ fontSize:13 }}>{o.notes}</div>
                    </div>}
                  </div>
                </div>
                <div style={{ border:"1px solid #f3f4f6",borderRadius:10,overflow:"hidden" }}>
                  <div style={{ padding:"10px 16px",borderBottom:"1px solid #f3f4f6",fontWeight:600,fontSize:13 }}>Order Items</div>
                  {o.items?.length>0?<>
                    <table style={{ width:"100%",borderCollapse:"collapse" }}>
                      <thead><tr style={{ background:"#f9fafb" }}>
                        {["Product","Qty","Unit Price","Total"].map(h=><th key={h} style={{ ...({padding:"10px 16px",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:h==="Total"?"right":"left",whiteSpace:"nowrap"}) }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {o.items.map((item,i)=>(
                          <tr key={i}>
                            <td style={{ padding:"12px 16px",borderBottom:"1px solid #f3f4f6",fontSize:13 }}>{item.name}</td>
                            <td style={{ padding:"12px 16px",borderBottom:"1px solid #f3f4f6",fontSize:13 }}>{item.quantity}</td>
                            <td style={{ padding:"12px 16px",borderBottom:"1px solid #f3f4f6",fontSize:13 }}>{fmt(item.unit_price||item.price)}</td>
                            <td style={{ padding:"12px 16px",borderBottom:"1px solid #f3f4f6",fontSize:13,textAlign:"right",fontWeight:600 }}>{fmt(item.subtotal||item.quantity*(item.unit_price||item.price))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ padding:"10px 16px",borderTop:"1px solid #f3f4f6" }}>
                      {[["Subtotal",fmt(o.subtotal)],["Delivery Fee",fmt(o.delivery_fee)]].map(([k,v])=>(
                        <div key={k} style={{ display:"flex",justifyContent:"space-between",fontSize:13,color:"#6b7280",marginBottom:4 }}><span>{k}</span><span>{v}</span></div>
                      ))}
                      <div style={{ display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,borderTop:"1px solid #f3f4f6",paddingTop:8,marginTop:4 }}><span>Total</span><span>{fmt(o.total)}</span></div>
                    </div>
                  </>:<div style={{ padding:16,fontSize:13,color:"#6b7280" }}>No item details available</div>}
                </div>
              </div>
              <div>
                <div style={{ fontWeight:600,fontSize:13,marginBottom:12 }}>Order Timeline</div>
                {(o.timeline||[]).length===0?(
                  <div style={{ fontSize:13,color:"#6b7280" }}>No timeline events yet</div>
                ):(
                  (o.timeline||[]).map((ev,i)=>{
                    const c=STATUS_CFG[ev.to_status]||STATUS_CFG.pending
                    return (
                      <div key={i} style={{ display:"flex",gap:12,marginBottom:16 }}>
                        <div style={{ width:32,height:32,borderRadius:"50%",background:c?.bg||"#f3f4f6",border:`2px solid ${c?.color||"#d1d5db"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          <i className={c?.icon||"ri-circle-line"} style={{ color:c?.color||"#6b7280",fontSize:11 }}/>
                        </div>
                        <div>
                          <div style={{ fontWeight:600,fontSize:13 }}>{c?.label||ev.to_status}</div>
                          <div style={{ fontSize:10,color:"#6b7280" }}>{new Date(ev.created_at).toLocaleString("en-NG")}</div>
                          {ev.notes&&<div style={{ fontSize:12,color:"#6b7280",marginTop:4 }}>{ev.notes}</div>}
                        </div>
                      </div>
                    )
                  })
                )}
                <div style={{ borderTop:"1px solid #f3f4f6",paddingTop:16,marginTop:8,display:"flex",flexDirection:"column",gap:8 }}>
                  {["paid","new_order","pending"].includes(o.status)&&<button style={btnP2} onClick={onProcess}><i className="ri-play-circle-line"/>Process Order</button>}
                  {o.status==="processing"&&<button style={btnP2} onClick={onPack}><i className="ri-archive-line"/>Mark as Packed</button>}
                  {["packed_ready","packed"].includes(o.status)&&<button style={btnP2} onClick={()=>onAssign("initial")}><i className="ri-user-add-line"/>Assign Driver</button>}
                  {["driver_assigned","assigned","out_for_delivery","shipped","delivery_attempted"].includes(o.status)&&o.driver_name&&(
                    <button style={{ ...btnP2,background:"#d97706" }} onClick={()=>onAssign("manual_reassign")}><i className="ri-user-follow-line"/>Reassign Driver</button>
                  )}
                  {o.status==="dispute"&&<button style={{ ...btnP2,background:"#dc2626" }} onClick={onDispute}><i className="ri-shield-check-line"/>Resolve Dispute</button>}
                  {o.status==="delivery_attempted"&&<button style={btnL2} onClick={onReschedule}><i className="ri-calendar-line"/>Reschedule / Cancel</button>}
                  {["paid","new_order","pending","processing","packed_ready","packed","driver_assigned","assigned"].includes(o.status)&&(
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
