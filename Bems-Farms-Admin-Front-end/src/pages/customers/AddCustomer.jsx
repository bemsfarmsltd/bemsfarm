import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const ZONES = ['Lekki Phase 1','Lekki Phase 2','Victoria Island','Ikoyi','Ajah','Sangotedo','Ikeja GRA','Maryland','Gbagada','Surulere','Yaba','Ogba','Oshodi','Anthony Village','Ikorodu','Opebi','Oworonshoki','Festac','Amuwo Odofin','Isolo','Mushin','Ketu','Mile 12','Agege']
const REFS = ['Friend/Family Referral','Social Media (Instagram)','Social Media (Facebook)','Google Search','WhatsApp','Flyer/Poster','Walk-in / Market','TV/Radio','Other']

export default function AddCustomer() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName:'', lastName:'', phone:'', altPhone:'', email:'',
    zone:'Lekki Phase 1', address:'', landmark:'',
    tier:'Bronze', status:'active', referral:'', notes:'',
    marketingConsent:false, smsAlerts:true,
  })
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState(false)

  const fld = (k,v) => setForm(f => ({ ...f, [k]:v }))
  const valid = form.firstName.trim() && form.lastName.trim() && form.phone.trim().length >= 11

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (!valid) return
    setSaved(true)
  }

  if (saved) return (
    <div className="container-fluid">
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <div className="rounded-circle d-flex align-items-center justify-content-center mb-4"
          style={{width:80,height:80,background:'#f0fdf4'}}>
          <i className="ri-user-follow-line" style={{fontSize:36,color:'#22c55e'}}/>
        </div>
        <h5 className="fw-bold mb-1">Customer Added!</h5>
        <p className="text-muted mb-4">{form.firstName} {form.lastName} has been registered successfully.</p>
        <div className="d-flex gap-3">
          <button className="btn btn-outline-secondary" onClick={()=>{ setSaved(false); setSubmitted(false); setForm({firstName:'',lastName:'',phone:'',altPhone:'',email:'',zone:'Lekki Phase 1',address:'',landmark:'',tier:'Bronze',status:'active',referral:'',notes:'',marketingConsent:false,smsAlerts:true}) }}>
            Add Another
          </button>
          <Link to="/customers" className="btn btn-primary">View All Customers</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="container-fluid">
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Add New Customer</h6>
          <p className="text-muted mb-0" style={{fontSize:12}}>Register a new customer to the Bems Farms platform</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item text-muted"><Link to="/customers" style={{color:'inherit',textDecoration:'none'}}>Customers</Link></li>
          <li className="breadcrumb-item active">Add Customer</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="row g-4">
          {/* Left column */}
          <div className="col-lg-8">
            {/* Personal Info */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom d-flex align-items-center gap-2">
                <i className="ri-user-line" style={{color:'#3b82f6'}}/>
                <span className="fw-medium" style={{fontSize:14}}>Personal Information</span>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" style={{fontSize:12}}>First Name <span className="text-danger">*</span></label>
                    <input className={`form-control form-control-sm ${submitted&&!form.firstName?'is-invalid':''}`}
                      placeholder="e.g. Adaeze" value={form.firstName} onChange={e=>fld('firstName',e.target.value)}/>
                    {submitted&&!form.firstName && <div className="invalid-feedback">First name is required.</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{fontSize:12}}>Last Name <span className="text-danger">*</span></label>
                    <input className={`form-control form-control-sm ${submitted&&!form.lastName?'is-invalid':''}`}
                      placeholder="e.g. Nwosu" value={form.lastName} onChange={e=>fld('lastName',e.target.value)}/>
                    {submitted&&!form.lastName && <div className="invalid-feedback">Last name is required.</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{fontSize:12}}>Phone Number <span className="text-danger">*</span></label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">+234</span>
                      <input className={`form-control ${submitted&&form.phone.length<11?'is-invalid':''}`}
                        placeholder="08031234567" maxLength={11} value={form.phone} onChange={e=>fld('phone',e.target.value.replace(/\D/g,''))}/>
                    </div>
                    {submitted&&form.phone.length<11 && <div className="text-danger" style={{fontSize:11,marginTop:4}}>Enter a valid 11-digit number.</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{fontSize:12}}>Alt. Phone <span className="text-muted">(optional)</span></label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">+234</span>
                      <input className="form-control" placeholder="07056789012" maxLength={11}
                        value={form.altPhone} onChange={e=>fld('altPhone',e.target.value.replace(/\D/g,''))}/>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label" style={{fontSize:12}}>Email Address <span className="text-muted">(optional)</span></label>
                    <input className="form-control form-control-sm" type="email"
                      placeholder="customer@email.com" value={form.email} onChange={e=>fld('email',e.target.value)}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom d-flex align-items-center gap-2">
                <i className="ri-map-pin-line" style={{color:'#22c55e'}}/>
                <span className="fw-medium" style={{fontSize:14}}>Delivery Address</span>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" style={{fontSize:12}}>Area / Zone (Lagos)</label>
                    <select className="form-select form-select-sm" value={form.zone} onChange={e=>fld('zone',e.target.value)}>
                      {ZONES.map(z=><option key={z}>{z}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{fontSize:12}}>Closest Landmark</label>
                    <input className="form-control form-control-sm" placeholder="e.g. Behind Shoprite"
                      value={form.landmark} onChange={e=>fld('landmark',e.target.value)}/>
                  </div>
                  <div className="col-12">
                    <label className="form-label" style={{fontSize:12}}>Full Address</label>
                    <textarea className="form-control form-control-sm" rows={2}
                      placeholder="No. 12, Admiralty Way, Lekki Phase 1, Lagos"
                      value={form.address} onChange={e=>fld('address',e.target.value)}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom d-flex align-items-center gap-2">
                <i className="ri-settings-3-line" style={{color:'#8b5cf6'}}/>
                <span className="fw-medium" style={{fontSize:14}}>Preferences & Notes</span>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label" style={{fontSize:12}}>How did they hear about us?</label>
                    <select className="form-select form-select-sm" value={form.referral} onChange={e=>fld('referral',e.target.value)}>
                      <option value="">— Select source —</option>
                      {REFS.map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label" style={{fontSize:12}}>Internal Notes</label>
                    <textarea className="form-control form-control-sm" rows={3}
                      placeholder="e.g. Prefers organic produce, allergic to nuts, prefers morning deliveries…"
                      value={form.notes} onChange={e=>fld('notes',e.target.value)}/>
                  </div>
                  <div className="col-12">
                    <div className="d-flex flex-column gap-2">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="sms" checked={form.smsAlerts}
                          onChange={e=>fld('smsAlerts',e.target.checked)}/>
                        <label className="form-check-label" htmlFor="sms" style={{fontSize:13}}>
                          Send SMS order updates & delivery alerts
                        </label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="mkt" checked={form.marketingConsent}
                          onChange={e=>fld('marketingConsent',e.target.checked)}/>
                        <label className="form-check-label" htmlFor="mkt" style={{fontSize:13}}>
                          Marketing consent — promotions & newsletters
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="col-lg-4">
            {/* Account Settings */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom d-flex align-items-center gap-2">
                <i className="ri-shield-user-line" style={{color:'#f59e0b'}}/>
                <span className="fw-medium" style={{fontSize:14}}>Account Settings</span>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label" style={{fontSize:12}}>Account Status</label>
                  <select className="form-select form-select-sm" value={form.status} onChange={e=>fld('status',e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{fontSize:12}}>Initial Loyalty Tier</label>
                  <div className="d-flex flex-column gap-2 mt-1">
                    {[
                      {val:'Bronze',  icon:'ri-star-half-fill',     color:'#c2410c', bg:'#fff7ed', border:'#fed7aa', desc:'Starting tier — 0–999 pts' },
                      {val:'Silver',  icon:'ri-award-fill',          color:'#64748b', bg:'#f8fafc', border:'#cbd5e1', desc:'1,000–4,999 pts' },
                      {val:'Gold',    icon:'ri-medal-2-fill',        color:'#d97706', bg:'#fffbeb', border:'#fde68a', desc:'5,000–9,999 pts' },
                      {val:'Platinum',icon:'ri-vip-crown-2-fill',    color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', desc:'10,000+ pts — VIP' },
                    ].map(t => (
                      <div key={t.val} onClick={()=>fld('tier',t.val)}
                        className="d-flex align-items-center gap-2 p-2 rounded border"
                        style={{cursor:'pointer',background:form.tier===t.val?t.bg:'',border:`1px solid ${form.tier===t.val?t.color:'#e2e8f0'} !important`,transition:'all 0.15s'}}>
                        <i className={t.icon} style={{color:t.color,fontSize:16}}/>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:form.tier===t.val?t.color:'#374151'}}>{t.val}</div>
                          <div className="text-muted" style={{fontSize:10}}>{t.desc}</div>
                        </div>
                        {form.tier===t.val && <i className="ri-check-line ms-auto" style={{color:t.color}}/>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary preview */}
            {(form.firstName || form.phone) && (
              <div className="card border-0 shadow-sm mb-4" style={{border:'1px solid #e0f2fe !important'}}>
                <div className="card-header border-bottom" style={{background:'#f0f9ff'}}>
                  <span className="fw-medium" style={{fontSize:13,color:'#0369a1'}}>Preview</span>
                </div>
                <div className="card-body p-3">
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                      style={{width:40,height:40,background:'#3b82f6',fontSize:14}}>
                      {((form.firstName?.[0]||'')+(form.lastName?.[0]||'')).toUpperCase()||'?'}
                    </div>
                    <div>
                      <div className="fw-semibold">{[form.firstName,form.lastName].filter(Boolean).join(' ')||'—'}</div>
                      <div className="text-muted" style={{fontSize:11}}>{form.phone||'—'}</div>
                    </div>
                  </div>
                  <div className="text-muted" style={{fontSize:11}}>
                    <i className="ri-map-pin-line me-1"/>{form.zone}
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="d-flex flex-column gap-2">
              <button type="submit" className="btn btn-primary">
                <i className="ri-user-add-line me-1"/>Register Customer
              </button>
              <Link to="/customers" className="btn btn-outline-secondary">Cancel</Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
