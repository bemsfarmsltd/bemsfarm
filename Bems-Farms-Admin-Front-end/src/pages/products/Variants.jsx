import { useNavigate } from 'react-router-dom'

const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }

export default function Variants() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily:'Nunito,sans-serif', minHeight:'calc(100vh - 120px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', padding:'48px 32px', maxWidth:480, textAlign:'center', boxShadow:'var(--shadow-card)' }}>
        <div style={{ width:64, height:64, borderRadius:16, background:'rgba(27, 67, 50, 0.1)', color:'#1B4332', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 24px' }}>
          <i className="ri-git-branch-line"/>
        </div>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'var(--text-primary)', margin:'0 0 10px' }}>Variant Management</h1>
        <div style={{ display:'inline-block', background:'rgba(27, 67, 50, 0.1)', color:'#1b4332', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:50, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:20 }}>Coming Soon</div>
        <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:'1.6', margin:'0 0 28px' }}>
          We are upgrading our product matrix to support robust variant options (size, weight, colors, grades, and custom packs) with individual SKU tracking and stock values. This feature will be available shortly!
        </p>
        <button style={btnP} onClick={() => navigate('/products')}>
          <i className="ri-arrow-left-line"/> Back to Products
        </button>
      </div>
    </div>
  )
}
