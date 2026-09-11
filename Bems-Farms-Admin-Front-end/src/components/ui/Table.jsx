/**
 * Table — GotPOS Bootstrap table wrappers
 */
export function Table({ children, className = '' }) {
  return (
    <div className="table-responsive">
      <table className={`table table-hover table-nowrap mb-0 ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function Thead({ children }) {
  return <thead className="table-light">{children}</thead>
}

export function Th({ children, className = '' }) {
  return (
    <th className={`fw-semibold text-muted fs-xs text-uppercase ${className}`} style={{ letterSpacing: 0.5 }}>
      {children}
    </th>
  )
}

export function Tbody({ children }) {
  return <tbody>{children}</tbody>
}

export function Tr({ children, className = '' }) {
  return <tr className={className}>{children}</tr>
}

export function Td({ children, className = '' }) {
  return <td className={`align-middle ${className}`}>{children}</td>
}
