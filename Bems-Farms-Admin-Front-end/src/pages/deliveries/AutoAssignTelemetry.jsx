// Bems-Farms-Admin-Front-end/src/pages/deliveries/AutoAssignTelemetry.jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmtNaira = (n) => `₦${Number(n || 0).toLocaleString()}`

const RESPONSE_BADGES = {
  accepted: {
    label: 'Accepted',
    bg: '#dcfce7',
    color: '#15803d',
    border: '#bbf7d0',
    icon: 'ri-checkbox-circle-fill',
  },
  rejected: {
    label: 'Declined / Rejected',
    bg: '#fee2e2',
    color: '#b91c1c',
    border: '#fecaca',
    icon: 'ri-close-circle-fill',
  },
  timed_out: {
    label: '5-Min Auto-Timeout',
    bg: '#f1f5f9',
    color: '#475569',
    border: '#cbd5e1',
    icon: 'ri-timer-line',
  },
  pending: {
    label: 'Awaiting Driver Response',
    bg: '#fef3c7',
    color: '#b45309',
    border: '#fde68a',
    icon: 'ri-loader-4-line',
  },
  manual: {
    label: 'Manual Dispatch',
    bg: '#ede9fe',
    color: '#6d28d9',
    border: '#ddd6fe',
    icon: 'ri-user-shared-line',
  },
}

