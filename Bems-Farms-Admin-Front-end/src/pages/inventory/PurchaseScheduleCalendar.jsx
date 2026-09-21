import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import ProductSelect from '../../components/ui/ProductSelect'

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

  // Auto-Plan state
  const [autoPlanModalOpen, setAutoPlanModalOpen] = useState(false)
  const [autoPlanLoading, setAutoPlanLoading] = useState(false)
  const [autoPlanItems, setAutoPlanItems] = useState([])
  const [selectedPlanKeys, setSelectedPlanKeys] = useState([])
  const [autoPlanSubmitting, setAutoPlanSubmitting] = useState(false)

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
  const handleProductSelect = (selectedId, foundProduct, event) => {
    const id = typeof selectedId === 'object' && selectedId?.target ? selectedId.target.value : selectedId
    if (!id && !foundProduct) {
      const customName = event?.target?.value || ''
      setFormData((prev) => ({ ...prev, product_id: '', product_name: customName }))
      return
    }
    const found = foundProduct || productsList.find((p) => String(p.id) === String(id))
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

  // Open & Fetch Auto-Plan Recommendations
  const handleOpenAutoPlan = async () => {
    setAutoPlanLoading(true)
    setAutoPlanModalOpen(true)
    try {
      const res = await api.get('/admin/inventory/schedules/auto-plan', {
        params: { month: monthString },
      })
      const items = (res.data?.recommendations || []).map((it, idx) => ({
        ...it,
        keyId: `${it.product_id || idx}-${Date.now()}-${idx}`,
        quantity: it.suggested_quantity,
        expected_date: it.expected_date,
        supplier_name: it.supplier_name,
        estimated_cost: it.estimated_cost,
      }))
      setAutoPlanItems(items)
      // Auto-select all items that are not already scheduled
      const defaultSelected = items.filter((it) => !it.already_scheduled).map((it) => it.keyId)
      setSelectedPlanKeys(defaultSelected)
    } catch (err) {
      toast.error('Failed to generate restock recommendations')
      console.error(err)
    } finally {
      setAutoPlanLoading(false)
    }
  }

  // Toggle individual item in auto-plan
  const handleTogglePlanItem = (keyId) => {
    setSelectedPlanKeys((prev) =>
      prev.includes(keyId) ? prev.filter((k) => k !== keyId) : [...prev, keyId]
    )
  }

  // Toggle select all in auto-plan
  const handleToggleAllPlan = () => {
    if (selectedPlanKeys.length === autoPlanItems.length) {
      setSelectedPlanKeys([])
    } else {
      setSelectedPlanKeys(autoPlanItems.map((it) => it.keyId))
    }
  }

  // Update a field inside an auto-plan recommendation item
  const handleUpdatePlanItem = (keyId, field, value) => {
    setAutoPlanItems((prev) =>
      prev.map((it) => {
        if (it.keyId !== keyId) return it
        const updated = { ...it, [field]: value }
        if (field === 'quantity') {
          const qty = parseInt(value) || 0
          updated.estimated_cost = Math.round(qty * (it.unit_cost || 0))
        }
        return updated
      })
    )
  }

  // Execute and place auto-plan items on calendar
  const handleExecuteAutoPlan = async () => {
    const itemsToSchedule = autoPlanItems.filter((it) => selectedPlanKeys.includes(it.keyId))
    if (!itemsToSchedule.length) {
      toast.error('Please select at least one item to schedule')
      return
    }

    setAutoPlanSubmitting(true)
    try {
      const res = await api.post('/admin/inventory/schedules/auto-generate', {
        items: itemsToSchedule,
      })
      toast.success(res.data?.message || `Scheduled ${itemsToSchedule.length} restocks on calendar!`)
      setAutoPlanModalOpen(false)
      fetchSchedules()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to auto-schedule restocks')
    } finally {
      setAutoPlanSubmitting(false)
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
            className="btn btn-outline-primary d-flex align-items-center gap-1.5 shadow-xs bg-white"
            onClick={handleOpenAutoPlan}
            title="Auto-analyze low stock & sales velocity to draft calendar restocks"
          >
            <i className="ri-flashlight-line text-warning"></i>
            <span className="fw-semibold">Auto-Schedule Restock</span>
          </button>

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
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Upcoming Schedules',
            value: stats.totalScheduledCount,
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-calendar-todo-line',
            subLeft: 'Active Schedules',
            subRight: 'Planned Restock'
          },
          {
            label: 'Incoming Units',
            value: stats.totalUnits.toLocaleString(),
            glow: 'bg-card-glow-blue',
            iconBg: '#EFF6FF',
            iconColor: '#2563EB',
            icon: 'ri-truck-line',
            subLeft: 'Produce & SKUs',
            subRight: `${stats.totalUnits} Units`
          },
          {
            label: 'Est. Procurement Cost',
            value: formatNaira(stats.totalEstimatedCost),
            glow: 'bg-card-glow-teal',
            iconBg: '#F0FDFA',
            iconColor: '#0D9488',
            icon: 'ri-money-cny-box-line',
            subLeft: 'Current Month Outlay',
            subRight: 'Budget Value'
          },
          {
            label: 'Overdue Deliveries',
            value: stats.overdueCount,
            glow: stats.overdueCount > 0 ? 'bg-card-glow-red' : 'bg-card-glow-slate',
            iconBg: stats.overdueCount > 0 ? '#FFF1F2' : '#F8FAFC',
            iconColor: stats.overdueCount > 0 ? '#E11D48' : '#64748B',
            icon: 'ri-alarm-warning-line',
            subLeft: 'Supplier Delay',
            subRight: stats.overdueCount > 0 ? `${stats.overdueCount} Critical` : 'On Schedule'
          },
          {
            label: 'Received & Stocked',
            value: stats.receivedCount,
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-checkbox-circle-line',
            subLeft: 'Warehouse Intake',
            subRight: `${stats.receivedCount} Batches`
          },
        ].map((c) => (
          <div className="col-12 col-sm-6 col-xl" key={c.label}>
            <div className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow}`}>
              <div className="card-body p-3.5">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2" title={c.label}>
                    {c.label}
                  </span>
                  <span className="kpi-icon-pill" style={{ background: c.iconBg, color: c.iconColor }}>
                    <i className={`${c.icon} fs-18`}></i>
                  </span>
                </div>
                <div className="fs-22 fw-bolder text-dark mb-1 font-display text-truncate">
                  {c.value}
                </div>
                <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                  <span className="text-truncate me-2">{c.subLeft}</span>
                  <strong className="text-dark font-monospace flex-shrink-0">{c.subRight}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
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
                    <label className="form-label fw-semibold text-dark fs-sm">
                      Select or Search Product <span className="text-danger">*</span>
                    </label>
                    <ProductSelect
                      products={productsList}
                      value={formData.product_id}
                      onChange={handleProductSelect}
                      placeholder="Type name, SKU, scan barcode, or select from list..."
                      allowCustom={true}
                      required
                    />
                    {!formData.product_id && formData.product_name && (
                      <small className="text-muted d-block mt-1">
                        Custom product: <strong>{formData.product_name}</strong>
                      </small>
                    )}
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
                      <i className="ri-check-line"></i> Receive &amp; Restock
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

      {/* ── MODAL: Receive & Restock Confirmation ─────────────────── */}
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
                    <h5 className="modal-title fw-bold text-dark font-display mb-0">Receive &amp; Restock</h5>
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

      {/* ── Auto-Restock Planner Modal ── */}
      {autoPlanModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden">
              {/* Header */}
              <div className="modal-header bg-dark text-white px-4 py-3 border-0">
                <div className="d-flex align-items-center gap-2.5">
                  <div className="avatar size-9 bg-warning bg-opacity-20 text-warning rounded-3 d-flex align-items-center justify-content-center">
                    <i className="ri-flashlight-fill fs-4"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-white mb-0 font-display">
                      Auto-Schedule Restock Planner
                    </h5>
                    <small className="text-white text-opacity-75">
                      Analyzes safety thresholds and sales velocity to generate optimized delivery dates
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setAutoPlanModalOpen(false)}
                  disabled={autoPlanSubmitting}
                ></button>
              </div>

              {/* Body */}
              <div className="modal-body p-4 bg-light-subtle">
                {autoPlanLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-3"></div>
                    <div className="fw-semibold text-dark">Scanning Catalog &amp; Forecasting Restocks…</div>
                    <small className="text-muted">Evaluating safety stock, runout rates, and supplier lead times</small>
                  </div>
                ) : autoPlanItems.length === 0 ? (
                  <div className="text-center py-5 bg-white rounded-3 border shadow-xs">
                    <i className="ri-checkbox-circle-line fs-1 text-success d-block mb-2"></i>
                    <h6 className="fw-bold text-dark">All Stock Levels Optimal!</h6>
                    <p className="text-muted mb-0">No items are currently below safety thresholds or out of stock.</p>
                  </div>
                ) : (
                  <>
                    {/* Top Summary KPI row */}
                    <div className="row g-3 mb-3">
                      <div className="col-md-4">
                        <div className="card border-0 shadow-xs rounded-3 p-3 bg-white">
                          <small className="text-muted text-uppercase fw-semibold fs-xs">Low / Out of Stock</small>
                          <div className="fs-4 fw-bold text-danger">{autoPlanItems.length} SKUs</div>
                          <small className="text-muted">Requiring warehouse restock</small>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card border-0 shadow-xs rounded-3 p-3 bg-white">
                          <small className="text-muted text-uppercase fw-semibold fs-xs">Selected for Calendar</small>
                          <div className="fs-4 fw-bold text-primary">{selectedPlanKeys.length} items</div>
                          <small className="text-muted">Ready to place on calendar</small>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card border-0 shadow-xs rounded-3 p-3 bg-white">
                          <small className="text-muted text-uppercase fw-semibold fs-xs">Est. Procurement Outlay</small>
                          <div className="fs-4 fw-bold text-success">
                            ₦{autoPlanItems
                              .filter((it) => selectedPlanKeys.includes(it.keyId))
                              .reduce((sum, it) => sum + (it.estimated_cost || 0), 0)
                              .toLocaleString()}
                          </div>
                          <small className="text-muted">Anticipated supplier expenditure</small>
                        </div>
                      </div>
                    </div>

                    {/* Table of items */}
                    <div className="card border shadow-xs rounded-3 overflow-hidden bg-white">
                      <div className="card-header bg-white py-2.5 px-3 d-flex align-items-center justify-content-between">
                        <div className="form-check mb-0">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="selectAllPlan"
                            checked={selectedPlanKeys.length === autoPlanItems.length && autoPlanItems.length > 0}
                            onChange={handleToggleAllPlan}
                          />
                          <label className="form-check-label fw-semibold fs-sm cursor-pointer" htmlFor="selectAllPlan">
                            Select All ({autoPlanItems.length})
                          </label>
                        </div>
                        <span className="text-muted fs-xs">
                          💡 You can adjust target dates or quantities before confirming.
                        </span>
                      </div>

                      <div className="table-responsive" style={{ maxHeight: '420px' }}>
                        <table className="table table-hover align-middle mb-0 fs-sm">
                          <thead className="table-light text-muted fs-xs text-uppercase sticky-top">
                            <tr>
                              <th style={{ width: 40 }}></th>
                              <th>Product</th>
                              <th>Stock Status</th>
                              <th style={{ width: 150 }}>Arrival Date</th>
                              <th style={{ width: 110 }}>Restock Qty</th>
                              <th style={{ width: 130 }}>Est. Outlay</th>
                              <th>Supplier</th>
                            </tr>
                          </thead>
                          <tbody>
                            {autoPlanItems.map((item) => {
                              const isChecked = selectedPlanKeys.includes(item.keyId)
                              const isCritical = item.current_stock <= 0

                              return (
                                <tr key={item.keyId} className={isChecked ? '' : 'opacity-60 bg-light-subtle'}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={isChecked}
                                      onChange={() => handleTogglePlanItem(item.keyId)}
                                    />
                                  </td>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      {item.image_url ? (
                                        <img
                                          src={item.image_url}
                                          alt={item.product_name}
                                          style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6 }}
                                          onError={(e) => (e.target.style.display = 'none')}
                                        />
                                      ) : (
                                        <div className="rounded bg-light text-muted d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                          <i className="ri-box-3-line"></i>
                                        </div>
                                      )}
                                      <div>
                                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: 220 }}>
                                          {item.product_name}
                                        </div>
                                        <small className="text-muted">SKU: {item.sku}</small>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      className={`badge ${
                                        isCritical
                                          ? 'bg-danger-subtle text-danger border border-danger-subtle'
                                          : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                      }`}
                                    >
                                      {isCritical ? '0 Stock Outage' : `${item.current_stock} left (Min: ${item.reorder_threshold})`}
                                    </span>
                                  </td>
                                  <td>
                                    <input
                                      type="date"
                                      className="form-control form-control-sm"
                                      value={item.expected_date}
                                      onChange={(e) => handleUpdatePlanItem(item.keyId, 'expected_date', e.target.value)}
                                      disabled={!isChecked}
                                    />
                                  </td>
                                  <td>
                                    <div className="input-group input-group-sm">
                                      <input
                                        type="number"
                                        className="form-control text-center"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdatePlanItem(item.keyId, 'quantity', e.target.value)}
                                        disabled={!isChecked}
                                      />
                                      <span className="input-group-text fs-xs">{item.unit || 'pcs'}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="fw-semibold text-dark">
                                      ₦{(item.estimated_cost || 0).toLocaleString()}
                                    </div>
                                    <small className="text-muted">@ ₦{Math.round(item.unit_cost || 0)}/unit</small>
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={item.supplier_name}
                                      onChange={(e) => handleUpdatePlanItem(item.keyId, 'supplier_name', e.target.value)}
                                      disabled={!isChecked}
                                    />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="modal-footer bg-white border-top px-4 py-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setAutoPlanModalOpen(false)}
                  disabled={autoPlanSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary d-inline-flex align-items-center gap-2 px-4 shadow-sm"
                  onClick={handleExecuteAutoPlan}
                  disabled={autoPlanSubmitting || selectedPlanKeys.length === 0}
                >
                  {autoPlanSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Scheduling Restocks…
                    </>
                  ) : (
                    <>
                      <i className="ri-calendar-check-fill"></i>
                      <span>Place Selected ({selectedPlanKeys.length}) on Calendar</span>
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
