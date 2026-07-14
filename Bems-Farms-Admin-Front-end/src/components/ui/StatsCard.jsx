import { motion } from 'framer-motion'

const COLOR_MAP = {
  green:  { text: '#10b981', bg: 'var(--bg-green-faint)', glow: 'rgba(16, 185, 129, 0.15)' },
  blue:   { text: '#3b82f6', bg: 'var(--bg-blue-faint)', glow: 'rgba(59, 130, 246, 0.15)' },
  amber:  { text: '#f59e0b', bg: 'var(--bg-yellow-faint)', glow: 'rgba(245, 158, 11, 0.15)' },
  red:    { text: '#ef4444', bg: 'var(--bg-red-faint)', glow: 'rgba(239, 68, 68, 0.15)' },
  purple: { text: '#a855f7', bg: 'var(--bg-hover)', glow: 'rgba(168, 85, 247, 0.15)' },
  teal:   { text: '#14b8a6', bg: 'var(--bg-hover)', glow: 'rgba(20, 184, 166, 0.15)' },
  slate:  { text: 'var(--text-muted)', bg: 'var(--bg-hover)', glow: 'rgba(156, 163, 175, 0.1)' },
}

export default function StatsCard({ title, value, sub, icon: Icon, riIcon, color = 'green', trend }) {
  const { text, bg, glow } = COLOR_MAP[color] ?? COLOR_MAP.green

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 14,
        padding: '18px 20px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        height: '100%',
        fontFamily: 'Nunito, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Decorative background glow on hover */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-50%',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: glow,
Filter: 'blur(40px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            margin: '0 0 6px',
          }}>
            {title}
          </p>
          <div style={{
            fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
            marginBottom: 6, fontFamily: 'Syne, sans-serif',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}>
            {value}
          </div>
          {sub && (
            <p style={{ fontSize: 11, color: 'var(--text-light)', margin: 0 }}>{sub}</p>
          )}
          {trend !== undefined && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              margin: '6px 0 0',
              padding: '2px 8px',
              borderRadius: 20,
              color: trend >= 0 ? '#10b981' : '#ef4444',
              background: trend >= 0 ? 'var(--bg-green-faint)' : 'var(--bg-red-faint)',
            }}>
              <span>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
              <span style={{ fontWeight: 500, opacity: 0.8 }}>vs last week</span>
            </div>
          )}
        </div>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: bg, color: text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
          }}
        >
          {riIcon
            ? <i className={riIcon} style={{ fontSize: 22 }} />
            : Icon ? <Icon size={22} /> : null
          }
        </motion.div>
      </div>
    </motion.div>
  )
}
