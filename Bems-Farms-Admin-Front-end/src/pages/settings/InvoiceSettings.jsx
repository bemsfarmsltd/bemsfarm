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

const BLANK = { invoice_prefix:'BEMS-INV', next_invoice_number:1001, invoice_footer:'Thank you for your business!', invoice_notes:'', due_days:7 }

export default function InvoiceSettings() {
  const [form, setForm]     = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    api.get('/admin/settings/invoices')
      .then(r => setForm({ ...BLANK, ...r.data.settings }))
      .catch(() => toast.error('Failed to load invoice settings'))
      .finally(() => setLoading(false))
  }, [])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/settings/invoices', form)
      toast.success('Invoice settings saved')
    } catch {
      toast.error('Failed to save invoice settings')
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
          <Card title="Invoice Numbering" subtitle="Define the prefix and auto-increment pattern for invoice numbers.">
            <Row label="Invoice Prefix" desc="Prepended to every invoice number (e.g. BEMS-INV-1001).">
              <input style={inp} value={form.invoice_prefix} onChange={e=>set('invoice_prefix',e.target.value)} placeholder="BEMS-INV"/>
            </Row>
            <Row label="Next Invoice Number" desc="The next number in the auto-increment sequence.">
              <input type="number" style={inp} min={1} value={form.next_invoice_number} onChange={e=>set('next_invoice_number',parseInt(e.target.value)||1)}/>
            </Row>
            <div style={{ padding:'10px 14px',background:'#f0f4ff',borderRadius:8,fontSize:12,color:'#405189' }}>
              <i className="ri-information-line"/> Preview: <strong>{form.invoice_prefix}-{String(form.next_invoice_number).padStart(4,'0')}</strong>
            </div>
          </Card>

          <Card title="Invoice Format" subtitle="Control how invoices look and what they display.">
            <Row label="Payment Due Days" desc="Number of days after invoice date before payment is due.">
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <input type="number" style={{ ...inp,width:100 }} min={0} value={form.due_days} onChange={e=>set('due_days',parseInt(e.target.value)||0)}/>
                <span style={{ fontSize:13,color:S,fontWeight:600 }}>days</span>
              </div>
            </Row>
          </Card>

          <Card title="Invoice Content" subtitle="Footer and notes printed on every invoice.">
            <div style={{ marginBottom:18 }}>
              <label style={LBL}>Invoice Footer</label>
              <textarea style={{ ...inp,resize:'vertical' }} rows={3} value={form.invoice_footer} onChange={e=>set('invoice_footer',e.target.value)} placeholder="Thank you for your business!"/>
            </div>
            <div>
              <label style={LBL}>Invoice Notes / Terms</label>
              <textarea style={{ ...inp,resize:'vertical' }} rows={3} value={form.invoice_notes} onChange={e=>set('invoice_notes',e.target.value)} placeholder="Payment due within 7 days of invoice date."/>
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
