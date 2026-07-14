export function Table({ children }) {
  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Nunito, sans-serif' }}>
        {children}
      </table>
    </div>
  )
}

export function Thead({ children }) {
  return (
    <thead style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)' }}>
      <tr>{children}</tr>
    </thead>
  )
}

export function Th({ children, style }) {
  return (
    <th style={{
      padding: '10px 16px',
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
      textAlign: 'left',
      ...style,
    }}>
      {children}
    </th>
  )
}

export function Tbody({ children }) {
  return <tbody>{children}</tbody>
}

export function Tr({ children, onClick, style }) {
  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background 0.1s',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </tr>
  )
}

export function Td({ children, colSpan, style }) {
  return (
    <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: 'var(--text-primary)', ...style }} colSpan={colSpan}>
      {children}
    </td>
  )
}
