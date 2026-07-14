import { useEffect, useRef, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'

const EVENT_COLORS = [
  { label: 'Green',  value: '#1B4332' },
  { label: 'Orange', value: '#F57C00' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Red',    value: '#ef4444' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Teal',   value: '#0d9488' },
]

const CHIP_COLORS = [
  { label: 'Events',           bg: '#6b7280', text: '#fff' },
  { label: 'Personal',        bg: '#F57C00', text: '#fff' },
  { label: 'Meeting',         bg: '#1B4332', text: '#fff' },
  { label: 'Festival/Holiday', bg: '#3b82f6', text: '#fff' },
]

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 13,
  fontFamily: 'Nunito, sans-serif', outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = { fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }

const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'Nunito, sans-serif', border: 'none',
}

const today = new Date().toISOString().slice(0, 10)
const d = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

export default function Calendar() {
  const calendarEl = useRef(null)
  const calRef     = useRef(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', start: '', end: '', time: '', color: '#1B4332', location: '' })

  useEffect(() => {
    if (!calendarEl.current || !window.FullCalendar) return
    if (calRef.current) calRef.current.destroy()
    const cal = new window.FullCalendar.Calendar(calendarEl.current, {
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
      },
      editable: true,
      droppable: true,
      events: [
        { title: 'Farm Harvest Day', start: today,   color: '#1B4332' },
        { title: 'Supplier Meeting', start: d(2),    color: '#F57C00' },
        { title: 'Staff Training',   start: d(5),    color: '#3b82f6' },
        { title: 'Delivery Review',  start: d(7),    color: '#7c3aed' },
      ],
    })
    cal.render()
    calRef.current = cal
    return () => { cal.destroy(); calRef.current = null }
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = (e) => {
    e.preventDefault()
    if (!form.name || !form.start) return
    calRef.current?.addEvent({
      title: form.name,
      start: form.time ? `${form.start}T${form.time}` : form.start,
      end: form.end || undefined,
      color: form.color,
    })
    setForm({ name: '', start: '', end: '', time: '', color: '#1B4332', location: '' })
    setShowModal(false)
  }

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>
      <PageHeader
        title="Calendar"
        subtitle="Manage farm events, meetings, and schedules"
        actions={
          <button
            onClick={() => setShowModal(true)}
            style={{ ...btnBase, background: '#1B4332', color: '#fff' }}
          >
            <i className="ri-add-circle-line" style={{ fontSize: 15 }} />
            Add Event
          </button>
        }
      />

      {/* Draggable event chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {CHIP_COLORS.map(c => (
          <div
            key={c.label}
            draggable
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: c.bg, color: c.text, cursor: 'grab', userSelect: 'none',
            }}
          >
            {c.label}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: 20,
      }}>
        <div ref={calendarEl} />
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div
            onClick={() => setShowModal(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}
          />
          <div style={{
            position: 'relative', width: '100%', maxWidth: 560,
            background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            padding: 28, margin: '0 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>Add Event</span>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, lineHeight: 1 }}
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Event Name *</label>
                  <input style={inputStyle} placeholder="Enter event name" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Start Date *</label>
                    <div style={{ position: 'relative' }}>
                      <i className="ri-calendar-check-line" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
                      <input type="date" style={{ ...inputStyle, paddingLeft: 30 }} value={form.start} onChange={e => set('start', e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>End Date</label>
                    <div style={{ position: 'relative' }}>
                      <i className="ri-calendar-check-line" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
                      <input type="date" style={{ ...inputStyle, paddingLeft: 30 }} value={form.end} onChange={e => set('end', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Time</label>
                    <div style={{ position: 'relative' }}>
                      <i className="ri-time-line" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
                      <input type="time" style={{ ...inputStyle, paddingLeft: 30 }} value={form.time} onChange={e => set('time', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Color</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {EVENT_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => set('color', c.value)}
                        style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: c.value, border: form.color === c.value ? '3px solid #111827' : '2px solid #e5e7eb',
                          cursor: 'pointer',
                        }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Location</label>
                  <input style={inputStyle} placeholder="Enter location (optional)" value={form.location} onChange={e => set('location', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}>
                  Cancel
                </button>
                <button type="submit" style={{ ...btnBase, background: '#1B4332', color: '#fff' }}>
                  <i className="ri-check-line" />
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
