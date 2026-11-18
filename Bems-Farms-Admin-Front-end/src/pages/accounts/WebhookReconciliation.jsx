import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useRealtimeEvent } from '../../context/RealtimeContext'
import { getPaymentStatusMeta } from '../../lib/paymentBadge'

const fmt = (n) =>
  `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

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

function ChannelBadge({ channel, method }) {
  const ch = String(channel || '').toLowerCase()
  if (ch === 'transfer') {
    return (
      <span
        className="badge d-inline-flex align-items-center gap-1"
        style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontSize: 10 }}
      >
        <span>🏦</span>
        <span>TRANSFER</span>
      </span>
    )
  }
  if (ch === 'card') {
    return (
      <span
        className="badge d-inline-flex align-items-center gap-1"
        style={{ background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe', fontSize: 10 }}
      >
        <span>💳</span>
        <span>CARD</span>
      </span>
    )
  }
  return (
    <span className="badge bg-light text-dark border" style={{ fontSize: 10 }}>
      {String(method || 'OTHER').toUpperCase()}
    </span>
  )
}

export default function WebhookReconciliation() {
  const [loading, setLoading] = useState(true)
  const [autoMapping, setAutoMapping] = useState(false)
  const [streamFilter, setStreamFilter] = useState('all') // 'all' | 'pos' | 'cod'
  const [channelFilter, setChannelFilter] = useState('all') // 'all' | 'card' | 'transfer'
  const [bottomTab, setBottomTab] = useState('mapped') // 'mapped' | 'logs'
  const [search, setSearch] = useState('')

  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedWebhook, setSelectedWebhook] = useState(null)
  const [forceMismatch, setForceMismatch] = useState(false)
  const [mapping, setMapping] = useState(false)

  const [data, setData] = useState({
    summary: {
      awaiting_count: 0,
      awaiting_pos_count: 0,
      awaiting_cod_count: 0,
      awaiting_total: 0,
      unmapped_count: 0,
      unmapped_card_count: 0,
      unmapped_transfer_count: 0,
      unmapped_total: 0,
      mapped_count: 0,
      auto_match_candidates: 0,
    },
    awaiting_confirmation: [],
    awaiting_pos: [],
    awaiting_cod: [],
    unmapped_webhooks: [],
    mapped_transactions: [],
    webhook_logs: [],
  })

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get('/admin/pos/webhook-reconciliation')
      if (res.data?.success) {
        setData(res.data)
      }
    } catch (err) {
      if (!silent) toast.error(err.response?.data?.message || 'Failed to load reconciliation workstation')
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
      setSelectedOrder(null)
      setSelectedWebhook(null)
      await load(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Auto-map failed')
    } finally {
      setAutoMapping(false)
    }
  }

  async function handleConfirmPair() {
    if (!selectedOrder || !selectedWebhook) return
    setMapping(true)
    try {
      const res = await api.post('/admin/pos/webhook-reconciliation/manual-map', {
        pos_transaction_id: selectedWebhook.id,
        target_type: selectedOrder.target_type,
        target_id: selectedOrder.target_id,
        force_amount_mismatch: forceMismatch,
      })
      toast.success(res.data?.message || 'Payment mapped & confirmed')
      setSelectedOrder(null)
      setSelectedWebhook(null)
      setForceMismatch(false)
      await load(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mapping failed')
    } finally {
      setMapping(false)
    }
  }

  const q = search.trim().toLowerCase()

  const awaitingList = useMemo(() => {
    const base =
      streamFilter === 'pos'
        ? data.awaiting_pos || data.awaiting_confirmation.filter((a) => a.target_type === 'held_order')
        : streamFilter === 'cod'
        ? data.awaiting_cod || data.awaiting_confirmation.filter((a) => a.target_type === 'order')
        : data.awaiting_confirmation

    if (!q) return base
    return base.filter((a) =>
      [a.order_ref, a.target_id, a.terminal_sn, a.customer_name, a.driver_name, a.channel, a.amount]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data, streamFilter, q])

  const awaitingPosList = useMemo(
    () => awaitingList.filter((a) => a.target_type === 'held_order'),
    [awaitingList]
  )
  const awaitingCodList = useMemo(
    () => awaitingList.filter((a) => a.target_type === 'order'),
    [awaitingList]
  )

  const webhookList = useMemo(() => {
    let base = data.unmapped_webhooks
    if (channelFilter !== 'all') {
      base = base.filter((w) => w.payment_channel === channelFilter)
    }
    if (!q) return base
    return base.filter((w) =>
      [w.transaction_id, w.terminal_id, w.customer_name, w.sender_bank, w.payment_method, w.rrn, w.amount]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.unmapped_webhooks, channelFilter, q])

  const filteredMapped = useMemo(() => {
    let base = data.mapped_transactions
    if (streamFilter !== 'all') {
      base = base.filter((m) => m.order_kind === streamFilter)
    }
    if (channelFilter !== 'all') {
      base = base.filter((m) => m.payment_channel === channelFilter)
    }
    if (!q) return base
    return base.filter((m) =>
      [m.transaction_id, m.terminal_id, m.used_for_order_id, m.order_ref, m.customer_name, m.sender_name, m.amount]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.mapped_transactions, streamFilter, channelFilter, q])

  const filteredLogs = useMemo(() => {
    if (!q) return data.webhook_logs
    return data.webhook_logs.filter((l) =>
      [l.gateway, l.event_type, l.transaction_reference, l.amount]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.webhook_logs, q])

  const { summary } = data
  const amountDelta =
    selectedOrder && selectedWebhook
      ? Math.abs(Number(selectedOrder.amount || 0) - Number(selectedWebhook.amount || 0))
      : null
  const isExactPair = amountDelta !== null && amountDelta < 0.5

  const renderOrderCard = (a) => {
    const isSel = selectedOrder?.target_type === a.target_type && selectedOrder?.target_id === a.target_id
    const matchesSelWebhook = selectedWebhook && Math.abs(a.amount - Number(selectedWebhook.amount || 0)) < 0.5
    const isCod = a.target_type === 'order'

    return (
      <button
        key={`${a.target_type}-${a.target_id}`}
        type="button"
        onClick={() => setSelectedOrder(isSel ? null : a)}
        className="w-100 text-start p-3 rounded-3 border transition-all mb-2 bg-white"
        style={{
          borderColor: isSel ? '#15803d' : matchesSelWebhook ? '#22c55e' : '#e2e8f0',
          boxShadow: isSel
            ? '0 0 0 2px rgba(21,128,61,0.22)'
            : matchesSelWebhook
            ? '0 0 0 2px rgba(34,197,94,0.18)'
            : '0 1px 2px rgba(15,23,42,0.04)',
          background: isSel ? '#f0fdf4' : '#ffffff',
        }}
      >
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div className="d-flex align-items-center gap-1.5 flex-wrap">
              <span className="font-monospace fw-bold text-dark small">{a.order_ref}</span>
              <span
                className="badge"
                style={{
                  fontSize: 10,
                  background: isCod ? '#fef3c7' : '#dbeafe',
                  color: isCod ? '#92400e' : '#1e40af',
                  border: `1px solid ${isCod ? '#fde68a' : '#bfdbfe'}`,
                }}
              >
                {isCod ? '🚚 COD' : '🏪 POS SALE'}
              </span>
              {matchesSelWebhook && (
                <span className="badge bg-success text-white" style={{ fontSize: 10 }}>
                  EXACT MATCH
                </span>
              )}
            </div>
            <div className="small text-dark fw-medium mt-1">{a.customer_name}</div>
            <div className="d-flex align-items-center gap-2 flex-wrap mt-1 text-muted" style={{ fontSize: 11 }}>
              {a.driver_name && <span>Driver: <strong>{a.driver_name}</strong></span>}
              <span className="font-monospace">SN: {a.terminal_sn || 'Unassigned'}</span>
              <span>· {fmtDate(a.created_at)}</span>
            </div>
          </div>
          <div className="text-end shrink-0">
            <div className="fw-bold text-dark fs-6">{fmt(a.amount)}</div>
            <div className="text-muted text-capitalize" style={{ fontSize: 11 }}>
              {String(a.status || '').replace(/_/g, ' ')}
            </div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="container-fluid py-3">
      {/* Workstation Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="fw-bold mb-0 text-dark">
            <i className="ri-dashboard-3-line text-success me-2" />
            Payment Webhook Reconciliation Workstation
          </h4>
          <div className="text-muted small">
            Match incoming Moniepoint / Monnify webhooks separately across <strong>POS Sales</strong>, <strong>COD Deliveries</strong>, <strong>Card</strong>, and <strong>Transfer</strong> channels.
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
            {autoMapping ? 'Auto-Mapping…' : `Auto-Map Exact Matches (${summary.auto_match_candidates})`}
          </button>
        </div>
      </div>

      {/* Filter & KPI Workstation Bar */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2.5 d-flex flex-wrap align-items-center justify-content-between gap-3">
          {/* Stream Switcher: All | POS Sales | COD */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted small fw-semibold me-1">Order Stream:</span>
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn ${streamFilter === 'all' ? 'btn-dark fw-semibold' : 'btn-outline-secondary'}`}
                onClick={() => setStreamFilter('all')}
              >
                All ({summary.awaiting_count})
              </button>
              <button
                type="button"
                className={`btn ${streamFilter === 'pos' ? 'btn-primary fw-semibold' : 'btn-outline-secondary'}`}
                onClick={() => setStreamFilter('pos')}
              >
                🏪 POS Sales ({summary.awaiting_pos_count})
              </button>
              <button
                type="button"
                className={`btn ${streamFilter === 'cod' ? 'btn-warning fw-semibold text-dark' : 'btn-outline-secondary'}`}
                onClick={() => setStreamFilter('cod')}
              >
                🚚 COD Deliveries ({summary.awaiting_cod_count})
              </button>
            </div>
          </div>

          {/* Payment Channel Switcher: All | Card | Transfer */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted small fw-semibold me-1">Channel:</span>
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn ${channelFilter === 'all' ? 'btn-dark fw-semibold' : 'btn-outline-secondary'}`}
                onClick={() => setChannelFilter('all')}
              >
                All ({summary.unmapped_count})
              </button>
              <button
                type="button"
                className={`btn ${channelFilter === 'card' ? 'btn-primary fw-semibold' : 'btn-outline-secondary'}`}
                onClick={() => setChannelFilter('card')}
              >
                💳 Card ({summary.unmapped_card_count || 0})
              </button>
              <button
                type="button"
                className={`btn ${channelFilter === 'transfer' ? 'btn-info fw-semibold text-dark' : 'btn-outline-secondary'}`}
                onClick={() => setChannelFilter('transfer')}
              >
                🏦 Transfer ({summary.unmapped_transfer_count || 0})
              </button>
            </div>
          </div>

          {/* Search */}
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ maxWidth: 260 }}
            placeholder="Search order, ref, terminal SN, driver…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Sticky Pair-Match Action Bar */}
      {(selectedOrder || selectedWebhook) && (
        <div
          className="card border-2 mb-3 shadow-sm"
          style={{
            borderColor: selectedOrder && selectedWebhook ? '#16a34a' : '#94a3b8',
            background: selectedOrder && selectedWebhook ? '#f0fdf4' : '#f8fafc',
          }}
        >
          <div className="card-body py-2.5 d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3 flex-wrap small">
              <div>
                <span className="text-muted fw-semibold">Left (Order): </span>
                {selectedOrder ? (
                  <strong className="text-dark">
                    {selectedOrder.order_ref} · {fmt(selectedOrder.amount)} ({selectedOrder.target_type === 'order' ? 'COD' : 'POS'})
                  </strong>
                ) : (
                  <span className="text-muted fst-italic">Click an awaiting order on the left…</span>
                )}
              </div>
              <span className="fw-bold text-success">↔</span>
              <div>
                <span className="text-muted fw-semibold">Right (Webhook): </span>
                {selectedWebhook ? (
                  <strong className="text-dark">
                    {selectedWebhook.transaction_id} · {fmt(selectedWebhook.amount)} ({String(selectedWebhook.payment_channel || '').toUpperCase()})
                  </strong>
                ) : (
                  <span className="text-muted fst-italic">Click an incoming webhook on the right…</span>
                )}
              </div>
              {amountDelta !== null && (
                <span className={`badge ${isExactPair ? 'bg-success' : 'bg-danger'}`}>
                  {isExactPair ? 'Exact Amount Match ✅' : `Difference: ${fmt(amountDelta)}`}
                </span>
              )}
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              {selectedOrder && selectedWebhook && !isExactPair && (
                <label className="form-check-label small d-flex align-items-center gap-1 me-2">
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    checked={forceMismatch}
                    onChange={(e) => setForceMismatch(e.target.checked)}
                  />
                  <span>Allow mismatch</span>
                </label>
              )}
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={() => {
                  setSelectedOrder(null)
                  setSelectedWebhook(null)
                  setForceMismatch(false)
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn btn-sm btn-success fw-bold"
                disabled={!selectedOrder || !selectedWebhook || (!isExactPair && !forceMismatch) || mapping}
                onClick={handleConfirmPair}
              >
                {mapping ? 'Mapping…' : 'Confirm & Map Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split-Pane Workstation */}
      <div className="row g-3 mb-4">
        {/* LEFT PANE: Awaiting Orders (POS Sales vs COD Deliveries separated) */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2.5">
              <div>
                <span className="fw-bold text-dark">1. Awaiting Webhook Confirmation</span>
                <span className="text-muted small ms-2">({awaitingList.length})</span>
              </div>
              <span className="small text-muted">{fmt(awaitingList.reduce((s, a) => s + a.amount, 0))}</span>
            </div>
            <div className="card-body p-3" style={{ maxHeight: 460, overflowY: 'auto', background: '#f8fafc' }}>
              {loading ? (
                <div className="text-center py-5 text-muted small">Loading awaiting queue…</div>
              ) : awaitingList.length === 0 ? (
                <div className="text-center py-5 text-muted small">
                  No POS sales or COD deliveries awaiting confirmation.
                </div>
              ) : (
                <>
                  {(streamFilter === 'all' || streamFilter === 'pos') && awaitingPosList.length > 0 && (
                    <div className="mb-3">
                      <div className="small fw-bold text-primary mb-2 text-uppercase" style={{ letterSpacing: 0.4 }}>
                        🏪 POS Counter Sales ({awaitingPosList.length})
                      </div>
                      {awaitingPosList.map(renderOrderCard)}
                    </div>
                  )}
                  {(streamFilter === 'all' || streamFilter === 'cod') && awaitingCodList.length > 0 && (
                    <div>
                      <div className="small fw-bold text-warning-emphasis mb-2 text-uppercase" style={{ letterSpacing: 0.4 }}>
                        🚚 COD Deliveries ({awaitingCodList.length})
                      </div>
                      {awaitingCodList.map(renderOrderCard)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Incoming Unmapped Webhooks (Card vs Transfer) */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2.5">
              <div>
                <span className="fw-bold text-dark">2. Incoming Unmapped Webhooks</span>
                <span className="text-muted small ms-2">({webhookList.length})</span>
              </div>
              <span className="small text-muted">{fmt(webhookList.reduce((s, w) => s + Number(w.amount || 0), 0))}</span>
            </div>
            <div className="card-body p-3" style={{ maxHeight: 460, overflowY: 'auto', background: '#f8fafc' }}>
              {loading ? (
                <div className="text-center py-5 text-muted small">Loading incoming webhooks…</div>
              ) : webhookList.length === 0 ? (
                <div className="text-center py-5 text-muted small">
                  No unmapped webhooks in this channel.
                </div>
              ) : (
                webhookList.map((w) => {
                  const isSel = selectedWebhook?.id === w.id
                  const matchesSelOrder = selectedOrder && Math.abs(Number(w.amount || 0) - selectedOrder.amount) < 0.5
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWebhook(isSel ? null : w)}
                      className="w-100 text-start p-3 rounded-3 border transition-all mb-2 bg-white"
                      style={{
                        borderColor: isSel ? '#15803d' : matchesSelOrder ? '#22c55e' : '#e2e8f0',
                        boxShadow: isSel
                          ? '0 0 0 2px rgba(21,128,61,0.22)'
                          : matchesSelOrder
                          ? '0 0 0 2px rgba(34,197,94,0.18)'
                          : '0 1px 2px rgba(15,23,42,0.04)',
                        background: isSel ? '#f0fdf4' : '#ffffff',
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div>
                          <div className="d-flex align-items-center gap-1.5 flex-wrap">
                            <span className="font-monospace fw-bold text-dark small">{w.transaction_id}</span>
                            <ChannelBadge channel={w.payment_channel} method={w.payment_method} />
                            {matchesSelOrder && (
                              <span className="badge bg-success text-white" style={{ fontSize: 10 }}>
                                EXACT MATCH
                              </span>
                            )}
                          </div>
                          <div className="small text-dark mt-1">
                            {w.payment_channel === 'transfer'
                              ? [w.customer_name, w.sender_bank].filter(Boolean).join(' · ') || 'Bank Transfer'
                              : w.last_four
                              ? `${w.card_type || 'CARD'} •••• ${w.last_four}`
                              : w.customer_name || 'Card Payment'}
                          </div>
                          <div className="text-muted font-monospace mt-1" style={{ fontSize: 11 }}>
                            SN: {w.terminal_id || '—'} · {fmtDate(w.payment_time)}
                          </div>
                        </div>
                        <div className="text-end shrink-0">
                          <div className="fw-bold text-success fs-6">{fmt(w.amount)}</div>
                          {w.rrn && <div className="text-muted font-monospace" style={{ fontSize: 10 }}>RRN: {w.rrn}</div>}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Audit Table: Mapped & Confirmed vs Raw Logs */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-2.5">
          <div className="nav nav-pills gap-1">
            <button
              type="button"
              onClick={() => setBottomTab('mapped')}
              className={`btn btn-sm ${bottomTab === 'mapped' ? 'btn-success fw-semibold' : 'btn-light text-dark'}`}
            >
              Mapped &amp; Confirmed ({filteredMapped.length})
            </button>
            <button
              type="button"
              onClick={() => setBottomTab('logs')}
              className={`btn btn-sm ${bottomTab === 'logs' ? 'btn-success fw-semibold' : 'btn-light text-dark'}`}
            >
              Raw Webhook Logs ({filteredLogs.length})
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {bottomTab === 'mapped' ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>Webhook Ref</th>
                    <th>Stream</th>
                    <th>Channel</th>
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
                      <td colSpan={9} className="text-center py-4 text-muted small">
                        No mapped transactions match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMapped.map((m) => {
                      const ps = getPaymentStatusMeta(m.payment_status || 'paid')
                      return (
                        <tr key={m.id}>
                          <td className="font-monospace small">{m.transaction_id}</td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                fontSize: 10,
                                background: m.order_kind === 'cod' ? '#fef3c7' : '#dbeafe',
                                color: m.order_kind === 'cod' ? '#92400e' : '#1e40af',
                              }}
                            >
                              {m.order_kind === 'cod' ? 'COD' : 'POS'}
                            </span>
                          </td>
                          <td>
                            <ChannelBadge channel={m.payment_channel} method={m.payment_method} />
                          </td>
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
                      <td colSpan={6} className="text-center py-4 text-muted small">
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
                          <span
                            className={`badge ${
                              l.signature_verified
                                ? 'bg-success-subtle text-success'
                                : 'bg-warning-subtle text-warning-emphasis'
                            }`}
                          >
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
    </div>
  )
}
