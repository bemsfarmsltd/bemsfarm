import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const NAV = [
  { label:'General',      to:'/settings/general'        },
  { label:'Tax',          to:'/settings/tax'            },
  { label:'Coupons',      to:'/settings/coupons'        },
  { label:'POS',          to:'/settings/pos'            },
  { label:'Payment',      to:'/settings/payment'        },
  { label:'Currencies',   to:'/settings/currencies'     },
  { label:'Invoices',     to:'/settings/invoices'       },
  { label:'Manager',      to:'/settings/manager'        },
  { label:'Notifications',to:'/settings/notifications'  },
]

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const btnD = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#f06548',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'#f9fafb' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }
const B = '#e5e7eb', S = '#6b7280'

const ROLES = ['admin','manager','cashier','viewer']
const STATUS_OPTS = ['active','inactive','suspended']

function SettingsNav() {
  const { pathname } = useLocation()
  return (
    <div style={{ display:'flex',gap:0,borderBottom:`2px solid ${B}`,marginBottom:24,overflowX:'auto' }}>
      {NAV.map(n=>(
        <Link key={n.to} to={n.to} style={{ padding:'10px 16px',border:'none',borderBottom:pathname===n.to?'2px solid #1B4332':'2px solid transparent',background:'transparent',fontFamily:'Nunito,sans-serif',fontWeight:pathname===n.to?700:500,fontSize:13,color:pathname===n.to?'#1B4332':S,cursor:'pointer',textDecoration:'none',whiteSpace:'nowrap',marginBottom:-2 }}>
          {n.label}
        </Link>
      ))}
    </div>
  )
}

function roleBadge(role) {
  const map = { admin:['#7c3aed','#ede9fe'], manager:['#1B4332','#dcfce7'], cashier:['#0369a1','#e0f2fe'], viewer:['#6b7280','#f3f4f6'] }
  const [color, bg] = map[role] || ['#6b7280','#f3f4f6']
  return <span style={{ background:bg,color,borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:700,textTransform:'capitalize' }}>{role}</span>
}

function statusBadge(status) {
  const map = { active:['#166534','#dcfce7'], inactive:['#6b7280','#f3f4f6'], suspended:['#991b1b','#fee2e2'] }
  const [color, bg] = map[status] || ['#6b7280','#f3f4f6']
  return <span style={{ background:bg,color,borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600,textTransform:'capitalize' }}>{status}</span>
}

const BLANK_ADD = { name:'', email:'', password:'', role:'manager', store_id:'' }
const BLANK_EDIT = { role:'manager', status:'active', store_id:'', name:'' }

