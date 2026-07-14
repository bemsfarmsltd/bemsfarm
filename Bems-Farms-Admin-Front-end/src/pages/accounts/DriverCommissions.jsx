import React, { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

const fmt = n => `₦${Number(n).toLocaleString()}`
const fmtD = s => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'
const ini  = name => (name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

const DRIVER_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899']

const STATUS_CFG = {
  pending: { label:'Pending', bg:'var(--bg-yellow-faint)', color:'#f59e0b' },
  paid:    { label:'Paid',    bg:'var(--bg-green-faint)', color:'#22c55e' },
  approved:{ label:'Approved',bg:'var(--bg-blue-faint)', color:'#3b82f6' },
}

export default function DriverCommissions() {
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [meta, setMeta]               = useState({ total: 0, page: 1, pages: 1 })
  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const [filterSt, setFilterSt]       = useState('all')
  const [selected, setSelected]       = useState(null)  // for pay modal
  const [viewModal, setViewModal]     = useState(null)  // for detail view
  const [generateModal, setGenerateModal] = useState(false)
  const [payNote, setPayNote]         = useState('')
  const [payConfirm, setPayConfirm]   = useState(false)
  const [genForm, setGenForm]         = useState({
    period_from: '',
    period_to: new Date().toISOString().split('T')[0],
  })
  const [editModal, setEditModal]     = useState(null)
  const [editForm, setEditForm]       = useState({ status:'', payment_ref:'' })

  const fetchCommissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/accounts/commissions', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          status: filterSt === 'all' ? undefined : filterSt,
        },
      })
      setCommissions(res.data.commissions || [])
      setMeta({ total: res.data.total, page: res.data.page, pages: res.data.pages })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load commissions')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterSt])

  useEffect(() => { fetchCommissions() }, [fetchCommissions])
  useEffect(() => { setPage(1) }, [search, filterSt])

  const totalUnpaid    = commissions.filter(c => c.status !== 'paid').reduce((s, c) => s + Number(c.net_payout || 0), 0)
  const totalPaid      = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.net_payout || 0), 0)
  const totalDeliveries= commissions.reduce((s, c) => s + Number(c.deliveries || 0), 0)
  const pendingCount   = commissions.filter(c => c.status === 'pending').length

  const handleUpdateCommission = async () => {
    if (!editModal) return
    setSaving(true)
    try {
      await api.patch(`/admin/accounts/commissions/${editModal.id}`, editForm)
      toast.success('Commission updated successfully')
      fetchCommissions()
      setEditModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update commission')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async (commission) => {
    setSaving(true)
    try {
      await api.patch(`/admin/accounts/commissions/${commission.id}`, {
        status: 'paid',
        payment_ref: payNote || `PAY-${Date.now()}`,
      })
      toast.success(`Commission paid to ${commission.driver_name}`)
      fetchCommissions()
      setSelected(null)
      setPayConfirm(false)
      setPayNote('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process payment')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerate = async () => {
    if (!genForm.period_from || !genForm.period_to) return
    setSaving(true)
    try {
      await api.post('/admin/accounts/commissions/generate', genForm)
      toast.success('Commissions generated successfully')
      fetchCommissions()
      setGenerateModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed')
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
      <PageHeader title="Driver Commissions" breadcrumbs={['Accounts', 'Commissions']} />

      {/* KPI strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Unpaid Commissions', val: fmt(totalUnpaid), color: '#d97706', bg: 'var(--bg-yellow-faint)', icon: 'ri-time-line' },
          { label: 'Paid Commissions', val: fmt(totalPaid), color: '#22c55e', bg: 'var(--bg-green-faint)', icon: 'ri-checkbox-circle-line' },
          { label: 'Total Payouts Logged', val: fmt(totalPaid + totalUnpaid), color: '#3b82f6', bg: 'var(--bg-blue-faint)', icon: 'ri-line-chart-line' },
          { label: 'Deliveries Tracked', val: totalDeliveries, color: '#8b5cf6', bg: 'var(--bg-muted)', icon: 'ri-truck-line' },
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

      {/* Table Card */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input style={{ ...inpStyle, width: '220px', paddingLeft: '32px' }} placeholder="Search driver name…" value={search} onChange={e => setSearch(e.target.value)} />
              <i className="ri-search-line" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--text-muted)' }} />
            </div>
            <select style={{ ...inpStyle, width: '150px' }} value={filterSt} onChange={e => setFilterSt(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <button style={btnP} onClick={() => setGenerateModal(true)}>
            <i className="ri-refresh-line" />Generate Commissions
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <th style={thStyle}>Driver</th>
                <th style={thStyle}>Period</th>
                <th style={thStyle}>Deliveries</th>
                <th style={thStyle}>Base Amount</th>
                <th style={thStyle}>Bonus</th>
                <th style={thStyle}>Deductions</th>
                <th style={thStyle}>Net Payout</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0' }}>
                  <div className="spinner-border spinner-border-sm text-primary me-2" />Loading...
                </td></tr>
              ) : commissions.length === 0 ? (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>No commission records found.</td></tr>
              ) : commissions.map((c, i) => {
                const color = DRIVER_COLORS[i % DRIVER_COLORS.length]
                const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending
                return (
                  <tr key={c.id} onMouseEnter={el => el.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '12px', flexShrink: 0 }}>
                          {ini(c.driver_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.driver_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {c.driver_id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtD(c.period_from)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>to {fmtD(c.period_to)}</div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{c.deliveries}</td>
                    <td style={tdStyle}>{fmt(c.base_amount || 0)}</td>
                    <td style={{ ...tdStyle, color: '#22c55e' }}>{Number(c.bonus || 0) > 0 ? `+${fmt(c.bonus)}` : '—'}</td>
                    <td style={{ ...tdStyle, color: '#ef4444' }}>{Number(c.deductions || 0) > 0 ? `−${fmt(c.deductions)}` : '—'}</td>
                    <td style={{ ...tdStyle, fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>{fmt(c.net_payout || 0)}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: cfg.bg,
                        color: cfg.color,
                        border: '1px solid var(--border)',
                      }}>{cfg.label}</span>
                      {c.paid_at && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{fmtD(c.paid_at)}</div>}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#3b82f6', cursor: 'pointer' }} onClick={() => setViewModal(c)} title="View"><i className="ri-eye-line" /></button>
                        {c.status !== 'paid' && (
                          <button style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }} onClick={() => { setSelected(c); setPayConfirm(false); setPayNote('') }}>
                            Pay
                          </button>
                        )}
                        <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => { setEditModal(c); setEditForm({ status: c.status, payment_ref: c.payment_ref || '' }) }} title="Edit"><i className="ri-edit-line" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {!loading && commissions.length > 0 && (
              <tfoot style={{ background: 'var(--bg-hover)' }}>
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={6} style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                    Showing {commissions.length} of {meta.total} records
                  </td>
                  <td colSpan={3} style={{ ...tdStyle, fontSize: '14px', color: 'var(--text-primary)' }}>
                    Total: {fmt(commissions.reduce((s, c) => s + Number(c.net_payout || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Page {meta.page} of {meta.pages}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12px', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12px', cursor: page >= meta.pages ? 'not-allowed' : 'pointer', opacity: page >= meta.pages ? 0.5 : 1 }} disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Pay Out Modal ────────────────────────────────────── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => { setSelected(null); setPayConfirm(false); setPayNote('') }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '460px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>Pay Driver Commission</span>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => { setSelected(null); setPayConfirm(false); setPayNote('') }}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-hover)', marginBottom: '20px', border: '1px solid var(--border)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '16px', flexShrink: 0 }}>
                  {ini(selected.driver_name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selected.driver_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {fmtD(selected.period_from)} – {fmtD(selected.period_to)} · {selected.deliveries} deliveries
                  </div>
                </div>
              </div>

              {[
                { label: 'Base Amount', val: fmt(selected.base_amount || 0) },
                { label: 'Bonus', val: `+${fmt(selected.bonus || 0)}` },
                { label: 'Deductions', val: `−${fmt(selected.deductions || 0)}` },
                { label: 'Net Payout', val: fmt(selected.net_payout || 0), big: true },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', py: '8px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{r.label}</span>
                  <span style={{ fontSize: r.big ? '16px' : '13px', fontWeight: 800, color: r.big ? '#22c55e' : 'var(--text-primary)' }}>{r.val}</span>
                </div>
              ))}

              <div style={{ marginTop: '16px', marginBottom: '24px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Payment Reference (optional)</label>
                <input style={inpStyle} placeholder="e.g. TXN-2026-0099" value={payNote} onChange={e => setPayNote(e.target.value)} />
              </div>

              {!payConfirm ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={() => { setSelected(null); setPayNote('') }}>Cancel</button>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer' }} onClick={() => setPayConfirm(true)}>
                    Pay {fmt(selected.net_payout || 0)}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Confirm payment of <strong>{fmt(selected.net_payout || 0)}</strong> has been processed offline?</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setPayConfirm(false)}>Back</button>
                    <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer' }} onClick={() => handleMarkPaid(selected)}>
                      Confirm Paid
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Generate Commissions Modal ───────────────────────── */}
      {generateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setGenerateModal(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>Generate Commissions</span>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setGenerateModal(false)}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Period From *</label>
                  <input type="date" style={inpStyle} value={genForm.period_from} onChange={e => setGenForm(f => ({ ...f, period_from: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Period To *</label>
                  <input type="date" style={inpStyle} value={genForm.period_to} onChange={e => setGenForm(f => ({ ...f, period_to: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setGenerateModal(false)}>Cancel</button>
                <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#1B4332', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!genForm.period_from || !genForm.period_to || saving) ? 0.7 : 1 }} onClick={handleGenerate} disabled={saving || !genForm.period_from || !genForm.period_to}>
                  {saving ? 'Generating...' : 'Generate Logs'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit/Status Override Modal ─────────────────────── */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setEditModal(null)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>Edit Commission Status</span>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setEditModal(null)}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Status</label>
                <select style={inpStyle} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Payment Reference</label>
                <input style={inpStyle} placeholder="e.g. Offline Cash payout reference" value={editForm.payment_ref} onChange={e => setEditForm(f => ({ ...f, payment_ref: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setEditModal(null)}>Cancel</button>
                <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#1B4332', color: '#fff', fontWeight: 700, cursor: 'pointer' }} onClick={handleUpdateCommission} disabled={saving}>
                  {saving ? 'Saving...' : 'Update status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Details View Modal ───────────────────────────────── */}
      {viewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setViewModal(null)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between' }}>
              <div>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>Commission Summary</span>
                <div style={{ color: '#ffffff', fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{viewModal.driver_name} · ID: {viewModal.driver_id}</div>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setViewModal(null)}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#22c55e', fontFamily: 'Syne, sans-serif' }}>{fmt(viewModal.net_payout || 0)}</div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: STATUS_CFG[viewModal.status]?.bg || 'var(--bg-muted)',
                  color: STATUS_CFG[viewModal.status]?.color || 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  marginTop: '6px',
                }}>{STATUS_CFG[viewModal.status]?.label || viewModal.status}</span>
              </div>
              {[
                { label: 'Driver', val: viewModal.driver_name },
                { label: 'Period From', val: fmtD(viewModal.period_from) },
                { label: 'Period To', val: fmtD(viewModal.period_to) },
                { label: 'Deliveries Done', val: viewModal.deliveries },
                { label: 'Base Earnings', val: fmt(viewModal.base_amount || 0) },
                { label: 'Bonus Addons', val: fmt(viewModal.bonus || 0) },
                { label: 'Deductions (Fines/Losses)', val: fmt(viewModal.deductions || 0) },
                { label: 'Payment Reference', val: viewModal.payment_ref || '—' },
                { label: 'Processed Date', val: viewModal.paid_at ? fmtD(viewModal.paid_at) : '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', py: '8px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{row.val}</span>
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
              }} onClick={() => setViewModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
