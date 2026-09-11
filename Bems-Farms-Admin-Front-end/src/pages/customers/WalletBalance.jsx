import { useState, useMemo } from 'react'

const fmt = n => `₦${Number(n).toLocaleString()}`
const ini = name => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16','#a855f7','#ef4444','#10b981','#d97706','#6366f1']

const INIT_CUSTOMERS = [
  { id:'CUS-004', name:'Funke Oladele',   phone:'08023456789', zone:'Victoria Island', tier:'Platinum', wallet:32_000, lastTopUp:'2026-06-15', totalTopUps:8,  status:'active'   },
  { id:'CUS-012', name:'Bisi Awojobi',    phone:'08178901234', zone:'Ogba',            tier:'Platinum', wallet:48_000, lastTopUp:'2026-06-01', totalTopUps:12, status:'active'   },
  { id:'CUS-009', name:'Emeka Okonkwo',   phone:'09034567890', zone:'Lekki Phase 2',   tier:'Gold',     wallet:22_300, lastTopUp:'2026-06-10', totalTopUps:6,  status:'active'   },
  { id:'CUS-007', name:'Babatunde Ojo',   phone:'08067890123', zone:'Gbagada',         tier:'Gold',     wallet:18_700, lastTopUp:'2026-06-20', totalTopUps:5,  status:'active'   },
  { id:'CUS-001', name:'Adaeze Nwosu',    phone:'08031234567', zone:'Lekki Phase 1',   tier:'Gold',     wallet:15_200, lastTopUp:'2026-06-20', totalTopUps:4,  status:'active'   },
  { id:'CUS-015', name:'Lanre Fasanya',   phone:'07012345678', zone:'Opebi',           tier:'Silver',   wallet:13_400, lastTopUp:'2026-05-02', totalTopUps:3,  status:'inactive' },
  { id:'CUS-011', name:'Chidi Okeke',     phone:'07023456789', zone:'Oshodi',          tier:'Silver',   wallet:9_800,  lastTopUp:'2026-06-12', totalTopUps:3,  status:'active'   },
  { id:'CUS-002', name:'Seun Adesanya',   phone:'07056789012', zone:'Ikeja GRA',       tier:'Silver',   wallet:8_500,  lastTopUp:'2026-06-27', totalTopUps:2,  status:'active'   },
  { id:'CUS-014', name:'Chioma Obi',      phone:'08090123456', zone:'Anthony Village', tier:'Silver',   wallet:6_200,  lastTopUp:'2026-06-08', totalTopUps:2,  status:'active'   },
  { id:'CUS-006', name:'Ngozi Umeh',      phone:'08145678901', zone:'Yaba',            tier:'Silver',   wallet:5_400,  lastTopUp:'2026-06-15', totalTopUps:2,  status:'active'   },
  { id:'CUS-010', name:'Kemi Adeleke',    phone:'08156789012', zone:'Maryland',        tier:'Bronze',   wallet:4_100,  lastTopUp:'2026-04-20', totalTopUps:1,  status:'inactive' },
  { id:'CUS-005', name:'Tolulope Badmus', phone:'07034512890', zone:'Ajah',            tier:'Bronze',   wallet:3_200,  lastTopUp:'2026-06-05', totalTopUps:1,  status:'active'   },
  { id:'CUS-008', name:'Aminat Suleiman', phone:'07089012345', zone:'Ikorodu',         tier:'Bronze',   wallet:1_000,  lastTopUp:'2026-06-01', totalTopUps:1,  status:'active'   },
  { id:'CUS-003', name:'Chukwuemeka Eze', phone:'09012345678', zone:'Surulere',        tier:'Bronze',   wallet:0,      lastTopUp:'—',          totalTopUps:0,  status:'active'   },
  { id:'CUS-013', name:'Yusuf Abdullahi', phone:'09045678901', zone:'Sangotedo',       tier:'Bronze',   wallet:0,      lastTopUp:'—',          totalTopUps:0,  status:'active'   },
]

