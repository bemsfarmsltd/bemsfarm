import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

const fmt  = n => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtD = s => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'

const REASONS = [
  'Payroll Funding', 'Tax Reserve Top-up', 'Supplier Payment', 'Operational Expenses',
  'POS Settlement Reconciliation', 'Driver Allowance', 'Emergency Fund', 'Other'
]

const STATUS_CFG = {
  completed: { label: 'Completed', color: '#10b981', bg: 'var(--bg-green-faint)', icon: 'ri-checkbox-circle-line' },
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'var(--bg-yellow-faint)', icon: 'ri-time-line' },
  failed:    { label: 'Failed',    color: '#ef4444', bg: 'var(--bg-red-faint)', icon: 'ri-close-circle-line' },
  cancelled: { label: 'Cancelled', color: 'var(--text-muted)', bg: 'var(--bg-muted)', icon: 'ri-forbid-2-line' },
}

const BLANK_FORM = {
  from_account_id: '',
  to_account_id: '',
  amount: '',
  fee: 0,
  description: REASONS[0],
  date: new Date().toISOString().split('T')[0],
}

export default function MoneyTransfer() {
  const [transfers, setTransfers] = useState([])
  const [accounts, setAccounts]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [meta, setMeta]           = useState({ total: 0, page: 1, pages: 1 })
  const [page, setPage]           = useState(1)

  // Modal toggle
  const [transferModal, setTransferModal] = useState(false)
  const [viewModal, setViewModal]         = useState(null)
  
  // Form state
  const [form, setForm] = useState({ ...BLANK_FORM })

  const fetchTransfers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/accounts/transfers', {
        params: { page, limit: 15 }
      })
      setTransfers(res.data.transfers || [])
      setMeta({ total: res.data.total, page: res.data.page, pages: res.data.pages })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load money transfers')
    } finally {
      setLoading(false)
    }
  }, [page])

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get('/admin/accounts/bank-accounts')
      setAccounts(res.data.bank_accounts || res.data.accounts || [])
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleCreateTransfer = async (e) => {
    e.preventDefault()
    
    const amountVal = parseFloat(form.amount)
    const feeVal = parseFloat(form.fee) || 0

    if (!form.from_account_id || !form.to_account_id) {
      toast.error('Please select both source and destination accounts')
      return
    }
    if (form.from_account_id === form.to_account_id) {
      toast.error('Source and destination accounts must be different')
      return
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    // Check balance
    const sourceAcc = accounts.find(a => a.id === parseInt(form.from_account_id))
    if (!sourceAcc) {
      toast.error('Source account not found')
      return
    }
    const currentBalance = parseFloat(sourceAcc.balance) || 0
    const totalDeduction = amountVal + feeVal
    if (currentBalance < totalDeduction) {
      toast.error(`Insufficient funds. Available: ${fmt(currentBalance)}. Required: ${fmt(totalDeduction)}`)
      return
    }

    setSaving(true)
    try {
      await api.post('/admin/accounts/transfers', {
        from_account_id: parseInt(form.from_account_id),
        to_account_id: parseInt(form.to_account_id),
        amount: amountVal,
        fee: feeVal,
        description: form.description,
        date: form.date,
      })
      toast.success('Money transfer processed successfully')
      setTransferModal(false)
      setForm({ ...BLANK_FORM })
      fetchTransfers()
      fetchAccounts() // Refresh balances
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to execute transfer')
    } finally {
      setSaving(false)
    }
  }

  // Derived metrics
  const activeAccounts = accounts.filter(a => a.status === 'active')
  const totalTransferred = transfers.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const totalFees = transfers.reduce((sum, t) => sum + Number(t.fee || 0), 0)

  // Form selections source-destination filtering
  const destAccounts = activeAccounts.filter(a => a.id !== parseInt(form.from_account_id))

  // Styling helpers
  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-card)',
    overflow: 'hidden',
  }

  const inpStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
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

  const btnS = {
    background: 'var(--bg-muted)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'Nunito, sans-serif',
    fontWeight: 700,
    fontSize: '13px',
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
      <PageHeader title="Money Transfer" breadcrumbs={['Accounts', 'Money Transfer']} />

      {/* KPI Stats Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Volume Transferred', val: fmt(totalTransferred), color: '#3b82f6', bg: 'var(--bg-blue-faint)', icon: 'ri-exchange-funds-line' },
          { label: 'Total Transfer Fees Paid', val: fmt(totalFees), color: '#ef4444', bg: 'var(--bg-red-faint)', icon: 'ri-refund-line' },
          { label: 'Total Transfers Tracked', val: meta.total, color: '#8b5cf6', bg: 'var(--bg-muted)', icon: 'ri-list-check-3' },
          { label: 'Available Cash Accounts', val: activeAccounts.length, color: '#10b981', bg: 'var(--bg-green-faint)', icon: 'ri-bank-line' },
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

      {/* Main Card holding table and pagination */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', margin: 0 }}>Transfer History</h3>
          <button style={btnP} onClick={() => { setForm({ ...BLANK_FORM }); setTransferModal(true) }}>
            <i className="ri-exchange-line" />New Transfer
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <th style={thStyle}>Reference / Date</th>
                <th style={thStyle}>From Account</th>
                <th style={thStyle}>To Account</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Bank Fee</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0' }}>Loading transfers...</td></tr>
              ) : transfers.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0' }}>No money transfers found.</td></tr>
              ) : transfers.map((trf) => {
                const status = STATUS_CFG[trf.status] || STATUS_CFG.completed
                return (
                  <tr key={trf.id} onMouseEnter={el => el.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{trf.reference}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtD(trf.date)}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trf.from_account}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{trf.from_bank}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trf.to_account}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{trf.to_bank}</div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                      {fmt(trf.amount)}
                    </td>
                    <td style={{ ...tdStyle, color: '#ef4444' }}>
                      {trf.fee > 0 ? fmt(trf.fee) : '—'}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={trf.description}>
                      {trf.description || '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: status.bg,
                        color: status.color,
                        border: '1px solid var(--border)',
                      }}>
                        <i className={status.icon} />
                        {status.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#3b82f6', cursor: 'pointer' }} onClick={() => setViewModal(trf)} title="View Summary">
                        <i className="ri-eye-line" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Panel */}
        {meta.pages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Page {meta.page} of {meta.pages}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12px', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12px', cursor: page >= meta.pages ? 'not-allowed' : 'pointer', opacity: page >= meta.pages ? 0.5 : 1 }} disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* New Money Transfer Modal */}
      {transferModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setTransferModal(false)}>
          <form style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '460px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }} onClick={e => e.stopPropagation()} onSubmit={handleCreateTransfer}>
            <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>New Money Transfer</span>
              <button type="button" style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setTransferModal(false)}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>From Account (Source) *</label>
                <select style={inpStyle} value={form.from_account_id} onChange={e => setForm(f => ({ ...f, from_account_id: e.target.value, to_account_id: '' }))} required>
                  <option value="">Select source account</option>
                  {activeAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name} ({fmt(a.balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>To Account (Destination) *</label>
                <select style={inpStyle} value={form.to_account_id} onChange={e => setForm(f => ({ ...f, to_account_id: e.target.value }))} required disabled={!form.from_account_id}>
                  <option value="">Select destination account</option>
                  {destAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name} ({fmt(a.balance)})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Amount (₦) *</label>
                  <input type="number" step="0.01" style={inpStyle} placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Transfer Fee (₦)</label>
                  <input type="number" step="0.01" style={inpStyle} placeholder="0.00" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Transfer Date *</label>
                  <input type="date" style={inpStyle} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Description Category *</label>
                  <select style={inpStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Live validation summary */}
              {form.from_account_id && form.amount && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  fontSize: '11.5px',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Transfer Value:</span>
                    <span>{fmt(parseFloat(form.amount) || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Bank Fee:</span>
                    <span>{fmt(parseFloat(form.fee) || 0)}</span>
                  </div>
                  <hr style={{ margin: '4px 0', borderColor: 'var(--border)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span>Total Deduction:</span>
                    <span>{fmt((parseFloat(form.amount) || 0) + (parseFloat(form.fee) || 0))}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" style={btnS} onClick={() => setTransferModal(false)}>Cancel</button>
                <button type="submit" style={{ ...btnP, flex: 1, justifyContent: 'center' }} disabled={saving}>
                  {saving ? 'Processing...' : 'Execute Transfer'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* View Transfer Summary Modal */}
      {viewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setViewModal(null)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>Transfer Receipt</span>
                <div style={{ color: '#ffffff', fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>Ref: {viewModal.reference}</div>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setViewModal(null)}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>{fmt(viewModal.amount || 0)}</div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: STATUS_CFG[viewModal.status]?.bg || 'var(--bg-green-faint)',
                  color: STATUS_CFG[viewModal.status]?.color || '#10b981',
                  border: '1px solid var(--border)',
                  marginTop: '6px',
                }}>
                  <i className={STATUS_CFG[viewModal.status]?.icon || 'ri-checkbox-circle-line'} style={{ marginRight: '4px' }} />
                  {STATUS_CFG[viewModal.status]?.label || viewModal.status}
                </span>
              </div>
              {[
                { label: 'Date Processed', val: fmtD(viewModal.date) },
                { label: 'Source Bank', val: viewModal.from_bank },
                { label: 'Source Account', val: viewModal.from_account },
                { label: 'Destination Bank', val: viewModal.to_bank },
                { label: 'Destination Account', val: viewModal.to_account },
                { label: 'Transfer Fee', val: fmt(viewModal.fee || 0) },
                { label: 'Total Cost', val: fmt(Number(viewModal.amount) + Number(viewModal.fee || 0)) },
                { label: 'Category/Reason', val: viewModal.description || '—' },
                { label: 'Created By', val: viewModal.created_by_name || 'System / Admin' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>{row.val}</span>
                </div>
              ))}
              <button style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-muted)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '24px'
              }} onClick={() => setViewModal(null)}>Close Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

