import { useState, useEffect } from 'react'
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

const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const B = '#e5e7eb', S = '#6b7280'

function Toggle({ value, onChange }) {
  return (
    <div onClick={onChange} style={{ width:40,height:22,borderRadius:20,background:value?'#1B4332':'#d1d5db',position:'relative',cursor:'pointer',flexShrink:0,transition:'background .2s' }}>
      <div style={{ position:'absolute',top:2,left:value?20:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)' }}/>
    </div>
  )
}

function Card({ title, subtitle, children, action }) {
  return (
    <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:20 }}>
      <div style={{ padding:'16px 24px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,color:'#111827',marginBottom:2 }}>{title}</div>
          {subtitle&&<div style={{ fontSize:12,color:S }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      <div style={{ padding:24 }}>{children}</div>
    </div>
  )
}

function NotifRow({ label, desc, value, onChange }) {
  return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:`1px solid #f3f4f6` }}>
      <div style={{ flex:1,paddingRight:20 }}>
        <div style={{ fontWeight:600,fontSize:13,color:'#111827' }}>{label}</div>
        {desc&&<div style={{ fontSize:11,color:S,marginTop:2 }}>{desc}</div>}
      </div>
      <Toggle value={value} onChange={onChange}/>
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

const BLANK = { email_orders:true, email_low_stock:true, email_new_customer:true, sms_enabled:false, sms_orders:false, push_enabled:true }

export default function NotificationSettings() {
  const [settings, setSettings] = useState(BLANK)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    api.get('/admin/settings/notifications')
      .then(r => setSettings({ ...BLANK, ...r.data.settings }))
      .catch(() => toast.error('Failed to load notification settings'))
      .finally(() => setLoading(false))
  }, [])

  function toggle(key) { setSettings(s => ({ ...s, [key]: !s[key] })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/settings/notifications', settings)
      toast.success('Notification settings saved')
    } catch {
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Settings</div>
          <div style={{ fontSize:12,color:S,marginTop:2 }}>Manage store preferences and system configurations.</div>
        </div>
      </div>
      <SettingsNav/>

      {loading ? (
        <div style={{ textAlign:'center',padding:60,color:S }}><i className="ri-loader-4-line" style={{ fontSize:28 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
      ) : (
        <form onSubmit={handleSave}>
          {/* Notification Channels */}
          <Card title="Notification Channels" subtitle="Enable or disable notification delivery methods.">
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12 }}>
              {[
                { key:'email_orders', label:'Email (Orders)',   icon:'ri-mail-line',           color:'#405189', desc:'Order alerts by email'   },
                { key:'sms_enabled',  label:'SMS',             icon:'ri-smartphone-line',      color:'#0ab39c', desc:'SMS notifications'       },
                { key:'push_enabled', label:'Push',            icon:'ri-notification-3-line',  color:'#f57c00', desc:'Browser push alerts'     },
              ].map(c=>(
                <div key={c.key} onClick={()=>toggle(c.key)}
                  style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'16px 12px',borderRadius:12,border:`2px solid ${settings[c.key]?c.color:B}`,background:settings[c.key]?`${c.color}08`:'#fff',cursor:'pointer',transition:'all .15s',textAlign:'center' }}>
                  <i className={c.icon} style={{ fontSize:26,color:settings[c.key]?c.color:S }}/>
                  <div style={{ fontWeight:700,fontSize:12,color:settings[c.key]?'#111827':S }}>{c.label}</div>
                  <div style={{ fontSize:10,color:settings[c.key]?c.color:S,fontWeight:600 }}>{settings[c.key]?'Enabled':'Disabled'}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Email Notifications */}
          <Card title="Email Notifications" subtitle="Control which events trigger email alerts.">
            <NotifRow label="New Order Email" desc="Send email when a new order is placed" value={settings.email_orders} onChange={()=>toggle('email_orders')}/>
            <NotifRow label="Low Stock Alert Email" desc="Email when stock falls below reorder level" value={settings.email_low_stock} onChange={()=>toggle('email_low_stock')}/>
            <div style={{ paddingBottom:0,borderBottom:'none' }}>
              <NotifRow label="New Customer Email" desc="Email when a new customer registers" value={settings.email_new_customer} onChange={()=>toggle('email_new_customer')}/>
            </div>
          </Card>

          {/* SMS Notifications */}
          <Card title="SMS Notifications" subtitle="SMS alerts (requires SMS channel to be enabled above).">
            <div style={{ marginBottom:8,fontSize:12,color:settings.sms_enabled?S:'#f59e0b',background:settings.sms_enabled?'transparent':'#fffbeb',padding:settings.sms_enabled?0:'8px 12px',borderRadius:6 }}>
              {!settings.sms_enabled && <><i className="ri-alert-line"/> Enable SMS channel above to activate SMS alerts.</>}
            </div>
            <div style={{ opacity:settings.sms_enabled?1:0.5,pointerEvents:settings.sms_enabled?'auto':'none' }}>
              <NotifRow label="SMS Order Alerts" desc="Receive SMS for new orders" value={settings.sms_orders} onChange={()=>toggle('sms_orders')}/>
            </div>
          </Card>

          <div style={{ display:'flex',justifyContent:'flex-end',gap:10 }}>
            <button type="button" style={btnL}>Cancel</button>
            <button type="submit" style={btnP} disabled={saving}>
              <i className="ri-save-line"/>{saving?'Saving…':'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
