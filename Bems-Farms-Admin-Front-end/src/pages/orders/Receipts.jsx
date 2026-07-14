import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt   = n  => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDt = dt => dt ? new Date(dt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const fmtD  = dt => dt ? new Date(dt).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '—'
const fmtT  = dt => dt ? new Date(dt).toLocaleTimeString('en-NG', { timeStyle: 'short' }) : '—'

// ─── Payment method config ───────────────────────────────────────────────────
const PM_CFG = {
  cash:          { label: 'Cash',          color: '#22c55e', bg: '#dcfce7', icon: 'ri-money-dollar-circle-line' },
  card:          { label: 'Card / POS',    color: '#405189', bg: '#e8eaf6', icon: 'ri-bank-card-line'           },
  transfer:      { label: 'Bank Transfer', color: '#F57C00', bg: '#fff3e0', icon: 'ri-swap-line'                },
  bank_transfer: { label: 'Bank Transfer', color: '#F57C00', bg: '#fff3e0', icon: 'ri-swap-line'                },
  qr:            { label: 'QR / USSD',     color: '#299cdb', bg: '#e0f4fd', icon: 'ri-qr-code-line'            },
  ussd:          { label: 'QR / USSD',     color: '#299cdb', bg: '#e0f4fd', icon: 'ri-qr-code-line'            },
  split:         { label: 'Split',         color: '#a78bfa', bg: '#ede9fe', icon: 'ri-split-cells-horizontal'   },
}
const pmCfg = key => PM_CFG[(key || '').toLowerCase()] || { label: key || '—', color: '#6b7280', bg: '#f3f4f6', icon: 'ri-question-line' }

// ─── Shared style tokens ────────────────────────────────────────────────────
const card = {
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
}
const inp = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1.5px solid #e5e7eb',
  fontSize: 13,
  fontFamily: 'Nunito, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#111827',
  background: '#fff',
}
const lbl = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

// ─── Sub-components ──────────────────────────────────────────────────────────
const TH = ({ children }) => (
  <th style={{
    padding: '8px 12px',
    fontSize: 10,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    background: '#f8fafc',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'left',
  }}>
    {children}
  </th>
)
const TD = ({ children, style }) => (
  <td style={{
    padding: '10px 12px',
    fontSize: 13,
    borderBottom: '1px solid #f9fafb',
    verticalAlign: 'middle',
    ...style,
  }}>
    {children}
  </td>
)

