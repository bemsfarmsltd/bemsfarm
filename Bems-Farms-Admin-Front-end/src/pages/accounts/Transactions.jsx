import { useState, useMemo } from 'react'

const fmt = n => `₦${Number(n).toLocaleString()}`

const ALL_TXN = [
  // Income / Orders
  { id:'TXN-001', ref:'ORD-2026-0141', date:'2026-06-27', time:'14:32', type:'income',     category:'Online Order',       desc:'Paystack settlement — online orders batch',           account:'GTBank Operations',  amount:+312_000, status:'completed' },
  { id:'TXN-002', ref:'ORD-2026-0140', date:'2026-06-27', time:'11:14', type:'income',     category:'Online Order',       desc:'Paystack settlement — Adaeze Nwosu (x3 items)',       account:'GTBank Operations',  amount:+48_500,  status:'completed' },
  { id:'TXN-003', ref:'WLT-0234',      date:'2026-06-27', time:'09:21', type:'income',     category:'Wallet Top-up',      desc:'Wallet top-up — Seun Adesanya',                       account:'GTBank Operations',  amount:+20_000,  status:'completed' },
  { id:'TXN-004', ref:'EXP-0041',      date:'2026-06-27', time:'10:15', type:'expense',    category:'Staff Salary',       desc:'Monthly salary disbursement — June 2026 (all staff)', account:'Access Payroll',     amount:-920_000, status:'completed' },
  { id:'TXN-005', ref:'COM-0089',      date:'2026-06-27', time:'09:40', type:'commission', category:'Driver Commission',  desc:'Driver commission — Emeka Okafor (8 deliveries)',     account:'GTBank Operations',  amount:-18_400,  status:'completed' },
  { id:'TXN-006', ref:'TXF-0031',      date:'2026-06-26', time:'16:00', type:'transfer',   category:'Internal Transfer',  desc:'Transfer: GTBank Ops → Access Payroll (salary prep)', account:'GTBank Operations',  amount:-1_200_000,status:'completed' },
  { id:'TXN-007', ref:'CORP-0018',     date:'2026-06-26', time:'13:42', type:'income',     category:'Corporate Supply',   desc:'Corporate supply — Mama Cass Restaurants (weekly)',   account:'GTBank Operations',  amount:+240_000, status:'completed' },
  { id:'TXN-008', ref:'POS-0094',      date:'2026-06-26', time:'11:05', type:'income',     category:'POS Sale',           desc:'POS walk-in — multiple customers',                    account:'Zenith POS',         amount:+38_200,  status:'completed' },
  { id:'TXN-009', ref:'EXP-0040',      date:'2026-06-25', time:'08:30', type:'expense',    category:'Fuel & Transport',   desc:'Weekly fuel allowance — 3 delivery drivers',          account:'GTBank Operations',  amount:-48_000,  status:'completed' },
  { id:'TXN-010', ref:'RFC-0048',      date:'2026-06-25', time:'14:20', type:'refund',     category:'Refund',             desc:'Order refund — Chukwuemeka Eze (cancelled delivery)', account:'GTBank Operations',  amount:-14_200,  status:'completed' },
  { id:'TXN-011', ref:'COM-0088',      date:'2026-06-24', time:'17:00', type:'commission', category:'Driver Commission',  desc:'Driver commission — Bola Akinwale (5 deliveries)',    account:'GTBank Operations',  amount:-11_500,  status:'completed' },
  { id:'TXN-012', ref:'ORD-2026-0138', date:'2026-06-23', time:'15:11', type:'income',     category:'Online Order',       desc:'Paystack settlement — online orders batch',           account:'GTBank Operations',  amount:+276_500, status:'completed' },
  { id:'TXN-013', ref:'EXP-0039',      date:'2026-06-23', time:'09:00', type:'expense',    category:'Produce Purchase',   desc:'Produce purchase — Bodija Market (tomato, pepper, leafy veg)', account:'GTBank Operations', amount:-120_000, status:'completed' },
  { id:'TXN-014', ref:'EXP-0038',      date:'2026-06-22', time:'10:45', type:'expense',    category:'Utilities',          desc:'IKEDC electricity bill — June 2026',                  account:'GTBank Operations',  amount:-28_500,  status:'completed' },
  { id:'TXN-015', ref:'TXF-0030',      date:'2026-06-22', time:'11:30', type:'transfer',   category:'Internal Transfer',  desc:'Transfer: First Bank Tax → GTBank Ops (reserves)',    account:'First Bank Tax',     amount:-400_000, status:'completed' },
  { id:'TXN-016', ref:'CORP-0017',     date:'2026-06-21', time:'13:00', type:'income',     category:'Corporate Supply',   desc:'Corporate supply — Lagos Island Hotels Group',        account:'GTBank Operations',  amount:+180_000, status:'completed' },
  { id:'TXN-017', ref:'EXP-0037',      date:'2026-06-20', time:'16:00', type:'expense',    category:'Marketing',          desc:'Meta Ads spend — June campaign (fresh produce)',      account:'GTBank Operations',  amount:-50_000,  status:'completed' },
  { id:'TXN-018', ref:'WLT-0233',      date:'2026-06-20', time:'10:22', type:'income',     category:'Wallet Top-up',      desc:'Wallet top-up — Funke Oladele',                       account:'GTBank Operations',  amount:+15_000,  status:'completed' },
  { id:'TXN-019', ref:'COM-0087',      date:'2026-06-20', time:'17:30', type:'commission', category:'Driver Commission',  desc:'Driver commission — Damilola Fashola (6 deliveries)', account:'GTBank Operations',  amount:-13_800,  status:'completed' },
  { id:'TXN-020', ref:'EXP-0036',      date:'2026-06-19', time:'09:15', type:'expense',    category:'Packaging Materials',desc:'Packaging restock — cartons, biodegradable bags',     account:'GTBank Operations',  amount:-32_000,  status:'completed' },
  { id:'TXN-021', ref:'ORD-2026-0132', date:'2026-06-19', time:'14:55', type:'income',     category:'Online Order',       desc:'Paystack settlement — online orders batch',           account:'GTBank Operations',  amount:+198_000, status:'completed' },
  { id:'TXN-022', ref:'EXP-0035',      date:'2026-06-18', time:'11:00', type:'expense',    category:'Cold Storage',       desc:'Cold storage maintenance — compressor servicing',     account:'GTBank Operations',  amount:-85_000,  status:'pending'   },
  { id:'TXN-023', ref:'POS-0093',      date:'2026-06-17', time:'12:30', type:'income',     category:'POS Sale',           desc:'POS walk-in sales — weekend batch',                   account:'Zenith POS',         amount:+62_400,  status:'completed' },
  { id:'TXN-024', ref:'EXP-0034',      date:'2026-06-16', time:'09:30', type:'expense',    category:'Office Rent',        desc:'Office & warehouse rent — June 2026',                 account:'Access Payroll',     amount:-180_000, status:'completed' },
  { id:'TXN-025', ref:'RFC-0047',      date:'2026-06-15', time:'13:00', type:'refund',     category:'Refund',             desc:'Refund — Tolulope Badmus (quality complaint)',        account:'GTBank Operations',  amount:-8_500,   status:'completed' },
]

