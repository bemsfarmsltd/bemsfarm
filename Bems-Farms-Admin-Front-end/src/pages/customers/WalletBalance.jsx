import { useState, useMemo, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import api from '../../lib/api'

const fmt = n => `₦${Number(n).toLocaleString()}`
const ini = n => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const fmtDate = d => d ? new Date(d).toISOString().slice(0,10) : '—'
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : ''

const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16','#a855f7','#ef4444','#10b981','#d97706','#6366f1']

// DB wallet_transactions.type is constrained to order/refund/loyalty vocabulary
const DB_TYPE_TO_UI = { top_up:'topup', order_payment:'debit', refund_credit:'refund', loyalty_redemption:'credit' }

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
  const [customers, setCustomers]     = useState([])
  const [history, setHistory]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterType, setFilterType]   = useState('all')
  const [selectedCust, setSelectedCust] = useState(null)
  const [modal, setModal]             = useState(null) // 'topup' | 'debit' | 'history'
  const [amount, setAmount]           = useState('')
  const [method, setMethod]           = useState('Bank Transfer')
  const [note, setNote]               = useState('')
  const [saving, setSaving]           = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [custRes, actRes] = await Promise.all([
        api.get('/admin/customers', { params: { limit: 200 } }),
        api.get('/admin/customers/wallet/activity', { params: { limit: 30 } }),
      ])
      const rawHistory = (actRes.data.activity || []).map(a => ({
        id: a.reference, customer: a.customer_name, customerId: a.customer_code,
        type: DB_TYPE_TO_UI[a.type] || 'debit', method: a.payment_method || '—',
        amount: Number(a.amount), bal: Number(a.balance_after),
        date: fmtDate(a.created_at), time: fmtTime(a.created_at), note: a.description || '',
      }))
      setCustomers((custRes.data.customers || []).map(c => {
        const topups = rawHistory.filter(h => h.customerId === c.customer_code && h.type === 'topup')
        return {
          id: c.customer_code, dbId: c.id, name: c.name, phone: c.phone,
          zone: c.zone || '—', tier: c.tier, wallet: Number(c.wallet_balance) || 0,
          lastTopUp: topups.length ? topups[0].date : '—',
          totalTopUps: topups.length,
          status: c.status,
        }
      }))
      setHistory(rawHistory)
    } catch {
      toast.error('Failed to load wallet data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredCust    = useMemo(() => customers.filter(c => { if (!search) return true; const q=search.toLowerCase(); return c.name.toLowerCase().includes(q)||c.phone.includes(q)||c.zone.toLowerCase().includes(q) }), [customers, search])
  const filteredHistory = useMemo(() => filterType==='all' ? history : history.filter(h=>h.type===filterType), [history, filterType])

  const totalFunds     = customers.reduce((s,c)=>s+c.wallet, 0)
  const withBalance    = customers.filter(c=>c.wallet>0).length
  const todayStr       = new Date().toISOString().slice(0,10)
  const todayTopups    = history.filter(h=>h.type==='topup'&&h.date===todayStr).reduce((s,h)=>s+h.amount,0)

  const closeModal = () => { setModal(null); setSelectedCust(null); setAmount(''); setNote('') }

  async function processTopUp() {
    const amt = parseInt(amount)
    if (!amt || !selectedCust || saving) return
    setSaving(true)
    try {
      await api.post(`/admin/customers/${selectedCust.dbId}/wallet`, { amount: amt, type: 'topup', method, note })
      toast.success('Wallet topped up')
      closeModal()
      await loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Top-up failed')
    } finally {
      setSaving(false)
    }
  }

  async function processDebit() {
    const amt = parseInt(amount)
    if (!amt || !selectedCust || amt>selectedCust.wallet || saving) return
    setSaving(true)
    try {
      await api.post(`/admin/customers/${selectedCust.dbId}/wallet`, { amount: amt, type: 'debit', note: note || 'Manual debit by admin' })
      toast.success('Wallet debited')
      closeModal()
      await loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Debit failed')
    } finally {
      setSaving(false)
    }
  }

  const custHistory = selectedCust ? history.filter(h=>h.customerId===selectedCust.id) : []

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <PageHeader title="Wallet Balances" subtitle="Manage customer wallet funds, top-ups, and credits" />

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#6b7280' }}><i className="ri-loader-4-line" style={{ fontSize:28 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
      ) : (
      <>
      {/* KPI Strip */}
      <div className="grid-stats-auto" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
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

      <div className="grid-sidebar-split" style={{ display:'grid', gridTemplateColumns:'1fr 400px', gap:16, alignItems:'start' }}>
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
                  {filteredCust.length === 0 && (
                    <tr><td colSpan={6} style={{ padding:'30px 12px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>No customers found</td></tr>
                  )}
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
              {filteredHistory.length === 0 && (
                <div style={{ padding:'30px 16px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>No transactions yet</div>
              )}
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
              <button disabled={!amount||parseInt(amount)<1||saving} onClick={processTopUp} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#16a34a', color:'#fff', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:700, cursor:(!amount||parseInt(amount)<1||saving)?'not-allowed':'pointer', opacity:(!amount||parseInt(amount)<1||saving)?0.6:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <i className="ri-add-circle-line" />{saving ? 'Saving…' : `Top Up ${amount?fmt(amount):''}`}
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
              <button disabled={!amount||parseInt(amount)<1||parseInt(amount)>selectedCust.wallet||!note.trim()||saving} onClick={processDebit} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:700, cursor:'pointer' }}>
                {saving ? 'Saving…' : `Debit ${amount?fmt(amount):''}`}
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
      </>
      )}
    </div>
  )
}