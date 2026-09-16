/**
 * Badge — Luxury Brand Status Indicators
 */
const TINT_MAP = {
  green:   { bg: '#dcfce7', text: '#15803d', border: '#86efac', dot: '#22c55e' },
  emerald: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7', dot: '#10b981' },
  teal:    { bg: '#ccfbf1', text: '#0f766e', border: '#99f6e4', dot: '#14b8a6' },
  blue:    { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', dot: '#0ea5e9' },
  indigo:  { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', dot: '#6366f1' },
  amber:   { bg: '#fef3c7', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  orange:  { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa', dot: '#f97316' },
  red:     { bg: '#ffe4e6', text: '#be123c', border: '#fecdd3', dot: '#f43f5e' },
  rose:    { bg: '#ffe4e6', text: '#be123c', border: '#fecdd3', dot: '#f43f5e' },
  purple:  { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff', dot: '#a855f7' },
  slate:   { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', dot: '#94a3b8' },
  gray:    { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb', dot: '#9ca3af' },
}

export function statusColor(status) {
  if (!status) return 'slate'
  const s = String(status).trim().toLowerCase().replace(/[\s-]/g, '_')
  const map = {
    // Orders / Sales
    confirmed:       'blue',
    processing:      'blue',
    new_order:       'blue',
    preparing:       'amber',
    ready:           'purple',
    ready_dispatch:  'purple',
    dispatched:      'indigo',
    en_route:        'indigo',
    awaiting_pickup: 'blue',
    delivered:       'green',
    completed:       'green',
    resolved:        'green',
    paid:            'emerald',
    partial:         'amber',
    unpaid:          'rose',
    cancelled:       'red',
    returned:        'rose',
    refunded:        'rose',
    failed:          'red',
    pending:         'amber',
    open:            'blue',
    closed:          'slate',

    // Stock & Inventory
    in_stock:        'green',
    low_stock:       'amber',
    out_of_stock:    'red',
    expiring_soon:   'amber',
    expired:         'red',
    good:            'green',
    critical:        'red',

    // Staff & Operations
    active:          'green',
    on_duty:         'green',
    present:         'green',
    absent:          'red',
    late:            'amber',
    inactive:        'gray',
    off_duty:        'slate',
    break:           'amber',
  }
  return map[s] ?? 'slate'
}

export default function Badge({ label, color, dot = false, size = 'md' }) {
  const chosenColor = color || statusColor(label)
  const tint = TINT_MAP[chosenColor] ?? TINT_MAP.slate
  const isSm = size === 'sm'

  const formattedLabel = String(label || '—').replace(/_/g, ' ')

  return (
    <span
      className="badge d-inline-flex align-items-center gap-1.5"
      style={{
        backgroundColor: tint.bg,
        color: tint.text,
        border: `1px solid ${tint.border}`,
        fontSize: isSm ? '0.625rem' : '0.6875rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: isSm ? '0.2rem 0.5rem' : '0.28rem 0.65rem',
        borderRadius: '9999px',
        lineHeight: 1.2,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: tint.dot || tint.text,
            flexShrink: 0,
          }}
        />
      )}
      <span>{formattedLabel}</span>
    </span>
  )
}