const TYPE_CFG = {
  income:     { label:'Income',     cls:'success', icon:'ri-arrow-up-circle-line'     },
  expense:    { label:'Expense',    cls:'danger',  icon:'ri-arrow-down-circle-line'   },
  commission: { label:'Commission', cls:'purple',  icon:'ri-user-star-line'           },
  transfer:   { label:'Transfer',   cls:'primary', icon:'ri-exchange-funds-line'      },
  refund:     { label:'Refund',     cls:'warning', icon:'ri-refund-2-line'            },
}

const STATUS_CFG = {
  completed: { label:'Completed', bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0' },
  pending:   { label:'Pending',   bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  failed:    { label:'Failed',    bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
}

const PURPLE = { bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe' }

const TYPES = ['income','expense','commission','transfer','refund']

export default function Transactions() {
  const [search, setSearch]     = useState('')
  const [filterType, setType]   = useState('all')
  const [filterSt, setFilterSt] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    return ALL_TXN.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterSt   !== 'all' && t.status !== filterSt)  return false
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo   && t.date > dateTo)   return false
      if (search) {
        const q = search.toLowerCase()
        if (!t.desc.toLowerCase().includes(q) && !t.ref.toLowerCase().includes(q) && !t.account.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [search, filterType, filterSt, dateFrom, dateTo])

  const totalIn  = filtered.filter(t => t.amount > 0).reduce((s,t)=>s+t.amount,0)
  const totalOut = filtered.filter(t => t.amount < 0).reduce((s,t)=>s+Math.abs(t.amount),0)
  const netFlow  = totalIn - totalOut

  // KPIs (all data)
  const allIn    = ALL_TXN.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0)
  const allOut   = ALL_TXN.filter(t=>t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0)
  const pending  = ALL_TXN.filter(t=>t.status==='pending').length

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">All Transactions</h6>
          <p className="text-muted mb-0" style={{ fontSize:12 }}>Unified financial ledger — every movement across all accounts</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item text-muted">Accounts</li>
          <li className="breadcrumb-item active">Transactions</li>
        </ul>
      </div>

      {/* KPI strip */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Inflow',   val:fmt(allIn),              color:'#22c55e', bg:'#f0fdf4', icon:'ri-arrow-up-circle-line' },
          { label:'Total Outflow',  val:fmt(allOut),             color:'#ef4444', bg:'#fef2f2', icon:'ri-arrow-down-circle-line' },
          { label:'Net Flow',       val:fmt(allIn-allOut),       color:'#3b82f6', bg:'#eff6ff', icon:'ri-line-chart-line' },
          { label:'Total Records',  val:ALL_TXN.length,          color:'#8b5cf6', bg:'#f5f3ff', icon:'ri-list-check-3' },
          { label:'Pending',        val:pending,                 color:'#d97706', bg:'#fffbeb', icon:'ri-time-line' },
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
                  <div className="fw-bold" style={{ fontSize:17 }}>{k.val}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <i className="ri-search-line text-muted"/>
                </span>
                <input type="text" className="form-control border-start-0 bg-light" placeholder="Search description, ref, account…"
                  value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={filterType} onChange={e=>setType(e.target.value)}>
                <option value="all">All Types</option>
                {TYPES.map(t=><option key={t} value={t}>{TYPE_CFG[t].label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={filterSt} onChange={e=>setFilterSt(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} title="From date"/>
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control form-control-sm" value={dateTo} onChange={e=>setDateTo(e.target.value)} title="To date"/>
            </div>
            <div className="col-md-1">
              <button className="btn btn-sm btn-outline-secondary w-100"
                onClick={()=>{ setSearch(''); setType('all'); setFilterSt('all'); setDateFrom(''); setDateTo('') }}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="d-flex gap-2 flex-wrap mb-3">
        {['all',...TYPES].map(t => {
          const cfg = t === 'all' ? null : TYPE_CFG[t]
          const count = t === 'all' ? ALL_TXN.length : ALL_TXN.filter(x=>x.type===t).length
          const active = filterType === t
          return (
            <button key={t} onClick={()=>setType(t)}
              className="btn btn-sm"
              style={{ fontSize:11,
                background: active ? (t==='all'?'#1e293b':t==='income'?'#22c55e':t==='expense'?'#ef4444':t==='commission'?'#8b5cf6':t==='transfer'?'#3b82f6':'#f59e0b') : '#f8fafc',
                color: active ? '#fff' : '#64748b',
                border: '1px solid ' + (active ? 'transparent' : '#e2e8f0'),
              }}>
              {cfg && <i className={`${cfg.icon} me-1`}/>}
              {t === 'all' ? 'All' : cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-2">
          <span style={{ fontSize:13 }}>{filtered.length} transaction{filtered.length!==1?'s':''}</span>
          <div className="d-flex gap-3" style={{ fontSize:12 }}>
            <span className="text-success fw-medium">In: {fmt(totalIn)}</span>
            <span className="text-danger fw-medium">Out: {fmt(totalOut)}</span>
            <span className={`fw-bold ${netFlow>=0?'text-success':'text-danger'}`}>Net: {netFlow>=0?'+':'-'}{fmt(Math.abs(netFlow))}</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize:13 }}>
            <thead style={{ background:'#f8fafc' }}>
              <tr>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>DATE / REF</th>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>TYPE</th>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>DESCRIPTION</th>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>ACCOUNT</th>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}>STATUS</th>
                <th className="px-3 py-2 fw-medium text-muted text-end" style={{ fontSize:11 }}>AMOUNT</th>
                <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize:11 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-5 text-muted">No transactions match your filters.</td></tr>
              )}
              {filtered.map(t => {
                const tc  = TYPE_CFG[t.type]
                const sc  = STATUS_CFG[t.status] || STATUS_CFG.completed
                const badgeStyle = t.type==='commission' ? PURPLE : null
                return (
                  <tr key={t.id}>
                    <td className="px-3 py-2">
                      <div style={{ fontWeight:500 }}>{t.date}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>{t.time} · {t.ref}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="badge d-flex align-items-center gap-1" style={{
                        fontSize:10, fontWeight:500, width:'fit-content', padding:'3px 8px',
                        background: badgeStyle ? badgeStyle.bg : t.type==='income'?'#f0fdf4':t.type==='expense'?'#fef2f2':t.type==='transfer'?'#eff6ff':'#fffbeb',
                        color: badgeStyle ? badgeStyle.color : t.type==='income'?'#16a34a':t.type==='expense'?'#dc2626':t.type==='transfer'?'#2563eb':'#d97706',
                        border:`1px solid ${badgeStyle ? badgeStyle.border : t.type==='income'?'#bbf7d0':t.type==='expense'?'#fecaca':t.type==='transfer'?'#bfdbfe':'#fde68a'}`,
                      }}>
                        <i className={tc.icon} style={{ fontSize:10 }}/>{tc.label}
                      </span>
                      <div className="text-muted" style={{ fontSize:10, marginTop:2 }}>{t.category}</div>
                    </td>
                    <td className="px-3 py-2" style={{ maxWidth:280 }}>
                      <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:280 }}>{t.desc}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-muted" style={{ fontSize:12 }}>{t.account}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="badge" style={{ fontSize:10, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-end">
                      <span className="fw-bold" style={{ color: t.amount>0?'#22c55e':'#ef4444', fontSize:14 }}>
                        {t.amount>0?'+':'-'}{fmt(Math.abs(t.amount))}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button className="btn btn-sm btn-outline-secondary" style={{ fontSize:11, padding:'2px 8px' }}
                        onClick={()=>setSelected(t)}>
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot style={{ background:'#f8fafc', borderTop:'2px solid #e2e8f0' }}>
                <tr>
                  <td colSpan={5} className="px-3 py-2 fw-medium" style={{ fontSize:12 }}>
                    Showing {filtered.length} of {ALL_TXN.length} transactions
                  </td>
                  <td className="px-3 py-2 text-end fw-bold" style={{ fontSize:13, color: netFlow>=0?'#22c55e':'#ef4444' }}>
                    {netFlow>=0?'+':'-'}{fmt(Math.abs(netFlow))}
                  </td>
                  <td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* View Detail Modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={()=>setSelected(null)}>
          <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ color:'#fff', fontWeight:600, fontSize:15 }}>Transaction Detail</div>
              <button className="btn-close btn-close-white btn-sm" onClick={()=>setSelected(null)}/>
            </div>

            <div className="p-4">
              {/* Amount hero */}
              <div className="text-center mb-4">
                <div style={{
                  width:64, height:64, borderRadius:'50%', margin:'0 auto 12px',
                  background: selected.amount>0?'#f0fdf4':'#fef2f2',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <i className={TYPE_CFG[selected.type].icon} style={{ fontSize:28, color: selected.amount>0?'#22c55e':'#ef4444' }}/>
                </div>
                <div style={{ fontSize:28, fontWeight:700, color: selected.amount>0?'#22c55e':'#ef4444' }}>
                  {selected.amount>0?'+':'-'}{fmt(Math.abs(selected.amount))}
                </div>
                <div className="text-muted" style={{ fontSize:13, marginTop:4 }}>{selected.desc}</div>
              </div>

              {/* Detail rows */}
              {[
                { label:'Reference',   val:selected.ref       },
                { label:'Transaction', val:selected.id        },
                { label:'Date & Time', val:`${selected.date} at ${selected.time}` },
                { label:'Type',        val:TYPE_CFG[selected.type].label },
                { label:'Category',    val:selected.category  },
                { label:'Account',     val:selected.account   },
                { label:'Status',      val:selected.status    },
              ].map(row => (
                <div key={row.label} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <span className="text-muted" style={{ fontSize:13 }}>{row.label}</span>
                  <span style={{ fontSize:13, fontWeight:500 }}>
                    {row.label === 'Status'
                      ? <span className="badge" style={{ fontSize:11, background:STATUS_CFG[selected.status]?.bg||'#f0fdf4', color:STATUS_CFG[selected.status]?.color||'#16a34a', border:`1px solid ${STATUS_CFG[selected.status]?.border||'#bbf7d0'}` }}>{STATUS_CFG[selected.status]?.label}</span>
                      : row.val}
                  </span>
                </div>
              ))}

              <button className="btn btn-secondary w-100 mt-4" onClick={()=>setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
