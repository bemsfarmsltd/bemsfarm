import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const ini    = name => (name || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const fmtPts = n => Number(n || 0).toLocaleString()+' pts'
const fmtDate = d => d ? new Date(d).toISOString().slice(0,10) : '—'

const TIER_CFG = {
  Platinum:{ bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe', icon:'ri-vip-crown-2-fill',  min:10000, next:null,    label:'Platinum' },
  Gold:    { bg:'#fffbeb', color:'#d97706', border:'#fde68a', icon:'ri-medal-2-fill',        min:5000,  next:'Platinum',label:'Gold'  },
  Silver:  { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1', icon:'ri-award-fill',          min:1000,  next:'Gold',  label:'Silver' },
  Bronze:  { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', icon:'ri-star-half-fill',      min:0,     next:'Silver',label:'Bronze' },
}

const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16']

export default function LoyaltyPoints() {
  const [data, setData] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTier, setTier] = useState('all')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null) // 'award' | 'deduct'
  const [pts, setPts] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [custRes, histRes] = await Promise.all([
        api.get('/admin/customers', { params: { limit: 200 } }),
        api.get('/admin/customers/loyalty/activity', { params: { limit: 30 } }),
      ])
      setData(custRes.data.customers || [])
      setHistory(histRes.data.activity || [])
    } catch {
      toast.error('Failed to load loyalty data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => data.filter(c => {
    if (filterTier !== 'all' && c.tier !== filterTier) return false
    if (search) return c.name.toLowerCase().includes(search.toLowerCase()) || c.customer_code.toLowerCase().includes(search.toLowerCase())
    return true
  }), [data, search, filterTier])

  const totalPts  = data.reduce((s,c)=>s+Number(c.points||0), 0)

  async function processPoints(type) {
    const amount = parseInt(pts)
    if (!amount || !selected) return
    setSaving(true)
    try {
      const delta = type === 'award' ? amount : -amount
      const target = selected.customer_code || selected.id
      await api.post(`/admin/customers/${target}/loyalty`, {
        points: delta,
        type: type === 'award' ? 'bonus' : 'deducted',
        description: reason || (type === 'award' ? 'Admin points award' : 'Admin points deduction'),
      })
      toast.success(type === 'award' ? 'Points awarded' : 'Points deducted')
      setModal(null); setPts(''); setReason(''); setSelected(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update points')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-fluid">
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Loyalty Points</h6>
          <p className="text-muted mb-0" style={{fontSize:12}}>Manage customer loyalty tiers and points</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/customers">Customers</Link></li>
          <li className="breadcrumb-item active">Loyalty Points</li>
        </ul>
      </div>

      {/* Tier breakdown cards */}
      <div className="row g-3 mb-4">
        {Object.entries(TIER_CFG).reverse().map(([tier, cfg]) => {
          const count = data.filter(c=>c.tier===tier).length
          const totalInTier = data.filter(c=>c.tier===tier).reduce((s,c)=>s+Number(c.points||0),0)
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
                  {loading && (
                    <tr><td colSpan={6} className="text-center py-5 text-muted">Loading…</td></tr>
                  )}
                  {!loading && filtered.map((c,i) => {
                    const tc = TIER_CFG[c.tier] || TIER_CFG.Bronze
                    const points = Number(c.points || 0)
                    const pctToNext = tc.next ? Math.min(100,(points/TIER_CFG[tc.next].min)*100) : 100
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
                              <div className="text-muted" style={{fontSize:11}}>{c.customer_code}</div>
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
                          <div className="fw-bold" style={{color:'#8b5cf6'}}>{fmtPts(points)}</div>
                          <div style={{background:'#f1f5f9',borderRadius:3,height:4,width:80,marginTop:4,overflow:'hidden'}}>
                            <div style={{width:`${pctToNext}%`,height:'100%',background:tc.color,borderRadius:3}}/>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted" style={{fontSize:12}}>{fmtPts(c.lifetime_points)}</td>
                        <td className="px-3 py-2 text-muted" style={{fontSize:12}}>{fmtDate(c.last_earned_at)}</td>
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
              {history.length === 0 && (
                <div className="text-center text-muted py-4" style={{fontSize:12}}>No loyalty activity yet.</div>
              )}
              {history.slice(0,12).map((h,i) => (
                <div key={h.id || i} className={`d-flex align-items-start gap-3 px-3 py-3 ${i<Math.min(history.length,12)-1?'border-bottom':''}`}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{width:32,height:32,background:h.type==='earned'?'#f0fdf4':h.type==='redeemed'||h.type==='deducted'?'#fef2f2':'#f5f3ff'}}>
                    <i className={h.type==='earned'?'ri-add-line':h.type==='redeemed'||h.type==='deducted'?'ri-subtract-line':'ri-admin-line'}
                      style={{fontSize:13,color:h.type==='earned'?'#22c55e':h.type==='redeemed'||h.type==='deducted'?'#ef4444':'#8b5cf6'}}/>
                  </div>
                  <div className="flex-fill">
                    <div style={{fontSize:12,fontWeight:500}}>{h.customer_name}</div>
                    <div className="text-muted" style={{fontSize:10,marginTop:2,lineHeight:1.4}}>{h.description}</div>
                    <div className="text-muted" style={{fontSize:10}}>{fmtDate(h.created_at)}</div>
                  </div>
                  <div className="fw-bold" style={{fontSize:13,color:h.points>0?'#22c55e':'#ef4444',flexShrink:0}}>
                    {h.points>0?'+':''}{Number(h.points).toLocaleString()}
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
                    <span className="badge" style={{fontSize:10,background:(TIER_CFG[selected.tier]||TIER_CFG.Bronze).bg,color:(TIER_CFG[selected.tier]||TIER_CFG.Bronze).color,border:`1px solid ${(TIER_CFG[selected.tier]||TIER_CFG.Bronze).border}`}}>
                      <i className={`${(TIER_CFG[selected.tier]||TIER_CFG.Bronze).icon} me-1`}/>{selected.tier}
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
                    New balance: {fmtPts(Math.max(0, Number(selected.points) + (modal==='award'?+pts:-pts)))}
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
                  disabled={!pts || parseInt(pts)<1 || saving}
                  onClick={()=>processPoints(modal)}>
                  {saving ? 'Saving…' : `${modal==='award'?'Award':'Deduct'} ${pts?fmtPts(pts):'Points'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
