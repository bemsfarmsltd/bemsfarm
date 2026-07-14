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

const BLANK_EDIT = { name:'', public_key:'', secret_key:'', webhook_url:'', is_active:false }

export default function PaymentSettings() {
  const [gateways, setGateways]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)   // null | gateway object
  const [editForm, setEditForm]   = useState(BLANK_EDIT)
  const [showKeys, setShowKeys]   = useState(false)
  const [saving, setSaving]       = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/settings/payment')
      .then(r => setGateways(r.data.gateways || []))
      .catch(() => toast.error('Failed to load payment gateways'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(gw) {
    setEditForm({ name:gw.name, public_key:gw.public_key||'', secret_key:'', webhook_url:gw.webhook_url||'', is_active:gw.is_active })
    setModal(gw)
  }

  function closeModal() { setModal(null); setEditForm(BLANK_EDIT); setShowKeys(false) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/admin/settings/payment/${modal.slug}`, editForm)
      toast.success(`${modal.name} gateway updated`)
      closeModal()
      load()
    } catch {
      toast.error('Failed to update gateway')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(gw) {
    try {
      await api.post(`/admin/settings/payment/${gw.slug}`, { ...gw, is_active: !gw.is_active })
      toast.success(`${gw.name} ${gw.is_active?'disabled':'enabled'}`)
      load()
    } catch {
      toast.error('Failed to toggle gateway')
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
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>Payment Gateways</span>
          <span style={{ fontSize:12,color:S }}>{gateways.filter(g=>g.is_active).length} of {gateways.length} active</span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center',padding:60,color:S }}><i className="ri-loader-4-line" style={{ fontSize:28 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
        ) : gateways.length === 0 ? (
          <div style={{ textAlign:'center',padding:60,color:S }}>
            <i className="ri-bank-card-line" style={{ fontSize:36,display:'block',marginBottom:8 }}/>No gateways configured
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Gateway','Slug','Public Key','Webhook URL','Active','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {gateways.map(gw=>(
                  <tr key={gw.slug}>
                    <td style={{ ...TD,fontWeight:600 }}>{gw.name}</td>
                    <td style={TD}><code style={{ background:'#f3f4f6',padding:'2px 8px',borderRadius:4,fontSize:11 }}>{gw.slug}</code></td>
                    <td style={{ ...TD,fontSize:12,color:S,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis' }}>
                      {gw.public_key ? <span title={gw.public_key}>{gw.public_key.slice(0,20)}…</span> : <span style={{ color:'#d1d5db' }}>Not set</span>}
                    </td>
                    <td style={{ ...TD,fontSize:12,color:S,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis' }}>
                      {gw.webhook_url ? <span title={gw.webhook_url}>{gw.webhook_url.slice(0,28)}…</span> : <span style={{ color:'#d1d5db' }}>Not set</span>}
                    </td>
                    <td style={TD}><Toggle value={gw.is_active} onChange={()=>toggleActive(gw)}/></td>
                    <td style={TD}>
                      <button onClick={()=>openEdit(gw)} style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:7,border:`1px solid ${B}`,background:'#f0f4ff',color:'#405189',cursor:'pointer',fontSize:12,fontWeight:600 }}>
                        <i className="ri-settings-3-line"/>Configure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {modal && (
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:520,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-bank-card-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Configure {modal.name}</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={handleSave} style={{ padding:24 }}>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Gateway Name</label>
                  <input style={inp} value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Paystack"/>
                </div>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                  <label style={{ ...LBL,marginBottom:0 }}>API Keys</label>
                  <button type="button" style={{ ...btnL,padding:'4px 10px',fontSize:11 }} onClick={()=>setShowKeys(v=>!v)}>
                    <i className={showKeys?'ri-eye-off-line':'ri-eye-line'}/>{showKeys?'Hide':'Show'}
                  </button>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
                  <div>
                    <label style={{ ...LBL,fontWeight:500,color:S }}>Public Key</label>
                    <input type={showKeys?'text':'password'} style={inp} placeholder="pk_live_…" value={editForm.public_key} onChange={e=>setEditForm(f=>({...f,public_key:e.target.value}))}/>
                  </div>
                  <div>
                    <label style={{ ...LBL,fontWeight:500,color:S }}>Secret Key <span style={{ color:'#d97706',fontSize:10 }}>(leave blank to keep existing)</span></label>
                    <input type={showKeys?'text':'password'} style={inp} placeholder="sk_live_…" value={editForm.secret_key} onChange={e=>setEditForm(f=>({...f,secret_key:e.target.value}))}/>
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Webhook URL</label>
                  <input style={inp} placeholder="https://api.bemsfarms.com/webhooks/…" value={editForm.webhook_url} onChange={e=>setEditForm(f=>({...f,webhook_url:e.target.value}))}/>
                </div>
                <div style={{ marginBottom:24,display:'flex',alignItems:'center',gap:10 }}>
                  <label style={{ fontWeight:600,fontSize:13,color:'#374151' }}>Active</label>
                  <Toggle value={editForm.is_active} onChange={()=>setEditForm(f=>({...f,is_active:!f.is_active}))}/>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }} disabled={saving}>{saving?'Saving…':'Save Gateway'}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
