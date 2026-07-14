import React, { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

const fmt = n => `₦${Number(n).toLocaleString()}`

const TYPE_CFG = {
  credit:  { label:'Credit',  cls:'success', icon:'ri-arrow-up-circle-line'   },
  debit:   { label:'Debit',   cls:'danger',  icon:'ri-arrow-down-circle-line' },
  income:  { label:'Income',  cls:'success', icon:'ri-arrow-up-circle-line'   },
  expense: { label:'Expense', cls:'danger',  icon:'ri-arrow-down-circle-line' },
}

const BLANK_FILTERS = {
  search: '', type: 'all', dateFrom: '', dateTo: '', bankAccountId: ''
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(false)
  const [meta, setMeta]                 = useState({ total: 0, page: 1, pages: 1 })
  const [page, setPage]                 = useState(1)
  const [search, setSearch]             = useState('')
  const [filterType, setType]           = useState('all')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [bankAccountId, setBankAccId]   = useState('')
  const [bankAccounts, setBankAccounts] = useState([])
  const [selected, setSelected]         = useState(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/accounts/transactions', {
        params: {
          page,
          limit: 25,
          type: filterType === 'all' ? undefined : filterType,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          bank_account_id: bankAccountId || undefined,
          search: search || undefined,
        },
      })
      setTransactions(res.data.transactions || [])
      setMeta({ total: res.data.total, page: res.data.page, pages: res.data.pages })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [page, filterType, dateFrom, dateTo, bankAccountId, search])

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await api.get('/admin/accounts/bank-accounts')
      setBankAccounts(res.data.bank_accounts || res.data.accounts || [])
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])
  useEffect(() => { fetchBankAccounts() }, [fetchBankAccounts])
  useEffect(() => { setPage(1) }, [filterType, dateFrom, dateTo, bankAccountId, search])

  const clearFilters = () => {
    setSearch(''); setType('all'); setDateFrom(''); setDateTo(''); setBankAccId('')
  }

  const totalIn  = transactions.filter(t => Number(t.amount) > 0 || t.type === 'credit').reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalOut = transactions.filter(t => Number(t.amount) < 0 || t.type === 'debit').reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0)
  const netFlow  = totalIn - totalOut
  const pending  = transactions.filter(t => t.status === 'pending').length

  const getTypeConfig = (t) => {
    if (t.type === 'credit') return TYPE_CFG.credit
    if (t.type === 'debit')  return TYPE_CFG.debit
    return TYPE_CFG[t.type] || TYPE_CFG.credit
  }

  const isCredit = (t) => t.type === 'credit' || Number(t.amount) > 0

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-card)',
    overflow: 'hidden',
  }

  const inpStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
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
      <PageHeader title="Transactions" breadcrumbs={['Accounts', 'Transactions']} />

      {/* KPI strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Inflow', val: fmt(totalIn), color: '#22c55e', bg: 'var(--bg-green-faint)', icon: 'ri-arrow-up-circle-line' },
          { label: 'Total Outflow', val: fmt(totalOut), color: '#ef4444', bg: 'var(--bg-red-faint)', icon: 'ri-arrow-down-circle-line' },
          { label: 'Net Flow', val: `${netFlow >= 0 ? '' : '-'}${fmt(Math.abs(netFlow))}`, color: '#3b82f6', bg: 'var(--bg-blue-faint)', icon: 'ri-line-chart-line' },
          { label: 'Total Records', val: meta.total, color: '#8b5cf6', bg: 'var(--bg-muted)', icon: 'ri-list-check-3' },
          { label: 'Pending', val: pending, color: '#d97706', bg: 'var(--bg-yellow-faint)', icon: 'ri-time-line' },
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

      {/* Filters Card */}
      <div style={{ ...cardStyle, marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Search</label>
            <input type="text" style={inpStyle} placeholder="Search desc, ref…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Type</label>
            <select style={inpStyle} value={filterType} onChange={e => setType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account</label>
            <select style={inpStyle} value={bankAccountId} onChange={e => setBankAccId(e.target.value)}>
              <option value="">All Accounts</option>
              {bankAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.bank_name} — ****{(a.account_number || '').slice(-4)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>From</label>
            <input type="date" style={inpStyle} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>To</label>
            <input type="date" style={inpStyle} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div>
            <button style={{
              width: '100%',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-muted)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }} onClick={clearFilters}>Clear</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {[
          { key: 'all', label: 'All Transactions' },
          { key: 'credit', label: 'Credits Only', icon: 'ri-arrow-up-circle-line', bg: 'var(--bg-green-faint)', color: '#22c55e' },
          { key: 'debit', label: 'Debits Only', icon: 'ri-arrow-down-circle-line', bg: 'var(--bg-red-faint)', color: '#ef4444' },
        ].map(t => {
          const active = filterType === t.key
          return (
            <button key={t.key} onClick={() => setType(t.key)}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '6px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: active ? '#1B4332' : 'var(--bg-card)',
                color: active ? '#ffffff' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
              }}>
              {t.icon && <i className={`${t.icon} me-1`} style={{ color: active ? '#ffffff' : t.color }} />}
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{meta.total} records found</span>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            <span style={{ color: '#22c55e', fontWeight: 600 }}>In: {fmt(totalIn)}</span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>Out: {fmt(totalOut)}</span>
            <span style={{ color: netFlow >= 0 ? '#22c55e' : '#ef4444', fontWeight: 800 }}>Net: {fmt(netFlow)}</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <th style={thStyle}>Date / Ref</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Account</th>
                <th style={thStyle}>Method</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Balance</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0' }}>
                  <div className="spinner-border spinner-border-sm text-primary me-2" />Loading...
                </td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>No transactions match your filters.</td></tr>
              ) : transactions.map(t => {
                const credit = isCredit(t)
                const tc = getTypeConfig(t)
                const amount = Number(t.amount || 0)
                return (
                  <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.date ? new Date(t.date).toLocaleDateString('en-GB') : '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.reference}</div>
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
                        background: credit ? 'var(--bg-green-faint)' : 'var(--bg-red-faint)',
                        color: credit ? '#22c55e' : '#ef4444',
                        border: `1px solid var(--border)`,
                      }}>
                        <i className={tc.icon} style={{ fontSize: '11px' }} />{tc.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description}
                    </td>
                    <td style={tdStyle}>
                      {bankAccounts.find(a => a.id === t.bank_account_id)?.bank_name || t.bank_account_id || '—'}
                    </td>
                    <td style={tdStyle}>
                      {t.payment_method || '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: credit ? '#22c55e' : '#ef4444', fontSize: '14px' }}>
                      {credit ? '+' : '-'}{fmt(Math.abs(amount))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {t.balance_after != null ? fmt(t.balance_after) : '—'}
                    </td>
                    <td style={tdStyle}>
                      <button style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }} onClick={() => setSelected(t)}>
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Page {meta.page} of {meta.pages}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
              }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: page >= meta.pages ? 'not-allowed' : 'pointer',
                opacity: page >= meta.pages ? 0.5 : 1,
              }} disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setSelected(null)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>Transaction Detail</div>
              <button style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setSelected(null)}>
                <i className="ri-close-line" />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Amount hero */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                {(() => {
                  const credit = isCredit(selected)
                  const tc = getTypeConfig(selected)
                  return (
                    <>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        margin: '0 auto 12px',
                        background: credit ? 'var(--bg-green-faint)' : 'var(--bg-red-faint)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <i className={tc.icon} style={{ fontSize: '28px', color: credit ? '#22c55e' : '#ef4444' }} />
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: credit ? '#22c55e' : '#ef4444', fontFamily: 'Syne, sans-serif' }}>
                        {credit ? '+' : '-'}{fmt(Math.abs(Number(selected.amount || 0)))}
                      </div>
                    </>
                  )
                })()}
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>{selected.description}</div>
              </div>

              {/* Detail rows */}
              {[
                { label: 'Reference', val: selected.reference },
                { label: 'Transaction ID', val: selected.id },
                { label: 'Date', val: selected.date ? new Date(selected.date).toLocaleDateString('en-GB') : '—' },
                { label: 'Type', val: selected.type },
                { label: 'Source', val: selected.source_type || '—' },
                { label: 'Payment Method', val: selected.payment_method || '—' },
                { label: 'Balance After', val: selected.balance_after != null ? fmt(selected.balance_after) : '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{row.val}</span>
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
              }} onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
