import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META } from '../../lib/roles'
import toast from 'react-hot-toast'

const ROLES_ORDER = ['superadmin', 'manager', 'accountant', 'delivery_manager', 'cashier', 'kitchen_staff']

const ROLE_ACCESS = {
  superadmin:       ['Dashboard', 'POS', 'Products', 'Inventory', 'Orders', 'Deliveries', 'Customers', 'Staff', 'Finance', 'Reports', 'Chef Bems AI', 'Multi-Store', 'Settings'],
  manager:          ['Dashboard', 'POS', 'Products', 'Inventory', 'Orders', 'Deliveries', 'Customers', 'Staff', 'Finance', 'Reports', 'Chef Bems AI', 'Settings'],
  accountant:       ['Dashboard', 'Orders', 'Finance', 'Reports'],
  delivery_manager: ['Dashboard', 'Orders', 'Deliveries'],
  cashier:          ['Dashboard', 'POS', 'Orders', 'Customers'],
  kitchen_staff:    ['Dashboard', 'Orders', 'Products', 'Inventory', 'Chef Bems AI'],
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #e5e7eb', fontSize: 14,
  fontFamily: 'Nunito, sans-serif', outline: 'none',
  background: '#fff', color: '#111827', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16,
      border: '2px solid rgba(255,255,255,0.4)',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
}

export default function Login() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const fill = (email, password) => setForm({ email, password })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Nunito, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #1B4332 !important; box-shadow: 0 0 0 3px rgba(27,67,50,0.1); }
      `}</style>

      {/* ── Left: Login Form ── */}
      <div style={{
        width: '100%', maxWidth: 480, flexShrink: 0,
        background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
            <img src="/logo.png" alt="Bems Farms Logo" style={{ maxHeight: '48px', objectFit: 'contain' }} />
          </div>

          {/* Heading */}
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1B4332', fontFamily: 'Syne, sans-serif', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Welcome Back!
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 28px' }}>
            Sign in to your Bems Farms admin portal
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }} htmlFor="emailInput">
                Email Address
              </label>
              <input
                id="emailInput"
                type="email"
                placeholder="email@bemsfarms.com"
                required
                style={inputStyle}
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }} htmlFor="passwordInput">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="passwordInput"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  required
                  style={{ ...inputStyle, paddingRight: 42 }}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, lineHeight: 1,
                  }}
                >
                  <i className={showPw ? 'ri-eye-off-line' : 'ri-eye-line'} style={{ fontSize: 18 }} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                <input type="checkbox" style={{ accentColor: '#1B4332', width: 16, height: 16 }} />
                Remember me
              </label>
              <Link to="/forgot-password" style={{ fontSize: 13, color: '#1B4332', fontWeight: 600, textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 10,
                background: loading ? '#40916C' : '#1B4332', color: '#fff',
                border: 'none', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s',
              }}
            >
              {loading && <Spinner />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Dev Quick-Fill */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                Dev — Quick Sign In
              </span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ROLES_ORDER.map(roleKey => {
                const m = ROLE_META[roleKey]
                const isActive = form.email === m.email
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => fill(m.email, m.password)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      background: isActive ? m.bg : '#fff',
                      border: `1.5px solid ${isActive ? m.color : '#e5e7eb'}`,
                      transition: 'all 0.12s',
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={m.icon} style={{ color: m.color, fontSize: 13 }} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: m.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {form.email && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden' }}>
                  <i className="ri-mail-line" style={{ marginRight: 4 }} />{form.email}
                  <span style={{ margin: '0 6px' }}>·</span>
                  <i className="ri-lock-line" style={{ marginRight: 4 }} />{form.password}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, background: '#1B4332', color: '#fff',
                    fontFamily: 'Nunito, sans-serif', flexShrink: 0,
                  }}
                >
                  {loading ? '…' : 'Go →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Role Overview ── */}
      <div style={{
        flex: 1, background: '#1B4332',
        display: 'none',
        alignItems: 'center', padding: '48px 56px',
        // Show on xl screens via media query in index.css
      }}
        className="login-right-panel"
      >
        <div style={{ maxWidth: 680, width: '100%' }}>
          <h2 style={{
            fontSize: 36, fontWeight: 800, color: '#fff',
            fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em',
            lineHeight: 1.15, marginBottom: 12,
          }}>
            Manage Bems Farms<br />from One Powerful Dashboard
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginBottom: 36, lineHeight: 1.6 }}>
            Track inventory, manage orders, handle deliveries and reward loyal customers — all in one place.
          </p>

          {/* Role cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {ROLES_ORDER.map(roleKey => {
              const m = ROLE_META[roleKey]
              return (
                <div key={roleKey} style={{
                  background: 'rgba(255,255,255,0.08)', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)', padding: '14px 16px',
                  backdropFilter: 'blur(4px)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={m.icon} style={{ color: m.color, fontSize: 14 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{m.description}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {ROLE_ACCESS[roleKey].map(a => (
                      <span key={a} style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 50,
                        background: m.bg, color: m.color,
                      }}>{a}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
            {[
              { icon: 'ri-store-2-line',     label: 'Multi-store POS',    sub: 'Manage multiple outlets' },
              { icon: 'ri-robot-line',       label: 'Chef Bems AI',       sub: 'Smart food recommendations' },
              { icon: 'ri-bar-chart-line',   label: 'Live Analytics',     sub: 'Real-time dashboards' },
            ].map(f => (
              <div key={f.label} style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: 'rgba(245,124,0,0.15)', border: '1px solid rgba(245,124,0,0.25)' }}>
                <i className={f.icon} style={{ fontSize: 20, color: '#F57C00', display: 'block', marginBottom: 6 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
