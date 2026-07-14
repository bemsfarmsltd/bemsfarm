import { useState, useRef, useEffect } from 'react'
import PageHeader from '../../components/ui/PageHeader'

// ── Mock Data ─────────────────────────────────────────────────────────────────
const FOLDERS = [
  { key: 'inbox',     label: 'Inbox',     icon: 'ri-inbox-line',            count: 12 },
  { key: 'starred',   label: 'Starred',   icon: 'ri-star-line',             count: 2 },
  { key: 'sent',      label: 'Sent',      icon: 'ri-send-plane-2-line',     count: 0 },
  { key: 'drafts',    label: 'Drafts',    icon: 'ri-draft-line',            count: 2 },
  { key: 'spam',      label: 'Spam',      icon: 'ri-spam-2-line',           count: 0 },
  { key: 'trash',     label: 'Trash',     icon: 'ri-delete-bin-6-line',     count: 0 },
  { key: 'important', label: 'Important', icon: 'ri-flashlight-line',       count: 0 },
  { key: 'scheduled', label: 'Scheduled', icon: 'ri-calendar-schedule-line',count: 0 },
]

const LABELS = [
  { label: 'Team Meetings', count: 3, color: '#dc2626' },
  { label: 'Supplier',      count: 5, color: '#1B4332' },
  { label: 'Finance',       count: 4, color: '#F57C00' },
  { label: 'HR & Staff',    count: 2, color: '#3b82f6' },
]

const EMAILS = [
  { id: 1, from: 'Emeka Obi',       email: 'emeka@supplier.com',  subject: 'Re: Fresh Tomatoes Order',           preview: 'The batch will arrive by Thursday morning as discussed...', time: '9:45 AM', starred: true,  read: false, folder: 'inbox', body: 'Good morning,\n\nThe fresh tomatoes batch will arrive by Thursday morning as discussed. We have loaded 200 crates at the farm gate. Please ensure the receiving team is available.\n\nBest regards,\nEmeka Obi\nObi Farms Ltd' },
  { id: 2, from: 'Accounts Dept',   email: 'accounts@bemsfarms.com', subject: 'July Payroll Summary',            preview: 'Please find attached the payroll summary for the month of July...', time: '8:30 AM', starred: false, read: false, folder: 'inbox', body: 'Dear Team,\n\nPlease find attached the payroll summary for the month of July. All salaries will be disbursed by the 25th. Kindly review and flag any discrepancies before the 20th.\n\nRegards,\nAccounts Department' },
  { id: 3, from: 'Fatima Aliyu',    email: 'fatima@logistics.ng',  subject: 'Delivery Route Update for Week 27', preview: 'Due to road construction on the Lagos-Ibadan expressway...', time: 'Yesterday', starred: false, read: true, folder: 'inbox', body: 'Hi,\n\nDue to ongoing road construction on the Lagos-Ibadan expressway, delivery routes for Week 27 have been adjusted. Drivers should take the alternate Sagamu-Ore route. ETA may increase by 20-30 minutes.\n\nFatima Aliyu\nLogistics Coordinator' },
  { id: 4, from: 'HR Dept',         email: 'hr@bemsfarms.com',     subject: 'Staff Training Schedule – Q3 2026', preview: 'We are pleased to announce the Q3 training calendar...', time: 'Mon', starred: true,  read: true, folder: 'inbox', body: 'Dear All,\n\nWe are pleased to announce the Q3 training calendar. The following sessions are scheduled:\n\n- Food Safety & Hygiene: July 8\n- Customer Service Excellence: July 22\n- Stock Management Best Practices: August 5\n\nAttendance is mandatory for all staff.\n\nHR Department' },
  { id: 5, from: 'Olu Adeyemi',     email: 'olu.adeyemi@mail.com', subject: 'Product Pricing Review Request',   preview: 'Good afternoon. I wanted to follow up on our discussion regarding...', time: 'Sun', starred: false, read: true, folder: 'inbox', body: 'Good afternoon,\n\nI wanted to follow up on our discussion regarding the pricing review for Q3. Could you share the updated cost sheet so we can align our retail prices accordingly?\n\nThank you,\nOlu Adeyemi' },
  { id: 6, from: 'Zainab Musa',     email: 'zainab@partner.co',   subject: 'Partnership Proposal – Frozen Foods', preview: 'My company specializes in cold chain logistics and we believe...', time: 'Fri', starred: false, read: true, folder: 'inbox', body: 'Dear Bems Farms Team,\n\nMy company specializes in cold chain logistics and we believe there is a strong synergy between our operations. We would love to explore a partnership for distributing your frozen food line across the North.\n\nKindly let us know your availability for a call.\n\nWarm regards,\nZainab Musa\nFrostLine Nigeria Ltd' },
]

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 13,
  fontFamily: 'Nunito, sans-serif', outline: 'none',
  boxSizing: 'border-box',
}

