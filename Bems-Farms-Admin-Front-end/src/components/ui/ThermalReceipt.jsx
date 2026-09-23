import { useEffect, useState, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import api from '../../lib/api'

function Barcode({ value }) {
  const svgRef = useRef(null)
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 1.5,
          height: 24,
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

const money = (value) => `₦${Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
const DEFAULTS = {
  store_name: 'Bems Farms Ltd', store_phone: '+234 800 236 7326', store_email: 'info@bemsfarms.com',
  store_address: 'Abia State, Nigeria', store_logo_url: '/bemsfarms_logo.png', store_tax_id: '', store_registration_number: '', pos_receipt_tagline: 'Fresh food. Trusted quality.',
  pos_receipt_website: 'bemsfarms.com', pos_receipt_header: 'SALES RECEIPT', pos_receipt_footer: 'Thank you for shopping with us',
  pos_receipt_return_note: 'Keep receipt for returns', pos_receipt_paper_size: '80', pos_receipt_show_logo: 'true',
  pos_receipt_show_phone: 'true', pos_receipt_show_email: 'false', pos_receipt_show_sku: 'true', pos_receipt_show_barcode: 'true',
  receipt_pos_title: 'POS SALES RECEIPT', receipt_pos_footer: 'Thank you for shopping with us',
  receipt_online_title: 'ONLINE ORDER RECEIPT', receipt_online_footer: 'Thank you for your order',
  receipt_refund_title: 'REFUND / RETURN RECEIPT', receipt_refund_footer: 'Your return has been recorded',
  receipt_stock_title: 'STOCK RECEIVING SLIP', receipt_stock_footer: 'Goods received and recorded',
  receipt_payment_title: 'PAYMENT RECEIPT', receipt_payment_footer: 'Payment received with thanks',
  receipt_invoice_title: 'SALES INVOICE', receipt_invoice_footer: 'Thank you for your business',
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
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: visible;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .thermal-receipt {
      width: ${paperSize === '58' ? '54mm' : '76mm'};
      max-width: ${paperSize === '58' ? '54mm' : '76mm'};
      margin: 0 auto;
      padding: 2mm 2.5mm 4mm;
      color: #000;
      background: #fff;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      line-height: 1.3;
      page-break-after: avoid;
      break-after: avoid;
    }
    .thermal-receipt__brand { text-align: center; margin-bottom: 6px; }
    .thermal-receipt__brand h1 { margin: 2px 0 1px; font: 800 18px/1.1 "Inter", sans-serif; letter-spacing: 0.1px; }
    .thermal-receipt__brand p { margin: 0 0 2px; font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.85; }
    .thermal-receipt__brand address { margin: 0; font-style: normal; font-size: 10.5px; color: #111; line-height: 1.25; }
    .thermal-receipt__logo { display: block; width: auto; max-width: 44mm; height: 13.5mm; margin: 0 auto 4px; object-fit: contain; filter: grayscale(1) contrast(1.25); }
    .thermal-receipt__title { margin: 6px 0 5px; text-align: center; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; font-size: 12px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3.5px 0; }
    .thermal-receipt__title small { display: none; }
    .thermal-receipt__meta, .thermal-receipt__payment { padding-bottom: 5px; }
    .thermal-receipt__row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; font-size: 11.5px; }
    .thermal-receipt__row > :last-child { max-width: 65%; text-align: right; overflow-wrap: anywhere; }
    .thermal-receipt__row--strong { font-weight: 800; }
    .thermal-receipt__items { border-top: 1px dashed #000; margin-top: 3px; }
    .thermal-receipt__items-head { display: flex; justify-content: space-between; padding: 4px 0 3px; font-weight: 800; border-bottom: 1px solid #000; font-size: 11px; letter-spacing: 0.5px; }
    .thermal-receipt__item { padding: 3.5px 0; border-bottom: 1px dotted #ccc; }
    .thermal-receipt__item:last-child { border-bottom: none; }
    .thermal-receipt__item-name { font-weight: 800; font-size: 12px; overflow-wrap: anywhere; margin-bottom: 1.5px; line-height: 1.2; }
    .thermal-receipt__item-line { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; font-size: 11px; }
    .thermal-receipt__item-line span { color: #222; font-size: 11px; font-weight: 500; }
    .thermal-receipt__item-line strong { font-size: 12px; font-weight: 800; white-space: nowrap; }
    .thermal-receipt__item small { display: block; margin-top: 1px; color: #555; font-size: 9.5px; }
    .thermal-receipt__empty { padding: 8px 0; text-align: center; font-style: italic; color: #555; font-size: 11px; }
    .thermal-receipt__totals { padding: 4px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 4px 0; }
    .thermal-receipt__totals .thermal-receipt__row { padding: 2px 0; }
    .thermal-receipt__totals .thermal-receipt__row--strong { margin-top: 3px; padding-top: 4px; border-top: 1px dashed #000; font-size: 14.5px; font-weight: 900; }
    .thermal-receipt__payment { padding-top: 3px; border-bottom: 1px dashed #000; }
    .thermal-receipt__note { margin: 4px 0; padding: 4px 8px; border-radius: 4px; background: #f5f5f5; font-size: 10px; overflow-wrap: anywhere; font-style: italic; text-align: center; }
    .thermal-receipt__footer { padding-top: 5px; border-top: 1px dashed #000; text-align: center; display: flex; flex-direction: column; align-items: center; }
    .thermal-receipt__footer strong { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; margin-bottom: 1px; }
    .thermal-receipt__footer small { font-size: 9.5px; color: #444; font-family: monospace; margin-top: 2px; }
    .thermal-receipt__barcode { width: 70%; height: 20px; margin: 2px auto 2px; background: repeating-linear-gradient(90deg,#000 0 1.5px,transparent 1.5px 3.5px,#000 3.5px 6px,transparent 6px 8px,#000 8px 9.5px,transparent 9.5px 13px); opacity: 0.9; }
    .thermal-receipt__real-barcode { margin: 3px auto 2px; display: block; shape-rendering: crispEdges; }
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

function ReceiptRow({ label, value, strong = false }) {
  return <div className={`thermal-receipt__row${strong ? ' thermal-receipt__row--strong' : ''}`}>
    <span>{label}</span><span>{value}</span>
  </div>
}

export default function ThermalReceipt({
  receiptNumber,
  date,
  customer = 'Walk-in Customer',
  customerPhone,
  channel,
  cashier,
  status,
  paymentReference,
  fulfillment,
  items = [],
  subtotal,
  discount = 0,
  tax = 0,
  deliveryFee = 0,
  total,
  paymentMethod,
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

  const receiptTitle = isInvoice
    ? (settings.receipt_invoice_title || 'OFFICIAL INVOICE — PACKING LIST')
    : isCustomerReceipt
      ? (settings.receipt_online_title || 'PAYMENT RECEIPT')
      : (settings[`receipt_${receiptType}_title`] || settings.pos_receipt_header)

  const receiptFooter = isInvoice
    ? (settings.receipt_invoice_footer || 'Internal use only — for packing purposes')
    : isCustomerReceipt
      ? (settings.receipt_online_footer || 'Thank you for shopping with Bems Farms!')
      : (settings[`receipt_${receiptType}_footer`] || settings.pos_receipt_footer)

  const returnNote = isInvoice
    ? 'Staff copy — packing list'
    : isCustomerReceipt
      ? 'Customer copy — keep for your records'
      : settings.pos_receipt_return_note

  const numberLabel = (isInvoice || isCustomerReceipt) ? 'Order #' : 'Receipt #'

  const calculatedSubtotal = items.reduce((sum, item) => sum + Number(item.total ?? Number(item.price || 0) * Number(item.qty || 1)), 0)
  const safeSubtotal = Number(subtotal ?? calculatedSubtotal)

  return <article data-paper-size={settings.pos_receipt_paper_size} className={`thermal-receipt thermal-receipt--${settings.pos_receipt_paper_size} thermal-receipt-print-root`} aria-label={`${isInvoice ? 'Invoice' : isCustomerReceipt ? 'Receipt' : 'Receipt'} ${receiptNumber || ''}`}>
    <header className="thermal-receipt__brand">
      {enabled('pos_receipt_show_logo') && (
        <img
          className="thermal-receipt__logo"
          src={settings.store_logo_url || '/bemsfarms_logo.png'}
          alt={settings.store_name}
          onError={(e) => {
            if (!e.currentTarget.src.includes('bemsfarms_logo_compact.png')) {
              e.currentTarget.src = '/bemsfarms_logo_compact.png'
            }
          }}
        />
      )}
      {(!enabled('pos_receipt_show_logo') || !settings.store_logo_url) && <h1>{settings.store_name}</h1>}
      <p>{settings.pos_receipt_tagline}</p>
      <address>{settings.store_address} · {enabled('pos_receipt_show_phone') && settings.store_phone}
        {settings.pos_receipt_website ? ` · ${settings.pos_receipt_website}` : ''}
        {settings.store_tax_id ? ` · TIN: ${settings.store_tax_id}` : ''}
      </address>
    </header>

    <div className="thermal-receipt__title"><span>{receiptTitle}</span></div>
    <section className="thermal-receipt__meta">
      <ReceiptRow label={numberLabel} value={receiptNumber || '—'} strong />
      <ReceiptRow label="Date/Time" value={date || new Date().toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })} />
      <ReceiptRow label="Customer" value={customer || 'Walk-in Customer'} />
      {customerPhone && customerPhone !== '—' && <ReceiptRow label="Phone" value={customerPhone} />}
      {channel && <ReceiptRow label="Channel" value={channel} />}
      {fulfillment && <ReceiptRow label="Fulfilment" value={fulfillment} />}
      {cashier && <ReceiptRow label="Cashier" value={cashier} />}
      {status && <ReceiptRow label="Status" value={status} strong />}
    </section>

    <section className="thermal-receipt__items" aria-label="Purchased items">
      <div className="thermal-receipt__items-head"><span>ITEM</span><span>AMOUNT</span></div>
      {items.length ? items.map((item, index) => {
        const qty = Number(item.qty || item.quantity || 1)
        const price = Number(item.price || item.unit_price || 0)
        const lineTotal = Number(item.total ?? item.subtotal ?? qty * price)
        return <div className="thermal-receipt__item" key={item.id || `${item.name}-${index}`}>
          <div className="thermal-receipt__item-name">{item.name || item.product_name || 'Item'}</div>
          <div className="thermal-receipt__item-line">
            <span>{qty} × {money(price)}{item.unit ? `/${item.unit}` : ''}</span>
            <strong>{money(lineTotal)}</strong>
          </div>
          {enabled('pos_receipt_show_sku') && item.sku && <small>SKU: {item.sku}</small>}
        </div>
      }) : <div className="thermal-receipt__empty">Sale items not recorded individually.</div>}
    </section>

    <section className="thermal-receipt__totals">
      <ReceiptRow label="Subtotal" value={money(safeSubtotal)} />
      {Number(discount) > 0 && <ReceiptRow label="Discount" value={`−${money(discount)}`} />}
      {Number(tax) > 0 && <ReceiptRow label="VAT (7.5%)" value={money(tax)} />}
      {Number(deliveryFee) > 0 && <ReceiptRow label="Delivery" value={money(deliveryFee)} />}
      <ReceiptRow label="TOTAL" value={money(total)} strong />
    </section>

    <section className="thermal-receipt__payment">
      <ReceiptRow label="Payment Method" value={paymentMethod || '—'} />
      {paymentReference && <ReceiptRow label="Payment Ref" value={paymentReference} />}
      {Number(amountTendered) > 0 && <ReceiptRow label="Tendered" value={money(amountTendered)} />}
      {Number(change) > 0 && <ReceiptRow label="Change Due" value={money(change)} strong />}
    </section>

    {note && <p className="thermal-receipt__note"><strong>Note:</strong> {note}</p>}
    <footer className="thermal-receipt__footer">
      <strong>{receiptFooter}</strong>
      {enabled('pos_receipt_show_barcode') && (
        receiptNumber ? <Barcode value={receiptNumber} /> : <div className="thermal-receipt__barcode" aria-hidden="true" />
      )}
      <small>{receiptNumber || 'BEMS FARMS'} · {returnNote}</small>
    </footer>
  </article>
}
