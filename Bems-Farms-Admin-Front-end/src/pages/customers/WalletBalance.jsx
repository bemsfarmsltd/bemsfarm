import { useState, useMemo } from 'react'
import PageHeader from '../../components/ui/PageHeader'

const fmt = n => `₦${Number(n).toLocaleString()}`
const ini = n => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

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
  topup:  { label:'Top-up',        icon:'ri-add-circle-line',    color:'#22c55e', bg:'#f0fdf4', border:'#bbf7d0' },
  debit:  { label:'Order Debit',   icon:'ri-shopping-bag-line',  color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe' },
  credit: { label:'Loyalty Credit',icon:'ri-gift-line',          color:'#8b5cf6', bg:'#f5f3ff', border:'#ddd6fe' },
  refund: { label:'Refund',        icon:'ri-refund-2-line',      color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
}
const TIER_CFG = {
  Platinum: { bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe' },
  Gold:     { bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  Silver:   { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1' },
  Bronze:   { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa' },
}
const METHODS = ['Bank Transfer','Paystack','Cash','POS','USSD']

const card = { background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }
const inp  = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, fontFamily:'Nunito, sans-serif', outline:'none', boxSizing:'border-box', color:'#111827', background:'#fff' }
const lbl  = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }

const TH = ({ children }) => <th style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>{children}</th>
const TD = ({ children, style }) => <td style={{ padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f9fafb', verticalAlign:'middle', ...style }}>{children}</td>

function ModalShell({ title, onClose, children, wide }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth: wide?520:440, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background:'#1B4332', borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ color:'#fff', fontWeight:700, fontSize:15, fontFamily:'Syne, sans-serif' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:20, padding:0, display:'flex', alignItems:'center' }}><i className="ri-close-line" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CustomerSummary({ c, customers, label }) {
  const idx = customers.findIndex(x => x.id===c.id)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', borderRadius:10, background:'#f8fafc', marginBottom:20 }}>
      <div style={{ width:44, height:44, borderRadius:'50%', background:AVATAR_COLORS[idx%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:15, flexShrink:0 }}>{ini(c.name)}</div>
      <div>
        <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
        <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{label}: <strong style={{ color:'#16a34a' }}>{fmt(c.wallet)}</strong></div>
      </div>
    </div>
  )
}

export default function WalletBalance() {
  const [customers, setCustomers]     = useState(INIT_CUSTOMERS)
  const [history, setHistory]         = useState(INIT_HISTORY)
  const [search, setSearch]           = useState('')
  const [filterType, setFilterType]   = useState('all')
  const [selectedCust, setSelectedCust] = useState(null)
  const [modal, setModal]             = useState(null) // 'topup' | 'debit' | 'history'
  const [amount, setAmount]           = useState('')
  const [method, setMethod]           = useState('Bank Transfer')
  const [note, setNote]               = useState('')

  const filteredCust    = useMemo(() => customers.filter(c => { if (!search) return true; const q=search.toLowerCase(); return c.name.toLowerCase().includes(q)||c.phone.includes(q)||c.zone.toLowerCase().includes(q) }), [customers, search])
  const filteredHistory = useMemo(() => filterType==='all' ? history : history.filter(h=>h.type===filterType), [history, filterType])

  const totalFunds     = customers.reduce((s,c)=>s+c.wallet, 0)
  const withBalance    = customers.filter(c=>c.wallet>0).length
  const todayTopups    = history.filter(h=>h.type==='topup'&&h.date==='2026-06-27').reduce((s,h)=>s+h.amount,0)

  const closeModal = () => { setModal(null); setSelectedCust(null); setAmount(''); setNote('') }

  const processTopUp = () => {
    const amt = parseInt(amount)
    if (!amt||!selectedCust) return
    const ref = `WLT-${String(history.length+235).padStart(4,'0')}`
    const newBal = selectedCust.wallet + amt
    setCustomers(prev => prev.map(c => c.id===selectedCust.id ? { ...c, wallet:newBal, lastTopUp:new Date().toISOString().slice(0,10), totalTopUps:c.totalTopUps+1 } : c))
    setHistory(prev => [{ id:ref, customer:selectedCust.name, customerId:selectedCust.id, type:'topup', method, amount:+amt, bal:newBal, date:new Date().toISOString().slice(0,10), time:new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}), note:note||'' }, ...prev])
    closeModal()
  }

  const processDebit = () => {
    const amt = parseInt(amount)
    if (!amt||!selectedCust||amt>selectedCust.wallet) return
    const ref = `DBT-${String(history.length+100).padStart(4,'0')}`
    const newBal = selectedCust.wallet - amt
    setCustomers(prev => prev.map(c => c.id===selectedCust.id ? { ...c, wallet:newBal } : c))
    setHistory(prev => [{ id:ref, customer:selectedCust.name, customerId:selectedCust.id, type:'debit', method:'Admin Debit', amount:-amt, bal:newBal, date:new Date().toISOString().slice(0,10), time:new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}), note:note||'Manual debit by admin' }, ...prev])
    closeModal()
  }

  const custHistory = selectedCust ? history.filter(h=>h.customerId===selectedCust.id) : []

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <PageHeader title="Wallet Balances" subtitle="Manage customer wallet funds, top-ups, and credits" />

      {/* KPI Strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Funds in System',  val:fmt(totalFunds),   icon:'ri-safe-line',           color:'#22c55e', bg:'#f0fdf4' },
          { label:'Wallets with Balance',   val:withBalance,        icon:'ri-wallet-3-line',        color:'#3b82f6', bg:'#eff6ff' },
          { label:"Today's Top-ups",        val:fmt(todayTopups),  icon:'ri-arrow-up-circle-line', color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Total Customers',        val:customers.length,   icon:'ri-group-line',           color:'#f59e0b', bg:'#fffbeb' },
          { label:'Zero Balance',           val:customers.filter(c=>c.wallet===0).length, icon:'ri-wallet-line', color:'#94a3b8', bg:'#f8fafc' },
        ].map(k => (
          <div key={k.label} style={{ ...card, padding:'14px 16px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
            <div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:'#111827', fontFamily:'Syne, sans-serif', lineHeight:1 }}>{k.val}</div>
            </div>
            <div style={{ width:38, height:38, borderRadius:9, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={k.icon} style={{ color:k.color, fontSize:18 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 400px', gap:16, alignItems:'start' }}>
        {/* Left — Customer Table */}
        <div>
          <div style={{ ...card, padding:'10px 14px', marginBottom:12 }}>
            <div style={{ position:'relative' }}>
              <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:14 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…" style={{ ...inp, paddingLeft:32 }} />
            </div>
          </div>

          <div style={card}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'#374151' }}>{filteredCust.length} customers</span>
              <span style={{ fontSize:12, color:'#6b7280' }}>Total: <strong style={{ color:'#16a34a' }}>{fmt(filteredCust.reduce((s,c)=>s+c.wallet,0))}</strong></span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{['CUSTOMER','TIER','WALLET BALANCE','LAST TOP-UP','TOTAL TOP-UPS',''].map(h => <TH key={h}>{h}</TH>)}</tr>
                </thead>
                <tbody>
                  {filteredCust.map((c,i) => {
                    const tc = TIER_CFG[c.tier]
                    return (
                      <tr key={c.id}>
                        <TD>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:36, height:36, borderRadius:'50%', background:AVATAR_COLORS[i%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>{ini(c.name)}</div>
                            <div>
                              <div style={{ fontWeight:600, fontSize:13 }}>{c.name}</div>
                              <div style={{ fontSize:11, color:'#94a3b8' }}>{c.phone}</div>
                            </div>
                          </div>
                        </TD>
                        <TD>
                          <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:tc.bg, color:tc.color, border:`1px solid ${tc.border}` }}>{c.tier}</span>
                        </TD>
                        <TD>
                          <span style={{ fontWeight:700, fontSize:14, color:c.wallet>0?'#22c55e':'#94a3b8' }}>{fmt(c.wallet)}</span>
                        </TD>
                        <TD style={{ color:'#6b7280', fontSize:12 }}>{c.lastTopUp}</TD>
                        <TD style={{ color:'#6b7280', fontSize:12 }}>{c.totalTopUps}×</TD>
                        <TD>
                          <div style={{ display:'flex', gap:5 }}>
                            <button onClick={() => { setSelectedCust(c); setModal('topup'); setAmount(''); setNote(''); setMethod('Bank Transfer') }} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 9px', borderRadius:7, border:'none', background:'#f0fdf4', color:'#16a34a', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'Nunito, sans-serif' }}>
                              <i className="ri-add-line" />Top Up
                            </button>
                            <button onClick={() => { setSelectedCust(c); setModal('debit'); setAmount(''); setNote('') }} disabled={c.wallet===0} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 9px', borderRadius:7, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:11, fontWeight:700, cursor:c.wallet===0?'not-allowed':'pointer', fontFamily:'Nunito, sans-serif', opacity:c.wallet===0?0.5:1 }}>
                              <i className="ri-subtract-line" />Debit
                            </button>
                            <button onClick={() => { setSelectedCust(c); setModal('history') }} title="View History" style={{ width:28, height:28, borderRadius:'50%', border:'1.5px solid #bfdbfe', background:'#eff6ff', color:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                              <i className="ri-history-line" style={{ fontSize:12 }} />
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

        {/* Right — Transaction Feed */}
        <div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
            {['all','topup','debit','credit','refund'].map(t => {
              const cfg = t!=='all' ? TYPE_CFG[t] : null
              const isActive = filterType===t
              return (
                <button key={t} onClick={() => setFilterType(t)} style={{ padding:'5px 12px', borderRadius:7, border:'none', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Nunito, sans-serif', background: isActive?(cfg?cfg.color:'#1B4332'):'#f8fafc', color: isActive?'#fff':'#64748b' }}>
                  {t==='all'?'All':cfg.label}
                </button>
              )
            })}
          </div>

          <div style={card}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', fontWeight:700, fontSize:14, color:'#111827' }}>Wallet Transactions</div>
            <div style={{ maxHeight:520, overflowY:'auto' }}>
              {filteredHistory.map((h,i) => {
                const tc = TYPE_CFG[h.type]
                return (
                  <div key={h.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', borderBottom: i<filteredHistory.length-1?'1px solid #f9fafb':'none' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:tc.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <i className={tc.icon} style={{ color:tc.color, fontSize:15 }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600 }}>{h.customer}</div>
                      <div style={{ fontSize:11, color:'#6b7280' }}>{tc.label} · {h.method}</div>
                      <div style={{ fontSize:10, color:'#94a3b8' }}>{h.id} · {h.date} {h.time}</div>
                      {h.note && <div style={{ fontSize:10, color:'#94a3b8', fontStyle:'italic' }}>{h.note}</div>}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontWeight:700, color:h.amount>0?'#22c55e':'#3b82f6', fontSize:13 }}>{h.amount>0?'+':''}{fmt(h.amount)}</div>
                      <div style={{ fontSize:10, color:'#94a3b8' }}>Bal: {fmt(h.bal)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* TOP-UP Modal */}
      {modal==='topup' && selectedCust && (
        <ModalShell title="Top Up Wallet" onClose={closeModal}>
          <div style={{ padding:24 }}>
            <CustomerSummary c={selectedCust} customers={customers} label="Current balance" />
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Quick Amount</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[1000,2000,5000,10000,20000,50000].map(a => (
                  <button key={a} type="button" onClick={() => setAmount(String(a))} style={{ padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Nunito, sans-serif', border:'1px solid #bbf7d0', background:amount===String(a)?'#22c55e':'#f0fdf4', color:amount===String(a)?'#fff':'#16a34a' }}>
                    {fmt(a)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Amount <span style={{ color:'#dc2626' }}>*</span></label>
              <div style={{ display:'flex' }}>
                <span style={{ padding:'9px 10px', borderRadius:'8px 0 0 8px', border:'1.5px solid #e5e7eb', borderRight:'none', background:'#f1f5f9', fontSize:13, color:'#374151', flexShrink:0 }}>₦</span>
                <input type="number" min={1} placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inp, borderRadius:'0 8px 8px 0', flex:1 }} />
              </div>
              {amount && <div style={{ marginTop:4, fontSize:11, color:'#22c55e' }}>New balance: {fmt(selectedCust.wallet+parseInt(amount||0))}</div>}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Payment Method</label>
              <select value={method} onChange={e => setMethod(e.target.value)} style={inp}>
                {METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Note (optional)</label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. June wallet load" style={inp} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:600 }}>Cancel</button>
              <button disabled={!amount||parseInt(amount)<1} onClick={processTopUp} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#16a34a', color:'#fff', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:700, cursor:(!amount||parseInt(amount)<1)?'not-allowed':'pointer', opacity:(!amount||parseInt(amount)<1)?0.6:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <i className="ri-add-circle-line" />Top Up {amount?fmt(amount):''}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* DEBIT Modal */}
      {modal==='debit' && selectedCust && (
        <ModalShell title="Debit Wallet" onClose={closeModal}>
          <div style={{ padding:24 }}>
            <CustomerSummary c={selectedCust} customers={customers} label="Available" />
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Amount to Debit <span style={{ color:'#dc2626' }}>*</span></label>
              <div style={{ display:'flex' }}>
                <span style={{ padding:'9px 10px', borderRadius:'8px 0 0 8px', border:'1.5px solid #e5e7eb', borderRight:'none', background:'#f1f5f9', fontSize:13, color:'#374151', flexShrink:0 }}>₦</span>
                <input type="number" min={1} max={selectedCust.wallet} placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inp, borderRadius:'0 8px 8px 0', flex:1 }} />
              </div>
              {amount && parseInt(amount)>selectedCust.wallet && <div style={{ fontSize:11, color:'#dc2626', marginTop:4 }}>Exceeds wallet balance.</div>}
              {amount && parseInt(amount)<=selectedCust.wallet && <div style={{ marginTop:4, fontSize:11, color:'#ef4444' }}>Remaining: {fmt(selectedCust.wallet-parseInt(amount))}</div>}
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Reason <span style={{ color:'#dc2626' }}>*</span></label>
              <textarea rows={2} placeholder="e.g. Error correction, manual adjustment…" value={note} onChange={e => setNote(e.target.value)} style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:600 }}>Cancel</button>
              <button disabled={!amount||parseInt(amount)<1||parseInt(amount)>selectedCust.wallet||!note.trim()} onClick={processDebit} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:700, cursor:'pointer' }}>
                Debit {amount?fmt(amount):''}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* HISTORY Modal */}
      {modal==='history' && selectedCust && (
        <ModalShell title={`Wallet History — ${selectedCust.name}`} onClose={closeModal} wide>
          <div style={{ background:'#f0fdf4', padding:'12px 20px', borderBottom:'1px solid #e5e7eb', flexShrink:0 }}>
            <div style={{ fontSize:11, color:'#16a34a' }}>Current Balance</div>
            <div style={{ fontSize:24, fontWeight:800, color:'#16a34a', fontFamily:'Syne, sans-serif', lineHeight:1 }}>{fmt(selectedCust.wallet)}</div>
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {custHistory.length===0 && <div style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8', fontSize:13 }}>No wallet transactions yet.</div>}
            {custHistory.map((h,i) => {
              const tc = TYPE_CFG[h.type]
              return (
                <div key={h.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 20px', borderBottom:i<custHistory.length-1?'1px solid #f9fafb':'none' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:tc.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <i className={tc.icon} style={{ color:tc.color, fontSize:14 }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13 }}>{tc.label} — {h.method}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{h.id} · {h.date}</div>
                    {h.note && <div style={{ fontSize:10, color:'#94a3b8', fontStyle:'italic' }}>{h.note}</div>}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontWeight:700, color:h.amount>0?'#22c55e':'#3b82f6', fontSize:13 }}>{h.amount>0?'+':''}{fmt(h.amount)}</div>
                    <div style={{ fontSize:10, color:'#94a3b8' }}>Bal: {fmt(h.bal)}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ padding:'12px 16px', borderTop:'1px solid #e5e7eb', display:'flex', gap:10, flexShrink:0 }}>
            <button onClick={() => { setModal('topup'); setAmount(''); setNote(''); setMethod('Bank Transfer') }} style={{ flex:1, padding:'8px', borderRadius:8, border:'none', background:'#16a34a', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Nunito, sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <i className="ri-add-line" />Top Up
            </button>
            <button onClick={closeModal} style={{ flex:1, padding:'8px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:12, fontFamily:'Nunito, sans-serif', fontWeight:600 }}>Close</button>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
