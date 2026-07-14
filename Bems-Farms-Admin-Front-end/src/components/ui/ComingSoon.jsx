import React from 'react'

export default function ComingSoon({ title = "Section", icon = "ri-time-line" }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      fontFamily: 'Nunito, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '24px',
        padding: '48px 32px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      }}>
        {/* Animated Icon Ring */}
        <div style={{
          position: 'relative',
          width: '80px',
          height: '80px',
          margin: '0 auto 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Animated pulse ring */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'rgba(27, 67, 50, 0.08)',
            animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
          }} />
          
          <div style={{
            position: 'relative',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#1B4332',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            boxShadow: '0 4px 12px rgba(27, 67, 50, 0.2)',
          }}>
            <i className={icon} />
          </div>
        </div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(245, 124, 0, 0.1)',
          color: '#F57C00',
          fontSize: '11px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '6px 12px',
          borderRadius: '9999px',
          marginBottom: '16px',
          fontFamily: 'Syne, sans-serif',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#F57C00',
            display: 'inline-block',
          }} />
          Under Construction
        </div>

        {/* Headings */}
        <h2 style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: '24px',
          color: '#111827',
          margin: '0 0 12px',
          letterSpacing: '-0.02em',
        }}>
          {title}
        </h2>
        
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          lineHeight: '1.6',
          margin: '0 0 28px',
        }}>
          We are currently designing and refining the <strong>{title}</strong> page to follow the premium Bems Farms super admin experience. Check back soon!
        </p>

        {/* Progress simulator */}
        <div style={{
          background: '#f3f4f6',
          borderRadius: '9999px',
          height: '6px',
          width: '100%',
          overflow: 'hidden',
          marginBottom: '8px',
        }}>
          <div style={{
            background: 'linear-gradient(90deg, #1B4332 0%, #2D6A4F 100%)',
            height: '100%',
            width: '75%',
            borderRadius: '9999px',
          }} />
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#9ca3af',
          fontWeight: '600',
        }}>
          <span>Development Progress</span>
          <span>75%</span>
        </div>
      </div>

      {/* CSS Animation Keyframes Inject */}
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
