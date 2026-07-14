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

function Toggle({ value, onChange }) {
  return (
    <div onClick={onChange} style={{ width:40,height:22,borderRadius:20,background:value?'#1B4332':'#d1d5db',position:'relative',cursor:'pointer',flexShrink:0,transition:'background .2s' }}>
      <div style={{ position:'absolute',top:2,left:value?20:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)' }}/>
    </div>
  )
}

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

const BLANK = { code:'', description:'', type:'percentage', value:0, min_order:0, max_discount:'', usage_limit:100, per_user_limit:1, applicable_to:'all', start_date:'', end_date:'' }

function genCode(name) { return name.trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12) }

function couponStatus(c) {
  const now = new Date().toISOString().slice(0,10)
  if (!c.is_active) return { label:'Inactive', bg:'#f3f4f6', color:S }
  if (c.end_date && c.end_date < now) return { label:'Expired', bg:'#fee2e2', color:'#991b1b' }
  if (c.start_date && c.start_date > now) return { label:'Upcoming', bg:'#e0f2fe', color:'#0369a1' }
  return { label:'Active', bg:'#dcfce7', color:'#166534' }
}

export default function CouponSettings() {
  const [coupons, setCoupons]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [modal, setModal]       = useState(null)   // null | 'add' | coupon object
  const [form, setForm]         = useState(BLANK)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving]     = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/coupons', { params: { page, limit:20, search: search||undefined } })
      .then(r => { setCoupons(r.data.coupons || []); setTotal(r.data.total||0) })
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { load() }, [load])

  function openAdd() { setForm({ ...BLANK }); setModal('add') }
  function openEdit(c) { setForm({ code:c.code,description:c.description||'',type:c.type,value:c.value,min_order:c.min_order||0,max_discount:c.max_discount||'',usage_limit:c.usage_limit||100,per_user_limit:c.per_user_limit||1,applicable_to:c.applicable_to||'all',start_date:c.start_date||'',end_date:c.end_date||'' }); setModal(c) }
  function closeModal() { setModal(null); setDeleteItem(null) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'add') {
        await api.post('/admin/coupons', form)
        toast.success('Coupon created')
      } else {
        await api.patch(`/admin/coupons/${modal.id}`, form)
        toast.success('Coupon updated')
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(c) {
    try {
      await api.patch(`/admin/coupons/${c.id}/toggle`)
      toast.success(`Coupon ${c.is_active?'deactivated':'activated'}`)
      load()
    } catch {
      toast.error('Failed to toggle coupon')
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await api.delete(`/admin/coupons/${deleteItem.id}`)
      toast.success('Coupon deleted')
      setDeleteItem(null)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Cannot delete — coupon may have been used')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Settings</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Manage store preferences and system configurations.</div>
      </div>
      <SettingsNav/>

      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
          <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>Coupon List</span>
          <div style={{ display:'flex',gap:10,alignItems:'center' }}>
            <div style={{ position:'relative' }}>
              <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:S,fontSize:15,pointerEvents:'none' }}/>
              <input type="text" placeholder="Search coupons…" value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} style={{ ...inp,paddingLeft:34,width:220 }}/>
            </div>
            <button style={btnP} onClick={openAdd}><i className="ri-add-line"/>Add Coupon</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center',padding:60,color:S }}><i className="ri-loader-4-line" style={{ fontSize:28 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Code','Type','Value','Min Order','Used','Status','Dates','Active','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {coupons.length===0&&(
                  <tr><td colSpan={9} style={{ ...TD,textAlign:'center',padding:'60px 0',color:S }}>
                    <i className="ri-coupon-3-line" style={{ fontSize:36,display:'block',marginBottom:8 }}/>No coupons found
                  </td></tr>
                )}
                {coupons.map(c=>{
                  const st = couponStatus(c)
                  return (
                    <tr key={c.id}>
                      <td style={TD}><code style={{ background:'#f0f4ff',color:'#405189',borderRadius:6,padding:'3px 8px',fontSize:11,fontWeight:700 }}>{c.code}</code></td>
                      <td style={{ ...TD,color:S,fontSize:12 }}>{c.type==='percentage'?'Percentage':'Fixed'}</td>
                      <td style={{ ...TD,fontWeight:600,color:'#1B4332' }}>{c.type==='percentage'?`${c.value}%`:`₦${Number(c.value).toLocaleString()}`}</td>
                      <td style={{ ...TD,color:S }}>₦{Number(c.min_order||0).toLocaleString()}</td>
                      <td style={TD}><span style={{ background:'#f3f4f6',color:'#374151',borderRadius:20,padding:'2px 8px',fontSize:11,fontWeight:600 }}>{c.used_count||0}/{c.usage_limit||'∞'}</span></td>
                      <td style={TD}><span style={{ background:st.bg,color:st.color,borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600 }}>{st.label}</span></td>
                      <td style={{ ...TD,fontSize:11,color:S,whiteSpace:'nowrap' }}>{c.start_date||'—'} → {c.end_date||'—'}</td>
                      <td style={TD}><Toggle value={c.is_active} onChange={()=>handleToggle(c)}/></td>
                      <td style={TD}>
                        <div style={{ display:'flex',gap:4 }}>
                          <button onClick={()=>openEdit(c)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0f4ff',color:'#405189',cursor:'pointer' }}><i className="ri-pencil-line"/></button>
                          <button onClick={()=>setDeleteItem(c)} disabled={(c.used_count||0)>0} title={(c.used_count||0)>0?'Cannot delete used coupon':''} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:(c.used_count||0)>0?'#f9fafb':'#fff0f0',color:(c.used_count||0)>0?'#d1d5db':'#f06548',cursor:(c.used_count||0)>0?'not-allowed':'pointer' }}><i className="ri-delete-bin-line"/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding:'10px 20px',borderTop:`1px solid ${B}`,fontSize:12,color:S,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <span>Showing {coupons.length} of {total} coupons</span>
          <div style={{ display:'flex',gap:6 }}>
            <button style={{ ...btnL,padding:'4px 10px',fontSize:12 }} disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
            <span style={{ padding:'4px 8px',fontSize:12,color:S }}>Page {page}</span>
            <button style={{ ...btnL,padding:'4px 10px',fontSize:12 }} disabled={coupons.length<20} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {modal !== null && (
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:580,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden',maxHeight:'90vh',display:'flex',flexDirection:'column' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-coupon-3-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>{modal==='add'?'Add New Coupon':'Edit Coupon'}</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={handleSave} style={{ padding:24,overflowY:'auto' }}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Coupon Code <span style={{ color:'#f06548' }}>*</span></label>
                    <input style={inp} required value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="HARVEST15"/>
                  </div>
                  <div>
                    <label style={LBL}>Applies To</label>
                    <select style={inp} value={form.applicable_to} onChange={e=>setForm(f=>({...f,applicable_to:e.target.value}))}>
                      <option value="all">All Orders</option>
                      <option value="products">Specific Products</option>
                      <option value="categories">Specific Categories</option>
                    </select>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Discount Type</label>
                    <select style={inp} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₦)</option>
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Value {form.type==='percentage'?'(%)':'(₦)'} <span style={{ color:'#f06548' }}>*</span></label>
                    <input type="number" style={inp} required min={0} value={form.value} onChange={e=>setForm(f=>({...f,value:parseFloat(e.target.value)||0}))}/>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Min Order (₦)</label>
                    <input type="number" style={inp} min={0} value={form.min_order} onChange={e=>setForm(f=>({...f,min_order:parseFloat(e.target.value)||0}))}/>
                  </div>
                  <div>
                    <label style={LBL}>Max Discount (₦)</label>
                    <input type="number" style={inp} min={0} value={form.max_discount} onChange={e=>setForm(f=>({...f,max_discount:e.target.value}))} placeholder="No limit"/>
                  </div>
                  <div>
                    <label style={LBL}>Usage Limit</label>
                    <input type="number" style={inp} min={1} value={form.usage_limit} onChange={e=>setForm(f=>({...f,usage_limit:parseInt(e.target.value)||1}))}/>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Per User Limit</label>
                    <input type="number" style={inp} min={1} value={form.per_user_limit} onChange={e=>setForm(f=>({...f,per_user_limit:parseInt(e.target.value)||1}))}/>
                  </div>
                  <div>
                    <label style={LBL}>Start Date</label>
                    <input type="date" style={inp} value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))}/>
                  </div>
                  <div>
                    <label style={LBL}>End Date</label>
                    <input type="date" style={inp} value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))}/>
                  </div>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={LBL}>Description</label>
                  <textarea style={{ ...inp,resize:'vertical' }} rows={2} placeholder="Brief description…" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }} disabled={saving}>{saving?'Saving…':modal==='add'?'Add Coupon':'Save Changes'}</button>
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
                <i className="ri-delete-bin-line" style={{ fontSize:22 }}/>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Delete Coupon?</span>
                <button onClick={()=>setDeleteItem(null)} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24,textAlign:'center' }}>
                <p style={{ color:S,fontSize:14,marginBottom:24 }}>Delete coupon <strong style={{ color:'#111827' }}>{deleteItem.code}</strong>? This cannot be undone.</p>
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
