import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../lib/api";

const fmt = (n) => `₦${Number(n||0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const STATUS_CFG = {
  paid:             { label:"New Order",       color:"#0ea5e9", bg:"#e0f2fe" },
  new_order:        { label:"New Order",       color:"#0ea5e9", bg:"#e0f2fe" },
  pending:          { label:"New Order",       color:"#0ea5e9", bg:"#e0f2fe" },
  processing:       { label:"Processing",      color:"#f59e0b", bg:"#fef3c7" },
  packed_ready:     { label:"Packed & Ready",  color:"#8b5cf6", bg:"#ede9fe" },
  driver_assigned:  { label:"Driver Assigned", color:"#06b6d4", bg:"#cffafe" },
  out_for_delivery: { label:"Out for Delivery",color:"#3b82f6", bg:"#dbeafe" },
  delivery_attempted:{ label:"Delivery Attempted", color:"#f97316", bg:"#ffedd5" },
  delivered:        { label:"Delivered",       color:"#22c55e", bg:"#dcfce7" },
  dispute:          { label:"Dispute",         color:"#ef4444", bg:"#fee2e2" },
  cancelled:        { label:"Cancelled",       color:'var(--text-muted)', bg:"var(--border)" },
}

const TH   = { padding:"10px 16px",fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"left",whiteSpace:"nowrap" }
const TD   = { padding:"12px 16px",verticalAlign:"middle",borderBottom:"1px solid var(--border)",fontSize:13,color:'var(--text-primary)' }
const btnP = { display:"inline-flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:9,border:"none",background:"#1B4332",color:"#fff",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13 }
const btnL = { display:"inline-flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:9,border:"1.5px solid var(--border)",background:'var(--bg-card)',color:'var(--text-secondary)',cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:600,fontSize:13 }
const inp  = { display:"block",width:"100%",padding:"9px 12px",border:"1.5px solid var(--border)",borderRadius:8,fontFamily:"Nunito,sans-serif",fontSize:13,outline:"none",background:'var(--bg-card)',boxSizing:"border-box" }
const LBL  = { display:"block",fontSize:12,fontWeight:700,color:'var(--text-secondary)',marginBottom:6 }
const S    = "#6b7280"

function InfoCard({ title, children }) {
  return (
    <div style={{ background:'var(--bg-card)',borderRadius:10,border:"1px solid var(--border)",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:16 }}>
      <div style={{ padding:"12px 16px",borderBottom:"1px solid var(--border)",fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:13,color:'var(--text-primary)' }}>{title}</div>
      <div style={{ padding:16 }}>{children}</div>
    </div>
  )
}

function Modal({ title, onClose, children, maxWidth=480, danger=false }) {
  return <>
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1054 }}/>
    <div style={{ position:"fixed",inset:0,zIndex:1055,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:'var(--bg-card)',borderRadius:14,width:"100%",maxWidth,boxShadow:"0 8px 40px rgba(0,0,0,0.18)",overflow:"hidden",maxHeight:"90vh",display:"flex",flexDirection:"column" }}>
        <div style={{ background:danger?"#7f1d1d":"#1B4332",color:"#fff",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
          <span style={{ fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:15 }}>{title}</span>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.8)",cursor:"pointer",fontSize:20,display:"flex",padding:4 }}><i className="ri-close-line"/></button>
        </div>
        <div style={{ padding:24,overflowY:"auto" }}>{children}</div>
      </div>
    </div>
  </>
}

export default function OrderDetail() {
  const { id } = useParams()
  const [order,setOrder]     = useState(null)
  const [loading,setLoading] = useState(true)
  const [error,setError]     = useState(null)
  const [updating,setUpdating] = useState(false)

  const [drivers,setDrivers] = useState([])
  const [activeModal,setActiveModal] = useState(null) // assign | dispute | reschedule | cancel
  const [assignDriverId,setAssignDriverId] = useState("")
  const [assignType,setAssignType] = useState("initial")
  const [disputeDecision,setDisputeDecision] = useState("")
  const [disputeNote,setDisputeNote] = useState("")
  const [disputeAmount,setDisputeAmount] = useState("")
  const [cancelReason,setCancelReason] = useState("")
  const [rescheduleNote,setRescheduleNote] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/orders/${id}`)
      setOrder(res.data)
    } catch (err) {
      setError(err.response?.data?.message||"Order not found")
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() },[id])
  useEffect(()=>{ api.get("/admin/orders/form-data/drivers").then(r=>setDrivers(r.data.drivers||[])).catch(()=>{}) },[])

  const openModal = (type, meta={}) => {
    setActiveModal(type)
    setAssignDriverId(""); setDisputeDecision(""); setDisputeNote("")
    setDisputeAmount(""); setCancelReason(""); setRescheduleNote("")
    if (type==="assign") setAssignType(meta.assignType||"initial")
  }
  const closeModal = () => setActiveModal(null)

  const updateStatus = async (status, notes, extra={}) => {
    setUpdating(true)
    try {
      await api.patch(`/admin/orders/${id}/status`,{ status, notes, ...extra })
      toast.success("Order updated"); closeModal(); load()
    } catch (err) {
      toast.error(err.response?.data?.message||"Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  const processOrder = () => updateStatus("processing", "Order sent to picking queue")
  const markPacked    = () => updateStatus("packed_ready", "Goods picked, packed and labelled")

  const assignDriver = async () => {
    if (!assignDriverId) return
    setUpdating(true)
    try {
      await api.patch(`/admin/orders/${id}/assign-driver`,{ driver_id:parseInt(assignDriverId), reassign:assignType==="manual_reassign" })
      toast.success(assignType==="manual_reassign"?"Driver reassigned":"Driver assigned"); closeModal(); load()
    } catch (err) {
      toast.error(err.response?.data?.message||"Failed to assign driver")
    } finally {
      setUpdating(false)
    }
  }

  const resolveDispute = async () => {
    if (!disputeDecision || !disputeNote) return
    setUpdating(true)
    try {
      await api.patch(`/admin/orders/${id}/resolve-dispute`,{ decision:disputeDecision, notes:disputeNote, refund_amount:disputeAmount })
      toast.success("Dispute resolved"); closeModal(); load()
    } catch (err) {
      toast.error(err.response?.data?.message||"Failed to resolve dispute")
    } finally {
      setUpdating(false)
    }
  }

  const cancelOrder = async () => {
    if (!cancelReason) return
    setUpdating(true)
    try {
      await api.patch(`/admin/orders/${id}/cancel`,{ reason:cancelReason })
      toast.success("Order cancelled"); closeModal(); load()
    } catch (err) {
      toast.error(err.response?.data?.message||"Failed to cancel order")
    } finally {
      setUpdating(false)
    }
  }

  const rescheduleDelivery = async () => {
    if (!rescheduleNote) return
    await updateStatus("driver_assigned", `Delivery rescheduled (attempt ${(order?.attempts||0)+1}). ${rescheduleNote}`)
  }

  if (loading) return (
    <div style={{ display:"flex",justifyContent:"center",alignItems:"center",minHeight:300,fontFamily:"Nunito,sans-serif" }}>
      <div style={{ textAlign:"center",color:'var(--text-muted)' }}>
        <i className="ri-loader-4-line" style={{ fontSize:36,display:"block",marginBottom:8 }}/>Loading order...
      </div>
    </div>
  )

  if (error) return (
    <div style={{ fontFamily:"Nunito,sans-serif",padding:24 }}>
      <div style={{ background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:10,padding:16,color:"#991b1b",marginBottom:16 }}>{error}</div>
      <Link to="/orders" style={{ ...btnL,textDecoration:"none" }}><i className="ri-arrow-left-line"/>Back to Orders</Link>
    </div>
  )

  const o   = order
  const cfg = STATUS_CFG[o.status]||STATUS_CFG.cancelled
  const hasDriver = !!(o.driver_id || o.driver_name)

  return (
    <div style={{ fontFamily:"Nunito,sans-serif" }}>
      {/* Fixed 320px sidebar column would overflow on any phone-width screen */}
      <style>{`
        @media (max-width: 700px) {
          .ordd-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Page header */}
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24,flexWrap:"wrap" }}>
        <Link to="/orders" style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:8,border:"1.5px solid var(--border)",background:'var(--bg-card)',color:'var(--text-secondary)',textDecoration:"none" }}>
          <i className="ri-arrow-left-line" style={{ fontSize:16 }}/>
        </Link>
        <div>
          <div style={{ fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:20,color:'var(--text-primary)' }}>Order {o.id}</div>
          <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:2 }}>
            {new Date(o.created_at).toLocaleString("en-NG",{ weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit" })}
          </div>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:cfg.bg,color:cfg.color,borderRadius:50,padding:"5px 12px",fontSize:12,fontWeight:600 }}>
            {o.status?.replace(/_/g," ")}
          </span>
          <button style={btnL}><i className="ri-printer-line"/>Print Receipt</button>
        </div>
      </div>

      <div className="ordd-grid" style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:24 }}>
        {/* Left column */}
        <div>
          <InfoCard title="Order Items">
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:'var(--bg-subtle)' }}>
                    {["Item","SKU","Qty","Unit Price","Total"].map(h=><th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(o.items||[]).map((item,i)=>(
                    <tr key={i}>
                      <td style={{ ...TD,fontWeight:600 }}>{item.name||item.product_name}</td>
                      <td style={{ ...TD,color:'var(--text-muted)',fontSize:12 }}>{item.sku||"—"}</td>
                      <td style={TD}>{item.quantity}</td>
                      <td style={TD}>{fmt(item.unit_price||item.price)}</td>
                      <td style={{ ...TD,fontWeight:600 }}>{fmt(item.subtotal||item.quantity*(item.unit_price||item.price))}</td>
                    </tr>
                  ))}
                  {(o.items||[]).length===0&&(
                    <tr><td colSpan={5} style={{ ...TD,textAlign:"center",color:'var(--text-light)' }}>No items</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ borderTop:"1px solid var(--border)",paddingTop:12,marginTop:4 }}>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6 }}>
                <div style={{ display:"flex",justifyContent:"space-between",width:220,fontSize:13,color:'var(--text-muted)' }}><span>Subtotal</span><span>{fmt(o.subtotal)}</span></div>
                <div style={{ display:"flex",justifyContent:"space-between",width:220,fontSize:13,color:'var(--text-muted)' }}><span>Delivery Fee</span><span>{fmt(o.delivery_fee)}</span></div>
                <div style={{ display:"flex",justifyContent:"space-between",width:220,fontSize:13,color:"#16a34a" }}><span>Discount</span><span>-{fmt(o.discount_amount)}</span></div>
                <div style={{ display:"flex",justifyContent:"space-between",width:220,fontSize:15,fontWeight:700,borderTop:"1px solid var(--border)",paddingTop:8,marginTop:4 }}>
                  <span>Total</span><span style={{ color:"#1B4332" }}>{fmt(o.total)}</span>
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Update Status">
            {/* Guarded actions only — mirrors OrdersList.jsx's per-status action
                buttons so this page can't skip driver assignment or bypass the
                refund-aware dispute flow the way a free-for-all status list could. */}
            <div style={{ display:"flex",flexWrap:"wrap",gap:10 }}>
              {["paid","new_order","pending"].includes(o.status)&&(
                <button style={btnP} onClick={processOrder} disabled={updating}><i className="ri-play-circle-line"/>Process Order</button>
              )}
              {o.status==="processing"&&(
                <button style={btnP} onClick={markPacked} disabled={updating}><i className="ri-archive-line"/>Mark as Packed</button>
              )}
              {["packed_ready","packed"].includes(o.status)&&(
                <button style={btnP} onClick={()=>openModal("assign",{assignType:"initial"})} disabled={updating}><i className="ri-user-add-line"/>Assign Driver</button>
              )}
              {["driver_assigned","assigned","out_for_delivery","shipped","delivery_attempted"].includes(o.status)&&hasDriver&&(
                <button style={{ ...btnP,background:"#d97706" }} onClick={()=>openModal("assign",{assignType:"manual_reassign"})} disabled={updating}><i className="ri-user-follow-line"/>Reassign Driver</button>
              )}
              {o.status==="dispute"&&(
                <button style={{ ...btnP,background:"#dc2626" }} onClick={()=>openModal("dispute")} disabled={updating}><i className="ri-shield-check-line"/>Resolve Dispute</button>
              )}
              {o.status==="delivery_attempted"&&(
                <button style={btnL} onClick={()=>openModal("reschedule")} disabled={updating}><i className="ri-calendar-line"/>Reschedule</button>
              )}
              {["paid","new_order","pending","processing","packed_ready","packed","driver_assigned","assigned"].includes(o.status)&&(
                <button style={{ ...btnL,color:"#991b1b",borderColor:"#fca5a5" }} onClick={()=>openModal("cancel")} disabled={updating}><i className="ri-close-circle-line"/>Cancel Order</button>
              )}
              {["delivered","cancelled"].includes(o.status)&&(
                <span style={{ fontSize:13,color:S }}>No further actions — order is {o.status}.</span>
              )}
            </div>
          </InfoCard>

          <InfoCard title="Order Timeline">
            {(o.timeline||[]).length===0?(
              <div style={{ fontSize:13,color:'var(--text-muted)' }}>No timeline events yet</div>
            ):(
              (o.timeline||[]).map((ev,i)=>(
                <div key={i} style={{ display:"flex",gap:12,marginBottom:16 }}>
                  <div style={{ flexShrink:0,marginTop:6 }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:"#1B4332" }}/>
                  </div>
                  <div>
                    <div style={{ fontWeight:600,fontSize:13 }}>{ev.to_status?.replace(/_/g," ")}</div>
                    <div style={{ fontSize:11,color:'var(--text-muted)' }}>{new Date(ev.created_at).toLocaleString("en-NG")}</div>
                    {ev.notes&&<div style={{ fontSize:12,color:'var(--text-muted)',marginTop:4 }}>{ev.notes}</div>}
                  </div>
                </div>
              ))
            )}
          </InfoCard>
        </div>

        {/* Right sidebar */}
        <div>
          <InfoCard title="Customer">
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              <div style={{ fontWeight:600 }}>{o.customer_name}</div>
              {o.customer_email&&(
                <div style={{ display:"flex",gap:8,fontSize:13,alignItems:"center" }}>
                  <i className="ri-mail-line" style={{ color:'var(--text-muted)' }}/>{o.customer_email}
                </div>
              )}
              {o.customer_phone&&(
                <div style={{ display:"flex",gap:8,fontSize:13,alignItems:"center" }}>
                  <i className="ri-phone-line" style={{ color:'var(--text-muted)' }}/>{o.customer_phone}
                </div>
              )}
              {(o.delivery_address||o.address)&&(
                <div style={{ display:"flex",gap:8,fontSize:13,alignItems:"flex-start" }}>
                  <i className="ri-map-pin-line" style={{ color:'var(--text-muted)',marginTop:2 }}/><span>{o.delivery_address||o.address}</span>
                </div>
              )}
            </div>
          </InfoCard>

          {o.driver_name&&(
            <InfoCard title="Delivery">
              {[["Driver",o.driver_name,"var(--text-primary)"],["Phone",o.driver_phone,"var(--text-primary)"],o.eta_minutes&&["ETA",`${o.eta_minutes} min`,"#16a34a"],o.driver_plate&&["Vehicle",o.driver_plate,"var(--text-primary)"]].filter(Boolean).map(([k,v,c])=>(
                <div key={k} style={{ display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8 }}>
                  <span style={{ color:'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight:600,color:c }}>{v}</span>
                </div>
              ))}
            </InfoCard>
          )}

          <InfoCard title="Payment">
            {[["Method",o.payment_method||"—","var(--text-primary)",500],["Reference",o.payment_ref||"—","#6b7280",400],["Source",o.source||(o.channel||"").replace(/_/g," "),"var(--text-primary)",500],["Amount",fmt(o.total),"#1B4332",700]].map(([k,v,c,w])=>(
              <div key={k} style={{ display:"flex",justifyContent:"space-between",fontSize:k==="Reference"?11:13,marginBottom:8 }}>
                <span style={{ color:'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight:w,color:c }}>{v}</span>
              </div>
            ))}
          </InfoCard>

          {o.notes&&(
            <InfoCard title="Customer Notes">
              <p style={{ fontSize:13,color:'var(--text-muted)',fontStyle:"italic",margin:0 }}>"{o.notes}"</p>
            </InfoCard>
          )}
        </div>
      </div>

      {/* ASSIGN / REASSIGN DRIVER */}
      {activeModal==="assign"&&(
        <Modal title={assignType==="manual_reassign"?"Manual Driver Reassignment":"Assign Driver"} onClose={closeModal}>
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
                  {Number(assignDriverId)===driver.id&&<i className="ri-checkbox-circle-fill" style={{ fontSize:18,color:"#6366f1" }}/>}
                </div>
              ))}
            </div>
          )}
          <div style={{ display:"flex",gap:10 }}>
            <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
            <button style={{ ...btnP,flex:1,justifyContent:"center",background:assignType==="manual_reassign"?"#d97706":"#1B4332" }} onClick={assignDriver} disabled={!assignDriverId||updating}>
              {updating?"Assigning...":assignType==="manual_reassign"?"Reassign & Notify":"Assign & Notify"}
            </button>
          </div>
        </Modal>
      )}

      {/* RESOLVE DISPUTE */}
      {activeModal==="dispute"&&(
        <Modal title="Resolve Dispute" maxWidth={540} onClose={closeModal}>
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
            {[
              { key:"full_refund",    label:"Full Refund",    desc:`Refund ${fmt(o.total)} to customer`,          color:"#22c55e",icon:"ri-refund-2-line"           },
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
                {disputeDecision===d.key&&<i className="ri-checkbox-circle-fill" style={{ fontSize:18,color:d.color }}/>}
              </div>
            ))}
          </div>

          {disputeDecision==="partial_refund"&&(
            <div style={{ marginBottom:16 }}>
              <label style={LBL}>Refund Amount (₦) <span style={{ color:'#dc2626' }}>*</span></label>
              <input type="number" style={inp} min="1" max={o.total} required value={disputeAmount} onChange={e=>setDisputeAmount(e.target.value)} placeholder="Enter amount"/>
            </div>
          )}

          <div style={{ marginBottom:20 }}>
            <label style={LBL}>Notes / Rationale <span style={{ color:'#dc2626' }}>*</span></label>
            <textarea style={{ ...inp,resize:"vertical",minHeight:80 }} required value={disputeNote} onChange={e=>setDisputeNote(e.target.value)} placeholder="Provide context for customer support..."/>
          </div>

          <div style={{ display:"flex",gap:10 }}>
            <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
            <button style={{ ...btnP,flex:1,justifyContent:"center",background:"#dc2626" }} onClick={resolveDispute} disabled={!disputeDecision||!disputeNote||updating}>
              {updating?"Resolving...":"Confirm Decision"}
            </button>
          </div>
        </Modal>
      )}

      {/* RESCHEDULE */}
      {activeModal==="reschedule"&&(
        <Modal title="Reschedule Delivery" onClose={closeModal}>
          <div style={{ background:"#fef3c7",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13 }}>
            <i className="ri-alert-line" style={{ marginRight:6,color:"#92400e" }}/>
            Increments the delivery attempts counter (currently {o.attempts||0}).
          </div>
          <label style={LBL}>Reschedule Notes <span style={{ color:'#dc2626' }}>*</span></label>
          <textarea style={{ ...inp,marginBottom:20,resize:"vertical",minHeight:85 }} required placeholder="e.g. Customer unavailable, rescheduled for tomorrow morning..." value={rescheduleNote} onChange={e=>setRescheduleNote(e.target.value)}/>
          <div style={{ display:"flex",gap:10 }}>
            <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
            <button style={{ ...btnP,flex:1,justifyContent:"center",background:"#d97706" }} onClick={rescheduleDelivery} disabled={!rescheduleNote||updating}>
              {updating?"Rescheduling...":"Reschedule Order"}
            </button>
          </div>
        </Modal>
      )}

      {/* CANCEL */}
      {activeModal==="cancel"&&(
        <Modal title="Cancel Order" danger onClose={closeModal}>
          <div style={{ background:"#fee2e2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#991b1b" }}>
            <i className="ri-error-warning-line" style={{ marginRight:6 }}/>
            <strong>Warning.</strong> This cancels payment collections and releases back inventory.
          </div>
          <label style={LBL}>Reason for Cancellation <span style={{ color:'#dc2626' }}>*</span></label>
          <textarea style={{ ...inp,marginBottom:20,resize:"vertical",minHeight:80 }} required placeholder="e.g. Customer request, out of stock..." value={cancelReason} onChange={e=>setCancelReason(e.target.value)}/>
          <div style={{ display:"flex",gap:10 }}>
            <button style={{ ...btnL,flex:1,justifyContent:"center" }} onClick={closeModal}>Cancel</button>
            <button style={{ ...btnP,flex:1,justifyContent:"center",background:"#dc2626" }} onClick={cancelOrder} disabled={!cancelReason||updating}>
              {updating?"Cancelling...":"Cancel Order"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}