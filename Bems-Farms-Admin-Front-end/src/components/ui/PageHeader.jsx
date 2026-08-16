export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 16,
      marginBottom: 24,
      fontFamily: 'var(--body-font)',
    }}>
      <div>
        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--text-primary)',
          margin: 0,
          fontFamily: 'var(--heading-font)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>{subtitle}</p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  )
}
