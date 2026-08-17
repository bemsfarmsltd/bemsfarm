import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ROLES, ROLE_META } from '../../lib/roles'

const inp  = { display:'block',width:'100%',padding:'9px 12px',border:'1.5px solid var(--border)',borderRadius:8,fontFamily:'var(--body-font)',fontSize:13,outline:'none',background:'var(--bg-card)',boxSizing:'border-box',color:'var(--text-primary)' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'var(--text-secondary)',marginBottom:5 }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'var(--body-font)',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'10px 18px',borderRadius:9,border:'1.5px solid var(--border)',background:'var(--bg-card)',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'var(--body-font)',fontWeight:600,fontSize:13,textDecoration:'none' }
const B = 'var(--border)', S = '#6b7280'

const SHIFTS = ['morning', 'afternoon', 'evening']
const SYSTEM_ROLES = Object.values(ROLES)

const BLANK = {
  name:'', email:'', phone:'', password:'',
  department:'', role:'', shift:'morning', system_role:'cashier',
  basic_salary:'', hire_date:'',
  bank_name:'', account_number:'', account_name:'',
  emergency_contact:'', emergency_phone:'',
  address:'', notes:'',
}

function Section({ title, icon, children }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:12, border:`1px solid ${B}`, boxShadow:'0 1px 4px rgba(0,0,0,.05)', marginBottom:16, overflow:'hidden' }}>
      <div style={{ padding:'12px 18px', borderBottom:`1px solid ${B}`, display:'flex', alignItems:'center', gap:8, background:'var(--bg-subtle)' }}>
        <i className={icon} style={{ color:'#1B4332', fontSize:15 }}/>
        <span style={{ fontFamily:'var(--heading-font)', fontWeight:700, fontSize:13 }}>{title}</span>
      </div>
      <div style={{ padding:18 }}>{children}</div>
    </div>
  )
}