const INIT_HISTORY = [
  { id:'WLT-0234', customer:'Seun Adesanya',   customerId:'CUS-002', type:'topup',  method:'Bank Transfer', amount:+20_000, bal:8_500,  date:'2026-06-27', time:'09:21', note:'Self top-up via transfer' },
  { id:'WLT-0233', customer:'Funke Oladele',   customerId:'CUS-004', type:'topup',  method:'Paystack',      amount:+50_000, bal:82_000, date:'2026-06-15', time:'14:30', note:'Quarterly wallet load' },
  { id:'WLT-0232', customer:'Bisi Awojobi',    customerId:'CUS-012', type:'topup',  method:'Bank Transfer', amount:+200_000,bal:248_000,date:'2026-06-01', time:'10:05', note:'Annual platinum top-up' },
  { id:'WLT-0231', customer:'Babatunde Ojo',   customerId:'CUS-007', type:'topup',  method:'Bank Transfer', amount:+50_000, bal:68_700, date:'2026-06-20', time:'08:45', note:'' },
  { id:'WLT-0230', customer:'Emeka Okonkwo',   customerId:'CUS-009', type:'topup',  method:'Paystack',      amount:+30_000, bal:52_300, date:'2026-06-10', time:'11:20', note:'Routine top-up' },
  { id:'ORD-0143', customer:'Bisi Awojobi',    customerId:'CUS-012', type:'debit',  method:'Order Payment', amount:-95_000, bal:48_000, date:'2026-06-27', time:'12:00', note:'Weekly Platinum box' },
  { id:'ORD-0142', customer:'Funke Oladele',   customerId:'CUS-004', type:'debit',  method:'Order Payment', amount:-85_000, bal:32_000, date:'2026-06-27', time:'09:00', note:'Corporate order' },
  { id:'ORD-0141', customer:'Adaeze Nwosu',    customerId:'CUS-001', type:'debit',  method:'Order Payment', amount:-18_500, bal:15_200, date:'2026-06-25', time:'14:32', note:'' },
  { id:'WLT-0229', customer:'Adaeze Nwosu',    customerId:'CUS-001', type:'topup',  method:'Bank Transfer', amount:+10_000, bal:33_700, date:'2026-06-20', time:'16:10', note:'' },
  { id:'LYL-0041', customer:'Funke Oladele',   customerId:'CUS-004', type:'credit', method:'Loyalty Reward',amount:+12_000, bal:117_000,date:'2026-06-10', time:'00:00', note:'Platinum 6-month milestone' },
  { id:'WLT-0228', customer:'Babatunde Ojo',   customerId:'CUS-007', type:'topup',  method:'Bank Transfer', amount:+50_000, bal:138_700,date:'2026-06-20', time:'09:00', note:'' },
  { id:'WLT-0227', customer:'Ngozi Umeh',      customerId:'CUS-006', type:'topup',  method:'Paystack',      amount:+5_400,  bal:5_400,  date:'2026-06-15', time:'13:15', note:'First-time top-up' },
  { id:'RFC-0048', customer:'Chukwuemeka Eze', customerId:'CUS-003', type:'refund', method:'Order Refund',  amount:+14_200, bal:14_200, date:'2026-06-20', time:'16:00', note:'Cancelled delivery refund' },
  { id:'ORD-0139', customer:'Babatunde Ojo',   customerId:'CUS-007', type:'debit',  method:'Order Payment', amount:-120_000,bal:18_700, date:'2026-06-26', time:'11:00', note:'Bulk order' },
  { id:'WLT-0226', customer:'Chioma Obi',      customerId:'CUS-014', type:'topup',  method:'Bank Transfer', amount:+6_200,  bal:6_200,  date:'2026-06-08', time:'10:30', note:'' },
]

