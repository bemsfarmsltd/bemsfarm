import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'
import ThermalReceipt, { printThermalReceipt } from '../../components/ui/ThermalReceipt'
import { useAuth } from '../../context/AuthContext'
import {
  isDirectPrinterSupported,
  isPrinterConnected,
  connectUsbPrinter,
  connectSerialPrinter,
  disconnectDirectPrinter,
  autoReconnectDirectPrinter,
  testPrintDirect,
  getConnectedPrinterInfo
} from '../../lib/escpos'

const BLANK = {
  store_name: 'Bems Farms Ltd',
  store_phone: '+234 800 236 7326',
  store_email: 'info@bemsfarms.com',
  store_address: 'Abia State, Nigeria',
  store_logo_url: '/bemsfarms_logo.png',
  store_tax_id: '',
  store_registration_number: '',
  pos_receipt_tagline: 'Fresh food. Trusted quality.',
  pos_receipt_website: 'bemsfarms.com',
  pos_receipt_header: 'SALES RECEIPT',
  pos_receipt_footer: 'Thank you for shopping with us',
  pos_receipt_return_note: 'Keep this receipt for returns',
  pos_receipt_paper_size: '80',
  pos_receipt_code_type: 'qr',
  pos_receipt_show_logo: 'true',
  pos_receipt_show_phone: 'true',
  pos_receipt_show_email: 'false',
  pos_receipt_show_sku: 'true',
  pos_receipt_show_barcode: 'false',
  pos_print_receipt: 'true',
  pos_low_stock_threshold: '',
  receipt_pos_title: 'POS SALES RECEIPT',
  receipt_pos_footer: 'Thank you for shopping with us',
  receipt_online_title: 'ONLINE ORDER RECEIPT',
  receipt_online_footer: 'Thank you for your order',
  receipt_refund_title: 'REFUND / RETURN RECEIPT',
  receipt_refund_footer: 'Your return has been recorded',
  receipt_stock_title: 'STOCK RECEIVING SLIP',
  receipt_stock_footer: 'Goods received and recorded',
  receipt_payment_title: 'PAYMENT RECEIPT',
  receipt_payment_footer: 'Payment received with thanks',
  receipt_invoice_title: 'SALES INVOICE',
  receipt_invoice_footer: 'Thank you for your business',
}

const GENERAL_KEYS = ['store_name', 'store_phone', 'store_email', 'store_address', 'store_logo_url', 'store_tax_id', 'store_registration_number']

const SAMPLE_ITEMS = [
  { id: 1, name: 'Bems Premium Palm Oil 1L', sku: 'BEMS-OIL-1L', qty: 2, price: 3500, total: 7000 },
  { id: 2, name: 'Fresh Farm Eggs (Crate)', sku: 'BEMS-EGG-CRATE', qty: 1, price: 5800, total: 5800 },
]

const RECEIPT_TYPES = [
  { key: 'pos', label: 'POS Sale', icon: 'ri-shopping-cart-2-line' },
  { key: 'online', label: 'Online Order', icon: 'ri-global-line' },
  { key: 'refund', label: 'Refund / Return', icon: 'ri-arrow-go-back-line' },
  { key: 'payment', label: 'Payment', icon: 'ri-bank-card-line' },
  { key: 'stock', label: 'Stock Slip', icon: 'ri-inbox-archive-line' },
  { key: 'invoice', label: 'Invoice', icon: 'ri-file-list-3-line' },
]

