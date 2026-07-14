import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const btnD = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#f06548',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'#f9fafb' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }
const B = '#e5e7eb', S = '#6b7280'

function statusBadge(status) {
  const map = { active:['#166534','#dcfce7'], inactive:['#6b7280','#f3f4f6'], closed:['#991b1b','#fee2e2'] }
  const [color, bg] = map[status?.toLowerCase()] || ['#6b7280','#f3f4f6']
  return <span style={{ background:bg,color,borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600,textTransform:'capitalize' }}>{status||'—'}</span>
}

const BLANK_STORE = { name:'', code:'', address:'', city:'', state:'', phone:'', email:'', manager_id:'' }

export default function StoreList() {
  const [stores, setStores]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [modal, setModal]         = useState(null)   // null | 'add' | store obj
  const [storeForm, setStoreForm] = useState(BLANK_STORE)
  const [viewStore, setViewStore] = useState(null)   // store with staff
  const [staff, setStaff]         = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [deleteItem, setDeleteItem] = useState(null)
  const [assignModal, setAssignModal] = useState(null) // store object
  const [managerId, setManagerId]    = useState('')
  const [saving, setSaving]       = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/stores', { params: { page, limit:20, search: search||undefined } })
      .then(r => { setStores(r.data.stores||[]); setTotal(r.data.total||0) })
      .catch(() => toast.error('Failed to load stores'))
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { load() }, [load])

  function openAdd() { setStoreForm({ ...BLANK_STORE }); setModal('add') }
  function openEdit(s) { setStoreForm({ name:s.name,code:s.code||'',address:s.address||'',city:s.city||'',state:s.state||'',phone:s.phone||'',email:s.email||'',manager_id:s.manager_id||'' }); setModal(s) }
  function closeModal() { setModal(null); setDeleteItem(null); setAssignModal(null); setViewStore(null) }

  async function openView(s) {
    setViewStore(s); setStaffLoading(true)
    try {
      const r = await api.get(`/admin/stores/${s.id}/staff`)
      setStaff(r.data.staff||[])
    } catch { toast.error('Failed to load staff'); setStaff([]) }
    finally { setStaffLoading(false) }
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true)
    try {
      if (modal === 'add') { await api.post('/admin/stores', storeForm); toast.success('Store created') }
      else { await api.patch(`/admin/stores/${modal.id}`, storeForm); toast.success('Store updated') }
      closeModal(); load()
    } catch (err) { toast.error(err?.response?.data?.message||'Failed to save store') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setSaving(true)
    try { await api.delete(`/admin/stores/${deleteItem.id}`); toast.success('Store deleted'); setDeleteItem(null); load() }
    catch { toast.error('Failed to delete store') }
    finally { setSaving(false) }
  }

  async function handleAssign(e) {
    e.preventDefault(); setSaving(true)
    try {
      await api.post(`/admin/stores/${assignModal.id}/manager`, { manager_id: managerId })
      toast.success('Manager assigned'); setAssignModal(null); setManagerId(''); load()
    } catch { toast.error('Failed to assign manager') }
    finally { setSaving(false) }
  }

  const activeStores = stores.filter(s=>s.status==='active').length

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      {/* Page header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Multi-Store</div>
          <div style={{ fontSize:12,color:S,marginTop:2 }}>Manage all store locations across your network.</div>
        </div>
        <button style={btnP} onClick={openAdd}><i className="ri-add-line"/>Add Store</button>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:24 }}>
        {[
          { label:'Total Stores', value:total, icon:'ri-store-2-line', color:'#1B4332', bg:'#dcfce7' },
          { label:'Active Stores', value:activeStores, icon:'ri-checkbox-circle-line', color:'#0369a1', bg:'#e0f2fe' },
          { label:'Inactive',     value:total-activeStores, icon:'ri-close-circle-line', color:'#991b1b', bg:'#fee2e2' },
        ].map(k=>(
          <div key={k.label} style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:16,display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:10,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <i className={k.icon} style={{ fontSize:20,color:k.color }}/>
            </div>
            <div>
              <div style={{ fontSize:11,color:S,fontWeight:600 }}>{k.label}</div>
              <div style={{ fontSize:20,fontWeight:800,color:'#111827' }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
          <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>Store List</span>
          <div style={{ position:'relative' }}>
            <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:S,fontSize:15,pointerEvents:'none' }}/>
            <input type="text" placeholder="Search stores…" value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} style={{ ...inp,paddingLeft:34,width:220 }}/>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center',padding:60,color:S }}><i className="ri-loader-4-line" style={{ fontSize:28 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Name','Code','City/State','Phone','Email','Manager','Status','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {stores.length === 0 && (
                  <tr><td colSpan={8} style={{ ...TD,textAlign:'center',padding:'60px 0',color:S }}>
                    <i className="ri-store-2-line" style={{ fontSize:36,display:'block',marginBottom:8 }}/>No stores found
                  </td></tr>
                )}
                {stores.map(s=>(
                  <tr key={s.id}>
                    <td style={{ ...TD,fontWeight:600 }}>{s.name}</td>
                    <td style={TD}><code style={{ background:'#f3f4f6',padding:'2px 7px',borderRadius:4,fontSize:11 }}>{s.code||'—'}</code></td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{[s.city,s.state].filter(Boolean).join(', ')||'—'}</td>
                    <td style={{ ...TD,fontSize:12,color:S }}>{s.phone||'—'}</td>
                    <td style={{ ...TD,fontSize:12,color:S }}>{s.email||'—'}</td>
                    <td style={{ ...TD,fontSize:12 }}>{s.manager_name||<span style={{ color:'#d1d5db' }}>Unassigned</span>}</td>
                    <td style={TD}>{statusBadge(s.status)}</td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        <button onClick={()=>openView(s)} title="View Staff" style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0fdf4',color:'#166534',cursor:'pointer' }}><i className="ri-eye-line"/></button>
                        <button onClick={()=>openEdit(s)} title="Edit Store" style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0f4ff',color:'#405189',cursor:'pointer' }}><i className="ri-pencil-line"/></button>
                        <button onClick={()=>{ setAssignModal(s); setManagerId(s.manager_id||'') }} title="Assign Manager" style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#fff7ed',color:'#c2410c',cursor:'pointer' }}><i className="ri-user-star-line"/></button>
                        <button onClick={()=>setDeleteItem(s)} title="Delete Store" style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#fff0f0',color:'#f06548',cursor:'pointer' }}><i className="ri-delete-bin-line"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding:'10px 20px',borderTop:`1px solid ${B}`,fontSize:12,color:S,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <span>Showing {stores.length} of {total} stores</span>
          <div style={{ display:'flex',gap:6 }}>
            <button style={{ ...btnL,padding:'4px 10px',fontSize:12 }} disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
            <span style={{ padding:'4px 8px',fontSize:12 }}>Page {page}</span>
            <button style={{ ...btnL,padding:'4px 10px',fontSize:12 }} disabled={stores.length<20} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </div>
      </div>

      {/* ADD / EDIT STORE MODAL */}
      {modal !== null && (
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:560,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden',maxHeight:'90vh',display:'flex',flexDirection:'column' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
                <i className="ri-store-2-line" style={{ fontSize:20 }}/>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>{modal==='add'?'Add New Store':'Edit Store'}</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={handleSave} style={{ padding:24,overflowY:'auto' }}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Store Name <span style={{ color:'#f06548' }}>*</span></label>
                    <input style={inp} required value={storeForm.name} onChange={e=>setStoreForm(f=>({...f,name:e.target.value}))} placeholder="Bems Farms — Lekki"/>
                  </div>
                  <div>
                    <label style={LBL}>Store Code</label>
                    <input style={inp} value={storeForm.code} onChange={e=>setStoreForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="BEMS-LK"/>
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Address</label>
                  <input style={inp} value={storeForm.address} onChange={e=>setStoreForm(f=>({...f,address:e.target.value}))} placeholder="14 Farm Road"/>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>City</label>
                    <input style={inp} value={storeForm.city} onChange={e=>setStoreForm(f=>({...f,city:e.target.value}))} placeholder="Lagos"/>
                  </div>
                  <div>
                    <label style={LBL}>State</label>
                    <input style={inp} value={storeForm.state} onChange={e=>setStoreForm(f=>({...f,state:e.target.value}))} placeholder="Lagos State"/>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Phone</label>
                    <input style={inp} value={storeForm.phone} onChange={e=>setStoreForm(f=>({...f,phone:e.target.value}))} placeholder="+234 802 345 6789"/>
                  </div>
                  <div>
                    <label style={LBL}>Email</label>
                    <input type="email" style={inp} value={storeForm.email} onChange={e=>setStoreForm(f=>({...f,email:e.target.value}))} placeholder="store@bemsfarms.ng"/>
                  </div>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={LBL}>Manager ID <span style={{ fontWeight:400,color:S }}>(optional)</span></label>
                  <input style={inp} value={storeForm.manager_id} onChange={e=>setStoreForm(f=>({...f,manager_id:e.target.value}))} placeholder="Manager user ID"/>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }} disabled={saving}>{saving?'Saving…':modal==='add'?'Create Store':'Save Changes'}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* VIEW STORE / STAFF MODAL */}
      {viewStore && (
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:560,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden',maxHeight:'80vh',display:'flex',flexDirection:'column' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
                <i className="ri-store-2-line" style={{ fontSize:20 }}/>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>{viewStore.name} — Staff</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:20,overflowY:'auto' }}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20,fontSize:13 }}>
                  <div><span style={{ color:S }}>Address:</span> {viewStore.address||'—'}, {viewStore.city||''}</div>
                  <div><span style={{ color:S }}>Manager:</span> {viewStore.manager_name||'Unassigned'}</div>
                  <div><span style={{ color:S }}>Phone:</span> {viewStore.phone||'—'}</div>
                  <div><span style={{ color:S }}>Status:</span> {statusBadge(viewStore.status)}</div>
                </div>
                <div style={{ fontWeight:700,fontSize:13,marginBottom:12 }}>Staff Members ({staff.length})</div>
                {staffLoading ? (
                  <div style={{ textAlign:'center',padding:30,color:S }}><i className="ri-loader-4-line"/></div>
                ) : staff.length === 0 ? (
                  <div style={{ textAlign:'center',padding:30,color:S,fontSize:13 }}>No staff assigned to this store</div>
                ) : (
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead>
                      <tr>{['Name','Email','Role','Status'].map(h=><th key={h} style={{ ...TH,background:'#f9fafb' }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {staff.map((st,i)=>(
                        <tr key={i}>
                          <td style={TD}>{st.name}</td>
                          <td style={{ ...TD,fontSize:12,color:S }}>{st.email}</td>
                          <td style={TD}><span style={{ background:'#f0fdf4',color:'#166534',borderRadius:50,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{st.role}</span></td>
                          <td style={TD}>{statusBadge(st.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div style={{ padding:'12px 20px',borderTop:`1px solid ${B}`,flexShrink:0 }}>
                <button style={{ ...btnL,width:'100%',justifyContent:'center' }} onClick={closeModal}>Close</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ASSIGN MANAGER MODAL */}
      {assignModal && (
        <>
          <div onClick={()=>setAssignModal(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:380,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <i className="ri-user-star-line" style={{ fontSize:20 }}/>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Assign Manager</span>
                <button onClick={()=>setAssignModal(null)} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={handleAssign} style={{ padding:24 }}>
                <div style={{ fontSize:13,color:S,marginBottom:16 }}>Assign a manager to <strong style={{ color:'#111827' }}>{assignModal.name}</strong></div>
                <div style={{ marginBottom:24 }}>
                  <label style={LBL}>Manager ID <span style={{ color:'#f06548' }}>*</span></label>
                  <input style={inp} required value={managerId} onChange={e=>setManagerId(e.target.value)} placeholder="Enter manager user ID"/>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={()=>setAssignModal(null)}>Cancel</button>
                  <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }} disabled={saving}>{saving?'Assigning…':'Assign'}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* DELETE CONFIRM */}
      {deleteItem && (
        <>
          <div onClick={()=>setDeleteItem(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:360,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#7f1d1d',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <i className="ri-delete-bin-line" style={{ fontSize:20 }}/>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Delete Store?</span>
                <button onClick={()=>setDeleteItem(null)} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24,textAlign:'center' }}>
                <p style={{ color:S,fontSize:14,marginBottom:24 }}>Delete <strong style={{ color:'#111827' }}>{deleteItem.name}</strong>? This action cannot be undone.</p>
                <div style={{ display:'flex',gap:10 }}>
                  <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={()=>setDeleteItem(null)}>Cancel</button>
                  <button style={{ ...btnD,flex:1,justifyContent:'center' }} onClick={handleDelete} disabled={saving}>{saving?'Deleting…':'Delete'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
