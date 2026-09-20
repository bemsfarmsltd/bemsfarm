import { useState, useEffect, useRef } from 'react'

export function VisualCalendarPicker({ from, to, onApply, onClose }) {
  const parseYMD = (str) => {
    if (!str) return null
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const formatYMD = (d) => {
    if (!d || isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const todayStr = formatYMD(new Date())
  const initialStart = from || todayStr
  const initialEnd   = to || from || todayStr

  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate]     = useState(initialEnd)
  const [hoverDate, setHoverDate] = useState(null)
  const [isPickingEnd, setIsPickingEnd] = useState(false)

  // Current calendar view month/year
  const initialViewDate = parseYMD(initialStart) || new Date()
  const [viewYear, setViewYear]   = useState(initialViewDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth()) // 0-indexed

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // Days matrix for current month
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysArray = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(day)
  }

  const handleDayClick = (day) => {
    const clickedStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    if (!isPickingEnd || !startDate) {
      // Pick start date
      setStartDate(clickedStr)
      setEndDate('')
      setIsPickingEnd(true)
    } else {
      // Pick end date
      if (clickedStr < startDate) {
        setEndDate(startDate)
        setStartDate(clickedStr)
      } else {
        setEndDate(clickedStr)
      }
      setIsPickingEnd(false)
    }
  }

  const applyPreset = (presetKey) => {
    const now = new Date()
    let startD = new Date()
    let endD = new Date()

    if (presetKey === 'today') {
      startD = now
      endD = now
    } else if (presetKey === 'yesterday') {
      startD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      endD = startD
    } else if (presetKey === '7d') {
      startD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      endD = now
    } else if (presetKey === '12d') {
      startD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 11)
      endD = now
    } else if (presetKey === '30d' || presetKey === '1m') {
      startD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
      endD = now
    } else if (presetKey === 'this_month') {
      startD = new Date(now.getFullYear(), now.getMonth(), 1)
      endD = now
    } else if (presetKey === 'last_month') {
      startD = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endD = new Date(now.getFullYear(), now.getMonth(), 0)
    } else if (presetKey === '1y') {
      startD = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      endD = now
    }

    const sStr = formatYMD(startD)
    const eStr = formatYMD(endD)
    setStartDate(sStr)
    setEndDate(eStr)
    setIsPickingEnd(false)
    setViewYear(startD.getFullYear())
    setViewMonth(startD.getMonth())
  }

  const handleConfirm = () => {
    const finalStart = startDate || todayStr
    const finalEnd   = endDate || finalStart
    onApply(finalStart, finalEnd)
  }

  // Calculate day count
  const sDate = parseYMD(startDate)
  const eDate = parseYMD(endDate || startDate)
  const daysDiff = (sDate && eDate)
    ? Math.round(Math.abs((eDate - sDate) / (1000 * 60 * 60 * 24))) + 1
    : 1

  return (
    <div
      className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-xl border overflow-hidden"
      style={{
        zIndex: 1060,
        width: '460px',
        maxWidth: '95vw',
        borderColor: '#E5E7EB',
        boxShadow: '0 20px 30px -10px rgba(0,0,0,0.18), 0 10px 15px -5px rgba(0,0,0,0.08)',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      {/* Popover Header */}
      <div className="d-flex align-items-center justify-content-between px-3.5 py-2.5 bg-light border-bottom">
        <div className="d-flex align-items-center gap-2">
          <i className="ri-calendar-check-fill text-success" style={{ fontSize: 17 }} />
          <div>
            <div className="fw-bold text-dark" style={{ fontSize: '0.84rem' }}>Calendar Date Range Picker</div>
            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
              {isPickingEnd ? '👉 Click on an end date' : 'Click a date to select start/end range'}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn-close"
          style={{ fontSize: '0.65rem' }}
          onClick={onClose}
        />
      </div>

      <div className="d-flex flex-column flex-md-row">
        {/* Left Side: Quick Presets */}
        <div
          className="p-2.5 border-end bg-light d-flex flex-row flex-md-column gap-1 flex-wrap"
          style={{ width: '135px', minWidth: '135px' }}
        >
          <div className="text-muted fw-bold px-1.5 py-0.5 text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.04em' }}>
            Presets
          </div>
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: '7d', label: 'Last 7 Days' },
            { key: '12d', label: 'Last 12 Days' },
            { key: '30d', label: 'Last 30 Days' },
            { key: 'this_month', label: 'This Month' },
            { key: 'last_month', label: 'Last Month' },
            { key: '1y', label: 'Last 1 Year' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className="btn btn-sm btn-light text-start border-0 fw-semibold px-2 py-1"
              style={{
                fontSize: '0.73rem',
                borderRadius: '0.35rem',
                color: '#374151',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5E7EB')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right Side: Month Grid */}
        <div className="p-3 flex-grow-1">
          {/* Month Header with Prev/Next Controls */}
          <div className="d-flex align-items-center justify-content-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="btn btn-sm btn-light border p-1 d-flex align-items-center justify-content-center"
              style={{ width: 28, height: 28, borderRadius: '0.4rem' }}
              title="Previous Month"
            >
              <i className="ri-arrow-left-s-line" style={{ fontSize: 16 }} />
            </button>

            <div className="fw-bold text-dark font-display text-center" style={{ fontSize: '0.88rem' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="btn btn-sm btn-light border p-1 d-flex align-items-center justify-content-center"
              style={{ width: 28, height: 28, borderRadius: '0.4rem' }}
              title="Next Month"
            >
              <i className="ri-arrow-right-s-line" style={{ fontSize: 16 }} />
            </button>
          </div>

          {/* Weekdays Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '0.7rem',
              color: '#9CA3AF',
              marginBottom: '0.35rem',
            }}
          >
            {DAY_NAMES.map((d, i) => (
              <div key={i} className="py-1">{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
            }}
          >
            {daysArray.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} style={{ height: 32 }} />
              }

              const cellDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = cellDateStr === todayStr
              const isStart = cellDateStr === startDate
              const isEnd   = cellDateStr === (endDate || startDate)

              // Active range calculation
              const activeRangeEnd = endDate || (isPickingEnd && hoverDate ? hoverDate : startDate)
              const rangeMin = startDate < activeRangeEnd ? startDate : activeRangeEnd
              const rangeMax = startDate < activeRangeEnd ? activeRangeEnd : startDate
              const inRange = Boolean(rangeMin && rangeMax && cellDateStr > rangeMin && cellDateStr < rangeMax)

              let bg = 'transparent'
              let color = '#1F2937'
              let borderRadius = '0.35rem'
              let fontWeight = 500

              if (isStart || (isEnd && endDate)) {
                bg = '#143c2d'
                color = '#FFFFFF'
                fontWeight = 700
                borderRadius = '0.4rem'
              } else if (inRange) {
                bg = '#DCFCE7'
                color = '#14532D'
                fontWeight = 600
                borderRadius = '0'
              } else if (isToday) {
                color = '#16A34A'
                fontWeight = 700
              }

              return (
                <button
                  key={cellDateStr}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => isPickingEnd && setHoverDate(cellDateStr)}
                  className="btn p-0 d-flex align-items-center justify-content-center border-0"
                  style={{
                    height: 32,
                    fontSize: '0.78rem',
                    backgroundColor: bg,
                    color: color,
                    fontWeight: fontWeight,
                    borderRadius: borderRadius,
                    position: 'relative',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {day}
                  {isToday && !isStart && !isEnd && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 2,
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        backgroundColor: '#16A34A',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Popover Footer */}
      <div className="p-3 bg-light border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-1.5" style={{ fontSize: '0.75rem' }}>
          <span className="text-muted">Selected:</span>
          <span className="badge bg-white text-dark border font-monospace px-2 py-1 fw-bold">
            {startDate ? startDate : '—'}
          </span>
          <span className="text-muted">→</span>
          <span className="badge bg-white text-dark border font-monospace px-2 py-1 fw-bold">
            {endDate ? endDate : startDate || '—'}
          </span>
          <span className="badge bg-success-subtle text-success border border-success-subtle ms-1">
            {daysDiff} day{daysDiff === 1 ? '' : 's'}
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-light border text-secondary px-2.5"
            style={{ fontSize: '0.75rem', borderRadius: '0.4rem' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-sm btn-success text-white fw-bold px-3 d-flex align-items-center gap-1"
            style={{
              fontSize: '0.75rem',
              borderRadius: '0.4rem',
              backgroundColor: '#143c2d',
              borderColor: '#143c2d',
            }}
            onClick={handleConfirm}
          >
            <i className="ri-check-line" /> Apply Range
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DateFilterControls({
  range = 'today',
  from = '',
  to = '',
  onFilterChange,
  showAllOption = false,
  className = '',
}) {
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef(null)

  // Close calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false)
      }
    }
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker])

  const handleApplyCustom = (selectedFrom, selectedTo) => {
    onFilterChange('custom', selectedFrom, selectedTo)
    setShowPicker(false)
  }

  const handleSetPreset = (presetRange) => {
    onFilterChange(presetRange, '', '')
    setShowPicker(false)
  }

  const QUICK_TOGGLES = [
    ...(showAllOption ? [{ key: 'all', label: 'All' }] : []),
    { key: 'today', label: 'Today' },
    { key: '7d',    label: '7 Days' },
    { key: '12d',   label: '12 Days' },
    { key: '1m',    label: '1 Month' },
    { key: '1y',    label: '1 Year' },
  ]

  const getActiveLabel = () => {
    if (range === 'all')   return 'All Time'
    if (range === 'today') return 'Today'
    if (range === '7d')    return 'Last 7 Days'
    if (range === '12d')   return 'Last 12 Days'
    if (range === '1m')    return 'Last 1 Month'
    if (range === '1y')    return 'Last 1 Year'
    if (range === 'custom' && from && to) return `${from} → ${to}`
    return 'Today'
  }

  const defaultResetKey = showAllOption ? 'all' : 'today'

  return (
    <div className={`d-flex align-items-center gap-2 flex-wrap ${className}`}>
      {/* Quick Timeframe Buttons */}
      <div className="btn-group shadow-0 p-0.5 bg-white rounded-2 border" role="group" style={{ borderColor: '#E5E7EB' }}>
        {QUICK_TOGGLES.map(({ key, label }) => {
          const isActive = range === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSetPreset(key)}
              className={`btn btn-sm ${isActive ? 'btn-dark text-white fw-bold shadow-xs' : 'btn-light text-secondary fw-semibold border-0'}`}
              style={{
                borderRadius: '0.35rem',
                fontSize: '0.74rem',
                padding: '0.28rem 0.65rem',
                transition: 'all 0.15s ease',
                backgroundColor: isActive ? '#143c2d' : 'transparent',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Calendar Range Dropdown with Interactive Graphical Calendar */}
      <div className="position-relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className={`btn btn-sm d-flex align-items-center gap-1.5 ${range === 'custom' ? 'btn-success text-white fw-bold shadow-xs' : 'btn-light text-dark fw-semibold border'}`}
          style={{
            borderRadius: '0.45rem',
            fontSize: '0.74rem',
            padding: '0.3rem 0.7rem',
            backgroundColor: range === 'custom' ? '#143c2d' : '#FFFFFF',
            borderColor: range === 'custom' ? '#143c2d' : '#E5E7EB',
          }}
        >
          <i className="ri-calendar-2-line" style={{ fontSize: 13 }} />
          <span>{range === 'custom' && from && to ? `${from} → ${to}` : 'Calendar Range'}</span>
          <i className={`ri-arrow-${showPicker ? 'up' : 'down'}-s-line`} style={{ fontSize: 11 }} />
        </button>

        {/* Graphical Monthly Calendar Popover */}
        {showPicker && (
          <VisualCalendarPicker
            from={from}
            to={to}
            onApply={handleApplyCustom}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>

      {/* Active Range Pill (shown when range != defaultResetKey, with 1-click reset) */}
      {range !== defaultResetKey && (
        <div
          className="d-flex align-items-center gap-1.5 px-2 py-1 rounded-pill"
          style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            fontSize: '0.72rem',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#16A34A',
              display: 'inline-block',
            }}
          />
          <strong className="text-success fw-bold">{getActiveLabel()}</strong>
          <button
            type="button"
            onClick={() => onFilterChange(defaultResetKey, '', '')}
            className="btn btn-link text-muted p-0 ms-0.5 d-flex align-items-center text-decoration-none"
            title={`Reset to ${defaultResetKey}`}
            style={{ fontSize: '0.78rem', lineHeight: 1 }}
          >
            <i className="ri-close-circle-fill text-secondary" />
          </button>
        </div>
      )}
    </div>
  )
}
