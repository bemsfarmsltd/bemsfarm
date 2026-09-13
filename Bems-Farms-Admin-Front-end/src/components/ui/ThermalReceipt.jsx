const money = (value) => `₦${Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`

export function printThermalReceipt() {
  const cleanup = () => document.body.classList.remove('thermal-print-active')
  document.body.classList.add('thermal-print-active')
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
}) {
  const calculatedSubtotal = items.reduce((sum, item) => sum + Number(item.total ?? Number(item.price || 0) * Number(item.qty || 1)), 0)
  const safeSubtotal = Number(subtotal ?? calculatedSubtotal)

  return <article className="thermal-receipt thermal-receipt-print-root" aria-label={`Receipt ${receiptNumber || ''}`}>
    <header className="thermal-receipt__brand">
      <div className="thermal-receipt__mark">BF</div>
      <h1>BEMS FARMS LTD</h1>
      <p>Fresh food. Trusted quality.</p>
      <address>KM 14, Epe Expressway, Lagos<br />+234 800 236 7327 · bemsfarms.com</address>
    </header>

    <div className="thermal-receipt__title"><span>SALES RECEIPT</span><small>Customer copy</small></div>
    <section className="thermal-receipt__meta">
      <ReceiptRow label="Receipt" value={receiptNumber || '—'} strong />
      <ReceiptRow label="Date" value={date || new Date().toLocaleString('en-NG')} />
      <ReceiptRow label="Customer" value={customer || 'Walk-in Customer'} />
      {customerPhone && customerPhone !== '—' && <ReceiptRow label="Phone" value={customerPhone} />}
      {channel && <ReceiptRow label="Channel" value={channel} />}
      {cashier && <ReceiptRow label="Served by" value={cashier} />}
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
          {item.sku && <small>SKU: {item.sku}</small>}
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
      {Number(amountTendered) > 0 && <ReceiptRow label="Amount received" value={money(amountTendered)} />}
      {Number(change) > 0 && <ReceiptRow label="Change" value={money(change)} strong />}
    </section>

    {note && <p className="thermal-receipt__note"><strong>Note:</strong> {note}</p>}
    <footer className="thermal-receipt__footer">
      <strong>THANK YOU FOR SHOPPING WITH US</strong>
      <p>Freshness you can trust, every day.</p>
      <div className="thermal-receipt__barcode" aria-hidden="true" />
      <small>{receiptNumber || 'BEMS FARMS'} · Keep this receipt for returns</small>
    </footer>
  </article>
}
