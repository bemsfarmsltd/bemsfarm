import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STORE_POS = [6.4553, 3.3862] // Bems Farms HQ (Lagos Island)

const STATUS_CFG = {
  assigned:           { label:'Awaiting Pickup', color:'#06b6d4', bg:'#cffafe', pulse:false },
  shipped:            { label:'En Route',        color:'#3b82f6', bg:'#dbeafe', pulse:true  },
  delivery_attempted: { label:'Attempted',       color:'#f97316', bg:'#ffedd5', pulse:false },
}
const fmt = n => `₦${Number(n).toLocaleString()}`

function driverIcon(driver, status) {
  const cfg   = STATUS_CFG[status] || { label: status || 'Pending', color:'var(--text-light)', bg:'var(--border)', pulse:false }
  const pulse = cfg.pulse ? `<span style="position:absolute;inset:-6px;border-radius:50%;border:2.5px solid ${driver.color};animation:pulse-ring 1.5s ease-out infinite;opacity:0.8;background:rgba(59,130,246,0.15)"></span>` : ''
  return L.divIcon({
    className:'', iconSize:[36,36], iconAnchor:[18,18], popupAnchor:[0,-20],
    html:`<div style="position:relative;width:36px;height:36px;">${pulse}<div style="width:36px;height:36px;border-radius:50%;background:${driver.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.35);border:2px solid #fff;position:relative;z-index:1;">${driver.initials}</div></div>`,
  })
}

function customerIcon(color) {
  return L.divIcon({
    className:'', iconSize:[30,30], iconAnchor:[15,15], popupAnchor:[0,-16],
    html:`<div style="width:30px;height:30px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff;"><i class="ri-home-4-fill" style="font-size:14px;color:#fff;"></i></div>`
  })
}

function storeIcon() {
  return L.divIcon({
    className:'', iconSize:[44,44], iconAnchor:[22,22], popupAnchor:[0,-24],
    html:`<div style="width:44px;height:44px;border-radius:10px;background:#1B4332;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.4);border:2px solid #fff;flex-direction:column;gap:1px;"><i class="ri-store-2-fill" style="font-size:18px;"></i><div style="font-size:7px;font-weight:700;letter-spacing:0.5px;">BEMS</div></div>`,
  })
}

function userLocationIcon() {
  return L.divIcon({
    className:'', iconSize:[24,24], iconAnchor:[12,12],
    html:`<div style="position:relative;width:24px;height:24px;"><span style="position:absolute;inset:-6px;border-radius:50%;border:2.5px solid #3b82f6;animation:pulse-ring 1.5s ease-out infinite;opacity:0.8;background:rgba(59,130,246,0.15)"></span><div style="width:12px;height:12px;border-radius:50%;background:#3b82f6;border:2.5px solid #fff;box-shadow:0 0 8px rgba(0,0,0,0.3);position:absolute;top:6px;left:6px;z-index:2;"></div></div>`
  })
}

function FlyToDriver({ pos }) {
  const map = useMap()
  useEffect(() => { if (pos) map.flyTo(pos, 14, { duration:1.2 }) }, [pos, map])
  return null
}

