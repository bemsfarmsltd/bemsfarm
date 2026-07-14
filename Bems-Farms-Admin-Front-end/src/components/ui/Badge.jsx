const COLOR_MAP = {
  green:  { text: '#166534', bg: '#dcfce7' },
  blue:   { text: '#1d4ed8', bg: '#dbeafe' },
  amber:  { text: '#b45309', bg: '#fef3c7' },
  red:    { text: '#dc2626', bg: '#fee2e2' },
  purple: { text: '#7c3aed', bg: '#ede9fe' },
  teal:   { text: '#0d9488', bg: '#ccfbf1' },
  slate:  { text: '#475569', bg: '#f1f5f9' },
  gray:   { text: '#475569', bg: '#f1f5f9' },
}

export function statusColor(status) {
  const map = {
    confirmed:       'blue',
    preparing:       'amber',
    processing:      'amber',
    ready:           'purple',
    dispatched:      'amber',
    driver_assigned: 'blue',
    new_order:       'blue',
    delivered:       'green',
    cancelled:       'red',
    pending:         'slate',
    active:          'green',
    inactive:        'gray',
    low_stock:       'red',
    in_stock:        'green',
    out_of_stock:    'red',
    present:         'green',
    absent:          'red',
    late:            'amber',
    paid:            'green',
    approved:        'blue',
    rejected:        'red',
    success:         'green',
    failed:          'red',
    completed:       'green',
    refunded:        'purple',
  }
  return map[status?.toLowerCase()] ?? 'slate'
}

export default function Badge({ label, color = 'slate' }) {
  const { text, bg } = COLOR_MAP[color] ?? COLOR_MAP.slate
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 50,
      background: bg,
      color: text,
      whiteSpace: 'nowrap',
      fontFamily: 'Nunito, sans-serif',
    }}>
      {label}
    </span>
  )
}
