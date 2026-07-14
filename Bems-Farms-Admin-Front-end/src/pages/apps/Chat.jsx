import { useState, useRef, useEffect } from 'react'
import PageHeader from '../../components/ui/PageHeader'

const CONTACTS = [
  { id: 1, name: 'Adunola Balogun',  initials: 'AB', online: true,  unread: 2, last: 'Hello, how are you?',                     color: '#1B4332' },
  { id: 2, name: 'Chukwuemeka Eze',  initials: 'CE', online: true,  unread: 0, last: 'The delivery is on its way.',              color: '#F57C00' },
  { id: 3, name: 'Funmilayo Oladele', initials: 'FO', online: false, unread: 3, last: 'Can you check the stock levels?',         color: '#3b82f6' },
  { id: 4, name: 'Gbenga Adesanya',  initials: 'GA', online: true,  unread: 0, last: 'Meeting confirmed for tomorrow.',          color: '#7c3aed' },
  { id: 5, name: 'Ifeoma Okafor',    initials: 'IO', online: false, unread: 0, last: 'Thanks for the update!',                  color: '#0d9488' },
  { id: 6, name: 'Kehinde Adeyemi',  initials: 'KA', online: true,  unread: 1, last: 'Please send the invoice.',                color: '#dc2626' },
  { id: 7, name: 'Ngozi Nwosu',      initials: 'NN', online: true,  unread: 0, last: 'All orders have been packed.',            color: '#6b7280' },
  { id: 8, name: 'Tunde Fashola',    initials: 'TF', online: false, unread: 0, last: 'See you at the staff meeting.',           color: '#b45309' },
]

const SEED_MESSAGES = {
  1: [
    { id: 1, from: 'them', text: 'Hello, how are you?',                      time: '9:00 AM' },
    { id: 2, from: 'me',   text: 'I am doing well, thank you! How about you?', time: '9:01 AM' },
    { id: 3, from: 'them', text: 'Great! Did you see the delivery report?',  time: '9:03 AM' },
    { id: 4, from: 'me',   text: 'Yes, I reviewed it. Looks good overall.', time: '9:05 AM' },
  ],
  2: [
    { id: 1, from: 'them', text: 'The delivery is on its way.', time: '8:30 AM' },
    { id: 2, from: 'me',   text: 'How long until arrival?',     time: '8:31 AM' },
    { id: 3, from: 'them', text: 'About 45 minutes.',            time: '8:32 AM' },
  ],
  3: [
    { id: 1, from: 'them', text: 'Can you check the stock levels?',         time: '7:45 AM' },
    { id: 2, from: 'them', text: 'We might be running low on tomatoes.',    time: '7:46 AM' },
    { id: 3, from: 'them', text: 'Also check the pepper stock please.',     time: '7:47 AM' },
  ],
}

function Avatar({ contact, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: contact.color + '22', color: contact.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.32, flexShrink: 0,
      fontFamily: 'Nunito, sans-serif',
    }}>
      {contact.initials}
    </div>
  )
}

