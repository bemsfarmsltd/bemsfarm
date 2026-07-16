import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

const fmt = n => `₦${Number(n||0).toLocaleString('en-NG')}`
const ETA_OPTIONS = ['15–30 mins','30–45 mins','45–60 mins','60–90 mins','1–2 hours','2–3 hours']
const DRIVER_STATUS_COLOR = { on_delivery:'#3b82f6', active:'#22c55e', off_duty:'#6b7280', suspended:'#ef4444' }
const BLANK = { zone_name:'', delivery_fee:'', min_order_amount:'', estimated_eta:ETA_OPTIONS[1], coverage_areas:'', notes:'', is_active:true, driver_ids:[] }

const card = { background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }
const inp  = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, fontFamily:'Nunito, sans-serif', outline:'none', boxSizing:'border-box', color:'#111827', background:'#fff' }
const lbl  = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }

function ModalShell({ title, onClose, children, maxWidth=520 }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#1B4332', borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ color:'#fff', fontWeight:700, fontSize:15, fontFamily:'Syne, sans-serif' }}>{title}</span>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:20, padding:0, display:'flex', alignItems:'center' }}><i className="ri-close-line" /></button>
      </div>
      {children}
    </div>
  )
}

export default function DeliveryZones() {
  const [zones, setZones]               = useState([])
  const [allDrivers, setAllDrivers]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterActive, setFilterActive] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [selected, setSelected]         = useState(null)
  const [form, setForm]                 = useState(BLANK)
  const [isEditing, setIsEditing]       = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [menuZone, setMenuZone]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/deliveries/zones')
      setZones(res.data.zones || [])
      setAllDrivers(res.data.drivers || [])
    } catch { toast.error('Failed to load zones') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openModal = (type, zone=null) => {
    setSelected(zone); setActiveModal(type); setMenuZone(null)
    if (type==='edit' && zone) {
      const coverageArr = Array.isArray(zone.coverage_areas)?zone.coverage_areas:zone.coverage_areas?JSON.parse(zone.coverage_areas):[]
      setForm({ zone_name:zone.zone_name, delivery_fee:zone.delivery_fee, min_order_amount:zone.min_order_amount, estimated_eta:zone.estimated_eta||ETA_OPTIONS[1], coverage_areas:coverageArr.join(', '), notes:zone.notes||'', is_active:zone.is_active, driver_ids:zone.driver_ids||[] })
      setIsEditing(true)
    }
    if (type==='add') { setForm(BLANK); setIsEditing(false) }
  }
  const closeModal = () => { setActiveModal(null); setSelected(null) }
  const setField   = (f,v) => setForm(p => ({ ...p, [f]:v }))
  const toggleDriver = id => setForm(p => ({ ...p, driver_ids:p.driver_ids.includes(id)?p.driver_ids.filter(d=>d!==id):[...p.driver_ids,id] }))

  const stats = {
    total:          zones.length,
    active:         zones.filter(z=>z.is_active).length,
    inactive:       zones.filter(z=>!z.is_active).length,
    totalDeliveries:zones.reduce((s,z)=>s+parseInt(z.deliveries||0),0),
    totalRevenue:   zones.reduce((s,z)=>s+parseFloat(z.revenue||0),0),
    avgFee:         zones.length?Math.round(zones.reduce((s,z)=>s+parseFloat(z.delivery_fee||0),0)/zones.length):0,
  }

  const getCoverageArr = z => Array.isArray(z.coverage_areas)?z.coverage_areas:z.coverage_areas?JSON.parse(z.coverage_areas):[]
  const getZoneDrivers = z => allDrivers.filter(d=>(z.driver_ids||[]).includes(d.id))

  const filtered = zones.filter(z => {
    const okActive = filterActive==='all'||(filterActive==='active'?z.is_active:!z.is_active)
    const q = search.toLowerCase()
    const coverageArr = getCoverageArr(z)
    const okSearch = !q||z.zone_name.toLowerCase().includes(q)||coverageArr.some(a=>(a||'').toLowerCase().includes(q))
    return okActive && okSearch
  })

  const saveZone = async () => {
    if (!form.zone_name||!form.delivery_fee) return toast.error('Zone name and fee required')
    setSubmitting(true)
    try {
      const coverageArr = form.coverage_areas.split(',').map(a=>a.trim()).filter(Boolean)
      const payload = { ...form, coverage_areas:coverageArr }
      if (isEditing) { await api.patch(`/admin/deliveries/zones/${selected.id}`, payload); toast.success('Zone updated') }
      else           { await api.post('/admin/deliveries/zones', payload); toast.success('Zone created') }
      closeModal(); load()
    } catch (err) { toast.error(err.response?.data?.message||'Failed to save zone') }
    finally { setSubmitting(false) }
  }

  const toggleActive = async zone => {
    try {
      await api.patch(`/admin/deliveries/zones/${zone.id}`, { is_active:!zone.is_active })
      toast.success(zone.is_active?'Zone deactivated':'Zone activated')
      load()
    } catch { toast.error('Failed') }
  }

  const deleteZone = async () => {
    setSubmitting(true)
    try { await api.delete(`/admin/deliveries/zones/${selected.id}`); toast.success('Zone deleted'); closeModal(); load() }
    catch (err) { toast.error(err.response?.data?.message||'Failed to delete zone') }
    finally { setSubmitting(false) }
  }

  const FormContent = () => (
    <div style={{ padding:24, overflowY:'auto' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div style={{ gridColumn:'1 / -1' }}>
          <label style={lbl}>Zone Name <span style={{ color:'#dc2626' }}>*</span></label>
          <input placeholder="e.g. Victoria Island" value={form.zone_name} onChange={e=>setField('zone_name',e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Delivery Fee (₦) <span style={{ color:'#dc2626' }}>*</span></label>
          <input type="number" placeholder="1500" value={form.delivery_fee} onChange={e=>setField('delivery_fee',e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Minimum Order (₦)</label>
          <input type="number" placeholder="5000" value={form.min_order_amount} onChange={e=>setField('min_order_amount',e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Estimated ETA</label>
          <select value={form.estimated_eta} onChange={e=>setField('estimated_eta',e.target.value)} style={inp}>
            {ETA_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Status</label>
          <select value={form.is_active?'active':'inactive'} onChange={e=>setField('is_active',e.target.value==='active')} style={inp}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div style={{ gridColumn:'1 / -1' }}>
          <label style={lbl}>Coverage Areas <span style={{ fontWeight:400, color:'#9ca3af' }}>(comma-separated)</span></label>
          <input placeholder="VI, Onikan, Bar Beach, Eko Atlantic" value={form.coverage_areas} onChange={e=>setField('coverage_areas',e.target.value)} style={inp} />
        </div>
        <div style={{ gridColumn:'1 / -1' }}>
          <label style={lbl}>Assign Drivers</label>
          <div style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:'12px 14px' }}>
            {allDrivers.length===0
              ? <div style={{ fontSize:12, color:'#9ca3af' }}>No drivers available</div>
              : allDrivers.map(d => (
                <label key={d.id} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12, color:'#374151', marginBottom:6 }}>
                  <input type="checkbox" checked={form.driver_ids.includes(d.id)} onChange={() => toggleDriver(d.id)} style={{ accentColor:'#1B4332', width:15, height:15, cursor:'pointer' }} />
                  {d.name}
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:50, background:(DRIVER_STATUS_COLOR[d.status]||'#6b7280')+'20', color:DRIVER_STATUS_COLOR[d.status]||'#6b7280' }}>
                    {d.status?.replace('_',' ')}
                  </span>
                </label>
              ))
            }
          </div>
        </div>
        <div style={{ gridColumn:'1 / -1' }}>
          <label style={lbl}>Notes</label>
          <textarea rows={2} placeholder="Any special instructions…" value={form.notes} onChange={e=>setField('notes',e.target.value)} style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
        </div>
      </div>
      <div style={{ display:'flex', gap:10, marginTop:20 }}>
        <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Cancel</button>
        <button onClick={saveZone} disabled={!form.zone_name||!form.delivery_fee||submitting} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#1B4332', color:'#fff', cursor:(!form.zone_name||!form.delivery_fee||submitting)?'not-allowed':'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13, opacity:(!form.zone_name||!form.delivery_fee||submitting)?0.6:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <i className={isEditing?'ri-save-line':'ri-add-line'} />
          {submitting?'Saving…':isEditing?'Save Changes':'Create Zone'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <PageHeader title="Delivery Zones" subtitle="Manage coverage areas, fees and driver assignments" actions={
        <button onClick={() => openModal('add')} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:8, border:'none', background:'#1B4332', color:'#fff', cursor:'pointer', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:700 }}>
          <i className="ri-add-line" />Add Zone
        </button>
      } />

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Zones',      value:stats.total,                   color:'#6366f1', icon:'ri-map-2-line'                },
          { label:'Active',           value:stats.active,                  color:'#22c55e', icon:'ri-checkbox-circle-line'       },
          { label:'Inactive',         value:stats.inactive,                color:'#ef4444', icon:'ri-close-circle-line'          },
          { label:'Total Deliveries', value:stats.totalDeliveries,         color:'#3b82f6', icon:'ri-truck-line'                 },
          { label:'Zone Revenue',     value:fmt(stats.totalRevenue),       color:'#10b981', icon:'ri-money-dollar-circle-line'   },
          { label:'Avg Fee',          value:fmt(stats.avgFee),             color:'#f59e0b', icon:'ri-price-tag-3-line'           },
        ].map(c => (
          <div key={c.label} style={{ ...card, padding:'12px 14px', display:'flex', alignItems:'center', gap:10, borderLeft:`3px solid ${c.color}` }}>
            <div style={{ width:38, height:38, borderRadius:9, background:c.color+'20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={c.icon} style={{ color:c.color, fontSize:16 }} />
            </div>
            <div>
              <div style={{ fontSize:10, color:'#64748b' }}>{c.label}</div>
              <div style={{ fontSize:16, fontWeight:800, color:'#111827', fontFamily:'Syne, sans-serif', lineHeight:1 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ ...card, padding:'10px 14px', marginBottom:14, display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
        <div style={{ position:'relative', maxWidth:280, flex:1 }}>
          <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:14 }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zone name, area…" style={{ ...inp, paddingLeft:32 }} />
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[{key:'all',label:'All'},{key:'active',label:'Active'},{key:'inactive',label:'Inactive'}].map(t => (
            <button key={t.key} onClick={() => setFilterActive(t.key)} style={{ padding:'6px 14px', borderRadius:8, border:'none', background:filterActive===t.key?'#1B4332':'#f8fafc', color:filterActive===t.key?'#fff':'#374151', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:12 }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft:'auto', fontSize:12, color:'#6b7280' }}>{filtered.length} zone{filtered.length!==1?'s':''}</div>
      </div>

      {/* Zone Cards */}
      {loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
          {[...Array(6)].map((_,i) => (
            <div key={i} style={{ ...card, height:260, padding:20, display:'flex', flexDirection:'column', gap:14 }}>
              {[100,70,50,40].map(w => <div key={w} style={{ height:14, background:'#f0f0f0', borderRadius:4, width:`${w}%` }} />)}
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length===0 && (
        <div style={{ ...card, padding:'48px', textAlign:'center', color:'#9ca3af' }}>
          <i className="ri-map-2-line" style={{ fontSize:36, display:'block', marginBottom:8 }} />
          <div style={{ fontSize:13 }}>No zones found. <button onClick={() => openModal('add')} style={{ background:'none', border:'none', cursor:'pointer', color:'#1B4332', fontWeight:600, fontSize:13, padding:0 }}>Add the first zone →</button></div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
        {!loading && filtered.map(zone => {
          const coverageArr = getCoverageArr(zone)
          const zoneDrivers = getZoneDrivers(zone)
          const activeColor = zone.is_active?'#22c55e':'#ef4444'
          return (
            <div key={zone.id} style={{ ...card, display:'flex', flexDirection:'column', borderTop:`3px solid ${activeColor}` }}>
              <div style={{ padding:'16px', flex:1 }}>
                {/* Header */}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:'#111827' }}>{zone.zone_name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:zone.is_active?'#dcfce7':'#fee2e2', color:zone.is_active?'#16a34a':'#dc2626', display:'inline-flex', alignItems:'center', gap:4 }}>
                        <i className={zone.is_active?'ri-checkbox-circle-line':'ri-close-circle-line'} />{zone.is_active?'Active':'Inactive'}
                      </span>
                      <span style={{ fontSize:11, color:'#6b7280' }}><i className="ri-time-line" style={{ marginRight:3 }} />{zone.estimated_eta||'—'}</span>
                    </div>
                  </div>
                  {/* Dropdown menu */}
                  <div style={{ position:'relative' }}>
                    <button onClick={() => setMenuZone(menuZone===zone.id?null:zone.id)} style={{ width:30, height:30, borderRadius:7, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#374151' }}>
                      <i className="ri-more-2-line" style={{ fontSize:14 }} />
                    </button>
                    {menuZone===zone.id && (
                      <>
                        <div style={{ position:'fixed', inset:0, zIndex:49 }} onClick={() => setMenuZone(null)} />
                        <div style={{ position:'absolute', right:0, top:'100%', zIndex:50, background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.12)', minWidth:160, overflow:'hidden', marginTop:4 }}>
                          {[
                            { icon:'ri-eye-line',         label:'View Details',              action:()=>{openModal('view',zone);setMenuZone(null)} },
                            { icon:'ri-edit-line',        label:'Edit Zone',                 action:()=>{openModal('edit',zone);setMenuZone(null)} },
                            { icon:zone.is_active?'ri-close-circle-line':'ri-checkbox-circle-line', label:zone.is_active?'Deactivate':'Activate', action:()=>{toggleActive(zone);setMenuZone(null)}, color:zone.is_active?'#dc2626':'#16a34a' },
                            { icon:'ri-delete-bin-line',  label:'Delete',                    action:()=>{openModal('delete',zone);setMenuZone(null)}, color:'#dc2626' },
                          ].map(item => (
                            <button key={item.label} onClick={item.action} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px', border:'none', background:'none', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontSize:12, color:item.color||'#374151', textAlign:'left' }}>
                              <i className={item.icon} style={{ color:item.color||'#6b7280', fontSize:13 }} />{item.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Fee / Min / Deliveries */}
                <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                  {[
                    { label:'Delivery Fee', val:fmt(zone.delivery_fee),      color:'#3b82f6' },
                    { label:'Min. Order',   val:fmt(zone.min_order_amount),  color:'#6366f1' },
                    { label:'Deliveries',   val:zone.deliveries||0,          color:'#22c55e' },
                  ].map(b => (
                    <div key={b.label} style={{ flex:1, border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 6px', textAlign:'center' }}>
                      <div style={{ fontWeight:700, fontSize:14, color:b.color }}>{b.val}</div>
                      <div style={{ fontSize:10, color:'#9ca3af' }}>{b.label}</div>
                    </div>
                  ))}
                </div>

                {/* Areas */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'#9ca3af', marginBottom:5 }}>Coverage Areas</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {coverageArr.slice(0,4).map(a => (
                      <span key={a} style={{ fontSize:10, fontWeight:400, padding:'2px 8px', borderRadius:50, background:'#f1f5f9', color:'#374151', border:'1px solid #e2e8f0' }}>{a}</span>
                    ))}
                    {coverageArr.length>4 && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:50, background:'#f1f5f9', color:'#6b7280' }}>+{coverageArr.length-4} more</span>}
                    {coverageArr.length===0 && <span style={{ fontSize:11, color:'#9ca3af' }}>No areas specified</span>}
                  </div>
                </div>

                {/* Drivers */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'#9ca3af', marginBottom:5 }}>Assigned Drivers</div>
                  {zoneDrivers.length===0
                    ? <div style={{ fontSize:12, color:'#f59e0b', display:'flex', alignItems:'center', gap:4 }}><i className="ri-alert-line" />No driver assigned</div>
                    : <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {zoneDrivers.map(d => (
                          <div key={d.id} style={{ display:'flex', alignItems:'center', gap:5, border:'1px solid #e5e7eb', borderRadius:50, padding:'2px 8px', background:(DRIVER_STATUS_COLOR[d.status]||'#6b7280')+'10', fontSize:11 }}>
                            <div style={{ width:16, height:16, borderRadius:'50%', background:(DRIVER_STATUS_COLOR[d.status]||'#6b7280')+'30', color:DRIVER_STATUS_COLOR[d.status]||'#6b7280', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700 }}>
                              {d.name.split(' ').map(n=>n[0]).join('')}
                            </div>
                            {d.name.split(' ')[0]}
                          </div>
                        ))}
                      </div>
                  }
                </div>

                {zone.notes && (
                  <div style={{ padding:'8px 12px', borderRadius:6, background:'#fffbeb', borderLeft:'3px solid #f59e0b', fontSize:12, color:'#92400e' }}>
                    {zone.notes}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding:'10px 14px', borderTop:'1px solid #e5e7eb', display:'flex', gap:8 }}>
                <button onClick={() => openModal('edit',zone)} style={{ flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px', borderRadius:8, border:'none', background:'#1B4332', color:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:11 }}>
                  <i className="ri-edit-line" />Edit
                </button>
                <button onClick={() => openModal('view',zone)} style={{ flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:11 }}>
                  <i className="ri-eye-line" />Details
                </button>
                <button onClick={() => toggleActive(zone)} style={{ flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px', borderRadius:8, border:'none', background:zone.is_active?'#fee2e2':'#dcfce7', color:zone.is_active?'#dc2626':'#16a34a', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:11 }}>
                  <i className={zone.is_active?'ri-pause-line':'ri-play-line'} />{zone.is_active?'Disable':'Enable'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* MODALS */}
      {activeModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => e.target===e.currentTarget && closeModal()}>

          {/* VIEW */}
          {activeModal==='view' && selected && (() => {
            const coverageArr = getCoverageArr(selected)
            const zoneDrivers = getZoneDrivers(selected)
            return (
              <ModalShell title={selected.zone_name} onClose={closeModal} maxWidth={520}>
                <div style={{ overflowY:'auto' }}>
                  <div style={{ background:'#f0fdf4', padding:'12px 20px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:10 }}>
                    <i className="ri-time-line" style={{ color:'#16a34a' }} />
                    <span style={{ fontSize:12, color:'#16a34a' }}>{selected.estimated_eta} ETA</span>
                    <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:selected.is_active?'#dcfce7':'#fee2e2', color:selected.is_active?'#16a34a':'#dc2626' }}>
                      {selected.is_active?'Active':'Inactive'}
                    </span>
                  </div>
                  <div style={{ padding:20 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                      {[
                        { label:'Delivery Fee',  value:fmt(selected.delivery_fee),      color:'#3b82f6' },
                        { label:'Min. Order',    value:fmt(selected.min_order_amount),  color:'#6366f1' },
                        { label:'Total Orders',  value:selected.deliveries||0,          color:'#22c55e' },
                        { label:'Zone Revenue',  value:fmt(selected.revenue||0),        color:'#10b981' },
                      ].map(k => (
                        <div key={k.label} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:'12px', textAlign:'center' }}>
                          <div style={{ fontWeight:700, fontSize:16, color:k.color }}>{k.value}</div>
                          <div style={{ fontSize:11, color:'#9ca3af' }}>{k.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontWeight:700, fontSize:12, marginBottom:8 }}>Coverage Areas</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                        {coverageArr.map(a => <span key={a} style={{ fontSize:11, padding:'3px 9px', borderRadius:50, background:'#f1f5f9', color:'#374151', border:'1px solid #e2e8f0' }}>{a}</span>)}
                        {coverageArr.length===0 && <span style={{ fontSize:12, color:'#9ca3af' }}>No areas specified</span>}
                      </div>
                    </div>
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontWeight:700, fontSize:12, marginBottom:8 }}>Assigned Drivers ({zoneDrivers.length})</div>
                      {zoneDrivers.length===0
                        ? <div style={{ padding:'10px 14px', borderRadius:8, background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', fontSize:12 }}><i className="ri-alert-line" style={{ marginRight:5 }} />No driver assigned.</div>
                        : zoneDrivers.map(d => (
                          <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 12px', marginBottom:6 }}>
                            <div style={{ width:32, height:32, borderRadius:'50%', background:(DRIVER_STATUS_COLOR[d.status]||'#6b7280')+'20', color:DRIVER_STATUS_COLOR[d.status]||'#6b7280', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                              {d.name.split(' ').map(n=>n[0]).join('')}
                            </div>
                            <div style={{ flex:1, fontWeight:600, fontSize:13 }}>{d.name}</div>
                            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:(DRIVER_STATUS_COLOR[d.status]||'#6b7280')+'20', color:DRIVER_STATUS_COLOR[d.status]||'#6b7280' }}>
                              {d.status?.replace('_',' ')}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                    {selected.notes && (
                      <div style={{ padding:'10px 14px', borderRadius:8, background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', fontSize:12, marginBottom:16 }}>
                        <i className="ri-information-line" style={{ marginRight:5 }} />{selected.notes}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={() => { closeModal(); setTimeout(()=>openModal('edit',selected),100) }} style={{ flex:1, padding:'8px', borderRadius:8, border:'none', background:'#1B4332', color:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:12, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                        <i className="ri-edit-line" />Edit Zone
                      </button>
                      <button onClick={() => { toggleActive(selected); closeModal() }} style={{ flex:1, padding:'8px', borderRadius:8, border:'none', background:selected.is_active?'#fee2e2':'#dcfce7', color:selected.is_active?'#dc2626':'#16a34a', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:12 }}>
                        {selected.is_active?'Deactivate':'Activate'}
                      </button>
                      <button onClick={closeModal} style={{ padding:'8px 14px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:12 }}>Close</button>
                    </div>
                  </div>
                </div>
              </ModalShell>
            )
          })()}

          {/* ADD / EDIT */}
          {(activeModal==='add'||activeModal==='edit') && (
            <ModalShell title={isEditing?`Edit: ${selected?.zone_name}`:'Add New Zone'} onClose={closeModal} maxWidth={560}>
              <FormContent />
            </ModalShell>
          )}

          {/* DELETE */}
          {activeModal==='delete' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:400 }}>
              <div style={{ padding:28, textAlign:'center' }}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                  <i className="ri-delete-bin-line" style={{ fontSize:24, color:'#dc2626' }} />
                </div>
                <div style={{ fontWeight:700, fontSize:17, marginBottom:6 }}>Delete Zone?</div>
                <div style={{ fontSize:13, color:'#6b7280', marginBottom:24 }}>
                  Delete <strong>{selected.zone_name}</strong>? This cannot be undone.
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Cancel</button>
                  <button onClick={deleteZone} disabled={submitting} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13 }}>
                    {submitting?'Deleting…':'Delete Zone'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
