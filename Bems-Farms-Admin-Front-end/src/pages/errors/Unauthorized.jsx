import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META } from '../../lib/roles'

export default function Unauthorized() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const meta      = user ? ROLE_META[user.role] : null

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f8fafc', fontFamily:'Nunito, sans-serif' }}>
      <div style={{ textAlign:'center', maxWidth:480, padding:'0 24px' }}>

        {/* Icon */}
        <div style={{ width:88, height:88, borderRadius:'50%', background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px' }}>
          <i className="ri-lock-line" style={{ fontSize:40, color:'#dc2626' }} />
        </div>

        {/* Heading */}
        <div style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:26, color:'#111827', marginBottom:10 }}>
          Access Restricted
        </div>
        <p style={{ fontSize:15, color:'#6b7280', marginBottom:24 }}>
          You don't have permission to view this page.
        </p>

        {/* Role badge */}
        {meta && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, borderRadius:50, padding:'8px 20px', background:meta.bg, border:`1px solid ${meta.color}33`, marginBottom:24 }}>
            <i className={meta.icon} style={{ color:meta.color, fontSize:16 }} />
            <span style={{ color:meta.color, fontWeight:700, fontSize:13 }}>
              Signed in as {meta.label}
            </span>
          </div>
        )}

        <p style={{ fontSize:13, color:'#6b7280', marginBottom:36, lineHeight:1.7 }}>
          Your current role <strong style={{ color:'#374151' }}>({meta?.label ?? user?.role})</strong> does not have access to this section.
          Contact your administrator if you believe this is a mistake.
        </p>

        {/* Actions */}
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <button onClick={() => navigate(-1)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:9, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>
            <i className="ri-arrow-left-line" />Go Back
          </button>
          <button onClick={() => navigate('/dashboard')} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:9, border:'none', background:'#1B4332', color:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13 }}>
            <i className="ri-dashboard-2-line" />Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
