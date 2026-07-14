import React, { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

const fmt  = n => `₦${Number(n || 0).toLocaleString()}`
const fmtD = s => s ? new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const STATUS_CFG = {
  successful: { label: 'Successful', bg: 'var(--bg-green-faint)', color: '#22c55e' },
  failed:     { label: 'Failed',     bg: 'var(--bg-red-faint)', color: '#ef4444' },
  reversed:   { label: 'Reversed',   bg: 'var(--bg-blue-faint)', color: '#3b82f6' },
  pending:    { label: 'Pending',    bg: 'var(--bg-yellow-faint)', color: '#f59e0b' },
}

const WEBHOOK_STATUS_CFG = {
  processed: { label: 'Processed', bg: 'var(--bg-green-faint)', color: '#22c55e' },
  ignored:   { label: 'Ignored',   bg: 'var(--bg-yellow-faint)', color: '#f59e0b' },
  error:     { label: 'Error',     bg: 'var(--bg-red-faint)', color: '#ef4444' },
}

export default function PaymentReconciliation() {
  const [activeTab, setActiveTab] = useState('payments') // 'payments' | 'webhooks'
  const [payments, setPayments] = useState([])
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Pagination & Search for Payments
  const [paySearch, setPaySearch] = useState('')
  const [payStatus, setPayStatus] = useState('all')
  const [payMeta, setPayMeta] = useState({ total: 0, page: 1, pages: 1 })
  const [payPage, setPayPage] = useState(1)

  // Pagination for Webhooks
  const [webStatus, setWebStatus] = useState('all')
  const [webMeta, setWebMeta] = useState({ total: 0, page: 1, pages: 1 })
  const [webPage, setWebPage] = useState(1)

  // Stats
  const [stats, setStats] = useState({
    total_reconciled: 0,
    count_successful: 0,
    count_failed: 0,
    count_unreconciled: 0,
  })

  // Modal control
  const [showReconcileModal, setShowReconcileModal] = useState(false)
  const [showPayloadModal, setShowPayloadModal] = useState(null) // holds selected log event payload
  const [manualForm, setManualForm] = useState({ payment_ref: '', order_id: '' })

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/payments/reconciliation', {
        params: {
          page: payPage,
          limit: 15,
          search: paySearch || undefined,
          status: payStatus === 'all' ? undefined : payStatus,
        }
      })
      setPayments(res.data.payments || [])
      setPayMeta({ total: res.data.total, page: res.data.page, pages: res.data.pages })
      if (res.data.stats) {
        setStats(res.data.stats)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load payment reconciliation records')
    } finally {
      setLoading(false)
    }
  }, [payPage, paySearch, payStatus])

  const fetchWebhooks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/payments/webhook-logs', {
        params: {
          page: webPage,
          limit: 20,
          status: webStatus === 'all' ? undefined : webStatus,
        }
      })
      setWebhooks(res.data.logs || [])
      setWebMeta({ total: res.data.total, page: res.data.page, pages: res.data.pages })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load webhook logs')
    } finally {
      setLoading(false)
    }
  }, [webPage, webStatus])

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments()
    } else {
      fetchWebhooks()
    }
  }, [activeTab, fetchPayments, fetchWebhooks])

  const handleManualReconcile = async (e) => {
    e.preventDefault()
    if (!manualForm.payment_ref || !manualForm.order_id) {
      toast.error('Please provide reference and database Order ID')
      return
    }
    setSaving(true)
    try {
      await api.post('/admin/payments/reconcile-manual', manualForm)
      toast.success('Payment linked and reconciled successfully')
      setShowReconcileModal(false)
      setManualForm({ payment_ref: '', order_id: '' })
      fetchPayments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Manual reconciliation failed')
    } finally {
      setSaving(false)
    }
  }

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-card)',
    overflow: 'hidden',
  }

  const inpStyle = {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  }

  const btnP = {
    background: '#1B4332',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(27,67,50,0.15)',
  }

  const thStyle = {
    padding: '10px 16px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
  }

  const tdStyle = {
    padding: '12px 16px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
  }

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>
      <PageHeader title="Payment Reconciliation Gateway" breadcrumbs={['Accounts', 'Reconciliation']} />

      {/* Stats Summary Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Inflow Logged', val: fmt(stats.total_reconciled), color: '#3b82f6', bg: 'var(--bg-blue-faint)', icon: 'ri-money-dollar-circle-line' },
          { label: 'Successful Audited', val: stats.count_successful, color: '#22c55e', bg: 'var(--bg-green-faint)', icon: 'ri-checkbox-circle-line' },
          { label: 'Failed Alerts', val: stats.count_failed, color: '#ef4444', bg: 'var(--bg-red-faint)', icon: 'ri-close-circle-line' },
          { label: 'Unreconciled Payments', val: stats.count_unreconciled, color: '#d97706', bg: 'var(--bg-yellow-faint)', icon: 'ri-error-warning-line' },
        ].map((k, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: k.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <i className={k.icon} style={{ fontSize: '20px', color: k.color }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{k.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{k.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '20px', paddingBottom: '1px' }}>
        {[
          { key: 'payments', label: 'Payments Reconciliation Ledger', icon: 'ri-wallet-3-line' },
          { key: 'webhooks', label: 'Webhook Webhook Audit Logs', icon: 'ri-braces-line' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid #1B4332' : 'none',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table & Filtering Section */}
      <div style={cardStyle}>
        {activeTab === 'payments' ? (
          <>
            {/* Filters */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inpStyle, width: '220px', paddingLeft: '32px' }} placeholder="Search reference, email…" value={paySearch} onChange={e => setPaySearch(e.target.value)} />
                  <i className="ri-search-line" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-muted)' }} />
                </div>
                <select style={{ ...inpStyle, width: '150px' }} value={payStatus} onChange={e => setPayStatus(e.target.value)}>
                  <option value="all">All Payments</option>
                  <option value="successful">Successful</option>
                  <option value="failed">Failed</option>
                  <option value="reversed">Reversed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <button style={btnP} onClick={() => setShowReconcileModal(true)}>
                <i className="ri-link-m" />Manual Link Payment
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    <th style={thStyle}>Reference</th>
                    <th style={thStyle}>Linked Order</th>
                    <th style={thStyle}>Customer Email</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Method</th>
                    <th style={thStyle}>Terminal ID</th>
                    <th style={thStyle}>Paid At</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && payments.length === 0 ? (
                    <tr><td colSpan="8" style={{ ...tdStyle, textAlign: 'center', padding: '40px 0' }}>
                      <div className="spinner-border spinner-border-sm text-primary me-2" />Loading payments logs...
                    </td></tr>
                  ) : payments.length === 0 ? (
                    <tr><td colSpan="8" style={{ ...tdStyle, textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>No payments matches found.</td></tr>
                  ) : payments.map((p) => {
                    const statusCfg = STATUS_CFG[p.status] || { label: p.status, bg: 'var(--bg-muted)', color: 'var(--text-secondary)' }
                    return (
                      <tr key={p.id} onMouseEnter={el => el.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                        <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--text-primary)' }}>{p.payment_ref}</td>
                        <td style={tdStyle}>
                          {p.order_id ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-green-faint)', color: '#22c55e', border: '1px solid var(--border)' }}>
                              #{p.order_id} ({p.order_reference || 'Ref'})
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-red-faint)', color: '#ef4444', border: '1px solid var(--border)' }}>
                              <i className="ri-error-warning-line" /> Unreconciled
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>{p.customer_email || '—'}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(p.amount)}</td>
                        <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{p.payment_method || '—'}</td>
                        <td style={tdStyle}>
                          {p.pos_terminal_id ? (
                            <code style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid var(--border)' }}>
                              {p.pos_terminal_id}
                            </code>
                          ) : '—'}
                        </td>
                        <td style={tdStyle}>{fmtD(p.paid_at || p.created_at)}</td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: statusCfg.bg,
                            color: statusCfg.color,
                            border: '1px solid var(--border)',
                          }}>{statusCfg.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {payMeta.pages > 1 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Page {payMeta.page} of {payMeta.pages}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12px', cursor: payPage <= 1 ? 'not-allowed' : 'pointer', opacity: payPage <= 1 ? 0.5 : 1 }} disabled={payPage <= 1} onClick={() => setPayPage(p => p - 1)}>Prev</button>
                  <button style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12px', cursor: payPage >= payMeta.pages ? 'not-allowed' : 'pointer', opacity: payPage >= payMeta.pages ? 0.5 : 1 }} disabled={payPage >= payMeta.pages} onClick={() => setPayPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ========================================================= */
          /* WEBHOOK LOGS TAB                                          */
          /* ========================================================= */
          <>
            {/* Filters */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Incoming Webhook Audit Ledger</span>
              <select style={{ ...inpStyle, width: '150px' }} value={webStatus} onChange={e => setWebStatus(e.target.value)}>
                <option value="all">All Webhooks</option>
                <option value="processed">Processed</option>
                <option value="ignored">Ignored</option>
                <option value="error">Error</option>
              </select>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    <th style={thStyle}>Received At</th>
                    <th style={thStyle}>Event Type</th>
                    <th style={thStyle}>Reference</th>
                    <th style={thStyle}>Signature</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Error Logs</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && webhooks.length === 0 ? (
                    <tr><td colSpan="7" style={{ ...tdStyle, textAlign: 'center', padding: '40px 0' }}>
                      <div className="spinner-border spinner-border-sm text-primary me-2" />Loading webhook audit logs...
                    </td></tr>
                  ) : webhooks.length === 0 ? (
                    <tr><td colSpan="7" style={{ ...tdStyle, textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>No webhook alerts logged.</td></tr>
                  ) : (
                    webhooks.map((log) => {
                      const statusCfg = WEBHOOK_STATUS_CFG[log.status] || { label: log.status, bg: 'var(--bg-muted)', color: 'var(--text-secondary)' }
                      return (
                        <tr key={log.id} onMouseEnter={el => el.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                          <td style={tdStyle}>{fmtD(log.created_at)}</td>
                          <td style={tdStyle}><code style={{ color: '#22c55e', fontWeight: 700 }}>{log.event_type}</code></td>
                          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{log.payment_ref || '—'}</td>
                          <td style={tdStyle}>
                            {log.signature_verified ? (
                              <span style={{ color: '#22c55e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <i className="ri-shield-check-line" /> Verified
                              </span>
                            ) : (
                              <span style={{ color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <i className="ri-shield-cross-line" /> Invalid
                              </span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: statusCfg.bg,
                              color: statusCfg.color,
                              border: '1px solid var(--border)',
                            }}>{statusCfg.label}</span>
                          </td>
                          <td style={{ ...tdStyle, color: '#ef4444', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.error_message || '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <button style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#22c55e', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowPayloadModal(log.payload)}>
                              View Payload
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {webMeta.pages > 1 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Page {webMeta.page} of {webMeta.pages}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12px', cursor: webPage <= 1 ? 'not-allowed' : 'pointer', opacity: webPage <= 1 ? 0.5 : 1 }} disabled={webPage <= 1} onClick={() => setWebPage(p => p - 1)}>Prev</button>
                  <button style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12px', cursor: webPage >= webMeta.pages ? 'not-allowed' : 'pointer', opacity: webPage >= webMeta.pages ? 0.5 : 1 }} disabled={webPage >= webMeta.pages} onClick={() => setWebPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Manual Reconciliation Modal */}
      {showReconcileModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setShowReconcileModal(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '460px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>Manual Payment Reconciliation</span>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowReconcileModal(false)}><i className="ri-close-line" /></button>
            </div>
            <form onSubmit={handleManualReconcile} style={{ padding: '24px' }}>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
                Manually link a transaction reference to an order in Bems Farms database. This updates the order's status to <strong>confirmed</strong>, updates the payment record, and logs the income transaction.
              </p>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Paystack Reference / Transaction ID</label>
                <input type="text" style={inpStyle} placeholder="e.g. 7PV89L0Z" value={manualForm.payment_ref} onChange={e => setManualForm({ ...manualForm, payment_ref: e.target.value })} required />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Order ID (Database Primary Key)</label>
                <input type="number" style={inpStyle} placeholder="e.g. 45" value={manualForm.order_id} onChange={e => setManualForm({ ...manualForm, order_id: e.target.value })} required />
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowReconcileModal(false)}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#1B4332', color: '#fff', fontWeight: 700, cursor: 'pointer' }} disabled={saving}>
                  {saving ? 'Linking...' : 'Link Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JSON Payload Modal */}
      {showPayloadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setShowPayloadModal(null)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '720px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>Webhook Payload Dump</span>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowPayloadModal(null)}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding: '16px', background: '#1e293b', maxHeight: '480px', overflowY: 'auto' }}>
              <pre style={{ fontSize: '11px', margin: 0, fontFamily: 'monospace', color: '#38bdf8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(showPayloadModal, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
