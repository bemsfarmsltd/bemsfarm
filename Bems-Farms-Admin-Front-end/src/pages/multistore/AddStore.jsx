import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const B = '#e5e7eb', S = '#6b7280'

function Card({ title, children }) {
  return (
    <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:20 }}>
      <div style={{ padding:'16px 24px',borderBottom:`1px solid ${B}` }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,color:'#111827' }}>{title}</div>
      </div>
      <div style={{ padding:24 }}>{children}</div>
    </div>
  )
}

export default function AddStore() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name:'', code:'', address:'', city:'', state:'', phone:'', email:'', manager_id:''
  })

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/stores', form)
      toast.success('Store created successfully')
      navigate('/multistore/stores')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create store')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Add Store</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Register a new store location in your network.</div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Basic Store Information">
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
            <div>
              <label style={LBL}>Store Name <span style={{ color:'#f06548' }}>*</span></label>
              <input style={inp} required value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Bems Farms — Lekki"/>
            </div>
            <div>
              <label style={LBL}>Store Code</label>
              <input style={inp} value={form.code} onChange={e=>set('code',e.target.value.toUpperCase())} placeholder="BEMS-LK"/>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={LBL}>Address</label>
            <textarea style={{ ...inp,resize:'vertical' }} rows={2} value={form.address} onChange={e=>set('address',e.target.value)} placeholder="14 Farm Road, Epe"/>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
            <div>
              <label style={LBL}>City</label>
              <input style={inp} value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Lagos"/>
            </div>
            <div>
              <label style={LBL}>State</label>
              <input style={inp} value={form.state} onChange={e=>set('state',e.target.value)} placeholder="Lagos State"/>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
            <div>
              <label style={LBL}>Phone</label>
              <input style={inp} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+234 802 345 6789"/>
            </div>
            <div>
              <label style={LBL}>Email</label>
              <input type="email" style={inp} value={form.email} onChange={e=>set('email',e.target.value)} placeholder="store@bemsfarms.ng"/>
            </div>
          </div>
        </Card>

        <Card title="Manager Assignment">
          <div>
            <label style={LBL}>Manager ID <span style={{ fontWeight:400,color:S }}>(optional — can be assigned later)</span></label>
            <input style={{ ...inp,maxWidth:340 }} value={form.manager_id} onChange={e=>set('manager_id',e.target.value)} placeholder="Enter manager user ID"/>
          </div>
        </Card>

        <div style={{ display:'flex',justifyContent:'flex-end',gap:10 }}>
          <button type="button" style={btnL} onClick={()=>navigate(-1)}><i className="ri-arrow-left-line"/>Cancel</button>
          <button type="submit" style={btnP} disabled={saving}>
            <i className="ri-store-2-line"/>{saving?'Creating…':'Create Store'}
          </button>
        </div>
      </form>
    </div>
  )
}
