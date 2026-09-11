import { useState, useMemo } from 'react'

const ini    = name => name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const fmtPts = n => Number(n).toLocaleString()+' pts'

const TIER_CFG = {
  Platinum:{ bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe', icon:'ri-vip-crown-2-fill',  min:10000, next:null,    label:'Platinum' },
  Gold:    { bg:'#fffbeb', color:'#d97706', border:'#fde68a', icon:'ri-medal-2-fill',        min:5000,  next:'Platinum',label:'Gold'  },
  Silver:  { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1', icon:'ri-award-fill',          min:1000,  next:'Gold',  label:'Silver' },
  Bronze:  { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', icon:'ri-star-half-fill',      min:0,     next:'Silver',label:'Bronze' },
}

const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16','#a855f7','#ef4444','#10b981','#d97706','#6366f1']

const INIT_DATA = [
  { id:'CUS-004', name:'Funke Oladele',   tier:'Platinum', points:9840,  lifetime:9840,  lastEarned:'2026-06-27' },
  { id:'CUS-012', name:'Bisi Awojobi',    tier:'Platinum', points:11200, lifetime:11200, lastEarned:'2026-06-27' },
  { id:'CUS-001', name:'Adaeze Nwosu',    tier:'Gold',     points:4120,  lifetime:4120,  lastEarned:'2026-06-25' },
  { id:'CUS-007', name:'Babatunde Ojo',   tier:'Gold',     points:5240,  lifetime:5240,  lastEarned:'2026-06-26' },
  { id:'CUS-009', name:'Emeka Okonkwo',   tier:'Gold',     points:7200,  lifetime:7200,  lastEarned:'2026-06-23' },
  { id:'CUS-002', name:'Seun Adesanya',   tier:'Silver',   points:2845,  lifetime:2845,  lastEarned:'2026-06-27' },
  { id:'CUS-006', name:'Ngozi Umeh',      tier:'Silver',   points:1780,  lifetime:1780,  lastEarned:'2026-06-24' },
  { id:'CUS-011', name:'Chidi Okeke',     tier:'Silver',   points:2340,  lifetime:2340,  lastEarned:'2026-06-20' },
  { id:'CUS-014', name:'Chioma Obi',      tier:'Silver',   points:1520,  lifetime:1520,  lastEarned:'2026-06-21' },
  { id:'CUS-015', name:'Lanre Fasanya',   tier:'Silver',   points:3600,  lifetime:3600,  lastEarned:'2026-05-12' },
  { id:'CUS-003', name:'Chukwuemeka Eze', tier:'Bronze',   points:982,   lifetime:982,   lastEarned:'2026-06-22' },
  { id:'CUS-005', name:'Tolulope Badmus', tier:'Bronze',   points:624,   lifetime:624,   lastEarned:'2026-06-18' },
  { id:'CUS-008', name:'Aminat Suleiman', tier:'Bronze',   points:285,   lifetime:285,   lastEarned:'2026-06-10' },
  { id:'CUS-010', name:'Kemi Adeleke',    tier:'Bronze',   points:1120,  lifetime:1120,  lastEarned:'2026-04-30' },
  { id:'CUS-013', name:'Yusuf Abdullahi', tier:'Bronze',   points:440,   lifetime:440,   lastEarned:'2026-06-15' },
]

const POINTS_HISTORY = [
  { customer:'Funke Oladele',   type:'earn',  desc:'Order ORD-2026-0142 — 1 pt per ₦10 spent',  pts:+8500,  date:'2026-06-27' },
  { customer:'Bisi Awojobi',    type:'earn',  desc:'Platinum weekly bonus',                        pts:+500,   date:'2026-06-27' },
  { customer:'Seun Adesanya',   type:'earn',  desc:'Order ORD-2026-0139',                         pts:+320,   date:'2026-06-27' },
  { customer:'Adaeze Nwosu',    type:'earn',  desc:'Order ORD-2026-0141',                         pts:+185,   date:'2026-06-25' },
  { customer:'Emeka Okonkwo',   type:'redeem',desc:'Redeemed 500 pts for ₦2,000 wallet credit',  pts:-500,   date:'2026-06-23' },
  { customer:'Babatunde Ojo',   type:'earn',  desc:'Order ORD-2026-0139',                         pts:+1200,  date:'2026-06-26' },
  { customer:'Chioma Obi',      type:'earn',  desc:'Referral bonus — brought new customer',       pts:+200,   date:'2026-06-21' },
  { customer:'Ngozi Umeh',      type:'earn',  desc:'Order ORD-2026-0135',                         pts:+140,   date:'2026-06-24' },
  { customer:'Chidi Okeke',     type:'redeem',desc:'Redeemed 300 pts for free delivery',          pts:-300,   date:'2026-06-20' },
  { customer:'Kemi Adeleke',    type:'admin', desc:'Admin bonus — feedback survey reward',        pts:+100,   date:'2026-06-18' },
]

export default function LoyaltyPoints() {
  const [data, setData] = useState(INIT_DATA)
  const [search, setSearch] = useState('')
  const [filterTier, setTier] = useState('all')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null) // 'award' | 'deduct'
  const [pts, setPts] = useState('')
  const [reason, setReason] = useState('')
  const [history, setHistory] = useState(POINTS_HISTORY)

  const filtered = useMemo(() => data.filter(c => {
    if (filterTier !== 'all' && c.tier !== filterTier) return false
    if (search) return c.name.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search)
    return true
  }), [data, search, filterTier])

  const totalPts  = data.reduce((s,c)=>s+c.points, 0)
  const platCount = data.filter(c=>c.tier==='Platinum').length
  const goldCount = data.filter(c=>c.tier==='Gold').length

  function processPoints(type) {
    const amount = parseInt(pts)
    if (!amount || !selected) return
    const sign = type==='award' ? +amount : -amount
    setData(prev => prev.map(c => {
      if (c.id !== selected.id) return c
      const newPts = Math.max(0, c.points + sign)
      const newTier = newPts>=10000?'Platinum':newPts>=5000?'Gold':newPts>=1000?'Silver':'Bronze'
      return { ...c, points:newPts, tier:newTier }
    }))
    setHistory(prev => [{
      customer:selected.name,
      type: type==='award'?'admin':'redeem',
      desc: reason || (type==='award'?'Admin points award':'Admin points deduction'),
      pts:sign, date:new Date().toISOString().slice(0,10)
    }, ...prev])
    setModal(null); setPts(''); setReason(''); setSelected(null)
  }

  return (
    <div className="container-fluid">
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Loyalty Points</h6>
          <p className="text-muted mb-0" style={{fontSize:12}}>Manage customer loyalty tiers and points — earn 1 pt per ₦10 spent</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item text-muted">Customers</li>
          <li className="breadcrumb-item active">Loyalty Points</li>
        </ul>
      </div>

      {/* Tier breakdown cards */}
      <div className="row g-3 mb-4">
        {Object.entries(TIER_CFG).reverse().map(([tier, cfg]) => {
          const count = data.filter(c=>c.tier===tier).length
          const totalInTier = data.filter(c=>c.tier===tier).reduce((s,c)=>s+c.points,0)
          return (
            <div key={tier} className="col-6 col-md-3">
              <div className="card border-0 shadow-sm h-100" style={{cursor:'pointer',border:`2px solid ${filterTier===tier?cfg.color:'transparent'} !important`}}
                onClick={()=>setTier(filterTier===tier?'all':tier)}>
                <div className="card-body p-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="rounded-2 d-flex align-items-center justify-content-center"
                      style={{width:36,height:36,background:cfg.bg}}>
                      <i className={`${cfg.icon} fs-18`} style={{color:cfg.color}}/>
                    </div>
                    <span className="fw-medium" style={{fontSize:14,color:cfg.color}}>{tier}</span>
                  </div>
                  <div className="fw-bold" style={{fontSize:22}}>{count}</div>
                  <div className="text-muted" style={{fontSize:11}}>customers · {fmtPts(totalInTier)} total</div>
                  <div className="text-muted" style={{fontSize:10,marginTop:4}}>
                    Min: {fmtPts(cfg.min)}{cfg.next ? ` → ${cfg.next} at ${fmtPts(TIER_CFG[cfg.next].min)}` : ' (max tier)'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="row g-4">
        {/* Points table */}
        <div className="col-lg-8">
          {/* Search */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body p-3">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0"><i className="ri-search-line text-muted"/></span>
                <input className="form-control border-start-0 bg-light" placeholder="Search customers…"
                  value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-2">
              <span style={{fontSize:13}}>{filtered.length} customer{filtered.length!==1?'s':''}</span>
              <span className="text-muted" style={{fontSize:12}}>Total in system: <strong>{fmtPts(totalPts)}</strong></span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{fontSize:13}}>
                <thead style={{background:'#f8fafc'}}>
                  <tr>
                    {['CUSTOMER','TIER','POINTS BALANCE','LIFETIME PTS','LAST EARNED',''].map(h=>(
                      <th key={h} className="px-3 py-2 fw-medium text-muted" style={{fontSize:11}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c,i) => {
                    const tc = TIER_CFG[c.tier]
                    const pctToNext = tc.next ? Math.min(100,(c.points/TIER_CFG[tc.next].min)*100) : 100
                    return (
                      <tr key={c.id}>
                        <td className="px-3 py-2">
                          <div className="d-flex align-items-center gap-3">
                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                              style={{width:36,height:36,background:AVATAR_COLORS[i%AVATAR_COLORS.length],fontSize:12}}>
                              {ini(c.name)}
                            </div>
                            <div>
                              <div style={{fontWeight:600,fontSize:13}}>{c.name}</div>
                              <div className="text-muted" style={{fontSize:11}}>{c.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="badge d-flex align-items-center gap-1"
                            style={{fontSize:10,background:tc.bg,color:tc.color,border:`1px solid ${tc.border}`,width:'fit-content'}}>
                            <i className={tc.icon}/>{c.tier}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="fw-bold" style={{color:'#8b5cf6'}}>{fmtPts(c.points)}</div>
                          <div style={{background:'#f1f5f9',borderRadius:3,height:4,width:80,marginTop:4,overflow:'hidden'}}>
                            <div style={{width:`${pctToNext}%`,height:'100%',background:tc.color,borderRadius:3}}/>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted" style={{fontSize:12}}>{fmtPts(c.lifetime)}</td>
                        <td className="px-3 py-2 text-muted" style={{fontSize:12}}>{c.lastEarned}</td>
                        <td className="px-3 py-2">
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-success" style={{fontSize:11,padding:'2px 8px'}}
                              onClick={()=>{setSelected(c);setModal('award');setPts('');setReason('')}}>
                              <i className="ri-add-line"/>Award
                            </button>
                            <button className="btn btn-sm btn-outline-danger" style={{fontSize:11,padding:'2px 8px'}}
                              onClick={()=>{setSelected(c);setModal('deduct');setPts('');setReason('')}}>
                              <i className="ri-subtract-line"/>Deduct
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
        </div>

        {/* Points History */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <span className="fw-medium" style={{fontSize:14}}>Points Activity</span>
            </div>
            <div className="card-body p-0">
              {history.slice(0,12).map((h,i) => (
                <div key={i} className={`d-flex align-items-start gap-3 px-3 py-3 ${i<11?'border-bottom':''}`}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{width:32,height:32,background:h.type==='earn'?'#f0fdf4':h.type==='redeem'?'#fef2f2':'#f5f3ff'}}>
                    <i className={h.type==='earn'?'ri-add-line':h.type==='redeem'?'ri-subtract-line':'ri-admin-line'}
                      style={{fontSize:13,color:h.type==='earn'?'#22c55e':h.type==='redeem'?'#ef4444':'#8b5cf6'}}/>
                  </div>
                  <div className="flex-fill">
                    <div style={{fontSize:12,fontWeight:500}}>{h.customer}</div>
                    <div className="text-muted" style={{fontSize:10,marginTop:2,lineHeight:1.4}}>{h.desc}</div>
                    <div className="text-muted" style={{fontSize:10}}>{h.date}</div>
                  </div>
                  <div className="fw-bold" style={{fontSize:13,color:h.pts>0?'#22c55e':'#ef4444',flexShrink:0}}>
                    {h.pts>0?'+':''}{h.pts.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AWARD / DEDUCT MODAL */}
      {modal && selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1050,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={()=>{setModal(null);setSelected(null)}}>
          <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:440,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:'#1e293b',borderRadius:'12px 12px 0 0',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{color:'#fff',fontWeight:600,fontSize:15}}>
                {modal==='award'?'Award Points':'Deduct Points'}
              </span>
              <button className="btn-close btn-close-white btn-sm" onClick={()=>{setModal(null);setSelected(null)}}/>
            </div>
            <div className="p-4">
              {/* Customer summary */}
              <div className="d-flex align-items-center gap-3 p-3 rounded mb-4" style={{background:'#f8fafc'}}>
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                  style={{width:44,height:44,background:AVATAR_COLORS[data.findIndex(c=>c.id===selected.id)%AVATAR_COLORS.length],fontSize:15}}>
                  {ini(selected.name)}
                </div>
                <div>
                  <div className="fw-semibold">{selected.name}</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span className="badge" style={{fontSize:10,background:TIER_CFG[selected.tier].bg,color:TIER_CFG[selected.tier].color,border:`1px solid ${TIER_CFG[selected.tier].border}`}}>
                      <i className={`${TIER_CFG[selected.tier].icon} me-1`}/>{selected.tier}
                    </span>
                    <span className="text-muted" style={{fontSize:11}}>Current: <strong>{fmtPts(selected.points)}</strong></span>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label" style={{fontSize:12}}>
                  Points to {modal==='award'?'Award':'Deduct'} <span className="text-danger">*</span>
                </label>
                <input type="number" className="form-control form-control-sm" min={1} max={modal==='deduct'?selected.points:99999}
                  placeholder="e.g. 500" value={pts} onChange={e=>setPts(e.target.value)}/>
                {pts && (
                  <div className="mt-1" style={{fontSize:11,color:modal==='award'?'#22c55e':'#ef4444'}}>
                    New balance: {fmtPts(Math.max(0, selected.points + (modal==='award'?+pts:-pts)))}
                  </div>
                )}
              </div>
              <div className="mb-4">
                <label className="form-label" style={{fontSize:12}}>Reason</label>
                <textarea className="form-control form-control-sm" rows={2}
                  placeholder={modal==='award'?'e.g. Referral bonus, Birthday reward…':'e.g. Points reversal, Error correction…'}
                  value={reason} onChange={e=>setReason(e.target.value)}/>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary flex-fill" onClick={()=>{setModal(null);setSelected(null)}}>Cancel</button>
                <button className={`btn flex-fill ${modal==='award'?'btn-success':'btn-danger'}`}
                  disabled={!pts || parseInt(pts)<1}
                  onClick={()=>processPoints(modal)}>
                  {modal==='award'?'Award':'Deduct'} {pts?fmtPts(pts):'Points'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
