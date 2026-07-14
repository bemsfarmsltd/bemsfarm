import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

const STATUS_CFG = {
  active:      { label:'Active',      color:'#22c55e', bg:'#dcfce7', icon:'ri-checkbox-circle-line' },
  on_delivery: { label:'On Delivery', color:'#3b82f6', bg:'#dbeafe', icon:'ri-truck-line'           },
  off_duty:    { label:'Off Duty',    color:'#6b7280', bg:'#f3f4f6', icon:'ri-moon-line'             },
  suspended:   { label:'Suspended',  color:'#ef4444', bg:'#fee2e2', icon:'ri-forbid-line'           },
}
const VEHICLE_TYPES = ['Motorcycle','Bicycle','Car','Van']
const fmt = n => `₦${Number(n||0).toLocaleString('en-NG')}`

const card = { background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }
const inp  = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, fontFamily:'Nunito, sans-serif', outline:'none', boxSizing:'border-box', color:'#111827', background:'#fff' }
const lbl  = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }

const TH = ({ children }) => <th style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>{children}</th>
const TD = ({ children, style }) => <td style={{ padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f9fafb', verticalAlign:'middle', ...style }}>{children}</td>

function StarRating({ rating }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <i key={i} className={i<=Math.round(rating||0)?'ri-star-fill':'ri-star-line'} style={{ fontSize:12, color:i<=Math.round(rating||0)?'#d97706':'#d1d5db' }} />
      ))}
      <span style={{ marginLeft:4, fontSize:12, fontWeight:600 }}>{Number(rating||0).toFixed(1)}</span>
    </span>
  )
}

