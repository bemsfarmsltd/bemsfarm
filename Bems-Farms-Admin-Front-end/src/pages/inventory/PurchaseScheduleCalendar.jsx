import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function PurchaseScheduleCalendar() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Current view date
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState('month') // 'month' | 'agenda'

  // Data & loading
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'scheduled' | 'overdue' | 'received'
  const [searchTerm, setSearchTerm] = useState('')

  // Products list for dropdown
  const [productsList, setProductsList] = useState([])
  const [warehouses, setWarehouses] = useState([])

  // Modal states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [receiveModalSchedule, setReceiveModalSchedule] = useState(null)
  const [receiveQty, setReceiveQty] = useState('')
  const [receiveWarehouseId, setReceiveWarehouseId] = useState('')
  const [receivingLoading, setReceivingLoading] = useState(false)

  // New Schedule form state
  const [formData, setFormData] = useState({
    product_id: '',
    product_name: '',
    expected_date: '',
    quantity: '',
    unit: 'pcs',
    estimated_cost: '',
    supplier_name: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() // 0-indexed

  // Format month string e.g. "2026-09"
  const monthString = useMemo(() => {
    const y = currentYear
    const m = String(currentMonth + 1).padStart(2, '0')
    return `${y}-${m}`
  }, [currentYear, currentMonth])

  // Fetch Schedules for current month
  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/schedules', {
        params: {
          month: monthString,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm.trim() || undefined,
        },
      })
      setSchedules(res.data?.schedules || [])
    } catch (err) {
      toast.error('Failed to load restock schedules')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [monthString, statusFilter, searchTerm])

  // Fetch products & warehouses for the form dropdowns
  useEffect(() => {
    api.get('/admin/products', { params: { limit: 100 } })
      .then((res) => setProductsList(res.data?.products || []))
      .catch(() => {})

    api.get('/admin/inventory/warehouses')
      .then((res) => setWarehouses(res.data?.warehouses || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  // Check query params to pre-fill and auto-open modal
  useEffect(() => {
    const qProdId = searchParams.get('product_id')
    const qProdName = searchParams.get('name')
    if (qProdId || qProdName) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const defaultDateStr = tomorrow.toISOString().split('T')[0]

      setFormData((prev) => ({
        ...prev,
        product_id: qProdId || '',
        product_name: qProdName ? decodeURIComponent(qProdName) : '',
        expected_date: defaultDateStr,
        quantity: '10',
        unit: 'pcs',
      }))
      setScheduleModalOpen(true)
    }
  }, [searchParams])

  const formatNaira = (amount) => {
    return '₦' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }
  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Build Calendar Matrix
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay() // 0 = Sunday
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    const cells = []

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: false,
      })
    }

    // Current month days
    const todayStr = new Date().toISOString().split('T')[0]
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      })
    }

    // Next month padding days to complete grid (multiples of 7)
    const remaining = 7 - (cells.length % 7)
    if (remaining < 7) {
      for (let n = 1; n <= remaining; n++) {
        const nextM = currentMonth === 11 ? 0 : currentMonth + 1
        const nextY = currentMonth === 11 ? currentYear + 1 : currentYear
        const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`
        cells.push({
          dateStr,
          dayNum: n,
          isCurrentMonth: false,
          isToday: false,
        })
      }
    }

    return cells
  }, [currentYear, currentMonth])

  // Map schedules by dateStr
  const schedulesByDate = useMemo(() => {
    const map = {}
    schedules.forEach((sch) => {
      const d = sch.expected_date_str || (sch.expected_date ? sch.expected_date.split('T')[0] : '')
      if (!d) return
      if (!map[d]) map[d] = []
      map[d].push(sch)
    })
    return map
  }, [schedules])

  // KPI Calculations
  const stats = useMemo(() => {
    let totalScheduledCount = 0
    let totalUnits = 0
    let totalEstimatedCost = 0
    let overdueCount = 0
    let receivedCount = 0

    schedules.forEach((s) => {
      const status = s.computed_status || s.status
      if (status === 'overdue') overdueCount++
      else if (status === 'received') receivedCount++
      else totalScheduledCount++

      totalUnits += Number(s.quantity || 0)
      totalEstimatedCost += Number(s.estimated_cost || 0)
    })

    return {
      totalItems: schedules.length,
      totalScheduledCount,
      totalUnits,
      totalEstimatedCost,
      overdueCount,
      receivedCount,
    }
  }, [schedules])

  // Open schedule modal for specific date
  const handleOpenScheduleForDate = (dateStr) => {
    setFormData({
      product_id: '',
      product_name: '',
      expected_date: dateStr,
      quantity: '',
      unit: 'pcs',
      estimated_cost: '',
      supplier_name: '',
      notes: '',
    })
    setScheduleModalOpen(true)
  }

  // Handle product selection to auto-fill unit and cost
  const handleProductSelect = (e) => {
    const pId = e.target.value
    if (!pId) {
      setFormData((prev) => ({ ...prev, product_id: '', product_name: '' }))
      return
    }
    const found = productsList.find((p) => String(p.id) === String(pId))
    if (found) {
      setFormData((prev) => ({
        ...prev,
        product_id: found.id,
        product_name: found.name,
        unit: found.unit || 'pcs',
        estimated_cost: found.cost_price ? String(found.cost_price * (Number(prev.quantity) || 1)) : prev.estimated_cost,
      }))
    }
  }

  // Create Scheduled Purchase
  const handleSubmitSchedule = async (e) => {
    e.preventDefault()
    if (!formData.product_name.trim() && !formData.product_id) {
      toast.error('Please select or specify a product name')
      return
    }
    if (!formData.expected_date) {
      toast.error('Please select an expected arrival date')
      return
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/admin/inventory/schedules', formData)
      toast.success('Purchase scheduled successfully!')
      setScheduleModalOpen(false)
      // clear query params if any
      if (searchParams.get('product_id')) {
        setSearchParams({})
      }
      fetchSchedules()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule purchase')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Receive Stock modal
  const handleOpenReceive = (schedule) => {
    setReceiveModalSchedule(schedule)
    setReceiveQty(String(schedule.quantity))
    setReceiveWarehouseId(warehouses[0]?.id ? String(warehouses[0].id) : '')
  }

  // Confirm Receive & Stock In
  const handleConfirmReceive = async () => {
    if (!receiveModalSchedule) return
    const qty = parseInt(receiveQty)
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid received quantity')
      return
    }

    setReceivingLoading(true)
    try {
      const res = await api.post(`/admin/inventory/schedules/${receiveModalSchedule.id}/receive`, {
        received_quantity: qty,
        warehouse_id: receiveWarehouseId || null,
        received_date: new Date().toISOString().split('T')[0],
      })
      toast.success(res.data?.message || 'Stock successfully received and updated in inventory!')
      setReceiveModalSchedule(null)
      setSelectedSchedule(null)
      fetchSchedules()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive stock')
    } finally {
      setReceivingLoading(false)
    }
  }

  // Delete Schedule
  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this scheduled restock?')) return
    try {
      await api.delete(`/admin/inventory/schedules/${id}`)
      toast.success('Scheduled purchase removed')
      setSelectedSchedule(null)
      fetchSchedules()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete schedule')
    }
  }

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="container-fluid py-3">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1 fs-xs">
              <li className="breadcrumb-item"><Link to="/inventory/stock" className="text-decoration-none">Inventory</Link></li>
              <li className="breadcrumb-item active" aria-current="page">Restock Calendar</li>
            </ol>
          </nav>
          <h5 className="mb-0 fw-bold text-dark font-display">Purchase &amp; Restock Calendar</h5>
          <small className="text-muted">
            Schedule upcoming supplier orders, farm harvest deliveries, and track stock-ins on an interactive calendar
          </small>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="btn-group shadow-xs">
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('month')}
            >
              <i className="ri-calendar-line me-1"></i> Month View
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'agenda' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('agenda')}
            >
              <i className="ri-list-check-2 me-1"></i> Agenda / List
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-1.5 shadow-sm"
            onClick={() => {
              const tomorrow = new Date()
              tomorrow.setDate(tomorrow.getDate() + 1)
              handleOpenScheduleForDate(tomorrow.toISOString().split('T')[0])
            }}
          >
            <i className="ri-add-line fs-5"></i>
            <span>Schedule Next Purchase</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="row g-2.5 mb-3">
        <div className="col-6 col-sm-4 col-xl-2">
          <div className="card border-0 shadow-xs rounded-3 p-2.5 bg-white">
            <span className="text-muted fs-xs text-uppercase fw-semibold">Upcoming</span>
            <h4 className="fw-bold font-display text-dark mb-0">{stats.totalScheduledCount}</h4>
            <small className="text-muted fs-xs">Active schedules</small>
          </div>
        </div>

        <div className="col-6 col-sm-4 col-xl-2">
          <div className="card border-0 shadow-xs rounded-3 p-2.5 bg-white">
            <span className="text-muted fs-xs text-uppercase fw-semibold">Incoming Units</span>
            <h4 className="fw-bold font-display text-primary mb-0">{stats.totalUnits.toLocaleString()}</h4>
            <small className="text-muted fs-xs">Produce / items</small>
          </div>
        </div>

        <div className="col-6 col-sm-4 col-xl-3">
          <div className="card border-0 shadow-xs rounded-3 p-2.5 bg-white">
            <span className="text-muted fs-xs text-uppercase fw-semibold">Est. Cost / Value</span>
            <h4 className="fw-bold font-display text-dark mb-0">{formatNaira(stats.totalEstimatedCost)}</h4>
            <small className="text-muted fs-xs">For current month</small>
          </div>
        </div>

        <div className="col-6 col-sm-4 col-xl-2">
          <div className="card border-0 shadow-xs rounded-3 p-2.5 bg-white">
            <span className="text-muted fs-xs text-uppercase fw-semibold">Overdue</span>
            <h4 className={`fw-bold font-display mb-0 ${stats.overdueCount > 0 ? 'text-danger' : 'text-muted'}`}>
              {stats.overdueCount}
            </h4>
            <small className="text-muted fs-xs">Awaiting delivery</small>
          </div>
        </div>

        <div className="col-6 col-sm-4 col-xl-3">
          <div className="card border-0 shadow-xs rounded-3 p-2.5 bg-white">
            <span className="text-muted fs-xs text-uppercase fw-semibold">Received &amp; Stocked</span>
            <h4 className="fw-bold font-display text-success mb-0">{stats.receivedCount}</h4>
            <small className="text-muted fs-xs">Added to inventory</small>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        {/* Navigation & Controls Toolbar */}
        <div className="card-header bg-white border-bottom p-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            {/* Month Nav */}
            <div className="d-flex align-items-center gap-2">
              <div className="btn-group btn-group-sm border rounded-2">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                >
                  <i className="ri-arrow-left-s-line"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-light fw-bold"
                  onClick={handleToday}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleNextMonth}
                  title="Next Month"
                >
                  <i className="ri-arrow-right-s-line"></i>
                </button>
              </div>

              <h5 className="fw-bold font-display text-dark mb-0 ms-2">
                {monthName}
              </h5>
            </div>

            {/* Filters */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="position-relative" style={{ minWidth: '180px' }}>
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  placeholder="Filter product or supplier…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted fs-xs"></i>
              </div>

              <select
                className="form-select form-select-sm"
                style={{ width: '140px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="overdue">Overdue</option>
                <option value="received">Received</option>
              </select>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={fetchSchedules}
                title="Refresh Calendar"
              >
                <i className="ri-refresh-line"></i>
              </button>
            </div>
          </div>
        </div>

        {/* View Mode: Month Grid */}
        {viewMode === 'month' && (
          <div className="calendar-grid-container p-0">
            {/* Days of week header */}
            <div className="d-grid text-center py-2 bg-light border-bottom text-muted fw-semibold fs-xs text-uppercase"
                 style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {daysOfWeek.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div
              className="d-grid"
              style={{
                gridTemplateColumns: 'repeat(7, 1fr)',
                minHeight: '620px',
                backgroundColor: '#EFECE6',
                gap: '1px',
              }}
            >
              {calendarCells.map((cell, idx) => {
                const daySchedules = schedulesByDate[cell.dateStr] || []
                return (
                  <div
                    key={idx}
                    className={`calendar-day-cell bg-white p-1.5 d-flex flex-column position-relative ${
                      !cell.isCurrentMonth ? 'opacity-40 bg-light-subtle' : ''
                    } ${cell.isToday ? 'border border-2 border-success' : ''}`}
                    style={{ minHeight: '110px' }}
                  >
                    {/* Date Number & Quick Add */}
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span
                        className={`fs-xs fw-bold rounded-circle d-inline-flex align-items-center justify-content-center ${
                          cell.isToday
                            ? 'bg-success text-white'
                            : cell.isCurrentMonth
                            ? 'text-dark'
                            : 'text-muted'
                        }`}
                        style={{ width: '22px', height: '22px' }}
                      >
                        {cell.dayNum}
                      </span>

                      {cell.isCurrentMonth && (
                        <button
                          type="button"
                          className="btn btn-xs btn-link text-muted p-0 opacity-50 hover-opacity-100 text-decoration-none"
                          onClick={() => handleOpenScheduleForDate(cell.dateStr)}
                          title={`Schedule purchase for ${cell.dateStr}`}
                        >
                          <i className="ri-add-line fs-6"></i>
                        </button>
                      )}
                    </div>

                    {/* Events list */}
                    <div className="d-flex flex-column gap-1 overflow-y-auto flex-grow-1" style={{ maxHeight: '95px' }}>
                      {daySchedules.map((sch) => {
                        const status = sch.computed_status || sch.status
                        const isOverdue = status === 'overdue'
                        const isReceived = status === 'received'

                        let badgeBg = 'bg-primary-subtle text-primary border-primary-subtle'
                        if (isReceived) badgeBg = 'bg-success-subtle text-success border-success-subtle'
                        if (isOverdue) badgeBg = 'bg-danger-subtle text-danger border-danger-subtle'

                        return (
                          <div
                            key={sch.id}
                            className={`calendar-event-pill border rounded-2 px-1.5 py-1 fs-xs text-truncate cursor-pointer shadow-xs d-flex align-items-center justify-content-between ${badgeBg}`}
                            style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                            onClick={() => setSelectedSchedule(sch)}
                            title={`${sch.product_name} • ${sch.quantity} ${sch.unit || 'pcs'} (${sch.supplier_name || 'Supplier'}) - Status: ${status}`}
                          >
                            <span className="fw-semibold text-truncate">
                              {sch.product_name}
                            </span>
                            <span className="badge bg-white text-dark ms-1 flex-shrink-0" style={{ fontSize: '9px' }}>
                              {sch.quantity}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* View Mode: Agenda / List View */}
        {viewMode === 'agenda' && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 fs-sm text-nowrap">
              <thead className="table-light text-muted fs-xs text-uppercase">
                <tr>
                  <th>Expected Date</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Est. Cost</th>
                  <th>Supplier / Source</th>
                  <th>Status</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading schedules…
                    </td>
                  </tr>
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="ri-calendar-event-line fs-1 d-block mb-1"></i>
                      No purchases scheduled for {monthName}.
                    </td>
                  </tr>
                ) : (
                  schedules.map((sch) => {
                    const status = sch.computed_status || sch.status
                    const isOverdue = status === 'overdue'
                    const isReceived = status === 'received'

                    return (
                      <tr key={sch.id}>
                        <td>
                          <div className="fw-bold text-dark">
                            {sch.expected_date_str || sch.expected_date}
                          </div>
                          {isOverdue && (
                            <small className="text-danger fw-semibold d-block fs-xs">
                              <i className="ri-error-warning-line me-0.5"></i> Overdue
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {sch.product_image ? (
                              <img
                                src={sch.product_image}
                                alt=""
                                className="rounded-2 object-fit-cover border"
                                style={{ width: '32px', height: '32px' }}
                              />
                            ) : (
                              <div
                                className="rounded-2 bg-light border d-flex align-items-center justify-content-center text-muted"
                                style={{ width: '32px', height: '32px' }}
                              >
                                <i className="ri-archive-line"></i>
                              </div>
                            )}
                            <div>
                              <span className="fw-bold text-dark">{sch.product_name}</span>
                              {sch.product_sku && (
                                <small className="text-muted font-monospace d-block fs-xs">{sch.product_sku}</small>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="fw-bold text-dark">{sch.quantity}</span> {sch.unit || 'pcs'}
                          {sch.current_stock !== undefined && (
                            <small className="text-muted d-block fs-xs">Current: {sch.current_stock}</small>
                          )}
                        </td>
                        <td className="fw-semibold text-dark">
                          {sch.estimated_cost ? formatNaira(sch.estimated_cost) : '—'}
                        </td>
                        <td>
                          <span className="text-dark fw-medium">{sch.supplier_name || 'Direct Farm'}</span>
                          {sch.notes && (
                            <small className="text-muted d-block fs-xs text-truncate" style={{ maxWidth: '180px' }}>
                              {sch.notes}
                            </small>
                          )}
                        </td>
                        <td>
                          {isReceived ? (
                            <span className="badge bg-success-subtle text-success">
                              <i className="ri-check-line me-0.5"></i> Received
                            </span>
                          ) : isOverdue ? (
                            <span className="badge bg-danger-subtle text-danger">Overdue</span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning-emphasis">Scheduled</span>
                          )}
                        </td>
                        <td className="text-end pe-3">
                          <div className="btn-group btn-group-sm">
                            {!isReceived && (
                              <button
                                type="button"
                                className="btn btn-outline-success d-inline-flex align-items-center gap-1"
                                onClick={() => handleOpenReceive(sch)}
                                title="Receive stock & update inventory"
                              >
                                <i className="ri-checkbox-circle-line"></i>
                                <span>Receive</span>
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => setSelectedSchedule(sch)}
                              title="View details"
                            >
                              <i className="ri-eye-line"></i>
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteSchedule(sch.id)}
                              title="Delete schedule"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Schedule Next Purchase ─────────────────────────── */}
      {scheduleModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-white border-bottom px-4 py-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary-subtle text-primary p-2 rounded-3">
                    <i className="ri-calendar-event-line fs-5"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark font-display mb-0">Schedule Next Purchase</h5>
                    <small className="text-muted">Plan upcoming stock intake or supplier procurement</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setScheduleModalOpen(false)}
                ></button>
              </div>

              <form onSubmit={handleSubmitSchedule}>
                <div className="modal-body p-4 bg-light-subtle">
                  {/* Product Choice */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark fs-sm">Select Product from Catalog</label>
                    <select
                      className="form-select mb-2"
                      value={formData.product_id}
                      onChange={handleProductSelect}
                    >
                      <option value="">— Or type custom product below —</option>
                      {productsList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock ?? 0}, SKU: {p.sku || '—'})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      className="form-control"
                      placeholder="Product name (e.g. Fresh Tomatoes, Yam Tubers)"
                      value={formData.product_name}
                      onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Expected Date & Quantity */}
                  <div className="row g-2 mb-3">
                    <div className="col-7">
                      <label className="form-label fw-semibold text-dark fs-sm">Expected Arrival Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.expected_date}
                        onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-5">
                      <label className="form-label fw-semibold text-dark fs-sm">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        placeholder="e.g. 50"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Unit & Estimated Cost */}
                  <div className="row g-2 mb-3">
                    <div className="col-5">
                      <label className="form-label fw-semibold text-dark fs-sm">Unit</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="kg, pcs, crates"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      />
                    </div>
                    <div className="col-7">
                      <label className="form-label fw-semibold text-dark fs-sm">Estimated Total Cost (₦)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="e.g. 75000"
                        value={formData.estimated_cost}
                        onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Supplier Name */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark fs-sm">Supplier / Farm Source</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Epe Farm Hub, Golden Oil Co."
                      value={formData.supplier_name}
                      onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    />
                  </div>

                  {/* Notes */}
                  <div className="mb-0">
                    <label className="form-label fw-semibold text-dark fs-sm">Notes &amp; Quality Instructions</label>
                    <textarea
                      rows="2"
                      className="form-control"
                      placeholder="e.g. Inspect crate seals upon arrival; store immediately in cold room."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer bg-white border-top px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setScheduleModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Scheduling…
                      </>
                    ) : (
                      <>
                        <i className="ri-calendar-check-line"></i> Save to Calendar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: View Schedule Details ───────────────────────────── */}
      {selectedSchedule && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-white border-bottom px-4 py-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-emerald-subtle text-emerald p-2 rounded-3">
                    <i className="ri-file-list-3-line fs-5"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark font-display mb-0">Restock Details</h5>
                    <small className="text-muted">Schedule #{selectedSchedule.id}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedSchedule(null)}
                ></button>
              </div>

              <div className="modal-body p-4 bg-light-subtle">
                <div className="card border-0 shadow-xs rounded-3 bg-white p-3 mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="fw-bold text-dark mb-0">{selectedSchedule.product_name}</h6>
                    <span
                      className={`badge ${
                        selectedSchedule.status === 'received'
                          ? 'bg-success text-white'
                          : selectedSchedule.computed_status === 'overdue'
                          ? 'bg-danger text-white'
                          : 'bg-warning-subtle text-warning-emphasis'
                      }`}
                    >
                      {selectedSchedule.status === 'received' ? 'Received & Stocked' : selectedSchedule.computed_status || selectedSchedule.status}
                    </span>
                  </div>

                  {selectedSchedule.product_sku && (
                    <div className="text-muted font-monospace fs-xs mb-2">
                      SKU: {selectedSchedule.product_sku}
                    </div>
                  )}

                  <div className="row g-2 text-dark fs-sm mt-1">
                    <div className="col-6">
                      <span className="text-muted fs-xs d-block">Expected Date:</span>
                      <strong>{selectedSchedule.expected_date_str || selectedSchedule.expected_date}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted fs-xs d-block">Quantity:</span>
                      <strong>{selectedSchedule.quantity} {selectedSchedule.unit || 'pcs'}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted fs-xs d-block">Estimated Cost:</span>
                      <strong>{selectedSchedule.estimated_cost ? formatNaira(selectedSchedule.estimated_cost) : '—'}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted fs-xs d-block">Supplier:</span>
                      <strong>{selectedSchedule.supplier_name || 'Direct Farm'}</strong>
                    </div>
                  </div>

                  {selectedSchedule.notes && (
                    <div className="mt-3 pt-2 border-top">
                      <span className="text-muted fs-xs d-block">Notes:</span>
                      <p className="mb-0 fs-sm text-dark fst-italic">{selectedSchedule.notes}</p>
                    </div>
                  )}
                </div>

                {selectedSchedule.status === 'received' && (
                  <div className="alert alert-success d-flex align-items-center gap-2 mb-0">
                    <i className="ri-checkbox-circle-fill fs-5"></i>
                    <div>
                      <strong>Received on {selectedSchedule.received_date_str || selectedSchedule.received_date}</strong>
                      <div className="fs-xs">Quantity: {selectedSchedule.received_quantity || selectedSchedule.quantity} units stocked in.</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-white border-top px-4 py-3 justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                >
                  <i className="ri-delete-bin-line me-1"></i> Delete
                </button>

                <div className="d-flex gap-2">
                  {selectedSchedule.status !== 'received' && (
                    <button
                      type="button"
                      className="btn btn-success btn-sm d-inline-flex align-items-center gap-1"
                      onClick={() => {
                        const s = selectedSchedule
                        setSelectedSchedule(null)
                        handleOpenReceive(s)
                      }}
                    >
                      <i className="ri-check-line"></i> Receive &amp; Stock In
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedSchedule(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Receive & Stock In Confirmation ─────────────────── */}
      {receiveModalSchedule && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-white border-bottom px-4 py-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-success-subtle text-success p-2 rounded-3">
                    <i className="ri-archive-stack-line fs-5"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark font-display mb-0">Receive &amp; Stock In</h5>
                    <small className="text-muted">Increment inventory automatically</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setReceiveModalSchedule(null)}
                ></button>
              </div>

              <div className="modal-body p-4 bg-light-subtle">
                <p className="fs-sm text-dark mb-3">
                  Confirm physical arrival of <strong>{receiveModalSchedule.product_name}</strong>. This action will immediately add the received units to your store inventory and record an audit log in stock movements.
                </p>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark fs-sm">Actual Received Quantity</label>
                  <div className="input-group">
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={receiveQty}
                      onChange={(e) => setReceiveQty(e.target.value)}
                      required
                    />
                    <span className="input-group-text">{receiveModalSchedule.unit || 'pcs'}</span>
                  </div>
                  <small className="text-muted fs-xs">Scheduled quantity: {receiveModalSchedule.quantity}</small>
                </div>

                {warehouses.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark fs-sm">Destination Warehouse</label>
                    <select
                      className="form-select"
                      value={receiveWarehouseId}
                      onChange={(e) => setReceiveWarehouseId(e.target.value)}
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.location || 'Main'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-white border-top px-4 py-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setReceiveModalSchedule(null)}
                  disabled={receivingLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success d-inline-flex align-items-center gap-1.5"
                  onClick={handleConfirmReceive}
                  disabled={receivingLoading}
                >
                  {receivingLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Updating Stock…
                    </>
                  ) : (
                    <>
                      <i className="ri-checkbox-circle-fill"></i> Confirm &amp; Add to Stock
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
