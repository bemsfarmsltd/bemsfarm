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
  ['pos', 'POS sale'], ['online', 'Online order'], ['refund', 'Refund / return'],
  ['payment', 'Payment'], ['stock', 'Stock receiving'], ['invoice', 'Invoice'],
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

  const fld = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const isOn = (key) => form[key] !== 'false'

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
      toast.success('Test receipt sent silently to thermal hardware!')
    } catch (err) {
      toast.error(err?.message || 'Direct test print failed. Ensure printer is connected and turned on.')
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
      toast.success('Receipt design and business details saved')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save receipt settings')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="container-fluid py-5 text-center text-muted">Loading receipt designer…</div>

  const textFields = [
    ['store_name', 'Business name'], ['store_phone', 'Customer phone'], ['store_email', 'Email address'],
    ['store_address', 'Store address'], ['store_logo_url', 'Logo URL'], ['store_tax_id', 'Tax identification number'],
    ['store_registration_number', 'Company registration number'], ['pos_receipt_website', 'Website'],
    ['pos_receipt_tagline', 'Brand tagline'], ['pos_receipt_return_note', 'Returns message'],
  ]
  const toggles = [
    ['pos_receipt_show_logo', 'Show business logo'], ['pos_receipt_show_phone', 'Show phone number'],
    ['pos_receipt_show_email', 'Show email address'], ['pos_receipt_show_sku', 'Show product SKU'],
    ['pos_receipt_show_barcode', 'Show receipt barcode'], ['pos_print_receipt', 'Auto-print after payment'],
  ]

  return <div className="container-fluid">
    <SettingsTabs />
    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
      <div><h5 className="mb-1 fw-bold">Receipt Designer & Hardware Printing</h5><p className="text-muted mb-0">Control the branding, layout, and direct USB/Serial thermal hardware printing.</p></div>
      <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save receipt design'}</button>
    </div>
    <div className="row g-4 align-items-start">
      <div className="col-xl-7">
        
        {/* Direct Hardware Thermal Printer Card */}
        <div className="card mb-4 border-emerald-subtle shadow-sm" style={{ borderLeft: '4px solid #059669' }}>
          <div className="card-header d-flex justify-content-between align-items-center bg-white">
            <div className="d-flex align-items-center gap-2">
              <span className="p-1 rounded bg-success-subtle text-success fs-5">🖨️</span>
              <div>
                <h6 className="mb-0 fw-bold">Direct Hardware Thermal Printer (Silent USB / Serial)</h6>
                <small className="text-muted">Bypasses browser print spooler entirely for 100% silent, instantaneous printing.</small>
              </div>
            </div>
            {directConnected ? (
              <span className="badge bg-success text-white px-2 py-1 fs-12 fw-bold">
                ● ONLINE ({printerInfo?.type || 'ESC/POS'})
              </span>
            ) : (
              <span className="badge bg-secondary-subtle text-secondary border px-2 py-1 fs-12">
                ○ Not Connected
              </span>
            )}
          </div>
          <div className="card-body">
            {!isDirectPrinterSupported() ? (
              <div className="alert alert-warning mb-0 fs-13">
                <i className="ri-information-line me-1"></i> WebUSB/WebSerial direct printing is supported in Chrome, Edge, and Opera desktop browsers. For other browsers, the standard high-speed thermal preview spooler will be used.
              </div>
            ) : (
              <div>
                {directConnected && printerInfo && (
                  <div className="alert alert-success d-flex align-items-center justify-content-between py-2 mb-3">
                    <div>
                      <strong>Connected:</strong> {printerInfo.name} ({printerInfo.type})
                    </div>
                    <span className="badge bg-success">Ready for Silent Print</span>
                  </div>
                )}

                <p className="text-muted fs-13 mb-3">
                  Connect any 58mm or 80mm thermal receipt printer (Xprinter, POS-58, POS-80, Munbyn, Epson, Milestone, RPP02N) directly via USB or Virtual COM port:
                </p>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  {!directConnected ? (
                    <>
                      <button
                        type="button"
                        disabled={directBusy}
                        onClick={handleConnectUsb}
                        className="btn btn-success fw-bold d-inline-flex align-items-center gap-1 shadow-sm">
                        <i className="ri-usb-line"></i> {directBusy ? 'Searching…' : 'Search & Pair USB Printer (WebUSB)'}
                      </button>
                      <button
                        type="button"
                        disabled={directBusy}
                        onClick={handleConnectSerial}
                        className="btn btn-outline-success fw-bold d-inline-flex align-items-center gap-1">
                        <i className="ri-cpu-line"></i> Search Serial / COM Port
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={directBusy}
                        onClick={handleTestDirectPrint}
                        className="btn btn-outline-success fw-bold d-inline-flex align-items-center gap-1">
                        <i className="ri-printer-line"></i> {directBusy ? 'Sending…' : 'Run Test Print (Silent ESC/POS)'}
                      </button>
                      <button
                        type="button"
                        disabled={directBusy}
                        onClick={handleDisconnectPrinter}
                        className="btn btn-outline-danger fw-bold d-inline-flex align-items-center gap-1">
                        <i className="ri-shut-down-line"></i> Disconnect Printer
                      </button>
                    </>
                  )}
                </div>

                <div className="p-3 bg-light rounded border text-muted fs-12">
                  <strong>💡 Hardware Tips:</strong>
                  <ul className="mb-0 ps-3 mt-1">
                    <li>Make sure the printer is turned on and plugged into a USB port on this computer.</li>
                    <li>Click <strong>"Search & Pair USB Printer"</strong> and select your printer model from the browser prompt.</li>
                    <li>If your thermal printer appears as a Virtual COM port or RS-232 adapter, click <strong>"Search Serial / COM Port"</strong> instead.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card mb-4"><div className="card-header"><h6 className="mb-0 fw-bold">Receipt types</h6></div><div className="card-body">
          <div className="d-flex flex-wrap gap-2 mb-4">{RECEIPT_TYPES.map(([key,label]) => <button type="button" key={key} onClick={() => setReceiptType(key)} className={`btn btn-sm ${receiptType === key ? 'btn-primary' : 'btn-outline-secondary'}`}>{label}</button>)}</div>
          <div className="row g-3"><div className="col-md-6"><label className="form-label fw-semibold" htmlFor={`receipt-${receiptType}-title`}>{RECEIPT_TYPES.find(([key]) => key === receiptType)?.[1]} title</label><input id={`receipt-${receiptType}-title`} className="form-control" value={form[`receipt_${receiptType}_title`] || ''} onChange={(event) => fld(`receipt_${receiptType}_title`, event.target.value)} /></div><div className="col-md-6"><label className="form-label fw-semibold" htmlFor={`receipt-${receiptType}-footer`}>Footer message</label><input id={`receipt-${receiptType}-footer`} className="form-control" value={form[`receipt_${receiptType}_footer`] || ''} onChange={(event) => fld(`receipt_${receiptType}_footer`, event.target.value)} /></div></div>
        </div></div>
        <div className="card mb-4"><div className="card-header"><h6 className="mb-0 fw-bold">Business identity</h6></div><div className="card-body"><div className="row g-3">
          {textFields.map(([key, label]) => <div className={['store_address','pos_receipt_footer','pos_receipt_return_note'].includes(key) ? 'col-12' : 'col-md-6'} key={key}>
            <label className="form-label fw-semibold" htmlFor={key}>{label}</label>
            <input id={key} className="form-control" value={form[key] || ''} onChange={(event) => fld(key, event.target.value)} />
          </div>)}
        </div></div></div>
        <div className="card"><div className="card-header"><h6 className="mb-0 fw-bold">Paper and printed details</h6></div><div className="card-body">
          <div className="row g-3 mb-4"><div className="col-md-6"><label className="form-label fw-semibold" htmlFor="paper-size">Thermal paper width</label><select id="paper-size" className="form-select" value={form.pos_receipt_paper_size} onChange={(event) => fld('pos_receipt_paper_size', event.target.value)}><option value="80">80 mm standard</option><option value="58">58 mm compact</option></select></div><div className="col-md-6"><label className="form-label fw-semibold" htmlFor="pos_low_stock_threshold">Low stock alert threshold</label><input id="pos_low_stock_threshold" type="number" min="0" className="form-control" value={form.pos_low_stock_threshold || ''} onChange={(event) => fld('pos_low_stock_threshold', event.target.value)} /></div></div>
          <div className="row g-3">{toggles.map(([key,label]) => <div className="col-md-6" key={key}><div className="form-check form-switch"><input className="form-check-input" type="checkbox" id={key} checked={isOn(key)} onChange={() => fld(key, isOn(key) ? 'false' : 'true')} /><label className="form-check-label fw-medium" htmlFor={key}>{label}</label></div></div>)}</div>
        </div></div>
      </div>
      <div className="col-xl-5"><div className="card position-sticky" style={{ top: 88 }}><div className="card-header d-flex justify-content-between"><h6 className="mb-0 fw-bold">Live print preview</h6><span className="badge bg-light text-dark border">{form.pos_receipt_paper_size} mm</span></div><div className="thermal-receipt-preview">
        <ThermalReceipt settings={form} receiptType={receiptType} receiptNumber="BF-PREVIEW-001" date="14 Sep 2026 · 12:30" customer="Walk-in Customer" channel="POS Terminal" cashier={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name : 'Cashier'} items={SAMPLE_ITEMS} subtotal={12800} tax={960} total={13760} paymentMethod="Cash" amountTendered={15000} change={1240} />
      </div></div></div>
    </div>
  </div>
}