function ModalShell({ title, onClose, children, maxWidth=460 }) {
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

const BLANK = { name:'', phone:'', email:'', vehicle_type:'Motorcycle', vehicle_plate:'', zone_id:'', notes:'' }

export default function DriversManagement() {
  const [drivers, setDrivers]           = useState([])
  const [zones, setZones]               = useState([])
  const [stats, setStats]               = useState({})
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [selected, setSelected]         = useState(null)
  const [form, setForm]                 = useState(BLANK)
  const [suspendNote, setSuspendNote]   = useState('')
  const [isEditing, setIsEditing]       = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [notifyForm, setNotifyForm]           = useState({ title:'', message:'', target:'all', selectedDriverIds:[] })
  const [notifySubmitting, setNotifySubmitting] = useState(false)
  const [notifyHistory, setNotifyHistory]       = useState([])
  const [notifyHistoryLoading, setNotifyHistoryLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [driversRes, zonesRes] = await Promise.all([
        api.get('/admin/deliveries/drivers', { params:{ search, status: filterStatus==='all'?'':filterStatus } }),
        api.get('/admin/delivery-zones'),
      ])
      setDrivers(driversRes.data.drivers || [])
      setStats(driversRes.data.stats || {})
      setZones(zonesRes.data.zones || [])
    } catch { toast.error('Failed to load drivers') }
    finally { setLoading(false) }
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (activeModal === 'notify') loadNotifyHistory() }, [activeModal])

  const openModal = (type, driver=null) => {
    setSelected(driver); setActiveModal(type); setSuspendNote('')
    if (type==='add')  { setForm(BLANK); setIsEditing(false) }
    if (type==='edit' && driver) {
      setForm({ name:driver.name, phone:driver.phone, email:driver.email||'', vehicle_type:driver.vehicle_type||'Motorcycle', vehicle_plate:driver.vehicle_plate||'', zone_id:driver.zone_id||'', notes:driver.notes||'' })
      setIsEditing(true)
    }
  }
  const closeModal = () => { setActiveModal(null); setSelected(null) }
  const setField   = (f,v) => setForm(p => ({ ...p, [f]:v }))

  const saveDriver = async () => {
    if (!form.name||!form.phone) return toast.error('Name and phone required')
    setSubmitting(true)
    try {
      if (isEditing) { await api.patch(`/admin/deliveries/drivers/${selected.id}`, form); toast.success('Driver updated') }
      else           { await api.post('/admin/deliveries/drivers', form); toast.success('Driver added') }
      closeModal(); load()
    } catch (err) { toast.error(err.response?.data?.message||'Failed to save driver') }
    finally { setSubmitting(false) }
  }

  const suspendDriver = async () => {
    if (!suspendNote) return toast.error('Suspension reason required')
    setSubmitting(true)
    try { await api.patch(`/admin/deliveries/drivers/${selected.id}/suspend`, { reason:suspendNote }); toast.success('Driver suspended'); closeModal(); load() }
    catch (err) { toast.error(err.response?.data?.message||'Failed') }
    finally { setSubmitting(false) }
  }

  const activateDriver = async driver => {
    try { await api.patch(`/admin/deliveries/drivers/${driver.id}/activate`); toast.success('Driver reinstated'); load() }
    catch { toast.error('Failed') }
  }

  const loadNotifyHistory = async () => {
    setNotifyHistoryLoading(true)
    try {
      const res = await api.get('/admin/deliveries/notifications')
      setNotifyHistory(res.data.notifications || [])
    } catch { /* silent */ }
    finally { setNotifyHistoryLoading(false) }
  }

  const submitNotification = async () => {
    if (!notifyForm.title.trim()) { toast.error('Notification title is required'); return }
    if (!notifyForm.message.trim()) { toast.error('Notification message is required'); return }
    if (notifyForm.target === 'selected' && !notifyForm.selectedDriverIds.length) { toast.error('Please select at least one driver'); return }
    setNotifySubmitting(true)
    try {
      await api.post('/admin/deliveries/notifications', {
        title: notifyForm.title,
        message: notifyForm.message,
        target: notifyForm.target,
        driver_ids: notifyForm.target === 'selected' ? notifyForm.selectedDriverIds : [],
      })
      toast.success('Notification sent successfully!')
      setNotifyForm({ title:'', message:'', target:'all', selectedDriverIds:[] })
      setActiveModal(null)
      loadNotifyHistory()
    } catch { toast.error('Failed to send notification') }
    finally { setNotifySubmitting(false) }
  }

  const filtered = drivers.filter(d => {
    const okStatus = filterStatus==='all' || d.status===filterStatus
    const q = search.toLowerCase()
    const okSearch = !q||d.name.toLowerCase().includes(q)||d.phone.includes(q)||(d.zone||'').toLowerCase().includes(q)
    return okStatus && okSearch
  })

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <PageHeader title="Drivers Management" subtitle="Manage your delivery team" actions={
        <button onClick={() => setActiveModal('notify')} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'none', background:'#F57C00', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:13, fontFamily:'Nunito, sans-serif' }}>
          <i className="ri-notification-3-line" style={{ fontSize:15 }}/>Notify Drivers
        </button>
      } />

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Drivers',    value:parseInt(stats.total||0),       color:'#6366f1', icon:'ri-group-line',           filter:'all'         },
          { label:'On Delivery',      value:parseInt(stats.on_delivery||0), color:'#3b82f6', icon:'ri-truck-line',           filter:'on_delivery' },
          { label:'Active / Standby', value:parseInt(stats.active||0),      color:'#22c55e', icon:'ri-checkbox-circle-line', filter:'active'      },
          { label:'Off Duty',         value:parseInt(stats.off_duty||0),    color:'#6b7280', icon:'ri-moon-line',            filter:'off_duty'    },
          { label:'Suspended',        value:parseInt(stats.suspended||0),   color:'#ef4444', icon:'ri-forbid-line',          filter:'suspended'   },
        ].map(c => (
          <div key={c.label} onClick={() => setFilterStatus(c.filter)} style={{ ...card, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', borderLeft:`3px solid ${c.color}` }}>
            <div style={{ width:40, height:40, borderRadius:9, background:c.color+'20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={c.icon} style={{ color:c.color, fontSize:18 }} />
            </div>
            <div>
              <div style={{ fontSize:11, color:'#64748b' }}>{c.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:'#111827', fontFamily:'Syne, sans-serif', lineHeight:1 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ ...card, marginBottom:16 }}>
        <div style={{ padding:'10px 14px', display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
          <div style={{ position:'relative', maxWidth:280, flex:1 }}>
            <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:14 }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, phone, zone…" style={{ ...inp, paddingLeft:32 }} />
          </div>
          {filterStatus!=='all' && (
            <button onClick={() => setFilterStatus('all')} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'7px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:12, fontFamily:'Nunito, sans-serif', color:'#374151' }}>
              <i className="ri-close-line" />Clear
            </button>
          )}
          <div style={{ marginLeft:'auto', fontSize:12, color:'#6b7280' }}>{filtered.length} driver{filtered.length!==1?'s':''}</div>
        </div>
        <div style={{ borderTop:'1px solid #e5e7eb', overflowX:'auto' }}>
          <div style={{ display:'flex', whiteSpace:'nowrap' }}>
            {[{ key:'all', label:'All Drivers' }, ...Object.entries(STATUS_CFG).map(([k,v])=>({ key:k, label:v.label }))].map(t => (
              <button key={t.key} onClick={() => setFilterStatus(t.key)} style={{ padding:'10px 16px', border:'none', borderBottom:filterStatus===t.key?'2px solid #1B4332':'2px solid transparent', background:'transparent', color:filterStatus===t.key?'#1B4332':'#6b7280', fontWeight:filterStatus===t.key?700:400, fontSize:12, cursor:'pointer', fontFamily:'Nunito, sans-serif', whiteSpace:'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Driver','Contact','Zone','Vehicle','Deliveries','Rating','Success','Earnings','Status','Actions'].map(h => <TH key={h}>{h}</TH>)}</tr>
            </thead>
            <tbody>
              {loading && [...Array(5)].map((_,i) => (
                <tr key={i}>{[...Array(10)].map((_,j) => <TD key={j}><div style={{ height:14, background:'#f0f0f0', borderRadius:4 }} /></TD>)}</tr>
              ))}
              {!loading && filtered.length===0 && (
                <tr><td colSpan={10} style={{ textAlign:'center', color:'#9ca3af', padding:'48px 0', fontSize:13 }}>No drivers found</td></tr>
              )}
              {!loading && filtered.map(driver => {
                const cfg = STATUS_CFG[driver.status] || STATUS_CFG.off_duty
                const successRate = driver.total_deliveries>0 ? Math.round((parseInt(driver.total_deliveries)/Math.max(parseInt(driver.total_deliveries),1))*100) : 0
                return (
                  <tr key={driver.id}>
                    <TD>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:38, height:38, borderRadius:'50%', background:cfg.color+'20', color:cfg.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {driver.name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight:600 }}>{driver.name}</div>
                          <div style={{ fontSize:11, color:'#9ca3af' }}>Since {driver.joined_at?new Date(driver.joined_at).toLocaleDateString('en-NG'):'—'}</div>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <div style={{ fontSize:13 }}>{driver.phone}</div>
                      <div style={{ fontSize:11, color:'#9ca3af' }}>{driver.email||'—'}</div>
                    </TD>
                    <TD style={{ fontSize:13 }}>{driver.zone||'—'}</TD>
                    <TD>
                      <div style={{ fontSize:13 }}>{driver.vehicle_type||'—'}</div>
                      <div style={{ fontSize:11, color:'#9ca3af' }}>{driver.vehicle_plate||'—'}</div>
                    </TD>
                    <TD style={{ fontWeight:600 }}>{driver.total_deliveries||0}</TD>
                    <TD><StarRating rating={driver.rating||0} /></TD>
                    <TD style={{ fontWeight:600, color:successRate>=95?'#22c55e':successRate>=85?'#f59e0b':'#ef4444' }}>{successRate}%</TD>
                    <TD style={{ fontWeight:600 }}>{fmt(driver.earnings||0)}</TD>
                    <TD>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:50, background:cfg.bg, color:cfg.color }}>
                        <i className={cfg.icon} />{cfg.label}
                      </span>
                      {driver.current_order && <div style={{ fontSize:10, color:'#9ca3af' }}>{driver.current_order}</div>}
                    </TD>
                    <TD>
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={() => openModal('profile',driver)} title="Profile" style={{ width:30, height:30, borderRadius:7, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#374151' }}>
                          <i className="ri-eye-line" style={{ fontSize:13 }} />
                        </button>
                        <button onClick={() => openModal('edit',driver)} title="Edit" style={{ width:30, height:30, borderRadius:7, border:'none', background:'#eff6ff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#3b82f6' }}>
                          <i className="ri-edit-line" style={{ fontSize:13 }} />
                        </button>
                        {driver.status==='suspended'
                          ? <button onClick={() => activateDriver(driver)} title="Reinstate" style={{ width:30, height:30, borderRadius:7, border:'none', background:'#dcfce7', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a' }}><i className="ri-checkbox-circle-line" style={{ fontSize:13 }} /></button>
                          : driver.status!=='on_delivery' && <button onClick={() => openModal('suspend',driver)} title="Suspend" style={{ width:30, height:30, borderRadius:7, border:'none', background:'#fee2e2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#dc2626' }}><i className="ri-forbid-line" style={{ fontSize:13 }} /></button>
                        }
                      </div>
                    </TD>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NOTIFY DRIVERS MODAL */}
      {activeModal === 'notify' && (
        <>
          <div onClick={() => setActiveModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000 }} />
          <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1001, padding:20 }}>
            <ModalShell title="Notify Drivers" onClose={() => setActiveModal(null)} maxWidth={580}>
              <div style={{ padding:20, overflowY:'auto', maxHeight:'75vh' }}>
                {/* Target Selection */}
                <div style={{ marginBottom:16 }}>
                  <label style={lbl}>Send To</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {['all','selected'].map(t => (
                      <button key={t} onClick={() => setNotifyForm(f => ({...f, target:t, selectedDriverIds:[]}))}
                        style={{ flex:1, padding:'8px 12px', borderRadius:8, border:`2px solid ${notifyForm.target===t?'#1B4332':'#e5e7eb'}`, background:notifyForm.target===t?'#1B4332':'transparent', color:notifyForm.target===t?'#fff':'#374151', cursor:'pointer', fontWeight:700, fontSize:12, fontFamily:'Nunito,sans-serif' }}>
                        <i className={t==='all'?'ri-broadcast-line':'ri-user-search-line'} style={{ marginRight:5 }}/>
                        {t==='all'?'All Drivers':'Selected Drivers'}
                      </button>
                    ))}
                  </div>
                </div>

                {notifyForm.target === 'selected' && (
                  <div style={{ marginBottom:16, maxHeight:180, overflowY:'auto', border:'1.5px solid #e5e7eb', borderRadius:8, padding:8 }}>
                    {drivers.filter(d => d.status !== 'suspended').map(d => (
                      <label key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 8px', cursor:'pointer', borderRadius:6, background:notifyForm.selectedDriverIds.includes(d.id)?'#f0fdf4':'transparent' }}>
                        <input type="checkbox" checked={notifyForm.selectedDriverIds.includes(d.id)}
                          onChange={e => setNotifyForm(f => ({ ...f, selectedDriverIds: e.target.checked ? [...f.selectedDriverIds, d.id] : f.selectedDriverIds.filter(id => id !== d.id) }))}
                          style={{ width:16, height:16, accentColor:'#1B4332' }}/>
                        <span style={{ fontSize:13, fontWeight:600 }}>{d.name}</span>
                        <span style={{ fontSize:11, color:STATUS_CFG[d.status]?.color||'#6b7280', background:STATUS_CFG[d.status]?.bg||'#f3f4f6', padding:'1px 7px', borderRadius:50 }}>{STATUS_CFG[d.status]?.label||d.status}</span>
                        {d.phone && <span style={{ fontSize:11, color:'#6b7280', marginLeft:'auto' }}>{d.phone}</span>}
                      </label>
                    ))}
                    {!drivers.length && <div style={{ textAlign:'center', color:'#6b7280', fontSize:12, padding:12 }}>No drivers available</div>}
                  </div>
                )}

                <div style={{ marginBottom:14 }}>
                  <label style={lbl}>Notification Title *</label>
                  <input style={inp} placeholder="e.g. New delivery area available — Lekki Phase 2" value={notifyForm.title} onChange={e => setNotifyForm(f => ({...f,title:e.target.value}))}/>
                </div>
                <div style={{ marginBottom:20 }}>
                  <label style={lbl}>Message *</label>
                  <textarea style={{ ...inp, resize:'vertical', minHeight:90 }} rows={4} placeholder="Write your announcement or instructions for drivers..." value={notifyForm.message} onChange={e => setNotifyForm(f => ({...f,message:e.target.value}))}/>
                </div>

                <div style={{ display:'flex', gap:10, marginBottom:24 }}>
                  <button onClick={() => setActiveModal(null)} style={{ flex:1, padding:'9px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'Nunito,sans-serif', color:'#374151' }}>Cancel</button>
                  <button onClick={submitNotification} disabled={notifySubmitting} style={{ flex:2, padding:'9px', borderRadius:8, border:'none', background:'#F57C00', color:'#fff', cursor:notifySubmitting?'not-allowed':'pointer', fontSize:13, fontWeight:700, fontFamily:'Nunito,sans-serif', opacity:notifySubmitting?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    {notifySubmitting ? <><i className="ri-loader-4-line"/>Sending…</> : <><i className="ri-send-plane-line"/>Send Notification</>}
                  </button>
                </div>

                {/* Notification History */}
                <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>Recent Notifications</div>
                  {notifyHistoryLoading ? (
                    <div style={{ textAlign:'center', color:'#6b7280', fontSize:12, padding:12 }}>Loading…</div>
                  ) : notifyHistory.length === 0 ? (
                    <div style={{ textAlign:'center', color:'#6b7280', fontSize:12, padding:12 }}>No notifications sent yet</div>
                  ) : notifyHistory.slice(0,8).map(n => (
                    <div key={n.id} style={{ padding:'8px 10px', borderRadius:6, background:'#f8fafc', border:'1px solid #f1f5f9', marginBottom:6 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'#111827' }}>{n.title}</div>
                          <div style={{ fontSize:11, color:'#6b7280', marginTop:2, lineHeight:1.4 }}>{n.message?.slice(0,80)}{n.message?.length>80?'…':''}</div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:10, color:'#6b7280' }}>{new Date(n.created_at).toLocaleString('en-NG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                          <div style={{ fontSize:10, fontWeight:600, color:'#1B4332', marginTop:2 }}>{n.target==='all'?'All Drivers':`${n.driver_ids?.length||0} Driver(s)`}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ModalShell>
          </div>
        </>
      )}

      {/* MODALS */}
      {activeModal && activeModal !== 'notify' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => e.target===e.currentTarget && closeModal()}>

          {/* PROFILE */}
          {activeModal==='profile' && selected && (() => {
            const cfg = STATUS_CFG[selected.status] || STATUS_CFG.off_duty
            return (
              <ModalShell title={selected.name} onClose={closeModal} maxWidth={560}>
                <div style={{ overflowY:'auto' }}>
                  <div style={{ padding:'16px 20px', background:'#f8fafc', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:56, height:56, borderRadius:'50%', background:cfg.color+'30', border:`2px solid ${cfg.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:cfg.color, flexShrink:0 }}>
                      {selected.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:15 }}>{selected.name}</div>
                      <div style={{ fontSize:12, color:'#6b7280' }}>{selected.phone} · {selected.zone||'No zone'}</div>
                      <div style={{ fontSize:12, color:'#6b7280' }}>{selected.vehicle_type} · {selected.vehicle_plate||'—'}</div>
                    </div>
                    <div>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:50, background:cfg.bg, color:cfg.color }}>
                        <i className={cfg.icon} />{cfg.label}
                      </span>
                      {selected.current_order && <div style={{ fontSize:10, color:'#9ca3af', marginTop:4 }}>Active: {selected.current_order}</div>}
                    </div>
                  </div>
                  <div style={{ padding:20 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
                      {[
                        { label:'Total Deliveries', value:selected.total_deliveries||0, color:'#6366f1' },
                        { label:'Rating', value:<StarRating rating={selected.rating||0} />, color:'#f59e0b' },
                        { label:'Total Earnings', value:fmt(selected.earnings||0), color:'#10b981' },
                      ].map(k => (
                        <div key={k.label} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:'12px', textAlign:'center' }}>
                          <div style={{ fontWeight:700, fontSize:16, color:k.color }}>{k.value}</div>
                          <div style={{ fontSize:11, color:'#9ca3af' }}>{k.label}</div>
                        </div>
                      ))}
                    </div>
                    {selected.notes && (
                      <div style={{ padding:'10px 14px', borderRadius:8, background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', fontSize:12, marginBottom:16 }}>
                        <i className="ri-information-line" style={{ marginRight:5 }} />{selected.notes}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={() => { closeModal(); setTimeout(()=>openModal('edit',selected),100) }} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:8, border:'none', background:'#1B4332', color:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:12 }}>
                        <i className="ri-edit-line" />Edit
                      </button>
                      {selected.status==='suspended'
                        ? <button onClick={() => { activateDriver(selected); closeModal() }} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:8, border:'none', background:'#22c55e', color:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:12 }}>
                            <i className="ri-checkbox-circle-line" />Reinstate
                          </button>
                        : selected.status!=='on_delivery' && <button onClick={() => { closeModal(); setTimeout(()=>openModal('suspend',selected),100) }} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:8, border:'none', background:'#fee2e2', color:'#dc2626', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:12 }}>
                            <i className="ri-forbid-line" />Suspend
                          </button>
                      }
                      <button onClick={closeModal} style={{ marginLeft:'auto', padding:'8px 14px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:12 }}>Close</button>
                    </div>
                  </div>
                </div>
              </ModalShell>
            )
          })()}

          {/* ADD / EDIT */}
          {(activeModal==='add'||activeModal==='edit') && (
            <ModalShell title={isEditing?'Edit Driver':'Add New Driver'} onClose={closeModal} maxWidth={520}>
              <div style={{ padding:24, overflowY:'auto' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label style={lbl}>Full Name <span style={{ color:'#dc2626' }}>*</span></label>
                    <input value={form.name} onChange={e=>setField('name',e.target.value)} placeholder="Tunde Adeyemi" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Phone <span style={{ color:'#dc2626' }}>*</span></label>
                    <input value={form.phone} onChange={e=>setField('phone',e.target.value)} placeholder="08031234567" style={inp} />
                  </div>
                  <div style={{ gridColumn:'1 / -1' }}>
                    <label style={lbl}>Email</label>
                    <input type="email" value={form.email} onChange={e=>setField('email',e.target.value)} placeholder="driver@bemsfarms.com" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Vehicle Type</label>
                    <select value={form.vehicle_type} onChange={e=>setField('vehicle_type',e.target.value)} style={inp}>
                      {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Plate Number</label>
                    <input value={form.vehicle_plate} onChange={e=>setField('vehicle_plate',e.target.value)} placeholder="LAG-234-AB" style={inp} />
                  </div>
                  <div style={{ gridColumn:'1 / -1' }}>
                    <label style={lbl}>Primary Zone</label>
                    <select value={form.zone_id} onChange={e=>setField('zone_id',e.target.value)} style={inp}>
                      <option value="">— Select zone —</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.zone_name}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn:'1 / -1' }}>
                    <label style={lbl}>Notes</label>
                    <textarea rows={2} value={form.notes} onChange={e=>setField('notes',e.target.value)} placeholder="Any notes…" style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
                  </div>
                </div>
                <div style={{ display:'flex', gap:10, marginTop:20 }}>
                  <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Cancel</button>
                  <button onClick={saveDriver} disabled={!form.name||!form.phone||submitting} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#1B4332', color:'#fff', cursor:(!form.name||!form.phone||submitting)?'not-allowed':'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13, opacity:(!form.name||!form.phone||submitting)?0.6:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <i className={isEditing?'ri-save-line':'ri-add-line'} />
                    {submitting?'Saving…':isEditing?'Save Changes':'Add Driver'}
                  </button>
                </div>
              </div>
            </ModalShell>
          )}

          {/* SUSPEND */}
          {activeModal==='suspend' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:420 }}>
              <div style={{ background:'#7f1d1d', borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ color:'#fff', fontWeight:700, fontSize:15, fontFamily:'Syne, sans-serif', display:'flex', alignItems:'center', gap:8 }}>
                  <i className="ri-forbid-line" />Suspend Driver
                </span>
                <button onClick={closeModal} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:20, padding:0, display:'flex', alignItems:'center' }}><i className="ri-close-line" /></button>
              </div>
              <div style={{ padding:24 }}>
                <div style={{ padding:'10px 14px', borderRadius:8, background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', fontSize:12, marginBottom:16 }}>
                  <i className="ri-alert-line" style={{ marginRight:5 }} />
                  Suspending <strong>{selected.name}</strong> will prevent new delivery assignments. Can be reinstated anytime.
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={lbl}>Reason <span style={{ color:'#dc2626' }}>*</span></label>
                  <textarea rows={3} placeholder="e.g. Multiple complaints, delivery fraud…" value={suspendNote} onChange={e=>setSuspendNote(e.target.value)} style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Cancel</button>
                  <button onClick={suspendDriver} disabled={!suspendNote||submitting} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', cursor:(!suspendNote||submitting)?'not-allowed':'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13, opacity:(!suspendNote||submitting)?0.6:1 }}>
                    {submitting?'Suspending…':'Suspend Driver'}
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
