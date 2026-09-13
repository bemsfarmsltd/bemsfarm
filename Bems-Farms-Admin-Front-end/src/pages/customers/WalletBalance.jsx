import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = n => `₦${Number(n || 0).toLocaleString()}`
const ini = name => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const fmtDate = d => d ? new Date(d).toISOString().slice(0,10) : '—'
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : ''

const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16']

const TYPE_CFG = {
  top_up:      { label:'Top-up',        icon:'ri-add-circle-line',    color:'#22c55e', bg:'#f0fdf4', border:'#bbf7d0'  },
  admin_debit: { label:'Admin Debit',   icon:'ri-subtract-line',      color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe'  },
  order_debit: { label:'Order Debit',   icon:'ri-shopping-bag-line',  color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe'  },
  refund:      { label:'Refund',        icon:'ri-refund-2-line',      color:'#f59e0b', bg:'#fffbeb', border:'#fde68a'  },
}
const DEFAULT_TYPE_CFG = { label:'Transaction', icon:'ri-wallet-3-line', color:'#64748b', bg:'#f8fafc', border:'#e2e8f0' }

const TIER_CFG = {
  Platinum:{ bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe' },
  Gold:    { bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  Silver:  { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1' },
  Bronze:  { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa' },
}

const METHODS = ['Bank Transfer','Paystack','Cash','POS','USSD','Admin Adjustment']

export default function WalletBalance() {
  const [customers, setCustomers] = useState([])
  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedCust, setSelectedCust] = useState(null)
  const [custHistory, setCustHistory] = useState([])
  const [modal, setModal]         = useState(null) // 'topup' | 'debit' | 'history'
  const [amount, setAmount]       = useState('')
  const [method, setMethod]       = useState('Bank Transfer')
  const [note, setNote]           = useState('')
  const [saving, setSaving]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [custRes, histRes] = await Promise.all([
        api.get('/admin/customers', { params: { limit: 200 } }),
        api.get('/admin/customers/wallet/activity', { params: { limit: 50 } }),
      ])
      setCustomers(custRes.data.customers || [])
      setHistory(histRes.data.activity || [])
    } catch {
      toast.error('Failed to load wallet data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filteredCust = useMemo(() => customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.zone||'').toLowerCase().includes(q)
  }), [customers, search])

  const filteredHistory = useMemo(() => {
    if (filterType === 'all') return history
    return history.filter(h => h.type === filterType)
  }, [history, filterType])

  const totalFunds    = customers.reduce((s,c) => s+Number(c.wallet_balance||0), 0)
  const withBalance   = customers.filter(c=>Number(c.wallet_balance||0)>0).length
  const todayStr = new Date().toISOString().slice(0,10)
  const todayTopups   = history.filter(h=>h.type==='top_up' && (h.created_at||'').startsWith(todayStr)).reduce((s,h)=>s+Number(h.amount),0)

  function closeModal() { setModal(null); setSelectedCust(null); setAmount(''); setNote('') }

  async function openHistory(c) {
    setSelectedCust(c)
    setModal('history')
    try {
      const res = await api.get('/admin/customers/wallet/activity', { params: { customer_id: c.customer_code, limit: 50 } })
      setCustHistory(res.data.activity || [])
    } catch {
      toast.error('Failed to load wallet history')
      setCustHistory([])
    }
  }

  async function processTopUp() {
    const amt = parseInt(amount)
    if (!amt || !selectedCust) return
    setSaving(true)
    try {
      await api.post(`/admin/customers/${selectedCust.customer_code}/wallet`, {
        amount: amt, type: 'topup', method, note: note || undefined,
      })
      toast.success('Wallet topped up')
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to top up wallet')
    } finally {
      setSaving(false)
    }
  }

  async function processDebit() {
    const amt = parseInt(amount)
    if (!amt || !selectedCust || !note.trim()) return
    setSaving(true)
    try {
      await api.post(`/admin/customers/${selectedCust.customer_code}/wallet`, {
        amount: amt, type: 'debit', method: 'Admin Adjustment', note,
      })
      toast.success('Wallet debited')
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to debit wallet')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Wallet Balances</h6>
          <p className="text-muted mb-0" style={{fontSize:12}}>Manage customer wallet funds, top-ups, and credits</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/customers">Customers</Link></li>
          <li className="breadcrumb-item active">Wallet Balance</li>
        </ul>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Funds in System', val:fmt(totalFunds),   icon:'ri-safe-line',          color:'#22c55e', bg:'#f0fdf4' },
          { label:'Wallets with Balance',  val:withBalance,        icon:'ri-wallet-3-line',       color:'#3b82f6', bg:'#eff6ff' },
          { label:"Today's Top-ups",       val:fmt(todayTopups),  icon:'ri-arrow-up-circle-line', color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Total Customers',       val:customers.length,   icon:'ri-group-line',          color:'#f59e0b', bg:'#fffbeb' },
          { label:'Zero Balance',          val:customers.filter(c=>Number(c.wallet_balance||0)===0).length, icon:'ri-wallet-line', color:'#94a3b8', bg:'#f8fafc' },
        ].map((k,i) => (
          <div key={i} className="col-6 col-md-4 col-xl">
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

      <div className="row g-4">
        {/* Left — Customer Wallet Table */}
        <div className="col-lg-7">
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
              <span style={{fontSize:13}}>{filteredCust.length} customers</span>
              <span className="text-muted" style={{fontSize:12}}>Total: <strong className="text-success">{fmt(filteredCust.reduce((s,c)=>s+Number(c.wallet_balance||0),0))}</strong></span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{fontSize:13}}>
                <thead style={{background:'#f8fafc'}}>
                  <tr>
                    {['CUSTOMER','TIER','WALLET BALANCE','TOTAL TOPPED UP',''].map(h=>(
                      <th key={h} className="px-3 py-2 fw-medium text-muted" style={{fontSize:11}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={5} className="text-center py-5 text-muted">Loading…</td></tr>
                  )}
                  {!loading && filteredCust.map((c,i) => {
                    const tc = TIER_CFG[c.tier] || TIER_CFG.Bronze
                    const balance = Number(c.wallet_balance || 0)
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
                              <div className="text-muted" style={{fontSize:11}}>{c.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="badge" style={{fontSize:10,background:tc.bg,color:tc.color,border:`1px solid ${tc.border}`}}>
                            {c.tier}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="fw-bold" style={{color:balance>0?'#22c55e':'#94a3b8',fontSize:14}}>
                            {fmt(balance)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted" style={{fontSize:12}}>{fmt(c.wallet_total_topped_up)}</td>
                        <td className="px-3 py-2">
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-success" style={{fontSize:11,padding:'3px 8px'}}
                              onClick={()=>{ setSelectedCust(c); setModal('topup'); setAmount(''); setNote(''); setMethod('Bank Transfer') }}>
                              <i className="ri-add-line"/>Top Up
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" style={{fontSize:11,padding:'3px 8px'}}
                              disabled={balance===0}
                              onClick={()=>{ setSelectedCust(c); setModal('debit'); setAmount(''); setNote('') }}>
                              <i className="ri-subtract-line"/>Debit
                            </button>
                            <button className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center"
                              style={{width:28,height:28,padding:0,borderRadius:'50%'}} title="View History"
                              onClick={()=>openHistory(c)}>
                              <i className="ri-history-line" style={{fontSize:12}}/>
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

        {/* Right — Transaction Feed */}
        <div className="col-lg-5">
          {/* Type filter */}
          <div className="d-flex gap-2 flex-wrap mb-3">
            {['all','top_up','admin_debit','order_debit','refund'].map(t => {
              const cfg = t!=='all' ? (TYPE_CFG[t] || DEFAULT_TYPE_CFG) : null
              const isActive = filterType===t
              return (
                <button key={t} onClick={()=>setFilterType(t)} className="btn btn-sm" style={{
                  fontSize:11,
                  background: isActive ? (cfg ? cfg.color : '#1e293b') : '#f8fafc',
                  color: isActive ? '#fff' : '#64748b',
                  border:`1px solid ${isActive?'transparent':'#e2e8f0'}`,
                }}>
                  {t==='all' ? 'All' : cfg.label}
                </button>
              )
            })}
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <div className="fw-medium" style={{fontSize:14}}>Wallet Transactions</div>
            </div>
            <div className="card-body p-0" style={{maxHeight:520,overflowY:'auto'}}>
              {!loading && filteredHistory.length===0 && (
                <div className="text-center text-muted py-4" style={{fontSize:12}}>No wallet transactions yet.</div>
              )}
              {filteredHistory.map((h,i) => {
                const tc = TYPE_CFG[h.type] || DEFAULT_TYPE_CFG
                return (
                  <div key={h.id} className={`d-flex align-items-start gap-3 px-3 py-3 ${i<filteredHistory.length-1?'border-bottom':''}`}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{width:36,height:36,background:tc.bg}}>
                      <i className={tc.icon} style={{color:tc.color,fontSize:15}}/>
                    </div>
                    <div className="flex-fill">
                      <div style={{fontSize:12,fontWeight:600}}>{h.customer_name}</div>
                      <div className="text-muted" style={{fontSize:11}}>{tc.label} · {h.payment_method}</div>
                      <div className="text-muted" style={{fontSize:10}}>{h.reference} · {fmtDate(h.created_at)} {fmtTime(h.created_at)}</div>
                      {h.description && <div className="text-muted" style={{fontSize:10,fontStyle:'italic'}}>{h.description}</div>}
                    </div>
                    <div className="text-end flex-shrink-0">
                      <div className="fw-bold" style={{color:h.amount>0?'#22c55e':'#3b82f6',fontSize:13}}>
                        {h.amount>0?'+':''}{fmt(h.amount)}
                      </div>
                      <div className="text-muted" style={{fontSize:10}}>Bal: {fmt(h.balance_after)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* TOP-UP MODAL */}
      {modal==='topup' && selectedCust && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1050,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={closeModal}>
          <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:440,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:'#1e293b',borderRadius:'12px 12px 0 0',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{color:'#fff',fontWeight:600,fontSize:15}}>Top Up Wallet</span>
              <button className="btn-close btn-close-white btn-sm" onClick={closeModal}/>
            </div>
            <div className="p-4">
              {/* Customer */}
              <div className="d-flex align-items-center gap-3 p-3 rounded mb-4" style={{background:'#f8fafc'}}>
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                  style={{width:44,height:44,background:AVATAR_COLORS[customers.findIndex(c=>c.id===selectedCust.id)%AVATAR_COLORS.length],fontSize:15}}>
                  {ini(selectedCust.name)}
                </div>
                <div>
                  <div className="fw-semibold">{selectedCust.name}</div>
                  <div className="text-muted" style={{fontSize:12}}>
                    Current balance: <strong className="text-success">{fmt(selectedCust.wallet_balance)}</strong>
                  </div>
                </div>
              </div>

              {/* Quick amounts */}
              <div className="mb-3">
                <label className="form-label" style={{fontSize:12}}>Quick Amount</label>
                <div className="d-flex gap-2 flex-wrap">
                  {[1000,2000,5000,10000,20000,50000].map(a => (
                    <button key={a} type="button"
                      className="btn btn-sm"
                      style={{fontSize:11, background:amount===String(a)?'#22c55e':'#f0fdf4', color:amount===String(a)?'#fff':'#16a34a', border:'1px solid #bbf7d0'}}
                      onClick={()=>setAmount(String(a))}>
                      {fmt(a)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label" style={{fontSize:12}}>Amount <span className="text-danger">*</span></label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text">₦</span>
                  <input type="number" className="form-control" min={1} placeholder="Enter amount"
                    value={amount} onChange={e=>setAmount(e.target.value)}/>
                </div>
                {amount && (
                  <div className="mt-1" style={{fontSize:11,color:'#22c55e'}}>
                    New balance: {fmt(Number(selectedCust.wallet_balance) + parseInt(amount||0))}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label" style={{fontSize:12}}>Payment Method</label>
                <select className="form-select form-select-sm" value={method} onChange={e=>setMethod(e.target.value)}>
                  {METHODS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label" style={{fontSize:12}}>Note (optional)</label>
                <input className="form-control form-control-sm" placeholder="e.g. June wallet load"
                  value={note} onChange={e=>setNote(e.target.value)}/>
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                <button className="btn btn-success flex-fill" disabled={!amount||parseInt(amount)<1||saving} onClick={processTopUp}>
                  <i className="ri-add-circle-line me-1"/>{saving ? 'Saving…' : `Top Up ${amount?fmt(amount):''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEBIT MODAL */}
      {modal==='debit' && selectedCust && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1050,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={closeModal}>
          <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:440,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:'#1e293b',borderRadius:'12px 12px 0 0',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{color:'#fff',fontWeight:600,fontSize:15}}>Debit Wallet</span>
              <button className="btn-close btn-close-white btn-sm" onClick={closeModal}/>
            </div>
            <div className="p-4">
              <div className="d-flex align-items-center gap-3 p-3 rounded mb-4" style={{background:'#f8fafc'}}>
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                  style={{width:44,height:44,background:AVATAR_COLORS[customers.findIndex(c=>c.id===selectedCust.id)%AVATAR_COLORS.length],fontSize:15}}>
                  {ini(selectedCust.name)}
                </div>
                <div>
                  <div className="fw-semibold">{selectedCust.name}</div>
                  <div className="text-muted" style={{fontSize:12}}>
                    Available: <strong className="text-success">{fmt(selectedCust.wallet_balance)}</strong>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label" style={{fontSize:12}}>Amount to Debit <span className="text-danger">*</span></label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text">₦</span>
                  <input type="number" className="form-control" min={1} max={selectedCust.wallet_balance}
                    placeholder="Enter amount" value={amount} onChange={e=>setAmount(e.target.value)}/>
                </div>
                {amount && parseInt(amount)>Number(selectedCust.wallet_balance) && (
                  <div className="text-danger" style={{fontSize:11,marginTop:4}}>Exceeds wallet balance.</div>
                )}
                {amount && parseInt(amount)<=Number(selectedCust.wallet_balance) && (
                  <div className="mt-1" style={{fontSize:11,color:'#ef4444'}}>
                    Remaining: {fmt(Number(selectedCust.wallet_balance) - parseInt(amount))}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="form-label" style={{fontSize:12}}>Reason <span className="text-danger">*</span></label>
                <textarea className="form-control form-control-sm" rows={2}
                  placeholder="e.g. Error correction, manual adjustment…"
                  value={note} onChange={e=>setNote(e.target.value)}/>
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                <button className="btn btn-danger flex-fill"
                  disabled={!amount||parseInt(amount)<1||parseInt(amount)>Number(selectedCust.wallet_balance)||!note.trim()||saving}
                  onClick={processDebit}>
                  {saving ? 'Saving…' : `Debit ${amount?fmt(amount):''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {modal==='history' && selectedCust && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1050,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={closeModal}>
          <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:500,maxHeight:'85vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:'#1e293b',borderRadius:'12px 12px 0 0',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <span style={{color:'#fff',fontWeight:600,fontSize:15}}>Wallet History — {selectedCust.name}</span>
              <button className="btn-close btn-close-white btn-sm" onClick={closeModal}/>
            </div>
            {/* Balance banner */}
            <div className="px-4 py-3 border-bottom" style={{background:'#f0fdf4',flexShrink:0}}>
              <div className="text-muted" style={{fontSize:11}}>Current Balance</div>
              <div className="fw-bold" style={{fontSize:24,color:'#22c55e'}}>{fmt(selectedCust.wallet_balance)}</div>
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              {custHistory.length===0 && (
                <div className="text-center text-muted py-5" style={{fontSize:13}}>No wallet transactions yet.</div>
              )}
              {custHistory.map((h,i) => {
                const tc = TYPE_CFG[h.type] || DEFAULT_TYPE_CFG
                return (
                  <div key={h.id} className={`d-flex align-items-start gap-3 px-4 py-3 ${i<custHistory.length-1?'border-bottom':''}`}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{width:36,height:36,background:tc.bg}}>
                      <i className={tc.icon} style={{color:tc.color,fontSize:14}}/>
                    </div>
                    <div className="flex-fill">
                      <div style={{fontSize:13}}>{tc.label} — {h.payment_method}</div>
                      <div className="text-muted" style={{fontSize:11}}>{h.reference} · {fmtDate(h.created_at)}</div>
                      {h.description && <div className="text-muted" style={{fontSize:10,fontStyle:'italic'}}>{h.description}</div>}
                    </div>
                    <div className="text-end">
                      <div className="fw-bold" style={{color:h.amount>0?'#22c55e':'#3b82f6',fontSize:13}}>
                        {h.amount>0?'+':''}{fmt(h.amount)}
                      </div>
                      <div className="text-muted" style={{fontSize:10}}>Bal: {fmt(h.balance_after)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-3 border-top" style={{flexShrink:0}}>
              <div className="d-flex gap-2">
                <button className="btn btn-success btn-sm flex-fill"
                  onClick={()=>{ setModal('topup'); setAmount(''); setNote(''); setMethod('Bank Transfer') }}>
                  <i className="ri-add-line me-1"/>Top Up
                </button>
                <button className="btn btn-outline-secondary btn-sm flex-fill" onClick={closeModal}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
