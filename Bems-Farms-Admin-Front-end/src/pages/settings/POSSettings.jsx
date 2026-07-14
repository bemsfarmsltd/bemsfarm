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
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }
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

const BLANK = { pos_enabled:true, receipt_footer:'Thank you for shopping with Bems Farms!', print_receipt:true, ask_customer_name:false, allow_discount:true, max_discount_percent:20 }

export default function POSSettings() {
  const [form, setForm]     = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    api.get('/admin/settings/pos')
      .then(r => setForm({ ...BLANK, ...r.data.settings }))
      .catch(() => toast.error('Failed to load POS settings'))
      .finally(() => setLoading(false))
  }, [])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/settings/pos', form)
      toast.success('POS settings saved')
    } catch {
      toast.error('Failed to save POS settings')
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
        <form onSubmit={handleSave}>
          <Card title="POS System" subtitle="Core POS configuration options.">
            <Row label="Enable POS System" desc="Allow POS module access across the system.">
              <Toggle value={form.pos_enabled} onChange={()=>set('pos_enabled',!form.pos_enabled)}/>
            </Row>
            <Row label="Print Receipt" desc="Automatically print receipt after every completed sale.">
              <Toggle value={form.print_receipt} onChange={()=>set('print_receipt',!form.print_receipt)}/>
            </Row>
            <Row label="Ask Customer Name" desc="Prompt cashier to enter customer name at checkout.">
              <Toggle value={form.ask_customer_name} onChange={()=>set('ask_customer_name',!form.ask_customer_name)}/>
            </Row>
            <Row label="Allow Discounts" desc="Allow cashiers to apply manual discounts at checkout.">
              <Toggle value={form.allow_discount} onChange={()=>set('allow_discount',!form.allow_discount)}/>
            </Row>
            <Row label="Max Discount (%)" desc="Maximum discount percentage a cashier can apply.">
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <input type="number" style={{ ...inp,width:100 }} min={0} max={100} step={1} value={form.max_discount_percent} onChange={e=>set('max_discount_percent',parseInt(e.target.value)||0)} disabled={!form.allow_discount}/>
                <span style={{ fontSize:13,color:S,fontWeight:600 }}>%</span>
              </div>
            </Row>
          </Card>

          <Card title="Receipt Settings" subtitle="Customize the POS receipt footer message.">
            <div>
              <label style={LBL}>Receipt Footer Message</label>
              <textarea style={{ ...inp,resize:'vertical' }} rows={3} value={form.receipt_footer} onChange={e=>set('receipt_footer',e.target.value)} placeholder="Thank you for shopping with us!"/>
              <div style={{ fontSize:11,color:S,marginTop:4 }}>This text is printed at the bottom of every receipt.</div>
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