export default function POSSettings() {
  const { user } = useAuth()
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('branding') // 'branding' | 'options' | 'templates' | 'hardware' | 'all'
  const [receiptType, setReceiptType] = useState('pos')
  const [directConnected, setDirectConnected] = useState(isPrinterConnected())
  const [printerInfo, setPrinterInfo] = useState(getConnectedPrinterInfo())
  const [directBusy, setDirectBusy] = useState(false)
  const [testBarcode, setTestBarcode] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testSearching, setTestSearching] = useState(false)
  const [showKioskGuide, setShowKioskGuide] = useState(false)

  const fld = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const isOn = (key) => form[key] !== 'false'

  async function handleTestBarcodeScan(code) {
    const raw = String(code || '').trim()
    if (!raw) return
    setTestSearching(true)
    setTestResult(null)
    try {
      const res = await api.get(`/admin/pos/products?barcode=${encodeURIComponent(raw)}`)
      const found = res?.data?.products?.[0]
      if (found) {
        setTestResult({ status: 'found', product: found, code: raw })
        toast.success(`Matched: ${found.name}`)
      } else {
        setTestResult({ status: 'not_found', code: raw })
        toast.error(`Barcode "${raw}" is not yet linked to any product`)
      }
    } catch (err) {
      setTestResult({ status: 'error', error: err?.message, code: raw })
    } finally {
      setTestSearching(false)
    }
  }

  useEffect(() => {
    Promise.all([api.get('/admin/settings/general'), api.get('/admin/settings/pos')])
      .then(([general, pos]) => setForm((current) => ({ ...current, ...general.data.settings, ...pos.data.settings })))
      .catch(() => toast.error('Failed to load receipt settings'))
      .finally(() => setLoading(false))

    autoReconnectDirectPrinter()
      .then((connected) => {
        setDirectConnected(connected)
        setPrinterInfo(getConnectedPrinterInfo())
      })
      .catch(() => {})
  }, [])

  async function handleConnectUsb() {
    setDirectBusy(true)
    try {
      const res = await connectUsbPrinter()
      if (res?.connected) {
        setDirectConnected(true)
        setPrinterInfo(getConnectedPrinterInfo())
        toast.success(`Connected to ${res.name || 'USB Thermal Printer'}!`)
      }
    } catch (err) {
      toast.error(err?.message || 'No USB device selected or permission denied')
    } finally {
      setDirectBusy(false)
    }
  }

  async function handleConnectSerial() {
    setDirectBusy(true)
    try {
      const res = await connectSerialPrinter()
      if (res?.connected) {
        setDirectConnected(true)
        setPrinterInfo(getConnectedPrinterInfo())
        toast.success('Connected to Serial/COM Thermal Printer!')
      }
    } catch (err) {
      toast.error(err?.message || 'No COM port selected or permission denied')
    } finally {
      setDirectBusy(false)
    }
  }

  async function handleDisconnectPrinter() {
    setDirectBusy(true)
    try {
      await disconnectDirectPrinter()
      setDirectConnected(false)
      setPrinterInfo(null)
      toast.success('Direct printer disconnected')
    } catch (err) {
      toast.error('Error disconnecting printer')
    } finally {
      setDirectBusy(false)
    }
  }

  async function handleTestDirectPrint() {
    setDirectBusy(true)
    try {
      await testPrintDirect()
      toast.success('Test receipt sent to physical printer!')
    } catch (err) {
      toast.error(err?.message || 'Direct test print failed. Ensure printer is connected.')
    } finally {
      setDirectBusy(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    const general = Object.fromEntries(GENERAL_KEYS.map((key) => [key, form[key]]))
    const pos = Object.fromEntries(Object.entries(form).filter(([key]) => !GENERAL_KEYS.includes(key)))
    try {
      const [generalResult, posResult] = await Promise.all([
        api.post('/admin/settings/general', general),
        api.post('/admin/settings/pos', pos),
      ])
      setForm((current) => ({ ...current, ...generalResult.data.settings, ...posResult.data.settings }))
      toast.success('POS & Receipt configuration saved successfully!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
        Loading POS configuration…
      </div>
    )
  }

  const toggleItems = [
    { key: 'pos_receipt_show_logo', title: 'Store Logo', desc: 'Print corporate logo on receipt apex', icon: 'ri-image-line' },
    { key: 'pos_receipt_show_phone', title: 'Support Phone', desc: 'Display helpline contact numbers', icon: 'ri-phone-line' },
    { key: 'pos_receipt_show_email', title: 'Support Email', desc: 'Display official customer support email', icon: 'ri-mail-line' },
    { key: 'pos_receipt_show_sku', title: 'Item SKU Codes', desc: 'Print inventory SKU under product titles', icon: 'ri-price-tag-3-line' },
    { key: 'pos_print_receipt', title: 'Auto-Print on Tender', desc: 'Trigger printer automatically on sale completion', icon: 'ri-printer-line' },
  ]

  return (
    <div className="container-fluid pb-5">
      <SettingsTabs />

      {/* Modern Compact Action Header */}
      <div className="card shadow-sm border-0 mb-4 bg-white rounded-3 overflow-hidden">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-3 text-white flex-shrink-0"
                style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
              >
                <i className="ri-printer-cloud-line fs-3"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h5 className="mb-0 fw-bold text-dark">POS &amp; Thermal Receipt Studio</h5>
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 fs-11 font-monospace">
                    {form.pos_receipt_paper_size}mm Mode
                  </span>
                  {directConnected ? (
                    <span className="badge bg-success text-white px-2 py-0.5 fs-11">
                      ● USB/COM Paired
                    </span>
                  ) : (
                    <span className="badge bg-light text-muted border px-2 py-0.5 fs-11">
                      Browser Printing
                    </span>
                  )}
                </div>
                <p className="text-muted small mb-0 mt-0.5">
                  Configure store identity, thermal slip formats, and checkout hardware with real-time preview.
                </p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 px-3"
                onClick={() => printThermalReceipt()}
                title="Print test receipt via browser"
              >
                <i className="ri-printer-line text-dark"></i>
                <span className="d-none d-sm-inline">Test Browser Print</span>
              </button>
              <button
                type="button"
                className="btn btn-success d-flex align-items-center gap-2 px-4 shadow-sm fw-semibold"
                disabled={saving}
                onClick={handleSave}
              >
                <i className={saving ? 'ri-loader-4-line ri-spin' : 'ri-save-3-line'}></i>
                {saving ? 'Saving Changes…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 align-items-start">
        {/* Left Column: Configuration Controls with Clean Sub-Navigation */}
        <div className="col-xl-7">

          {/* Section Selector Tabs */}
          <div className="card shadow-sm border-0 mb-3 bg-white">
            <div className="card-body p-2">
              <div className="d-flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                <button
                  type="button"
                  onClick={() => setActiveSection('branding')}
                  className={`btn btn-sm px-3 py-2 rounded-2 d-flex align-items-center gap-2 text-nowrap fw-medium transition-all ${
                    activeSection === 'branding'
                      ? 'btn-emerald text-white shadow-sm'
                      : 'btn-light border-0 text-secondary'
                  }`}
                  style={activeSection === 'branding' ? { backgroundColor: '#059669', borderColor: '#059669' } : {}}
                >
                  <i className="ri-store-2-line"></i> Store Identity
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('options')}
                  className={`btn btn-sm px-3 py-2 rounded-2 d-flex align-items-center gap-2 text-nowrap fw-medium transition-all ${
                    activeSection === 'options'
                      ? 'btn-emerald text-white shadow-sm'
                      : 'btn-light border-0 text-secondary'
                  }`}
                  style={activeSection === 'options' ? { backgroundColor: '#059669', borderColor: '#059669' } : {}}
                >
                  <i className="ri-layout-masonry-line"></i> Layout &amp; Switches
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('templates')}
                  className={`btn btn-sm px-3 py-2 rounded-2 d-flex align-items-center gap-2 text-nowrap fw-medium transition-all ${
                    activeSection === 'templates'
                      ? 'btn-emerald text-white shadow-sm'
                      : 'btn-light border-0 text-secondary'
                  }`}
                  style={activeSection === 'templates' ? { backgroundColor: '#059669', borderColor: '#059669' } : {}}
                >
                  <i className="ri-file-text-line"></i> Receipt Headers
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('hardware')}
                  className={`btn btn-sm px-3 py-2 rounded-2 d-flex align-items-center gap-2 text-nowrap fw-medium transition-all ${
                    activeSection === 'hardware'
                      ? 'btn-emerald text-white shadow-sm'
                      : 'btn-light border-0 text-secondary'
                  }`}
                  style={activeSection === 'hardware' ? { backgroundColor: '#059669', borderColor: '#059669' } : {}}
                >
                  <i className="ri-cpu-line"></i> Hardware &amp; Scanners
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('all')}
                  className={`btn btn-sm px-3 py-2 rounded-2 d-flex align-items-center gap-1.5 text-nowrap fw-medium ms-auto transition-all ${
                    activeSection === 'all'
                      ? 'btn-dark text-white shadow-sm'
                      : 'btn-light border-0 text-muted'
                  }`}
                >
                  <i className="ri-list-check"></i> View All
                </button>
              </div>
            </div>
          </div>

          {/* 1. Store Identity & Legal Branding */}
          {(activeSection === 'branding' || activeSection === 'all') && (
            <div className="card shadow-sm border mb-4 rounded-3 overflow-hidden">
              <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
                <i className="ri-store-3-line text-success fs-5"></i>
                <div>
                  <h6 className="mb-0 fw-bold text-dark">Store Identity &amp; Receipt Header Information</h6>
                  <small className="text-muted">Business credentials rendered at the top of every physical customer receipt.</small>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark mb-1">Business / Store Name</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><i className="ri-building-line"></i></span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Bems Farms Ltd"
                        value={form.store_name || ''}
                        onChange={(e) => fld('store_name', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark mb-1">Tagline / Slogan</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><i className="ri-chat-quote-line"></i></span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Fresh food. Trusted quality."
                        value={form.pos_receipt_tagline || ''}
                        onChange={(e) => fld('pos_receipt_tagline', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark mb-1">RC / Registration Number</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><i className="ri-shield-check-line"></i></span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0 font-monospace"
                        placeholder="e.g. 1849204"
                        value={form.store_registration_number || ''}
                        onChange={(e) => fld('store_registration_number', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark mb-1">Tax Identification (TIN)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><i className="ri-file-shield-line"></i></span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0 font-monospace"
                        placeholder="Optional tax ID"
                        value={form.store_tax_id || ''}
                        onChange={(e) => fld('store_tax_id', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-dark mb-1">Support Phone</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><i className="ri-phone-line"></i></span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="+234 800 236 7326"
                        value={form.store_phone || ''}
                        onChange={(e) => fld('store_phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-dark mb-1">Support Email</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><i className="ri-mail-line"></i></span>
                      <input
                        type="email"
                        className="form-control border-start-0 ps-0"
                        placeholder="info@bemsfarms.com"
                        value={form.store_email || ''}
                        onChange={(e) => fld('store_email', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-dark mb-1">Store Website</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><i className="ri-global-line"></i></span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="bemsfarms.com"
                        value={form.pos_receipt_website || ''}
                        onChange={(e) => fld('pos_receipt_website', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold text-dark mb-1">Store Physical Address</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><i className="ri-map-pin-line"></i></span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Central Farm Settlement Hub, Umuahia, Abia State"
                        value={form.store_address || ''}
                        onChange={(e) => fld('store_address', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold text-dark mb-1">Returns &amp; Refund Policy Note</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><i className="ri-arrow-go-back-line"></i></span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Keep this receipt for returns within 7 days. Fresh perishables checked on delivery."
                        value={form.pos_receipt_return_note || ''}
                        onChange={(e) => fld('pos_receipt_return_note', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Receipt Layout & Display Switches */}
          {(activeSection === 'options' || activeSection === 'all') && (
            <div className="card shadow-sm border mb-4 rounded-3 overflow-hidden">
              <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
                <i className="ri-layout-masonry-line text-success fs-5"></i>
                <div>
                  <h6 className="mb-0 fw-bold text-dark">Paper Format &amp; Display Rules</h6>
                  <small className="text-muted">Choose your printer paper width and toggle fields visible on customer slips.</small>
                </div>
              </div>
              <div className="card-body p-4">
                {/* Paper Size Cards */}
                <div className="mb-4">
                  <label className="form-label small fw-semibold text-dark mb-2">Thermal Paper Width</label>
                  <div className="row g-3">
                    <div className="col-sm-6">
                      <div
                        onClick={() => fld('pos_receipt_paper_size', '80')}
                        className={`p-3 rounded-3 border transition-all cursor-pointer ${
                          form.pos_receipt_paper_size === '80'
                            ? 'border-success bg-success-subtle shadow-sm'
                            : 'bg-white hover-bg-light'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-dark d-flex align-items-center gap-1.5">
                            <i className="ri-file-paper-2-line text-success fs-5"></i> 80 mm Wide
                          </span>
                          <span className="badge bg-success text-white">Recommended</span>
                        </div>
                        <p className="small text-muted mb-0">Standard countertop printers (Epson, Sunmi, Xprinter). Spacious layout with complete details.</p>
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div
                        onClick={() => fld('pos_receipt_paper_size', '58')}
                        className={`p-3 rounded-3 border transition-all cursor-pointer ${
                          form.pos_receipt_paper_size === '58'
                            ? 'border-success bg-success-subtle shadow-sm'
                            : 'bg-white hover-bg-light'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-dark d-flex align-items-center gap-1.5">
                            <i className="ri-file-paper-line text-secondary fs-5"></i> 58 mm Compact
                          </span>
                          <span className="badge bg-light text-dark border">Narrow</span>
                        </div>
                        <p className="small text-muted mb-0">Pocket Bluetooth &amp; mobile delivery belt printers. Condensed layout to prevent paper overflow.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Low Stock Threshold Field */}
                <div className="p-3 bg-light rounded-3 border mb-4">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                      <div className="fw-semibold text-dark small">POS Low Stock Warning Threshold</div>
                      <small className="text-muted">Cashier screen highlights products when stock reaches or drops below this count.</small>
                    </div>
                    <div style={{ maxWidth: 120 }}>
                      <div className="input-group input-group-sm">
                        <input
                          type="number"
                          min="0"
                          className="form-control text-center fw-bold"
                          placeholder="5"
                          value={form.pos_low_stock_threshold || ''}
                          onChange={(e) => fld('pos_low_stock_threshold', e.target.value)}
                        />
                        <span className="input-group-text bg-white text-muted">units</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Single Scannable Code Selector (One Code Policy) */}
                <div className="mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label className="form-label small fw-semibold text-dark mb-0">Receipt Scannable Code (Choose 1 Only)</label>
                    <span className="badge bg-emerald-50 text-success border border-success-subtle px-2 py-0.5" style={{ fontSize: 11 }}>
                      Single Code Policy
                    </span>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <div
                        onClick={() => {
                          fld('pos_receipt_code_type', 'qr')
                          fld('pos_receipt_show_barcode', 'false')
                        }}
                        className={`p-3 rounded-3 border h-100 transition-all ${
                          (form.pos_receipt_code_type || 'qr') === 'qr'
                            ? 'border-success bg-success-subtle shadow-sm'
                            : 'bg-white hover-bg-light'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-dark d-flex align-items-center gap-1.5 small">
                            <i className="ri-qr-code-line text-success fs-5"></i> QR Code
                          </span>
                          {(form.pos_receipt_code_type || 'qr') === 'qr' && (
                            <span className="badge bg-success text-white">Active</span>
                          )}
                        </div>
                        <p className="small text-muted mb-0" style={{ fontSize: 11 }}>
                          Customer verification QR code. Scannable with any smartphone camera to check order authenticity online.
                        </p>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div
                        onClick={() => {
                          fld('pos_receipt_code_type', 'barcode')
                          fld('pos_receipt_show_barcode', 'true')
                        }}
                        className={`p-3 rounded-3 border h-100 transition-all ${
                          form.pos_receipt_code_type === 'barcode'
                            ? 'border-success bg-success-subtle shadow-sm'
                            : 'bg-white hover-bg-light'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-dark d-flex align-items-center gap-1.5 small">
                            <i className="ri-barcode-line text-success fs-5"></i> 1D Barcode
                          </span>
                          {form.pos_receipt_code_type === 'barcode' && (
                            <span className="badge bg-success text-white">Active</span>
                          )}
                        </div>
                        <p className="small text-muted mb-0" style={{ fontSize: 11 }}>
                          Code-128 linear barcode. Scannable with handheld retail laser barcode guns for fast returns lookup.
                        </p>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div
                        onClick={() => {
                          fld('pos_receipt_code_type', 'none')
                          fld('pos_receipt_show_barcode', 'false')
                        }}
                        className={`p-3 rounded-3 border h-100 transition-all ${
                          form.pos_receipt_code_type === 'none'
                            ? 'border-success bg-success-subtle shadow-sm'
                            : 'bg-white hover-bg-light'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-dark d-flex align-items-center gap-1.5 small">
                            <i className="ri-prohibited-line text-secondary fs-5"></i> No Code
                          </span>
                          {form.pos_receipt_code_type === 'none' && (
                            <span className="badge bg-secondary text-white">Active</span>
                          )}
                        </div>
                        <p className="small text-muted mb-0" style={{ fontSize: 11 }}>
                          Clean text-only receipt footer. Saves vertical paper length on compact 58mm thermal rolls.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modern Toggle Tiles Grid */}
                <label className="form-label small fw-semibold text-dark mb-2">Display Elements On Receipt</label>
                <div className="row g-2">
                  {toggleItems.map((item) => {
                    const enabled = isOn(item.key)
                    return (
                      <div className="col-md-6" key={item.key}>
                        <div
                          onClick={() => fld(item.key, enabled ? 'false' : 'true')}
                          className={`p-3 rounded-3 border d-flex align-items-center justify-content-between transition-all cursor-pointer ${
                            enabled ? 'bg-white border-success-subtle' : 'bg-light text-muted'
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="d-flex align-items-center gap-2.5">
                            <div
                              className={`rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 ${
                                enabled ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-muted'
                              }`}
                              style={{ width: 34, height: 34 }}
                            >
                              <i className={`${item.icon} fs-5`}></i>
                            </div>
                            <div>
                              <div className={`fw-semibold small ${enabled ? 'text-dark' : 'text-muted'}`}>{item.title}</div>
                              <div className="text-muted" style={{ fontSize: 11 }}>{item.desc}</div>
                            </div>
                          </div>
                          <div className="form-check form-switch m-0 ms-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={enabled}
                              onChange={() => {}}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. Receipt Headers & Footers By Type */}
          {(activeSection === 'templates' || activeSection === 'all') && (
            <div className="card shadow-sm border mb-4 rounded-3 overflow-hidden">
              <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
                <i className="ri-file-text-line text-success fs-5"></i>
                <div>
                  <h6 className="mb-0 fw-bold text-dark">Custom Titles &amp; Footers (By Transaction Type)</h6>
                  <small className="text-muted">Fine-tune the headline badge and goodbye note printed for each transaction category.</small>
                </div>
              </div>
              <div className="card-body p-4">
                {/* Horizontal Segmented Selector */}
                <div className="d-flex flex-wrap gap-1.5 mb-4 p-1.5 bg-light rounded-3 border">
                  {RECEIPT_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t.key}
                      onClick={() => setReceiptType(t.key)}
                      className={`btn btn-sm rounded-2 d-flex align-items-center gap-1.5 flex-grow-1 justify-content-center py-1.5 ${
                        receiptType === t.key
                          ? 'btn-success text-white shadow-sm fw-bold'
                          : 'btn-light border-0 text-muted'
                      }`}
                    >
                      <i className={t.icon}></i>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-light-subtle border rounded-3">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="badge bg-success-subtle text-success border border-success-subtle font-monospace px-2.5 py-1">
                      Editing: {RECEIPT_TYPES.find((t) => t.key === receiptType)?.label} Template
                    </span>
                    <small className="text-muted">Changes appear instantly in the live preview</small>
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Header Banner Title
                      </label>
                      <input
                        className="form-control"
                        placeholder="e.g. POS SALES RECEIPT"
                        value={form[`receipt_${receiptType}_title`] || ''}
                        onChange={(e) => fld(`receipt_${receiptType}_title`, e.target.value)}
                      />
                      <small className="text-muted" style={{ fontSize: 11 }}>
                        Printed in bold capital letters directly below store branding.
                      </small>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Footer Sign-Off Message
                      </label>
                      <input
                        className="form-control"
                        placeholder="e.g. Thank you for shopping with us!"
                        value={form[`receipt_${receiptType}_footer`] || ''}
                        onChange={(e) => fld(`receipt_${receiptType}_footer`, e.target.value)}
                      />
                      <small className="text-muted" style={{ fontSize: 11 }}>
                        Printed above the scannable code at the base of the receipt.
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Hardware & Scanner Diagnostics */}
          {(activeSection === 'hardware' || activeSection === 'all') && (
            <div className="card shadow-sm border mb-4 rounded-3 overflow-hidden">
              <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-cpu-line text-success fs-5"></i>
                  <div>
                    <h6 className="mb-0 fw-bold text-dark">Checkout Hardware &amp; Barcode Peripherals</h6>
                    <small className="text-muted">Direct USB/Serial ESC-POS printing and handheld barcode scanner diagnostics.</small>
                  </div>
                </div>
                {directConnected ? (
                  <span className="badge bg-success text-white">● Hardware Online</span>
                ) : (
                  <span className="badge bg-secondary-subtle text-secondary border">○ WebUSB Ready</span>
                )}
              </div>
              <div className="card-body p-4">
                {/* Printer Pairing Card */}
                <div className="border rounded-3 p-3.5 mb-3 bg-light">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                      <div className="fw-bold text-dark d-flex align-items-center gap-2">
                        <i className="ri-printer-line text-primary fs-5"></i>
                        Direct Thermal Printer Connection
                      </div>
                      <p className="text-muted small mb-0 mt-0.5">
                        {directConnected
                          ? `Currently paired to ${printerInfo?.name || 'ESC/POS Printer'} via WebUSB/WebSerial.`
                          : 'Pair desktop USB or COM thermal receipt printers for silent, instant printing without OS print dialogs.'}
                      </p>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {!directConnected ? (
                        <>
                          <button
                            type="button"
                            disabled={directBusy}
                            onClick={handleConnectUsb}
                            className="btn btn-sm btn-success d-inline-flex align-items-center gap-1.5 shadow-sm"
                          >
                            <i className="ri-usb-line"></i> Pair USB Printer
                          </button>
                          <button
                            type="button"
                            disabled={directBusy}
                            onClick={handleConnectSerial}
                            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1.5"
                          >
                            <i className="ri-cpu-line"></i> Serial / COM
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={directBusy}
                            onClick={handleTestDirectPrint}
                            className="btn btn-sm btn-success d-inline-flex align-items-center gap-1.5 shadow-sm"
                          >
                            <i className="ri-printer-line"></i> Print Raw Test
                          </button>
                          <button
                            type="button"
                            disabled={directBusy}
                            onClick={handleDisconnectPrinter}
                            className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1.5"
                          >
                            <i className="ri-shut-down-line"></i> Disconnect
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Barcode Scanner Quick Test */}
                <div className="border rounded-3 p-3.5 mb-3 bg-white">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="fw-semibold text-dark small d-flex align-items-center gap-1.5">
                      <i className="ri-barcode-box-line text-success fs-5"></i> Barcode Scanner Diagnostic Test
                    </div>
                    <span className="text-muted font-monospace" style={{ fontSize: 11 }}>Auto-listens for USB/BT Scanners</span>
                  </div>
                  <div className="input-group mb-2">
                    <span className="input-group-text bg-light text-muted border-end-0"><i className="ri-barcode-line text-primary"></i></span>
                    <input
                      type="text"
                      className="form-control border-start-0 ps-0 font-monospace"
                      placeholder="Scan or type barcode here and press Enter..."
                      value={testBarcode}
                      autoComplete="off"
                      onChange={(e) => setTestBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Tab') {
                          e.preventDefault()
                          if (testBarcode.trim()) handleTestBarcodeScan(testBarcode.trim())
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={testSearching || !testBarcode.trim()}
                      onClick={() => handleTestBarcodeScan(testBarcode.trim())}
                      className="btn btn-primary px-3 fw-semibold"
                    >
                      {testSearching ? 'Checking…' : 'Test Lookup'}
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`p-2.5 rounded border small ${
                        testResult.status === 'found'
                          ? 'bg-success-subtle border-success-subtle text-success'
                          : 'bg-warning-subtle border-warning-subtle text-dark'
                      }`}
                    >
                      {testResult.status === 'found' && testResult.product && (
                        <div className="d-flex align-items-center justify-content-between">
                          <span>
                            <strong>✓ Matched Product:</strong> {testResult.product.name} (SKU: {testResult.product.sku})
                          </span>
                          <strong className="text-success fs-6">₦{Number(testResult.product.price || 0).toLocaleString()}</strong>
                        </div>
                      )}
                      {testResult.status === 'not_found' && (
                        <div className="d-flex align-items-center justify-content-between">
                          <span>Scanned <code>{testResult.code}</code> — Barcode not linked to any product yet</span>
                          <a href="/admin/inventory/barcode" className="text-primary fw-medium text-decoration-underline">Manage Barcodes →</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Kiosk Mode Tip Drawer */}
                <div className="border rounded-3 p-3 bg-light">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-dark fw-medium d-flex align-items-center justify-content-between w-100 text-decoration-none"
                    onClick={() => setShowKioskGuide(!showKioskGuide)}
                  >
                    <span className="d-flex align-items-center gap-1.5 text-muted small">
                      <i className="ri-information-line text-info fs-5"></i>
                      {showKioskGuide ? 'Hide' : 'Show'} zero-click silent POS kiosk printing tips
                    </span>
                    <i className={`ri-arrow-${showKioskGuide ? 'up' : 'down'}-s-line text-muted`}></i>
                  </button>

                  {showKioskGuide && (
                    <div className="mt-3 pt-3 border-top small text-muted">
                      <p className="mb-2">
                        For physical counter terminals, launch Google Chrome or Microsoft Edge with the <code>--kiosk-printing</code> flag to bypass system print dialogs:
                      </p>
                      <div className="font-monospace bg-dark text-light p-2.5 rounded border" style={{ fontSize: 11 }}>
                        chrome.exe --kiosk-printing --app=https://www.bemsfarms.com/admin/pos
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Authentic Countertop POS Printer & Thermal Paper Preview */}
        <div className="col-xl-5">
          <div className="position-sticky" style={{ top: 84 }}>
            {/* POS Terminal Machine Chassis */}
            <div
              className="rounded-4 overflow-hidden shadow-lg border"
              style={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
              }}
            >
              {/* Printer Head Control Header */}
              <div
                className="px-3.5 py-3 border-bottom d-flex align-items-center justify-content-between"
                style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="rounded-circle d-inline-block shadow-sm"
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: '#10b981',
                      boxShadow: '0 0 8px #10b981',
                    }}
                  />
                  <span className="font-monospace text-white fw-bold" style={{ fontSize: 12, letterSpacing: 0.5 }}>
                    BEMS THERMAL ENGINE
                  </span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span
                    className="badge font-monospace px-2 py-1"
                    style={{ backgroundColor: '#0f172a', color: '#94a3b8', border: '1px solid #334155', fontSize: 11 }}
                  >
                    203 DPI · {form.pos_receipt_paper_size}mm
                  </span>
                </div>
              </div>

              {/* Receipt Template Quick Selector Bar */}
              <div
                className="px-3 py-2 d-flex align-items-center justify-content-between gap-1 overflow-x-auto border-bottom"
                style={{ backgroundColor: '#141e33', borderColor: '#1e293b', scrollbarWidth: 'none' }}
              >
                {RECEIPT_TYPES.slice(0, 4).map((t) => (
                  <button
                    type="button"
                    key={t.key}
                    onClick={() => setReceiptType(t.key)}
                    className={`btn btn-sm py-1 px-2.5 rounded-pill text-nowrap font-monospace ${
                      receiptType === t.key
                        ? 'btn-success text-white fw-bold'
                        : 'text-light opacity-75 hover-opacity-100 bg-transparent'
                    }`}
                    style={{ fontSize: 11 }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Realistic Printer Slot & Paper Feed Area */}
              <div
                className="p-4 d-flex flex-column align-items-center"
                style={{
                  backgroundColor: '#0a0f1d',
                  minHeight: 460,
                  backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Paper Exit Feed Slot */}
                <div
                  className="rounded-pill mb-1"
                  style={{
                    width: form.pos_receipt_paper_size === '58' ? 240 : 310,
                    height: 7,
                    backgroundColor: '#020617',
                    border: '1px solid #1e293b',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)',
                  }}
                />

                {/* Serrated Paper Tear Edge */}
                <div
                  style={{
                    width: form.pos_receipt_paper_size === '58' ? 230 : 300,
                    height: 5,
                    backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 4px, transparent 4px, transparent 8px)',
                    opacity: 0.8,
                  }}
                />

                {/* Live Thermal Receipt Component */}
                <div
                  className="thermal-receipt-preview shadow-2xl rounded-bottom"
                  style={{
                    maxWidth: form.pos_receipt_paper_size === '58' ? 240 : 310,
                    backgroundColor: '#ffffff',
                    borderTop: 'none',
                    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))',
                  }}
                >
                  <ThermalReceipt
                    settings={form}
                    receiptType={receiptType}
                    receiptNumber="BF-PREVIEW-001"
                    date="14 Sep 2026 · 12:30"
                    customer="Walk-in Customer"
                    channel="POS Terminal"
                    cashier={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name : 'Cashier'}
                    items={SAMPLE_ITEMS}
                    subtotal={12800}
                    tax={960}
                    total={13760}
                    paymentMethod="Cash"
                    amountTendered={15000}
                    change={1240}
                  />
                </div>
              </div>

              {/* Chassis Bottom Footer & Quick Actions */}
              <div
                className="p-3 border-top d-flex align-items-center justify-content-between"
                style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
              >
                <div className="text-muted small d-flex align-items-center gap-1.5" style={{ fontSize: 11 }}>
                  <i className="ri-refresh-line"></i> Live updates active
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light d-flex align-items-center gap-1"
                    onClick={() => fld('pos_receipt_paper_size', form.pos_receipt_paper_size === '80' ? '58' : '80')}
                    style={{ fontSize: 11 }}
                  >
                    Switch to {form.pos_receipt_paper_size === '80' ? '58mm' : '80mm'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-success fw-semibold d-flex align-items-center gap-1"
                    onClick={() => printThermalReceipt()}
                    style={{ fontSize: 11 }}
                  >
                    <i className="ri-printer-line"></i> Print Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
