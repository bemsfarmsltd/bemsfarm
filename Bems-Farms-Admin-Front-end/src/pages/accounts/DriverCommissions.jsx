import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const fmt  = n => `₦${Number(n || 0).toLocaleString()}`
const fmtD = s => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'
const ini  = name => (name || '?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()

const DRIVER_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899']
const colorFor = (id) => DRIVER_COLORS[Number(id || 0) % DRIVER_COLORS.length]

// driver_commissions.status is one of pending/approved/paid — set server-side,
// per server/src/routes/accounts_admin.js PATCH /commissions/:id
const STATUS_CFG = {
  pending:  { label:'Pending',  cls:'bg-warning-subtle text-warning border-warning-subtle' },
  approved: { label:'Approved', cls:'bg-info-subtle text-info border-info-subtle' },
  paid:     { label:'Paid',     cls:'bg-success-subtle text-success border-success-subtle' },
}

// Maps a real driver_commissions row (joined with drivers) to this page's UI shape.
function mapCommission(c) {
  return {
    id: c.id,
    driverId: c.driver_id,
    driver: c.driver_name || 'Unknown Driver',
    phone: c.driver_phone || '',
    vehiclePlate: c.vehicle_plate || '',
    periodFrom: c.period_from,
    periodTo: c.period_to,
    deliveries: Number(c.deliveries || 0),
    baseAmount: Number(c.base_amount || 0),
    bonus: Number(c.bonus || 0),
    deductions: Number(c.deductions || 0),
    netPayout: Number(c.net_payout || 0),
    status: c.status || 'pending',
    paymentRef: c.payment_ref || '',
    paidAt: c.paid_at,
  }
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const weekAgoISO = () => new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

export default function DriverCommissions() {
  const [records, setRecords]   = useState([])
  const [stats, setStats]       = useState(null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [search, setSearch]     = useState('')
  const [filterSt, setFiltSt]   = useState('all')

  const [genForm, setGenForm]   = useState({ period_from: weekAgoISO(), period_to: todayISO(), rate_per_delivery: 500 })
  const [generating, setGenerating] = useState(false)

  const [payModal, setPayModal]   = useState(null)
  const [payForm, setPayForm]     = useState({ bankAccountId: '', paymentRef: '' })
  const [payConfirm, setPayConfirm] = useState(false)
  const [viewModal, setViewModal] = useState(null) // driverId
  const [busyId, setBusyId]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await api.get('/admin/accounts/commissions', {
        params: { limit: 200, search: search || undefined, status: filterSt === 'all' ? undefined : filterSt },
      })
      setRecords((res.data?.commissions || []).map(mapCommission))
      setStats(res.data?.stats || null)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [search, filterSt])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.get('/admin/accounts/bank-accounts').then(res => {
      setBankAccounts((res.data?.bank_accounts || []).filter(a => a.status === 'active'))
    }).catch(() => {})
  }, [])

  const generateCommissions = async () => {
    setGenerating(true)
    try {
      const res = await api.post('/admin/accounts/commissions/generate', genForm)
      alert(res.data?.message || 'Commissions generated.')
      await load()
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not generate commissions.')
    } finally {
      setGenerating(false)
    }
  }

  const approveCommission = async (c) => {
    setBusyId(c.id)
    try {
      await api.patch(`/admin/accounts/commissions/${c.id}`, { status: 'approved' })
      await load()
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not approve this commission.')
    } finally {
      setBusyId(null)
    }
  }

  const openPay = (c) => { setPayModal(c); setPayForm({ bankAccountId: '', paymentRef: '' }); setPayConfirm(false) }
  const closePay = () => { setPayModal(null); setPayConfirm(false) }

  const confirmPay = async () => {
    setBusyId(payModal.id)
    try {
      await api.patch(`/admin/accounts/commissions/${payModal.id}`, {
        status: 'paid',
        bank_account_id: payForm.bankAccountId ? Number(payForm.bankAccountId) : undefined,
        payment_ref: payForm.paymentRef || undefined,
      })
      await load()
      closePay()
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not process this payout.')
    } finally {
      setBusyId(null)
    }
  }

  // Group loaded rows by driver — for the driver cards and per-driver history
  const byDriver = useMemo(() => {
    const map = new Map()
    records.forEach(c => {
      if (!map.has(c.driverId)) map.set(c.driverId, { driverId: c.driverId, driver: c.driver, phone: c.phone, records: [] })
      map.get(c.driverId).records.push(c)
    })
    return Array.from(map.values()).map(d => ({
      ...d,
      unpaid: d.records.filter(r => r.status !== 'paid').reduce((s, r) => s + r.netPayout, 0),
      totalEarned: d.records.reduce((s, r) => s + r.netPayout, 0),
      totalDeliveries: d.records.reduce((s, r) => s + r.deliveries, 0),
      lastPaid: d.records.filter(r => r.paidAt).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))[0]?.paidAt,
    }))
  }, [records])

  const paidRecords = records.filter(r => r.status === 'paid').sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0))

  const totalUnpaid     = stats ? Number(stats.total_unpaid || 0) : records.filter(r => r.status !== 'paid').reduce((s,r)=>s+r.netPayout,0)
  const totalPaidStat   = stats ? Number(stats.total_paid || 0)   : records.filter(r => r.status === 'paid').reduce((s,r)=>s+r.netPayout,0)
  const totalDeliveries = stats ? Number(stats.total_deliveries || 0) : records.reduce((s,r)=>s+r.deliveries,0)
  const pendingCount    = stats ? Number(stats.pending_count || 0) : records.filter(r=>r.status==='pending').length

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Driver Commissions</h6>
          <p className="text-muted mb-0" style={{ fontSize:12 }}>Generate, approve and pay driver commissions per period</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/accounts/overview">Finance</Link></li>
          <li className="breadcrumb-item active">Commissions</li>
        </ul>
      </div>

      {error && (
        <div className="alert alert-warning d-flex align-items-center gap-3 rounded-3 mb-3">
          <i className="ri-wifi-off-line fs-4" />
          <div className="flex-grow-1">
            <strong>Could not load commissions.</strong>
            <span className="text-muted ms-2 fs-sm">Check your connection or server status.</span>
          </div>
          <button className="btn btn-sm btn-outline-warning" onClick={load}>Retry</button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Paid Out',    val:fmt(totalPaidStat), color:'#22c55e', bg:'#f0fdf4', icon:'ri-money-dollar-circle-line' },
          { label:'Total Unpaid',      val:fmt(totalUnpaid),   color:'#f59e0b', bg:'#fffbeb', icon:'ri-time-line' },
          { label:'Deliveries (loaded)',val:totalDeliveries,   color:'#3b82f6', bg:'#eff6ff', icon:'ri-e-bike-2-line' },
          { label:'Pending Approval',  val:pendingCount,       color:'#8b5cf6', bg:'#f5f3ff', icon:'ri-user-star-line' },
        ].map((k,i) => (
          <div key={i} className="col-6 col-md-4 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3 d-flex align-items-center gap-3">
                <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width:44, height:44, background:k.bg }}>
                  <i className={`${k.icon} fs-20`} style={{ color:k.color }}/>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize:11 }}>{k.label}</div>
                  <div className="fw-bold" style={{ fontSize:16 }}>{k.val}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Generate Commissions */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="fw-medium mb-3" style={{ fontSize:13 }}>
            <i className="ri-calculator-line me-1 text-primary"/>Generate Commissions for a Period
          </div>
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">From</label>
              <input type="date" className="form-control form-control-sm" value={genForm.period_from}
                onChange={e => setGenForm(f => ({ ...f, period_from: e.target.value }))}/>
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">To</label>
              <input type="date" className="form-control form-control-sm" value={genForm.period_to}
                onChange={e => setGenForm(f => ({ ...f, period_to: e.target.value }))}/>
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">Rate per Delivery (₦)</label>
              <input type="number" className="form-control form-control-sm" value={genForm.rate_per_delivery}
                onChange={e => setGenForm(f => ({ ...f, rate_per_delivery: e.target.value }))}/>
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary btn-sm w-100" onClick={generateCommissions} disabled={generating}>
                {generating ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="ri-flashlight-line me-1"/>}
                Generate
              </button>
            </div>
          </div>
          <p className="text-muted mt-2 mb-0" style={{ fontSize:11 }}>
            Creates one commission record per active driver, counting their delivered orders in this date range × the rate above. Running this again for an overlapping period skips drivers who already have a record for it.
          </p>
        </div>
      </div>

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="alert d-flex align-items-center justify-content-between gap-3 mb-4 border-0"
          style={{ background:'#fffbeb', border:'1px solid #fde68a !important', borderRadius:8 }}>
          <div className="d-flex align-items-center gap-2">
            <i className="ri-coin-line" style={{ color:'#d97706', fontSize:18 }}/>
            <span style={{ fontSize:13, color:'#92400e' }}>
              <strong>{pendingCount}</strong> commission record{pendingCount === 1 ? '' : 's'} awaiting approval — <strong>{fmt(totalUnpaid)}</strong> unpaid in total.
            </span>
          </div>
          <button className="btn btn-sm" style={{ background:'#d97706', color:'#fff', fontSize:12, whiteSpace:'nowrap' }}
            onClick={() => setFiltSt('pending')}>
            Review Pending
          </button>
        </div>
      )}

      {/* Driver summary cards (grouped from loaded records) */}
      {byDriver.length > 0 && (
        <>
          <h6 className="mb-3" style={{ fontSize:14 }}>Drivers with Commission Records (loaded)</h6>
          <div className="row g-3 mb-4">
            {byDriver.map(d => (
              <div key={d.driverId} className="col-md-6 col-xl-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                        style={{ width:44, height:44, background:colorFor(d.driverId), fontSize:15 }}>
                        {ini(d.driver)}
                      </div>
                      <div className="flex-fill">
                        <div className="fw-semibold" style={{ fontSize:14 }}>{d.driver}</div>
                        <div className="text-muted" style={{ fontSize:11 }}>{d.phone}</div>
                      </div>
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div style={{ background:'#f8fafc', borderRadius:6, padding:'8px 10px' }}>
                          <div className="text-muted" style={{ fontSize:10 }}>Deliveries (loaded)</div>
                          <div className="fw-semibold" style={{ fontSize:13 }}>{d.totalDeliveries}</div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div style={{ background:'#f8fafc', borderRadius:6, padding:'8px 10px' }}>
                          <div className="text-muted" style={{ fontSize:10 }}>Total Earned</div>
                          <div className="fw-semibold" style={{ fontSize:13 }}>{fmt(d.totalEarned)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between p-2 rounded mb-3"
                      style={{ background: d.unpaid>0?'#fffbeb':'#f0fdf4', border:`1px solid ${d.unpaid>0?'#fde68a':'#bbf7d0'}` }}>
                      <div>
                        <div style={{ fontSize:10, color: d.unpaid>0?'#92400e':'#14532d' }}>Unpaid Balance</div>
                        <div className="fw-bold" style={{ fontSize:16, color: d.unpaid>0?'#d97706':'#22c55e' }}>{fmt(d.unpaid)}</div>
                      </div>
                      <div className="text-muted" style={{ fontSize:10 }}>Last paid: {fmtD(d.lastPaid)}</div>
                    </div>
                    <button className="btn btn-sm btn-outline-secondary w-100" style={{ fontSize:11 }}
                      onClick={() => setViewModal(d.driverId)}>
                      <i className="ri-eye-line me-1"/>View Records
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Records table */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="fw-medium" style={{ fontSize:14 }}>Commission Records</div>
            <div className="d-flex gap-2">
              <div className="input-group input-group-sm" style={{ width: 200 }}>
                <span className="input-group-text bg-light border-end-0"><i className="ri-search-line text-muted"/></span>
                <input type="text" className="form-control border-start-0 bg-light" placeholder="Search driver…"
                  value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <select className="form-select form-select-sm" style={{ width: 140 }} value={filterSt} onChange={e=>setFiltSt(e.target.value)}>
                <option value="all">All Status</option>
                {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0" style={{ fontSize:13 }}>
            <thead style={{ background:'#f8fafc' }}>
              <tr>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>DRIVER</th>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>PERIOD</th>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>DELIVERIES</th>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>NET PAYOUT</th>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>STATUS</th>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                  Loading commissions…
                </td></tr>
              ) : records.length === 0 && (
                <tr><td colSpan={6} className="text-center py-5 text-muted">No commission records yet — generate some above.</td></tr>
              )}
              {!loading && records.map(c => (
                <tr key={c.id}>
                  <td className="px-3 py-2">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                        style={{ width:26, height:26, fontSize:10, background:colorFor(c.driverId) }}>{ini(c.driver)}</div>
                      <span style={{ fontSize:12 }}>{c.driver}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted" style={{ fontSize:12 }}>{fmtD(c.periodFrom)} – {fmtD(c.periodTo)}</td>
                  <td className="px-3 py-2">{c.deliveries}</td>
                  <td className="px-3 py-2 fw-semibold">{fmt(c.netPayout)}</td>
                  <td className="px-3 py-2">
                    <span className={`badge border ${STATUS_CFG[c.status]?.cls}`} style={{ fontSize:11 }}>{STATUS_CFG[c.status]?.label}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="d-flex gap-1">
                      {c.status === 'pending' && (
                        <button className="btn btn-sm btn-outline-info" style={{ fontSize:11, padding:'2px 8px' }}
                          disabled={busyId === c.id} onClick={() => approveCommission(c)}>
                          {busyId === c.id ? <span className="spinner-border spinner-border-sm" /> : 'Approve'}
                        </button>
                      )}
                      {c.status === 'approved' && (
                        <button className="btn btn-sm btn-outline-success" style={{ fontSize:11, padding:'2px 8px' }}
                          onClick={() => openPay(c)}>Pay</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Payout Log */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom">
          <div className="fw-medium" style={{ fontSize:14 }}>Recent Payouts</div>
        </div>
        <div className="card-body p-0">
          {paidRecords.length === 0 ? (
            <p className="text-muted text-center py-4 mb-0" style={{ fontSize:13 }}>No payouts recorded yet.</p>
          ) : paidRecords.slice(0,8).map((p,i,arr) => (
            <div key={p.id} className={`d-flex align-items-center gap-3 px-3 py-2 ${i<arr.length-1?'border-bottom':''}`}>
              <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                style={{ width:34, height:34, fontSize:12, background: colorFor(p.driverId) }}>
                {ini(p.driver)}
              </div>
              <div className="flex-fill">
                <div style={{ fontSize:12, fontWeight:500 }}>{p.driver}</div>
                <div className="text-muted" style={{ fontSize:10 }}>{fmtD(p.paidAt)} · {p.deliveries} deliveries{p.paymentRef ? ` · ${p.paymentRef}` : ''}</div>
              </div>
              <div className="text-end">
                <div className="fw-bold text-success" style={{ fontSize:13 }}>{fmt(p.netPayout)}</div>
                <div style={{ fontSize:9, color:'#16a34a' }}>✓ Paid</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pay Out Modal */}
      {payModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={closePay}>
          <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ color:'#fff', fontWeight:600, fontSize:15 }}>Pay Driver Commission</span>
              <button className="btn-close btn-close-white btn-sm" onClick={closePay}/>
            </div>
            <div className="p-4">
              <div className="d-flex align-items-center gap-3 p-3 rounded mb-4" style={{ background:'#f8fafc' }}>
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                  style={{ width:48, height:48, background:colorFor(payModal.driverId), fontSize:16 }}>
                  {ini(payModal.driver)}
                </div>
                <div>
                  <div className="fw-semibold">{payModal.driver}</div>
                  <div className="text-muted" style={{ fontSize:12 }}>{payModal.phone}</div>
                </div>
              </div>

              {[
                { label:'Period', val:`${fmtD(payModal.periodFrom)} – ${fmtD(payModal.periodTo)}` },
                { label:'Deliveries', val: payModal.deliveries },
                { label:'Amount to Pay', val: fmt(payModal.netPayout), big:true },
              ].map(r => (
                <div key={r.label} className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted" style={{ fontSize:13 }}>{r.label}</span>
                  <span style={{ fontSize: r.big?16:13, fontWeight: r.big?700:500, color: r.big?'#22c55e':undefined }}>{r.val}</span>
                </div>
              ))}

              <div className="mt-3">
                <label className="form-label" style={{ fontSize:12 }}>Pay From Bank Account</label>
                <select className="form-select form-select-sm" value={payForm.bankAccountId}
                  onChange={e => setPayForm(f => ({ ...f, bankAccountId: e.target.value }))}>
                  <option value="">— Not linked to a bank account —</option>
                  {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name}</option>)}
                </select>
              </div>
              <div className="mt-3 mb-4">
                <label className="form-label" style={{ fontSize:12 }}>Payment Reference (optional)</label>
                <input className="form-control form-control-sm" placeholder="e.g. transfer reference"
                  value={payForm.paymentRef} onChange={e=>setPayForm(f => ({ ...f, paymentRef: e.target.value }))}/>
              </div>

              {!payConfirm ? (
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closePay}>Cancel</button>
                  <button className="btn btn-success flex-fill" onClick={()=>setPayConfirm(true)}>
                    <i className="ri-send-plane-line me-1"/>Pay {fmt(payModal.netPayout)}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="alert mb-3" style={{ background:'#fefce8', border:'1px solid #fde68a', borderRadius:8 }}>
                    <div className="fw-medium mb-1" style={{ fontSize:13, color:'#92400e' }}>⚠ Confirm Payment</div>
                    <div style={{ fontSize:12, color:'#78350f' }}>
                      You are about to mark <strong>{fmt(payModal.netPayout)}</strong> as paid to <strong>{payModal.driver}</strong>. This action cannot be undone.
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary flex-fill" onClick={()=>setPayConfirm(false)} disabled={busyId === payModal.id}>Back</button>
                    <button className="btn btn-success flex-fill" onClick={confirmPay} disabled={busyId === payModal.id}>
                      {busyId === payModal.id ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="ri-check-line me-1"/>}
                      Confirm & Record
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View History Modal */}
      {viewModal && (() => {
        const d = byDriver.find(x => x.driverId === viewModal)
        if (!d) return null
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={()=>setViewModal(null)}>
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:520, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
              onClick={e=>e.stopPropagation()}>
              <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <span style={{ color:'#fff', fontWeight:600, fontSize:15 }}>Commission Records — {d.driver}</span>
                <button className="btn-close btn-close-white btn-sm" onClick={()=>setViewModal(null)}/>
              </div>
              <div style={{ overflowY:'auto', flex:1 }}>
                <div className="p-4">
                  <div className="row g-2 mb-4">
                    {[
                      { label:'Total Earned', val:fmt(d.totalEarned), color:'#3b82f6' },
                      { label:'Records', val:d.records.length,         color:'#22c55e' },
                      { label:'Deliveries', val:d.totalDeliveries,     color:'#0ea5e9' },
                      { label:'Unpaid', val:fmt(d.unpaid),             color:'#d97706' },
                    ].map(s => (
                      <div key={s.label} className="col-6">
                        <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px' }}>
                          <div className="text-muted" style={{ fontSize:11 }}>{s.label}</div>
                          <div className="fw-bold" style={{ fontSize:16, color:s.color }}>{s.val}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="fw-medium mb-2" style={{ fontSize:13 }}>Records</div>
                  {d.records.map((r,i) => (
                    <div key={r.id} className={`d-flex align-items-center justify-content-between py-2 ${i<d.records.length-1?'border-bottom':''}`}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500 }}>{fmtD(r.periodFrom)} – {fmtD(r.periodTo)}</div>
                        <div className="text-muted" style={{ fontSize:11 }}>{r.deliveries} deliveries{r.paymentRef ? ` · ${r.paymentRef}` : ''}</div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold" style={{ fontSize:13, color: r.status === 'paid' ? '#16a34a' : '#374151' }}>{fmt(r.netPayout)}</div>
                        <span className={`badge border ${STATUS_CFG[r.status]?.cls}`} style={{ fontSize:10 }}>{STATUS_CFG[r.status]?.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 border-top" style={{ flexShrink:0 }}>
                <button className="btn btn-secondary w-100" onClick={()=>setViewModal(null)}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
