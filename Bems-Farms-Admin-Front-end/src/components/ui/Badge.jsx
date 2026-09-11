/**
 * Badge — GotPOS Bootstrap badge
 */
const COLOR_MAP = {
  green:   'bg-success-subtle text-success',
  blue:    'bg-primary-subtle text-primary',
  amber:   'bg-warning-subtle text-warning',
  red:     'bg-danger-subtle text-danger',
  purple:  'bg-info-subtle text-info',
  slate:   'bg-secondary-subtle text-secondary',
  gray:    'bg-secondary-subtle text-secondary',
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
  const cls = COLOR_MAP[color] ?? COLOR_MAP.slate
  return (
    <span className={`badge fw-normal ${cls}`} style={{ fontSize: 11 }}>
      {label}
    </span>
  )
}
