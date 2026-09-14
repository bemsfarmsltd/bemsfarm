import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { STAFF_HOME } from '../../lib/roles'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import './Login.css'

export default function Onboard() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { setSession } = useAuth()

  // State
  const [verifying, setVerifying]     = useState(true)
  const [inviteData, setInviteData]   = useState(null)
  const [errorMsg, setErrorMsg]       = useState('')

  // Form
  const [name, setName]               = useState('')
  const [phone, setPhone]             = useState('')
  const [address, setAddress]         = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [showPassword, setShowPass]   = useState(false)
  const [agreed, setAgreed]           = useState(true)
  const [submitting, setSubmitting]   = useState(false)

  // ── Verify Token on Mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setVerifying(false)
      setErrorMsg('No invitation token found. Please check the link in your invitation email or contact your administrator.')
      return
    }

    api.get(`/auth/invitation/${token}`)
      .then((res) => {
        if (res.data?.valid) {
          setInviteData(res.data)
        } else {
          setErrorMsg(res.data?.message || 'Invalid or expired invitation.')
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Unable to verify invitation link. It may have expired or already been used.'
        setErrorMsg(msg)
      })
      .finally(() => {
        setVerifying(false)
      })
  }, [token])

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '#e2e8f0' }
    let score = 0
    if (pwd.length >= 6) score += 1
    if (pwd.length >= 8) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1

    if (score <= 2) return { score: 33, label: 'Weak', color: '#ef4444' }
    if (score <= 4) return { score: 66, label: 'Good', color: '#f59e0b' }
    return { score: 100, label: 'Strong', color: '#10b981' }
  }

  const strength = getPasswordStrength(password)

  // ── Handle Onboarding Submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Please enter your full legal name')
      return
    }
    if (!phone.trim()) {
      toast.error('Please enter your active phone number')
      return
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (!agreed) {
      toast.error('Please accept the operational guidelines to proceed')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        token,
        name: name.trim(),
        phone: phone.trim(),
        password,
        address: address.trim() || undefined,
      }

      const res = await api.post('/auth/accept-invite', payload)
      const { user, token: accessToken, message } = res.data

      toast.success(message || 'Account activated successfully! Welcome aboard.')

      // Establish session
      if (setSession && user && accessToken) {
        setSession(user, accessToken)
        const destination = STAFF_HOME[user.role] || '/dashboard'
        navigate(destination, { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    } catch (err) {
      console.error('Failed to accept invitation:', err)
      toast.error(err.response?.data?.message || 'Failed to complete account setup')
    } finally {
      setSubmitting(false)
    }
  }

  const roleTitle = inviteData?.role
    ? inviteData.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Staff Member'

  return (
    <div className="login-page-root">
      {/* ── LEFT HERO PANE ────────────────────────────────────── */}
      <div className="login-hero-pane">
        <div className="login-hero-bg">
          <img
            src="/bems_farms_twilight.jpg"
            alt="Bems Farms Facility"
            className="login-hero-img"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = '/bems_store_aisles.jpg'
            }}
          />
          <div className="login-hero-overlay" />
          <div className="login-hero-dotgrid" />
        </div>

        <div className="login-hero-top">
          <a href="https://www.bemsfarms.com" className="login-logo-badge">
            <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" className="login-logo-img" />
          </a>
        </div>

        <div className="login-hero-content">
          <div className="login-badge-pill">
            <span className="login-ping-dot" />
            <span>Staff Onboarding Portal</span>
          </div>

          <h1 className="login-hero-title">
            Join the Bems Farms Operations Team
          </h1>
          <p className="login-hero-desc">
            Activate your credentials to manage live warehouse logistics, inventory replenishments, POS checkout transactions, and delivery fleets.
          </p>

          <div className="login-pillars-row">
            <div className="login-pillar-item">
              <i className="ri-shield-check-fill login-pillar-icon" />
              <span>Role-Based Access Control</span>
            </div>
            <div className="login-pillar-item">
              <i className="ri-lock-password-fill login-pillar-icon" />
              <span>Encrypted Credentials</span>
            </div>
            <div className="login-pillar-item">
              <i className="ri-truck-fill login-pillar-icon" />
              <span>Automated Store Sync</span>
            </div>
          </div>
        </div>

        <div className="login-hero-footer">
          <div className="login-footer-meta">
            <span className="login-footer-badge">CONFIDENTIAL</span>
            <span>Internal enterprise use only · Authorized staff and drivers</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT CONTENT PANE ─────────────────────────────────── */}
      <div className="login-form-pane" style={{ overflowY: 'auto' }}>
        <div className="login-form-container" style={{ maxWidth: 520, margin: 'auto', padding: '2rem 1.5rem' }}>

          {/* VERIFYING STATE */}
          {verifying && (
            <div className="text-center py-5">
              <div className="spinner-border text-success mb-3" style={{ width: 42, height: 42 }} role="status" />
              <h5 className="fw-bold text-dark">Verifying Invitation Link...</h5>
              <p className="text-muted small">Checking security token against the Bems Farms staff registry</p>
            </div>
          )}

          {/* ERROR STATE */}
          {!verifying && errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-4"
            >
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 text-danger"
                style={{ width: 64, height: 64, background: '#fee2e2' }}
              >
                <i className="ri-error-warning-line fs-32" />
              </div>
              <h4 className="fw-bold text-dark mb-2">Invitation Unavailable</h4>
              <p className="text-muted mb-4" style={{ fontSize: 14 }}>
                {errorMsg}
              </p>
              <div className="d-flex flex-column gap-2">
                <Link to="/login" className="btn btn-primary w-100 py-2 fw-semibold">
                  Go to Staff Login
                </Link>
                <a href="mailto:info@bemsfarms.com" className="btn btn-outline-secondary w-100 py-2">
                  Contact Support
                </a>
              </div>
            </motion.div>
          )}

          {/* ONBOARDING FORM */}
          {!verifying && inviteData && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill" style={{ fontSize: 11 }}>
                    <i className="ri-check-line me-1" />Verified Invitation
                  </span>
                  {inviteData.department && (
                    <span className="badge bg-light text-muted border px-2 py-1 rounded-pill" style={{ fontSize: 11 }}>
                      {inviteData.department}
                    </span>
                  )}
                </div>
                <h3 className="fw-bold text-dark mb-1" style={{ fontSize: 24 }}>
                  Complete Your Profile
                </h3>
                <p className="text-muted" style={{ fontSize: 13 }}>
                  Invited by <strong>{inviteData.invited_by}</strong> as <strong>{roleTitle}</strong>. Set up your personal credentials below.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Email (Read-Only) */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Staff Email Address
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted border-end-0">
                      <i className="ri-mail-line" />
                    </span>
                    <input
                      type="email"
                      className="form-control bg-light border-start-0"
                      value={inviteData.email}
                      readOnly
                      style={{ cursor: 'not-allowed', color: '#475569' }}
                    />
                  </div>
                  <div className="form-text" style={{ fontSize: 11 }}>
                    Locked to your verified company invitation
                  </div>
                </div>

                {/* Full Name */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Full Legal Name <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="ri-user-line text-muted" />
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0 ps-0"
                      placeholder="e.g. Oluwaseun Adeleke"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Phone Number <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="ri-phone-line text-muted" />
                    </span>
                    <input
                      type="tel"
                      className="form-control border-start-0 ps-0"
                      placeholder="e.g. 0812 345 6789"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Optional Address */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Residential / Base Address <span className="text-muted fw-normal">(optional)</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="ri-map-pin-line text-muted" />
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0 ps-0"
                      placeholder="e.g. 14 Aba, Abia State"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-semibold text-secondary mb-0">
                      Create Password <span className="text-danger">*</span>
                    </label>
                    {password && (
                      <span className="small fw-semibold" style={{ color: strength.color, fontSize: 11 }}>
                        {strength.label}
                      </span>
                    )}
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="ri-lock-line text-muted" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control border-start-0 border-end-0 ps-0"
                      placeholder="Min. 6 characters"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="input-group-text bg-white border-start-0 text-muted"
                      onClick={() => setShowPass(!showPassword)}
                    >
                      <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                    </button>
                  </div>
                  {/* Strength Bar */}
                  {password && (
                    <div className="progress mt-1" style={{ height: 4 }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                      />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="mb-4">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Confirm Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="ri-lock-check-line text-muted" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control border-start-0 ps-0"
                      placeholder="Re-type password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <div className="text-danger mt-1" style={{ fontSize: 11 }}>
                      Passwords do not match
                    </div>
                  )}
                </div>

                {/* Terms checkbox */}
                <div className="form-check mb-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="termsAgreement"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <label className="form-check-label text-muted" htmlFor="termsAgreement" style={{ fontSize: 12 }}>
                    I agree to the Bems Farms operations charter, confidentiality, and data handling protocols.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  disabled={submitting || (confirmPassword && confirmPassword !== password)}
                  style={{
                    background: 'linear-gradient(135deg, #1B4332, #2D6A4F)',
                    borderColor: '#1B4332',
                    fontSize: 15,
                  }}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" />
                      Activating Account...
                    </>
                  ) : (
                    <>
                      <i className="ri-checkbox-circle-fill fs-18" />
                      Complete Setup &amp; Access Portal
                    </>
                  )}
                </button>

                <div className="text-center mt-3">
                  <span className="text-muted" style={{ fontSize: 12 }}>Already completed your onboarding? </span>
                  <Link to="/login" className="fw-semibold text-primary text-decoration-none" style={{ fontSize: 12 }}>
                    Log in here
                  </Link>
                </div>
              </form>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  )
}
