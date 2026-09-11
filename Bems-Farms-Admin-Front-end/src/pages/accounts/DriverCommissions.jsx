import { useState, useMemo } from 'react'

const fmt = n => `₦${Number(n).toLocaleString()}`
const ini  = name => name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()

const DRIVER_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899']

const DRIVERS = [
  { id:'DRV-01', name:'Emeka Okafor',      phone:'08031234567', zone:'Lekki/VI',           deliveries:8,  rate:2300, totalEarned:412_500, unpaid:18_400, lastPaid:'2026-06-20', payouts:12, rating:4.8 },
  { id:'DRV-02', name:'Bola Akinwale',     phone:'08057892340', zone:'Ikeja/Maryland',     deliveries:5,  rate:2300, totalEarned:298_700, unpaid:11_500, lastPaid:'2026-06-20', payouts:9,  rating:4.6 },
  { id:'DRV-03', name:'Damilola Fashola',  phone:'07034512890', zone:'Surulere/Yaba',      deliveries:6,  rate:2300, totalEarned:344_800, unpaid:13_800, lastPaid:'2026-06-20', payouts:11, rating:4.7 },
  { id:'DRV-04', name:'Chidi Obi',         phone:'09012345678', zone:'Ajah/Sangotedo',     deliveries:4,  rate:2300, totalEarned:184_000, unpaid:9_200,  lastPaid:'2026-06-20', payouts:6,  rating:4.5 },
  { id:'DRV-05', name:'Segun Adeleke',     phone:'08023456789', zone:'Ikorodu',            deliveries:3,  rate:2300, totalEarned:138_000, unpaid:6_900,  lastPaid:'2026-06-20', payouts:5,  rating:4.4 },
  { id:'DRV-06', name:'Kunle Babatunde',   phone:'07056789012', zone:'Gbagada/Oworonshoki',deliveries:7,  rate:2300, totalEarned:391_000, unpaid:16_100, lastPaid:'2026-06-20', payouts:10, rating:4.9 },
]

const PAYOUT_HISTORY = [
  { ref:'PAY-0088', driverId:'DRV-01', driver:'Emeka Okafor',     date:'2026-06-20', deliveries:7, amount:16_100, method:'Bank Transfer', account:'0123456789 – GTBank', status:'paid' },
  { ref:'PAY-0087', driverId:'DRV-06', driver:'Kunle Babatunde',  date:'2026-06-20', deliveries:6, amount:13_800, method:'Bank Transfer', account:'9876543210 – Access', status:'paid' },
  { ref:'PAY-0086', driverId:'DRV-02', driver:'Bola Akinwale',    date:'2026-06-20', deliveries:5, amount:11_500, method:'Bank Transfer', account:'1234567890 – UBA',    status:'paid' },
  { ref:'PAY-0085', driverId:'DRV-03', driver:'Damilola Fashola', date:'2026-06-20', deliveries:6, amount:13_800, method:'Bank Transfer', account:'0987654321 – Zenith',  status:'paid' },
  { ref:'PAY-0084', driverId:'DRV-04', driver:'Chidi Obi',        date:'2026-06-20', deliveries:4, amount:9_200,  method:'Bank Transfer', account:'5678901234 – First',   status:'paid' },
  { ref:'PAY-0083', driverId:'DRV-05', driver:'Segun Adeleke',    date:'2026-06-20', deliveries:3, amount:6_900,  method:'Bank Transfer', account:'3456789012 – GTBank',  status:'paid' },
  { ref:'PAY-0082', driverId:'DRV-01', driver:'Emeka Okafor',     date:'2026-06-13', deliveries:8, amount:18_400, method:'Bank Transfer', account:'0123456789 – GTBank', status:'paid' },
  { ref:'PAY-0081', driverId:'DRV-06', driver:'Kunle Babatunde',  date:'2026-06-13', deliveries:7, amount:16_100, method:'Bank Transfer', account:'9876543210 – Access', status:'paid' },
  { ref:'PAY-0080', driverId:'DRV-03', driver:'Damilola Fashola', date:'2026-06-13', deliveries:5, amount:11_500, method:'Bank Transfer', account:'0987654321 – Zenith',  status:'paid' },
  { ref:'PAY-0079', driverId:'DRV-02', driver:'Bola Akinwale',    date:'2026-06-13', deliveries:6, amount:13_800, method:'Bank Transfer', account:'1234567890 – UBA',    status:'paid' },
]

const MONTHLY_SUMMARY = [
  { month:'Jan 2026', deliveries:148, totalPaid:340_400 },
  { month:'Feb 2026', deliveries:162, totalPaid:372_600 },
  { month:'Mar 2026', deliveries:155, totalPaid:356_500 },
  { month:'Apr 2026', deliveries:178, totalPaid:409_400 },
  { month:'May 2026', deliveries:194, totalPaid:446_200 },
  { month:'Jun 2026 (so far)', deliveries:33, totalPaid:71_900 },
]

