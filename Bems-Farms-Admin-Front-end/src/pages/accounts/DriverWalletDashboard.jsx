import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useRealtimeEvent } from '../../context/RealtimeContext'

const fmt = (n) =>
  `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DriverWalletDashboard() {
  const [period, setPeriod] = useState('this_month')
  const [tab, setTab] = useState('by_driver') // 'by_driver' | 'by_zone' | 'payouts' | 'ledger'
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState(null)
  const [data, setData] = useState({
    period: 'this_month',
    date_from: '',
    date_to: '',
    reference: 'BEMS-DRV-THIS_MONTH-ALL-DRIVERS',
    kpis: {
      gross_earned: 0,
      net_settled: 0,
      pending_exposure: 0,
      total_charges: 0,
      settlement_pct: 0,
      paid_tx_count: 0,
      total_tx_count: 0,
      total_drivers: 0,
      active_wallet_balance: 0,
    },
    drivers: [],
    zones: [],
    payouts: [],
    ledger: [],
  })

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await api.get(`/admin/wallets/driver-statement?period=${encodeURIComponent(period)}`)
        if (res.data?.success) {
          setData(res.data)
        }
      } catch (err) {
        if (!silent) toast.error(err.response?.data?.message || 'Failed to load driver wallet statement')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [period]
  )

  useEffect(() => {
    load(false)
    const interval = setInterval(() => load(true), 20000)
    return () => clearInterval(interval)
  }, [load])

  useRealtimeEvent('driver:wallet_updated', () => load(true))
  useRealtimeEvent('driver:payout_requested', () => load(true))
  useRealtimeEvent('delivery:updated', () => load(true))
  useRealtimeEvent('order:updated', () => load(true))

  const q = search.trim().toLowerCase()

  const filteredDrivers = useMemo(() => {
    if (!q) return data.drivers
    return data.drivers.filter((d) =>
      [d.name, d.driver_code, d.phone, d.zone_name, d.vehicle_plate]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.drivers, q])

  const filteredZones = useMemo(() => {
    if (!q) return data.zones
    return data.zones.filter((z) => String(z.zone_name || '').toLowerCase().includes(q))
  }, [data.zones, q])

  const filteredPayouts = useMemo(() => {
    if (!q) return data.payouts
    return data.payouts.filter((p) =>
      [p.driver_name, p.payout_ref, p.bank_name, p.account_number, p.status, p.zone_name]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.payouts, q])

  const filteredLedger = useMemo(() => {
    if (!q) return data.ledger
    return data.ledger.filter((l) =>
      [l.driver_name, l.reference, l.category, l.description, l.type]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.ledger, q])

  function handleExportCsv() {
    const headers = [
      'Driver Name',
      'Driver ID',
      'Zone',
      'Deliveries',
      'Paid/Total Txs',
      'Gross Earned',
      'Charges',
      'Net Disbursable',
      'Settled to Bank',
      'Pending (Unpaid)',
      'Total Requested',
      'Settlement %',
    ]
    const rows = filteredDrivers.map((d) => [
      d.name,
      d.driver_code,
      d.zone_name,
      d.deliveries_count,
      `${d.paid_txs}/${d.total_txs}`,
      d.gross_earned.toFixed(2),
      d.charges.toFixed(2),
      d.net_disbursable.toFixed(2),
      d.settled_to_bank.toFixed(2),
      d.pending_unpaid.toFixed(2),
      d.total_requested.toFixed(2),
      `${d.settlement_pct}%`,
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.reference || 'driver-wallet-statement'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handlePayoutAction(payout, action) {
    setActingId(payout.id)
    try {
      if (action === 'approve') {
        await api.post(`/admin/wallets/payouts/${payout.id}/approve`)
        toast.success(`Approved payout ${payout.payout_ref || payout.id}`)
      } else if (action === 'pay') {
        await api.post(`/admin/wallets/payouts/${payout.id}/pay`)
        toast.success(`Disbursed payout ${payout.payout_ref || payout.id}`)
      } else if (action === 'reject') {
        const reason = window.prompt('Reason for rejecting payout:')
        if (!reason) {
          setActingId(null)
          return
        }
        await api.post(`/admin/wallets/payouts/${payout.id}/reject`, { reason })
        toast.success(`Rejected payout ${payout.payout_ref || payout.id}`)
      }
      await load(true)
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} payout`)
    } finally {
      setActingId(null)
    }
  }

  const { kpis } = data
  const activeCount =
    tab === 'by_driver'
      ? filteredDrivers.length
      : tab === 'by_zone'
      ? filteredZones.length
      : tab === 'payouts'
      ? filteredPayouts.length
      : filteredLedger.length

  return (
    <div className="container-fluid py-3" style={{ background: '#f8fafc', minHeight: '100%' }}>
      {/* Executive Header */}
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <div
            className="fw-bold text-uppercase d-flex align-items-center gap-2"
            style={{ fontSize: 11, letterSpacing: 1.1, color: '#15803d' }}
          >
            <span>DRIVER LOGISTICS · WALLET &amp; SETTLEMENT STUDIO</span>
            <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
              <span className="rounded-circle bg-success d-inline-block" style={{ width: 6, height: 6 }} />
              Live
            </span>
          </div>
          <h3 className="fw-bold mb-1 text-dark mt-1">Driver Wallet &amp; Settlement Statement</h3>
          <div className="text-muted small">
            Live per-driver commission, wallet balance, bank settlement, deductions, and pending exposure ledger.
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <select
            className="form-select form-select-sm bg-white fw-medium"
            style={{ width: 145 }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="this_month">This Month</option>
            <option value="this_week">This Week</option>
            <option value="today">Today</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            type="button"
            className="btn btn-sm btn-white bg-white border fw-medium"
            onClick={() => load(false)}
            disabled={loading}
          >
            <i className="ri-refresh-line me-1" /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-sm bg-white border fw-medium"
            onClick={handleExportCsv}
          >
            <i className="ri-download-2-line me-1" /> Export CSV
          </button>
          <button
            type="button"
            className="btn btn-sm text-white fw-semibold"
            style={{ background: '#1B4332', borderColor: '#1B4332' }}
            onClick={() => window.print()}
          >
            <i className="ri-printer-line me-1" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Studio Tab Pills */}
      <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
        {[
          { id: 'by_driver', label: 'By Driver' },
          { id: 'by_zone', label: 'By Zone' },
          { id: 'payouts', label: `Payout Requests (${data.payouts.length})` },
          { id: 'ledger', label: `Wallet Ledger (${data.ledger.length})` },
        ].map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="btn btn-sm fw-semibold px-3 py-1.5"
              style={{
                borderRadius: 10,
                background: active ? '#1B4332' : '#ffffff',
                color: active ? '#ffffff' : '#334155',
                border: active ? '1px solid #1B4332' : '1px solid #e2e8f0',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="card border-0 shadow-sm h-100 text-white"
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1B4332 0%, #14532d 100%)',
            }}
          >
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center opacity-90 small fw-bold text-uppercase">
                <span>DRIVER EARNINGS (GROSS)</span>
                <i className="ri-wallet-3-line fs-5" />
              </div>
              <div className="fs-3 fw-bold mt-2">{fmt(kpis.gross_earned)}</div>
              <div className="small opacity-90 mt-1">
                {kpis.paid_tx_count} / {kpis.total_tx_count} payouts settled
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100 bg-white" style={{ borderRadius: 16 }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center text-muted small fw-bold text-uppercase">
                <span>NET SETTLED TO DRIVERS</span>
                <i className="ri-checkbox-circle-line text-success fs-5" />
              </div>
              <div className="fs-3 fw-bold mt-2" style={{ color: '#16a34a' }}>
                {fmt(kpis.net_settled)}
              </div>
              <div className="small text-muted mt-1">{kpis.settlement_pct}% settlement completion</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100 bg-white" style={{ borderRadius: 16 }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center text-muted small fw-bold text-uppercase">
                <span>PENDING (UNPAID EXPOSURE)</span>
                <i className="ri-time-line text-warning fs-5" />
              </div>
              <div className="fs-3 fw-bold mt-2" style={{ color: '#d97706' }}>
                {fmt(kpis.pending_exposure)}
              </div>
              <div className="small text-muted mt-1">Charges: {fmt(kpis.total_charges)}</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100 bg-white" style={{ borderRadius: 16 }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center text-muted small fw-bold text-uppercase">
                <span>WALLET SETTLEMENT RATE</span>
                <i className="ri-shield-check-line text-secondary fs-5" />
              </div>
              <div className="fs-3 fw-bold mt-2 text-dark">{kpis.settlement_pct}%</div>
              <div className="small text-muted mt-1">
                {kpis.total_drivers} drivers · Live balance {fmt(kpis.active_wallet_balance)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Statement Card */}
      <div className="card border-0 shadow-sm bg-white" style={{ borderRadius: 16 }}>
        <div className="card-body p-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <h5 className="fw-bold mb-0 text-dark">
                {tab === 'by_driver'
                  ? 'Driver Wallet, Earnings & Settlement Statement'
                  : tab === 'by_zone'
                  ? 'Zone-Level Driver Settlement Statement'
                  : tab === 'payouts'
                  ? 'Driver Payout Requests & Bank Disbursements'
                  : 'Real-Time Driver Wallet Ledger'}
              </h5>
              <div className="text-muted small mt-0.5">
                Reference: <span className="font-monospace">{data.reference}</span> · Period:{' '}
                <span>{data.date_from}</span> to <span>{data.date_to}</span>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <input
                type="search"
                className="form-control form-control-sm"
                style={{ width: 220, borderRadius: 10 }}
                placeholder="Filter driver, ID, or zone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="badge bg-light text-dark border px-2.5 py-2" style={{ borderRadius: 10 }}>
                {activeCount} Records
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5 text-muted small">
              <div className="spinner-border spinner-border-sm text-success me-2" />
              Loading live driver wallet statement…
            </div>
          ) : tab === 'by_driver' ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="small text-muted text-uppercase" style={{ fontSize: 11 }}>
                  <tr>
                    <th>Driver</th>
                    <th>Driver ID</th>
                    <th>Zone</th>
                    <th className="text-end">Paid / Total Txs</th>
                    <th className="text-end">Gross Earned</th>
                    <th className="text-end">Charges</th>
                    <th className="text-end">Wallet Bal.</th>
                    <th className="text-end">Settled to Bank</th>
                    <th className="text-end">Pending (Unpaid)</th>
                    <th className="text-end">Total Requested</th>
                    <th className="text-end">Settl. %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-5 text-muted small">
                        No driver wallet records match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <div className="fw-semibold text-dark small">{d.name}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            {d.phone || '—'} · {d.deliveries_count} drops
                          </div>
                        </td>
                        <td className="font-monospace small text-muted">{d.driver_code}</td>
                        <td className="small">{d.zone_name}</td>
                        <td className="text-end small font-monospace">
                          {d.paid_txs} / {d.total_txs}
                        </td>
                        <td className="text-end fw-semibold small">{fmt(d.gross_earned)}</td>
                        <td className="text-end small text-muted">{fmt(d.charges)}</td>
                        <td className="text-end fw-bold small text-dark">{fmt(d.wallet_balance)}</td>
                        <td className="text-end fw-bold small" style={{ color: '#16a34a' }}>
                          {fmt(d.settled_to_bank)}
                        </td>
                        <td className="text-end fw-semibold small" style={{ color: '#d97706' }}>
                          {fmt(d.pending_unpaid)}
                        </td>
                        <td className="text-end fw-semibold small">{fmt(d.total_requested)}</td>
                        <td className="text-end">
                          <span className="badge bg-light text-dark border font-monospace">
                            {d.settlement_pct}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'by_zone' ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="small text-muted text-uppercase" style={{ fontSize: 11 }}>
                  <tr>
                    <th>Delivery Zone</th>
                    <th className="text-end">Drivers</th>
                    <th className="text-end">Drops</th>
                    <th className="text-end">Paid / Total Txs</th>
                    <th className="text-end">Gross Earned</th>
                    <th className="text-end">Charges</th>
                    <th className="text-end">Settled to Bank</th>
                    <th className="text-end">Pending (Unpaid)</th>
                    <th className="text-end">Settl. %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredZones.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-5 text-muted small">
                        No zone settlement records found.
                      </td>
                    </tr>
                  ) : (
                    filteredZones.map((z) => (
                      <tr key={z.zone_name}>
                        <td className="fw-semibold text-dark small">{z.zone_name}</td>
                        <td className="text-end small">{z.drivers_count}</td>
                        <td className="text-end small">{z.deliveries_count}</td>
                        <td className="text-end small font-monospace">
                          {z.paid_txs} / {z.total_txs}
                        </td>
                        <td className="text-end fw-semibold small">{fmt(z.gross_earned)}</td>
                        <td className="text-end small text-muted">{fmt(z.charges)}</td>
                        <td className="text-end fw-bold small" style={{ color: '#16a34a' }}>
                          {fmt(z.settled_to_bank)}
                        </td>
                        <td className="text-end fw-semibold small" style={{ color: '#d97706' }}>
                          {fmt(z.pending_unpaid)}
                        </td>
                        <td className="text-end">
                          <span className="badge bg-light text-dark border font-monospace">
                            {z.settlement_pct}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'payouts' ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="small text-muted text-uppercase" style={{ fontSize: 11 }}>
                  <tr>
                    <th>Payout Ref</th>
                    <th>Driver</th>
                    <th>Bank Account</th>
                    <th className="text-end">Amount</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayouts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted small">
                        No payout requests in this period.
                      </td>
                    </tr>
                  ) : (
                    filteredPayouts.map((p) => {
                      const st = String(p.status || 'pending').toLowerCase()
                      return (
                        <tr key={p.id}>
                          <td className="font-monospace small fw-semibold">{p.payout_ref || `PAY-${p.id}`}</td>
                          <td>
                            <div className="fw-semibold small text-dark">{p.driver_name}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>{p.zone_name}</div>
                          </td>
                          <td className="small">
                            <div>{p.bank_name || p.driver_bank_name || '—'}</div>
                            <div className="font-monospace text-muted" style={{ fontSize: 11 }}>
                              {p.account_number || p.driver_account_number || '—'}
                            </div>
                          </td>
                          <td className="text-end fw-bold small">{fmt(p.amount)}</td>
                          <td>
                            <span
                              className={`badge ${
                                st === 'paid' || st === 'approved'
                                  ? 'bg-success-subtle text-success'
                                  : st === 'rejected'
                                  ? 'bg-danger-subtle text-danger'
                                  : 'bg-warning-subtle text-warning-emphasis'
                              }`}
                            >
                              {st.toUpperCase()}
                            </span>
                          </td>
                          <td className="small text-muted">{fmtDate(p.created_at)}</td>
                          <td className="text-end">
                            {st === 'pending' && (
                              <div className="d-inline-flex gap-1">
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline-success py-0.5 px-2"
                                  style={{ fontSize: 11 }}
                                  disabled={actingId === p.id}
                                  onClick={() => handlePayoutAction(p, 'pay')}
                                >
                                  Disburse
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline-danger py-0.5 px-2"
                                  style={{ fontSize: 11 }}
                                  disabled={actingId === p.id}
                                  onClick={() => handlePayoutAction(p, 'reject')}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="small text-muted text-uppercase" style={{ fontSize: 11 }}>
                  <tr>
                    <th>Reference</th>
                    <th>Driver</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th className="text-end">Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted small">
                        No ledger entries in this period.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((l) => (
                      <tr key={l.id}>
                        <td className="font-monospace small">{l.reference || `LDG-${l.id}`}</td>
                        <td className="fw-semibold small">{l.driver_name}</td>
                        <td>
                          <span
                            className={`badge ${
                              l.type === 'credit' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                            }`}
                          >
                            {String(l.type || '').toUpperCase()}
                          </span>
                        </td>
                        <td className="small text-capitalize">{String(l.category || '').replace(/_/g, ' ')}</td>
                        <td className="small text-muted">{l.description || '—'}</td>
                        <td
                          className={`text-end fw-bold small ${
                            l.type === 'credit' ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {l.type === 'credit' ? '+' : '-'}
                          {fmt(l.amount)}
                        </td>
                        <td className="small text-muted">{fmtDate(l.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