export default function AddStaff() {
  const navigate = useNavigate()
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null) // { staff, temp_password }

  const sf = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim())        { toast.error('Name is required'); return }
    if (!form.email.trim())       { toast.error('Email is required'); return }
    if (!form.department.trim())  { toast.error('Department is required'); return }
    if (!form.role.trim())        { toast.error('Role / position is required'); return }

    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (!payload.basic_salary) delete payload.basic_salary
      if (!payload.hire_date) delete payload.hire_date
      const { data } = await api.post('/admin/staff', payload)
      toast.success('Staff member created')
      setResult(data)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create staff member')
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    return (
      <div style={{ fontFamily:'var(--body-font)', maxWidth:520, margin:'40px auto' }}>
        <div style={{ background:'var(--bg-card)', borderRadius:14, border:`1px solid ${B}`, boxShadow:'0 4px 20px rgba(0,0,0,.08)', padding:32, textAlign:'center' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:38 }}>✅</div>
          <h3 style={{ fontFamily:'var(--heading-font)', fontWeight:700, fontSize:17, marginBottom:6 }}>Staff Member Created</h3>
          <p style={{ color:S, fontSize:13, marginBottom:20 }}>
            <strong style={{ color:'var(--text-primary)' }}>{result.staff.name}</strong> ({result.staff.employee_code}) has been added.
          </p>
          {result.temp_password && (
            <div style={{ background:'var(--bg-subtle)', border:`1px solid ${B}`, borderRadius:10, padding:16, marginBottom:20, textAlign:'left' }}>
              <div style={{ fontSize:11, fontWeight:700, color:S, textTransform:'uppercase', marginBottom:6 }}>Temporary Password</div>
              <div style={{ fontFamily:'monospace', fontSize:16, fontWeight:700, color:'#1B4332' }}>{result.temp_password}</div>
              <div style={{ fontSize:11, color:S, marginTop:8 }}>Share this with the new staff member securely — it won't be shown again.</div>
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button style={{ ...btnL, flex:1, justifyContent:'center' }} onClick={() => { setResult(null); setForm(BLANK) }}>Add Another</button>
            <button style={{ ...btnP, flex:1, justifyContent:'center' }} onClick={() => navigate('/staff')}>Go to Staff List</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily:'var(--body-font)', maxWidth:820 }}>
      <div style={{ marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'var(--heading-font)',fontWeight:800,fontSize:20,color:'var(--text-primary)' }}>Add Staff</div>
          <div style={{ fontSize:12,color:S,marginTop:2 }}>Create a new employee record and system account.</div>
        </div>
        <Link to="/staff" style={btnL}><i className="ri-arrow-left-line"/>Back to Staff</Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Section title="Account Information" icon="ri-user-line">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={LBL}>Full Name <span style={{ color:'#f06548' }}>*</span></label>
              <input style={inp} required value={form.name} onChange={sf('name')} placeholder="Amara Obi"/>
            </div>
            <div>
              <label style={LBL}>Email <span style={{ color:'#f06548' }}>*</span></label>
              <input type="email" style={inp} required value={form.email} onChange={sf('email')} placeholder="amara@bemsfarms.com"/>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label style={LBL}>Phone</label>
              <input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g,'') }))} maxLength={11} placeholder="08100001234"/>
            </div>
            <div>
              <label style={LBL}>Password <span style={{ fontWeight:400, color:S }}>(optional)</span></label>
              <input type="text" style={inp} value={form.password} onChange={sf('password')} placeholder="Leave blank to auto-generate"/>
            </div>
          </div>
        </Section>

        <Section title="Role & Employment" icon="ri-briefcase-line">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={LBL}>Department <span style={{ color:'#f06548' }}>*</span></label>
              <input style={inp} required value={form.department} onChange={sf('department')} placeholder="Kitchen, Delivery, Front Desk…"/>
            </div>
            <div>
              <label style={LBL}>Role / Position <span style={{ color:'#f06548' }}>*</span></label>
              <input style={inp} required value={form.role} onChange={sf('role')} placeholder="Head Chef, Cashier, Rider…"/>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
            <div>
              <label style={LBL}>System Role <span style={{ color:'#f06548' }}>*</span></label>
              <select style={inp} value={form.system_role} onChange={sf('system_role')}>
                {SYSTEM_ROLES.map(r => <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Shift</label>
              <select style={inp} value={form.shift} onChange={sf('shift')}>
                {SHIFTS.map(s => <option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Hire Date</label>
              <input type="date" style={inp} value={form.hire_date} onChange={sf('hire_date')}/>
            </div>
          </div>
          <div style={{ fontSize:11, color:S, marginTop:10 }}>
            System role controls what this person can access across the admin dashboard and POS — it's separate from their job title above.
          </div>
        </Section>

        <Section title="Payroll" icon="ri-money-dollar-circle-line">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
            <div>
              <label style={LBL}>Basic Salary (₦)</label>
              <input type="number" min="0" style={inp} value={form.basic_salary} onChange={sf('basic_salary')} placeholder="0.00"/>
            </div>
            <div>
              <label style={LBL}>Bank Name</label>
              <input style={inp} value={form.bank_name} onChange={sf('bank_name')} placeholder="GTBank"/>
            </div>
            <div>
              <label style={LBL}>Account Number</label>
              <input style={inp} value={form.account_number} onChange={sf('account_number')} placeholder="0123456789"/>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={LBL}>Account Name</label>
            <input style={inp} value={form.account_name} onChange={sf('account_name')} placeholder="Matches bank account"/>
          </div>
        </Section>

        <Section title="Emergency Contact & Address" icon="ri-contacts-line">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={LBL}>Emergency Contact Name</label>
              <input style={inp} value={form.emergency_contact} onChange={sf('emergency_contact')}/>
            </div>
            <div>
              <label style={LBL}>Emergency Contact Phone</label>
              <input style={inp} value={form.emergency_phone} onChange={sf('emergency_phone')}/>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={LBL}>Address</label>
            <textarea rows={2} style={{ ...inp, resize:'vertical' }} value={form.address} onChange={sf('address')}/>
          </div>
          <div>
            <label style={LBL}>Notes</label>
            <textarea rows={2} style={{ ...inp, resize:'vertical' }} value={form.notes} onChange={sf('notes')} placeholder="Anything else worth noting…"/>
          </div>
        </Section>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Link to="/staff" style={btnL}>Cancel</Link>
          <button type="submit" style={btnP} disabled={saving}>
            {saving ? 'Creating…' : <><i className="ri-user-add-line"/>Create Staff Member</>}
          </button>
        </div>
      </form>
    </div>
  )
}