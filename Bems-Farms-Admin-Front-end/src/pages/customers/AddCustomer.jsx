import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../lib/api'
import PageHeader from '../../components/ui/PageHeader'
import toast from 'react-hot-toast'

const REFS = ['Friend/Family Referral','Social Media (Instagram)','Social Media (Facebook)','Google Search','WhatsApp','Flyer/Poster','Walk-in / Market','TV/Radio','Other']

const TIERS = [
  { val:'Bronze',   icon:'ri-star-half-fill',    color:'#c2410c', bg:'#fff7ed', border:'#fed7aa', desc:'Starting tier — 0–999 pts'    },
  { val:'Silver',   icon:'ri-award-fill',         color:'#64748b', bg:'#f8fafc', border:'#cbd5e1', desc:'1,000–4,999 pts'               },
  { val:'Gold',     icon:'ri-medal-2-fill',       color:'#d97706', bg:'#fffbeb', border:'#fde68a', desc:'5,000–9,999 pts'               },
  { val:'Platinum', icon:'ri-vip-crown-2-fill',   color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', desc:'10,000+ pts — VIP'             },
]

const card = { background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', marginBottom:16 }
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, fontFamily:'Nunito, sans-serif', outline:'none', boxSizing:'border-box', color:'#111827', background:'#fff' }
const lbl = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }

function CardHeader({ icon, color, title }) {
  return (
    <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:8 }}>
      <i className={icon} style={{ color, fontSize:16 }} />
      <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{title}</span>
    </div>
  )
}

function Spinner() {
  return <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block', flexShrink:0 }} />
}