export default function DeliveryMap() {
  const [selected, setSelected]     = useState(null)
  const [flyTarget, setFlyTarget]   = useState(null)
  const [userPos, setUserPos]       = useState(null)

  const [dbDeliveries, setDbDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  // Track browser geolocation of the user
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserPos([pos.coords.latitude, pos.coords.longitude])
        },
        err => console.warn('Geolocation user tracking disabled:', err),
        { enableHighAccuracy: true }
      )
    }
  }, [])

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const res = await api.get('/admin/deliveries/active')
        setDbDeliveries(res.data.deliveries || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchActive()
    const id = setInterval(fetchActive, 8000)
    return () => clearInterval(id)
  }, [])

  const deliveries = dbDeliveries.map((d, i) => {
    const customerPos = d.driver_lat ? [Number(d.driver_lat), Number(d.driver_lng)] : [STORE_POS[0] + 0.015, STORE_POS[1] + 0.015]
    const driverPos = d.driver_lat ? [Number(d.driver_lat), Number(d.driver_lng)] : STORE_POS
    const colors = ['#3b82f6', '#06b6d4', '#f97316', '#8b5cf6']
    const color = colors[i % colors.length]
    const initials = (d.driver_name || '?').split(' ').map(n=>n[0]).join('').slice(0,2)
    return {
      id: d.id,
      status: d.status === 'out_for_delivery' ? 'shipped' : d.status,
      orderId: d.delivery_ref || d.order_id,
      driverPos,
      customerPos,
      total: d.order_total || 0,
      eta: d.eta_minutes ? `~${d.eta_minutes} min` : '—',
      attempts: d.attempts || 0,
      items: d.items ? d.items.length + ' items' : 'Items',
      driver: {
        name: d.driver_name || 'Unassigned',
        bike: d.vehicle_plate || 'Bike',
        phone: d.driver_phone || '--',
        color,
        initials
      },
      customer: {
        name: d.customer_name || 'Customer',
        address: d.delivery_address || 'Address',
        phone: d.customer_phone || '--'
      }
    }
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
          <div style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:18, color:'var(--text-primary)' }}>Live Delivery Map</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
            <span style={{ color:'var(--text-light)' }}>Deliveries</span>
            <i className="ri-arrow-right-s-line" style={{ margin:'0 4px', color:'var(--border-strong)' }} />
            <span style={{ color:'var(--text-secondary)', fontWeight:600 }}>Live Map</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:50, background:'#dcfce7', color:'#16a34a' }}>
            <i className="ri-checkbox-blank-circle-fill" style={{ fontSize:7 }} />Live
          </span>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{deliveries.length} active deliveries</span>
        </div>
      </div>

      {/* Map + Side Panel */}
      <div className="grid-sidebar-split" style={{ flex:1, display:'grid', gridTemplateColumns:'320px 1fr', borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', minHeight:0 }}>

        {/* Side panel */}
        <div style={{ overflowY:'auto', background:'#fcfcfc', borderRight:'1px solid var(--border)' }}>
          <div style={{ padding:'16px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, background:'var(--bg-card)' }}>
            <i className="ri-list-check" style={{ color:'var(--text-light)', fontSize:16 }} />
            <span style={{ fontWeight:700, fontSize:14, color:'var(--text-secondary)' }}>Active Deliveries</span>
            <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, width:20, height:20, borderRadius:'50%', background:'var(--orange-accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {deliveries.length}
            </span>
          </div>

          <div style={{ padding:'10px' }}>
            {!loading && deliveries.length===0 && (
              <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--text-light)', fontSize:12 }}>
                <i className="ri-truck-line" style={{ fontSize:28, display:'block', marginBottom:8 }} />
                No active deliveries right now
              </div>
            )}
            {deliveries.map(del => {
              const cfg      = STATUS_CFG[del.status] || { label: del.status || 'Pending', color:'var(--text-light)', bg:'var(--border)', pulse:false }
              const isActive = selected?.id===del.id
              return (
                <div key={del.id} onClick={() => handleSelect(del)} style={{ background:'var(--bg-card)', border:`1px solid ${isActive?del.driver.color:'var(--border)'}`, borderRadius:10, padding:'14px', marginBottom:10, cursor:'pointer', boxShadow:isActive?'0 4px 12px rgba(0,0,0,0.06)':'0 1px 3px rgba(0,0,0,0.02)', borderLeft:`4.5px solid ${del.driver.color}`, transition:'all 0.2s' }}>
                  {/* Top row */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:del.driver.color+'20', color:del.driver.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                      {del.driver.initials}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:12, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{del.driver.name}</div>
                      <div style={{ fontSize:10, color:'var(--text-light)' }}>{del.driver.bike}</div>
                    </div>
                    <span style={{ fontSize:9, fontWeight:700, padding:'2.5px 8px', borderRadius:50, background:cfg.bg, color:cfg.color, flexShrink:0 }}>{cfg.label}</span>
                  </div>
                  {/* Customer */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:4 }}>
                    <i className="ri-user-line" style={{ color:'var(--text-light)', fontSize:12, marginTop:1, flexShrink:0 }} />
                    <span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>{del.customer.name}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:8 }}>
                    <i className="ri-map-pin-line" style={{ color:'var(--text-light)', fontSize:12, marginTop:1, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.3 }}>{del.customer.address}</span>
                  </div>
                  {/* Footer info row */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid var(--border)', paddingTop:8 }}>
                    <span style={{ fontWeight:700, fontSize:13, color:'#ef4444' }}>{fmt(del.total)}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {del.status === 'delivery_attempted' && (
                        <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:50, background:'#ffeedd', color:'#f97316' }}>
                          Attempt 1/2
                        </span>
                      )}
                      {del.eta && del.eta !== '—' && (
                        <span style={{ fontSize:11, color:'var(--text-muted)', display:'inline-flex', alignItems:'center', gap:3 }}>
                          <i className="ri-time-line" /> {del.eta}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleSelect(del); }} style={{ width:'100%', marginTop:10, padding:'6px 12px', borderRadius:8, border:'none', background:'#eff6ff', color:'#2563eb', fontSize:11, fontFamily:'Nunito, sans-serif', fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                    <i className="ri-focus-target" /> Focus on Map
                  </button>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ padding:'14px', borderTop:'1px solid var(--border)', background:'var(--bg-subtle)' }}>
            <div style={{ fontWeight:700, fontSize:11, color:'var(--text-light)', marginBottom:10 }}>MAP LEGEND</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {[
                { color:'#1B4332', label:'Bems Farms HQ' },
                { color:'#3b82f6', label:'Driver (En Route)' },
                { color:'#06b6d4', label:'Driver (Awaiting Pickup)' },
                { color:'#f97316', label:'Driver (Attempted)' },
                { color:'#8b5cf6', label:'Driver (Unassigned/Other)' },
                { color:'dashed', label:'Delivery Path' },
              ].map((item,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--text-secondary)' }}>
                  {item.color === 'dashed'
                    ? <div style={{ width:16, height:2, borderTop:'2px dashed #9ca3af', flexShrink:0 }} />
                    : <div style={{ width:12, height:12, borderRadius:'50%', background:item.color, flexShrink:0, border:'1.5px solid #fff', boxShadow:'0 1px 3px rgba(0,0,0,0.15)' }} />
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
                  <div style={{ fontWeight:700, marginBottom:4, fontSize:13 }}>🏪 Bems Farms Headquarters</div>
                  <div style={{ color:'var(--text-muted)', fontSize:12 }}>Dispatch Warehouse · Deliveries depart here</div>
                  <div style={{ marginTop:8, fontSize:12 }}><i className="ri-map-pin-line" style={{ marginRight:4 }} />Lagos Island, Lagos</div>
                </div>
              </Popup>
            </Marker>

            {/* User Position dot */}
            {userPos && (
              <Marker position={userPos} icon={userLocationIcon()}>
                <Popup>
                  <div style={{ fontFamily:'Nunito, sans-serif', padding:5 }}>
                    <strong>Your Location (Admin)</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {deliveries.map(del => {
              const cfg = STATUS_CFG[del.status] || { label: del.status || 'Pending', color:'var(--text-light)', bg:'var(--border)', pulse:false }
              return (
                <div key={del.id}>
                  <Polyline positions={[STORE_POS, del.driverPos, del.customerPos]} pathOptions={{ color:del.driver.color, weight:2.5, dashArray:'6,6', opacity:0.8 }} />

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
                            <i className="ri-user-line" style={{ color:'var(--text-light)', fontSize:11 }} />
                            <span style={{ fontSize:12 }}>{del.customer.name}</span>
                          </div>
                          <div style={{ display:'flex', alignItems:'flex-start', gap:4, marginBottom:8 }}>
                            <i className="ri-map-pin-line" style={{ color:'var(--text-light)', fontSize:11, marginTop:2 }} />
                            <span style={{ color:'var(--text-muted)', fontSize:11 }}>{del.customer.address}</span>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontWeight:700, fontSize:13 }}>{fmt(del.total)}</span>
                            {del.eta && <span style={{ fontSize:12, color:'var(--text-muted)' }}><i className="ri-time-line" style={{ marginRight:3 }} />{del.eta}</span>}
                            {del.attempts>0 && <span style={{ background:'#ffedd5', color:'#f97316', fontSize:9, padding:'2px 6px', borderRadius:4 }}>Attempt {del.attempts}/2</span>}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Customer marker */}
                  <Marker position={del.customerPos} icon={customerIcon(del.driver.color)}>
                    <Popup>
                      <div style={{ padding:'12px 14px', minWidth:200, fontFamily:'Nunito, sans-serif' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <div style={{ width:28, height:28, borderRadius:'50%', background:del.driver.color+'20', color:del.driver.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
                            {del.customer.name.split(' ').map(n=>n[0]).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight:600, fontSize:13 }}>{del.customer.name}</div>
                            <div style={{ color:'var(--text-light)', fontSize:10 }}>{del.customer.phone}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:4, marginBottom:8 }}>
                          <i className="ri-map-pin-fill" style={{ color:del.driver.color, fontSize:11, marginTop:2, flexShrink:0 }} />
                          <span style={{ fontSize:13 }}>{del.customer.address}</span>
                        </div>
                        <div style={{ borderTop:'1px solid var(--border)', paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{del.orderId}</span>
                          <span style={{ fontSize:13, fontWeight:700 }}>{fmt(del.total)}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              )
            })}
          </MapContainer>

          {/* selected driver floating detail card */}
          {selected && (
            <div style={{ position:'absolute', bottom:20, right:16, zIndex:1000, background:'var(--bg-card)', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.15)', padding:'12px 16px', maxWidth:280, borderLeft:`4px solid ${selected.driver.color}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:selected.driver.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
                  {selected.driver.initials}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{selected.driver.name}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>{(STATUS_CFG[selected.status] || {label: selected.status || 'Pending'}).label}</div>
                </div>
                <button onClick={() => { setSelected(null); setFlyTarget(null) }} style={{ width:24, height:24, borderRadius:'50%', border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-light)' }}>
                  <i className="ri-close-line" style={{ fontSize:12 }} />
                </button>
              </div>
              <div style={{ fontSize:12 }}>
                <div><strong>Order:</strong> {selected.orderId}</div>
                <div><strong>Customer:</strong> {selected.customer.name}</div>
                <div style={{ color:'var(--text-muted)' }}>{selected.customer.address}</div>
                {selected.eta && selected.eta!=='—' && <div style={{ marginTop:4, color:'#3b82f6' }}><i className="ri-time-line" style={{ marginRight:4 }} />{selected.eta} remaining</div>}
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
