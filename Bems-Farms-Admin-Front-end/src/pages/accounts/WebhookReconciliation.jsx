import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useRealtimeEvent } from '../../context/RealtimeContext'
import { getPaymentStatusMeta } from '../../lib/paymentBadge'

const fmt = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WebhookReconciliation() {
  const [loading, setLoading] = useState(true)
  const [autoMapping, setAutoMapping] = useState(false)
  const [tab, setTab] = useState('unmapped')
  const [search, setSearch] = useState('')
  const [data, setData] = useState({
    summary: {
      awaiting_count: 0,
      awaiting_pos_count: 0,
      awaiting_cod_count: 0,
      awaiting_total: 0,
      unmapped_count: 0,
      unmapped_total: 0,
      mapped_count: 0,
      auto_match_candidates: 0,
    },
    awaiting_confirmation: [],
    unmapped_webhooks: [],
    mapped_transactions: [],
    webhook_logs: [],
  })

  // Manual map modal state
  const [mapModal, setMapModal] = useState(null) // { mode: 'from_webhook', webhook } | { mode: 'from_order', order }
  const [selectedTarget, setSelectedTarget] = useState('')
  const [forceMismatch, setForceMismatch] = useState(false)
  const [submittingMap, setSubmittingMap] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get('/admin/pos/webhook-reconciliation')
      if (res.data?.success) {
        setData(res.data)
      }
    } catch (err) {
      if (!silent) toast.error(err.response?.data?.message || 'Failed to load webhook reconciliation')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  useRealtimeEvent('pos:moniepoint_payment', () => load(true))
  useRealtimeEvent('driver:cod_payment_confirmed', () => load(true))

  async function handleAutoMap() {
    setAutoMapping(true)
    try {
      const res = await api.post('/admin/pos/webhook-reconciliation/automap')
      const count = res.data?.mapped_count || 0
      if (count > 0) {
        toast.success(res.data?.message || `Auto-mapped ${count} webhook(s)`)
      } else {
        toast(res.data?.message || 'No exact matches found for auto-mapping', { icon: 'ℹ️' })
      }
      await load(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Auto-map failed')
    } finally {
      setAutoMapping(false)
    }
  }

  function openMapFromWebhook(webhook) {
    setMapModal({ mode: 'from_webhook', webhook })
    setSelectedTarget('')
    setForceMismatch(false)
  }

  function openMapFromOrder(order) {
    setMapModal({ mode: 'from_order', order })
    setSelectedTarget('')
    setForceMismatch(false)
  }

  async function handleConfirmManualMap() {
    if (!mapModal || !selectedTarget) {
      toast.error('Please select a target to map')
      return
    }
    setSubmittingMap(true)
    try {
      let payload
      if (mapModal.mode === 'from_webhook') {
        const [tType, ...rest] = selectedTarget.split('::')
        payload = {
          pos_transaction_id: mapModal.webhook.id,
          target_type: tType,
          target_id: rest.join('::'),
          force_amount_mismatch: forceMismatch,
        }
      } else {
        payload = {
          pos_transaction_id: selectedTarget,
          target_type: mapModal.order.target_type,
          target_id: mapModal.order.target_id,
          force_amount_mismatch: forceMismatch,
        }
      }
      const res = await api.post('/admin/pos/webhook-reconciliation/manual-map', payload)
      toast.success(res.data?.message || 'Payment mapped successfully')
      setMapModal(null)
      await load(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Manual mapping failed')
    } finally {
      setSubmittingMap(false)
    }
  }

  const q = search.trim().toLowerCase()

  const filteredUnmapped = useMemo(() => {
    if (!q) return data.unmapped_webhooks
    return data.unmapped_webhooks.filter((w) =>
      [w.transaction_id, w.terminal_id, w.customer_name, w.payment_method, w.rrn, w.amount]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.unmapped_webhooks, q])

  const filteredAwaiting = useMemo(() => {
    if (!q) return data.awaiting_confirmation
    return data.awaiting_confirmation.filter((a) =>
      [a.order_ref, a.target_id, a.terminal_sn, a.customer_name, a.driver_name, a.channel, a.amount]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.awaiting_confirmation, q])

  const filteredMapped = useMemo(() => {
    if (!q) return data.mapped_transactions
    return data.mapped_transactions.filter((m) =>
      [m.transaction_id, m.terminal_id, m.used_for_order_id, m.order_ref, m.customer_name, m.sender_name, m.amount]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.mapped_transactions, q])

  const filteredLogs = useMemo(() => {
    if (!q) return data.webhook_logs
    return data.webhook_logs.filter((l) =>
      [l.gateway, l.event_type, l.transaction_reference, l.amount]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.webhook_logs, q])

  const { summary } = data

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="fw-bold mb-0 text-dark">
            <i className="ri-links-line text-success me-2" />
            Moniepoint / Monnify Webhook Reconciliation
          </h4>
          <div className="text-muted small">
            Auto-map incoming POS &amp; COD payment webhooks, inspect awaiting confirmations, or manually link unmatched payments.
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => load(false)}
            disabled={loading}
          >
            <i className="ri-refresh-line me-1" /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-success btn-sm fw-semibold"
            onClick={handleAutoMap}
            disabled={autoMapping || summary.unmapped_count === 0}
          >
            <i className="ri-magic-line me-1" />
            {autoMapping ? 'Auto-Mapping…' : `Auto-Map (${summary.auto_match_candidates})`}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small fw-semibold">Unmapped Webhooks</div>
              <div className="fs-4 fw-bold text-warning mt-1">{summary.unmapped_count}</div>
              <div className="small text-muted">{fmt(summary.unmapped_total)} received</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small fw-semibold">Awaiting Confirmation</div>
              <div className="fs-4 fw-bold text-primary mt-1">{summary.awaiting_count}</div>
              <div className="small text-muted">
                {summary.awaiting_pos_count} POS · {summary.awaiting_cod_count} COD ({fmt(summary.awaiting_total)})
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small fw-semibold">Ready for Auto-Map</div>
              <div className="fs-4 fw-bold text-success mt-1">{summary.auto_match_candidates}</div>
              <div className="small text-muted">Exact amount matches</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small fw-semibold">Mapped &amp; Confirmed</div>
              <div className="fs-4 fw-bold text-dark mt-1">{summary.mapped_count}</div>
              <div className="small text-muted">Linked to POS / COD orders</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2 py-2.5">
          <div className="nav nav-pills gap-1">
            {[
              { id: 'unmapped', label: `Unmapped Webhooks (${summary.unmapped_count})` },
              { id: 'awaiting', label: `Awaiting Confirmation (${summary.awaiting_count})` },
              { id: 'mapped', label: `Mapped (${summary.mapped_count})` },
              { id: 'logs', label: `Raw Logs (${data.webhook_logs.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`btn btn-sm ${tab === t.id ? 'btn-success fw-semibold' : 'btn-light text-dark'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ maxWidth: 280 }}
            placeholder="Search ref, terminal SN, customer, amount…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border spinner-border-sm text-success me-2" />
              Loading webhook reconciliation…
            </div>
          ) : tab === 'unmapped' ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>Webhook Ref</th>
                    <th>Terminal SN</th>
                    <th>Method</th>
                    <th>Sender / Card</th>
                    <th>Amount</th>
                    <th>Received</th>
                    <th>Match Hint</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnmapped.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-muted">
                        No unmapped webhooks right now.
                      </td>
                    </tr>
                  ) : (
                    filteredUnmapped.map((w) => {
                      const exactMatch = data.awaiting_confirmation.find(
                        (a) => Math.abs(parseFloat(w.amount) - a.amount) < 0.5
                      )
                      return (
                        <tr key={w.id}>
                          <td className="font-monospace fw-semibold small">{w.transaction_id}</td>
                          <td className="font-monospace small">{w.terminal_id || '—'}</td>
                          <td>
                            <span className="badge bg-light text-dark border">{w.payment_method || 'CARD'}</span>
                          </td>
                          <td className="small">
                            {w.customer_name || (w.last_four ? `${w.card_type || 'CARD'} •••• ${w.last_four}` : '—')}
                          </td>
                          <td className="fw-bold text-success">{fmt(w.amount)}</td>
                          <td className="small text-muted">{fmtDate(w.payment_time)}</td>
                          <td>
                            {exactMatch ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle">
                                Matches {exactMatch.order_ref} ({exactMatch.channel})
                              </span>
                            ) : (
                              <span className="text-muted small">No exact match</span>
                            )}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary fw-semibold"
                              onClick={() => openMapFromWebhook(w)}
                            >
                              Manual Map →
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'awaiting' ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>Order / Ref</th>
                    <th>Channel</th>
                    <th>Customer</th>
                    <th>Driver / Terminal SN</th>
                    <th>Amount</th>
                    <th>Order Status</th>
                    <th>Created</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAwaiting.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-muted">
                        No POS or COD orders currently awaiting webhook confirmation.
                      </td>
                    </tr>
                  ) : (
                    filteredAwaiting.map((a) => (
                      <tr key={`${a.target_type}-${a.target_id}`}>
                        <td className="font-monospace fw-bold small">
                          {a.target_type === 'order' ? (
                            <Link to={`/orders?search=${encodeURIComponent(a.order_ref)}`}>{a.order_ref}</Link>
                          ) : (
                            a.order_ref
                          )}
                        </td>
                        <td>
                          <span className={`badge ${a.target_type === 'held_order' ? 'bg-primary-subtle text-primary' : 'bg-warning-subtle text-warning-emphasis'}`}>
                            {a.channel}
                          </span>
                        </td>
                        <td className="small">
                          <div>{a.customer_name}</div>
                          {a.customer_phone && <div className="text-muted">{a.customer_phone}</div>}
                        </td>
                        <td className="small">
                          {a.driver_name && <div>{a.driver_name}</div>}
                          <div className="font-monospace text-muted">{a.terminal_sn || 'No terminal SN'}</div>
                        </td>
                        <td className="fw-bold">{fmt(a.amount)}</td>
                        <td className="small text-capitalize">{String(a.status || '').replace(/_/g, ' ')}</td>
                        <td className="small text-muted">{fmtDate(a.created_at)}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success fw-semibold"
                            onClick={() => openMapFromOrder(a)}
                            disabled={data.unmapped_webhooks.length === 0}
                          >
                            Link Webhook →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'mapped' ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>Webhook Ref</th>
                    <th>Terminal SN</th>
                    <th>Linked Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Payment Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMapped.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        No mapped webhook transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredMapped.map((m) => {
                      const ps = getPaymentStatusMeta(m.payment_status || 'paid')
                      return (
                        <tr key={m.id}>
                          <td className="font-monospace small">{m.transaction_id}</td>
                          <td className="font-monospace small">{m.terminal_id || '—'}</td>
                          <td className="font-monospace fw-bold small">
                            <Link to={`/orders?search=${encodeURIComponent(m.order_ref || m.used_for_order_id)}`}>
                              {m.order_ref || m.used_for_order_id}
                            </Link>
                          </td>
                          <td className="small">{m.customer_name || m.sender_name || '—'}</td>
                          <td className="fw-bold text-success">{fmt(m.amount)}</td>
                          <td>
                            <span
                              className="badge"
                              style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}
                            >
                              {ps.label}
                            </span>
                          </td>
                          <td className="small text-muted">{fmtDate(m.payment_time)}</td>
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
                <thead className="table-light small text-muted">
                  <tr>
                    <th>Gateway</th>
                    <th>Event</th>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Signature</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        No raw webhook logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((l) => (
                      <tr key={l.id}>
                        <td className="fw-semibold small">{l.gateway}</td>
                        <td className="small">{l.event_type}</td>
                        <td className="font-monospace small">{l.transaction_reference || '—'}</td>
                        <td className="fw-bold">{l.amount ? fmt(l.amount) : '—'}</td>
                        <td>
                          <span className={`badge ${l.signature_verified ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'}`}>
                            {l.signature_verified ? 'Verified' : 'Unverified'}
                          </span>
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

      {/* Manual Map Modal */}
      {mapModal && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.55)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {mapModal.mode === 'from_webhook'
                    ? `Map Webhook ${mapModal.webhook.transaction_id} (${fmt(mapModal.webhook.amount)})`
                    : `Link Webhook to ${mapModal.order.order_ref} (${fmt(mapModal.order.amount)})`}
                </h5>
                <button type="button" className="btn-close" onClick={() => setMapModal(null)} />
              </div>
              <div className="modal-body">
                {mapModal.mode === 'from_webhook' ? (
                  <>
                    <label className="form-label fw-semibold small">Select Awaiting POS Sale or COD Order</label>
                    <select
                      className="form-select"
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value)}
                    >
                      <option value="">-- Choose an awaiting order --</option>
                      {data.awaiting_confirmation.map((a) => {
                        const exact = Math.abs(parseFloat(mapModal.webhook.amount) - a.amount) < 0.5
                        return (
                          <option key={`${a.target_type}-${a.target_id}`} value={`${a.target_type}::${a.target_id}`}>
                            {exact ? '✅ ' : ''}
                            {a.order_ref} · {a.channel} · {fmt(a.amount)} · {a.customer_name}
                            {a.terminal_sn ? ` (SN: ${a.terminal_sn})` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </>
                ) : (
                  <>
                    <label className="form-label fw-semibold small">Select Unmapped Moniepoint Webhook</label>
                    <select
                      className="form-select"
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value)}
                    >
                      <option value="">-- Choose an unmapped webhook --</option>
                      {data.unmapped_webhooks.map((w) => {
                        const exact = Math.abs(parseFloat(w.amount) - mapModal.order.amount) < 0.5
                        return (
                          <option key={w.id} value={String(w.id)}>
                            {exact ? '✅ ' : ''}
                            {w.transaction_id} · {fmt(w.amount)} · SN: {w.terminal_id || 'N/A'} ({fmtDate(w.payment_time)})
                          </option>
                        )
                      })}
                    </select>
                  </>
                )}

                <div className="form-check mt-3">
                  <input
                    id="forceMismatchCheck"
                    type="checkbox"
                    className="form-check-input"
                    checked={forceMismatch}
                    onChange={(e) => setForceMismatch(e.target.checked)}
                  />
                  <label htmlFor="forceMismatchCheck" className="form-check-label small text-muted">
                    Allow mapping even if webhook amount differs from order total (e.g. bank charges / partial adjustment)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setMapModal(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success fw-semibold"
                  disabled={!selectedTarget || submittingMap}
                  onClick={handleConfirmManualMap}
                >
                  {submittingMap ? 'Mapping…' : 'Confirm & Map Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
