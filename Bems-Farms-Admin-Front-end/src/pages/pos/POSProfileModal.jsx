import React, { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META, isSalesRole } from '../../lib/roles'

export default function POSProfileModal({ isOpen, onClose, onLogout, session, shiftStats }) {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'security'
  const [loading, setLoading] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Profile fields
  const [fields, setFields] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
  })
  const [avatar, setAvatar] = useState(null)

  // Password fields
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  })
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNextPass, setShowNextPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  // Load user data whenever modal opens
  useEffect(() => {
    if (!isOpen) return
    if (user) {
      setFields({
        name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        emergency_contact: user.emergency_contact || '',
        emergency_phone: user.emergency_phone || '',
      })
      setAvatar(user.avatar_url || null)
    }

    // Fetch fresh profile data
    api.get('/auth/me')
      .then((res) => {
        const u = res.data?.user
        if (u) {
          setFields({
            name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '',
            email: u.email || '',
            phone: u.phone || '',
            address: u.address || '',
            emergency_contact: u.emergency_contact || '',
            emergency_phone: u.emergency_phone || '',
          })
          setAvatar(u.avatar_url || null)
          updateUser(u)
        }
      })
      .catch(() => {
        // Silently fallback to current context user
      })
  }, [isOpen, user, updateUser])

  if (!isOpen) return null

  const roleMeta = user?.role ? ROLE_META[user.role] : null
  const initials = (fields.name?.[0] || user?.first_name?.[0] || 'S').toUpperCase()
  const isSales = isSalesRole(user?.role)

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WebP).')
      return
    }

    setUploadingAvatar(true)
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (event) => {
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas')
          const MAX_SIZE = 400
          let { width, height } = img
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width)
              width = MAX_SIZE
            }
          } else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height)
            height = MAX_SIZE
          }
          canvas.width = width
          canvas.height = height
          canvas.getContext('2d').drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

          const res = await api.patch('/auth/avatar', { avatar_url: dataUrl })
          const newAvatar = res.data?.user?.avatar_url || dataUrl
          setAvatar(newAvatar)
          updateUser({ avatar_url: newAvatar })
          toast.success('Profile avatar updated!')
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to update avatar photo.')
        } finally {
          setUploadingAvatar(false)
        }
      }
      img.onerror = () => {
        setUploadingAvatar(false)
        toast.error('Could not process selected image.')
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!fields.name.trim()) {
      return toast.error('Full name is required.')
    }
    setSavingProfile(true)
    try {
      const res = await api.patch('/auth/profile', fields)
      if (res.data?.user) {
        updateUser(res.data.user)
      }
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile changes.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!passwordForm.current || !passwordForm.next) {
      return toast.error('Please enter your current and new password.')
    }
    if (passwordForm.next.length < 6) {
      return toast.error('New password must be at least 6 characters.')
    }
    if (passwordForm.next !== passwordForm.confirm) {
      return toast.error('New passwords do not match.')
    }

    setSavingPassword(true)
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current,
        new_password: passwordForm.next,
      })
      toast.success('Password changed successfully!')
      setPasswordForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password. Please check your current password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div
      className="modal show d-block pos-modal-overlay-wrap"
      tabIndex="-1"
      style={{ zIndex: 9999, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: '640px', width: '95vw', margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-content shadow-2xl border-0"
          style={{
            borderRadius: '20px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* ── Modal Header Banner ── */}
          <div
            className="p-4 text-white position-relative"
            style={{
              background: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
            }}
          >
            <button
              type="button"
              className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
              onClick={onClose}
              aria-label="Close"
            ></button>

            <div className="d-flex align-items-center gap-3.5">
              {/* Avatar circle */}
              <div className="position-relative">
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    backgroundColor: '#ecfdf5',
                    color: '#065f46',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 800,
                    border: '3px solid #ffffff',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                  }}
                >
                  {avatar ? (
                    <img src={avatar} alt="Staff" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload profile photo"
                  disabled={uploadingAvatar}
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #10b981',
                    color: '#065f46',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <i className="ri-camera-fill"></i>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>

              {/* Name & Role badge */}
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                  <h5 className="mb-0 fw-bold text-white fs-18">{fields.name || 'Sales Staff'}</h5>
                  <span
                    className="badge rounded-pill px-2.5 py-1 text-xs fw-bold"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.22)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.35)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    <i className="ri-shield-user-line me-1"></i>
                    {roleMeta?.label || (isSales ? 'Sales Person' : user?.role || 'Staff')}
                  </span>
                </div>
                <div className="text-white-50 fs-12 d-flex align-items-center gap-3 flex-wrap">
                  <span><i className="ri-mail-line me-1"></i>{fields.email || '—'}</span>
                  {fields.phone && <span><i className="ri-phone-line me-1"></i>{fields.phone}</span>}
                </div>
              </div>
            </div>

            {/* Active Shift Info Strip */}
            <div
              className="mt-3.5 pt-2.5 px-3 py-2 rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.18)',
                fontSize: '11.5px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: session ? '#34d399' : '#94a3b8',
                    display: 'inline-block',
                  }}
                ></span>
                <span>
                  {session ? `Shift: ${session.session_ref || 'Active'}` : 'No Active Shift'}
                  {session?.terminal_id && ` · Terminal #${session.terminal_id}`}
                </span>
              </div>
              {shiftStats && shiftStats.totalSales > 0 && (
                <div className="fw-bold text-emerald-200">
                  Shift Sales: ₦{Number(shiftStats.totalSales).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* ── Nav Tabs ── */}
          <div className="px-4 pt-3 pb-0 border-bottom d-flex gap-3 bg-light">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`pb-2.5 px-2 border-0 bg-transparent fw-bold fs-13 d-flex align-items-center gap-1.5 position-relative ${
                activeTab === 'profile' ? 'text-success' : 'text-muted'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <i className="ri-user-settings-line"></i>
              <span>Profile & Contact</span>
              {activeTab === 'profile' && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2.5px',
                    backgroundColor: '#059669',
                    borderRadius: '3px 3px 0 0',
                  }}
                ></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`pb-2.5 px-2 border-0 bg-transparent fw-bold fs-13 d-flex align-items-center gap-1.5 position-relative ${
                activeTab === 'security' ? 'text-success' : 'text-muted'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <i className="ri-lock-password-line"></i>
              <span>Security & Password</span>
              {activeTab === 'security' && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2.5px',
                    backgroundColor: '#059669',
                    borderRadius: '3px 3px 0 0',
                  }}
                ></span>
              )}
            </button>
          </div>

          {/* ── Tab Content Body ── */}
          <div className="modal-body p-4" style={{ maxHeight: 'calc(80vh - 220px)', overflowY: 'auto' }}>
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="d-flex flex-column gap-3">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold fs-12 text-secondary mb-1">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={fields.name}
                      onChange={(e) => setFields({ ...fields, name: e.target.value })}
                      required
                      placeholder="e.g. Kemi Balogun"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold fs-12 text-secondary mb-1">Staff Email</label>
                    <input
                      type="email"
                      className="form-control bg-light"
                      value={fields.email}
                      disabled
                      readOnly
                      title="Email address managed by store administrator"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold fs-12 text-secondary mb-1">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={fields.phone}
                      onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                      placeholder="+234 800 000 0000"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold fs-12 text-secondary mb-1">Emergency Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={fields.emergency_phone}
                      onChange={(e) => setFields({ ...fields, emergency_phone: e.target.value })}
                      placeholder="Contact in emergency"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-bold fs-12 text-secondary mb-1">Residential / Contact Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={fields.address}
                      onChange={(e) => setFields({ ...fields, address: e.target.value })}
                      placeholder="Street, City, State"
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end mt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="btn btn-success px-4 py-2 fw-bold d-flex align-items-center gap-1.5"
                    style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                  >
                    {savingProfile ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Saving…</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line fs-14"></i>
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleChangePassword} className="d-flex flex-column gap-3">
                <div className="alert alert-info py-2 px-3 fs-12 mb-1 d-flex align-items-center gap-2">
                  <i className="ri-information-line fs-15 text-primary"></i>
                  <span>Ensure your new password contains at least 6 characters. Do not share credentials.</span>
                </div>

                <div>
                  <label className="form-label fw-bold fs-12 text-secondary mb-1">Current Password</label>
                  <div className="input-group">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      className="form-control"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      required
                      placeholder="Enter current staff password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                    >
                      <i className={showCurrentPass ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label fw-bold fs-12 text-secondary mb-1">New Password</label>
                  <div className="input-group">
                    <input
                      type={showNextPass ? 'text' : 'password'}
                      className="form-control"
                      value={passwordForm.next}
                      onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                      required
                      minLength={6}
                      placeholder="Enter new secure password (min 6 chars)"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowNextPass(!showNextPass)}
                    >
                      <i className={showNextPass ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label fw-bold fs-12 text-secondary mb-1">Confirm New Password</label>
                  <div className="input-group">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      className="form-control"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      required
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                    >
                      <i className={showConfirmPass ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                    </button>
                  </div>
                </div>

                <div className="d-flex justify-content-end mt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="btn btn-primary px-4 py-2 fw-bold d-flex align-items-center gap-1.5"
                  >
                    {savingPassword ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Updating Password…</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-shield-keyhole-line fs-14"></i>
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── Modal Footer ── */}
          <div className="modal-footer px-4 py-3 bg-light d-flex justify-content-between align-items-center">
            {/* Direct Logout CTA */}
            <button
              type="button"
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1.5 px-3 py-1.5 fw-bold"
              onClick={() => {
                onClose()
                if (onLogout) onLogout()
              }}
              title="Sign Out of POS"
            >
              <i className="ri-logout-box-r-line"></i>
              <span>Sign Out of POS</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm px-4 py-1.5 fw-bold"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