export default function DriverCommissions() {
  const [search, setSearch] = useState('')
  const [payModal, setPayModal] = useState(null)   // driver to pay out
  const [viewModal, setViewModal] = useState(null) // driver detail
  const [payConfirm, setPayConfirm] = useState(false)
  const [payNote, setPayNote] = useState('')
  const [payouts, setPayouts] = useState(PAYOUT_HISTORY)
  const [drivers, setDrivers] = useState(DRIVERS)

  const filtered = useMemo(() => {
    if (!search) return drivers
    const q = search.toLowerCase()
    return drivers.filter(d => d.name.toLowerCase().includes(q) || d.zone.toLowerCase().includes(q))
  }, [search, drivers])

  const totalUnpaid     = drivers.reduce((s,d)=>s+d.unpaid,0)
  const totalEarned     = drivers.reduce((s,d)=>s+d.totalEarned,0)
  const totalDeliveries = drivers.reduce((s,d)=>s+d.deliveries,0)

  function processPayout(driver) {
    const ref = `PAY-${String(payouts.length + 89).padStart(4,'0')}`
    const newPayout = {
      ref, driverId:driver.id, driver:driver.name,
      date: new Date().toISOString().slice(0,10),
      deliveries: driver.deliveries,
      amount: driver.unpaid,
      method:'Bank Transfer', account:'— on file —', status:'paid',
    }
    setPayouts(p => [newPayout, ...p])
    setDrivers(prev => prev.map(d => d.id===driver.id ? { ...d, unpaid:0, deliveries:0, lastPaid:newPayout.date, payouts:d.payouts+1 } : d))
    setPayModal(null)
    setPayConfirm(false)
    setPayNote('')
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Driver Commissions</h6>
          <p className="text-muted mb-0" style={{ fontSize:12 }}>Track and pay driver earnings per delivery</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item text-muted">Accounts</li>
          <li className="breadcrumb-item active">Commissions</li>
        </ul>
      </div>

      {/* KPI Strip */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Earned (All Time)', val:fmt(totalEarned),   color:'#3b82f6', bg:'#eff6ff', icon:'ri-money-dollar-circle-line' },
          { label:'Total Unpaid — This Week', val:fmt(totalUnpaid),  color:'#f59e0b', bg:'#fffbeb', icon:'ri-time-line' },
          { label:'Deliveries This Week',     val:totalDeliveries,   color:'#22c55e', bg:'#f0fdf4', icon:'ri-e-bike-2-line' },
          { label:'Active Drivers',           val:drivers.length,    color:'#8b5cf6', bg:'#f5f3ff', icon:'ri-user-star-line' },
          { label:'Commission Rate',          val:'₦2,300 / delivery',color:'#0ea5e9',bg:'#f0f9ff', icon:'ri-percent-line' },
        ].map((k,i) => (
          <div key={i} className="col-6 col-md-4 col-xl">
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

      {/* Pending banner */}
      {totalUnpaid > 0 && (
        <div className="alert d-flex align-items-center justify-content-between gap-3 mb-4 border-0"
          style={{ background:'#fffbeb', border:'1px solid #fde68a !important', borderRadius:8 }}>
          <div className="d-flex align-items-center gap-2">
            <i className="ri-coin-line" style={{ color:'#d97706', fontSize:18 }}/>
            <span style={{ fontSize:13, color:'#92400e' }}>
              <strong>{fmt(totalUnpaid)}</strong> in unpaid commissions across {drivers.filter(d=>d.unpaid>0).length} drivers — pending this week's payout.
            </span>
          </div>
          <button className="btn btn-sm" style={{ background:'#d97706', color:'#fff', fontSize:12, whiteSpace:'nowrap' }}
            onClick={()=>{ /* scroll to table */ }}>
            Pay All Drivers
          </button>
        </div>
      )}

      {/* Driver Cards */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 className="mb-0" style={{ fontSize:14 }}>Driver Earnings</h6>
        <div className="input-group input-group-sm" style={{ maxWidth:220 }}>
          <span className="input-group-text bg-light border-end-0"><i className="ri-search-line text-muted"/></span>
          <input type="text" className="form-control border-start-0 bg-light" placeholder="Search driver or zone…"
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {filtered.map((d, i) => {
          const color = DRIVER_COLORS[i % DRIVER_COLORS.length]
          const thisWeekAmt = d.deliveries * d.rate
          return (
            <div key={d.id} className="col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3">
                  {/* Driver header */}
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                      style={{ width:44, height:44, background:color, fontSize:15 }}>
                      {ini(d.name)}
                    </div>
                    <div className="flex-fill">
                      <div className="fw-semibold" style={{ fontSize:14 }}>{d.name}</div>
                      <div className="text-muted" style={{ fontSize:11 }}><i className="ri-map-pin-line me-1"/>{d.zone}</div>
                    </div>
                    <div>
                      <span className="badge" style={{ background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0', fontSize:11 }}>
                        ★ {d.rating}
                      </span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="row g-2 mb-3">
                    {[
                      { label:'This Week',  val:d.deliveries + ' trips' },
                      { label:'Week Comm.', val:fmt(thisWeekAmt)       },
                      { label:'All Time',   val:fmt(d.totalEarned)     },
                      { label:'Payouts',    val:d.payouts              },
                    ].map(s => (
                      <div key={s.label} className="col-6">
                        <div style={{ background:'#f8fafc', borderRadius:6, padding:'8px 10px' }}>
                          <div className="text-muted" style={{ fontSize:10 }}>{s.label}</div>
                          <div className="fw-semibold" style={{ fontSize:13 }}>{s.val}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Unpaid balance */}
                  <div className="d-flex align-items-center justify-content-between p-2 rounded mb-3"
                    style={{ background: d.unpaid>0?'#fffbeb':'#f0fdf4', border:`1px solid ${d.unpaid>0?'#fde68a':'#bbf7d0'}` }}>
                    <div>
                      <div style={{ fontSize:10, color: d.unpaid>0?'#92400e':'#14532d' }}>Unpaid Balance</div>
                      <div className="fw-bold" style={{ fontSize:16, color: d.unpaid>0?'#d97706':'#22c55e' }}>
                        {fmt(d.unpaid)}
                      </div>
                    </div>
                    <div className="text-muted" style={{ fontSize:10 }}>Last paid: {d.lastPaid}</div>
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary flex-fill" style={{ fontSize:11 }}
                      onClick={()=>setViewModal(d)}>
                      <i className="ri-eye-line me-1"/>View History
                    </button>
                    {d.unpaid > 0 && (
                      <button className="btn btn-sm flex-fill" style={{ background:color, color:'#fff', fontSize:11 }}
                        onClick={()=>{ setPayModal(d); setPayConfirm(false); setPayNote('') }}>
                        <i className="ri-send-plane-line me-1"/>Pay {fmt(d.unpaid)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Monthly Commission Summary */}
      <div className="row g-3 mb-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <div className="fw-medium" style={{ fontSize:14 }}>Monthly Commission Summary — 2026</div>
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0" style={{ fontSize:13 }}>
                <thead style={{ background:'#f8fafc' }}>
                  <tr>
                    <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>MONTH</th>
                    <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>DELIVERIES</th>
                    <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>TOTAL PAID</th>
                    <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>AVG / DELIVERY</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHLY_SUMMARY.map((m,i) => (
                    <tr key={m.month} style={{ background: i===MONTHLY_SUMMARY.length-1?'#fffbeb':'' }}>
                      <td className="px-3 py-2">
                        {m.month}
                        {i===MONTHLY_SUMMARY.length-1 && <span className="badge ms-2" style={{ fontSize:9, background:'#fde68a', color:'#92400e' }}>Current</span>}
                      </td>
                      <td className="px-3 py-2">{m.deliveries}</td>
                      <td className="px-3 py-2 fw-medium text-success">{fmt(m.totalPaid)}</td>
                      <td className="px-3 py-2 text-muted">{fmt(Math.round(m.totalPaid/m.deliveries))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Payout Log */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <div className="fw-medium" style={{ fontSize:14 }}>Recent Payout Log</div>
            </div>
            <div className="card-body p-0">
              {payouts.slice(0,8).map((p,i) => (
                <div key={p.ref} className={`d-flex align-items-center gap-3 px-3 py-2 ${i<7?'border-bottom':''}`}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                    style={{ width:34, height:34, fontSize:12,
                      background: DRIVER_COLORS[DRIVERS.findIndex(d=>d.id===p.driverId) % DRIVER_COLORS.length] || '#6b7280' }}>
                    {ini(p.driver)}
                  </div>
                  <div className="flex-fill">
                    <div style={{ fontSize:12, fontWeight:500 }}>{p.driver}</div>
                    <div className="text-muted" style={{ fontSize:10 }}>{p.ref} · {p.date} · {p.deliveries} trips</div>
                  </div>
                  <div className="text-end">
                    <div className="fw-bold text-success" style={{ fontSize:13 }}>{fmt(p.amount)}</div>
                    <div style={{ fontSize:9, color:'#16a34a' }}>✓ Paid</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pay Out Modal */}
      {payModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={()=>{ setPayModal(null); setPayConfirm(false); setPayNote('') }}>
          <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ color:'#fff', fontWeight:600, fontSize:15 }}>Pay Driver Commission</span>
              <button className="btn-close btn-close-white btn-sm" onClick={()=>{ setPayModal(null); setPayConfirm(false); setPayNote('') }}/>
            </div>
            <div className="p-4">
              {/* Driver info */}
              <div className="d-flex align-items-center gap-3 p-3 rounded mb-4" style={{ background:'#f8fafc' }}>
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                  style={{ width:48, height:48, background:DRIVER_COLORS[DRIVERS.findIndex(d=>d.id===payModal.id)%DRIVER_COLORS.length], fontSize:16 }}>
                  {ini(payModal.name)}
                </div>
                <div>
                  <div className="fw-semibold">{payModal.name}</div>
                  <div className="text-muted" style={{ fontSize:12 }}>{payModal.zone} · {payModal.phone}</div>
                </div>
              </div>

              {/* Summary */}
              {[
                { label:'Deliveries This Week', val:payModal.deliveries },
                { label:'Commission Rate',       val:'₦2,300 per delivery' },
                { label:'Amount to Pay',         val:fmt(payModal.unpaid), big:true },
              ].map(r => (
                <div key={r.label} className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted" style={{ fontSize:13 }}>{r.label}</span>
                  <span style={{ fontSize: r.big?16:13, fontWeight: r.big?700:500, color: r.big?'#22c55e':undefined }}>{r.val}</span>
                </div>
              ))}

              <div className="mt-3 mb-4">
                <label className="form-label" style={{ fontSize:12 }}>Notes (optional)</label>
                <textarea className="form-control form-control-sm" rows={2} placeholder="e.g. Week 26 payout"
                  value={payNote} onChange={e=>setPayNote(e.target.value)}/>
              </div>

              {!payConfirm ? (
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={()=>{ setPayModal(null); setPayNote('') }}>Cancel</button>
                  <button className="btn btn-success flex-fill" onClick={()=>setPayConfirm(true)}>
                    <i className="ri-send-plane-line me-1"/>Pay {fmt(payModal.unpaid)}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="alert mb-3" style={{ background:'#fefce8', border:'1px solid #fde68a', borderRadius:8 }}>
                    <div className="fw-medium mb-1" style={{ fontSize:13, color:'#92400e' }}>⚠ Confirm Payment</div>
                    <div style={{ fontSize:12, color:'#78350f' }}>
                      You are about to pay <strong>{fmt(payModal.unpaid)}</strong> to <strong>{payModal.name}</strong> via bank transfer. This action cannot be undone.
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary flex-fill" onClick={()=>setPayConfirm(false)}>Back</button>
                    <button className="btn btn-success flex-fill" onClick={()=>processPayout(payModal)}>
                      <i className="ri-check-line me-1"/>Confirm & Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View History Modal */}
      {viewModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={()=>setViewModal(null)}>
          <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:520, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <span style={{ color:'#fff', fontWeight:600, fontSize:15 }}>Commission History — {viewModal.name}</span>
              <button className="btn-close btn-close-white btn-sm" onClick={()=>setViewModal(null)}/>
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              <div className="p-4">
                {/* Stats */}
                <div className="row g-2 mb-4">
                  {[
                    { label:'Total Earned', val:fmt(viewModal.totalEarned), color:'#3b82f6' },
                    { label:'Total Payouts', val:viewModal.payouts,         color:'#22c55e' },
                    { label:'Rating',        val:`★ ${viewModal.rating}`,   color:'#f59e0b' },
                    { label:'Unpaid',        val:fmt(viewModal.unpaid),     color:'#d97706' },
                  ].map(s => (
                    <div key={s.label} className="col-6">
                      <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px' }}>
                        <div className="text-muted" style={{ fontSize:11 }}>{s.label}</div>
                        <div className="fw-bold" style={{ fontSize:16, color:s.color }}>{s.val}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payout history */}
                <div className="fw-medium mb-2" style={{ fontSize:13 }}>Payout Records</div>
                {payouts.filter(p=>p.driverId===viewModal.id).length === 0 && (
                  <div className="text-center text-muted py-4" style={{ fontSize:13 }}>No payouts recorded yet.</div>
                )}
                {payouts.filter(p=>p.driverId===viewModal.id).map((p,i,arr) => (
                  <div key={p.ref} className={`d-flex align-items-center justify-content-between py-2 ${i<arr.length-1?'border-bottom':''}`}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{p.ref}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>{p.date} · {p.deliveries} trips · {p.method}</div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold text-success">{fmt(p.amount)}</div>
                      <div style={{ fontSize:10, color:'#16a34a' }}>✓ Paid</div>
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
      )}
    </div>
  )
}
