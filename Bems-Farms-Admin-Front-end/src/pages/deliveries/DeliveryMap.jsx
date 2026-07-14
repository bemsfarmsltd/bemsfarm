import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STORE_POS = [6.4553, 3.3862]

const DELIVERIES = [
  {
    id:'DEL-2026-0042', orderId:'ORD-2026-0138', status:'shipped',
    driver:{ name:'Emeka Okafor', phone:'08045678901', bike:'LAG-567-CD', color:'#3b82f6' },
    customer:{ name:'Kemi Balogun', phone:'08167891234', address:'18 Surulere, Lagos' },
    driverPos:[6.4920,3.3600], customerPos:[6.5048,3.3543],
    zone:'Surulere / Yaba', eta:'~18 min', total:16100, attempts:0,
    items:'Fresh Tomatoes ×3kg, Red Bell Pepper ×2kg',
  },
  {
    id:'DEL-2026-0041', orderId:'ORD-2026-0139', status:'assigned',
    driver:{ name:'Tunde Adeyemi', phone:'08031234567', bike:'LAG-234-AB', color:'#06b6d4' },
    customer:{ name:'Seun Adesanya', phone:'09012341234', address:'5 Ikeja GRA, Lagos' },
    driverPos:[6.4553,3.3862], customerPos:[6.5944,3.3478],
    zone:'Ikeja / GRA', eta:'—', total:14200, attempts:0,
    items:'Ginger ×1kg, Garlic ×1kg, Sweet Corn ×6 cobs',
  },
  {
    id:'DEL-2026-0040', orderId:'ORD-2026-0137', status:'delivery_attempted',
    driver:{ name:'Bola Akinwale', phone:'08056789012', bike:'LAG-890-EF', color:'#f97316' },
    customer:{ name:'Tobi Adekunle', phone:'07056781234', address:'3 Ojota Estate, Lagos' },
    driverPos:[6.5730,3.3930], customerPos:[6.5810,3.3950],
    zone:'Maryland / Gbagada', eta:'—', total:12400, attempts:1,
    items:'Plantain ×4 hands, Ugwu ×3 bunches',
  },
  {
    id:'DEL-2026-0039', orderId:'ORD-2026-0141', status:'assigned',
    driver:{ name:'Femi Adeleye', phone:'08078901234', bike:'LAG-456-IJ', color:'#8b5cf6' },
    customer:{ name:'Adaeze Nwosu', phone:'07098765432', address:'7 Lekki Phase 1, Lagos' },
    driverPos:[6.4553,3.3862], customerPos:[6.4677,3.5215],
    zone:'Lekki Phase 1', eta:'—', total:48100, attempts:0,
    items:'Fresh Tomatoes ×8kg, Red Bell Pepper ×4kg +2 more',
  },
]

const STATUS_CFG = {
  assigned:           { label:'Awaiting Pickup', color:'#06b6d4', bg:'#cffafe', pulse:false },
  shipped:            { label:'En Route',        color:'#3b82f6', bg:'#dbeafe', pulse:true  },
  delivery_attempted: { label:'Attempted',       color:'#f97316', bg:'#ffedd5', pulse:false },
}
const fmt = n => `₦${Number(n).toLocaleString()}`

function driverIcon(driver, status) {
  const cfg      = STATUS_CFG[status]
  const initials = driver.name.split(' ').map(n=>n[0]).join('')
  const pulse    = cfg.pulse ? `<span style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${driver.color};animation:pulse-ring 1.5s ease-out infinite;opacity:0.6;"></span>` : ''
  return L.divIcon({
    className:'', iconSize:[40,40], iconAnchor:[20,20], popupAnchor:[0,-22],
    html:`<div style="position:relative;width:40px;height:40px;">${pulse}<div style="width:40px;height:40px;border-radius:50%;background:${driver.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.35);border:2px solid #fff;position:relative;z-index:1;">${initials}</div><div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);background:${driver.color};color:#fff;font-size:9px;font-weight:600;padding:1px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.2);">${driver.name.split(' ')[0]}</div></div>`,
  })
}

function customerIcon(color) {
  return L.divIcon({
    className:'', iconSize:[28,36], iconAnchor:[14,36], popupAnchor:[0,-38],
    html:`<div style="position:relative;width:28px;height:36px;"><div style="width:28px;height:28px;border-radius:50%;background:#fff;border:3px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);"><i class="ri-home-4-fill" style="color:${color};font-size:13px;"></i></div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid ${color};margin:0 auto;margin-top:-2px;"></div></div>`,
  })
}

