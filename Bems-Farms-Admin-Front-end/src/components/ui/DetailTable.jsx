/**
 * DetailTable — generic column-driven table used inside DetailModal.
 * columns: [{ key, label, align?: 'right', render?: (row) => node }]
 */
export default function DetailTable({ columns, rows, emptyText = 'No data available.' }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center" style={{ padding: '4rem 1.5rem' }}>
        <div
          className="d-flex align-items-center justify-content-center mb-3"
          style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#94a3b8' }}
        >
          <i className="ri-inbox-line" style={{ fontSize: 26 }} />
        </div>
        <p className="text-muted fw-medium mb-0" style={{ fontSize: '0.85rem' }}>{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0" style={{ fontSize: '0.85rem' }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key || c.label}
                className={c.align === 'right' ? 'text-end' : ''}
                style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  backgroundColor: '#FAF8F5',
                  color: '#6b7280',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '0.85rem 1.5rem',
                  borderBottom: '1px solid #EFECE6',
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? row.key ?? i} style={{ backgroundColor: i % 2 === 1 ? '#FCFBF9' : 'transparent' }}>
              {columns.map((c) => (
                <td
                  key={c.key || c.label}
                  className={`align-middle ${c.align === 'right' ? 'text-end' : ''}`}
                  style={{ padding: '0.9rem 1.5rem', borderBottom: '1px solid #F3F1EC' }}
                >
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