export default function AddCustomer() {
  const navigate = useNavigate()
  const [zones, setZones]   = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({
    first_name:'', last_name:'', phone:'', email:'', zone:'', address:'', landmark:'',
    tier:'Bronze', status:'active', referral:'', notes:'', sms_alerts:true, marketing_consent:false,
  })

  useEffect(() => {
    api.get('/admin/delivery-zones')
      .then(r => setZones((r.data.zones||r.data||[]).map(z => z.zone_name||z.name)))
      .catch(() => setZones(['Lekki Phase 1','Victoria Island','Ikeja GRA','Surulere','Yaba','Gbagada','Ikorodu','Ajah']))
  }, [])

  const fld   = (k, v) => setForm(f => ({ ...f, [k]:v }))
  const valid = form.first_name.trim() && form.last_name.trim() && form.phone.trim().length >= 11

  const handleSubmit = async e => {
    e.preventDefault()
    if (!valid) return toast.error('Please fill in all required fields')
    setSaving(true)
    try {
      await api.post('/admin/customers', { ...form, name:`${form.first_name.trim()} ${form.last_name.trim()}` })
      toast.success(`${form.first_name} ${form.last_name} registered successfully!`)
      navigate('/customers')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register customer')
    } finally { setSaving(false) }
  }

  const previewName = [form.first_name, form.last_name].filter(Boolean).join(' ')
  const previewIni  = ((form.first_name?.[0]||'')+(form.last_name?.[0]||'')).toUpperCase()||'?'

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <PageHeader
        title="Add New Customer"
        subtitle="Register a new customer to the Bems Farms platform"
        actions={
          <Link to="/customers" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', textDecoration:'none', fontSize:13, fontWeight:600 }}>
            <i className="ri-arrow-left-line" />Back
          </Link>
        }
      />

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20, alignItems:'start' }}>
          {/* Left column */}
          <div>
            {/* Personal Info */}
            <div style={card}>
              <CardHeader icon="ri-user-line" color="#3b82f6" title="Personal Information" />
              <div style={{ padding:'16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={lbl}>First Name <span style={{ color:'#dc2626' }}>*</span></label>
                  <input value={form.first_name} onChange={e => fld('first_name', e.target.value)} placeholder="e.g. Adaeze" style={inp} required />
                </div>
                <div>
                  <label style={lbl}>Last Name <span style={{ color:'#dc2626' }}>*</span></label>
                  <input value={form.last_name} onChange={e => fld('last_name', e.target.value)} placeholder="e.g. Nwosu" style={inp} required />
                </div>
                <div>
                  <label style={lbl}>Phone Number <span style={{ color:'#dc2626' }}>*</span></label>
                  <div style={{ display:'flex', gap:0 }}>
                    <span style={{ padding:'9px 10px', borderRadius:'8px 0 0 8px', border:'1.5px solid #e5e7eb', borderRight:'none', background:'#f1f5f9', fontSize:13, color:'#374151', flexShrink:0 }}>+234</span>
                    <input value={form.phone} onChange={e => fld('phone', e.target.value.replace(/\D/g,''))} maxLength={11} placeholder="08031234567" style={{ ...inp, borderRadius:'0 8px 8px 0', flex:1 }} required />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Email Address <span style={{ color:'#9ca3af', fontWeight:400 }}>(optional)</span></label>
                  <input type="email" value={form.email} onChange={e => fld('email', e.target.value)} placeholder="customer@email.com" style={inp} />
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div style={card}>
              <CardHeader icon="ri-map-pin-line" color="#22c55e" title="Delivery Address" />
              <div style={{ padding:'16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={lbl}>Area / Zone</label>
                  {zones.length > 0
                    ? <select value={form.zone} onChange={e => fld('zone', e.target.value)} style={inp}>
                        <option value="">— Select zone —</option>
                        {zones.map(z => <option key={z}>{z}</option>)}
                      </select>
                    : <input value={form.zone} onChange={e => fld('zone', e.target.value)} placeholder="e.g. Lekki Phase 1" style={inp} />
                  }
                </div>
                <div>
                  <label style={lbl}>Closest Landmark</label>
                  <input value={form.landmark} onChange={e => fld('landmark', e.target.value)} placeholder="e.g. Behind Shoprite" style={inp} />
                </div>
                <div style={{ gridColumn:'1 / -1' }}>
                  <label style={lbl}>Full Address</label>
                  <textarea value={form.address} onChange={e => fld('address', e.target.value)} rows={2} placeholder="No. 12, Admiralty Way, Lekki Phase 1, Lagos" style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div style={card}>
              <CardHeader icon="ri-settings-3-line" color="#8b5cf6" title="Preferences & Notes" />
              <div style={{ padding:'16px', display:'grid', gap:14 }}>
                <div>
                  <label style={lbl}>How did they hear about us?</label>
                  <select value={form.referral} onChange={e => fld('referral', e.target.value)} style={inp}>
                    <option value="">— Select source —</option>
                    {REFS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Internal Notes</label>
                  <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={3} placeholder="e.g. Prefers organic produce, allergic to nuts…" style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { key:'sms_alerts',         label:'Send SMS order updates & delivery alerts' },
                    { key:'marketing_consent',   label:'Marketing consent — promotions & newsletters' },
                  ].map(opt => (
                    <label key={opt.key} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, color:'#374151' }}>
                      <input type="checkbox" checked={form[opt.key]} onChange={e => fld(opt.key, e.target.checked)} style={{ accentColor:'#1B4332', width:16, height:16, cursor:'pointer' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div>
            {/* Account Settings */}
            <div style={card}>
              <CardHeader icon="ri-shield-user-line" color="#f59e0b" title="Account Settings" />
              <div style={{ padding:'16px' }}>
                <div style={{ marginBottom:16 }}>
                  <label style={lbl}>Account Status</label>
                  <select value={form.status} onChange={e => fld('status', e.target.value)} style={inp}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Initial Loyalty Tier</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                    {TIERS.map(t => (
                      <div key={t.val} onClick={() => fld('tier', t.val)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:9, border:`1.5px solid ${form.tier===t.val?t.color:'#e2e8f0'}`, background: form.tier===t.val?t.bg:'#fff', cursor:'pointer', transition:'all 0.12s' }}>
                        <i className={t.icon} style={{ color:t.color, fontSize:16, flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color: form.tier===t.val?t.color:'#374151' }}>{t.val}</div>
                          <div style={{ fontSize:10, color:'#9ca3af' }}>{t.desc}</div>
                        </div>
                        {form.tier===t.val && <i className="ri-check-line" style={{ color:t.color, flexShrink:0 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            {(form.first_name || form.phone) && (
              <div style={{ ...card, border:'1px solid #bfdbfe' }}>
                <div style={{ padding:'10px 14px', borderBottom:'1px solid #bfdbfe', background:'#f0f9ff' }}>
                  <span style={{ fontWeight:700, fontSize:12, color:'#0369a1' }}>Preview</span>
                </div>
                <div style={{ padding:'14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:'#3b82f6', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 }}>{previewIni}</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{previewName||'—'}</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{form.phone||'—'}</div>
                    </div>
                  </div>
                  {form.zone && <div style={{ fontSize:11, color:'#6b7280', display:'flex', alignItems:'center', gap:4 }}><i className="ri-map-pin-line" />{form.zone}</div>}
                </div>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button type="submit" disabled={saving} style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background: saving?'#40916C':'#1B4332', color:'#fff', fontSize:14, fontWeight:700, cursor: saving?'not-allowed':'pointer', fontFamily:'Nunito, sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {saving && <Spinner />}
                <i className="ri-user-add-line" />
                {saving ? 'Registering…' : 'Register Customer'}
              </button>
              <Link to="/customers" style={{ display:'block', textAlign:'center', padding:'10px', borderRadius:10, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', textDecoration:'none', fontSize:13, fontWeight:600 }}>Cancel</Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
