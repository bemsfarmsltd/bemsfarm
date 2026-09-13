import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../lib/api'

const TYPE_META = {
  announcement: { icon: '📢', color: '#3b82f6', bg: '#dbeafe' },
  promotion:    { icon: '🎁', color: '#16a34a', bg: '#dcfce7' },
  alert:        { icon: '⚠️', color: '#d97706', bg: '#fef3c7' },
  personal:     { icon: '💌', color: '#8b5cf6', bg: '#ede9fe' },
}

function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Pop-up card preview ──────────────────────────────────────────────────────
function BroadcastPreviewCard({ form, onPublish, busy }) {
  const meta = TYPE_META[form.type] || TYPE_META.announcement
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '32px 32px 28px', maxWidth: 420, width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,.25)', textAlign: 'center', position: 'relative' }}>
        {/* Type badge */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20,
          background: meta.bg, color: meta.color, fontWeight: 700, fontSize: 12, marginBottom: 16 }}>
          {meta.icon} {form.type.charAt(0).toUpperCase() + form.type.slice(1)}
        </span>
        <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
          {form.title || 'Your announcement title'}
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {form.message || 'Your announcement message will appear here.'}
        </p>
        {form.action_label && (
          <div style={{ marginBottom: 16 }}>
            <span style={{ background: '#3b82f6', color: '#fff', borderRadius: 10, padding: '10px 24px',
              fontSize: 14, fontWeight: 700, display: 'inline-block' }}>
              {form.action_label}
            </span>
          </div>
        )}
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 20 }}>
          This is a preview of how customers will see this announcement.
          <br />Target: <strong>{form.target_type === 'all' ? 'All Customers' : `Customer: ${form.customer_id}`}</strong>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onPublish} disabled={busy}
            style={{ background: '#3b82f6', border: 'none', borderRadius: 10, color: '#fff',
              padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .6 : 1 }}>
            {busy ? 'Publishing…' : '📤 Publish Announcement'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CustomerBroadcasts() {
  const [searchParams]                = useSearchParams()
  const prefillCustomer               = searchParams.get('customer') || ''
  const [broadcasts, setBroadcasts]   = useState([])
  const [error, setError]             = useState('')
  const [busy, setBusy]               = useState(false)
  const [preview, setPreview]         = useState(false)
  const [archiving, setArchiving]     = useState(null)

  const [form, setForm] = useState({
    title: '', message: '', type: 'announcement',
    target_type: prefillCustomer ? 'single' : 'all',
    customer_id: prefillCustomer, action_label: '', action_url: '',
  })

  const load = async () => {
    try {
      const r = await api.get('/broadcasts/admin/all')
      setBroadcasts(r.data.broadcasts || [])
    } catch { setError('Announcements could not be loaded.') }
  }
  useEffect(() => { load() }, [])

  const change = e => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setPreview(false) }

  const publish = async () => {
    setBusy(true)
    try {
      await api.post('/broadcasts/admin', form)
      setPreview(false)
      setForm(f => ({ ...f, title: '', message: '', action_label: '', action_url: '' }))
      setError(''); await load()
    } catch (e) {
      setError(e.response?.data?.message || 'Announcement could not be published.')
      setPreview(false)
    } finally { setBusy(false) }
  }

  const archive = async id => {
    setArchiving(id)
    try { await api.delete(`/broadcasts/admin/${id}`); await load() }
    catch { setError('Could not archive this announcement.') }
    finally { setArchiving(null) }
  }

  const activeBroadcasts   = broadcasts.filter(b => b.status === 'active')
  const archivedBroadcasts = broadcasts.filter(b => b.status !== 'active')

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      {preview && <BroadcastPreviewCard form={form} onPublish={publish} busy={busy} />}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>📢 Customer Announcements</h1>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
          Send pop-up announcements to a specific customer or all customers. Customers see them immediately after logging in.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px',
          color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 28, alignItems: 'start' }}>
        {/* ── Compose Panel ── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #f1f5f9',
          boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>New Announcement</h3>

          <label style={lbl}>
            <span style={lbText}>Audience</span>
            <select name="target_type" value={form.target_type} onChange={change} style={sel}>
              <option value="all">🌐 All Customers</option>
              <option value="single">👤 Specific Customer</option>
            </select>
          </label>

          {form.target_type === 'single' && (
            <label style={lbl}>
              <span style={lbText}>Customer ID / Code / Email</span>
              <input name="customer_id" required value={form.customer_id} onChange={change} style={inp} placeholder="e.g. CUS-0012 or customer@email.com" />
            </label>
          )}

          <label style={lbl}>
            <span style={lbText}>Type</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(TYPE_META).map(([key, meta]) => (
                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, type: key }))}
                  style={{ padding: '9px 14px', borderRadius: 10, border: '2px solid',
                    borderColor: form.type === key ? meta.color : '#e2e8f0',
                    background: form.type === key ? meta.bg : '#fafafa',
                    color: form.type === key ? meta.color : '#64748b',
                    cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {meta.icon} {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </label>

          <label style={lbl}>
            <span style={lbText}>Title</span>
            <input name="title" required maxLength={200} value={form.title} onChange={change} style={inp} placeholder="e.g. Flash Sale — 20% off everything!" />
          </label>

          <label style={lbl}>
            <span style={lbText}>Message</span>
            <textarea name="message" required maxLength={4000} value={form.message} onChange={change}
              rows={4} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
              placeholder="Write your announcement message here…" />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={lbl}>
              <span style={lbText}>Button Label <span style={{ color: '#94a3b8' }}>(optional)</span></span>
              <input name="action_label" maxLength={100} value={form.action_label} onChange={change} style={inp} placeholder="e.g. Shop Now" />
            </label>
            <label style={lbl}>
              <span style={lbText}>Storefront Path <span style={{ color: '#94a3b8' }}>(optional)</span></span>
              <input name="action_url" maxLength={255} value={form.action_url} onChange={change} style={inp} placeholder="/products" />
            </label>
          </div>

          <button onClick={() => { if (!form.title.trim() || !form.message.trim()) { setError('Title and message are required.'); return } setError(''); setPreview(true) }}
            disabled={busy}
            style={{ width: '100%', marginTop: 20, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
              border: 'none', borderRadius: 12, color: '#fff', padding: '14px', fontWeight: 700,
              fontSize: 15, cursor: 'pointer', transition: 'opacity .15s', opacity: busy ? .6 : 1 }}>
            👁 Preview Announcement
          </button>
        </div>

        {/* ── Sent Broadcasts ── */}
        <div>
          {/* Active */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Active Announcements
                <span style={{ marginLeft: 8, background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>
                  {activeBroadcasts.length}
                </span>
              </h3>
            </div>
            <div>
              {!activeBroadcasts.length ? (
                <div style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No active announcements. Create one above.
                </div>
              ) : activeBroadcasts.map(b => {
                const meta = TYPE_META[b.type] || TYPE_META.announcement
                return (
                  <div key={b.id} style={{ padding: '16px 20px', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color }}>
                            {meta.icon} {b.type}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {b.target_type === 'all' ? '🌐 All customers' : `👤 ${b.target_customer_name || b.target_customer_code || 'Customer'}`}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 4 }}>{b.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {b.message}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                          By {b.creator_name || 'Admin'} · {fmtDate(b.created_at)} · {Number(b.dismiss_count)} acknowledged
                        </div>
                      </div>
                      <button onClick={() => archive(b.id)} disabled={archiving === b.id}
                        style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#ef4444',
                          padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        {archiving === b.id ? '…' : 'Archive'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Archived (collapsed) */}
          {archivedBroadcasts.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>
                  Archived ({archivedBroadcasts.length})
                </h3>
              </div>
              {archivedBroadcasts.slice(0, 5).map(b => {
                const meta = TYPE_META[b.type] || TYPE_META.announcement
                return (
                  <div key={b.id} style={{ padding: '12px 20px', borderTop: '1px solid #f8fafc', opacity: 0.7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: '#f1f5f9', color: '#94a3b8' }}>
                        {meta.icon} archived
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{b.title}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{Number(b.dismiss_count)} seen</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ──
const lbl  = { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }
const lbText = { fontSize: 12, fontWeight: 600, color: '#475569' }
const inp  = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1e293b', background: '#f8fafc', outline: 'none', width: '100%', boxSizing: 'border-box' }
const sel  = { ...inp, cursor: 'pointer' }
