import React, { useId } from 'react'

/**
 * BemsOfficialStamp
 * Permanent, executive-grade corporate seal for Bems Farms Limited.
 * Rendered as a vector SVG for crisp 300+ DPI print, PDF, and high-DPI screen displays.
 */
export default function BemsOfficialStamp({
  size = 96,
  tilt = -12,
  color = '#0c4a2a',
  accentColor = '#b8860b',
  rcNumber = 'RC 1849204',
  companyName = 'BEMS FARMS LIMITED',
  state = 'ABIA STATE · NIGERIA',
  className = '',
  style = {}
}) {
  const uid = useId().replace(/:/g, '_')
  const topArcId = `bems-stamp-top-${uid}`
  const btmArcId = `bems-stamp-btm-${uid}`

  return (
    <div
      className={`bems-official-stamp ${className}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        transform: `rotate(${tilt}deg)`,
        transformOrigin: 'center center',
        userSelect: 'none',
        flexShrink: 0,
        ...style
      }}
      title="Bems Farms Limited Official Corporate Seal"
    >
      <svg
        viewBox="0 0 140 140"
        width={size}
        height={size}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Top text arc: Sweeps over the top half of the circle */}
          <path
            id={topArcId}
            d="M 18 70 A 52 52 0 0 1 122 70"
            fill="none"
          />
          {/* Bottom text arc: Sweeps under the bottom half of the circle */}
          <path
            id={btmArcId}
            d="M 122 70 A 52 52 0 0 1 18 70"
            fill="none"
          />
        </defs>

        {/* Outer Heavy Circular Ring */}
        <circle
          cx="70"
          cy="70"
          r="66"
          fill="none"
          stroke={color}
          strokeWidth="3.2"
        />

        {/* Fine Concentric Inset Ring */}
        <circle
          cx="70"
          cy="70"
          r="61.5"
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeDasharray="3 1.5"
        />

        {/* Inner Solid Frame Ring */}
        <circle
          cx="70"
          cy="70"
          r="41"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
        />

        {/* Inner Beaded Accent Ring */}
        <circle
          cx="70"
          cy="70"
          r="38"
          fill="none"
          stroke={accentColor}
          strokeWidth="0.8"
          strokeDasharray="1.5 2"
        />

        {/* Circular Top Text */}
        <text
          fill={color}
          fontSize="9.2"
          fontWeight="800"
          fontFamily="'Cinzel', 'Trajan Pro', 'Georgia', serif"
          letterSpacing="2.2"
        >
          <textPath
            href={`#${topArcId}`}
            startOffset="50%"
            textAnchor="middle"
          >
            ★ {companyName} ★
          </textPath>
        </text>

        {/* Circular Bottom Text */}
        <text
          fill={color}
          fontSize="7.8"
          fontWeight="700"
          fontFamily="'Cinzel', 'Trajan Pro', 'Georgia', serif"
          letterSpacing="1.4"
        >
          <textPath
            href={`#${btmArcId}`}
            startOffset="50%"
            textAnchor="middle"
          >
            ★ {rcNumber} · {state} ★
          </textPath>
        </text>

        {/* Center Star Top */}
        <polygon
          points="70,44 71.8,49.5 77.5,49.5 73,53 74.8,58.5 70,55 65.2,58.5 67,53 62.5,49.5 68.2,49.5"
          fill={accentColor}
        />

        {/* Center Text Line 1: OFFICIAL */}
        <text
          x="70"
          y="69"
          textAnchor="middle"
          fill={color}
          fontSize="11.5"
          fontWeight="900"
          fontFamily="'Cinzel', 'Fraunces', serif"
          letterSpacing="2.5"
        >
          OFFICIAL
        </text>

        {/* Decorative Divider with Diamond */}
        <line x1="47" y1="74" x2="65" y2="74" stroke={color} strokeWidth="0.8" />
        <polygon points="70,72.5 72,74 70,75.5 68,74" fill={accentColor} />
        <line x1="75" y1="74" x2="93" y2="74" stroke={color} strokeWidth="0.8" />

        {/* Center Text Line 2: SEAL */}
        <text
          x="70"
          y="85"
          textAnchor="middle"
          fill={color}
          fontSize="9.5"
          fontWeight="800"
          fontFamily="'Cinzel', 'Fraunces', serif"
          letterSpacing="3"
        >
          SEAL
        </text>

        {/* Sub-label: AUDITED */}
        <text
          x="70"
          y="95"
          textAnchor="middle"
          fill={color}
          fontSize="5.8"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="2"
        >
          VERIFIED &amp; AUDITED
        </text>
      </svg>
    </div>
  )
}