function storeIcon() {
  return L.divIcon({
    className:'', iconSize:[44,44], iconAnchor:[22,22], popupAnchor:[0,-24],
    html:`<div style="width:44px;height:44px;border-radius:10px;background:#1B4332;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.4);border:2px solid #fff;flex-direction:column;gap:1px;"><i class="ri-store-2-fill" style="font-size:18px;"></i><div style="font-size:7px;font-weight:700;letter-spacing:0.5px;">BEMS</div></div>`,
  })
}

function FlyToDriver({ pos }) {
  const map = useMap()
  useEffect(() => { if (pos) map.flyTo(pos, 15, { duration:1.2 }) }, [pos, map])
  return null
}

export default function DeliveryMap() {
  const [selected, setSelected]     = useState(null)
  const [flyTarget, setFlyTarget]   = useState(null)
  const [tick, setTick]             = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t=>t+1), 8000)
    return () => clearInterval(id)
  }, [])

  const deliveries = DELIVERIES.map(d => {
    if (d.status!=='shipped') return d
    const jitter = tick*0.0003
    return { ...d, driverPos:[d.driverPos[0]+jitter, d.driverPos[1]+jitter*0.5] }
  })

  const handleSelect = del => { setSelected(del); setFlyTarget(del.driverPos) }

  return (
    <div style={{ fontFamily:'Nunito, sans-serif', height:'calc(100vh - 70px)', display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes pulse-ring { 0% { transform:scale(0.8);opacity:0.8; } 100% { transform:scale(1.8);opacity:0; } }
        .leaflet-popup-content-wrapper { border-radius:10px !important; box-shadow:0 4px 20px rgba(0,0,0,0.15) !important; padding:0 !important; overflow:hidden; }
        .leaflet-popup-content { margin:0 !important; }
        .leaflet-popup-tip-container { margin-top:-1px; }
      `}</style>

      {/* Page Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:18, color:'#111827' }}>Live Delivery Map</div>
          <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>
            <a href="#" style={{ color:'#9ca3af', textDecoration:'none' }}>Deliveries</a>
            <i className="ri-arrow-right-s-line" style={{ margin:'0 4px', color:'#d1d5db' }} />
            <span style={{ color:'#374151' }}>Live Map</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:50, background:'#dcfce7', color:'#16a34a' }}>
            <i className="ri-checkbox-blank-circle-fill" style={{ fontSize:7 }} />Live
          </span>
          <span style={{ fontSize:12, color:'#6b7280' }}>{deliveries.length} active deliveries</span>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:12, flexShrink:0 }}>
        {[
          { label:'En Route',        count:deliveries.filter(d=>d.status==='shipped').length,            color:'#3b82f6', icon:'ri-truck-line'          },
          { label:'Awaiting Pickup', count:deliveries.filter(d=>d.status==='assigned').length,           color:'#06b6d4', icon:'ri-user-location-line'  },
          { label:'Attempted',       count:deliveries.filter(d=>d.status==='delivery_attempted').length, color:'#f97316', icon:'ri-route-line'           },
          { label:'Total Active',    count:deliveries.length,                                             color:'#6366f1', icon:'ri-map-pin-line'         },
        ].map(s => (
          <div key={s.label} style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', padding:'10px 12px', display:'flex', alignItems:'center', gap:10, borderLeft:`3px solid ${s.color}` }}>
            <div style={{ width:32, height:32, borderRadius:8, background:s.color+'20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={s.icon} style={{ color:s.color, fontSize:14 }} />
            </div>
            <div>
              <div style={{ fontSize:10, color:'#64748b' }}>{s.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:'#111827', fontFamily:'Syne, sans-serif', lineHeight:1 }}>{s.count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Map + Side Panel */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'300px 1fr', borderRadius:12, overflow:'hidden', border:'1px solid #e5e7eb', minHeight:0 }}>

        {/* Side panel */}
        <div style={{ overflowY:'auto', background:'#fff', borderRight:'1px solid #e5e7eb' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:8 }}>
            <i className="ri-list-check" style={{ color:'#9ca3af' }} />
            <span style={{ fontWeight:600, fontSize:13 }}>Active Deliveries</span>
            <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:50, background:'#1B4332', color:'#fff' }}>{deliveries.length}</span>
          </div>

          {deliveries.map(del => {
            const cfg      = STATUS_CFG[del.status]
            const isActive = selected?.id===del.id
            return (
              <div key={del.id} onClick={() => handleSelect(del)} style={{ padding:'12px 14px', borderBottom:'1px solid #f9fafb', cursor:'pointer', background:isActive?del.driver.color+'12':'#fff', borderLeft:isActive?`3px solid ${del.driver.color}`:'3px solid transparent', transition:'all 0.15s' }}>
                {/* Top row */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:del.driver.color+'20', color:del.driver.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
                    {del.driver.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{del.driver.name}</div>
                    <div style={{ fontSize:10, color:'#9ca3af' }}>{del.driver.bike}</div>
                  </div>
                  <span style={{ fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:50, background:cfg.bg, color:cfg.color, flexShrink:0 }}>{cfg.label}</span>
                </div>
                {/* Customer */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:4, marginBottom:4 }}>
                  <i className="ri-user-line" style={{ color:'#9ca3af', fontSize:11, marginTop:2, flexShrink:0 }} />
                  <span style={{ fontSize:12 }}>{del.customer.name}</span>
                </div>
                <div style={{ display:'flex', alignItems:'flex-start', gap:4, marginBottom:8 }}>
                  <i className="ri-map-pin-line" style={{ color:'#9ca3af', fontSize:11, marginTop:2, flexShrink:0 }} />
                  <span style={{ fontSize:11, color:'#6b7280' }}>{del.customer.address}</span>
                </div>
                {/* Footer */}
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontWeight:600, fontSize:12 }}>{fmt(del.total)}</span>
                  {del.eta!=='—' && <span style={{ fontSize:11, color:'#6b7280', marginLeft:'auto' }}><i className="ri-time-line" style={{ marginRight:3 }} />{del.eta}</span>}
                  {del.attempts>0 && <span style={{ fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:50, background:'#ffedd5', color:'#f97316', marginLeft:'auto' }}>Attempt {del.attempts}/2</span>}
                </div>
                <button style={{ width:'100%', marginTop:8, padding:'5px 10px', borderRadius:7, border:`1px solid ${del.driver.color}40`, background:del.driver.color+'15', color:del.driver.color, fontSize:11, fontFamily:'Nunito, sans-serif', fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <i className="ri-focus-3-line" />Focus on Map
                </button>
              </div>
            )
          })}

          {/* Legend */}
          <div style={{ padding:'14px', borderTop:'1px solid #e5e7eb', background:'#f8fafc' }}>
            <div style={{ fontWeight:700, fontSize:11, color:'#9ca3af', marginBottom:10 }}>MAP LEGEND</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {[
                { color:'#1B4332', label:'Bems Farms Warehouse' },
                { color:'#3b82f6', label:'Driver (En Route) — pulsing' },
                { color:'#06b6d4', label:'Driver (Awaiting Pickup)' },
                { color:'#f97316', label:'Driver (Delivery Attempted)' },
                { color:'transparent', border:'2px solid #9ca3af', label:'Customer Delivery Point' },
                { dashed:true, label:'Delivery Route' },
              ].map((item,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'#374151' }}>
                  {item.dashed
                    ? <div style={{ width:20, height:2, borderTop:'2px dashed #9ca3af', flexShrink:0 }} />
                    : <div style={{ width:12, height:12, borderRadius:'50%', background:item.color, border:item.border||'none', flexShrink:0 }} />
                  }
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ position:'relative' }}>
          <MapContainer center={[6.5244,3.3792]} zoom={12} style={{ width:'100%', height:'100%' }} zoomControl>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {flyTarget && <FlyToDriver pos={flyTarget} />}

            {/* Store marker */}
            <Marker position={STORE_POS} icon={storeIcon()}>
              <Popup>
                <div style={{ padding:'12px 14px', minWidth:200, fontFamily:'Nunito, sans-serif' }}>
                  <div style={{ fontWeight:700, marginBottom:4, fontSize:13 }}>🏪 Bems Farms Warehouse</div>
                  <div style={{ color:'#6b7280', fontSize:12 }}>Dispatch origin · All active deliveries depart here</div>
                  <div style={{ marginTop:8, fontSize:12 }}><i className="ri-map-pin-line" style={{ marginRight:4 }} />Lagos Island, Lagos</div>
                </div>
              </Popup>
            </Marker>

            {deliveries.map(del => {
              const cfg = STATUS_CFG[del.status]
              return (
                <div key={del.id}>
                  <Polyline positions={[del.driverPos, del.customerPos]} pathOptions={{ color:del.driver.color, weight:2.5, dashArray:del.status==='shipped'?'':'6,6', opacity:0.7 }} />

                  {/* Driver marker */}
                  <Marker position={del.driverPos} icon={driverIcon(del.driver, del.status)}>
                    <Popup>
                      <div style={{ minWidth:240, fontFamily:'Nunito, sans-serif' }}>
                        <div style={{ background:del.driver.color, padding:'10px 14px', color:'#fff' }}>
                          <div style={{ fontWeight:700, fontSize:13 }}>{del.driver.name}</div>
                          <div style={{ fontSize:11, opacity:0.85 }}>{del.driver.bike} · {del.driver.phone}</div>
                          <span style={{ fontSize:10, background:'rgba(255,255,255,0.25)', borderRadius:4, padding:'2px 6px', display:'inline-block', marginTop:4 }}>{cfg.label}</span>
                        </div>
                        <div style={{ padding:'10px 14px' }}>
                          <div style={{ fontSize:13, fontWeight:600, marginBottom:5 }}>{del.orderId}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
                            <i className="ri-user-line" style={{ color:'#9ca3af', fontSize:11 }} />
                            <span style={{ fontSize:12 }}>{del.customer.name}</span>
                          </div>
                          <div style={{ display:'flex', alignItems:'flex-start', gap:4, marginBottom:8 }}>
                            <i className="ri-map-pin-line" style={{ color:'#9ca3af', fontSize:11, marginTop:2 }} />
                            <span style={{ color:'#6b7280', fontSize:11 }}>{del.customer.address}</span>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontWeight:700, fontSize:13 }}>{fmt(del.total)}</span>
                            {del.eta!=='—' && <span style={{ fontSize:12, color:'#6b7280' }}><i className="ri-time-line" style={{ marginRight:3 }} />{del.eta}</span>}
                            {del.attempts>0 && <span style={{ background:'#ffedd5', color:'#f97316', fontSize:9, padding:'2px 6px', borderRadius:4 }}>Attempt {del.attempts}/2</span>}
                          </div>
                          <div style={{ color:'#6b7280', marginTop:8, fontSize:11 }}>
                            <i className="ri-shopping-bag-line" style={{ marginRight:4 }} />{del.items}
                          </div>
                          {del.status==='shipped' && (
                            <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:4, color:'#3b82f6', fontSize:12 }}>
                              <i className="ri-navigation-line" />
                              <span>GPS updating live from Driver App</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Customer/destination marker */}
                  <Marker position={del.customerPos} icon={customerIcon(del.driver.color)}>
                    <Popup>
                      <div style={{ padding:'12px 14px', minWidth:200, fontFamily:'Nunito, sans-serif' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <div style={{ width:28, height:28, borderRadius:'50%', background:del.driver.color+'20', color:del.driver.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
                            {del.customer.name.split(' ').map(n=>n[0]).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight:600, fontSize:13 }}>{del.customer.name}</div>
                            <div style={{ color:'#9ca3af', fontSize:10 }}>{del.customer.phone}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:4, marginBottom:8 }}>
                          <i className="ri-map-pin-fill" style={{ color:del.driver.color, fontSize:11, marginTop:2, flexShrink:0 }} />
                          <span style={{ fontSize:13 }}>{del.customer.address}</span>
                        </div>
                        <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                          <span style={{ fontSize:12, color:'#6b7280' }}>{del.orderId}</span>
                          <span style={{ fontSize:13, fontWeight:700 }}>{fmt(del.total)}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              )
            })}
          </MapContainer>

          {/* Floating selected overlay */}
          {selected && (
            <div style={{ position:'absolute', bottom:20, right:16, zIndex:1000, background:'#fff', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.15)', padding:'12px 16px', maxWidth:280, borderLeft:`4px solid ${selected.driver.color}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:selected.driver.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
                  {selected.driver.name.split(' ').map(n=>n[0]).join('')}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{selected.driver.name}</div>
                  <div style={{ fontSize:10, color:'#6b7280' }}>{STATUS_CFG[selected.status].label}</div>
                </div>
                <button onClick={() => { setSelected(null); setFlyTarget(null) }} style={{ width:24, height:24, borderRadius:'50%', border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#9ca3af' }}>
                  <i className="ri-close-line" style={{ fontSize:12 }} />
                </button>
              </div>
              <div style={{ fontSize:12 }}>
                <div><strong>Order:</strong> {selected.orderId}</div>
                <div><strong>Customer:</strong> {selected.customer.name}</div>
                <div style={{ color:'#6b7280' }}>{selected.customer.address}</div>
                {selected.eta!=='—' && <div style={{ marginTop:4, color:'#3b82f6' }}><i className="ri-time-line" style={{ marginRight:4 }} />{selected.eta} remaining</div>}
              </div>
              <a href={`tel:${selected.driver.phone}`} style={{ display:'block', marginTop:10, padding:'7px', borderRadius:8, border:'none', background:'#22c55e', color:'#fff', fontSize:11, fontWeight:700, textAlign:'center', textDecoration:'none' }}>
                <i className="ri-phone-line" style={{ marginRight:5 }} />Call {selected.driver.name.split(' ')[0]}
              </a>
            </div>
          )}

          {/* GPS update indicator */}
          <div style={{ position:'absolute', top:12, right:12, zIndex:999, background:'rgba(255,255,255,0.95)', borderRadius:8, padding:'6px 12px', boxShadow:'0 2px 8px rgba(0,0,0,0.12)', fontSize:11, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', display:'inline-block', animation:'pulse-ring 1.5s ease-out infinite' }} />
            GPS positions updating every 8s
          </div>
        </div>
      </div>
    </div>
  )
}
