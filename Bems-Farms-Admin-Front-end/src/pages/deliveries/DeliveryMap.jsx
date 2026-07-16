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

const STORE_POS = [6.4553, 3.3862]

const STATUS_CFG = {
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