const card = {
  background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden',
}

const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'Nunito, sans-serif', border: 'none',
}

function Modal({ open, onClose, title, children, maxWidth = 560 }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth, background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 28, margin: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20 }}>
            <i className="ri-close-line" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Email() {
  const [folder, setFolder]     = useState('inbox')
  const [emails, setEmails]     = useState(EMAILS)
  const [selected, setSelected] = useState(null)
  const [checked, setChecked]   = useState([])
  const [search, setSearch]     = useState('')
  const [compose, setCompose]   = useState(false)
  const [delModal, setDelModal] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [compForm, setCompForm] = useState({ to: '', subject: '', body: '' })

  const folderEmails = emails.filter(e => {
    if (e.folder !== folder) return false
    if (!search) return true
    return e.from.toLowerCase().includes(search.toLowerCase()) || e.subject.toLowerCase().includes(search.toLowerCase())
  })

  const toggleCheck = (id) => setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleStar  = (id) => setEmails(prev => prev.map(e => e.id === id ? { ...e, starred: !e.starred } : e))
  const markRead    = (email) => { setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e)); setSelected(email) }
  const deleteSelected = () => {
    if (selected) {
      setEmails(prev => prev.filter(e => e.id !== selected.id))
      setSelected(null)
    }
    setDelModal(false)
  }

  const sendCompose = (e) => {
    e.preventDefault()
    const newEmail = {
      id: Date.now(), from: 'Me', email: 'admin@bemsfarms.com',
      subject: compForm.subject || '(no subject)',
      preview: compForm.body.slice(0, 80),
      body: compForm.body,
      time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
      starred: false, read: true, folder: 'sent',
    }
    setEmails(prev => [newEmail, ...prev])
    setCompForm({ to: '', subject: '', body: '' })
    setCompose(false)
  }

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>
      <PageHeader
        title="Mailbox"
        subtitle="Manage emails for Bems Farms"
        actions={
          <button onClick={() => setCompose(true)} style={{ ...btnBase, background: '#1B4332', color: '#fff' }}>
            <i className="ri-edit-2-line" style={{ fontSize: 14 }} />
            Compose
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, minHeight: 600 }}>

        {/* ── Sidebar ── */}
        <div style={{ ...card, height: 'fit-content' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 8 }}>FOLDERS</div>
            {FOLDERS.map(f => (
              <button
                key={f.key}
                onClick={() => { setFolder(f.key); setSelected(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 10px', borderRadius: 8, marginBottom: 2,
                  background: folder === f.key ? 'rgba(27,67,50,0.09)' : 'none',
                  border: 'none', cursor: 'pointer',
                  color: folder === f.key ? '#1B4332' : '#374151',
                  fontWeight: folder === f.key ? 700 : 400,
                  fontSize: 13, fontFamily: 'Nunito, sans-serif',
                }}
              >
                <i className={f.icon} style={{ fontSize: 16, flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{f.label}</span>
                {f.count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: folder === f.key ? '#1B4332' : '#e5e7eb', color: folder === f.key ? '#fff' : '#374151', padding: '1px 6px', borderRadius: 50 }}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>LABELS</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1B4332' }}><i className="ri-add-line" style={{ fontSize: 14 }} /></button>
            </div>
            {LABELS.map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', cursor: 'pointer', borderRadius: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <i className="ri-checkbox-blank-circle-fill" style={{ color: l.color, fontSize: 10 }} />
                <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{l.label}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{l.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Email List + Detail ── */}
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.4fr' : '1fr', gap: 16 }}>

          {/* Email list */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
            {/* List toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1, color: '#111827' }}>
                {FOLDERS.find(f2 => f2.key === folder)?.label}
                <span style={{ fontWeight: 400, fontSize: 12, color: '#9ca3af', marginLeft: 6 }}>{folderEmails.length} messages</span>
              </span>
              <button onClick={() => setSearchOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
                <i className="ri-search-line" style={{ fontSize: 16 }} />
              </button>
              {checked.length > 0 && (
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}>
                  <i className="ri-delete-bin-6-line" style={{ fontSize: 16 }} />
                </button>
              )}
            </div>

            {/* Search bar */}
            {searchOpen && (
              <div style={{ padding: '8px 16px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ position: 'relative' }}>
                  <i className="ri-search-line" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search emails..."
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                </div>
              </div>
            )}

            {/* Emails */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {folderEmails.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                  <i className="ri-inbox-line" style={{ fontSize: 40, display: 'block', marginBottom: 8 }} />
                  <div style={{ fontSize: 13 }}>No emails in {folder}</div>
                </div>
              )}
              {folderEmails.map(email => (
                <div
                  key={email.id}
                  onClick={() => markRead(email)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                    borderBottom: '1px solid #f9fafb', cursor: 'pointer',
                    background: selected?.id === email.id ? 'rgba(27,67,50,0.06)' : email.read ? '#fff' : '#fafff8',
                    borderLeft: selected?.id === email.id ? '3px solid #1B4332' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (selected?.id !== email.id) e.currentTarget.style.background = '#f9fafb' }}
                  onMouseLeave={e => { e.currentTarget.style.background = selected?.id === email.id ? 'rgba(27,67,50,0.06)' : email.read ? '#fff' : '#fafff8' }}
                >
                  <input
                    type="checkbox"
                    checked={checked.includes(email.id)}
                    onChange={() => toggleCheck(email.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ marginTop: 2, accentColor: '#1B4332', flexShrink: 0 }}
                  />

                  {/* Avatar initial */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: '#1B433218', color: '#1B4332',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13,
                  }}>
                    {email.from.charAt(0)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontWeight: email.read ? 500 : 700, fontSize: 13, color: '#111827' }}>{email.from}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, marginLeft: 8 }}>{email.time}</span>
                    </div>
                    <div style={{ fontWeight: email.read ? 400 : 600, fontSize: 12, color: '#374151', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.subject}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.preview}</div>
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); toggleStar(email.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: email.starred ? '#F57C00' : '#d1d5db', padding: 4, flexShrink: 0 }}
                  >
                    <i className={email.starred ? 'ri-star-fill' : 'ri-star-line'} style={{ fontSize: 15 }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Email detail */}
          {selected && (
            <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
              {/* Detail toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }} title="Back">
                  <i className="ri-arrow-left-line" style={{ fontSize: 18 }} />
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }} title="Archive">
                  <i className="ri-archive-line" style={{ fontSize: 18 }} />
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }} title="Mark spam">
                  <i className="ri-spam-2-line" style={{ fontSize: 18 }} />
                </button>
                <div style={{ flex: 1 }} />
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }} title="Reply">
                  <i className="ri-reply-line" style={{ fontSize: 18 }} />
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }} title="Snooze">
                  <i className="ri-time-line" style={{ fontSize: 18 }} />
                </button>
                <button onClick={() => setDelModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }} title="Delete">
                  <i className="ri-delete-bin-6-line" style={{ fontSize: 18 }} />
                </button>
              </div>

              {/* Email body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#111827', marginBottom: 16 }}>{selected.subject}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1B433218', color: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                    {selected.from.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{selected.from}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{selected.email}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>{selected.time}</div>
                </div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-line', paddingBottom: 24 }}>
                  {selected.body}
                </div>
              </div>

              {/* Quick reply */}
              <div style={{ borderTop: '1px solid #f3f4f6', padding: 16 }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>To:</span>
                    <input defaultValue={selected.email} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontFamily: 'Nunito, sans-serif', color: '#374151' }} />
                  </div>
                  <textarea
                    placeholder="Type your reply..."
                    rows={3}
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '10px 12px', fontSize: 12, fontFamily: 'Nunito, sans-serif', resize: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid #f3f4f6' }}>
                    <label style={{ cursor: 'pointer', color: '#9ca3af' }}>
                      <i className="ri-image-line" style={{ fontSize: 16 }} />
                      <input type="file" style={{ display: 'none' }} />
                    </label>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                      <i className="ri-links-line" style={{ fontSize: 16 }} />
                    </button>
                    <div style={{ flex: 1 }} />
                    <button style={{ ...btnBase, padding: '6px 14px', background: '#f3f4f6', color: '#374151', fontSize: 12 }}>Draft</button>
                    <button style={{ ...btnBase, padding: '6px 14px', background: '#1B4332', color: '#fff', fontSize: 12 }}>
                      <i className="ri-send-plane-2-line" />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <Modal open={compose} onClose={() => setCompose(false)} title="New Message" maxWidth={600}>
        <form onSubmit={sendCompose} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', paddingBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', width: 32 }}>To:</span>
            <input style={{ ...inputStyle, border: 'none', padding: '4px 0' }} placeholder="recipient@email.com" value={compForm.to} onChange={e => setCompForm(f => ({ ...f, to: e.target.value }))} required />
            <span style={{ fontSize: 12, color: '#1B4332', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Cc</span>
            <span style={{ fontSize: 12, color: '#1B4332', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Bcc</span>
          </div>
          <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 12 }}>
            <input style={{ ...inputStyle, border: 'none', padding: '4px 0' }} placeholder="Subject" value={compForm.subject} onChange={e => setCompForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <textarea
            rows={8}
            placeholder="Write your message..."
            value={compForm.body}
            onChange={e => setCompForm(f => ({ ...f, body: e.target.value }))}
            style={{ ...inputStyle, resize: 'vertical', padding: '10px 12px' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <label style={{ cursor: 'pointer', color: '#9ca3af' }}>
              <i className="ri-image-line" style={{ fontSize: 18 }} />
              <input type="file" style={{ display: 'none' }} />
            </label>
            <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <i className="ri-links-line" style={{ fontSize: 18 }} />
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => setCompose(false)} style={{ ...btnBase, padding: '7px 16px', background: '#f3f4f6', color: '#374151' }}>Draft</button>
            <button type="submit" style={{ ...btnBase, padding: '7px 16px', background: '#1B4332', color: '#fff' }}>
              <i className="ri-send-plane-2-line" />
              Send Now
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={delModal} onClose={() => setDelModal(false)} title="Delete Email" maxWidth={420}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="ri-delete-bin-6-line" style={{ fontSize: 26, color: '#dc2626' }} />
          </div>
          <p style={{ fontSize: 14, color: '#374151', marginBottom: 24 }}>Are you sure you want to delete this email? This action cannot be undone.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button onClick={() => setDelModal(false)} style={{ ...btnBase, background: '#f3f4f6', color: '#374151', padding: '8px 20px' }}>Cancel</button>
            <button onClick={deleteSelected} style={{ ...btnBase, background: '#dc2626', color: '#fff', padding: '8px 20px' }}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
