import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

const fmt    = n => `₦${Number(n).toLocaleString()}`
const ini    = name => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const fmtPts = n => Number(n).toLocaleString() + ' pts'

const INIT_CUSTOMERS = [
  { id:'CUS-001', name:'Adaeze Nwosu',    phone:'08031234567', email:'adaeze.nwosu@gmail.com',    zone:'Lekki Phase 1',   joined:'2024-03-14', orders:24, totalSpent:412_000, points:4120,  tier:'Gold',     status:'active',   lastOrder:'2026-06-25' },
  { id:'CUS-002', name:'Seun Adesanya',   phone:'07056789012', email:'seun.adesanya@yahoo.com',   zone:'Ikeja GRA',       joined:'2024-07-02', orders:18, totalSpent:284_500, points:2845,  tier:'Silver',   status:'active',   lastOrder:'2026-06-27' },
  { id:'CUS-003', name:'Chukwuemeka Eze', phone:'09012345678', email:'emeka.eze@hotmail.com',     zone:'Surulere',        joined:'2025-01-18', orders:7,  totalSpent:98_200,  points:982,   tier:'Bronze',   status:'active',   lastOrder:'2026-06-22' },
  { id:'CUS-004', name:'Funke Oladele',   phone:'08023456789', email:'funke.oladele@gmail.com',   zone:'Victoria Island', joined:'2023-11-05', orders:41, totalSpent:820_000, points:9840,  tier:'Platinum', status:'active',   lastOrder:'2026-06-27' },
  { id:'CUS-005', name:'Tolulope Badmus', phone:'07034512890', email:'tolu.badmus@gmail.com',     zone:'Ajah',            joined:'2025-03-22', orders:5,  totalSpent:62_400,  points:624,   tier:'Bronze',   status:'active',   lastOrder:'2026-06-18' },
  { id:'CUS-006', name:'Ngozi Umeh',      phone:'08145678901', email:'ngozi.umeh@gmail.com',      zone:'Yaba',            joined:'2024-09-10', orders:12, totalSpent:178_000, points:1780,  tier:'Silver',   status:'active',   lastOrder:'2026-06-24' },
  { id:'CUS-007', name:'Babatunde Ojo',   phone:'08067890123', email:'tunde.ojo@company.ng',      zone:'Gbagada',         joined:'2024-05-30', orders:29, totalSpent:524_000, points:5240,  tier:'Gold',     status:'active',   lastOrder:'2026-06-26' },
  { id:'CUS-008', name:'Aminat Suleiman', phone:'07089012345', email:'aminat.s@gmail.com',        zone:'Ikorodu',         joined:'2025-05-11', orders:3,  totalSpent:28_500,  points:285,   tier:'Bronze',   status:'active',   lastOrder:'2026-06-10' },
  { id:'CUS-009', name:'Emeka Okonkwo',   phone:'09034567890', email:'emeka.okonkwo@gmail.com',   zone:'Lekki Phase 2',   joined:'2024-02-19', orders:33, totalSpent:648_000, points:7200,  tier:'Gold',     status:'active',   lastOrder:'2026-06-23' },
  { id:'CUS-010', name:'Kemi Adeleke',    phone:'08156789012', email:'kemi.adeleke@yahoo.com',    zone:'Maryland',        joined:'2025-02-08', orders:8,  totalSpent:112_000, points:1120,  tier:'Bronze',   status:'inactive', lastOrder:'2026-04-30' },
  { id:'CUS-011', name:'Chidi Okeke',     phone:'07023456789', email:'chidi.okeke@gmail.com',     zone:'Oshodi',          joined:'2024-08-14', orders:15, totalSpent:234_000, points:2340,  tier:'Silver',   status:'active',   lastOrder:'2026-06-20' },
  { id:'CUS-012', name:'Bisi Awojobi',    phone:'08178901234', email:'bisi.awojobi@gmail.com',    zone:'Ogba',            joined:'2023-09-22', orders:52, totalSpent:1_040_000,points:11200,tier:'Platinum', status:'active',   lastOrder:'2026-06-27' },
  { id:'CUS-013', name:'Yusuf Abdullahi', phone:'09045678901', email:'yusuf.abdullahi@yahoo.com', zone:'Sangotedo',       joined:'2025-04-03', orders:4,  totalSpent:44_000,  points:440,   tier:'Bronze',   status:'active',   lastOrder:'2026-06-15' },
  { id:'CUS-014', name:'Chioma Obi',      phone:'08090123456', email:'chioma.obi@gmail.com',      zone:'Anthony Village', joined:'2024-12-01', orders:10, totalSpent:152_000, points:1520,  tier:'Silver',   status:'active',   lastOrder:'2026-06-21' },
  { id:'CUS-015', name:'Lanre Fasanya',   phone:'07012345678', email:'lanre.fasanya@outlook.com', zone:'Opebi',           joined:'2024-04-17', orders:21, totalSpent:360_000, points:3600,  tier:'Silver',   status:'inactive', lastOrder:'2026-05-12' },
]

