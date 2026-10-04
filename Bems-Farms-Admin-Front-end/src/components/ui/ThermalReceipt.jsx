import { useEffect, useState, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import api from '../../lib/api'

function Barcode({ value }) {
  const svgRef = useRef(null)
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 1.8,
          height: 38,
          displayValue: false,
          margin: 2,
          background: "transparent",
          lineColor: "#000"
        })
      } catch (e) { console.error('Barcode error', e) }
    }
  }, [value])
  return <svg ref={svgRef} className="thermal-receipt__real-barcode" style={{ margin: '3px auto 2px', display: 'block', shapeRendering: 'crispEdges' }} />
}

const money = (value) => `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const DEFAULTS = {
  store_name: 'Bems Farms Global Ltd',
  store_phone: '+234 800 236 7326',
  store_email: 'support@bemsfarms.com',
  store_address: 'Abia State, Nigeria',
  store_logo_url: '/bemsfarms_icon_b.png',
  store_tax_id: '',
  store_registration_number: '',
  pos_receipt_tagline: 'Fresh Food. Farm Produce. Quality Groceries.',
  pos_receipt_website: 'www.bemsfarms.com',
  pos_receipt_header: 'OFFICIAL SALES RECEIPT',
  pos_receipt_footer: 'Thank you for choosing Bems Farms',
  pos_receipt_return_note: 'GOODS SOLD IN GOOD CONDITION ARE NOT RETURNABLE',
  pos_receipt_paper_size: '80',
  pos_receipt_show_logo: 'true',
  pos_receipt_show_phone: 'true',
  pos_receipt_show_email: 'false',
  pos_receipt_show_sku: 'false',
  pos_receipt_show_barcode: 'false',
  pos_receipt_code_type: 'qr',
  receipt_pos_title: 'OFFICIAL SALES RECEIPT',
  receipt_pos_footer: 'Thank you for shopping with us',
  receipt_online_title: 'ORDER DELIVERY RECEIPT',
  receipt_online_footer: 'Thank you for shopping with Bems Farms!',
  receipt_refund_title: 'REFUND RECEIPT',
  receipt_refund_footer: 'Your return has been recorded',
  receipt_stock_title: 'STOCK RECEIVING SLIP',
  receipt_stock_footer: 'Goods received and recorded',
  receipt_payment_title: 'PAYMENT RECEIPT',
  receipt_payment_footer: 'Payment received with thanks',
  receipt_invoice_title: 'SALES INVOICE',
  receipt_invoice_footer: 'Thank you for your business',
}

let isPrintingLock = false

export function printThermalReceipt() {
  if (isPrintingLock) return
  isPrintingLock = true

  const receiptEl = document.querySelector('.thermal-receipt-print-root')
  if (!receiptEl) {
    isPrintingLock = false
    return
  }

  const paperSize = receiptEl.dataset.paperSize || '80'
  const receiptHTML = receiptEl.outerHTML

  let iframe = document.getElementById('bems-thermal-print-iframe')
  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.id = 'bems-thermal-print-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument
  if (!doc) {
    isPrintingLock = false
    return
  }

  const receiptCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap');
    @page {
      margin: 0;
      size: auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: auto;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: "Space Mono", "Courier Prime", "SF Mono", Consolas, "Courier New", monospace;
      overflow: visible;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .thermal-receipt {
      width: ${paperSize === '58' ? '54mm' : '76mm'};
      max-width: ${paperSize === '58' ? '54mm' : '76mm'};
      margin: 0 auto;
      padding: 4mm 3mm 6mm;
      color: #000;
      background: #fff;
      font-size: 11.5px;
      font-variant-numeric: tabular-nums;
      line-height: 1.35;
      page-break-after: avoid;
      break-after: avoid;
      font-family: "Space Mono", "Courier Prime", "SF Mono", Consolas, "Courier New", monospace;
    }
    .thermal-receipt__seal-wrap {
      text-align: center;
      margin-bottom: 6px;
    }
    .thermal-receipt__seal-ring {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 1.5px solid #000;
      margin: 0 auto;
      padding: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
    }
    .thermal-receipt__seal-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 50%;
      filter: grayscale(1) contrast(1.3);
    }
    .thermal-receipt__brand-name {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      text-align: center;
      color: #222;
      margin-top: 5px;
    }
    .thermal-receipt__main-title {
      font-size: 14.5px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      text-align: center;
      margin: 4px 0 2px;
      color: #000;
      font-family: inherit;
    }
    .thermal-receipt__datetime {
      font-size: 10.5px;
      font-weight: 700;
      text-align: center;
      margin: 0 0 6px;
      color: #111;
      letter-spacing: 0.4px;
    }
    .thermal-receipt__pill-wrap {
      text-align: center;
      margin: 4px 0 8px;
    }
    .thermal-receipt__code-pill {
      display: inline-block;
      background: #1e2229;
      color: #ffffff;
      border-radius: 9999px;
      padding: 3px 18px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.4px;
      font-family: inherit;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .thermal-receipt__divider {
      border: none;
      border-top: 1px dashed #222;
      margin: 9px 0;
      width: 100%;
    }
    .thermal-receipt__block {
      padding: 1px 0;
    }
    .thermal-receipt__row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      padding: 2px 0;
      font-size: 11.5px;
      line-height: 1.35;
    }
    .thermal-receipt__label {
      font-weight: 600;
      color: #000;
      white-space: nowrap;
      min-width: 120px;
    }
    .thermal-receipt__val {
      font-weight: 700;
      color: #000;
      text-align: right;
      flex: 1;
      word-break: break-word;
    }
    .thermal-receipt__row--strong {
      font-weight: 800;
    }
    .thermal-receipt__row--large {
      font-size: 13.5px;
      font-weight: 900;
      margin: 2px 0;
    }
    .thermal-receipt__row--total {
      font-size: 13.5px;
      font-weight: 900;
      margin: 3px 0;
      padding-top: 4px;
      border-top: 1px dashed #000;
    }
    .thermal-receipt__items {
      padding: 2px 0;
    }
    .thermal-receipt__items-head {
      display: flex;
      justify-content: space-between;
      font-weight: 800;
      font-size: 10.5px;
      letter-spacing: 0.4px;
      padding-bottom: 3px;
      border-bottom: 1px solid #000;
      margin-bottom: 4px;
    }
    .thermal-receipt__item {
      padding: 3px 0;
      border-bottom: 1px dotted #ccc;
    }
    .thermal-receipt__item:last-child {
      border-bottom: none;
    }
    .thermal-receipt__item-name {
      font-weight: 800;
      font-size: 11.5px;
      line-height: 1.25;
      margin-bottom: 1px;
    }
    .thermal-receipt__item-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 11px;
    }
    .thermal-receipt__item-line span {
      font-weight: 500;
      color: #333;
    }
    .thermal-receipt__item-line strong {
      font-weight: 800;
      color: #000;
    }
    .thermal-receipt__verify-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 0;
    }
    .thermal-receipt__verify-qr {
      flex-shrink: 0;
      width: 76px;
      height: 76px;
    }
    .thermal-receipt__qr-img {
      width: 76px;
      height: 76px;
      display: block;
      image-rendering: pixelated;
    }
    .thermal-receipt__verify-info {
      flex: 1;
      text-align: left;
    }
    .thermal-receipt__verify-thanks {
      font-size: 11px;
      font-weight: 600;
      color: #000;
      line-height: 1.25;
    }
    .thermal-receipt__verify-brand {
      font-size: 12px;
      font-weight: 800;
      color: #000;
      margin: 1px 0 4px;
    }
    .thermal-receipt__verify-policy {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #333;
      text-transform: uppercase;
      line-height: 1.3;
    }
    .thermal-receipt__footer {
      text-align: center;
      padding-top: 2px;
    }
    .thermal-receipt__footer-url {
      font-size: 10px;
      font-weight: 700;
      color: #000;
      margin-bottom: 2px;
    }
    .thermal-receipt__footer-tagline {
      font-size: 9px;
      font-weight: 600;
      color: #333;
      line-height: 1.25;
    }
    .thermal-receipt__footer-location {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: #222;
      margin-top: 3px;
    }
  `

  doc.open()
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title><style>${receiptCSS}</style></head><body>${receiptHTML}</body></html>`)
  doc.close()

  const executePrint = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (e) {
      console.error('Iframe print error', e)
    } finally {
      setTimeout(() => {
        isPrintingLock = false
      }, 1000)
    }
  }

  // Allow images/SVGs in the iframe to layout
  setTimeout(executePrint, 120)
}

function ReceiptRow({ label, value, strong = false, large = false }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className={`thermal-receipt__row${strong ? ' thermal-receipt__row--strong' : ''}${large ? ' thermal-receipt__row--large' : ''}`}>
      <span className="thermal-receipt__label">{label}</span>
      <span className="thermal-receipt__val">{value}</span>
    </div>
  )
}

function formatReceiptDateTime(dateVal) {
  if (!dateVal) {
    const now = new Date()
    const d = String(now.getDate()).padStart(2, '0')
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const y = now.getFullYear()
    const h = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const s = String(now.getSeconds()).padStart(2, '0')
    return `${d}.${m}.${y}  |  ${h}:${min}:${s}`
  }

  if (typeof dateVal === 'string' && dateVal.includes('|')) {
    return dateVal
  }

  try {
    const dObj = new Date(dateVal)
    if (!isNaN(dObj.getTime())) {
      const d = String(dObj.getDate()).padStart(2, '0')
      const m = String(dObj.getMonth() + 1).padStart(2, '0')
      const y = dObj.getFullYear()
      const h = String(dObj.getHours()).padStart(2, '0')
      const min = String(dObj.getMinutes()).padStart(2, '0')
      const s = String(dObj.getSeconds()).padStart(2, '0')
      return `${d}.${m}.${y}  |  ${h}:${min}:${s}`
    }
  } catch (e) {}

  return String(dateVal)
}

export default function ThermalReceipt({
  receiptNumber,
  date,
  customer = 'Walk-in Customer',
  customerPhone,
  branch = 'Aba Central Store',
  channel = 'In-Store POS',
  cashier = 'Chinedu K.',
  status = 'Paid',
  paymentReference,
  fulfillment = 'Store Counter Pickup',
  deliveryZone,
  driverName,
  deliveryAddress,
  items = [],
  subtotal,
  discount = 0,
  tax = 0,
  deliveryFee = 0,
  total,
  paymentMethod = 'POS Card',
  amountTendered,
  change,
  note,
  settings: settingsOverride,
  receiptType = 'pos',
}) {
  const [savedSettings, setSavedSettings] = useState(DEFAULTS)
  useEffect(() => {
    if (settingsOverride) return undefined
    let active = true
    api.get('/admin/settings/receipt').then((response) => {
      if (active && response.data?.settings) setSavedSettings((current) => ({ ...current, ...response.data.settings }))
    }).catch(() => {})
    return () => { active = false }
  }, [settingsOverride])

  const settings = { ...DEFAULTS, ...(savedSettings || {}), ...(settingsOverride || {}) }
  const enabled = (key) => settings[key] === 'true' || settings[key] === true

  const isInvoice = receiptType === 'invoice'
  const isCustomerReceipt = receiptType === 'online'

  // Header Title
  const receiptTitle = isInvoice
    ? (settings.receipt_invoice_title || 'COMMERCIAL SALES INVOICE')
    : isCustomerReceipt
      ? (settings.receipt_online_title || 'ONLINE PAYMENT RECEIPT')
      : (settings[`receipt_${receiptType}_title`] || settings.pos_receipt_header || 'POS SALES RECEIPT')

  // Code pill label & value
  const cleanCode = (receiptNumber || 'BF-980253').toString().replace(/^[#\s]+/, '')
  const codePillLabel = isInvoice ? 'Invoice No' : isCustomerReceipt ? 'Order Code' : 'Receipt'

  // Verification & Thank you text
  const thankYouText = isInvoice
    ? 'Dispatched by'
    : isCustomerReceipt
      ? 'Thank you for ordering with'
      : (settings.pos_receipt_footer || 'Thank you for shopping at')
  
  const brandName = settings.store_name || 'BEMS FARMS GLOBAL LTD'
  const policyText = isInvoice
    ? 'OFFICIAL DISPATCH INVOICE • GOODS SOLD IN GOOD CONDITION ARE NOT RETURNABLE'
    : isCustomerReceipt
      ? 'ELECTRONIC PAYMENT RECEIPT • GOODS SOLD IN GOOD CONDITION ARE NOT RETURNABLE'
      : (settings.pos_receipt_return_note || 'GOODS SOLD IN GOOD CONDITION ARE NOT RETURNABLE')

  // Tagline per document type
  const tagline = isInvoice
    ? 'Fresh Food. Farm Produce. Commercial Dispatch.'
    : isCustomerReceipt
      ? 'Fresh Food. Farm Produce. Quality Groceries Delivered Daily.'
      : (settings.pos_receipt_tagline || 'Fresh Food. Farm Produce. Quality Groceries.')

  // Calculations
  const calculatedSubtotal = items.reduce((sum, item) => sum + Number(item.total ?? Number(item.price || 0) * Number(item.qty || 1)), 0)
  const safeSubtotal = Number(subtotal ?? (items.length > 0 ? calculatedSubtotal : (total || 0)))

  // QR Code Generation
  const [qrDataUrl, setQrDataUrl] = useState('')
  const verifyUrl = `https://${(settings.pos_receipt_website || 'bemsfarms.com').replace(/^https?:\/\//, '')}/verify?order=${encodeURIComponent(cleanCode)}`

  useEffect(() => {
    let isMounted = true
    QRCode.toDataURL(verifyUrl, {
      width: 152,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    }).then(url => {
      if (isMounted) setQrDataUrl(url)
    }).catch(err => {
      console.warn('Thermal QR generation error:', err)
    })
    return () => { isMounted = false }
  }, [verifyUrl, cleanCode])

  return (
    <article
      data-paper-size={settings.pos_receipt_paper_size}
      className={`thermal-receipt thermal-receipt--${settings.pos_receipt_paper_size} thermal-receipt-print-root`}
      aria-label={`${isInvoice ? 'Invoice' : 'Receipt'} ${cleanCode}`}
    >
      {/* ── 1. Top Circular Seal Emblem ── */}
      <header className="thermal-receipt__seal-wrap">
        {enabled('pos_receipt_show_logo') && (
          <div className="thermal-receipt__seal-ring">
            <img
              className="thermal-receipt__seal-img"
              src={settings.store_logo_url || '/bemsfarms_icon_b.png'}
              alt={settings.store_name}
              onError={(e) => {
                if (!e.currentTarget.src.includes('bemsfarms_logo_compact.png')) {
                  e.currentTarget.src = '/bemsfarms_logo_compact.png'
                }
              }}
            />
          </div>
        )}
        <div className="thermal-receipt__brand-name">{brandName}</div>
        <h1 className="thermal-receipt__main-title">{receiptTitle}</h1>
        <div className="thermal-receipt__datetime">{formatReceiptDateTime(date)}</div>
        <div className="thermal-receipt__pill-wrap">
          <span className="thermal-receipt__code-pill">
            {codePillLabel}: #{cleanCode}
          </span>
        </div>
      </header>

      {/* ── 2. Primary Recipient / Identity Block ── */}
      <div className="thermal-receipt__divider" aria-hidden="true" />
      <section className="thermal-receipt__block" aria-label="Customer Information">
        {isInvoice ? (
          <>
            <ReceiptRow label="Billed To:" value={customer || 'Valued Customer'} />
            {customerPhone && <ReceiptRow label="Customer Phone:" value={customerPhone} />}
            {deliveryAddress && <ReceiptRow label="Delivery Address:" value={deliveryAddress} />}
            {deliveryZone && <ReceiptRow label="Delivery Zone:" value={deliveryZone} />}
          </>
        ) : isCustomerReceipt ? (
          <>
            <ReceiptRow label="Customer Name:" value={customer || 'Valued Customer'} />
            {customerPhone && <ReceiptRow label="Customer Phone:" value={customerPhone} />}
            <ReceiptRow label="Sales Channel:" value={channel || 'Bems Farms Web Store'} />
            {deliveryAddress && <ReceiptRow label="Delivery Address:" value={deliveryAddress} />}
          </>
        ) : (
          <>
            <ReceiptRow label="Customer:" value={customer || 'Walk-in Customer'} />
            <ReceiptRow label="Store Branch:" value={branch || 'Aba Central Hub (Terminal #01)'} />
            <ReceiptRow label="Cashier / Staff:" value={cashier || 'Cashier'} />
            <ReceiptRow label="Fulfilment:" value={fulfillment || 'In-Store Counter Checkout'} />
          </>
        )}
      </section>

      {/* ── 3. Logistics / Fulfilment / Dispatch Block ── */}
      {isInvoice ? (
        <>
          <div className="thermal-receipt__divider" aria-hidden="true" />
          <section className="thermal-receipt__block" aria-label="Dispatch Logistics">
            <ReceiptRow label="Order Reference:" value={`#${cleanCode}`} />
            <ReceiptRow label="Fulfilment Mode:" value={fulfillment || 'Doorstep Express Delivery'} />
            {driverName && <ReceiptRow label="Assigned Driver:" value={driverName} />}
            <ReceiptRow label="Dispatch Status:" value={status || 'PACKED • OUT FOR DELIVERY'} />
          </section>
        </>
      ) : isCustomerReceipt ? (
        <>
          <div className="thermal-receipt__divider" aria-hidden="true" />
          <section className="thermal-receipt__block" aria-label="Delivery Tracking">
            <ReceiptRow label="Fulfilment:" value={fulfillment || 'Doorstep Delivery'} />
            {deliveryZone && <ReceiptRow label="Delivery Zone:" value={deliveryZone} />}
            {driverName && <ReceiptRow label="Delivered By:" value={`Driver ${driverName}`} />}
            <ReceiptRow label="Fulfilment Status:" value={status || 'ORDER COMPLETED • DELIVERED'} />
          </section>
        </>
      ) : null}

      {/* ── 4. Itemized Purchases (Farm Produce & Groceries) ── */}
      {items && items.length > 0 && (
        <>
          <div className="thermal-receipt__divider" aria-hidden="true" />
          <section className="thermal-receipt__items" aria-label="Purchased items">
            <div className="thermal-receipt__items-head">
              <span>{isInvoice ? 'ITEM / PACKING SPEC' : 'ITEM / DESCRIPTION'}</span>
              <span>AMOUNT</span>
            </div>
            {items.map((item, index) => {
              const qty = Number(item.qty || item.quantity || 1)
              const price = Number(item.price || item.unit_price || 0)
              const lineTotal = Number(item.total ?? item.subtotal ?? qty * price)
              return (
                <div className="thermal-receipt__item" key={item.id || `${item.name}-${index}`}>
                  <div className="thermal-receipt__item-name">{item.name || item.product_name || 'Item'}</div>
                  <div className="thermal-receipt__item-line">
                    <span>{qty} {item.unit || 'pcs'} × {money(price)}</span>
                    <strong>{money(lineTotal)}</strong>
                  </div>
                </div>
              )
            })}
          </section>
        </>
      )}

      {/* ── 5. Financials & Payment Breakdown ── */}
      <div className="thermal-receipt__divider" aria-hidden="true" />
      <section className="thermal-receipt__block" aria-label="Financials Breakdown">
        <ReceiptRow label="Items Subtotal:" value={money(safeSubtotal)} />
        {Number(deliveryFee) > 0 && <ReceiptRow label={isInvoice ? 'Zone Delivery Fee:' : 'Delivery Fee:'} value={money(deliveryFee)} />}
        {Number(tax) > 0 && <ReceiptRow label="Statutory VAT (7.5%):" value={money(tax)} />}
        {Number(discount) > 0 && <ReceiptRow label={isCustomerReceipt ? 'Coupon Discount:' : 'Discount:'} value={`−${money(discount)}`} />}
        
        <div className="thermal-receipt__row thermal-receipt__row--total">
          <span className="thermal-receipt__label">
            {isInvoice ? 'TOTAL INVOICE:' : isCustomerReceipt ? 'TOTAL AMOUNT PAID:' : 'TOTAL PAID:'}
          </span>
          <span className="thermal-receipt__val">
            {money(total || safeSubtotal + Number(tax || 0) + Number(deliveryFee || 0) - Number(discount || 0))}
          </span>
        </div>

        {isInvoice ? (
          <>
            <ReceiptRow label="Payment Terms:" value={paymentMethod ? `${paymentMethod} (COD)` : 'Cash / POS on Delivery (COD)'} />
            <ReceiptRow label="Payment Status:" value={status || 'PENDING DOORSTEP PAYMENT'} />
          </>
        ) : isCustomerReceipt ? (
          <>
            <ReceiptRow label="Payment Method:" value={paymentMethod ? `${paymentMethod} (Verified)` : 'Online Card (Paystack Verified)'} />
            {paymentReference && <ReceiptRow label="Gateway Ref:" value={paymentReference} />}
            <ReceiptRow label="Payment Status:" value={status || 'SUCCESSFUL • SETTLED'} />
          </>
        ) : (
          <>
            <ReceiptRow label="Payment Method:" value={paymentMethod || 'POS Card'} />
            {paymentReference && <ReceiptRow label="POS Terminal Ref:" value={paymentReference} />}
            <ReceiptRow label="Sale Status:" value={status || 'COMPLETED • PAID'} />
            {Number(amountTendered) > 0 && <ReceiptRow label="Amount Tendered:" value={money(amountTendered)} />}
            {Number(change) > 0 && <ReceiptRow label="Change Due:" value={money(change)} />}
          </>
        )}
      </section>

      {/* ── 6. Bottom Verification Block (QR Code on Left, Text on Right) ── */}
      <div className="thermal-receipt__divider" aria-hidden="true" />
      <section className="thermal-receipt__verify-box" aria-label="Verification and Policies">
        <div className="thermal-receipt__verify-qr">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Scan to verify receipt"
              className="thermal-receipt__qr-img"
            />
          ) : (
            <div style={{ width: '76px', height: '76px', background: '#f5f5f5', border: '1px dashed #999' }} />
          )}
        </div>
        <div className="thermal-receipt__verify-info">
          <div className="thermal-receipt__verify-thanks">{thankYouText}</div>
          <div className="thermal-receipt__verify-brand">{brandName}</div>
          <div className="thermal-receipt__verify-policy">{policyText}</div>
        </div>
      </section>

      {/* ── 7. Footer Website & Registration ── */}
      <div className="thermal-receipt__divider" aria-hidden="true" />
      <footer className="thermal-receipt__footer">
        <div className="thermal-receipt__footer-url">{settings.pos_receipt_website || 'www.bemsfarms.com'} · {settings.store_email || 'support@bemsfarms.com'}</div>
        <div className="thermal-receipt__footer-tagline">{tagline}</div>
        <div className="thermal-receipt__footer-location">
          {settings.store_address || 'Abia State. Head Office'}
        </div>
      </footer>
    </article>
  )
}
