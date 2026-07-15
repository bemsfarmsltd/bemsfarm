import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const inp  = { display:'block', width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontFamily:'Nunito,sans-serif', fontSize:13, outline:'none', background:'#fff', color:'#111827', boxSizing:'border-box' }
const btnP = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:'#1B4332', color:'#fff', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:13 }
const btnL = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:600, fontSize:13 }
const btnD = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:'#dc2626', color:'#fff', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:13 }
const LBL  = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }

const STATUS_COLOR = { active:'#0ab39c', inactive:'#9ca3af' }

function capacityColor(pct) {
  if (pct >= 85) return '#dc2626'
  if (pct >= 60) return '#f59e0b'
  return '#0ab39c'
}

function Modal({ title, onClose, children }) {
  return <>
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1054 }}/>
    <div style={{ position:'fixed', inset:0, zIndex:1055, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:580, boxShadow:'0 8px 40px rgba(0,0,0,0.18)', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ background:'#1B4332', color:'#fff', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15 }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer', fontSize:20, display:'flex', padding:4 }}><i className="ri-close-line"/></button>
        </div>
        <div style={{ padding:24, overflowY:'auto' }}>{children}</div>
      </div>
    </div>
  </>
}

const BLANK_FORM = { name:'', code:'', location:'', manager:'', capacity:500, status:'active' }

