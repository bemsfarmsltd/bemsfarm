import React, { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

const fmt  = n => `₦${Number(n).toLocaleString()}`
const fmtD = s => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'

const CATEGORIES  = ['Staff Salary','Fuel & Transport','Packaging Materials','Utilities','Cold Storage',
  'Vehicle Maintenance','Produce Purchase','Marketing','Office Rent','Software & IT','Security','Other']
const PAY_METHODS = ['Bank Transfer','Cash','POS Terminal','Online']

const BLANK_FORM = {
  date: new Date().toISOString().split('T')[0],
  description: '', category: 'Staff Salary', payment_method: 'Bank Transfer',
  supplier_name: '', status: 'pending', amount: '', notes: '', due_date: '', bank_account_id: '', currency: 'NGN',
}

const STATUS_CFG = {
  paid:     { label:'Paid',     bg:'var(--bg-green-faint)', color:'#22c55e' },
  pending:  { label:'Pending',  bg:'var(--bg-yellow-faint)', color:'#f59e0b' },
  approved: { label:'Approved', bg:'var(--bg-blue-faint)', color:'#3b82f6' },
  rejected: { label:'Rejected', bg:'var(--bg-red-faint)', color:'#ef4444' },
}

const CAT_COLORS = {
  'Staff Salary':'#3b82f6','Fuel & Transport':'#f59e0b','Packaging Materials':'#8b5cf6',
  'Utilities':'#0ea5e9','Cold Storage':'#06b6d4','Vehicle Maintenance':'#f97316',
  'Produce Purchase':'#22c55e','Marketing':'#ec4899','Office Rent':'#6366f1',
  'Software & IT':'#64748b','Security':'#ef4444','Other':'#94a3b8',
}

export default function Expenses() {
  const [expenses, setExpenses]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [meta, setMeta]             = useState({ total: 0, page: 1, pages: 1 })
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [filterCat, setFiltCat]     = useState('all')
  const [filterSt,  setFiltSt]      = useState('all')
  const [activeModal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]             = useState(BLANK_FORM)
  const [rejectReason, setRejectReason] = useState('')

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/accounts/expenses', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          category: filterCat === 'all' ? undefined : filterCat,
          status: filterSt === 'all' ? undefined : filterSt,
        },
      })
      setExpenses(res.data.expenses || [])
      setMeta({ total: res.data.total, page: res.data.page, pages: res.data.pages })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterCat, filterSt])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])
  useEffect(() => { setPage(1) }, [search, filterCat, filterSt])

  const closeModal = () => { setModal(null); setSelected(null); setForm(BLANK_FORM); setRejectReason('') }

  const openView    = e => { setSelected(e); setModal('view') }
  const openEdit    = e => {
    setSelected(e)
    setForm({
      date: e.date?.split('T')[0] || '',
      description: e.description || '',
      category: e.category || 'Staff Salary',
      payment_method: e.payment_method || 'Bank Transfer',
      supplier_name: e.supplier_name || '',
      status: e.status || 'pending',
      amount: e.amount || '',
      notes: e.notes || '',
      due_date: e.due_date?.split('T')[0] || '',
      bank_account_id: e.bank_account_id || '',
      currency: e.currency || 'NGN',
    })
    setModal('edit')
  }
  const openDelete  = e => { setSelected(e); setModal('delete') }
  const openApprove = e => { setSelected(e); setModal('approve') }
  const openReject  = e => { setSelected(e); setModal('reject') }
  const openAdd     = () => { setForm({ ...BLANK_FORM }); setModal('add') }

  const saveExpense = async () => {
    if (!form.description || !form.amount) return
    setSaving(true)
    try {
      if (activeModal === 'add') {
        await api.post('/admin/accounts/expenses', form)
        toast.success('Expense record created successfully')
      } else {
        await api.patch(`/admin/accounts/expenses/${selected.id}`, form)
        toast.success('Expense record updated successfully')
      }
      fetchExpenses()
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  const approveExpense = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api.patch(`/admin/accounts/expenses/${selected.id}/approve`)
      toast.success('Expense approved successfully')
      fetchExpenses()
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve expense')
    } finally {
      setSaving(false)
    }
  }

  const rejectExpense = async () => {
    if (!selected || !rejectReason) return
    setSaving(true)
    try {
      await api.patch(`/admin/accounts/expenses/${selected.id}/reject`, { reason: rejectReason })
      toast.success('Expense rejected')
      fetchExpenses()
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject expense')
    } finally {
      setSaving(false)
    }
  }

  const markPaid = async (e) => {
    setLoading(true)
    try {
      await api.patch(`/admin/accounts/expenses/${e.id}/pay`)
      toast.success('Expense marked as Paid')
      fetchExpenses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as paid')
    } finally {
      setLoading(false)
    }
  }

  const deleteExpense = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api.delete(`/admin/accounts/expenses/${selected.id}`)
      toast.success('Expense deleted successfully')
      fetchExpenses()
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense')
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
      <PageHeader title="Expense Ledgers" breadcrumbs={['Accounts', 'Expenses']} />

      {/* Table Card */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input style={{ ...inpStyle, width: '220px', paddingLeft: '32px' }} placeholder="Search description, supplier…" value={search} onChange={e => setSearch(e.target.value)} />
              <i className="ri-search-line" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--text-muted)' }} />
            </div>
            <select style={{ ...inpStyle, width: '150px' }} value={filterCat} onChange={e => setFiltCat(e.target.value)}>
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select style={{ ...inpStyle, width: '130px' }} value={filterSt} onChange={e => setFiltSt(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button style={btnP} onClick={openAdd}>
            <i className="ri-add-line" />Add Expense
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <th style={thStyle}>Date / Ref</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Method</th>
                <th style={thStyle}>Supplier</th>
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
              ) : expenses.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>No expense records found.</td></tr>
              ) : expenses.map(e => (
                <tr key={e.id} onMouseEnter={el => el.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmtD(e.date)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{e.reference || e.id}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.description}</div>
                    {e.notes && <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes}</div>}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: CAT_COLORS[e.category] || '#94a3b8' }} />
                      <span>{e.category}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-primary)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                      {e.payment_method}
                    </span>
                  </td>
                  <td style={tdStyle}>{e.supplier_name || '—'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: STATUS_CFG[e.status]?.bg || 'var(--bg-muted)',
                      color: STATUS_CFG[e.status]?.color || 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}>
                      {STATUS_CFG[e.status]?.label}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#ef4444', fontSize: '14px' }}>
                    −{fmt(e.amount)}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#3b82f6', cursor: 'pointer' }} onClick={() => openView(e)} title="View"><i className="ri-eye-line" /></button>
                      {e.status === 'pending' && (
                        <>
                          <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#22c55e', cursor: 'pointer' }} onClick={() => openApprove(e)} title="Approve"><i className="ri-check-line" /></button>
                          <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#ef4444', cursor: 'pointer' }} onClick={() => openReject(e)} title="Reject"><i className="ri-close-line" /></button>
                        </>
                      )}
                      {e.status === 'approved' && (
                        <button style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }} onClick={() => markPaid(e)}>Mark Paid</button>
                      )}
                      <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => openEdit(e)} title="Edit"><i className="ri-edit-line" /></button>
                      <button style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#ef4444', cursor: 'pointer' }} onClick={() => openDelete(e)} title="Delete"><i className="ri-delete-bin-line" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {!loading && expenses.length > 0 && (
              <tfoot style={{ background: 'var(--bg-hover)' }}>
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={6} style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                    Showing {expenses.length} of {meta.total} records
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#ef4444', fontSize: '14px' }}>
                    −{fmt(expenses.reduce((s,e)=>s+Number(e.amount||0),0))}
                  </td>
                  <td style={tdStyle} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
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

      {/* ── MODALS ─────────────────────────────────────────── */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>

          {/* VIEW */}
          {activeModal === 'view' && selected && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>
              <div style={{ background: '#1B4332', padding: '18px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}><i className="ri-arrow-down-circle-line me-2 text-danger" />Expense Voucher</div>
                  <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>{selected.reference || selected.id} · {fmtD(selected.date)}</div>
                </div>
                <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '28px', fontFamily: 'Syne, sans-serif' }}>−{fmt(selected.amount)}</div>
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
                  ['Voucher ID', selected.reference || selected.id],
                  ['Description', selected.description],
                  ['Category', selected.category],
                  ['Payment Method', selected.payment_method],
                  ['Supplier', selected.supplier_name || '—'],
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
                  {selected.status === 'pending' && (
                    <>
                      <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer' }} onClick={() => { closeModal(); openApprove(selected) }}>Approve</button>
                      <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }} onClick={() => { closeModal(); openReject(selected) }}>Reject</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ADD / EDIT */}
          {(activeModal === 'add' || activeModal === 'edit') && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal)' }}>
              <div style={{ background: '#1B4332', padding: '18px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}>
                  <i className={`${activeModal === 'add' ? 'ri-add-circle-line' : 'ri-edit-line'} me-2`} />
                  {activeModal === 'add' ? 'Add Expense' : 'Edit Expense'}
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
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Category</label>
                    <select style={inpStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Description *</label>
                  <input style={inpStyle} placeholder="What is this payment for?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Supplier Name</label>
                    <input style={inpStyle} placeholder="Supplier or vendor name" value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Payment Method</label>
                    <select style={inpStyle} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                      {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Status</label>
                    <select style={inpStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Amount (₦) *</label>
                    <input style={inpStyle} type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Due Date</label>
                    <input type="date" style={inpStyle} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Currency</label>
                    <select style={inpStyle} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Notes</label>
                  <textarea style={{ ...inpStyle, resize: 'vertical', minHeight: '60px' }} rows={2} placeholder="Additional details…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#1B4332', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (saving || !form.description || !form.amount) ? 0.7 : 1 }} onClick={saveExpense} disabled={saving || !form.description || !form.amount}>
                    {saving ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* APPROVE */}
          {activeModal === 'approve' && selected && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: 'var(--shadow-modal)' }}>
              <div style={{ background: '#14532d', padding: '18px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}><i className="ri-check-double-line me-2" />Approve Expense</div>
                <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-green-faint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <i className="ri-check-double-line fs-24 text-success" style={{ color: '#22c55e', fontSize: '24px' }} />
                </div>
                <h5 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Approve this expense?</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                  <strong>{selected.description}</strong><br />
                  <strong>{fmt(selected.amount)}</strong> · {selected.category}
                  <br /><span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{fmtD(selected.date)}</span>
                </p>
                <div style={{ background: 'var(--bg-green-faint)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'left', marginBottom: '24px' }}>
                  <i className="ri-information-line me-1" />
                  Approving will mark this expense as <strong>Approved</strong>. Payment can then be processed and marked Paid.
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer' }} onClick={approveExpense} disabled={saving}>
                    {saving ? 'Approving...' : 'Confirm Approval'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REJECT */}
          {activeModal === 'reject' && selected && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: 'var(--shadow-modal)' }}>
              <div style={{ background: '#7f1d1d', padding: '18px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}><i className="ri-close-circle-line me-2" />Reject Expense</div>
                <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div style={{ padding: '24px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Rejecting: <strong>{selected.description}</strong> — <strong>{fmt(selected.amount)}</strong>
                </p>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Reason for Rejection *</label>
                  <textarea style={inpStyle} rows={3} placeholder="Explain why this expense is being rejected…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!rejectReason || saving) ? 0.7 : 1 }} onClick={rejectExpense} disabled={saving || !rejectReason}>
                    {saving ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DELETE */}
          {activeModal === 'delete' && selected && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: 'var(--shadow-modal)' }}>
              <div style={{ background: '#7f1d1d', padding: '18px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'Syne, sans-serif' }}><i className="ri-delete-bin-line me-2" />Delete Expense</div>
                <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-red-faint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <i className="ri-delete-bin-line fs-24 text-danger" style={{ color: '#ef4444', fontSize: '24px' }} />
                </div>
                <h5 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Delete this expense voucher?</h5>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '24px' }}>
                  <strong>{selected.reference || selected.id}</strong> — {selected.description}<br />
                  <strong>{fmt(selected.amount)}</strong> · This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
                  <button style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }} onClick={deleteExpense} disabled={saving}>
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
