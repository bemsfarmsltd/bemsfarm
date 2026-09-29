import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import ProductSelect from '../../components/ui/ProductSelect'

export default function PurchaseScheduleCalendar() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Current view date & mode
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState('month') // 'month' | 'week' | 'agenda'

  // Data & loading
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'scheduled' | 'overdue' | 'received'
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [quickFilter, setQuickFilter] = useState('all') // 'all' | 'overdue' | 'today' | 'high_value'
  const [searchTerm, setSearchTerm] = useState('')

  // Products list & warehouses for dropdowns
  const [productsList, setProductsList] = useState([])
  const [warehouses, setWarehouses] = useState([])

  // Modal & Drawer states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [dayDrawerDate, setDayDrawerDate] = useState(null) // Date string for slide-over drawer
  const [receiveModalSchedule, setReceiveModalSchedule] = useState(null)
  const [receiveQty, setReceiveQty] = useState('')
  const [receiveWarehouseId, setReceiveWarehouseId] = useState('')
  const [receivingLoading, setReceivingLoading] = useState(false)
  const [dragOverDate, setDragOverDate] = useState(null)

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

  // Fetch products & warehouses for form dropdowns
  useEffect(() => {
    api.get('/admin/products', { params: { limit: 150 } })
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
    if (viewMode === 'week') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7))
    } else {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    }
  }
  const handleNextMonth = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7))
    } else {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    }
  }
  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Extract unique suppliers for filter
  const uniqueSuppliers = useMemo(() => {
    const set = new Set()
    schedules.forEach((s) => {
      if (s.supplier_name && s.supplier_name.trim()) {
        set.add(s.supplier_name.trim())
      }
    })
    return Array.from(set).sort()
  }, [schedules])

  // Filtered schedules for calendar rendering
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (statusFilter !== 'all') {
        const st = s.computed_status || s.status
        if (st !== statusFilter) return false
      }
      if (supplierFilter !== 'all') {
        if ((s.supplier_name || '').trim() !== supplierFilter) return false
      }
      if (quickFilter === 'overdue') {
        const st = s.computed_status || s.status
        if (st !== 'overdue') return false
      } else if (quickFilter === 'high_value') {
        if (Number(s.estimated_cost || 0) < 500000) return false
      } else if (quickFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0]
        const d = s.expected_date_str || (s.expected_date ? s.expected_date.split('T')[0] : '')
        if (d !== todayStr) return false
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const pName = (s.product_name || '').toLowerCase()
        const sName = (s.supplier_name || '').toLowerCase()
        const sku = (s.product_sku || '').toLowerCase()
        const notes = (s.notes || '').toLowerCase()
        if (!pName.includes(q) && !sName.includes(q) && !sku.includes(q) && !notes.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [schedules, statusFilter, supplierFilter, quickFilter, searchTerm])

  // Build Calendar Matrix for Month View
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

  // Build Week View Columns (Sun - Sat)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate)
    const dayOfWeek = curr.getDay()
    const sunday = new Date(curr)
    sunday.setDate(curr.getDate() - dayOfWeek)

    const days = []
    const todayStr = new Date().toISOString().split('T')[0]

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      days.push({
        date: d,
        dateStr,
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        dayNum: d.getDate(),
        monthName: d.toLocaleString('default', { month: 'short' }),
        isToday: dateStr === todayStr,
      })
    }
    return days
  }, [currentDate])

  // Map schedules by dateStr
  const schedulesByDate = useMemo(() => {
    const map = {}
    filteredSchedules.forEach((sch) => {
      const d = sch.expected_date_str || (sch.expected_date ? sch.expected_date.split('T')[0] : '')
      if (!d) return
      if (!map[d]) map[d] = []
      map[d].push(sch)
    })
    return map
  }, [filteredSchedules])

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

  // Drag and drop handler to reschedule item
  const handleDragStart = (e, schedule) => {
    e.dataTransfer.setData('text/plain', String(schedule.id))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, dateStr) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOverDate(null)
  }

  const handleDrop = async (e, targetDateStr) => {
    e.preventDefault()
    setDragOverDate(null)
    const schId = e.dataTransfer.getData('text/plain')
    if (!schId) return

    const schedule = schedules.find((s) => String(s.id) === String(schId))
    if (!schedule) return

    const oldDate = schedule.expected_date_str || (schedule.expected_date ? schedule.expected_date.split('T')[0] : '')
    if (oldDate === targetDateStr) return

    // Optimistic UI update
    setSchedules((prev) =>
      prev.map((s) =>
        String(s.id) === String(schId)
          ? { ...s, expected_date_str: targetDateStr, expected_date: targetDateStr }
          : s
      )
    )

    try {
      await api.patch(`/admin/inventory/schedules/${schId}`, { expected_date: targetDateStr })
      toast.success(`Rescheduled ${schedule.product_name} to ${targetDateStr}`)
    } catch (err) {
      toast.error('Failed to reschedule restock')
      fetchSchedules() // revert
    }
  }

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
      const defaultSelected = items.filter((it) => !it.already_scheduled).map((it) => it.keyId)
      setSelectedPlanKeys(defaultSelected)
    } catch (err) {
      toast.error('Failed to generate restock recommendations')
      console.error(err)
    } finally {
      setAutoPlanLoading(false)
    }
  }

  const handleTogglePlanItem = (keyId) => {
    setSelectedPlanKeys((prev) =>
      prev.includes(keyId) ? prev.filter((k) => k !== keyId) : [...prev, keyId]
    )
  }

  const handleToggleAllPlan = () => {
    if (selectedPlanKeys.length === autoPlanItems.length) {
      setSelectedPlanKeys([])
    } else {
      setSelectedPlanKeys(autoPlanItems.map((it) => it.keyId))
    }
  }

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

  const handleOpenReceive = (schedule) => {
    setReceiveModalSchedule(schedule)
    setReceiveQty(String(schedule.quantity))
    setReceiveWarehouseId(warehouses[0]?.id ? String(warehouses[0].id) : '')
  }

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

  // Export CSV
  const handleExportCSV = () => {
    if (!schedules.length) {
      toast.error('No schedules available to export')
      return
    }
    const headers = ['Schedule ID', 'Product', 'SKU', 'Expected Date', 'Quantity', 'Unit', 'Est Cost (NGN)', 'Supplier', 'Status', 'Notes']
    const rows = schedules.map(s => [
      s.id,
      `"${(s.product_name || '').replace(/"/g, '""')}"`,
      `"${s.product_sku || ''}"`,
      s.expected_date_str || (s.expected_date ? s.expected_date.split('T')[0] : ''),
      s.quantity,
      s.unit || 'pcs',
      s.estimated_cost || 0,
      `"${(s.supplier_name || 'Direct Farm').replace(/"/g, '""')}"`,
      s.computed_status || s.status,
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Bems_Farms_Restock_Schedule_${monthString}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Restock schedule exported to CSV')
  }

  // Print Delivery Checklist
  const handlePrintChecklist = () => {
    window.print()
  }

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Drawer day items
  const drawerItems = dayDrawerDate ? (schedulesByDate[dayDrawerDate] || []) : []
  const drawerTotalUnits = drawerItems.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
  const drawerTotalCost = drawerItems.reduce((sum, s) => sum + Number(s.estimated_cost || 0), 0)

  return (
    <div className="container-fluid py-3 restock-calendar-page">
      {/* Embedded Dynamic Calendar Styles */}
      <style>{`
        .calendar-day-cell {
          transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
        }
        .calendar-day-cell:hover {
          background-color: #FAFAF9 !important;
          z-index: 2;
        }
        .calendar-day-cell.drag-over {
          background-color: #ECFDF5 !important;
          outline: 2px dashed #059669;
          outline-offset: -2px;
        }
        .calendar-event-pill {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .calendar-event-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0,0,0,0.08);
        }
        .calendar-more-pill {
          background-color: #F1F5F9;
          color: #475569;
          border: 1px solid #E2E8F0;
          transition: all 0.15s ease;
        }
        .calendar-more-pill:hover {
          background-color: #E2E8F0;
          color: #1E293B;
          transform: scale(1.02);
        }
        .day-drawer-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(2px);
          z-index: 1045;
          animation: fadeIn 0.2s ease;
        }
        .day-drawer-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 520px;
          max-width: 95vw;
          height: 100vh;
          background: #FFFFFF;
          z-index: 1050;
          box-shadow: -6px 0 30px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .restock-print-area, .restock-print-area * {
            visibility: visible;
          }
          .restock-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Header & Breadcrumb */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 no-print">
        <div>
          <div className="d-flex align-items-center gap-1.5 fs-xs text-muted mb-1">
            <Link to="/inventory/stock" className="text-muted text-decoration-none hover-text-primary">Inventory</Link>
            <i className="ri-arrow-right-s-line fs-10 text-muted"></i>
            <span className="text-dark fw-medium">Restock Calendar</span>
          </div>
          <h4 className="mb-0 fw-bold text-dark font-display d-flex align-items-center gap-2">
            <span>Purchase &amp; Restock Calendar</span>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-xs py-1 px-2 fw-medium rounded-pill">
              Interactive Planner
            </span>
          </h4>
          <small className="text-muted">
            Intelligent supplier deliveries, drag-and-drop scheduling, and automated inventory intake
          </small>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="btn-group btn-group-sm bg-white p-0.5 rounded-3 border shadow-xs">
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'month' ? 'btn-primary shadow-xs' : 'btn-light border-0 text-muted'}`}
              onClick={() => setViewMode('month')}
            >
              <i className="ri-calendar-line me-1"></i> Month
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'week' ? 'btn-primary shadow-xs' : 'btn-light border-0 text-muted'}`}
              onClick={() => setViewMode('week')}
            >
              <i className="ri-calendar-2-line me-1"></i> Week
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'agenda' ? 'btn-primary shadow-xs' : 'btn-light border-0 text-muted'}`}
              onClick={() => setViewMode('agenda')}
            >
              <i className="ri-list-check-2 me-1"></i> Agenda / List
            </button>
          </div>

          {/* Export & Print */}
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className="btn btn-outline-secondary d-flex align-items-center gap-1 bg-white"
              onClick={handleExportCSV}
              title="Export schedules to Excel / CSV"
            >
              <i className="ri-download-2-line"></i>
              <span className="d-none d-md-inline">Export</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary d-flex align-items-center gap-1 bg-white"
              onClick={handlePrintChecklist}
              title="Print delivery intake sheet"
            >
              <i className="ri-printer-line"></i>
              <span className="d-none d-md-inline">Print Sheet</span>
            </button>
          </div>

          {/* Auto-Plan Reorder Button */}
          <button
            type="button"
            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1.5 shadow-xs bg-white py-1.5 px-3"
            onClick={handleOpenAutoPlan}
            title="Auto-analyze low stock & sales velocity to draft calendar restocks"
          >
            <i className="ri-flashlight-line text-warning fs-5"></i>
            <span className="fw-semibold">Auto-Schedule Restock</span>
          </button>

          {/* Schedule Next Purchase Button */}
          <button
            type="button"
            className="btn btn-sm btn-primary d-flex align-items-center gap-1.5 shadow-sm py-1.5 px-3"
            onClick={() => {
              const tomorrow = new Date()
              tomorrow.setDate(tomorrow.getDate() + 1)
              handleOpenScheduleForDate(tomorrow.toISOString().split('T')[0])
            }}
          >
            <i className="ri-add-line fs-5"></i>
            <span className="fw-semibold">Schedule Next Purchase</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="row g-3 mb-3.5 no-print">
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
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden restock-print-area">
        {/* Navigation & Controls Toolbar */}
        <div className="card-header bg-white border-bottom p-3 no-print">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            {/* Date Navigator */}
            <div className="d-flex align-items-center gap-2">
              <div className="btn-group btn-group-sm border rounded-2 shadow-2xs">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handlePrevMonth}
                  title={viewMode === 'week' ? "Previous Week" : "Previous Month"}
                >
                  <i className="ri-arrow-left-s-line"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-light fw-bold px-2.5"
                  onClick={handleToday}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleNextMonth}
                  title={viewMode === 'week' ? "Next Week" : "Next Month"}
                >
                  <i className="ri-arrow-right-s-line"></i>
                </button>
              </div>

              <h5 className="fw-bold font-display text-dark mb-0 ms-1">
                {viewMode === 'week' 
                  ? `Week of ${weekDays[0].monthName} ${weekDays[0].dayNum} – ${weekDays[6].monthName} ${weekDays[6].dayNum}, ${currentYear}`
                  : monthName
                }
              </h5>

              {/* Drag instruction badge */}
              <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-1 fs-11 fw-normal d-none d-lg-inline-flex align-items-center gap-1">
                <i className="ri-drag-drop-line"></i> Drag items between days to reschedule
              </span>
            </div>

            {/* Filters */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="position-relative" style={{ minWidth: '180px' }}>
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  placeholder="Filter product, supplier…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted fs-xs"></i>
              </div>

              {/* Status Filter */}
              <select
                className="form-select form-select-sm"
                style={{ width: '135px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="overdue">Overdue</option>
                <option value="received">Received</option>
              </select>

              {/* Supplier Filter */}
              {uniqueSuppliers.length > 0 && (
                <select
                  className="form-select form-select-sm"
                  style={{ width: '150px' }}
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                >
                  <option value="all">All Suppliers ({uniqueSuppliers.length})</option>
                  {uniqueSuppliers.map((sup) => (
                    <option key={sup} value={sup}>{sup}</option>
                  ))}
                </select>
              )}

              {/* Refresh Button */}
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

          {/* Quick Filter Badges */}
          <div className="d-flex align-items-center gap-1.5 mt-2.5 pt-2 border-top">
            <span className="text-muted fs-11 text-uppercase fw-semibold me-1">Quick Filters:</span>
            <button
              type="button"
              className={`btn btn-xs rounded-pill px-2.5 ${quickFilter === 'all' ? 'btn-dark' : 'btn-light border text-muted'}`}
              onClick={() => setQuickFilter('all')}
            >
              All Items ({filteredSchedules.length})
            </button>
            <button
              type="button"
              className={`btn btn-xs rounded-pill px-2.5 ${quickFilter === 'today' ? 'btn-success' : 'btn-light border text-muted'}`}
              onClick={() => setQuickFilter(quickFilter === 'today' ? 'all' : 'today')}
            >
              <i className="ri-calendar-check-line me-1"></i> Today's Deliveries
            </button>
            <button
              type="button"
              className={`btn btn-xs rounded-pill px-2.5 ${quickFilter === 'overdue' ? 'btn-danger' : 'btn-light border text-muted'}`}
              onClick={() => setQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue')}
            >
              <i className="ri-alert-line me-1"></i> Critical / Overdue ({stats.overdueCount})
            </button>
            <button
              type="button"
              className={`btn btn-xs rounded-pill px-2.5 ${quickFilter === 'high_value' ? 'btn-primary' : 'btn-light border text-muted'}`}
              onClick={() => setQuickFilter(quickFilter === 'high_value' ? 'all' : 'high_value')}
            >
              <i className="ri-funds-line me-1"></i> High Value (&gt;₦500k)
            </button>
          </div>
        </div>

        {/* ── VIEW 1: MONTH GRID (Anti-Clutter with +X more clustering) ── */}
        {viewMode === 'month' && (
          <div className="calendar-grid-container p-0">
            {/* Days of week header */}
            <div
              className="d-grid text-center py-2 bg-light border-bottom text-muted fw-bold fs-xs text-uppercase tracking-wider"
              style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
            >
              {daysOfWeek.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div
              className="d-grid"
              style={{
                gridTemplateColumns: 'repeat(7, 1fr)',
                minHeight: '660px',
                backgroundColor: '#E5E7EB',
                gap: '1px',
              }}
            >
              {calendarCells.map((cell, idx) => {
                const daySchedules = schedulesByDate[cell.dateStr] || []
                const isOver = dragOverDate === cell.dateStr
                const dayTotalCost = daySchedules.reduce((sum, s) => sum + Number(s.estimated_cost || 0), 0)
                const dayTotalQty = daySchedules.reduce((sum, s) => sum + Number(s.quantity || 0), 0)

                // Clustering: show top 3, rest in "+X more" pill
                const visibleItems = daySchedules.slice(0, 3)
                const hiddenCount = daySchedules.length - 3

                return (
                  <div
                    key={idx}
                    className={`calendar-day-cell bg-white p-2 d-flex flex-column position-relative cursor-pointer ${
                      !cell.isCurrentMonth ? 'opacity-40 bg-light-subtle' : ''
                    } ${cell.isToday ? 'border border-2 border-success bg-success bg-opacity-5' : ''} ${
                      isOver ? 'drag-over' : ''
                    }`}
                    style={{ minHeight: '125px' }}
                    onDragOver={(e) => handleDragOver(e, cell.dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, cell.dateStr)}
                    onClick={() => {
                      if (daySchedules.length > 0) {
                        setDayDrawerDate(cell.dateStr)
                      } else if (cell.isCurrentMonth) {
                        handleOpenScheduleForDate(cell.dateStr)
                      }
                    }}
                  >
                    {/* Date Number, Daily Summary & Quick Add */}
                    <div className="d-flex justify-content-between align-items-center mb-1.5 flex-wrap gap-1">
                      <div className="d-flex align-items-center gap-1.5">
                        <span
                          className={`fs-xs fw-bold rounded-circle d-inline-flex align-items-center justify-content-center shadow-2xs ${
                            cell.isToday
                              ? 'bg-success text-white'
                              : cell.isCurrentMonth
                              ? 'text-dark'
                              : 'text-muted'
                          }`}
                          style={{ width: '24px', height: '24px' }}
                        >
                          {cell.dayNum}
                        </span>

                        {/* Daily Total Summary Badge if items exist */}
                        {daySchedules.length > 0 && (
                          <span
                            className="badge bg-light text-dark border border-gray-200 fs-10 py-0.5 px-1.5 fw-semibold d-none d-md-inline-block text-truncate"
                            title={`Total: ${dayTotalQty} units (₦${dayTotalCost.toLocaleString()})`}
                            style={{ maxWidth: '85px' }}
                          >
                            {dayTotalCost > 0 ? `₦${Math.round(dayTotalCost / 1000)}k` : `${dayTotalQty}u`}
                          </span>
                        )}
                      </div>

                      {cell.isCurrentMonth && (
                        <button
                          type="button"
                          className="btn btn-xs btn-link text-muted p-0 opacity-50 hover-opacity-100 text-decoration-none"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenScheduleForDate(cell.dateStr)
                          }}
                          title={`Schedule purchase for ${cell.dateStr}`}
                        >
                          <i className="ri-add-line fs-6"></i>
                        </button>
                      )}
                    </div>

                    {/* Events list: Top 3 items */}
                    <div className="d-flex flex-column gap-1 flex-grow-1 overflow-hidden">
                      {visibleItems.map((sch) => {
                        const status = sch.computed_status || sch.status
                        const isOverdue = status === 'overdue'
                        const isReceived = status === 'received'

                        let badgeClasses = 'bg-primary-subtle text-primary border-primary-subtle'
                        if (isReceived) badgeClasses = 'bg-success-subtle text-success border-success-subtle'
                        if (isOverdue) badgeClasses = 'bg-danger-subtle text-danger border-danger-subtle'

                        return (
                          <div
                            key={sch.id}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, sch)}
                            className={`calendar-event-pill border rounded-2 px-1.5 py-0.5 fs-xs text-truncate d-flex align-items-center justify-content-between ${badgeClasses}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedSchedule(sch)
                            }}
                            title={`${sch.product_name} • ${sch.quantity} ${sch.unit || 'pcs'} (${sch.supplier_name || 'Supplier'}) - Drag to reschedule`}
                          >
                            <span className="fw-semibold text-truncate me-1" style={{ fontSize: '11px' }}>
                              {sch.product_name}
                            </span>
                            <span className="badge bg-white text-dark shadow-2xs flex-shrink-0" style={{ fontSize: '9.5px', padding: '1px 4px' }}>
                              {sch.quantity}
                            </span>
                          </div>
                        )
                      })}

                      {/* +X More Clustering Pill */}
                      {hiddenCount > 0 && (
                        <div
                          className="calendar-more-pill rounded-2 py-0.5 px-1.5 fs-10 fw-bold text-center cursor-pointer mt-auto"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDayDrawerDate(cell.dateStr)
                          }}
                          title={`Click to view all ${daySchedules.length} restocks on this day`}
                        >
                          +{hiddenCount} more ({daySchedules.slice(3).reduce((sum, s) => sum + Number(s.quantity || 0), 0)} units)
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── VIEW 2: WEEK VIEW (Wide, High-Detail 7-Column Planner) ── */}
        {viewMode === 'week' && (
          <div className="week-grid-container p-0">
            {/* 7 Columns */}
            <div
              className="d-grid"
              style={{
                gridTemplateColumns: 'repeat(7, 1fr)',
                minHeight: '620px',
                backgroundColor: '#E5E7EB',
                gap: '1px',
              }}
            >
              {weekDays.map((colDay, cIdx) => {
                const daySchedules = schedulesByDate[colDay.dateStr] || []
                const isOver = dragOverDate === colDay.dateStr
                const colTotalCost = daySchedules.reduce((sum, s) => sum + Number(s.estimated_cost || 0), 0)
                const colTotalUnits = daySchedules.reduce((sum, s) => sum + Number(s.quantity || 0), 0)

                return (
                  <div
                    key={cIdx}
                    className={`bg-white d-flex flex-column ${
                      colDay.isToday ? 'bg-success bg-opacity-5' : ''
                    } ${isOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => handleDragOver(e, colDay.dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, colDay.dateStr)}
                    style={{ minHeight: '600px' }}
                  >
                    {/* Column Header */}
                    <div className={`p-2.5 border-bottom text-center ${colDay.isToday ? 'bg-success text-white' : 'bg-light text-dark'}`}>
                      <div className="fs-xs fw-bold text-uppercase opacity-75">{colDay.dayName}</div>
                      <div className="fs-5 fw-bolder font-display">{colDay.dayNum} {colDay.monthName}</div>
                      <div className="d-flex justify-content-between align-items-center mt-1 pt-1 border-top border-white border-opacity-25 fs-11">
                        <span>{daySchedules.length} Items</span>
                        <strong className="font-monospace">{colTotalUnits} Units</strong>
                      </div>
                      <button
                        type="button"
                        className={`btn btn-xs w-100 mt-1.5 d-flex align-items-center justify-content-center gap-1 ${
                          colDay.isToday ? 'btn-light text-success fw-bold' : 'btn-outline-primary bg-white'
                        }`}
                        onClick={() => handleOpenScheduleForDate(colDay.dateStr)}
                      >
                        <i className="ri-add-line"></i> Schedule
                      </button>
                    </div>

                    {/* Column Items */}
                    <div className="p-2 d-flex flex-column gap-2 flex-grow-1 overflow-y-auto" style={{ maxHeight: '600px' }}>
                      {daySchedules.length === 0 ? (
                        <div className="text-center text-muted fs-xs py-4 opacity-50 fst-italic">
                          No restocks planned
                        </div>
                      ) : (
                        daySchedules.map((sch) => {
                          const status = sch.computed_status || sch.status
                          const isReceived = status === 'received'
                          const isOverdue = status === 'overdue'

                          return (
                            <div
                              key={sch.id}
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, sch)}
                              className="card border rounded-3 shadow-2xs p-2.5 bg-white position-relative hover-shadow cursor-pointer"
                              onClick={() => setSelectedSchedule(sch)}
                            >
                              <div className="d-flex align-items-start justify-content-between gap-1 mb-1">
                                <span className="fw-bold text-dark fs-xs text-truncate" title={sch.product_name}>
                                  {sch.product_name}
                                </span>
                                <span
                                  className={`badge ${
                                    isReceived
                                      ? 'bg-success-subtle text-success'
                                      : isOverdue
                                      ? 'bg-danger-subtle text-danger'
                                      : 'bg-primary-subtle text-primary'
                                  }`}
                                  style={{ fontSize: '9px' }}
                                >
                                  {isReceived ? 'Received' : isOverdue ? 'Overdue' : 'Scheduled'}
                                </span>
                              </div>

                              <div className="d-flex align-items-center justify-content-between fs-xs text-muted mb-1.5">
                                <span>{sch.quantity} {sch.unit || 'pcs'}</span>
                                <strong className="text-dark font-monospace">
                                  {sch.estimated_cost ? formatNaira(sch.estimated_cost) : '—'}
                                </strong>
                              </div>

                              {sch.supplier_name && (
                                <div className="fs-10 text-muted text-truncate mb-2">
                                  <i className="ri-store-2-line me-1"></i>{sch.supplier_name}
                                </div>
                              )}

                              <div className="d-flex gap-1 mt-auto">
                                {!isReceived && (
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-outline-success flex-grow-1 d-flex align-items-center justify-content-center gap-1 py-1"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenReceive(sch)
                                    }}
                                  >
                                    <i className="ri-checkbox-circle-line"></i> Receive
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-xs btn-light border text-muted px-2 py-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedSchedule(sch)
                                  }}
                                  title="View Details"
                                >
                                  <i className="ri-eye-line"></i>
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── VIEW 3: AGENDA / LIST VIEW ── */}
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
                    <td colSpan="7" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2"></div>
                      Loading scheduled purchases…
                    </td>
                  </tr>
                ) : filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="ri-calendar-event-line fs-2 d-block mb-2 opacity-50"></i>
                      No purchases scheduled for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((sch) => {
                    const status = sch.computed_status || sch.status
                    const isReceived = status === 'received'
                    const isOverdue = status === 'overdue'

                    return (
                      <tr key={sch.id}>
                        <td>
                          <span className="fw-bold font-monospace text-dark">
                            {sch.expected_date_str || (sch.expected_date ? sch.expected_date.split('T')[0] : '—')}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="avatar size-8 bg-light rounded-2 d-flex align-items-center justify-content-center text-primary fw-bold">
                              <i className="ri-shopping-basket-line"></i>
                            </div>
                            <div>
                              <strong className="text-dark d-block">{sch.product_name}</strong>
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

      {/* ── SLIDE-OVER DAY INSPECTOR DRAWER ────────────────────────── */}
      {dayDrawerDate && (
        <>
          <div className="day-drawer-backdrop" onClick={() => setDayDrawerDate(null)}></div>
          <div className="day-drawer-panel">
            {/* Drawer Header */}
            <div className="p-3.5 border-bottom bg-light d-flex align-items-center justify-content-between">
              <div>
                <span className="badge bg-primary text-white text-uppercase fs-10 tracking-wider mb-1">
                  Day Schedule Inspector
                </span>
                <h5 className="mb-0 fw-bold font-display text-dark">
                  {new Date(dayDrawerDate).toLocaleDateString('default', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setDayDrawerDate(null)}
              ></button>
            </div>

            {/* Drawer Stats Summary */}
            <div className="p-3 bg-white border-bottom">
              <div className="row g-2 text-center">
                <div className="col-4">
                  <div className="p-2 rounded-3 bg-light border">
                    <small className="text-muted fs-xs d-block">Scheduled</small>
                    <strong className="fs-5 text-dark font-display">{drawerItems.length}</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded-3 bg-light border">
                    <small className="text-muted fs-xs d-block">Total Units</small>
                    <strong className="fs-5 text-primary font-display">{drawerTotalUnits.toLocaleString()}</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded-3 bg-light border">
                    <small className="text-muted fs-xs d-block">Est. Outlay</small>
                    <strong className="fs-6 text-success font-monospace">₦{Math.round(drawerTotalCost).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 mt-2.5">
                <button
                  type="button"
                  className="btn btn-sm btn-primary flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                  onClick={() => {
                    handleOpenScheduleForDate(dayDrawerDate)
                  }}
                >
                  <i className="ri-add-line"></i> Add Item for this Date
                </button>
              </div>
            </div>

            {/* Drawer Items List */}
            <div className="p-3 overflow-y-auto flex-grow-1 d-flex flex-column gap-2 bg-light-subtle">
              {drawerItems.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="ri-inbox-line fs-1 d-block mb-2 opacity-50"></i>
                  No purchases scheduled on this date.
                </div>
              ) : (
                drawerItems.map((item) => {
                  const status = item.computed_status || item.status
                  const isReceived = status === 'received'
                  const isOverdue = status === 'overdue'

                  return (
                    <div key={item.id} className="card border rounded-3 p-3 bg-white shadow-2xs">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h6 className="fw-bold text-dark mb-0.5">{item.product_name}</h6>
                          {item.product_sku && (
                            <span className="text-muted font-monospace fs-xs">SKU: {item.product_sku}</span>
                          )}
                        </div>
                        <span
                          className={`badge ${
                            isReceived
                              ? 'bg-success text-white'
                              : isOverdue
                              ? 'bg-danger text-white'
                              : 'bg-warning-subtle text-warning-emphasis'
                          }`}
                        >
                          {isReceived ? 'Received & Stocked' : isOverdue ? 'Overdue' : 'Scheduled'}
                        </span>
                      </div>

                      <div className="row g-2 fs-xs text-muted mb-2 py-1.5 px-2 bg-light rounded-2">
                        <div className="col-6">
                          Quantity: <strong className="text-dark">{item.quantity} {item.unit || 'pcs'}</strong>
                        </div>
                        <div className="col-6 text-end">
                          Est. Cost: <strong className="text-dark font-monospace">{item.estimated_cost ? formatNaira(item.estimated_cost) : '—'}</strong>
                        </div>
                        <div className="col-12">
                          Supplier: <strong className="text-dark">{item.supplier_name || 'Direct Farm'}</strong>
                        </div>
                      </div>

                      {item.notes && (
                        <div className="fs-xs text-muted mb-2 fst-italic">
                          "{item.notes}"
                        </div>
                      )}

                      <div className="d-flex justify-content-between align-items-center pt-2 border-top gap-2">
                        {!isReceived ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
                            onClick={() => {
                              handleOpenReceive(item)
                            }}
                          >
                            <i className="ri-checkbox-circle-line"></i> Receive into Stock
                          </button>
                        ) : (
                          <span className="text-success fs-xs fw-semibold">
                            <i className="ri-checkbox-circle-fill me-1"></i> Stocked In ({item.received_date_str || item.received_date})
                          </span>
                        )}

                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setSelectedSchedule(item)}
                            title="Edit / View Details"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteSchedule(item.id)}
                            title="Delete"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

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
                          <thead className="table-light fs-xs text-uppercase text-muted sticky-top">
                            <tr>
                              <th style={{ width: '40px' }}></th>
                              <th>Product</th>
                              <th>Current Stock</th>
                              <th>Safety Min</th>
                              <th style={{ width: '130px' }}>Target Date</th>
                              <th style={{ width: '110px' }}>Restock Qty</th>
                              <th style={{ width: '160px' }}>Supplier</th>
                              <th className="text-end pe-3">Est. Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {autoPlanItems.map((item) => {
                              const isChecked = selectedPlanKeys.includes(item.keyId)
                              return (
                                <tr key={item.keyId} className={isChecked ? 'table-primary-subtle' : ''}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={isChecked}
                                      onChange={() => handleTogglePlanItem(item.keyId)}
                                    />
                                  </td>
                                  <td>
                                    <div className="fw-semibold text-dark">{item.product_name}</div>
                                    <small className="text-muted font-monospace fs-xs">{item.sku}</small>
                                  </td>
                                  <td>
                                    <span className="badge bg-danger-subtle text-danger fw-bold">
                                      {item.current_stock} {item.unit || 'pcs'}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="text-muted fs-xs">{item.min_stock_threshold || 10}</span>
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
                                    <input
                                      type="number"
                                      min="1"
                                      className="form-control form-control-sm"
                                      value={item.quantity}
                                      onChange={(e) => handleUpdatePlanItem(item.keyId, 'quantity', e.target.value)}
                                      disabled={!isChecked}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={item.supplier_name || ''}
                                      placeholder="Supplier"
                                      onChange={(e) => handleUpdatePlanItem(item.keyId, 'supplier_name', e.target.value)}
                                      disabled={!isChecked}
                                    />
                                  </td>
                                  <td className="text-end pe-3 font-monospace fw-semibold text-dark">
                                    {formatNaira(item.estimated_cost)}
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
              <div className="modal-footer bg-white border-top px-4 py-3 justify-content-between">
                <span className="text-muted fs-xs">
                  {selectedPlanKeys.length} of {autoPlanItems.length} recommendations selected
                </span>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setAutoPlanModalOpen(false)}
                    disabled={autoPlanSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary d-inline-flex align-items-center gap-1.5"
                    onClick={handleExecuteAutoPlan}
                    disabled={autoPlanSubmitting || selectedPlanKeys.length === 0}
                  >
                    {autoPlanSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Scheduling…
                      </>
                    ) : (
                      <>
                        <i className="ri-calendar-check-line"></i> Confirm &amp; Place on Calendar ({selectedPlanKeys.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
