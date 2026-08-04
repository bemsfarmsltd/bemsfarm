import { useState, useMemo, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import api from '../../lib/api'

const ini    = n => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const fmtPts = n => Number(n).toLocaleString()+' pts'
const fmtDate = d => d ? new Date(d).toISOString().slice(0,10) : '—'

const TIER_CFG = {
  Platinum: { bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe', icon:'ri-vip-crown-2-fill', min:10000, next:null,      label:'Platinum' },
  Gold:     { bg:'#fffbeb', color:'#d97706', border:'#fde68a', icon:'ri-medal-2-fill',      min:5000,  next:'Platinum', label:'Gold'     },
  Silver:   { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1', icon:'ri-award-fill',        min:1000,  next:'Gold',     label:'Silver'   },
  Bronze:   { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', icon:'ri-star-half-fill',    min:0,     next:'Silver',   label:'Bronze'   },
}
const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16','#a855f7','#ef4444','#10b981','#d97706','#6366f1']

const HIST_TYPE = { earned:'earn', bonus:'admin', referral:'admin', redeemed:'redeem', deducted:'admin' }

const card = { background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }
const inp  = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, fontFamily:'Nunito, sans-serif', outline:'none', boxSizing:'border-box', color:'#111827', background:'#fff' }
const lbl  = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }

const TH = ({ children }) => <th style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>{children}</th>
const TD = ({ children, style }) => <td style={{ padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f9fafb', verticalAlign:'middle', ...style }}>{children}</td>

export default function LoyaltyPoints() {
  const [data, setData]         = useState([])
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterTier, setTier]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [modal, setModal]       = useState(null) // 'award' | 'deduct'
  const [pts, setPts]           = useState('')
  const [reason, setReason]     = useState('')
  const [saving, setSaving]     = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [custRes, actRes] = await Promise.all([
        api.get('/admin/customers', { params: { limit: 200 } }),
        api.get('/admin/customers/loyalty/activity', { params: { limit: 30 } }),
      ])
      setData((custRes.data.customers || []).map(c => ({
        id: c.customer_code, dbId: c.id, name: c.name,
        tier: c.tier, points: Number(c.points) || 0,
        lifetime: Number(c.lifetime_points) || 0,
        lastEarned: fmtDate(c.last_earned_at),
      })))
      setHistory((actRes.data.activity || []).map(a => ({
        customer: a.customer_name,
        type: HIST_TYPE[a.type] || 'admin',
        desc: a.description || '—',
        pts: Number(a.points),
        date: fmtDate(a.created_at),
      })))
    } catch {
      toast.error('Failed to load loyalty data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = useMemo(() => data.filter(c => {
    if (filterTier!=='all' && c.tier!==filterTier) return false
    if (search) return c.name.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search)
    return true
  }), [data, search, filterTier])

  const totalPts  = data.reduce((s,c)=>s+c.points, 0)

  async function processPoints(type) {
    const amount = parseInt(pts)
    if (!amount || !selected || saving) return
    const signed = type==='award' ? amount : -amount
    setSaving(true)
    try {
      await api.post(`/admin/customers/${selected.dbId}/loyalty`, {
        points: signed,
        description: reason || (type==='award'?'Admin points award':'Admin points deduction'),
      })
      toast.success(type==='award' ? 'Points awarded' : 'Points deducted')
      setModal(null); setPts(''); setReason(''); setSelected(null)
      await loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update points')
    } finally {
      setSaving(false)
    }
  }

  const closeModal = () => { setModal(null); setSelected(null); setPts(''); setReason('') }

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <PageHeader
        title="Loyalty Points"
        subtitle="Manage customer loyalty tiers and points — earn 1 pt per ₦10 spent"
      />

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#6b7280' }}><i className="ri-loader-4-line" style={{ fontSize:28 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
      ) : (
      <>
      {/* Tier Cards */}
      <div className="grid-stats-auto" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
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

      <div className="grid-sidebar-split" style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, alignItems:'start' }}>
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
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} style={{ padding:'30px 12px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>No customers found</td></tr>
                  )}
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
                            <button onClick={() => { setSelected(c); setModal('deduct'); setPts(''); setReason('') }} disabled={c.points===0} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, border:'1.5px solid #fecaca', background:'#fff', color:'#dc2626', fontSize:11, fontWeight:700, cursor: c.points===0?'not-allowed':'pointer', fontFamily:'Nunito, sans-serif', opacity: c.points===0?0.5:1 }}>
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
            {history.length === 0 && (
              <div style={{ padding:'30px 16px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>No activity yet</div>
            )}
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
                <button disabled={!pts||parseInt(pts)<1||saving} onClick={() => processPoints(modal)} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background: modal==='award'?'#16a34a':'#dc2626', color:'#fff', cursor: (!pts||parseInt(pts)<1||saving)?'not-allowed':'pointer', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:700, opacity: (!pts||parseInt(pts)<1||saving)?0.6:1 }}>
                  {saving ? 'Saving…' : `${modal==='award'?'Award':'Deduct'} ${pts?fmtPts(pts):'Points'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}