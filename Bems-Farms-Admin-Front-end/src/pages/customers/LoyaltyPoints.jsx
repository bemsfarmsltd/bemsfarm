import { useState, useMemo } from 'react'
import PageHeader from '../../components/ui/PageHeader'

const ini    = n => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const fmtPts = n => Number(n).toLocaleString()+' pts'

const TIER_CFG = {
  Platinum: { bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe', icon:'ri-vip-crown-2-fill', min:10000, next:null,      label:'Platinum' },
  Gold:     { bg:'#fffbeb', color:'#d97706', border:'#fde68a', icon:'ri-medal-2-fill',      min:5000,  next:'Platinum', label:'Gold'     },
  Silver:   { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1', icon:'ri-award-fill',        min:1000,  next:'Gold',     label:'Silver'   },
  Bronze:   { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', icon:'ri-star-half-fill',    min:0,     next:'Silver',   label:'Bronze'   },
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
  { customer:'Funke Oladele',   type:'earn',  desc:'Order ORD-2026-0142 — 1 pt per ₦10 spent', pts:+8500, date:'2026-06-27' },
  { customer:'Bisi Awojobi',    type:'earn',  desc:'Platinum weekly bonus',                      pts:+500,  date:'2026-06-27' },
  { customer:'Seun Adesanya',   type:'earn',  desc:'Order ORD-2026-0139',                       pts:+320,  date:'2026-06-27' },
  { customer:'Adaeze Nwosu',    type:'earn',  desc:'Order ORD-2026-0141',                       pts:+185,  date:'2026-06-25' },
  { customer:'Emeka Okonkwo',   type:'redeem',desc:'Redeemed 500 pts for ₦2,000 wallet credit', pts:-500,  date:'2026-06-23' },
  { customer:'Babatunde Ojo',   type:'earn',  desc:'Order ORD-2026-0139',                       pts:+1200, date:'2026-06-26' },
  { customer:'Chioma Obi',      type:'earn',  desc:'Referral bonus — brought new customer',     pts:+200,  date:'2026-06-21' },
  { customer:'Ngozi Umeh',      type:'earn',  desc:'Order ORD-2026-0135',                       pts:+140,  date:'2026-06-24' },
  { customer:'Chidi Okeke',     type:'redeem',desc:'Redeemed 300 pts for free delivery',        pts:-300,  date:'2026-06-20' },
  { customer:'Kemi Adeleke',    type:'admin', desc:'Admin bonus — feedback survey reward',      pts:+100,  date:'2026-06-18' },
]

const card = { background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }
const inp  = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, fontFamily:'Nunito, sans-serif', outline:'none', boxSizing:'border-box', color:'#111827', background:'#fff' }
const lbl  = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }

const TH = ({ children }) => <th style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>{children}</th>
const TD = ({ children, style }) => <td style={{ padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f9fafb', verticalAlign:'middle', ...style }}>{children}</td>

export default function LoyaltyPoints() {
  const [data, setData]         = useState(INIT_DATA)
  const [search, setSearch]     = useState('')
  const [filterTier, setTier]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [modal, setModal]       = useState(null) // 'award' | 'deduct'
  const [pts, setPts]           = useState('')
  const [reason, setReason]     = useState('')
  const [history, setHistory]   = useState(POINTS_HISTORY)

  const filtered = useMemo(() => data.filter(c => {
    if (filterTier!=='all' && c.tier!==filterTier) return false
    if (search) return c.name.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search)
    return true
  }), [data, search, filterTier])

  const totalPts  = data.reduce((s,c)=>s+c.points, 0)

  function processPoints(type) {
    const amount = parseInt(pts)
    if (!amount || !selected) return
    const sign = type==='award' ? +amount : -amount
    setData(prev => prev.map(c => {
      if (c.id!==selected.id) return c
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

  const closeModal = () => { setModal(null); setSelected(null); setPts(''); setReason('') }

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <PageHeader
        title="Loyalty Points"
        subtitle="Manage customer loyalty tiers and points — earn 1 pt per ₦10 spent"
      />

      {/* Tier Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {Object.entries(TIER_CFG).reverse().map(([tier, cfg]) => {
          const count       = data.filter(c=>c.tier===tier).length
          const totalInTier = data.filter(c=>c.tier===tier).reduce((s,c)=>s+c.points,0)
          const isActive    = filterTier===tier
          return (
            <div key={tier} onClick={() => setTier(filterTier===tier?'all':tier)} style={{ ...card, padding:'16px', cursor:'pointer', border:`2px solid ${isActive?cfg.color:'#e5e7eb'}`, transition:'border-color 0.15s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:36, height:36, borderRadius:8, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={cfg.icon} style={{ color:cfg.color, fontSize:18 }} />
                </div>
                <span style={{ fontWeight:700, fontSize:14, color:cfg.color }}>{tier}</span>
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:'#111827', fontFamily:'Syne, sans-serif', lineHeight:1, marginBottom:4 }}>{count}</div>
              <div style={{ fontSize:11, color:'#64748b' }}>customers · {fmtPts(totalInTier)} total</div>
              <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                Min: {fmtPts(cfg.min)}{cfg.next?` → ${cfg.next} at ${fmtPts(TIER_CFG[cfg.next].min)}`:'(max tier)'}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, alignItems:'start' }}>
        {/* Left — Points Table */}
        <div>
          {/* Search */}
          <div style={{ ...card, padding:'10px 14px', marginBottom:12 }}>
            <div style={{ position:'relative' }}>
              <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:14 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…" style={{ ...inp, paddingLeft:32 }} />
            </div>
          </div>

          <div style={card}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'#374151' }}>{filtered.length} customer{filtered.length!==1?'s':''}</span>
              <span style={{ fontSize:12, color:'#6b7280' }}>Total in system: <strong>{fmtPts(totalPts)}</strong></span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{['CUSTOMER','TIER','POINTS BALANCE','LIFETIME PTS','LAST EARNED',''].map(h => <TH key={h}>{h}</TH>)}</tr>
                </thead>
                <tbody>
                  {filtered.map((c,i) => {
                    const tc = TIER_CFG[c.tier]
                    const pctToNext = tc.next ? Math.min(100,(c.points/TIER_CFG[tc.next].min)*100) : 100
                    return (
                      <tr key={c.id}>
                        <TD>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:36, height:36, borderRadius:'50%', background:AVATAR_COLORS[i%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>{ini(c.name)}</div>
                            <div>
                              <div style={{ fontWeight:600, fontSize:13, color:'#111827' }}>{c.name}</div>
                              <div style={{ fontSize:11, color:'#94a3b8' }}>{c.id}</div>
                            </div>
                          </div>
                        </TD>
                        <TD>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:tc.bg, color:tc.color, border:`1px solid ${tc.border}` }}>
                            <i className={tc.icon} />{c.tier}
                          </span>
                        </TD>
                        <TD>
                          <div style={{ fontWeight:700, color:'#8b5cf6', fontSize:13 }}>{fmtPts(c.points)}</div>
                          <div style={{ background:'#f1f5f9', borderRadius:3, height:4, width:80, marginTop:4, overflow:'hidden' }}>
                            <div style={{ width:`${pctToNext}%`, height:'100%', background:tc.color, borderRadius:3 }} />
                          </div>
                        </TD>
                        <TD style={{ color:'#6b7280', fontSize:12 }}>{fmtPts(c.lifetime)}</TD>
                        <TD style={{ color:'#6b7280', fontSize:12 }}>{c.lastEarned}</TD>
                        <TD>
                          <div style={{ display:'flex', gap:5 }}>
                            <button onClick={() => { setSelected(c); setModal('award'); setPts(''); setReason('') }} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, border:'none', background:'#f0fdf4', color:'#16a34a', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'Nunito, sans-serif' }}>
                              <i className="ri-add-line" />Award
                            </button>
                            <button onClick={() => { setSelected(c); setModal('deduct'); setPts(''); setReason('') }} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, border:'1.5px solid #fecaca', background:'#fff', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'Nunito, sans-serif' }}>
                              <i className="ri-subtract-line" />Deduct
                            </button>
                          </div>
                        </TD>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right — Points Activity */}
        <div style={card}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', fontWeight:700, fontSize:14, color:'#111827' }}>Points Activity</div>
          <div>
            {history.slice(0,12).map((h,i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', borderBottom: i<11?'1px solid #f9fafb':'none' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background: h.type==='earn'?'#f0fdf4':h.type==='redeem'?'#fef2f2':'#f5f3ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={h.type==='earn'?'ri-add-line':h.type==='redeem'?'ri-subtract-line':'ri-admin-line'} style={{ fontSize:13, color:h.type==='earn'?'#22c55e':h.type==='redeem'?'#ef4444':'#8b5cf6' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#111827' }}>{h.customer}</div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:2, lineHeight:1.4 }}>{h.desc}</div>
                  <div style={{ fontSize:10, color:'#94a3b8' }}>{h.date}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:h.pts>0?'#22c55e':'#ef4444', flexShrink:0 }}>
                  {h.pts>0?'+':''}{h.pts.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Award / Deduct Modal */}
      {modal && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={closeModal}>
          <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ background:'#1B4332', borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ color:'#fff', fontWeight:700, fontSize:15, fontFamily:'Syne, sans-serif' }}>{modal==='award'?'Award Points':'Deduct Points'}</span>
              <button onClick={closeModal} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:20, padding:0, display:'flex', alignItems:'center' }}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', borderRadius:10, background:'#f8fafc', marginBottom:20 }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:AVATAR_COLORS[data.findIndex(c=>c.id===selected.id)%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:15, flexShrink:0 }}>{ini(selected.name)}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{selected.name}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
                    <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:TIER_CFG[selected.tier].bg, color:TIER_CFG[selected.tier].color, border:`1px solid ${TIER_CFG[selected.tier].border}` }}>
                      <i className={`${TIER_CFG[selected.tier].icon} `} />{selected.tier}
                    </span>
                    <span style={{ fontSize:11, color:'#6b7280' }}>Current: <strong>{fmtPts(selected.points)}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Points to {modal==='award'?'Award':'Deduct'} <span style={{ color:'#dc2626' }}>*</span></label>
                <input type="number" min={1} max={modal==='deduct'?selected.points:99999} placeholder="e.g. 500" value={pts} onChange={e => setPts(e.target.value)} style={inp} />
                {pts && <div style={{ marginTop:4, fontSize:11, color:modal==='award'?'#22c55e':'#ef4444' }}>
                  New balance: {fmtPts(Math.max(0, selected.points + (modal==='award'?+pts:-pts)))}
                </div>}
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={lbl}>Reason</label>
                <textarea rows={2} placeholder={modal==='award'?'e.g. Referral bonus, Birthday reward…':'e.g. Points reversal, Error correction…'} value={reason} onChange={e => setReason(e.target.value)} style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:600 }}>Cancel</button>
                <button disabled={!pts||parseInt(pts)<1} onClick={() => processPoints(modal)} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background: modal==='award'?'#16a34a':'#dc2626', color:'#fff', cursor: (!pts||parseInt(pts)<1)?'not-allowed':'pointer', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:700, opacity: (!pts||parseInt(pts)<1)?0.6:1 }}>
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
