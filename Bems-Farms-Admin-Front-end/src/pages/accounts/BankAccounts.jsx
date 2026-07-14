import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

const fmt = n => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const ini = name => (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const BANK_COLORS = {
  'GTBank':       { bg: 'linear-gradient(135deg, #f97316, #ea580c)', text: '#fff' },
  'Access Bank':  { bg: 'linear-gradient(135deg, #e11d48, #be123c)', text: '#fff' },
  'First Bank':   { bg: 'linear-gradient(135deg, #0f172a, #1e3a8a)', text: '#fff' },
  'Zenith Bank':  { bg: 'linear-gradient(135deg, #7c3aed, #5b21b6)', text: '#fff' },
  'UBA':          { bg: 'linear-gradient(135deg, #dc2626, #991b1b)', text: '#fff' },
  'Stanbic IBTC': { bg: 'linear-gradient(135deg, #0284c7, #0369a1)', text: '#fff' },
}

const ACCOUNT_TYPES = [
  { value: 'current', label: 'Current Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'domiciliary', label: 'Domiciliary Account' }
]
const BANKS = ['GTBank', 'Access Bank', 'First Bank', 'Zenith Bank', 'UBA', 'Stanbic IBTC']

const BLANK_FORM = {
  bank_name: 'GTBank',
  account_name: '',
  account_number: '',
  account_type: 'current',
  currency: 'NGN',
  opening_balance: '',
  is_primary: false,
  notes: '',
}

export default function BankAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  
  // Modals state
  const [addModal, setAddModal]   = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  
  // Forms state
  const [form, setForm] = useState({ ...BLANK_FORM })

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/accounts/bank-accounts')
      setAccounts(res.data.bank_accounts || res.data.accounts || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load bank accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.account_name || !form.account_number) {
      toast.error('Account Name and Account Number are required')
      return
    }
    if (form.account_number.length !== 10) {
      toast.error('Nigerian bank account numbers must be 10 digits')
      return
    }
    setSaving(true)
    try {
      await api.post('/admin/accounts/bank-accounts', {
        ...form,
        opening_balance: parseFloat(form.opening_balance) || 0
      })
      toast.success('Bank account added successfully')
      setAddModal(false)
      setForm({ ...BLANK_FORM })
      fetchAccounts()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add bank account')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!form.account_name || !form.account_number) {
      toast.error('Account Name and Account Number are required')
      return
    }
    setSaving(true)
    try {
      await api.patch(`/admin/accounts/bank-accounts/${editModal.id}`, {
        account_name: form.account_name,
        bank_name: form.bank_name,
        account_number: form.account_number,
        account_type: form.account_type,
        is_primary: form.is_primary,
        notes: form.notes,
        status: form.status,
      })
      toast.success('Bank account updated successfully')
      setEditModal(null)
      setForm({ ...BLANK_FORM })
      fetchAccounts()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update bank account')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirmDelete) return
    setSaving(true)
    try {
      await api.delete(`/admin/accounts/bank-accounts/${confirmDelete.id}`)
      toast.success('Bank account deactivated')
      setConfirmDelete(null)
      fetchAccounts()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate account')
    } finally {
      setSaving(false)
    }
  }

  const handleMakePrimary = async (acc) => {
    try {
      await api.patch(`/admin/accounts/bank-accounts/${acc.id}`, {
        is_primary: true
      })
      toast.success(`${acc.bank_name} is now primary`)
      fetchAccounts()
    } catch (err) {
      toast.error('Failed to set primary account')
    }
  }

  // Derived metrics
  const activeAccounts = accounts.filter(a => a.status === 'active')
  const totalBalance   = activeAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0)
  const primaryAccount = activeAccounts.find(a => a.is_primary)
  const totalCredits   = activeAccounts.reduce((sum, a) => sum + Number(a.month_credits || 0), 0)
  const totalDebits    = activeAccounts.reduce((sum, a) => sum + Number(a.month_debits || 0), 0)

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

  const getBankColors = (bankName) => {
    return BANK_COLORS[bankName] || BANK_COLORS['default'] || { bg: 'linear-gradient(135deg, #475569, #334155)', text: '#fff' }
  }

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>
      <PageHeader title="Bank Accounts" breadcrumbs={['Accounts', 'Bank Accounts']} />

      {/* KPI Stats Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Balance (Cash)', val: fmt(totalBalance), color: '#1B4332', bg: 'var(--bg-green-faint)', icon: 'ri-wallet-3-line' },
          { label: 'Primary Account', val: primaryAccount ? `${primaryAccount.bank_name} (${primaryAccount.account_name})` : 'None', color: '#3b82f6', bg: 'var(--bg-blue-faint)', icon: 'ri-bank-line', sub: primaryAccount ? `****${primaryAccount.account_number.slice(-4)}` : '' },
          { label: 'Monthly Credits (Inflow)', val: fmt(totalCredits), color: '#10b981', bg: 'var(--bg-green-faint)', icon: 'ri-arrow-left-down-line' },
          { label: 'Monthly Debits (Outflow)', val: fmt(totalDebits), color: '#ef4444', bg: 'var(--bg-red-faint)', icon: 'ri-arrow-right-up-line' },
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
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{k.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={k.val}>{k.val}</div>
              {k.sub && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>{k.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Stylized Digital Bank Cards Grid */}
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '14px' }}>My Bank Cards</h3>
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div className="spinner-border text-primary" />
        </div>
      ) : activeAccounts.length === 0 ? (
        <div style={{ ...cardStyle, padding: '40px', textAlign: 'center', marginBottom: '24px', color: 'var(--text-light)' }}>
          <i className="ri-bank-card-line" style={{ fontSize: '48px', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }} />
          No active bank accounts. Click "Add Bank Account" to configure one.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '18px',
          marginBottom: '28px'
        }}>
          {activeAccounts.map(acc => {
            const colors = getBankColors(acc.bank_name)
            return (
              <div key={acc.id} style={{
                background: colors.bg,
                color: colors.text,
                borderRadius: '16px',
                padding: '20px',
                height: '170px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'Syne, sans-serif'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{acc.account_type.toUpperCase()} ACCOUNT</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>{acc.bank_name}</div>
                  </div>
                  {acc.is_primary ? (
                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '3px 8px', borderRadius: '50px', fontWeight: 800 }}>PRIMARY</span>
                  ) : (
                    <button style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '50px', fontWeight: 800, cursor: 'pointer' }} onClick={() => handleMakePrimary(acc)}>SET PRIMARY</button>
                  )}
                </div>

                <div style={{ fontSize: '16px', letterSpacing: '2px', fontWeight: 700, margin: '14px 0' }}>
                  {acc.account_number.slice(0,4)} {acc.account_number.slice(4,8)} {acc.account_number.slice(8)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>ACCOUNT NAME</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.account_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>BALANCE</div>
                    <div style={{ fontSize: '16px', fontWeight: 800 }}>{fmt(acc.balance)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bank Accounts Table Details */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', margin: 0 }}>Registered Accounts</h3>
          <button style={btnP} onClick={() => { setForm({ ...BLANK_FORM }); setAddModal(true) }}>
            <i className="ri-add-line" />Add Bank Account
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <th style={thStyle}>Bank & Account Info</th>
                <th style={thStyle}>Type / Currency</th>
                <th style={thStyle}>Opening / Current Bal</th>
                <th style={thStyle}>Total Txns</th>
                <th style={thStyle}>Notes</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0' }}>Loading accounts...</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0' }}>No bank accounts logged.</td></tr>
              ) : accounts.map((acc) => {
                const colorMap = getBankColors(acc.bank_name)
                return (
                  <tr key={acc.id} onMouseEnter={el => el.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: colorMap.bg,
                          color: '#fff',
                          fontWeight: '800',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {ini(acc.bank_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{acc.account_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{acc.bank_name} · No. {acc.account_number}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ACCOUNT_TYPES.find(t => t.value === acc.account_type)?.label || acc.account_type}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Currency: {acc.currency}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(acc.balance)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>Primary: {acc.is_primary ? 'Yes' : 'No'}</div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      {acc.transaction_count || 0}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', fontStyle: 'italic', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {acc.notes || '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: acc.status === 'active' ? 'var(--bg-green-faint)' : 'var(--bg-muted)',
                        color: acc.status === 'active' ? '#10b981' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        textTransform: 'uppercase'
                      }}>{acc.status}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#3b82f6', cursor: 'pointer' }} onClick={() => { setForm({ ...acc }); setEditModal(acc) }} title="Edit"><i className="ri-edit-line" /></button>
                        {acc.status === 'active' && (
                          <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#ef4444', cursor: 'pointer' }} onClick={() => setConfirmDelete(acc)} title="Deactivate"><i className="ri-delete-bin-line" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Bank Account Modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setAddModal(false)}>
          <form style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }} onClick={e => e.stopPropagation()} onSubmit={handleCreate}>
            <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>New Bank Account</span>
              <button type="button" style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setAddModal(false)}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Bank Name *</label>
                <select style={inpStyle} value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account Name *</label>
                <input style={inpStyle} placeholder="e.g. Bems Farms Operations" value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account Number * (10 digits)</label>
                  <input style={inpStyle} maxLength="10" placeholder="0123456789" value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value.replace(/\D/g, '') }))} required />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Currency</label>
                  <input style={inpStyle} placeholder="NGN" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account Type</label>
                  <select style={inpStyle} value={form.account_type} onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}>
                    {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Opening Balance (₦)</label>
                  <input type="number" style={inpStyle} placeholder="0.00" value={form.opening_balance} onChange={e => setForm(f => ({ ...f, opening_balance: e.target.value }))} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Notes</label>
                <textarea style={{ ...inpStyle, height: '60px', resize: 'none' }} placeholder="Optional notes about this account" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.is_primary} onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))} />
                Make this the primary settlement account
              </label>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" style={btnS} onClick={() => setAddModal(false)}>Cancel</button>
                <button type="submit" style={{ ...btnP, flex: 1, justifyContent: 'center' }} disabled={saving}>
                  {saving ? 'Adding...' : 'Add Account'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Edit Bank Account Modal */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setEditModal(null)}>
          <form style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }} onClick={e => e.stopPropagation()} onSubmit={handleUpdate}>
            <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>Edit Bank Account</span>
              <button type="button" style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setEditModal(null)}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Bank Name *</label>
                <select style={inpStyle} value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account Name *</label>
                <input style={inpStyle} value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account Number *</label>
                  <input style={inpStyle} maxLength="10" value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value.replace(/\D/g, '') }))} required />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account Type</label>
                  <select style={inpStyle} value={form.account_type} onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}>
                    {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Status</label>
                  <select style={inpStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={form.is_primary} onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))} />
                    Primary Account
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Notes</label>
                <textarea style={{ ...inpStyle, height: '60px', resize: 'none' }} placeholder="Optional notes about this account" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" style={btnS} onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" style={{ ...btnP, flex: 1, justifyContent: 'center' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Update Account'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#ef4444', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>Deactivate Bank Account</span>
              <button type="button" style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setConfirmDelete(null)}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>
                <i className="ri-alert-line" />
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '24px' }}>
                Are you sure you want to deactivate the account <strong>{confirmDelete.account_name} ({confirmDelete.bank_name})</strong>? This will prevent it from being selected for transactions and transfers.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{ ...btnS, flex: 1 }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', flex: 1 }} onClick={handleDeactivate} disabled={saving}>
                  {saving ? 'Deactivating...' : 'Confirm Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

