import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'
import ThermalReceipt from '../../components/ui/ThermalReceipt'
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
  store_name: 'Bems Farms Ltd', store_phone: '+234 800 236 7326', store_email: 'info@bemsfarms.com',
  store_address: 'Abia State, Nigeria', store_logo_url: '/bemsfarms_logo.png', store_tax_id: '', store_registration_number: '', pos_receipt_tagline: 'Fresh food. Trusted quality.',
  pos_receipt_website: 'bemsfarms.com', pos_receipt_header: 'SALES RECEIPT', pos_receipt_footer: 'Thank you for shopping with us',
  pos_receipt_return_note: 'Keep this receipt for returns', pos_receipt_paper_size: '80', pos_receipt_show_logo: 'true',
  pos_receipt_show_phone: 'true', pos_receipt_show_email: 'false', pos_receipt_show_sku: 'true', pos_receipt_show_barcode: 'true',
  pos_print_receipt: 'true', pos_low_stock_threshold: '',
  receipt_pos_title: 'POS SALES RECEIPT', receipt_pos_footer: 'Thank you for shopping with us',
  receipt_online_title: 'ONLINE ORDER RECEIPT', receipt_online_footer: 'Thank you for your order',
  receipt_refund_title: 'REFUND / RETURN RECEIPT', receipt_refund_footer: 'Your return has been recorded',
  receipt_stock_title: 'STOCK RECEIVING SLIP', receipt_stock_footer: 'Goods received and recorded',
  receipt_payment_title: 'PAYMENT RECEIPT', receipt_payment_footer: 'Payment received with thanks',
  receipt_invoice_title: 'SALES INVOICE', receipt_invoice_footer: 'Thank you for your business',
}

const GENERAL_KEYS = ['store_name', 'store_phone', 'store_email', 'store_address', 'store_logo_url', 'store_tax_id', 'store_registration_number']
const SAMPLE_ITEMS = [
  { id: 1, name: 'Bems Premium Palm Oil 1L', sku: 'BEMS-OIL-1L', qty: 2, price: 3500, total: 7000 },
  { id: 2, name: 'Fresh Farm Eggs', sku: 'EGG-CRATE', qty: 1, price: 5800, total: 5800 },
]
const RECEIPT_TYPES = [
  ['pos', 'POS Sale'], ['online', 'Online Order'], ['refund', 'Refund / Return'],
  ['payment', 'Payment'], ['stock', 'Stock Receiving'], ['invoice', 'Invoice'],
]

