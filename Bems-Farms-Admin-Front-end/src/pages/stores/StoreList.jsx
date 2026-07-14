import { useState, useEffect, useCallback } from 'react'
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
  const map = {
    active:   { color:'#166534', bg:'#dcfce7' },
    inactive: { color:'#6b7280', bg:'#f3f4f6' },
    closed:   { color:'#991b1b', bg:'#fee2e2' },
  }
  const key = (status||'').toLowerCase()
  const style = map[key] || { color:S, bg:'#f3f4f6' }
  return (
    <span style={{ background:style.bg,color:style.color,borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600,textTransform:'capitalize' }}>
      {status||'—'}
    </span>
  )
}

const BLANK_FORM = { name:'', code:'', address:'', city:'', state:'', phone:'', email:'', manager_id:'' }

export default function StoreList() {
  const [stores, setStores]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [modal, setModal]         = useState(null)   // null | 'add' | store object (edit) | { view: store, staff: [] }
  const [form, setForm]           = useState(BLANK_FORM)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [viewData, setViewData]   = useState(null)  // { store, staff }
  const [viewLoading, setViewLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/stores', { params: { page, limit:20, search: search||undefined } })
      .then(r => { setStores(r.data.stores || []); setTotal(r.data.total||0) })
      .catch(() => toast.error('Failed to load stores'))
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { load() }, [load])

  function openAdd() { setForm({ ...BLANK_FORM }); setModal('add') }

  function openEdit(s) {
    setForm({ name:s.name, code:s.code||'', address:s.address||'', city:s.city||'', state:s.state||'', phone:s.phone||'', email:s.email||'', manager_id:s.manager_id||'' })
    setModal(s)
  }

  async function openView(s) {
    setViewLoading(true)
    setViewData({ store: s, staff: [] })
    setModal('view')
    try {
      const r = await api.get(`/admin/stores/${s.id}/staff`)
      setViewData({ store: s, staff: r.data.staff || [] })
    } catch {
      toast.error('Failed to load store staff')
    } finally {
      setViewLoading(false)
    }
  }

  function closeModal() { setModal(null); setDeleteItem(null); setViewData(null) }

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/stores', form)
      toast.success('Store created successfully')
      closeModal()
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create store')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch(`/admin/stores/${modal.id}`, form)
      toast.success('Store updated successfully')
      closeModal()
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update store')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await api.delete(`/admin/stores/${deleteItem.id}`)
      toast.success('Store deleted')
      setDeleteItem(null)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete store')
    } finally {
      setSaving(false)
    }
  }

  function sf(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const isEdit = modal && modal !== 'add' && modal !== 'view'

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Stores</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Manage all store branches, locations, and staff.</div>
      </div>

      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
          <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>All Stores</span>
          <div style={{ display:'flex',gap:10,alignItems:'center' }}>
            <div style={{ position:'relative' }}>
              <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:S,fontSize:15,pointerEvents:'none' }}/>
              <input type="text" placeholder="Search stores…" value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} style={{ ...inp,paddingLeft:34,width:220 }}/>
            </div>
            <button style={btnP} onClick={openAdd}><i className="ri-store-2-line"/>Add Store</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center',padding:60,color:S }}><i className="ri-loader-4-line" style={{ fontSize:28 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Name','Code','City / State','Phone','Email','Manager','Status','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
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
                    <td style={TD}><code style={{ background:'#f3f4f6',padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:700 }}>{s.code||'—'}</code></td>
                    <td style={{ ...TD,color:S }}>{[s.city,s.state].filter(Boolean).join(', ')||'—'}</td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{s.phone||'—'}</td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{s.email||'—'}</td>
                    <td style={{ ...TD,fontSize:12,color:S }}>{s.manager_name||<span style={{ color:'#d1d5db' }}>Unassigned</span>}</td>
                    <td style={TD}>{statusBadge(s.status)}</td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        <button onClick={()=>openView(s)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0f9ff',color:'#0369a1',cursor:'pointer' }} title="View"><i className="ri-eye-line"/></button>
                        <button onClick={()=>openEdit(s)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0f4ff',color:'#405189',cursor:'pointer' }} title="Edit"><i className="ri-pencil-line"/></button>
                        <button onClick={()=>setDeleteItem(s)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#fff0f0',color:'#f06548',cursor:'pointer' }} title="Delete"><i className="ri-delete-bin-line"/></button>
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
            <span style={{ padding:'4px 8px',fontSize:12,color:S }}>Page {page}</span>
            <button style={{ ...btnL,padding:'4px 10px',fontSize:12 }} disabled={stores.length<20} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </div>
      </div>

      {/* ADD MODAL */}
      {modal === 'add' && (
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:560,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-store-2-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Add New Store</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={handleAdd} style={{ padding:24,overflowY:'auto' }}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Store Name <span style={{ color:'#f06548' }}>*</span></label>
                    <input style={inp} required value={form.name} onChange={e=>sf('name',e.target.value)} placeholder="Lekki Branch"/>
                  </div>
                  <div>
                    <label style={LBL}>Store Code <span style={{ color:'#f06548' }}>*</span></label>
                    <input style={inp} required value={form.code} onChange={e=>sf('code',e.target.value.toUpperCase())} placeholder="LKK" maxLength={10}/>
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Address</label>
                  <input style={inp} value={form.address} onChange={e=>sf('address',e.target.value)} placeholder="12 Admiralty Way"/>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>City</label>
                    <input style={inp} value={form.city} onChange={e=>sf('city',e.target.value)} placeholder="Lekki"/>
                  </div>
                  <div>
                    <label style={LBL}>State</label>
                    <input style={inp} value={form.state} onChange={e=>sf('state',e.target.value)} placeholder="Lagos"/>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Phone</label>
                    <input style={inp} value={form.phone} onChange={e=>sf('phone',e.target.value)} placeholder="+234 801 234 5678"/>
                  </div>
                  <div>
                    <label style={LBL}>Email</label>
                    <input type="email" style={inp} value={form.email} onChange={e=>sf('email',e.target.value)} placeholder="lekki@bemsfarms.ng"/>
                  </div>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={LBL}>Manager ID <span style={{ fontWeight:400,color:S }}>(optional)</span></label>
                  <input style={inp} value={form.manager_id} onChange={e=>sf('manager_id',e.target.value)} placeholder="Manager user ID"/>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }} disabled={saving}>{saving?'Creating…':'Create Store'}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* EDIT MODAL */}
      {isEdit && (
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:560,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-edit-box-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Edit Store — {modal.name}</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={handleEdit} style={{ padding:24,overflowY:'auto' }}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Store Name <span style={{ color:'#f06548' }}>*</span></label>
                    <input style={inp} required value={form.name} onChange={e=>sf('name',e.target.value)}/>
                  </div>
                  <div>
                    <label style={LBL}>Store Code</label>
                    <input style={inp} value={form.code} onChange={e=>sf('code',e.target.value.toUpperCase())} maxLength={10}/>
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Address</label>
                  <input style={inp} value={form.address} onChange={e=>sf('address',e.target.value)}/>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>City</label>
                    <input style={inp} value={form.city} onChange={e=>sf('city',e.target.value)}/>
                  </div>
                  <div>
                    <label style={LBL}>State</label>
                    <input style={inp} value={form.state} onChange={e=>sf('state',e.target.value)}/>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Phone</label>
                    <input style={inp} value={form.phone} onChange={e=>sf('phone',e.target.value)}/>
                  </div>
                  <div>
                    <label style={LBL}>Email</label>
                    <input type="email" style={inp} value={form.email} onChange={e=>sf('email',e.target.value)}/>
                  </div>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={LBL}>Manager ID <span style={{ fontWeight:400,color:S }}>(optional)</span></label>
                  <input style={inp} value={form.manager_id} onChange={e=>sf('manager_id',e.target.value)}/>
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

      {/* VIEW MODAL */}
      {modal === 'view' && viewData && (
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:580,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-store-2-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>{viewData.store.name}</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24,overflowY:'auto' }}>
                {/* Store Details */}
                <div style={{ background:'#f9fafb',borderRadius:10,padding:16,marginBottom:20 }}>
                  <div style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,marginBottom:12,color:'#111827' }}>Store Details</div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                    {[
                      { label:'Code',    value:viewData.store.code },
                      { label:'Status',  value:viewData.store.status },
                      { label:'City',    value:viewData.store.city },
                      { label:'State',   value:viewData.store.state },
                      { label:'Phone',   value:viewData.store.phone },
                      { label:'Email',   value:viewData.store.email },
                      { label:'Manager', value:viewData.store.manager_name },
                      { label:'Address', value:viewData.store.address },
                    ].map(f=>(
                      <div key={f.label}>
                        <div style={{ fontSize:10,fontWeight:700,color:S,textTransform:'uppercase',marginBottom:2 }}>{f.label}</div>
                        <div style={{ fontSize:13,color:'#111827',fontWeight:600 }}>{f.value||'—'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Staff List */}
                <div>
                  <div style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,marginBottom:12,color:'#111827' }}>
                    Staff Members {!viewLoading && <span style={{ fontSize:12,color:S,fontWeight:400 }}>({viewData.staff.length})</span>}
                  </div>
                  {viewLoading ? (
                    <div style={{ textAlign:'center',padding:30,color:S }}><i className="ri-loader-4-line" style={{ fontSize:24 }}/></div>
                  ) : viewData.staff.length === 0 ? (
                    <div style={{ textAlign:'center',padding:30,color:S,fontSize:13 }}>No staff assigned to this store.</div>
                  ) : (
                    <table style={{ width:'100%',borderCollapse:'collapse',border:`1px solid ${B}`,borderRadius:8,overflow:'hidden' }}>
                      <thead>
                        <tr>{['Name','Email','Role','Status'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {viewData.staff.map((m,i)=>(
                          <tr key={i}>
                            <td style={{ ...TD,fontWeight:600 }}>{m.name}</td>
                            <td style={{ ...TD,color:S,fontSize:12 }}>{m.email}</td>
                            <td style={{ ...TD,fontSize:12,textTransform:'capitalize' }}>{m.role}</td>
                            <td style={TD}>
                              <span style={{ background:m.status==='active'?'#dcfce7':'#f3f4f6',color:m.status==='active'?'#166534':S,borderRadius:50,padding:'2px 8px',fontSize:11,fontWeight:600,textTransform:'capitalize' }}>
                                {m.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div style={{ display:'flex',justifyContent:'flex-end',marginTop:20 }}>
                  <button style={{ ...btnL }} onClick={closeModal}>Close</button>
                </div>
              </div>
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
                <i className="ri-delete-bin-line" style={{ fontSize:22 }}/>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Delete Store?</span>
                <button onClick={()=>setDeleteItem(null)} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24,textAlign:'center' }}>
                <p style={{ color:S,fontSize:14,marginBottom:24 }}>
                  Delete <strong style={{ color:'#111827' }}>{deleteItem.name}</strong>? This action cannot be undone.
                </p>
                <div style={{ display:'flex',gap:10 }}>
                  <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={()=>setDeleteItem(null)}>Cancel</button>
                  <button style={{ ...btnD,flex:1,justifyContent:'center' }} onClick={handleDelete} disabled={saving}>{saving?'Deleting…':'Delete Store'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
