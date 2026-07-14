import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api";

const fmt = (n) => `₦${Number(n||0).toLocaleString("en-NG")}`

const STATUS_CFG = {
  paid:             { label:"New Order",       color:"#0ea5e9", bg:"#e0f2fe" },
  new_order:        { label:"New Order",       color:"#0ea5e9", bg:"#e0f2fe" },
  pending:          { label:"New Order",       color:"#0ea5e9", bg:"#e0f2fe" },
  processing:       { label:"Processing",      color:"#f59e0b", bg:"#fef3c7" },
  packed_ready:     { label:"Packed & Ready",  color:"#8b5cf6", bg:"#ede9fe" },
  driver_assigned:  { label:"Driver Assigned", color:"#06b6d4", bg:"#cffafe" },
  out_for_delivery: { label:"Out for Delivery",color:"#3b82f6", bg:"#dbeafe" },
  delivered:        { label:"Delivered",       color:"#22c55e", bg:"#dcfce7" },
  dispute:          { label:"Dispute",         color:"#ef4444", bg:"#fee2e2" },
  cancelled:        { label:"Cancelled",       color:"#6b7280", bg:"#f3f4f6" },
}

const TH   = { padding:"10px 16px",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"left",whiteSpace:"nowrap" }
const TD   = { padding:"12px 16px",verticalAlign:"middle",borderBottom:"1px solid #f3f4f6",fontSize:13,color:"#111827" }
const btnP = { display:"inline-flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:9,border:"none",background:"#1B4332",color:"#fff",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13 }
const btnL = { display:"inline-flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:9,border:"1.5px solid #e5e7eb",background:"#fff",color:"#374151",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:600,fontSize:13 }

function InfoCard({ title, children }) {
  return (
    <div style={{ background:"#fff",borderRadius:10,border:"1px solid #f3f4f6",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:16 }}>
      <div style={{ padding:"12px 16px",borderBottom:"1px solid #f3f4f6",fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:13,color:"#111827" }}>{title}</div>
      <div style={{ padding:16 }}>{children}</div>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const [order,setOrder]     = useState(null)
  const [loading,setLoading] = useState(true)
  const [error,setError]     = useState(null)
  const [updating,setUpdating] = useState(false)

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

  const updateStatus = async (status) => {
    setUpdating(true)
    try {
      await api.patch(`/admin/orders/${id}/status`,{ status })
      load()
    } catch {
      alert("Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return (
    <div style={{ display:"flex",justifyContent:"center",alignItems:"center",minHeight:300,fontFamily:"Nunito,sans-serif" }}>
      <div style={{ textAlign:"center",color:"#6b7280" }}>
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

  return (
    <div style={{ fontFamily:"Nunito,sans-serif" }}>
      {/* Page header */}
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24 }}>
        <Link to="/orders" style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",color:"#374151",textDecoration:"none" }}>
          <i className="ri-arrow-left-line" style={{ fontSize:16 }}/>
        </Link>
        <div>
          <div style={{ fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:20,color:"#111827" }}>Order {o.id}</div>
          <div style={{ fontSize:12,color:"#6b7280",marginTop:2 }}>
            {new Date(o.created_at).toLocaleString("en-NG",{ weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit" })}
          </div>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:cfg.bg,color:cfg.color,borderRadius:50,padding:"5px 12px",fontSize:12,fontWeight:600 }}>
            {o.status?.replace(/_/g," ")}
          </span>
          <button style={btnL}><i className="ri-printer-line"/>Print Invoice</button>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:24 }}>
        {/* Left column */}
        <div>
          <InfoCard title="Order Items">
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#f9fafb" }}>
                    {["Item","SKU","Qty","Unit Price","Total"].map(h=><th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(o.items||[]).map((item,i)=>(
                    <tr key={i}>
                      <td style={{ ...TD,fontWeight:600 }}>{item.name||item.product_name}</td>
                      <td style={{ ...TD,color:"#6b7280",fontSize:12 }}>{item.sku||"—"}</td>
                      <td style={TD}>{item.quantity}</td>
                      <td style={TD}>{fmt(item.unit_price||item.price)}</td>
                      <td style={{ ...TD,fontWeight:600 }}>{fmt(item.subtotal||item.quantity*(item.unit_price||item.price))}</td>
                    </tr>
                  ))}
                  {(o.items||[]).length===0&&(
                    <tr><td colSpan={5} style={{ ...TD,textAlign:"center",color:"#9ca3af" }}>No items</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ borderTop:"1px solid #f3f4f6",paddingTop:12,marginTop:4 }}>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6 }}>
                <div style={{ display:"flex",justifyContent:"space-between",width:220,fontSize:13,color:"#6b7280" }}><span>Subtotal</span><span>{fmt(o.subtotal)}</span></div>
                <div style={{ display:"flex",justifyContent:"space-between",width:220,fontSize:13,color:"#6b7280" }}><span>Delivery Fee</span><span>{fmt(o.delivery_fee)}</span></div>
                <div style={{ display:"flex",justifyContent:"space-between",width:220,fontSize:13,color:"#16a34a" }}><span>Discount</span><span>-{fmt(o.discount_amount)}</span></div>
                <div style={{ display:"flex",justifyContent:"space-between",width:220,fontSize:15,fontWeight:700,borderTop:"1px solid #e5e7eb",paddingTop:8,marginTop:4 }}>
                  <span>Total</span><span style={{ color:"#1B4332" }}>{fmt(o.total)}</span>
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Update Status">
            <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
              {["processing","packed_ready","driver_assigned","out_for_delivery","delivered","cancelled"].map(s=>{
                const isCurrent=o.status===s
                return (
                  <button key={s} onClick={()=>updateStatus(s)} disabled={updating}
                    style={{ padding:"7px 14px",borderRadius:8,border:isCurrent?"none":"1.5px solid #e5e7eb",background:isCurrent?"#1B4332":"#fff",color:isCurrent?"#fff":"#374151",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:isCurrent?700:500,fontSize:13 }}>
                    {s.replace(/_/g," ")}
                  </button>
                )
              })}
            </div>
          </InfoCard>

          <InfoCard title="Order Timeline">
            {(o.timeline||[]).length===0?(
              <div style={{ fontSize:13,color:"#6b7280" }}>No timeline events yet</div>
            ):(
              (o.timeline||[]).map((ev,i)=>(
                <div key={i} style={{ display:"flex",gap:12,marginBottom:16 }}>
                  <div style={{ flexShrink:0,marginTop:6 }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:"#1B4332" }}/>
                  </div>
                  <div>
                    <div style={{ fontWeight:600,fontSize:13 }}>{ev.to_status?.replace(/_/g," ")}</div>
                    <div style={{ fontSize:11,color:"#6b7280" }}>{new Date(ev.created_at).toLocaleString("en-NG")}</div>
                    {ev.notes&&<div style={{ fontSize:12,color:"#6b7280",marginTop:4 }}>{ev.notes}</div>}
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
                  <i className="ri-mail-line" style={{ color:"#6b7280" }}/>{o.customer_email}
                </div>
              )}
              {o.customer_phone&&(
                <div style={{ display:"flex",gap:8,fontSize:13,alignItems:"center" }}>
                  <i className="ri-phone-line" style={{ color:"#6b7280" }}/>{o.customer_phone}
                </div>
              )}
              {(o.delivery_address||o.address)&&(
                <div style={{ display:"flex",gap:8,fontSize:13,alignItems:"flex-start" }}>
                  <i className="ri-map-pin-line" style={{ color:"#6b7280",marginTop:2 }}/><span>{o.delivery_address||o.address}</span>
                </div>
              )}
            </div>
          </InfoCard>

          {o.driver_name&&(
            <InfoCard title="Delivery">
              {[["Driver",o.driver_name,"#111827"],["Phone",o.driver_phone,"#111827"],o.eta_minutes&&["ETA",`${o.eta_minutes} min`,"#16a34a"],o.driver_plate&&["Vehicle",o.driver_plate,"#111827"]].filter(Boolean).map(([k,v,c])=>(
                <div key={k} style={{ display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8 }}>
                  <span style={{ color:"#6b7280" }}>{k}</span>
                  <span style={{ fontWeight:600,color:c }}>{v}</span>
                </div>
              ))}
            </InfoCard>
          )}

          <InfoCard title="Payment">
            {[["Method",o.payment_method||"—","#111827",500],["Reference",o.payment_ref||"—","#6b7280",400],["Source",o.source||(o.channel||"").replace(/_/g," "),"#111827",500],["Amount",fmt(o.total),"#1B4332",700]].map(([k,v,c,w])=>(
              <div key={k} style={{ display:"flex",justifyContent:"space-between",fontSize:k==="Reference"?11:13,marginBottom:8 }}>
                <span style={{ color:"#6b7280" }}>{k}</span>
                <span style={{ fontWeight:w,color:c }}>{v}</span>
              </div>
            ))}
          </InfoCard>

          {o.notes&&(
            <InfoCard title="Customer Notes">
              <p style={{ fontSize:13,color:"#6b7280",fontStyle:"italic",margin:0 }}>"{o.notes}"</p>
            </InfoCard>
          )}
        </div>
      </div>
    </div>
  )
}