export default function POSSettings() {
  const { user } = useAuth()
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
      toast.success('Test receipt sent to printer!')
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
        api.post('/admin/settings/general', general), api.post('/admin/settings/pos', pos),
      ])
      setForm((current) => ({ ...current, ...generalResult.data.settings, ...posResult.data.settings }))
      toast.success('Settings saved successfully!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="container-fluid py-5 text-center text-muted">Loading POS configuration…</div>

  const textFields = [
    ['store_name', 'Business Name'], ['store_phone', 'Support Phone'], ['store_email', 'Support Email'],
    ['pos_receipt_website', 'Website'], ['store_tax_id', 'Tax Identification (TIN)'],
    ['store_registration_number', 'RC / Reg Number'], ['pos_receipt_tagline', 'Tagline / Slogan'],
    ['store_address', 'Store Address'], ['pos_receipt_return_note', 'Returns & Refund Policy Note'],
  ]

  const toggles = [
    ['pos_receipt_show_logo', 'Show business logo on receipts'],
    ['pos_receipt_show_phone', 'Show phone number'],
    ['pos_receipt_show_email', 'Show email address'],
    ['pos_receipt_show_sku', 'Show item SKU codes'],
    ['pos_receipt_show_barcode', 'Print barcode footer on receipt'],
    ['pos_print_receipt', 'Auto-trigger print upon completing sale'],
  ]

  return (
    <div className="container-fluid">
      <SettingsTabs />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4">
        <div>
          <h5 className="mb-1 fw-bold">POS & Receipt Configuration</h5>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Customize your store branding, receipt formats, and connected checkout hardware.
          </p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" disabled={saving} onClick={handleSave}>
          <i className="ri-save-line"></i>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="row g-4 align-items-start">
        {/* Left Column: Settings & Hardware */}
        <div className="col-xl-7">

          {/* Clean Hardware & Peripherals Section */}
          <div className="card mb-4 shadow-sm border">
            <div className="card-header bg-light-subtle d-flex justify-content-between align-items-center py-3">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-printer-line fs-18 text-primary"></i>
                <h6 className="mb-0 fw-bold">Hardware &amp; Peripherals</h6>
              </div>
              <div>
                {directConnected ? (
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-12 fw-medium">
                    ● Connected: {printerInfo?.name || 'ESC/POS Printer'}
                  </span>
                ) : (
                  <span className="badge bg-secondary-subtle text-secondary border px-2 py-1 fs-12 fw-medium">
                    ○ Ready (Browser / USB)
                  </span>
                )}
              </div>
            </div>

            <div className="card-body">
              {/* Thermal Printer Row */}
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pb-3 border-bottom">
                <div>
                  <div className="fw-semibold text-dark mb-0.5">Thermal Receipt Printer</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Connect direct USB / Serial thermal printers (58mm / 80mm) for silent one-touch printing.
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {!directConnected ? (
                    <>
                      <button
                        type="button"
                        disabled={directBusy}
                        onClick={handleConnectUsb}
                        className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1">
                        <i className="ri-usb-line"></i> Pair USB Printer
                      </button>
                      <button
                        type="button"
                        disabled={directBusy}
                        onClick={handleConnectSerial}
                        className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1">
                        <i className="ri-cpu-line"></i> Serial / COM
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={directBusy}
                        onClick={handleTestDirectPrint}
                        className="btn btn-sm btn-success d-inline-flex align-items-center gap-1">
                        <i className="ri-printer-line"></i> Test Print
                      </button>
                      <button
                        type="button"
                        disabled={directBusy}
                        onClick={handleDisconnectPrinter}
                        className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1">
                        <i className="ri-shut-down-line"></i> Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Barcode Scanner Quick Test */}
              <div className="pt-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="fw-semibold text-dark" style={{ fontSize: 13 }}>Barcode Scanner Live Test</div>
                  <span className="text-muted" style={{ fontSize: 11 }}>Auto-detects USB, Wireless &amp; Bluetooth Scanners</span>
                </div>
                <div className="input-group input-group-sm mb-2">
                  <span className="input-group-text bg-white"><i className="ri-barcode-line text-primary"></i></span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Scan or type barcode to test lookup..."
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
                    className="btn btn-primary px-3">
                    {testSearching ? 'Checking…' : 'Test'}
                  </button>
                </div>

                {testResult && (
                  <div className={`p-2.5 rounded border mb-2 fs-12 ${testResult.status === 'found' ? 'bg-success-subtle border-success-subtle text-success' : 'bg-warning-subtle border-warning-subtle text-dark'}`}>
                    {testResult.status === 'found' && testResult.product && (
                      <div className="d-flex align-items-center justify-content-between">
                        <span><strong>✓ Found:</strong> {testResult.product.name} (SKU: {testResult.product.sku})</span>
                        <strong className="text-success">₦{Number(testResult.product.price || 0).toLocaleString()}</strong>
                      </div>
                    )}
                    {testResult.status === 'not_found' && (
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Scanned <code>{testResult.code}</code> — Product not in catalog</span>
                        <a href="/admin/inventory/barcode" className="text-primary fw-medium text-decoration-underline">Manage Barcodes →</a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Collapsible Kiosk Help */}
              <div className="mt-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-muted d-flex align-items-center gap-1 text-decoration-none"
                  style={{ fontSize: 12 }}
                  onClick={() => setShowKioskGuide(!showKioskGuide)}
                >
                  <i className={`ri-arrow-${showKioskGuide ? 'up' : 'down'}-s-line`}></i>
                  {showKioskGuide ? 'Hide' : 'Show'} zero-click silent POS kiosk printing tips
                </button>

                {showKioskGuide && (
                  <div className="mt-2 p-3 bg-light rounded text-muted fs-12 border">
                    <p className="mb-2">
                      For dedicated cashier terminals, launching Edge or Chrome in <code>--kiosk-printing</code> mode will skip the OS print dialog and print immediately when a sale is tendered.
                    </p>
                    <div className="font-monospace bg-white p-2 rounded border text-dark" style={{ fontSize: 11 }}>
                      msedge.exe --kiosk-printing --app=https://www.bemsfarms.com/admin/pos
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Business & Store Identity */}
          <div className="card mb-4 shadow-sm border">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-store-2-line text-primary"></i>
                Store &amp; Receipt Branding
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {textFields.map(([key, label]) => (
                  <div className={['store_address', 'pos_receipt_return_note'].includes(key) ? 'col-12' : 'col-md-6'} key={key}>
                    <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }} htmlFor={key}>{label}</label>
                    <input
                      id={key}
                      className="form-control"
                      value={form[key] || ''}
                      onChange={(e) => fld(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Receipt Types & Headers */}
          <div className="card mb-4 shadow-sm border">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-file-list-3-line text-primary"></i>
                Receipt Headers &amp; Footers
              </h6>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-1.5 mb-3">
                {RECEIPT_TYPES.map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setReceiptType(key)}
                    className={`btn btn-sm ${receiptType === key ? 'btn-primary fw-medium' : 'btn-light border text-muted'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }} htmlFor={`receipt-${receiptType}-title`}>
                    Header Title
                  </label>
                  <input
                    id={`receipt-${receiptType}-title`}
                    className="form-control"
                    value={form[`receipt_${receiptType}_title`] || ''}
                    onChange={(e) => fld(`receipt_${receiptType}_title`, e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }} htmlFor={`receipt-${receiptType}-footer`}>
                    Footer Message
                  </label>
                  <input
                    id={`receipt-${receiptType}-footer`}
                    className="form-control"
                    value={form[`receipt_${receiptType}_footer`] || ''}
                    onChange={(e) => fld(`receipt_${receiptType}_footer`, e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Paper and Layout Preferences */}
          <div className="card mb-4 shadow-sm border">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-settings-3-line text-primary"></i>
                Paper Format &amp; Display Options
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }} htmlFor="paper-size">Receipt Paper Width</label>
                  <select
                    id="paper-size"
                    className="form-select"
                    value={form.pos_receipt_paper_size}
                    onChange={(e) => fld('pos_receipt_paper_size', e.target.value)}
                  >
                    <option value="80">80 mm standard (Wide)</option>
                    <option value="58">58 mm compact (Narrow)</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }} htmlFor="pos_low_stock_threshold">POS Low Stock Warning Threshold</label>
                  <input
                    id="pos_low_stock_threshold"
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    className="form-control"
                    value={form.pos_low_stock_threshold || ''}
                    onChange={(e) => fld('pos_low_stock_threshold', e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-3">
                {toggles.map(([key, label]) => (
                  <div className="col-md-6" key={key}>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={key}
                        checked={isOn(key)}
                        onChange={() => fld(key, isOn(key) ? 'false' : 'true')}
                      />
                      <label className="form-check-label text-dark" style={{ fontSize: 13 }} htmlFor={key}>
                        {label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Sticky Print Preview */}
        <div className="col-xl-5">
          <div className="card shadow-sm border position-sticky" style={{ top: 88 }}>
            <div className="card-header bg-light-subtle d-flex justify-content-between align-items-center py-3">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-eye-line text-primary"></i>
                <h6 className="mb-0 fw-bold">Live Receipt Preview</h6>
              </div>
              <span className="badge bg-white text-dark border px-2 py-1 fs-12 fw-medium">
                {form.pos_receipt_paper_size}mm Thermal Format
              </span>
            </div>
            <div className="card-body p-3 bg-light d-flex justify-content-center">
              <div className="thermal-receipt-preview shadow-sm rounded">
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
          </div>
        </div>

      </div>
    </div>
  )
}
