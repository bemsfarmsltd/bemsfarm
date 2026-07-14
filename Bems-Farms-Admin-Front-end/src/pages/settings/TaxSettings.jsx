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

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
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
    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,paddingBottom:18,marginBottom:18,borderBottom:`1px solid #f3f4f6`,alignItems:'center' }}>
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

const BLANK = { tax_enabled:true, tax_rate:7.5, tax_name:'VAT', tax_number:'', prices_include_tax:false }

export default function TaxSettings() {
  const [form, setForm]     = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    api.get('/admin/settings/tax')
      .then(r => setForm({ ...BLANK, ...r.data.settings }))
      .catch(() => toast.error('Failed to load tax settings'))
      .finally(() => setLoading(false))
  }, [])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/settings/tax', form)
      toast.success('Tax settings saved')
    } catch {
      toast.error('Failed to save tax settings')
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

      {loading ? (
        <div style={{ textAlign:'center',padding:60,color:S }}><i className="ri-loader-4-line" style={{ fontSize:28 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
      ) : (
        <>
          {!form.tax_enabled && (
            <div style={{ background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#92400e',display:'flex',alignItems:'center',gap:10 }}>
              <i className="ri-alert-line" style={{ fontSize:18 }}/>
              <span><strong>Tax system is disabled.</strong> Tax will not be applied to sales or invoices.</span>
            </div>
          )}

          <form onSubmit={handleSave}>
            <Card title="Tax Configuration" subtitle="Configure tax rates and display settings.">
              <Row label="Enable Tax System" desc="Turn tax calculation on or off across the system.">
                <Toggle value={form.tax_enabled} onChange={()=>set('tax_enabled',!form.tax_enabled)}/>
              </Row>
              <Row label="Tax Name / Label" desc="Label shown on receipts and invoices (e.g. VAT, GST).">
                <input style={inp} value={form.tax_name} onChange={e=>set('tax_name',e.target.value)} placeholder="VAT"/>
              </Row>
              <Row label="Tax Rate (%)" desc="Nigerian standard VAT is 7.5%.">
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <input type="number" style={{ ...inp,width:100 }} min={0} max={100} step={0.01} value={form.tax_rate} onChange={e=>set('tax_rate',parseFloat(e.target.value)||0)}/>
                  <span style={{ fontSize:13,color:S,fontWeight:600 }}>%</span>
                </div>
              </Row>
              <Row label="Tax Registration Number" desc="Your FIRS or relevant tax registration number.">
                <input style={inp} value={form.tax_number} onChange={e=>set('tax_number',e.target.value)} placeholder="12345678-0001"/>
              </Row>
              <Row label="Prices Include Tax" desc="Whether product prices are entered inclusive of tax.">
                <Toggle value={form.prices_include_tax} onChange={()=>set('prices_include_tax',!form.prices_include_tax)}/>
              </Row>
            </Card>

            <div style={{ display:'flex',justifyContent:'flex-end',gap:10 }}>
              <button type="button" style={btnL}>Cancel</button>
              <button type="submit" style={btnP} disabled={saving}>
                <i className="ri-save-line"/>{saving?'Saving…':'Save Changes'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