function PayBadge({ method }) {
  const cfg = pmCfg(method)
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 9px',
      borderRadius: 50,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      <i className={cfg.icon} style={{ fontSize: 11 }} />
      {cfg.label}
    </span>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
      <div style={{
        width: 36,
        height: 36,
        border: '3px solid #e5e7eb',
        borderTop: '3px solid #1B4332',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function EmptyState({ filtered }) {
  return (
    <tr>
      <td colSpan={9} style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <i className="ri-receipt-line" style={{ fontSize: 24, color: '#9ca3af' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>
            {filtered ? 'No receipts match your filters' : 'No receipts yet'}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            {filtered ? 'Try adjusting your search or date range.' : 'Completed POS sales will appear here.'}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Receipt Modal ──────────────────────────────────────────────────────────
function ReceiptModal({ receipt, onClose }) {
  const printRef = useRef(null)

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML
    if (!printContent) return

    const win = window.open('', '_blank', 'width=420,height=700,scrollbars=yes')
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receipt.receipt_number}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 380px; margin: 0 auto; padding: 12px; color: #111; }
            .store-header { text-align: center; margin-bottom: 12px; }
            .store-name { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
            .store-sub { font-size: 10px; color: #444; margin-top: 2px; }
            .divider { border: none; border-top: 1px dashed #aaa; margin: 8px 0; }
            .meta-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
            .meta-label { color: #555; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            th { font-size: 10px; text-align: left; border-bottom: 1px solid #ccc; padding: 4px 2px; text-transform: uppercase; }
            th:last-child, td:last-child { text-align: right; }
            td { font-size: 11px; padding: 4px 2px; vertical-align: top; }
            .totals-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
            .totals-row.bold { font-weight: 900; font-size: 13px; }
            .footer { text-align: center; margin-top: 14px; font-size: 10px; color: #555; }
            @media print {
              body { width: 100%; }
              @page { margin: 6mm; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const cfg = pmCfg(receipt.payment_method)
  const subtotal = parseFloat(receipt.subtotal || receipt.total || 0)
  const taxAmt   = parseFloat(receipt.tax_amount || 0)
  const discount = parseFloat(receipt.discount_amount || 0)
  const total    = parseFloat(receipt.total || 0)
  const items    = receipt.items || []

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 1060,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Modal header */}
        <div style={{ background: '#1B4332', borderRadius: '14px 14px 0 0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ri-receipt-2-line" style={{ color: '#6ee7b7', fontSize: 18 }} />
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 15, fontFamily: 'Syne, sans-serif' }}>
              {receipt.receipt_number}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 13px',
                borderRadius: 8,
                border: 'none',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 700,
              }}
            >
              <i className="ri-printer-line" />Print
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 22, padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <i className="ri-close-line" />
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div style={{ overflowY: 'auto', padding: '0 24px 24px' }}>
          {/* Printable receipt */}
          <div ref={printRef} style={{ paddingTop: 20 }}>
            {/* Store header */}
            <div className="store-header" style={{ textAlign: 'center', marginBottom: 16, borderBottom: '1px dashed #d1d5db', paddingBottom: 14 }}>
              <div className="store-name" style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1, color: '#1B4332', fontFamily: 'Syne, sans-serif' }}>
                BEMS FARMS
              </div>
              <div className="store-sub" style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                Fresh Produce &amp; Agro Products
              </div>
              <div className="store-sub" style={{ fontSize: 11, color: '#6b7280' }}>
                Tel: +234 (0) 800 BEMSFARM
              </div>
            </div>

            {/* Receipt meta */}
            <div style={{ marginBottom: 12, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                ['Receipt #',       receipt.receipt_number],
                ['Date',            fmtD(receipt.paid_at)],
                ['Time',            fmtT(receipt.paid_at)],
                ['Cashier',         receipt.cashier_name || '—'],
                ['Customer',        receipt.customer_name || 'Walk-in Customer'],
                ['Payment Method',  <PayBadge key="pm" method={receipt.payment_method} />],
                receipt.transaction_id && ['Transaction ID', <span key="txn" style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>{receipt.transaction_id}</span>],
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} className="meta-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 4 }}>
                  <span className="meta-label" style={{ color: '#6b7280', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 700, color: '#111827', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Items table */}
            <div style={{ borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Item', 'Qty', 'Unit Price', 'Subtotal'].map(h => (
                      <th key={h} style={{
                        padding: '8px 10px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        borderBottom: '1px solid #e5e7eb',
                        textAlign: h === 'Item' ? 'left' : 'right',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: '14px', fontSize: 12 }}>
                        No item details available
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}>
                          {item.product_name || item.name || '—'}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#374151' }}>
                          {item.quantity}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#374151' }}>
                          {fmt(item.unit_price)}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 700 }}>
                          {fmt(item.subtotal || item.line_total || (item.unit_price * item.quantity))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
              {discount > 0 && (
                <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 12, background: '#fff', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#6b7280' }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{fmt(subtotal + discount)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 12, background: '#fff', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#ef4444' }}>Discount</span>
                  <span style={{ fontWeight: 600, color: '#ef4444' }}>- {fmt(discount)}</span>
                </div>
              )}
              {taxAmt > 0 && (
                <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 12, background: '#fff', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#6b7280' }}>VAT (7.5%)</span>
                  <span style={{ fontWeight: 600 }}>{fmt(taxAmt)}</span>
                </div>
              )}
              <div className="totals-row bold" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 15, fontWeight: 800, background: '#1B4332', color: '#fff' }}>
                <span>TOTAL</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            {/* Payment details */}
            <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className={cfg.icon} style={{ fontSize: 20, color: cfg.color }} />
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Payment via</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
              </div>
              {receipt.transaction_id && (
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>TXN ID</div>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: '#374151' }}>{receipt.transaction_id}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="footer" style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', borderTop: '1px dashed #e5e7eb', paddingTop: 12 }}>
              <div style={{ fontWeight: 700, color: '#1B4332', marginBottom: 3 }}>Thank you for shopping with us!</div>
              <div>Goods sold are not returnable without receipt.</div>
              <div style={{ marginTop: 4, fontFamily: 'monospace', letterSpacing: 2, fontSize: 10, color: '#c4c4c4' }}>
                {receipt.receipt_number}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 8,
              border: 'none',
              background: '#1B4332',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 700,
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <i className="ri-printer-line" /> Print Receipt
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1.5px solid #e5e7eb',
              background: '#fff',
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: '',             label: 'All Methods'    },
  { value: 'cash',        label: 'Cash'           },
  { value: 'card',        label: 'Card / POS'     },
  { value: 'transfer',    label: 'Bank Transfer'  },
  { value: 'qr',          label: 'QR / USSD'      },
  { value: 'split',       label: 'Split'          },
]

export default function Receipts() {
  const [receipts, setReceipts]   = useState([])
  const [stats, setStats]         = useState({})
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [from, setFrom]           = useState('')
  const [to, setTo]               = useState('')
  const [payMethod, setPayMethod] = useState('')
  const [cashiers, setCashiers]   = useState([])
  const [cashierId, setCashierId] = useState('')
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [total, setTotal]         = useState(0)
  const [viewing, setViewing]     = useState(null)

  // Debounced search
  const searchTimer = useRef(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const handleSearchChange = val => {
    setSearch(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 400)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (debouncedSearch) params.search       = debouncedSearch
      if (from)            params.from         = from
      if (to)              params.to           = to
      if (payMethod)       params.payment_method = payMethod
      if (cashierId)       params.cashier_id   = cashierId

      const res = await api.get('/admin/pos/receipts', { params })
      setReceipts(res.data.receipts  || [])
      setStats(res.data.stats        || {})
      setTotal(res.data.total        || 0)
      setPages(res.data.pages        || 1)

      // Collect unique cashiers for the dropdown
      const names = {}
      ;(res.data.receipts || []).forEach(r => {
        if (r.cashier_id && r.cashier_name) names[r.cashier_id] = r.cashier_name
      })
      if (Object.keys(names).length) {
        setCashiers(prev => {
          const merged = { ...prev.reduce((a, c) => ({ ...a, [c.id]: c.name }), {}), ...names }
          return Object.entries(merged).map(([id, name]) => ({ id, name }))
        })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load receipts')
      setReceipts([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, from, to, payMethod, cashierId, page])

  useEffect(() => { load() }, [load])

  const clearFilters = () => {
    setSearch(''); setDebouncedSearch(''); setFrom(''); setTo('')
    setPayMethod(''); setCashierId(''); setPage(1)
  }

  const hasFilters = debouncedSearch || from || to || payMethod || cashierId

  const statCards = [
    {
      label: 'Total Receipts',
      value: parseInt(stats.total_count || 0).toLocaleString(),
      icon: 'ri-receipt-line',
      color: '#405189',
    },
    {
      label: "Today's Sales",
      value: fmt(stats.today_sales || 0),
      icon: 'ri-calendar-check-line',
      color: '#0ab39c',
    },
    {
      label: 'Cash Receipts',
      value: fmt(stats.cash_total || 0),
      icon: 'ri-money-dollar-circle-line',
      color: '#22c55e',
    },
    {
      label: 'Card / Transfer',
      value: fmt(stats.card_transfer_total || 0),
      icon: 'ri-bank-card-line',
      color: '#F57C00',
    },
  ]

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>
      <PageHeader
        title="Receipts"
        subtitle="View and print completed POS sale receipts"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Orders' },
          { label: 'Receipts' },
        ]}
      />

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {statCards.map(s => (
          <div
            key={s.label}
            style={{
              ...card,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              borderLeft: `3px solid ${s.color}`,
            }}
          >
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: s.color + '18',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className={s.icon} style={{ color: s.color, fontSize: 20 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#111827', fontFamily: 'Syne, sans-serif', lineHeight: 1.2, marginTop: 2 }}>
                {loading && !stats.total_count ? (
                  <span style={{ display: 'inline-block', width: 80, height: 16, background: '#f0f0f0', borderRadius: 4 }} />
                ) : s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          {/* Search */}
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <label style={lbl}>Search</label>
            <div style={{ position: 'relative' }}>
              <i className="ri-search-line" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
              <input
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Receipt #, customer, cashier, TXN ID…"
                style={{ ...inp, paddingLeft: 32 }}
              />
            </div>
          </div>

          {/* Date from */}
          <div style={{ flex: '0 0 140px' }}>
            <label style={lbl}>From</label>
            <input
              type="date"
              value={from}
              onChange={e => { setFrom(e.target.value); setPage(1) }}
              style={inp}
            />
          </div>

          {/* Date to */}
          <div style={{ flex: '0 0 140px' }}>
            <label style={lbl}>To</label>
            <input
              type="date"
              value={to}
              onChange={e => { setTo(e.target.value); setPage(1) }}
              style={inp}
            />
          </div>

          {/* Payment method */}
          <div style={{ flex: '0 0 160px' }}>
            <label style={lbl}>Payment Method</label>
            <select
              value={payMethod}
              onChange={e => { setPayMethod(e.target.value); setPage(1) }}
              style={inp}
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Cashier */}
          {cashiers.length > 0 && (
            <div style={{ flex: '0 0 160px' }}>
              <label style={lbl}>Cashier</label>
              <select
                value={cashierId}
                onChange={e => { setCashierId(e.target.value); setPage(1) }}
                style={inp}
              >
                <option value="">All Cashiers</option>
                {cashiers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 0 }}>
            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '9px 13px',
                  borderRadius: 8,
                  border: '1.5px solid #e5e7eb',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'Nunito, sans-serif',
                  color: '#374151',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                <i className="ri-close-line" />Clear
              </button>
            )}
            <button
              onClick={() => load()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '9px 13px',
                borderRadius: 8,
                border: '1.5px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Nunito, sans-serif',
                color: '#374151',
                fontWeight: 600,
              }}
            >
              <i className="ri-refresh-line" />Refresh
            </button>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>
            {!loading && <span>{total.toLocaleString()} receipt{total !== 1 ? 's' : ''}</span>}
          </div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Receipt #', 'Transaction ID', 'Customer', 'Cashier', 'Items', 'Amount', 'Payment Method', 'Date & Time', 'Actions'].map(h => (
                  <TH key={h}>{h}</TH>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <TD key={j}>
                        <div style={{ height: 14, background: '#f0f0f0', borderRadius: 4, width: j === 0 ? 80 : j === 4 ? 30 : '90%' }} />
                      </TD>
                    ))}
                  </tr>
                ))
              )}
              {!loading && receipts.length === 0 && <EmptyState filtered={!!hasFilters} />}
              {!loading && receipts.map(r => (
                <tr key={r.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#fafafa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <TD>
                    <div style={{ fontWeight: 700, color: '#1B4332', fontFamily: 'monospace', fontSize: 13 }}>
                      {r.receipt_number}
                    </div>
                  </TD>
                  <TD>
                    {r.transaction_id
                      ? <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{r.transaction_id}</span>
                      : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                    }
                  </TD>
                  <TD>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.customer_name || 'Walk-in Customer'}</div>
                  </TD>
                  <TD>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {(r.cashier_name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13 }}>{r.cashier_name || '—'}</span>
                    </div>
                  </TD>
                  <TD>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, fontSize: 13, padding: '2px 8px', borderRadius: 50, background: '#f3f4f6', color: '#374151' }}>
                      <i className="ri-shopping-bag-line" style={{ fontSize: 11, color: '#9ca3af' }} />
                      {r.items_count || 0}
                    </span>
                  </TD>
                  <TD>
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{fmt(r.total)}</span>
                  </TD>
                  <TD>
                    <PayBadge method={r.payment_method} />
                  </TD>
                  <TD>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{fmtD(r.paid_at)}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmtT(r.paid_at)}</div>
                  </TD>
                  <TD>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        onClick={() => setViewing(r)}
                        title="View Receipt"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 7,
                          border: '1.5px solid #e5e7eb',
                          background: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#374151',
                        }}
                      >
                        <i className="ri-eye-line" style={{ fontSize: 13 }} />
                      </button>
                      <button
                        onClick={() => setViewing(r)}
                        title="Print Receipt"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 7,
                          border: 'none',
                          background: '#1B4332',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}
                      >
                        <i className="ri-printer-line" style={{ fontSize: 13 }} />
                      </button>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {!loading && pages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderTop: '1px solid #e5e7eb',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Page {page} of {pages} &nbsp;·&nbsp; {total.toLocaleString()} total
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: '1.5px solid #e5e7eb',
                  background: page === 1 ? '#f9fafb' : '#fff',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: 12,
                  fontWeight: 600,
                  color: page === 1 ? '#9ca3af' : '#374151',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <i className="ri-arrow-left-s-line" />Prev
              </button>
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                let pg
                if (pages <= 7) {
                  pg = i + 1
                } else if (page <= 4) {
                  pg = i + 1
                } else if (page >= pages - 3) {
                  pg = pages - 6 + i
                } else {
                  pg = page - 3 + i
                }
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 7,
                      border: pg === page ? 'none' : '1.5px solid #e5e7eb',
                      background: pg === page ? '#1B4332' : '#fff',
                      color: pg === page ? '#fff' : '#374151',
                      cursor: 'pointer',
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 12,
                      fontWeight: pg === page ? 800 : 600,
                    }}
                  >
                    {pg}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: '1.5px solid #e5e7eb',
                  background: page === pages ? '#f9fafb' : '#fff',
                  cursor: page === pages ? 'not-allowed' : 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: 12,
                  fontWeight: 600,
                  color: page === pages ? '#9ca3af' : '#374151',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Next<i className="ri-arrow-right-s-line" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Receipt Modal ──────────────────────────────────────────────────── */}
      {viewing && <ReceiptModal receipt={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
