import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META } from '../../lib/roles'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('profile') // 'profile' | 'security'

  const [fields, setFields] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    id_number: '',
    tax_id: '',
    tax_country: '',
    address: '',
  })
  const [avatar, setAvatar] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    async function loadMe() {
      setLoading(true)
      try {
        const res = await api.get('/auth/me')
        const u = res.data?.user
        if (u) {
          setFields({
            name: u.name || '',
            email: u.email || '',
            phone: u.phone || '',
            gender: u.gender || '',
            id_number: u.id_number || '',
            tax_id: u.tax_id || '',
            tax_country: u.tax_country || '',
            address: u.address || '',
          })
          setAvatar(u.avatar_url || null)
          updateUser(u)
        }
      } catch (err) {
        toast.error('Failed to load profile')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WebP).')
      return
    }
    setUploadingAvatar(true)

    const img = new Image()
    const reader = new FileReader()
    reader.onload = (event) => {
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas')
          const MAX_SIZE = 480
          let { width, height } = img
          if (width > height) {
            if (width > MAX_SIZE) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE }
          } else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE
          }
          canvas.width = width
          canvas.height = height
          canvas.getContext('2d').drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

          const res = await api.patch('/auth/avatar', { avatar_url: dataUrl })
          setAvatar(res.data?.user?.avatar_url || dataUrl)
          updateUser({ avatar_url: res.data?.user?.avatar_url || dataUrl })
          toast.success('Profile photo updated!')
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to save photo')
        } finally {
          setUploadingAvatar(false)
        }
      }
      img.onerror = () => { setUploadingAvatar(false); toast.error('Could not read image file.') }
      img.src = event.target.result
    }
    reader.onerror = () => { setUploadingAvatar(false); toast.error('Failed to read image file.') }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true)
    try {
      await api.patch('/auth/avatar', { avatar_url: null })
      setAvatar(null)
      updateUser({ avatar_url: null })
      toast.success('Profile photo removed')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!fields.name.trim()) return toast.error('Name is required')
    setSavingProfile(true)
    try {
      const res = await api.patch('/auth/profile', fields)
      updateUser(res.data.user)
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!passwordForm.current || !passwordForm.next) return toast.error('Please enter your current and new password')
    if (passwordForm.next.length < 6) return toast.error('New password must be at least 6 characters')
    if (passwordForm.next !== passwordForm.confirm) return toast.error('New passwords do not match')

    setSavingPassword(true)
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current,
        new_password: passwordForm.next,
      })
      toast.success('Password updated successfully!')
      setPasswordForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password. Check your current password.')
    } finally {
      setSavingPassword(false)
    }
  }

  const roleMeta = user?.role ? ROLE_META[user.role] : null
  const initials = (fields.name?.[0] || user?.name?.[0] || 'A').toUpperCase()

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
        Loading your profile…
      </div>
    )
  }

  return (
    <div className="container-fluid py-2">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4 pb-2 border-bottom">
        <div>
          <h4 className="mb-1 fw-bold text-dark font-display">My Profile &amp; Security</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Manage your personal administrator identity, photo, contact information, and password security.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {roleMeta && (
            <span className="badge px-3 py-2 fs-12 fw-medium border" style={{ background: roleMeta.bg || '#f1f5f9', color: roleMeta.color || '#334155' }}>
              <i className={`${roleMeta.icon || 'ri-shield-user-line'} me-1.5`}></i>
              {roleMeta.label || user?.role}
            </span>
          )}
        </div>
      </div>

      {/* Profile Master Card */}
      <div className="card shadow-sm border mb-4" style={{ borderRadius: 14 }}>
        <div className="card-body p-4 d-flex align-items-center justify-content-between flex-wrap gap-4">
          <div className="d-flex align-items-center gap-3.5">
            <div className="position-relative flex-shrink-0">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold overflow-hidden shadow-sm border border-2 border-white"
                style={{ width: 76, height: 76, fontSize: 26, background: 'linear-gradient(135deg, #143C2D, #0B281B)' }}
              >
                {uploadingAvatar ? (
                  <div className="spinner-border spinner-border-sm text-white" role="status"></div>
                ) : avatar ? (
                  <img src={avatar} alt="Profile" className="w-100 h-100 object-fit-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary rounded-circle position-absolute d-flex align-items-center justify-content-center p-0 shadow-sm"
                style={{ width: 28, height: 28, bottom: -2, right: -2 }}
                onClick={() => fileInputRef.current?.click()}
                title="Upload photo"
              >
                <i className="ri-camera-line" style={{ fontSize: 13 }}></i>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="d-none" onChange={handleAvatarPick} />
            </div>

            <div>
              <h5 className="fw-bold text-dark mb-1 font-display">{fields.name || user?.name || 'Administrator'}</h5>
              <div className="d-flex align-items-center gap-2 text-muted mb-1" style={{ fontSize: 13 }}>
                <i className="ri-mail-line"></i>
                <span>{fields.email || user?.email}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 fs-11 fw-medium">
                  ● Active Session
                </span>
                {fields.phone && (
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    • {fields.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary px-3 py-2 fw-medium"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              <i className="ri-upload-2-line me-1"></i> {avatar ? 'Change Photo' : 'Upload Photo'}
            </button>
            {avatar && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger px-3 py-2 fw-medium"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
              >
                <i className="ri-delete-bin-line me-1"></i> Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="card shadow-sm border mb-4" style={{ borderRadius: 14 }}>
        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className={`btn btn-sm px-3.5 py-2 rounded-pill fw-semibold transition-all ${tab === 'profile' ? 'btn-primary shadow-sm' : 'btn-light border text-muted'}`}
              style={{ fontSize: 13 }}
              onClick={() => setTab('profile')}
            >
              <i className="ri-user-settings-line me-1.5"></i> Personal Details &amp; Contact
            </button>
            <button
              type="button"
              className={`btn btn-sm px-3.5 py-2 rounded-pill fw-semibold transition-all ${tab === 'security' ? 'btn-primary shadow-sm' : 'btn-light border text-muted'}`}
              style={{ fontSize: 13 }}
              onClick={() => setTab('security')}
            >
              <i className="ri-shield-keyhole-line me-1.5"></i> Password &amp; Security
            </button>
          </div>
        </div>

        <div className="card-body p-4">
          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile}>
              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Full Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Henry Adeleke"
                    value={fields.name}
                    onChange={(e) => setFields({ ...fields, name: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="henry@bemsfarms.com"
                    value={fields.email}
                    onChange={(e) => setFields({ ...fields, email: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="+234 800 000 0000"
                    value={fields.phone}
                    onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Gender</label>
                  <select
                    className="form-select"
                    value={fields.gender}
                    onChange={(e) => setFields({ ...fields, gender: e.target.value })}
                  >
                    <option value="">— Prefer not to say —</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Address / Location</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="City, State, Country"
                    value={fields.address}
                    onChange={(e) => setFields({ ...fields, address: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="mt-4 pt-3 border-top d-flex justify-content-end">
                <button type="submit" className="btn btn-primary px-4 py-2 fw-medium shadow-sm" disabled={savingProfile}>
                  <i className="ri-save-3-line me-1.5"></i>
                  {savingProfile ? 'Saving Changes…' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}

          {tab === 'security' && (
            <form onSubmit={handleChangePassword} style={{ maxWidth: 520 }}>
              <div className="mb-3.5">
                <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  autoComplete="current-password"
                  placeholder="Enter current password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3.5">
                <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>New Password</label>
                <input
                  type="password"
                  className="form-control"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  autoComplete="new-password"
                  placeholder="Re-type new password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  required
                />
              </div>

              <div className="p-3 bg-light rounded-3 border mb-4 text-muted" style={{ fontSize: 12 }}>
                <i className="ri-shield-keyhole-line text-primary me-1.5"></i>
                Changing your password will immediately sign you out of all other active browser sessions for security.
              </div>

              <button type="submit" className="btn btn-primary px-4 py-2 fw-medium shadow-sm" disabled={savingPassword}>
                <i className="ri-lock-password-line me-1.5"></i>
                {savingPassword ? 'Updating Password…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