const TYPE_CFG = {
  topup:  { label:'Top-up',       icon:'ri-add-circle-line',    color:'#22c55e', bg:'#f0fdf4', border:'#bbf7d0'  },
  debit:  { label:'Order Debit',  icon:'ri-shopping-bag-line',  color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe'  },
  credit: { label:'Loyalty Credit',icon:'ri-gift-line',         color:'#8b5cf6', bg:'#f5f3ff', border:'#ddd6fe'  },
  refund: { label:'Refund',       icon:'ri-refund-2-line',      color:'#f59e0b', bg:'#fffbeb', border:'#fde68a'  },
}

const TIER_CFG = {
  Platinum:{ bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe' },
  Gold:    { bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  Silver:  { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1' },
  Bronze:  { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa' },
}

const METHODS = ['Bank Transfer','Paystack','Cash','POS','USSD']

export default function WalletBalance() {
  const [customers, setCustomers] = useState(INIT_CUSTOMERS)
  const [history, setHistory]     = useState(INIT_HISTORY)
  const [search, setSearch]       = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedCust, setSelectedCust] = useState(null)
  const [modal, setModal]         = useState(null) // 'topup' | 'debit' | 'history'
  const [amount, setAmount]       = useState('')
  const [method, setMethod]       = useState('Bank Transfer')
  const [note, setNote]           = useState('')

  const filteredCust = useMemo(() => customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.zone.toLowerCase().includes(q)
  }), [customers, search])

  const filteredHistory = useMemo(() => {
    if (filterType === 'all') return history
    return history.filter(h => h.type === filterType)
  }, [history, filterType])

  const totalFunds    = customers.reduce((s,c) => s+c.wallet, 0)
  const withBalance   = customers.filter(c=>c.wallet>0).length
  const todayTopups   = history.filter(h=>h.type==='topup'&&h.date==='2026-06-27').reduce((s,h)=>s+h.amount,0)
  const pendingRefunds= history.filter(h=>h.type==='refund').length

  function closeModal() { setModal(null); setSelectedCust(null); setAmount(''); setNote('') }

  function processTopUp() {
    const amt = parseInt(amount)
    if (!amt || !selectedCust) return
    const ref = `WLT-${String(history.length + 235).padStart(4,'0')}`
    const newBal = selectedCust.wallet + amt
    setCustomers(prev => prev.map(c =>
      c.id === selectedCust.id ? { ...c, wallet:newBal, lastTopUp:new Date().toISOString().slice(0,10), totalTopUps:c.totalTopUps+1 } : c
    ))
    setHistory(prev => [{
      id:ref, customer:selectedCust.name, customerId:selectedCust.id,
      type:'topup', method, amount:+amt, bal:newBal,
      date:new Date().toISOString().slice(0,10), time:new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
      note: note||''
    }, ...prev])
    closeModal()
  }

  function processDebit() {
    const amt = parseInt(amount)
    if (!amt || !selectedCust || amt > selectedCust.wallet) return
    const ref = `DBT-${String(history.length + 100).padStart(4,'0')}`
    const newBal = selectedCust.wallet - amt
    setCustomers(prev => prev.map(c =>
      c.id === selectedCust.id ? { ...c, wallet:newBal } : c
    ))
    setHistory(prev => [{
      id:ref, customer:selectedCust.name, customerId:selectedCust.id,
      type:'debit', method:'Admin Debit', amount:-amt, bal:newBal,
      date:new Date().toISOString().slice(0,10), time:new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
      note: note||'Manual debit by admin'
    }, ...prev])
    closeModal()
  }

  const custHistory = selectedCust ? history.filter(h=>h.customerId===selectedCust.id) : []

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Wallet Balances</h6>
          <p className="text-muted mb-0" style={{fontSize:12}}>Manage customer wallet funds, top-ups, and credits</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item text-muted">Customers</li>
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
          { label:'Zero Balance',          val:customers.filter(c=>c.wallet===0).length, icon:'ri-wallet-line', color:'#94a3b8', bg:'#f8fafc' },
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
              <span className="text-muted" style={{fontSize:12}}>Total: <strong className="text-success">{fmt(filteredCust.reduce((s,c)=>s+c.wallet,0))}</strong></span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{fontSize:13}}>
                <thead style={{background:'#f8fafc'}}>
                  <tr>
                    {['CUSTOMER','TIER','WALLET BALANCE','LAST TOP-UP','TOTAL TOP-UPS',''].map(h=>(
                      <th key={h} className="px-3 py-2 fw-medium text-muted" style={{fontSize:11}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCust.map((c,i) => {
                    const tc = TIER_CFG[c.tier]
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
                          <span className="fw-bold" style={{color:c.wallet>0?'#22c55e':'#94a3b8',fontSize:14}}>
                            {fmt(c.wallet)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted" style={{fontSize:12}}>{c.lastTopUp}</td>
                        <td className="px-3 py-2 text-muted" style={{fontSize:12}}>{c.totalTopUps}×</td>
                        <td className="px-3 py-2">
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-success" style={{fontSize:11,padding:'3px 8px'}}
                              onClick={()=>{ setSelectedCust(c); setModal('topup'); setAmount(''); setNote(''); setMethod('Bank Transfer') }}>
                              <i className="ri-add-line"/>Top Up
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" style={{fontSize:11,padding:'3px 8px'}}
                              disabled={c.wallet===0}
                              onClick={()=>{ setSelectedCust(c); setModal('debit'); setAmount(''); setNote('') }}>
                              <i className="ri-subtract-line"/>Debit
                            </button>
                            <button className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center"
                              style={{width:28,height:28,padding:0,borderRadius:'50%'}} title="View History"
                              onClick={()=>{ setSelectedCust(c); setModal('history') }}>
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
            {['all','topup','debit','credit','refund'].map(t => {
              const cfg = t!=='all' ? TYPE_CFG[t] : null
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
              {filteredHistory.map((h,i) => {
                const tc = TYPE_CFG[h.type]
                return (
                  <div key={h.id} className={`d-flex align-items-start gap-3 px-3 py-3 ${i<filteredHistory.length-1?'border-bottom':''}`}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{width:36,height:36,background:tc.bg}}>
                      <i className={tc.icon} style={{color:tc.color,fontSize:15}}/>
                    </div>
                    <div className="flex-fill">
                      <div style={{fontSize:12,fontWeight:600}}>{h.customer}</div>
                      <div className="text-muted" style={{fontSize:11}}>{tc.label} · {h.method}</div>
                      <div className="text-muted" style={{fontSize:10}}>{h.id} · {h.date} {h.time}</div>
                      {h.note && <div className="text-muted" style={{fontSize:10,fontStyle:'italic'}}>{h.note}</div>}
                    </div>
                    <div className="text-end flex-shrink-0">
                      <div className="fw-bold" style={{color:h.amount>0?'#22c55e':'#3b82f6',fontSize:13}}>
                        {h.amount>0?'+':''}{fmt(h.amount)}
                      </div>
                      <div className="text-muted" style={{fontSize:10}}>Bal: {fmt(h.bal)}</div>
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
                    Current balance: <strong className="text-success">{fmt(selectedCust.wallet)}</strong>
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
                    New balance: {fmt(selectedCust.wallet + parseInt(amount||0))}
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
                <button className="btn btn-success flex-fill" disabled={!amount||parseInt(amount)<1} onClick={processTopUp}>
                  <i className="ri-add-circle-line me-1"/>Top Up {amount?fmt(amount):''}
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
                    Available: <strong className="text-success">{fmt(selectedCust.wallet)}</strong>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label" style={{fontSize:12}}>Amount to Debit <span className="text-danger">*</span></label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text">₦</span>
                  <input type="number" className="form-control" min={1} max={selectedCust.wallet}
                    placeholder="Enter amount" value={amount} onChange={e=>setAmount(e.target.value)}/>
                </div>
                {amount && parseInt(amount)>selectedCust.wallet && (
                  <div className="text-danger" style={{fontSize:11,marginTop:4}}>Exceeds wallet balance.</div>
                )}
                {amount && parseInt(amount)<=selectedCust.wallet && (
                  <div className="mt-1" style={{fontSize:11,color:'#ef4444'}}>
                    Remaining: {fmt(selectedCust.wallet - parseInt(amount))}
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
                  disabled={!amount||parseInt(amount)<1||parseInt(amount)>selectedCust.wallet||!note.trim()}
                  onClick={processDebit}>
                  Debit {amount?fmt(amount):''}
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
              <div className="fw-bold" style={{fontSize:24,color:'#22c55e'}}>{fmt(selectedCust.wallet)}</div>
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              {custHistory.length===0 && (
                <div className="text-center text-muted py-5" style={{fontSize:13}}>No wallet transactions yet.</div>
              )}
              {custHistory.map((h,i) => {
                const tc = TYPE_CFG[h.type]
                return (
                  <div key={h.id} className={`d-flex align-items-start gap-3 px-4 py-3 ${i<custHistory.length-1?'border-bottom':''}`}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{width:36,height:36,background:tc.bg}}>
                      <i className={tc.icon} style={{color:tc.color,fontSize:14}}/>
                    </div>
                    <div className="flex-fill">
                      <div style={{fontSize:13}}>{tc.label} — {h.method}</div>
                      <div className="text-muted" style={{fontSize:11}}>{h.id} · {h.date}</div>
                      {h.note && <div className="text-muted" style={{fontSize:10,fontStyle:'italic'}}>{h.note}</div>}
                    </div>
                    <div className="text-end">
                      <div className="fw-bold" style={{color:h.amount>0?'#22c55e':'#3b82f6',fontSize:13}}>
                        {h.amount>0?'+':''}{fmt(h.amount)}
                      </div>
                      <div className="text-muted" style={{fontSize:10}}>Bal: {fmt(h.bal)}</div>
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
