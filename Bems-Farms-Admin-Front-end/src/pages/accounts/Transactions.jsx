import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const fmt = n => `₦${Number(n || 0).toLocaleString()}`

const TYPE_CFG = {
  income:     { label:'Income',     cls:'success', icon:'ri-arrow-up-circle-line'     },
  expense:    { label:'Disbursement', cls:'danger', icon:'ri-arrow-down-circle-line' },
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

const TYPES = ['income','commission','transfer','refund']

// Maps the real `transactions` row (GET /api/admin/accounts/transactions) to this page's UI shape.
function mapTxn(t) {
  return {
    id: t.id,
    ref: t.reference,
    date: t.date,
    time: t.time || '',
    type: t.type,
    category: t.sub_type || TYPE_CFG[t.type]?.label || t.type,
    desc: t.description || '',
    account: t.bank_account ? `${t.bank_name} — ${t.bank_account}` : (t.bank_name || '—'),
    amount: Number(t.amount || 0),
    status: t.status || 'completed',
  }
}

export default function Transactions() {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [search, setSearch]     = useState('')
  const [filterType, setType]   = useState('all')
  const [filterSt, setFilterSt] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await api.get('/admin/accounts/transactions', {
        params: {
          limit: 200,
          type: filterType === 'all' ? undefined : filterType,
          from: dateFrom || undefined,
          to: dateTo || undefined,
        },
      })
      setRecords((res.data?.transactions || []).map(mapTxn))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [filterType, dateFrom, dateTo])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    return records.filter(t => {
      if (filterSt !== 'all' && t.status !== filterSt) return false
      if (search) {
        const q = search.toLowerCase()
        if (!t.desc.toLowerCase().includes(q) && !t.ref.toLowerCase().includes(q) && !t.account.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [records, search, filterSt])

  const totalIn  = filtered.filter(t => t.amount > 0).reduce((s,t)=>s+t.amount,0)
  const totalOut = filtered.filter(t => t.amount < 0).reduce((s,t)=>s+Math.abs(t.amount),0)
  const netFlow  = totalIn - totalOut

  // KPIs over the loaded page (server doesn't return ledger-wide aggregates for this endpoint)
  const allIn    = records.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0)
  const allOut   = records.filter(t=>t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0)
  const pending  = records.filter(t=>t.status==='pending').length

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">All Transactions</h6>
          <p className="text-muted mb-0" style={{ fontSize:12 }}>Unified financial ledger — every movement across all accounts</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/accounts/overview">Finance</Link></li>
          <li className="breadcrumb-item active">Transactions</li>
        </ul>
      </div>

      {error && (
        <div className="alert alert-warning d-flex align-items-center gap-3 rounded-3 mb-3">
          <i className="ri-wifi-off-line fs-4" />
          <div className="flex-grow-1">
            <strong>Could not load transactions.</strong>
            <span className="text-muted ms-2 fs-sm">Check your connection or server status.</span>
          </div>
          <button className="btn btn-sm btn-outline-warning" onClick={load}>Retry</button>
        </div>
      )}

      {/* KPI strip */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Inflow (loaded)',   val:fmt(allIn),              color:'#22c55e', bg:'#f0fdf4', icon:'ri-arrow-up-circle-line' },
          { label:'Total Outflow (loaded)',  val:fmt(allOut),             color:'#ef4444', bg:'#fef2f2', icon:'ri-arrow-down-circle-line' },
          { label:'Net Flow (loaded)',       val:fmt(allIn-allOut),       color:'#3b82f6', bg:'#eff6ff', icon:'ri-line-chart-line' },
          { label:'Records Loaded',  val:records.length,          color:'#8b5cf6', bg:'#f5f3ff', icon:'ri-list-check-3' },
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
          const count = t === 'all' ? records.length : records.filter(x=>x.type===t).length
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
              {loading ? (
                <tr><td colSpan={7} className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                  Loading transactions…
                </td></tr>
              ) : filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-5 text-muted">No transactions match your filters.</td></tr>
              )}
              {!loading && filtered.map(t => {
                const tc  = TYPE_CFG[t.type] || TYPE_CFG.income
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
            {!loading && filtered.length > 0 && (
              <tfoot style={{ background:'#f8fafc', borderTop:'2px solid #e2e8f0' }}>
                <tr>
                  <td colSpan={5} className="px-3 py-2 fw-medium" style={{ fontSize:12 }}>
                    Showing {filtered.length} of {records.length} loaded transactions
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
                  <i className={(TYPE_CFG[selected.type] || TYPE_CFG.income).icon} style={{ fontSize:28, color: selected.amount>0?'#22c55e':'#ef4444' }}/>
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
                { label:'Date & Time', val:`${selected.date}${selected.time ? ' at ' + selected.time : ''}` },
                { label:'Type',        val:(TYPE_CFG[selected.type] || TYPE_CFG.income).label },
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