function formatDuration(sec) {
  if (sec == null || isNaN(sec)) return '—'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '—'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AutoAssignTelemetry() {
  const [data, setData] = useState({
    kpis: {
      total_assignments: 0,
      auto_count: 0,
      manual_count: 0,
      accepted_count: 0,
      rejected_count: 0,
      timed_out_count: 0,
      pending_count: 0,
      acceptance_rate: 0,
      avg_response_seconds: 0,
    },
    records: [],
    pagination: { page: 1, limit: 50, total_records: 0, total_pages: 1 },
  })

  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [reDispatchingId, setReDispatchingId] = useState(null)

  // Journey timeline modal state
  const [journeyModal, setJourneyModal] = useState(null)
  const [journeyLoading, setJourneyLoading] = useState(false)
  const [journeyHistory, setJourneyHistory] = useState([])

  const fetchTelemetry = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = {
        page: 1,
        limit: 50,
      }
      if (filterStatus !== 'all') params.status = filterStatus
      if (search.trim()) params.search = search.trim()

      const res = await api.get('/admin/deliveries/automap-telemetry', { params })
      if (res.data?.success) {
        setData(res.data)
      }
    } catch (err) {
      if (!silent) {
        toast.error(err.response?.data?.message || 'Failed to fetch dispatch telemetry')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filterStatus, search])

  useEffect(() => {
    fetchTelemetry(false)
  }, [fetchTelemetry])

  // Real-time polling every 10 seconds if auto-refresh is active
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchTelemetry(true)
    }, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchTelemetry])

  // Trigger re-dispatch action
  const handleReDispatch = async (deliveryId, orderRef) => {
    setReDispatchingId(deliveryId)
    try {
      const res = await api.post(`/admin/deliveries/${deliveryId}/re-dispatch`)
      if (res.data?.success) {
        toast.success(res.data.message || `Order #${orderRef} successfully re-dispatched!`)
      } else {
        toast(res.data?.message || 'Re-dispatch attempted with note.', { icon: 'ℹ️' })
      }
      fetchTelemetry(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Re-dispatch failed. Check if drivers are online.')
    } finally {
      setReDispatchingId(null)
    }
  }

  // Open Dispatch Journey Modal
  const openJourneyModal = async (record) => {
    setJourneyModal(record)
    setJourneyLoading(true)
    setJourneyHistory([])
    try {
      const res = await api.get(`/admin/deliveries/${record.delivery_id}/dispatch-history`)
      if (res.data?.success) {
        setJourneyHistory(res.data.history || [])
      }
    } catch (err) {
      toast.error('Could not load cascade history')
    } finally {
      setJourneyLoading(false)
    }
  }

  const kpis = data.kpis || {}

  return (
    <div className="container-fluid px-3 px-md-4 py-4">
      {/* ── BREADCRUMB & HEADER ── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1 text-muted" style={{ fontSize: '0.8rem' }}>
              <li className="breadcrumb-item"><Link to="/dashboard">Dashboard</Link></li>
              <li className="breadcrumb-item"><Link to="/deliveries/active">Deliveries</Link></li>
              <li className="breadcrumb-item active fw-bold text-dark">Auto-Assign Telemetry</li>
            </ol>
          </nav>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-black mb-0 text-slate-900 tracking-tight d-flex align-items-center gap-2">
              <span className="text-success"><i className="ri-radar-fill"></i></span>
              Auto-Assign &amp; Proximity Dispatch Telemetry
            </h4>
            <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2.5 py-1 text-xs fw-bold">
              Proximity AI Active
            </span>
          </div>
          <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.82rem' }}>
            Auditing automated courier mapping, driver response latencies, rejections, and 5-minute timeout cascades.
          </p>
        </div>

        {/* Action Controls */}
        <div className="d-flex align-items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn btn-sm d-flex align-items-center gap-1.5 fw-bold ${
              autoRefresh ? 'btn-success text-white shadow-sm' : 'btn-outline-secondary'
            }`}
            title={autoRefresh ? 'Auto-refreshing every 10s' : 'Auto-refresh paused'}
          >
            <span className={`rounded-circle ${autoRefresh ? 'bg-white' : 'bg-secondary'}`} style={{ width: 8, height: 8 }}></span>
            <span>{autoRefresh ? 'Live Radar (10s)' : 'Live Paused'}</span>
          </button>

          <button
            onClick={() => fetchTelemetry(false)}
            disabled={loading}
            className="btn btn-sm btn-light border d-flex align-items-center gap-1.5 shadow-2xs fw-semibold"
          >
            <i className={`ri-refresh-line ${loading ? 'ri-spin' : ''}`}></i>
            <span>Refresh</span>
          </button>

          <Link to="/deliveries/map" className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 fw-bold">
            <i className="ri-map-pin-2-line"></i>
            <span>Live Map</span>
          </Link>

          <Link to="/deliveries/active" className="btn btn-sm btn-dark d-flex align-items-center gap-1 fw-bold">
            <i className="ri-truck-line"></i>
            <span>Active Deliveries</span>
          </Link>
        </div>
      </div>

      {/* ── KPI TELEMETRY CARDS (TOP ROW) ── */}
      <div className="row g-3 mb-4">
        {/* Total Mapped */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                Total Dispatches
              </span>
              <div className="rounded-3 p-2 bg-primary-subtle text-primary">
                <i className="ri-route-line fs-5"></i>
              </div>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <h2 className="fw-black mb-0 text-slate-900">{kpis.total_assignments}</h2>
              <span className="text-muted text-xs">attempts</span>
            </div>
            <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
              <span className="text-primary fw-bold">{kpis.auto_count}</span> automated proximity · <span className="fw-semibold">{kpis.manual_count}</span> manual
            </div>
          </div>
        </div>

        {/* Accepted & Acceptance Rate */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                Driver Acceptance
              </span>
              <div className="rounded-3 p-2 bg-success-subtle text-success">
                <i className="ri-check-double-line fs-5"></i>
              </div>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <h2 className="fw-black mb-0 text-success">{kpis.accepted_count}</h2>
              <span className="badge bg-success text-white px-2 py-0.5 rounded-pill text-xs fw-bold">
                {kpis.acceptance_rate}% Rate
              </span>
            </div>
            <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
              Drivers accepted &amp; proceeded to pickup
            </div>
          </div>
        </div>

        {/* Declined / Rejected */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                Declined by Courier
              </span>
              <div className="rounded-3 p-2 bg-danger-subtle text-danger">
                <i className="ri-close-circle-line fs-5"></i>
              </div>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <h2 className="fw-black mb-0 text-danger">{kpis.rejected_count}</h2>
              <span className="text-muted text-xs">declined</span>
            </div>
            <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
              Immediately re-routed to next closest driver
            </div>
          </div>
        </div>

        {/* 5-Min Timeouts & Avg Latency */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                5-Min Expirations &amp; Speed
              </span>
              <div className="rounded-3 p-2 bg-warning-subtle text-warning">
                <i className="ri-timer-flash-line fs-5"></i>
              </div>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <h2 className="fw-black mb-0 text-slate-800">{kpis.timed_out_count}</h2>
              <span className="text-muted text-xs">timeouts</span>
            </div>
            <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
              Avg Response: <strong className="text-slate-900">{formatDuration(kpis.avg_response_seconds)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
        <div className="row g-2 align-items-center justify-content-between">
          {/* Status Tabs */}
          <div className="col-12 col-lg-7">
            <div className="d-flex flex-wrap gap-1 p-1 bg-light rounded-3 border">
              {[
                { id: 'all', label: 'All Dispatches', count: kpis.total_assignments },
                { id: 'accepted', label: 'Accepted', count: kpis.accepted_count, color: 'text-success' },
                { id: 'rejected', label: 'Declined', count: kpis.rejected_count, color: 'text-danger' },
                { id: 'timed_out', label: 'Timed Out', count: kpis.timed_out_count, color: 'text-secondary' },
                { id: 'pending', label: 'Pending Response', count: kpis.pending_count, color: 'text-warning' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`btn btn-sm px-3 py-1.5 rounded-2 fw-bold text-xs transition ${
                    filterStatus === tab.id
                      ? 'btn-white bg-white text-dark shadow-xs border'
                      : 'text-muted border-0 hover:text-dark'
                  }`}
                >
                  <span className={tab.color || ''}>{tab.label}</span>
                  {tab.count != null && (
                    <span className="ms-1.5 badge bg-slate-200 text-slate-700 rounded-pill text-[10px]">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="col-12 col-lg-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="ri-search-line"></i>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order ref, driver, phone..."
                className="form-control form-control-sm bg-light border-start-0 text-xs"
              />
              {search && (
                <button onClick={() => setSearch('')} className="btn btn-light border-start-0 text-muted">
                  <i className="ri-close-line"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── DISPATCH AUDIT STREAM TABLE ── */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
        <div className="card-header bg-white py-3 px-4 border-bottom d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold text-slate-800 text-sm">Dispatch Operations Log Stream</span>
            <span className="badge bg-light text-muted border text-xs">
              {data.pagination?.total_records || 0} events
            </span>
          </div>
          <span className="text-muted text-xs">Sorted by most recent dispatch</span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
            <thead className="bg-light text-muted text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
              <tr>
                <th className="ps-4 py-3">Order Ref</th>
                <th className="py-3">Target Driver</th>
                <th className="py-3">Dispatch Mode</th>
                <th className="py-3">Driver Outcome</th>
                <th className="py-3">Response Latency</th>
                <th className="py-3">Customer &amp; Address</th>
                <th className="py-3">Assigned At</th>
                <th className="pe-4 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.records.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                    <span>Loading real-time dispatch stream...</span>
                  </td>
                </tr>
              ) : data.records.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <i className="ri-inbox-line fs-2 d-block text-secondary mb-2"></i>
                    <span>No auto-dispatch records found matching the active filter.</span>
                  </td>
                </tr>
              ) : (
                data.records.map((r) => {
                  const badgeCfg = RESPONSE_BADGES[r.driver_response] || RESPONSE_BADGES.pending
                  const isAuto = r.assignment_type === 'auto' || r.assignment_type === 'system'
                  return (
                    <tr key={r.assignment_id}>
                      {/* Order Ref & Total */}
                      <td className="ps-4">
                        <div className="d-flex flex-column">
                          <Link
                            to={`/orders/${r.order_id}`}
                            className="fw-bold text-success text-decoration-none hover:underline"
                          >
                            #{r.order_ref || r.order_id}
                          </Link>
                          <span className="text-muted text-xs">{fmtNaira(r.order_total)}</span>
                        </div>
                      </td>

                      {/* Target Driver */}
                      <td>
                        {r.driver_name ? (
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-secondary fw-bold text-xs"
                              style={{ width: 32, height: 32 }}
                            >
                              {r.driver_avatar ? (
                                <img src={r.driver_avatar} alt="" className="rounded-circle w-100 h-100 object-fit-cover" />
                              ) : (
                                r.driver_name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="fw-bold text-slate-800">{r.driver_name}</div>
                              <div className="text-muted text-xs d-flex align-items-center gap-1">
                                <span>{r.vehicle_plate || r.vehicle_type || 'Courier'}</span>
                                {r.driver_phone && (
                                  <>
                                    <span>·</span>
                                    <a href={`tel:${r.driver_phone}`} className="text-muted text-decoration-none hover:text-dark">
                                      {r.driver_phone}
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted italic">Unassigned Pool</span>
                        )}
                      </td>

                      {/* Dispatch Mode */}
                      <td>
                        <span
                          className={`badge rounded-pill text-xs px-2.5 py-1 fw-bold ${
                            isAuto
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {isAuto ? '⚡ Auto-Proximity' : '👤 Manual Override'}
                        </span>
                        {r.assigned_by_name && (
                          <div className="text-muted text-[10px] mt-0.5">by {r.assigned_by_name}</div>
                        )}
                      </td>

                      {/* Outcome Badge */}
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <span
                            className="badge d-inline-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs fw-bold w-fit"
                            style={{
                              backgroundColor: badgeCfg.bg,
                              color: badgeCfg.color,
                              border: `1px solid ${badgeCfg.border}`,
                            }}
                          >
                            <i className={badgeCfg.icon}></i>
                            <span>{badgeCfg.label}</span>
                          </span>
                          {r.rejection_reason && (
                            <span className="text-danger text-[11px] fw-semibold text-truncate" style={{ maxWidth: 220 }} title={r.rejection_reason}>
                              Reason: {r.rejection_reason}
                            </span>
                          )}
                          {r.override_note && (
                            <span className="text-muted text-[11px] italic text-truncate" style={{ maxWidth: 220 }}>
                              Note: {r.override_note}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Response Latency */}
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-bold text-slate-800">
                            {r.response_duration_seconds != null ? formatDuration(r.response_duration_seconds) : (
                              r.driver_response === 'pending' ? (
                                <span className="text-warning d-flex align-items-center gap-1">
                                  <span className="spinner-grow spinner-grow-sm text-warning" style={{ width: 8, height: 8 }} />
                                  <span>Waiting...</span>
                                </span>
                              ) : '—'
                            )}
                          </span>
                          {r.response_at && (
                            <span className="text-muted text-xs">
                              {new Date(r.response_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer & Address */}
                      <td>
                        <div className="d-flex flex-column" style={{ maxWidth: 220 }}>
                          <span className="fw-semibold text-slate-800 text-truncate">{r.customer_name}</span>
                          <span className="text-muted text-xs text-truncate" title={r.delivery_address}>
                            {r.delivery_address || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Assigned At */}
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-semibold text-slate-700">{formatTimeAgo(r.assigned_at)}</span>
                          <span className="text-muted text-xs">
                            {new Date(r.assigned_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="pe-4 text-end">
                        <div className="d-inline-flex align-items-center gap-1.5">
                          {/* Dispatch Journey Timeline */}
                          <button
                            onClick={() => openJourneyModal(r)}
                            className="btn btn-xs btn-light border d-inline-flex align-items-center gap-1 text-xs fw-semibold hover:bg-slate-100"
                            title="View multi-attempt cascade journey"
                          >
                            <i className="ri-history-line text-primary"></i>
                            <span>Journey</span>
                          </button>

                          {/* Quick Re-Dispatch for non-accepted */}
                          {r.driver_response !== 'accepted' && (
                            <button
                              onClick={() => handleReDispatch(r.delivery_id, r.order_ref || r.order_id)}
                              disabled={reDispatchingId === r.delivery_id}
                              className="btn btn-xs btn-outline-success d-inline-flex align-items-center gap-1 text-xs fw-bold"
                              title="Re-run proximity auto-assign engine"
                            >
                              <i className={`ri-repeat-2-line ${reDispatchingId === r.delivery_id ? 'ri-spin' : ''}`}></i>
                              <span>Re-Map</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DISPATCH JOURNEY MODAL ── */}
      {journeyModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden">
              <div className="modal-header bg-slate-900 text-white px-4 py-3 border-0">
                <div>
                  <h5 className="modal-title fw-black d-flex align-items-center gap-2 mb-0">
                    <span className="text-emerald-400"><i className="ri-route-line"></i></span>
                    Dispatch Journey Cascade — Order #{journeyModal.order_ref || journeyModal.order_id}
                  </h5>
                  <p className="text-slate-400 text-xs mb-0 mt-0.5">
                    Delivery Ref: <strong className="text-slate-200">{journeyModal.delivery_ref}</strong> · Customer: {journeyModal.customer_name}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setJourneyModal(null)}
                ></button>
              </div>

              <div className="modal-body p-4 bg-slate-50">
                {journeyLoading ? (
                  <div className="text-center py-5 text-muted">
                    <div className="spinner-border text-success mb-2" role="status" />
                    <p className="text-xs mb-0">Tracing assignment cascade steps...</p>
                  </div>
                ) : journeyHistory.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <p className="mb-0">No cascade history found for this delivery record.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <span className="fw-bold text-slate-800 text-xs text-uppercase tracking-wider">
                        {journeyHistory.length} Assignment Attempt{journeyHistory.length > 1 ? 's' : ''} Recorded
                      </span>
                      <span className="badge bg-light text-muted border text-xs">
                        Final Status: {journeyModal.delivery_status?.toUpperCase()}
                      </span>
                    </div>

                    {/* Timeline List */}
                    <div className="position-relative ps-4 border-start border-2 border-slate-300 ms-3 space-y-4">
                      {journeyHistory.map((step, idx) => {
                        const stepBadge = RESPONSE_BADGES[step.driver_response] || RESPONSE_BADGES.pending
                        const isAccepted = step.driver_response === 'accepted'
                        return (
                          <div key={step.assignment_id} className="position-relative mb-4">
                            {/* Marker Dot */}
                            <div
                              className={`position-absolute rounded-circle border-2 border-white d-flex align-items-center justify-content-center text-white ${
                                isAccepted ? 'bg-success' : step.driver_response === 'rejected' ? 'bg-danger' : 'bg-slate-400'
                              }`}
                              style={{
                                width: 24,
                                height: 24,
                                left: -29,
                                top: 2,
                                fontSize: 10,
                                fontWeight: 'bold',
                              }}
                            >
                              {idx + 1}
                            </div>

                            {/* Card Content */}
                            <div className="card border shadow-xs rounded-3 p-3 bg-white">
                              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-bold text-slate-900 text-sm">
                                    Attempt #{idx + 1}: {step.driver_name || 'Driver Allocation'}
                                  </span>
                                  {step.vehicle_plate && (
                                    <span className="badge bg-light text-dark border text-[11px]">
                                      {step.vehicle_plate} ({step.vehicle_type})
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="badge px-2.5 py-1 rounded-pill text-xs fw-bold"
                                  style={{
                                    backgroundColor: stepBadge.bg,
                                    color: stepBadge.color,
                                    border: `1px solid ${stepBadge.border}`,
                                  }}
                                >
                                  {stepBadge.label}
                                </span>
                              </div>

                              <div className="row g-2 text-xs text-muted mb-2">
                                <div className="col-12 col-sm-6">
                                  <span>Assigned: </span>
                                  <strong className="text-slate-700">
                                    {new Date(step.assigned_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </strong>
                                </div>
                                <div className="col-12 col-sm-6">
                                  <span>Response Time: </span>
                                  <strong className="text-slate-700">
                                    {step.response_duration_seconds != null ? formatDuration(step.response_duration_seconds) : 'None (Active)'}
                                  </strong>
                                </div>
                              </div>

                              {step.rejection_reason && (
                                <div className="p-2 rounded bg-danger-subtle text-danger border border-danger-subtle text-xs mt-1">
                                  <strong>Decline Reason:</strong> {step.rejection_reason}
                                </div>
                              )}

                              {step.override_note && (
                                <div className="p-2 rounded bg-light text-slate-700 border text-xs mt-1">
                                  <strong>Dispatcher Note:</strong> {step.override_note}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-white border-top px-4 py-2.5 d-flex justify-content-between">
                <span className="text-muted text-xs">
                  Proximity Auto-Dispatch cascade logic enforces 5-min driver response limits.
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-dark fw-bold px-4 rounded-3"
                  onClick={() => setJourneyModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
