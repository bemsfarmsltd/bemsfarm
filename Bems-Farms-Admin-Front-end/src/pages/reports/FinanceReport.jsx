import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { toast } from 'react-hot-toast'

const formatNaira = (val) => {
  const num = parseFloat(val) || 0
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FinanceReport() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  // Filters
  const [dateRange, setDateRange] = useState('year') // 'today' | 'week' | 'month' | 'year' | 'custom'
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [groupBy, setGroupBy] = useState('month')

  const fetchFinanceReport = useCallback(async () => {
    try {
      setLoading(true)
      let from = fromDate
      let to = toDate

      const now = new Date()
      if (dateRange === 'today') {
        from = now.toISOString().slice(0, 10)
        to = now.toISOString().slice(0, 10)
      } else if (dateRange === 'week') {
        const first = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)
        from = new Date(now.setDate(first)).toISOString().slice(0, 10)
        to = new Date().toISOString().slice(0, 10)
      } else if (dateRange === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        to = new Date().toISOString().slice(0, 10)
      } else if (dateRange === 'year') {
        from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
        to = new Date().toISOString().slice(0, 10)
      }

      const res = await api.get('/admin/reports/finance', {
        params: { from, to, group_by: groupBy },
      })
      setData(res.data)
    } catch (err) {
      console.error('Failed to load finance report:', err)
      toast.error('Failed to load financial statement data')
    } finally {
      setLoading(false)
    }
  }, [dateRange, fromDate, toDate, groupBy])

  useEffect(() => {
    fetchFinanceReport()
  }, [fetchFinanceReport])

  const kpis = data?.kpis || {}
  const plTimeline = data?.pl_timeline || []
  const bankBalances = data?.bank_balances || []
  const incomeBySource = data?.income_by_source || []
  const expenseByCategory = data?.expense_by_category || []
  const topExpenses = data?.top_expenses || []

  const isProfitable = (parseFloat(kpis.net_profit) || 0) >= 0

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex justify-content-between align-items-md-center">
        <div>
          <h6 className="mb-0 fw-bold">Financial Statement & Audit Report</h6>
          <p className="text-muted fs-sm mb-0">Live profit & loss, verified bank balances, operating cashflow, and expense audits.</p>
        </div>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/reports/sales">Reports</Link></li>
          <li className="breadcrumb-item active">Finance</li>
        </ul>
      </div>

      {/* Filter Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center justify-content-between">
            <div className="col-md-7 d-flex flex-wrap align-items-center gap-2">
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${dateRange === 'today' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setDateRange('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`btn ${dateRange === 'week' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setDateRange('week')}
                >
                  This Week
                </button>
                <button
                  type="button"
                  className={`btn ${dateRange === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setDateRange('month')}
                >
                  This Month
                </button>
                <button
                  type="button"
                  className={`btn ${dateRange === 'year' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setDateRange('year')}
                >
                  This Year
                </button>
                <button
                  type="button"
                  className={`btn ${dateRange === 'custom' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setDateRange('custom')}
                >
                  Custom Range
                </button>
              </div>

              {dateRange === 'custom' && (
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                  <span className="text-muted">to</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="col-md-4 text-md-end d-flex align-items-center justify-content-md-end gap-2">
              <label className="form-label mb-0 fs-xs text-muted fw-bold">Period:</label>
              <select
                className="form-select form-select-sm w-auto"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={fetchFinanceReport}
                title="Refresh Financial Report"
              >
                <i className="ri-refresh-line"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Inflow (Income)',
            value: formatNaira(kpis.total_income),
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-arrow-right-down-line',
            subLeft: 'Sales & Receipts',
            subRight: 'Verified Collections'
          },
          {
            label: 'Operating Expenses',
            value: formatNaira(kpis.total_expenses),
            glow: 'bg-card-glow-red',
            iconBg: '#FFF1F2',
            iconColor: '#E11D48',
            icon: 'ri-arrow-right-up-line',
            subLeft: 'Overheads & Outflows',
            subRight: 'Disbursements'
          },
          {
            label: 'Net Operating Profit',
            value: formatNaira(kpis.net_profit),
            glow: isProfitable ? 'bg-card-glow-green' : 'bg-card-glow-red',
            iconBg: isProfitable ? '#ECFDF5' : '#FFF1F2',
            iconColor: isProfitable ? '#059669' : '#DC2626',
            icon: 'ri-funds-line',
            subLeft: 'Realized Margin',
            subRight: `${kpis.profit_margin || 0}% Return`
          },
          {
            label: 'Liquid Cash Reserves',
            value: formatNaira(kpis.total_cash),
            glow: 'bg-card-glow-blue',
            iconBg: '#EFF6FF',
            iconColor: '#2563EB',
            icon: 'ri-bank-card-line',
            subLeft: 'Active Bank Accounts',
            subRight: `${bankBalances.length} Vaults`
          },
        ].map(c => (
          <div key={c.label} className="col-12 col-sm-6 col-xl-3">
            <div className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow}`}>
              <div className="card-body p-3.5">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2" title={c.label}>
                    {c.label}
                  </span>
                  <span className="kpi-icon-pill" style={{ background: c.iconBg, color: c.iconColor }}>
                    <i className={`${c.icon} fs-18`}></i>
                  </span>
                </div>
                <div className="fs-22 fw-bolder text-dark mb-1 font-display text-truncate">
                  {c.value}
                </div>
                <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                  <span className="text-truncate me-2">{c.subLeft}</span>
                  <strong className="text-dark font-monospace flex-shrink-0">{c.subRight}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main P&L Timeline and Bank Reserves */}
      <div className="row g-3 mb-4">
        {/* P&L Statement Timeline */}
        <div className="col-xl-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="ri-file-chart-line me-2 text-primary"></i>P&L Performance Timeline
              </h5>
              <span className="badge bg-light text-dark border">{plTimeline.length} periods</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '380px' }}>
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th className="ps-3">Period</th>
                      <th className="text-end text-success">Income</th>
                      <th className="text-end text-danger">Expenses</th>
                      <th className="text-end pe-3">Net Profit / (Loss)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">
                          <span className="spinner-border spinner-border-sm me-2"></span>Loading P&L records...
                        </td>
                      </tr>
                    ) : plTimeline.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">
                          No P&L transactions recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      plTimeline.map((row, idx) => {
                        const prof = parseFloat(row.profit) || 0
                        return (
                          <tr key={idx}>
                            <td className="ps-3 fw-bold text-dark">{row.period}</td>
                            <td className="text-end font-monospace text-success">{formatNaira(row.income)}</td>
                            <td className="text-end font-monospace text-danger">{formatNaira(row.expenses)}</td>
                            <td className="text-end pe-3 font-monospace fw-bold">
                              <span className={`badge ${prof >= 0 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'}`}>
                                {formatNaira(prof)}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Accounts & Cash Vaults */}
        <div className="col-xl-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-bank-line me-2 text-primary"></i>Verified Bank Accounts
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '380px' }}>
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th className="ps-3">Institution</th>
                      <th className="text-center">Type</th>
                      <th className="text-end pe-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">Loading bank accounts...</td>
                      </tr>
                    ) : bankBalances.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">No active bank accounts linked.</td>
                      </tr>
                    ) : (
                      bankBalances.map((b) => (
                        <tr key={b.id}>
                          <td className="ps-3">
                            <div className="fw-bold text-dark">{b.bank_name || 'Bank'}</div>
                            <div className="text-muted fs-xs font-monospace">{b.account_number || b.account_name}</div>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-light text-dark border text-uppercase fs-xs">
                              {b.account_type || 'Operating'}
                            </span>
                          </td>
                          <td className="text-end pe-3 fw-bold text-primary font-monospace">
                            {formatNaira(b.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Income by Source & Expenses by Category */}
      <div className="row g-3 mb-4">
        {/* Income Sources */}
        <div className="col-xl-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-inbox-archive-line me-2 text-success"></i>Income Channels
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Source Channel</th>
                      <th className="text-center">Transactions</th>
                      <th className="text-end pe-3">Total Inflow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">Loading income channels...</td>
                      </tr>
                    ) : incomeBySource.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">No income records in this period.</td>
                      </tr>
                    ) : (
                      incomeBySource.map((s, idx) => (
                        <tr key={idx}>
                          <td className="ps-3 fw-bold text-dark text-capitalize">{s.source}</td>
                          <td className="text-center text-muted fs-sm">{s.count} txn</td>
                          <td className="text-end pe-3 fw-bold text-success font-monospace">
                            {formatNaira(s.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="col-xl-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-pie-chart-2-line me-2 text-danger"></i>Operating Expenses by Category
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Cost Category</th>
                      <th className="text-center">Count</th>
                      <th className="text-end pe-3">Total Outflow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">Loading expense categories...</td>
                      </tr>
                    ) : expenseByCategory.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">No recorded operating expenses in this period.</td>
                      </tr>
                    ) : (
                      expenseByCategory.map((c, idx) => (
                        <tr key={idx}>
                          <td className="ps-3 fw-bold text-dark text-capitalize">{c.category || 'General Operations'}</td>
                          <td className="text-center text-muted fs-sm">{c.count} items</td>
                          <td className="text-end pe-3 fw-bold text-danger font-monospace">
                            {formatNaira(c.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Audited Expenses Table */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">
            <i className="ri-money-dollar-circle-line me-2 text-warning"></i>Recent Audited Expenses & Payouts
          </h5>
          <span className="badge bg-light text-dark border">{topExpenses.length} records</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 text-nowrap">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Date</th>
                  <th>Reference</th>
                  <th>Payee / Supplier</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th className="text-end pe-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">Loading expense records...</td>
                  </tr>
                ) : topExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">No expense transactions recorded in this period.</td>
                  </tr>
                ) : (
                  topExpenses.map((e, idx) => (
                    <tr key={e.id || idx}>
                      <td className="ps-3 text-muted fs-sm">{e.date ? new Date(e.date).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="font-monospace fs-xs fw-semibold">{e.reference || `EXP-${e.id}`}</td>
                      <td>
                        <div className="fw-bold text-dark">{e.supplier_name || e.description || 'General Payee'}</div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border text-capitalize">{e.category || 'General'}</span>
                      </td>
                      <td>
                        <span className={`badge ${e.status === 'paid' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                          {e.status || 'approved'}
                        </span>
                      </td>
                      <td className="text-end pe-3 fw-bold text-danger font-monospace">
                        {formatNaira(e.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
