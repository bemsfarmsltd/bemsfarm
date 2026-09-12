import { Table, Thead, Th, Tbody, Tr, Td } from './Table'

/**
 * DetailTable — generic column-driven table used inside DetailModal.
 * columns: [{ key, label, align?: 'right', render?: (row) => node }]
 */
export default function DetailTable({ columns, rows, emptyText = 'No data available.' }) {
  return (
    <Table>
      <Thead>
        {columns.map((c) => (
          <Th key={c.key || c.label} className={c.align === 'right' ? 'text-end' : ''}>{c.label}</Th>
        ))}
      </Thead>
      <Tbody>
        {(!rows || rows.length === 0) ? (
          <Tr><Td colSpan={columns.length} className="text-center text-muted py-5 fs-sm">{emptyText}</Td></Tr>
        ) : rows.map((row, i) => (
          <Tr key={row.id ?? row.key ?? i}>
            {columns.map((c) => (
              <Td key={c.key || c.label} className={c.align === 'right' ? 'text-end' : ''}>
                {c.render ? c.render(row) : (row[c.key] ?? '—')}
              </Td>
            ))}
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}
