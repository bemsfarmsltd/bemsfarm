import React, { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

const fmt  = n => `₦${Number(n).toLocaleString()}`
const fmtD = s => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'

const CATEGORIES  = ['Sales', 'Wallet Top-up', 'Delivery Fee', 'Corporate Supply', 'POS Sale', 'Refund Recovery', 'Other']
const PAY_METHODS = ['Paystack', 'Bank Transfer', 'Cash', 'POS Terminal', 'Wallet', 'USSD']

const BLANK_FORM = {
  date: new Date().toISOString().split('T')[0],
  reference: '', source: '', category: 'Sales', payment_method: 'Paystack',
  status: 'paid', amount: '', description: '', notes: '', bank_account_id: '', currency: 'NGN',
}

const STATUS_CFG = {
  paid:    { label:'Paid',    bg:'var(--bg-green-faint)', color:'#22c55e' },
  pending: { label:'Pending', bg:'var(--bg-yellow-faint)', color:'#f59e0b' },
  failed:  { label:'Failed',  bg:'var(--bg-red-faint)', color:'#ef4444' },
}

const CAT_COLORS = {
  'Sales':'#3b82f6','Wallet Top-up':'#8b5cf6','Delivery Fee':'#f59e0b',
  'Corporate Supply':'#22c55e','POS Sale':'#0ea5e9','Refund Recovery':'#ec4899','Other':'#94a3b8',
}

export default function Income() {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [meta, setMeta]         = useState({ total: 0, page: 1, pages: 1 })
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [filterCat, setFiltCat] = useState('all')
  const [filterSt,  setFiltSt]  = useState('all')
  const [activeModal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(BLANK_FORM)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/accounts/income', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          category: filterCat === 'all' ? undefined : filterCat,
          status: filterSt === 'all' ? undefined : filterSt,
        },
      })
      setRecords(res.data.income || [])
      setMeta({ total: res.data.total, page: res.data.page, pages: res.data.pages })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load income records')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterCat, filterSt])

  useEffect(() => { fetchRecords() }, [fetchRecords])
  useEffect(() => { setPage(1) }, [search, filterCat, filterSt])

  const closeModal = () => { setModal(null); setSelected(null); setForm(BLANK_FORM) }

  const openView   = r => { setSelected(r); setModal('view') }
  const openEdit   = r => {
    setSelected(r)
    setForm({
      date: r.date?.split('T')[0] || r.date || '',
      reference: r.reference || '',
      source: r.source || '',
      category: r.category || 'Sales',
      payment_method: r.payment_method || 'Paystack',
      status: r.status || 'paid',
      amount: r.amount || '',
      description: r.description || '',
      notes: r.notes || '',
      bank_account_id: r.bank_account_id || '',
      currency: r.currency || 'NGN',
    })
    setModal('edit')
  }
  const openDelete = r => { setSelected(r); setModal('delete') }
  const openAdd    = () => { setForm({ ...BLANK_FORM }); setModal('add') }

  const saveRecord = async () => {
    if (!form.source || !form.amount) return
    setSaving(true)
    try {
      if (activeModal === 'add') {
        await api.post('/admin/accounts/income', form)
        toast.success('Income record created successfully')
      } else {
        await api.patch(`/admin/accounts/income/${selected.id}`, form)
        toast.success('Income record updated successfully')
      }
      fetchRecords()
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save record')
    } finally {
      setSaving(false)
    }
  }

  const deleteRecord = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api.delete(`/admin/accounts/income/${selected.id}`)
      toast.success('Income record deleted successfully')
      fetchRecords()
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record')
    } finally {
      setSaving(false)
    }
  }

  // Categories breakdown stats based on loaded page records
  const breakdown = records.reduce((acc, r) => {
    if (r.status === 'paid') {
      acc[r.category] = (acc[r.category] || 0) + Number(r.amount || 0)
    }
    return acc
  }, {})

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
      <PageHeader title="Income & Sales Ledger" breadcrumbs={['Accounts', 'Income']} />

      {/* Categories summary strip */}
      <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', marginBottom: '12px' }}>
          Category Inflow Breakdown (This Page)
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {Object.keys(breakdown).length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No categorized paid income on this page yet.</span>
          ) : (
            Object.entries(breakdown).map(([cat, val]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', background: 'var(--bg-hover)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: CAT_COLORS[cat] || '#94a3b8' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{cat}:</span>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700 }}>{fmt(val)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input style={{ ...inpStyle, width: '220px', paddingLeft: '32px' }} placeholder="Search source, ref, ID…" value={search} onChange={e => setSearch(e.target.value)} />
              <i className="ri-search-line" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--text-muted)' }} />
            </div>
            <select style={{ ...inpStyle, width: '150px' }} value={filterCat} onChange={e => setFiltCat(e.target.value)}>
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select style={{ ...inpStyle, width: '130px' }} value={filterSt} onChange={e => setFiltSt(e.target.value)}>
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <button style={btnP} onClick={openAdd}>
            <i className="ri-add-line" />Add Income
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <th style={thStyle}>Date / Ref</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Method</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0' }}>
                  <div className="spinner-border spinner-border-sm text-primary me-2" />Loading...
                </td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>No income records found.</td></tr>
              ) : records.map(r => (
                <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmtD(r.date)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.reference || r.id}</div>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{r.source}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: CAT_COLORS[r.category] || '#94a3b8' }} />
                      <span>{r.category}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-primary)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                      {r.payment_method}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.description || '—'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: STATUS_CFG[r.status]?.bg || 'var(--bg-muted)',
                      color: STATUS_CFG[r.status]?.color || 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}>
                      {STATUS_CFG[r.status]?.label || r.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#22c55e', fontSize: '14px' }}>
                    +{fmt(r.amount)}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#3b82f6', cursor: 'pointer' }} onClick={() => openView(r)} title="View"><i className="ri-eye-line" /></button>
                      <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => openEdit(r)} title="Edit"><i className="ri-edit-line" /></button>
                      <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#ef4444', cursor: 'pointer' }} onClick={() => openDelete(r)} title="Delete"><i className="ri-delete-bin-line" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {!loading && records.length > 0 && (
              <tfoot style={{ background: 'var(--bg-hover)' }}>
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={6} style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                    Showing {records.length} of {meta.total} records
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#22c55e', fontSize: '14px' }}>
                    +{fmt(records.filter(r=>r.status==='paid').reduce((s,r)=>s+Number(r.amount||0),0))}
                  </td>
                  <td style={tdStyle} />
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

      {/* ── MODALS ─────────────────────────────────────────── */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>

          {/* VIEW */}
          {activeModal === 'view' && selected && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '460px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>
              <div style={{ background: '#1B4332', padding: '18px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}><i className="ri-arrow-up-circle-line me-2" />Income Record</div>
                  <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>{selected.id} · {fmtD(selected.date)}</div>
                </div>
                <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontWeight: 800, color: '#22c55e', fontSize: '28px', fontFamily: 'Syne, sans-serif' }}>+{fmt(selected.amount)}</div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: STATUS_CFG[selected.status]?.bg || 'var(--bg-muted)',
                    color: STATUS_CFG[selected.status]?.color || 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    marginTop: '6px',
                  }}>
                    {STATUS_CFG[selected.status]?.label}
                  </span>
                </div>
                {[
                  ['Reference', selected.reference || selected.id],
                  ['Source', selected.source],
                  ['Category', selected.category],
                  ['Payment Method', selected.payment_method],
                  ['Description', selected.description || '—'],
                  ['Date', fmtD(selected.date)],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', py: '8px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{lbl}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{val}</span>
                  </div>
                ))}
                {selected.notes && (
                  <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px' }}>
                    <i className="ri-sticky-note-line me-1" />{selected.notes}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={closeModal}>Close</button>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#1B4332', color: '#fff', fontWeight: 700, cursor: 'pointer' }} onClick={() => { closeModal(); openEdit(selected) }}>Edit</button>
                </div>
              </div>
            </div>
          )}

          {/* ADD / EDIT */}
          {(activeModal === 'add' || activeModal === 'edit') && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal)' }}>
              <div style={{ background: '#1B4332', padding: '18px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>
                  <i className={`${activeModal === 'add' ? 'ri-add-circle-line' : 'ri-edit-line'} me-2`} />
                  {activeModal === 'add' ? 'Add Income Record' : 'Edit Income Record'}
                </div>
                <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Date *</label>
                    <input type="date" style={inpStyle} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Reference / Order ID</label>
                    <input style={inpStyle} placeholder="e.g. ORD-2026-0141" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Source *</label>
                  <input style={inpStyle} placeholder="Customer name or income source" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Category</label>
                    <select style={inpStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Payment Method</label>
                    <select style={inpStyle} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                      {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Status</label>
                    <select style={inpStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Currency</label>
                    <select style={inpStyle} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Amount (₦) *</label>
                  <input style={inpStyle} type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Description</label>
                  <input style={inpStyle} placeholder="Brief description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Notes</label>
                  <textarea style={{ ...inpStyle, resize: 'vertical', minHeight: '60px' }} rows={2} placeholder="Optional note…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#1B4332', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (saving || !form.source || !form.amount) ? 0.7 : 1 }} onClick={saveRecord} disabled={saving || !form.source || !form.amount}>
                    {saving ? 'Saving...' : 'Save Record'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DELETE */}
          {activeModal === 'delete' && selected && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: 'var(--shadow-modal)' }}>
              <div style={{ background: '#7f1d1d', padding: '18px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}><i className="ri-delete-bin-line me-2" />Delete Record</div>
                <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-red-faint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <i className="ri-arrow-up-circle-line fs-24 text-danger" style={{ color: '#ef4444', fontSize: '24px' }} />
                </div>
                <h5 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Delete this income record?</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '24px' }}>
                  <strong>{selected.id}</strong> — {selected.source} — <strong>{fmt(selected.amount)}</strong><br />
                  This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }} onClick={deleteRecord} disabled={saving}>
                    {saving ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