const TIER_CFG = {
  Platinum:{ bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe', icon:'ri-vip-crown-2-fill'  },
  Gold:    { bg:'#fffbeb', color:'#d97706', border:'#fde68a', icon:'ri-medal-2-fill'       },
  Silver:  { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1', icon:'ri-award-fill'         },
  Bronze:  { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', icon:'ri-star-half-fill'     },
}
const STATUS_CFG = {
  active:  { bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0', label:'Active'   },
  inactive:{ bg:'#fef2f2', color:'#dc2626', border:'#fecaca', label:'Inactive' },
}
const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16','#a855f7','#ef4444','#10b981','#d97706','#6366f1']

export default function CustomersList() {
  const [customers, setCustomers] = useState(INIT_CUSTOMERS)
  const [search, setSearch]   = useState('')
  const [filterTier, setTier] = useState('all')
  const [filterSt, setSt]     = useState('all')
  const [selected, setSelected] = useState(null)
  const [modal, setModal]     = useState(null) // 'view' | 'suspend' | 'delete'

  const filtered = useMemo(() => customers.filter(c => {
    if (filterTier !== 'all' && c.tier !== filterTier) return false
    if (filterSt   !== 'all' && c.status !== filterSt) return false
    if (search) {
      const q = search.toLowerCase()
      return c.name.toLowerCase().includes(q) || c.phone.includes(q) ||
             c.email.toLowerCase().includes(q) || c.zone.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    }
    return true
  }), [customers, search, filterTier, filterSt])

  const closeModal = () => { setModal(null); setSelected(null) }

  function toggleStatus(c) {
    setCustomers(prev => prev.map(x => x.id === c.id
      ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x))
  }
  function deleteCustomer() {
    setCustomers(prev => prev.filter(c => c.id !== selected.id))
    closeModal()
  }

  // KPIs
  const totalRevenue = customers.reduce((s,c)=>s+c.totalSpent, 0)
  const avgOrderVal  = Math.round(totalRevenue / customers.reduce((s,c)=>s+c.orders,0))
  const newThisMonth = customers.filter(c=>c.joined>='2026-06-01').length
  const platinum     = customers.filter(c=>c.tier==='Platinum').length

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Online Customers</h6>
          <p className="text-muted mb-0" style={{fontSize:12}}>
            Self-registered customers ordering via the Bems Farms app &amp; website
          </p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item text-muted">Customers</li>
          <li className="breadcrumb-item active">All Customers</li>
        </ul>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Customers',   val:customers.length,      icon:'ri-group-line',             color:'#3b82f6', bg:'#eff6ff' },
          { label:'Active',            val:customers.filter(c=>c.status==='active').length, icon:'ri-user-follow-line', color:'#22c55e', bg:'#f0fdf4' },
          { label:'New This Month',    val:newThisMonth,           icon:'ri-user-add-line',          color:'#0ea5e9', bg:'#f0f9ff' },
          { label:'Platinum Members',  val:platinum,               icon:'ri-vip-crown-2-line',       color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Total Revenue',     val:fmt(totalRevenue),      icon:'ri-money-naira-circle-line',color:'#22c55e', bg:'#f0fdf4' },
          { label:'Avg Order Value',   val:fmt(avgOrderVal),       icon:'ri-shopping-cart-2-line',   color:'#f59e0b', bg:'#fffbeb' },
        ].map((k,i) => (
          <div key={i} className="col-6 col-md-4 col-xl-2">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <div className="text-muted mb-1" style={{fontSize:11}}>{k.label}</div>
                    <div className="fw-bold" style={{fontSize:18}}>{k.val}</div>
                  </div>
                  <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{width:38,height:38,background:k.bg}}>
                    <i className={`${k.icon} fs-18`} style={{color:k.color}}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tier tabs */}
      <div className="d-flex gap-2 flex-wrap mb-3 align-items-center">
        {['all','Platinum','Gold','Silver','Bronze'].map(t => {
          const cfg = t !== 'all' ? TIER_CFG[t] : null
          const count = t === 'all' ? customers.length : customers.filter(c=>c.tier===t).length
          const isActive = filterTier === t
          return (
            <button key={t} onClick={()=>setTier(t)} className="btn btn-sm" style={{
              fontSize:11,
              background: isActive ? (cfg ? cfg.color : '#1e293b') : '#f8fafc',
              color: isActive ? '#fff' : '#64748b',
              border:`1px solid ${isActive ? 'transparent' : '#e2e8f0'}`,
            }}>
              {cfg && <i className={`${cfg.icon} me-1`}/>}
              {t==='all' ? 'All Tiers' : t} ({count})
            </button>
          )
        })}
        <div className="ms-auto d-flex gap-2">
          {['active','inactive'].map(s => (
            <button key={s} onClick={()=>setSt(filterSt===s?'all':s)} className="btn btn-sm" style={{
              fontSize:11,
              background: filterSt===s ? STATUS_CFG[s].color : '#f8fafc',
              color: filterSt===s ? '#fff' : '#64748b',
              border:`1px solid ${filterSt===s ? 'transparent' : '#e2e8f0'}`,
            }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="input-group">
            <span className="input-group-text bg-light border-end-0"><i className="ri-search-line text-muted"/></span>
            <input type="text" className="form-control border-start-0 bg-light"
              placeholder="Search by name, phone, email, area or ID…"
              value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && (
              <button className="btn btn-outline-secondary" onClick={()=>setSearch('')}>
                <i className="ri-close-line"/>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-2">
          <span style={{fontSize:13}}>
            {filtered.length} customer{filtered.length!==1?'s':''}
          </span>
          <span className="text-muted" style={{fontSize:12}}>
            Combined revenue: <strong>{fmt(filtered.reduce((s,c)=>s+c.totalSpent,0))}</strong>
          </span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{fontSize:13}}>
            <thead style={{background:'#f8fafc'}}>
              <tr>
                {['CUSTOMER','CONTACT','ZONE','TIER','ORDERS','TOTAL SPENT','POINTS','LAST ORDER','STATUS',''].map(h=>(
                  <th key={h} className="px-3 py-2 fw-medium text-muted" style={{fontSize:11}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 && (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-muted">
                    <i className="ri-user-search-line d-block mb-2" style={{fontSize:28}}/>
                    No customers match your search.
                  </td>
                </tr>
              )}
              {filtered.map((c,i) => {
                const tc = TIER_CFG[c.tier]
                const sc = STATUS_CFG[c.status]
                const colorIdx = INIT_CUSTOMERS.findIndex(x=>x.id===c.id)
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2">
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                          style={{width:38,height:38,background:AVATAR_COLORS[colorIdx%AVATAR_COLORS.length],fontSize:13}}>
                          {ini(c.name)}
                        </div>
                        <div>
                          <Link to={`/customers/${c.id}`} style={{fontWeight:600,color:'#1e293b',textDecoration:'none'}}>
                            {c.name}
                          </Link>
                          <div className="text-muted" style={{fontSize:10}}>{c.id} · Joined {c.joined}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div style={{fontSize:12}}>{c.phone}</div>
                      <div className="text-muted" style={{fontSize:11}}>{c.email}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="d-flex align-items-center gap-1" style={{fontSize:12}}>
                        <i className="ri-map-pin-line text-muted" style={{fontSize:11}}/>
                        {c.zone}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="badge d-flex align-items-center gap-1"
                        style={{fontSize:10,background:tc.bg,color:tc.color,border:`1px solid ${tc.border}`,width:'fit-content'}}>
                        <i className={tc.icon}/>{c.tier}
                      </span>
                    </td>
                    <td className="px-3 py-2 fw-semibold">{c.orders}</td>
                    <td className="px-3 py-2 fw-medium">{fmt(c.totalSpent)}</td>
                    <td className="px-3 py-2">
                      <span style={{fontSize:12,color:'#8b5cf6',fontWeight:500}}>{fmtPts(c.points)}</span>
                    </td>
                    <td className="px-3 py-2 text-muted" style={{fontSize:12}}>{c.lastOrder}</td>
                    <td className="px-3 py-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="form-check form-switch mb-0">
                          <input className="form-check-input" type="checkbox" role="switch"
                            checked={c.status==='active'} onChange={()=>toggleStatus(c)}
                            style={{width:34,height:18,cursor:'pointer'}}/>
                        </div>
                        <span className="badge" style={{fontSize:10,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`}}>
                          {sc.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="d-flex gap-1">
                        <Link to={`/customers/${c.id}`}
                          className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center"
                          style={{width:30,height:30,padding:0,borderRadius:'50%'}} title="View Profile">
                          <i className="ri-eye-line" style={{fontSize:13}}/>
                        </Link>
                        <button
                          className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center"
                          style={{width:30,height:30,padding:0,borderRadius:'50%'}} title="Remove"
                          onClick={()=>{ setSelected(c); setModal('delete') }}>
                          <i className="ri-delete-bin-line" style={{fontSize:13}}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE / REMOVE MODAL */}
      {modal==='delete' && selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1050,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={closeModal}>
          <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:'#1e293b',borderRadius:'12px 12px 0 0',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{color:'#fff',fontWeight:600,fontSize:15}}>Remove Customer</span>
              <button className="btn-close btn-close-white btn-sm" onClick={closeModal}/>
            </div>
            <div className="p-4 text-center">
              <div className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{width:56,height:56,background:'#fef2f2'}}>
                <i className="ri-user-unfollow-line" style={{color:'#ef4444',fontSize:24}}/>
              </div>
              <div className="fw-semibold mb-1" style={{fontSize:15}}>Remove {selected.name}?</div>
              <div className="text-muted mb-1" style={{fontSize:13}}>
                This will remove the customer from your system.
              </div>
              <div className="p-2 rounded mb-4" style={{background:'#fef2f2',border:'1px solid #fecaca'}}>
                <div style={{fontSize:12,color:'#dc2626'}}>
                  {selected.orders} orders · {fmt(selected.totalSpent)} revenue · {fmtPts(selected.points)} loyalty points will all be removed.
                </div>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                <button className="btn btn-danger flex-fill" onClick={deleteCustomer}>Yes, Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