export default function ManagerSettings() {
  const [managers, setManagers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)   // null | 'add' | manager object
  const [addForm, setAddForm]   = useState(BLANK_ADD)
  const [editForm, setEditForm] = useState(BLANK_EDIT)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/settings/manager')
      .then(r => setManagers(r.data.managers || []))
      .catch(() => toast.error('Failed to load managers'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = managers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() { setAddForm({ ...BLANK_ADD }); setModal('add') }
  function openEdit(m) { setEditForm({ role:m.role, status:m.status, store_id:m.store_id||'', name:m.name }); setModal(m) }
  function closeModal() { setModal(null); setDeleteItem(null) }

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/settings/manager', addForm)
      toast.success('Admin user created')
      closeModal()
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create manager')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch(`/admin/settings/manager/${modal.id}`, editForm)
      toast.success('Manager updated')
      closeModal()
      load()
    } catch {
      toast.error('Failed to update manager')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await api.delete(`/admin/settings/manager/${deleteItem.id}`)
      toast.success('Manager deactivated')
      setDeleteItem(null)
      load()
    } catch {
      toast.error('Failed to deactivate manager')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Settings</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Manage admin users and their permissions.</div>
      </div>
      <SettingsNav/>

      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
          <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>Admin Users</span>
          <div style={{ display:'flex',gap:10,alignItems:'center' }}>
            <div style={{ position:'relative' }}>
              <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:S,fontSize:15,pointerEvents:'none' }}/>
              <input type="text" placeholder="Search managers…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp,paddingLeft:34,width:220 }}/>
            </div>
            <button style={btnP} onClick={openAdd}><i className="ri-user-add-line"/>Add Admin User</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center',padding:60,color:S }}><i className="ri-loader-4-line" style={{ fontSize:28 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Name','Email','Role','Status','Store','Created','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ ...TD,textAlign:'center',padding:'60px 0',color:S }}>
                    <i className="ri-user-line" style={{ fontSize:36,display:'block',marginBottom:8 }}/>No admin users found
                  </td></tr>
                )}
                {filtered.map(m=>(
                  <tr key={m.id}>
                    <td style={{ ...TD,fontWeight:600 }}>{m.name}</td>
                    <td style={{ ...TD,color:S }}>{m.email}</td>
                    <td style={TD}>{roleBadge(m.role)}</td>
                    <td style={TD}>{statusBadge(m.status)}</td>
                    <td style={{ ...TD,fontSize:12,color:S }}>{m.store_name||<span style={{ color:'#d1d5db' }}>—</span>}</td>
                    <td style={{ ...TD,fontSize:11,color:S }}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        <button onClick={()=>openEdit(m)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0f4ff',color:'#405189',cursor:'pointer' }} title="Edit"><i className="ri-pencil-line"/></button>
                        <button onClick={()=>setDeleteItem(m)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#fff0f0',color:'#f06548',cursor:'pointer' }} title="Deactivate"><i className="ri-user-forbid-line"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding:'10px 20px',borderTop:`1px solid ${B}`,fontSize:12,color:S }}>
          {managers.length} admin users
        </div>
      </div>

      {/* ADD MODAL */}
      {modal === 'add' && (
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:500,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-user-add-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Add Admin User</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={handleAdd} style={{ padding:24 }}>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Full Name <span style={{ color:'#f06548' }}>*</span></label>
                  <input style={inp} required value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))} placeholder="John Doe"/>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Email Address <span style={{ color:'#f06548' }}>*</span></label>
                  <input type="email" style={inp} required value={addForm.email} onChange={e=>setAddForm(f=>({...f,email:e.target.value}))} placeholder="john@bemsfarms.ng"/>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Password <span style={{ color:'#f06548' }}>*</span></label>
                  <input type="password" style={inp} required minLength={8} value={addForm.password} onChange={e=>setAddForm(f=>({...f,password:e.target.value}))} placeholder="Min 8 characters"/>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:24 }}>
                  <div>
                    <label style={LBL}>Role</label>
                    <select style={inp} value={addForm.role} onChange={e=>setAddForm(f=>({...f,role:e.target.value}))}>
                      {ROLES.map(r=><option key={r} value={r} style={{ textTransform:'capitalize' }}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Store ID <span style={{ fontWeight:400,color:S }}>(optional)</span></label>
                    <input style={inp} value={addForm.store_id} onChange={e=>setAddForm(f=>({...f,store_id:e.target.value}))} placeholder="Store ID"/>
                  </div>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }} disabled={saving}>{saving?'Creating…':'Create User'}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* EDIT MODAL */}
      {modal && modal !== 'add' && (
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:460,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-user-settings-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Edit {modal.name}</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={handleEdit} style={{ padding:24 }}>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Name</label>
                  <input style={inp} value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Role</label>
                    <select style={inp} value={editForm.role} onChange={e=>setEditForm(f=>({...f,role:e.target.value}))}>
                      {ROLES.map(r=><option key={r} value={r} style={{ textTransform:'capitalize' }}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Status</label>
                    <select style={inp} value={editForm.status} onChange={e=>setEditForm(f=>({...f,status:e.target.value}))}>
                      {STATUS_OPTS.map(s=><option key={s} value={s} style={{ textTransform:'capitalize' }}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={LBL}>Store Assignment <span style={{ fontWeight:400,color:S }}>(optional)</span></label>
                  <input style={inp} value={editForm.store_id} onChange={e=>setEditForm(f=>({...f,store_id:e.target.value}))} placeholder="Store ID"/>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }} disabled={saving}>{saving?'Saving…':'Save Changes'}</button>
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
                <i className="ri-user-forbid-line" style={{ fontSize:22 }}/>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Deactivate Manager?</span>
                <button onClick={()=>setDeleteItem(null)} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24,textAlign:'center' }}>
                <p style={{ color:S,fontSize:14,marginBottom:24 }}>Deactivate <strong style={{ color:'#111827' }}>{deleteItem.name}</strong>? They will lose all system access.</p>
                <div style={{ display:'flex',gap:10 }}>
                  <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={()=>setDeleteItem(null)}>Cancel</button>
                  <button style={{ ...btnD,flex:1,justifyContent:'center' }} onClick={handleDelete} disabled={saving}>{saving?'Processing…':'Deactivate'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
