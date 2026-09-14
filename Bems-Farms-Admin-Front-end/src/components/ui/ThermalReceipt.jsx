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
          width: 2,
          height: 40,
          displayValue: false,
          margin: 10,
          background: "transparent",
          lineColor: "#000"
        })
      } catch (e) { console.error('Barcode error', e) }
    }
  }, [value])
  return <svg ref={svgRef} className="thermal-receipt__real-barcode" style={{ margin: '0 auto 10px', display: 'block', shapeRendering: 'crispEdges' }} />
}

const money = (value) => `₦${Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
const DEFAULTS = {
  store_name: 'Bems Farms Ltd', store_phone: '+234 800 236 7326', store_email: 'info@bemsfarms.com',
  store_address: 'Abia State, Nigeria', store_logo_url: '/bemsfarms_logo.png', store_tax_id: '', store_registration_number: '', pos_receipt_tagline: 'Fresh food. Trusted quality.',
  pos_receipt_website: 'bemsfarms.com', pos_receipt_header: 'SALES RECEIPT', pos_receipt_footer: 'Thank you for shopping with us',
  pos_receipt_return_note: 'Keep this receipt for returns', pos_receipt_paper_size: '80', pos_receipt_show_logo: 'true',
  pos_receipt_show_phone: 'true', pos_receipt_show_email: 'false', pos_receipt_show_sku: 'true', pos_receipt_show_barcode: 'true',
  receipt_pos_title: 'POS SALES RECEIPT', receipt_pos_footer: 'Thank you for shopping with us',
  receipt_online_title: 'ONLINE ORDER RECEIPT', receipt_online_footer: 'Thank you for your order',
  receipt_refund_title: 'REFUND / RETURN RECEIPT', receipt_refund_footer: 'Your return has been recorded',
  receipt_stock_title: 'STOCK RECEIVING SLIP', receipt_stock_footer: 'Goods received and recorded',
  receipt_payment_title: 'PAYMENT RECEIPT', receipt_payment_footer: 'Payment received with thanks',
  receipt_invoice_title: 'SALES INVOICE', receipt_invoice_footer: 'Thank you for your business',
}

export function printThermalReceipt() {
  const paperSize = document.querySelector('.thermal-receipt-print-root')?.dataset.paperSize || '80'
  const cleanup = () => document.body.classList.remove('thermal-print-active', 'thermal-print-58')
  document.body.classList.add('thermal-print-active')
  if (paperSize === '58') document.body.classList.add('thermal-print-58')
  window.addEventListener('afterprint', cleanup, { once: true })
  window.print()
  window.setTimeout(cleanup, 1500)
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
  const settings = { ...DEFAULTS, ...savedSettings, ...settingsOverride }
  const enabled = (key) => settings[key] !== 'false'
  const receiptTitle = settings[`receipt_${receiptType}_title`] || settings.pos_receipt_header
  const receiptFooter = settings[`receipt_${receiptType}_footer`] || settings.pos_receipt_footer
  const calculatedSubtotal = items.reduce((sum, item) => sum + Number(item.total ?? Number(item.price || 0) * Number(item.qty || 1)), 0)
  const safeSubtotal = Number(subtotal ?? calculatedSubtotal)

  return <article data-paper-size={settings.pos_receipt_paper_size} className={`thermal-receipt thermal-receipt--${settings.pos_receipt_paper_size} thermal-receipt-print-root`} aria-label={`Receipt ${receiptNumber || ''}`}>
    <header className="thermal-receipt__brand">
      {enabled('pos_receipt_show_logo') && <img className="thermal-receipt__logo" src={settings.store_logo_url || '/bemsfarms_logo.png'} alt={settings.store_name} />}
      {(!enabled('pos_receipt_show_logo') || !settings.store_logo_url) && <h1>{settings.store_name}</h1>}
      <p>{settings.pos_receipt_tagline}</p>
      <address>{settings.store_address}<br />
        {enabled('pos_receipt_show_phone') && settings.store_phone}{enabled('pos_receipt_show_email') && settings.store_email ? ` · ${settings.store_email}` : ''}
        {settings.pos_receipt_website ? <><br />{settings.pos_receipt_website}</> : null}
        {settings.store_registration_number ? <><br />RC: {settings.store_registration_number}</> : null}
        {settings.store_tax_id ? <> · TIN: {settings.store_tax_id}</> : null}
      </address>
    </header>

    <div className="thermal-receipt__title"><span>{receiptTitle}</span><small>{receiptType === 'stock' ? 'Store copy' : 'Customer copy'}</small></div>
    <section className="thermal-receipt__meta">
      <ReceiptRow label="Receipt" value={receiptNumber || '—'} strong />
      <ReceiptRow label="Date" value={date || new Date().toLocaleString('en-NG')} />
      <ReceiptRow label="Customer" value={customer || 'Walk-in Customer'} />
      {customerPhone && customerPhone !== '—' && <ReceiptRow label="Phone" value={customerPhone} />}
      {channel && <ReceiptRow label="Channel" value={channel} />}
      {fulfillment && <ReceiptRow label="Fulfilment" value={fulfillment} />}
      {cashier && <ReceiptRow label="Served by" value={cashier} />}
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
            <span>{qty} × {money(price)}{item.unit ? ` / ${item.unit}` : ''}</span>
            <strong>{money(lineTotal)}</strong>
          </div>
          {enabled('pos_receipt_show_sku') && item.sku && <small>SKU: {item.sku}</small>}
        </div>
      }) : <div className="thermal-receipt__empty">Sale items were not recorded individually.</div>}
    </section>

    <section className="thermal-receipt__totals">
      <ReceiptRow label="Subtotal" value={money(safeSubtotal)} />
      {Number(discount) > 0 && <ReceiptRow label="Discount" value={`−${money(discount)}`} />}
      {Number(tax) > 0 && <ReceiptRow label="VAT" value={money(tax)} />}
      {Number(deliveryFee) > 0 && <ReceiptRow label="Delivery" value={money(deliveryFee)} />}
      <ReceiptRow label="TOTAL" value={money(total)} strong />
    </section>

    <section className="thermal-receipt__payment">
      <ReceiptRow label="Payment" value={paymentMethod || '—'} />
      {paymentReference && <ReceiptRow label="Payment ref" value={paymentReference} />}
      {Number(amountTendered) > 0 && <ReceiptRow label="Amount received" value={money(amountTendered)} />}
      {Number(change) > 0 && <ReceiptRow label="Change" value={money(change)} strong />}
    </section>

    {note && <p className="thermal-receipt__note"><strong>Note:</strong> {note}</p>}
    <footer className="thermal-receipt__footer">
      <strong>{receiptFooter}</strong>
      <p>Freshness you can trust, every day.</p>
      {enabled('pos_receipt_show_barcode') && (
        receiptNumber ? <Barcode value={receiptNumber} /> : <div className="thermal-receipt__barcode" aria-hidden="true" />
      )}
      <small>{receiptNumber || 'BEMS FARMS'} · {settings.pos_receipt_return_note}</small>
    </footer>
  </article>
}