export default function Warehouses() {
  const [warehouses,  setWarehouses] = useState([])
  const [loading,     setLoading]    = useState(false)
  const [search,      setSearch]     = useState('')
  const [activeModal, setMod]        = useState(null)
  const [editItem,    setEdit]       = useState(null)
  const [form,        setForm]       = useState(BLANK_FORM)
  const [saving,      setSaving]     = useState(false)

  const fetchWarehouses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/warehouses')
      setWarehouses(res.data.warehouses || [])
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load warehouses') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchWarehouses() }, [fetchWarehouses])

  const filtered = warehouses.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.location || '').toLowerCase().includes(search.toLowerCase()) ||
    (w.manager || '').toLowerCase().includes(search.toLowerCase()) ||
    (w.code || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalCap = warehouses.reduce((s,w) => s + (w.capacity || 0), 0)

  function openAdd()   { setEdit(null); setForm(BLANK_FORM); setMod('form') }
  function openEdit(w) { setEdit(w); setForm({ name:w.name, code:w.code||'', location:w.location||'', manager:w.manager||'', capacity:w.capacity||0, status:w.status||'active' }); setMod('form') }
  function openDel(w)  { setEdit(w); setMod('delete') }
  function close()     { setMod(null); setEdit(null) }

  async function saveForm(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editItem) {
        await api.patch(`/admin/inventory/warehouses/${editItem.id}`, form)
        toast.success('Warehouse updated')
      } else {
        await api.post('/admin/inventory/warehouses', form)
        toast.success('Warehouse created')
      }
      close()
      fetchWarehouses()
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    try {
      await api.delete(`/admin/inventory/warehouses/${editItem.id}`)
      toast.success('Warehouse deleted')
      close()
      fetchWarehouses()
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed') }
  }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'#111827' }}>Warehouses</div>
          <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Inventory / Warehouses</div>
        </div>
        <button onClick={openAdd} style={btnP}><i className="ri-add-line"/>Add Warehouse</button>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Warehouses', value:warehouses.length,                     icon:'ri-building-line',      color:'#405189' },
          { label:'Active',           value:warehouses.filter(w=>w.status==='active').length, icon:'ri-checkbox-circle-line', color:'#0ab39c' },
          { label:'Total Capacity',   value:`${totalCap.toLocaleString()} units`,  icon:'ri-inbox-line',         color:'#f7b84b' },
          { label:'Inactive',         value:warehouses.filter(w=>w.status!=='active').length, icon:'ri-close-circle-line', color:'#9ca3af' },
        ].map(c => (
          <div key={c.label} style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', borderLeft:`3px solid ${c.color}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:`${c.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:20, color:c.color }}/>
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:c.color }}>{c.value}</div>
              <div style={{ fontSize:11, color:'#6b7280' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:20, maxWidth:420 }}>
        <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:15 }}/>
        <input style={{ ...inp, paddingLeft:32 }} placeholder="Search warehouses…" value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>
          <div className="spinner-border spinner-border-sm text-primary me-2"/>Loading warehouses…
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>
          <i className="ri-building-line" style={{ fontSize:40, display:'block', marginBottom:10 }}/>No warehouses found
        </div>
      )}

      {/* Warehouse cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:20 }}>
        {filtered.map(w => {
          const sc = STATUS_COLOR[w.status] || '#9ca3af'
          const pct = w.capacity > 0 && w.capacity ? 0 : 0  // API doesn't return used; show capacity only
          return (
            <div key={w.id} style={{ background:'#fff', borderRadius:14, border:'1px solid #f3f4f6', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
              <div style={{ background:`${sc}10`, borderBottom:'1px solid #f3f4f6', padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:48, height:48, borderRadius:12, background:`${sc}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className="ri-building-2-line" style={{ fontSize:22, color:sc }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#111827' }}>{w.name}</div>
                  <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>
                    <span style={{ background:`${sc}18`, color:sc, borderRadius:50, padding:'2px 8px', fontSize:11, fontWeight:600, textTransform:'capitalize' }}>{w.status}</span>
                    {w.code && <span style={{ marginLeft:8 }}>{w.code}</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => openEdit(w)} title="Edit" style={{ width:28, height:28, borderRadius:7, border:'none', background:'#dbeafe', color:'#1d4ed8', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="ri-pencil-line" style={{ fontSize:12 }}/></button>
                  <button onClick={() => openDel(w)} title="Delete" style={{ width:28, height:28, borderRadius:7, border:'none', background:'#fee2e2', color:'#dc2626', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="ri-delete-bin-line" style={{ fontSize:12 }}/></button>
                </div>
              </div>

              <div style={{ padding:20 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Location</div>
                    <div style={{ fontSize:13, color:'#374151', fontWeight:600 }}><i className="ri-map-pin-line" style={{ marginRight:4, color:'#6b7280' }}/>{w.location || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Manager</div>
                    <div style={{ fontSize:13, color:'#374151', fontWeight:600 }}><i className="ri-user-line" style={{ marginRight:4, color:'#6b7280' }}/>{w.manager || '—'}</div>
                  </div>
                </div>

                {w.capacity > 0 && (
                  <div style={{ background:'#f9fafb', borderRadius:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
                    <span style={{ color:'#6b7280' }}>Capacity</span>
                    <span style={{ fontWeight:700, color:'#374151' }}>{Number(w.capacity).toLocaleString()} units</span>
                  </div>
                )}

                <div style={{ marginTop:10, fontSize:12, color:'#6b7280' }}>
                  Added {w.created_at ? new Date(w.created_at).toLocaleDateString('en-GB') : '—'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Form Modal */}
      {activeModal === 'form' && (
        <Modal title={editItem ? 'Edit Warehouse' : 'Add Warehouse'} onClose={close}>
          <form onSubmit={saveForm}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
              <div>
                <label style={LBL}>Warehouse Name <span style={{ color:'#dc2626' }}>*</span></label>
                <input style={inp} required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g., Main Store"/>
              </div>
              <div>
                <label style={LBL}>Code</label>
                <input style={inp} value={form.code} onChange={e => setForm(f=>({...f,code:e.target.value}))} placeholder="WH-001"/>
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={LBL}>Location <span style={{ color:'#dc2626' }}>*</span></label>
              <input style={inp} required value={form.location} onChange={e => setForm(f=>({...f,location:e.target.value}))} placeholder="e.g., Lekki, Lagos"/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div>
                <label style={LBL}>Manager</label>
                <input style={inp} value={form.manager} onChange={e => setForm(f=>({...f,manager:e.target.value}))} placeholder="Manager name"/>
              </div>
              <div>
                <label style={LBL}>Capacity (units)</label>
                <input type="number" style={inp} min="1" value={form.capacity} onChange={e => setForm(f=>({...f,capacity:Number(e.target.value)}))}/>
              </div>
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={LBL}>Status</label>
              <select style={inp} value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={close} style={{ ...btnL, flex:1, justifyContent:'center' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...btnP, flex:1, justifyContent:'center', opacity:saving?0.7:1 }}>
                {saving ? 'Saving…' : editItem ? 'Save Changes' : 'Add Warehouse'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'delete' && <>
        <div onClick={close} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1054 }}/>
        <div style={{ position:'fixed', inset:0, zIndex:1055, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:340, boxShadow:'0 8px 40px rgba(0,0,0,0.18)', padding:28, textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <i className="ri-delete-bin-line" style={{ fontSize:24, color:'#dc2626' }}/>
            </div>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, marginBottom:6 }}>Delete Warehouse?</div>
            <div style={{ fontSize:13, color:'#6b7280', marginBottom:24 }}>{editItem?.name}{editItem?.code ? ` (${editItem.code})` : ''}</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={close} style={{ ...btnL, flex:1, justifyContent:'center' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ ...btnD, flex:1, justifyContent:'center' }}>Delete</button>
            </div>
          </div>
        </div>
      </>}
    </div>
  )
}