export default function Chat() {
  const [search, setSearch]       = useState('')
  const [active, setActive]       = useState(CONTACTS[0])
  const [messages, setMessages]   = useState(SEED_MESSAGES)
  const [text, setText]           = useState('')
  const [sort, setSort]           = useState('Latest First')
  const [showSort, setShowSort]   = useState(false)
  const bottomRef                 = useRef(null)
  const sortRef                   = useRef(null)

  const filtered = CONTACTS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const currentMsgs = messages[active.id] || []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active, messages])

  useEffect(() => {
    const h = e => { if (sortRef.current && !sortRef.current.contains(e.target)) setShowSort(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const sendMessage = () => {
    if (!text.trim()) return
    const msg = { id: Date.now(), from: 'me', text: text.trim(), time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) }
    setMessages(prev => ({ ...prev, [active.id]: [...(prev[active.id] || []), msg] }))
    setText('')
  }

  const card = { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>
      <PageHeader title="Team Chat" subtitle="Communicate with staff and team members" />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, height: 'calc(100vh - 200px)', minHeight: 500 }}>

        {/* ── Contact List ── */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          {/* Search */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ position: 'relative' }}>
              <i className="ri-search-line" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search contacts..."
                style={{
                  width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
                  border: '1px solid #e5e7eb', fontSize: 13, outline: 'none',
                  fontFamily: 'Nunito, sans-serif', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Sort + New */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <div ref={sortRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSort(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#1B4332', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Nunito, sans-serif' }}
              >
                {sort} <i className="ri-arrow-down-s-line" />
              </button>
              {showSort && (
                <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 140, padding: '4px 0' }}>
                  {['Latest First', 'Weekly', 'Monthly'].map(o => (
                    <button key={o} onClick={() => { setSort(o); setShowSort(false) }} style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12, fontFamily: 'Nunito, sans-serif', color: o === sort ? '#1B4332' : '#374151', fontWeight: o === sort ? 700 : 400 }}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              style={{ background: '#1B4332', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Nunito, sans-serif' }}
            >
              <i className="ri-add-line" />
              New Chat
            </button>
          </div>

          {/* Contact items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13 }}>No contacts found</div>
              : filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActive(c)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      width: '100%', background: active.id === c.id ? 'rgba(27,67,50,0.07)' : 'none',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      borderBottom: '1px solid #f9fafb',
                      borderLeft: active.id === c.id ? '3px solid #1B4332' : '3px solid transparent',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <Avatar contact={c} size={40} />
                      <span style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: 9, height: 9, borderRadius: '50%',
                        background: c.online ? '#22c55e' : '#d1d5db',
                        border: '2px solid #fff',
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last}</div>
                    </div>
                    {c.unread > 0 && (
                      <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 50, flexShrink: 0 }}>{c.unread}</span>
                    )}
                  </button>
                ))
            }
          </div>
        </div>

        {/* ── Chat Panel ── */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #f3f4f6', background: '#fff' }}>
            <Avatar contact={active} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{active.name}</div>
              <div style={{ fontSize: 11, color: active.online ? '#22c55e' : '#9ca3af' }}>
                {active.online ? 'Online' : 'Offline'}
              </div>
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 6 }} title="Voice call">
              <i className="ri-phone-line" style={{ fontSize: 18 }} />
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 6 }} title="Video call">
              <i className="ri-vidicon-line" style={{ fontSize: 18 }} />
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 6 }} title="Search">
              <i className="ri-search-line" style={{ fontSize: 18 }} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, background: '#f9fafb' }}>
            {currentMsgs.length === 0 && (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#9ca3af' }}>
                <i className="ri-chat-3-line" style={{ fontSize: 40, display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>No messages yet. Say hi!</div>
              </div>
            )}
            {currentMsgs.map(msg => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start', gap: 8 }}>
                {msg.from === 'them' && <Avatar contact={active} size={30} />}
                <div>
                  <div style={{
                    maxWidth: 380, padding: '10px 14px', borderRadius: 14,
                    fontSize: 13, lineHeight: 1.5,
                    background: msg.from === 'me' ? '#1B4332' : '#fff',
                    color: msg.from === 'me' ? '#fff' : '#111827',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    borderTopRightRadius: msg.from === 'me' ? 4 : 14,
                    borderTopLeftRadius: msg.from === 'them' ? 4 : 14,
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, textAlign: msg.from === 'me' ? 'right' : 'left' }}>{msg.time}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 12 }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <i className="ri-emotion-line" style={{ fontSize: 18 }} />
              </button>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Type a message..."
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Nunito, sans-serif', background: 'none' }}
              />
              <label style={{ cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <i className="ri-image-line" style={{ fontSize: 18 }} />
                <input type="file" style={{ display: 'none' }} />
              </label>
              <button
                onClick={sendMessage}
                style={{
                  background: '#1B4332', color: '#fff', border: 'none', borderRadius: 8,
                  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <i className="ri-send-plane-2-line" style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
