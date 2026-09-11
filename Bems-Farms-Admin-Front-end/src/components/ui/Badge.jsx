/**
 * Badge — Luxury Brand Status Indicators
 */
const TINT_MAP = {
  green:  { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  blue:   { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  amber:  { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  red:    { bg: '#ffe4e6', text: '#be123c', border: '#fecdd3' },
  purple: { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
  slate:  { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  gray:   { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
}

export function statusColor(status) {
  const map = {
    confirmed:    'blue',
    preparing:    'amber',
    ready:        'purple',
    dispatched:   'amber',
    delivered:    'green',
    cancelled:    'red',
    pending:      'slate',
    active:       'green',
    inactive:     'gray',
    low_stock:    'red',
    in_stock:     'green',
    out_of_stock: 'red',
  }
  return map[status?.toLowerCase()] ?? 'slate'
}

export default function Badge({ label, color = 'slate' }) {
  const tint = TINT_MAP[color] ?? TINT_MAP.slate
  return (
    <span
      className="badge"
      style={{
        backgroundColor: tint.bg,
        color: tint.text,
        border: `1px solid ${tint.border}`,
        fontSize: '0.6875rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.04em'
      }}
    >
      {label}
    </span>
  )
}
