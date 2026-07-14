import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const NAV = [
  { label:'General',     to:'/settings/general'       },
  { label:'Tax',         to:'/settings/tax'           },
  { label:'Coupons',     to:'/settings/coupons'       },
  { label:'POS',         to:'/settings/pos'           },
  { label:'Payment',     to:'/settings/payment'       },
  { label:'Currencies',  to:'/settings/currencies'    },
  { label:'Invoices',    to:'/settings/invoices'      },
  { label:'Manager',     to:'/settings/manager'       },
  { label:'Notifications',to:'/settings/notifications'},
]

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const B = '#e5e7eb', S = '#6b7280'

function Card({ title, subtitle, children }) {
  return (
    <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:20 }}>
      <div style={{ padding:'16px 24px',borderBottom:`1px solid ${B}` }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,color:'#111827',marginBottom:2 }}>{title}</div>
        {subtitle&&<div style={{ fontSize:12,color:S }}>{subtitle}</div>}
      </div>
      <div style={{ padding:24 }}>{children}</div>
    </div>
  )
}

function Row({ label, desc, children }) {
  return (
    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,paddingBottom:18,marginBottom:18,borderBottom:`1px solid #f3f4f6`,alignItems:'start' }}>
      <div>
        <div style={{ fontWeight:600,fontSize:13,color:'#111827',marginBottom:2 }}>{label}</div>
        {desc&&<div style={{ fontSize:12,color:S }}>{desc}</div>}
      </div>
      <div>{children}</div>
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

const BLANK = { shop_name:'', shop_email:'', shop_phone:'', shop_address:'', shop_logo:'', timezone:'Africa/Lagos', default_currency:'NGN' }

export default function GeneralSettings() {
  const [form, setForm]     = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    api.get('/admin/settings/general')
      .then(r => setForm({ ...BLANK, ...r.data.settings }))
      .catch(() => toast.error('Failed to load general settings'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/settings/general', form)
      toast.success('General settings saved successfully')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Settings</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Manage store preferences and system configurations.</div>
      </div>
      <SettingsNav/>

      {loading ? (
        <div style={{ textAlign:'center',padding:60,color:S }}><i className="ri-loader-4-line" style={{ fontSize:28 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
      ) : (
        <form onSubmit={handleSave}>
          <Card title="Store & Business Information" subtitle="Displayed on invoices, receipts, and customer-facing documents.">
            <Row label="Shop Name" desc="Appears on all receipts and invoices.">
              <input style={inp} value={form.shop_name} onChange={e=>set('shop_name',e.target.value)} placeholder="Bems Farms"/>
            </Row>
            <Row label="Shop Email" desc="Receives system alerts and notifications.">
              <input type="email" style={inp} value={form.shop_email} onChange={e=>set('shop_email',e.target.value)} placeholder="contact@bemsfarms.ng"/>
            </Row>
            <Row label="Shop Phone" desc="Used for customer support communication.">
              <input style={inp} value={form.shop_phone} onChange={e=>set('shop_phone',e.target.value)} placeholder="+234 802 345 6789"/>
            </Row>
            <Row label="Shop Address" desc="Printed on invoices and delivery notes.">
              <textarea style={{ ...inp,resize:'vertical' }} rows={2} value={form.shop_address} onChange={e=>set('shop_address',e.target.value)} placeholder="14 Farm Road, Epe, Lagos"/>
            </Row>
            <Row label="Logo URL" desc="URL to your store logo (PNG/SVG). Shown on invoices.">
              <input style={inp} value={form.shop_logo} onChange={e=>set('shop_logo',e.target.value)} placeholder="https://..."/>
              {form.shop_logo && (
                <img src={form.shop_logo} alt="logo preview" style={{ marginTop:8,height:40,objectFit:'contain',borderRadius:6,border:`1px solid ${B}` }}/>
              )}
            </Row>
            <Row label="Timezone" desc="Used for timestamps, reports and scheduled tasks.">
              <select style={inp} value={form.timezone} onChange={e=>set('timezone',e.target.value)}>
                <option value="Africa/Lagos">Africa/Lagos (WAT +01:00)</option>
                <option value="UTC">UTC</option>
                <option value="Africa/Accra">Africa/Accra</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </Row>
            <Row label="Default Currency" desc="Applied to all pricing and billing.">
              <select style={inp} value={form.default_currency} onChange={e=>set('default_currency',e.target.value)}>
                <option value="NGN">NGN — Nigerian Naira (₦)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="EUR">EUR — Euro (€)</option>
              </select>
            </Row>
          </Card>

          <div style={{ display:'flex',justifyContent:'flex-end',gap:10 }}>
            <button type="button" style={btnL} onClick={()=>{ setLoading(true); api.get('/admin/settings/general').then(r=>setForm({...BLANK,...r.data.settings})).finally(()=>setLoading(false)) }}>
              <i className="ri-refresh-line"/>Reset
            </button>
            <button type="submit" style={btnP} disabled={saving}>
              <i className="ri-save-line"/>{saving?'Saving…':'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
