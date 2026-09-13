import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
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
  const initials = (fields.name?.[0] || 'A').toUpperCase()

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="text-muted mt-2">Loading your profile...</div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">My Profile</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/settings">Settings</Link></li>
            <li className="breadcrumb-item active">My Profile</li>
          </ul>
        </div>
      </div>

      {/* Profile Banner */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body d-flex align-items-center gap-3 flex-wrap">
          <div className="position-relative flex-shrink-0">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold overflow-hidden shadow-sm"
              style={{ width: 72, height: 72, fontSize: 24, background: 'linear-gradient(135deg, #143C2D, #0B281B)' }}
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
              className="btn btn-sm btn-success rounded-circle position-absolute d-flex align-items-center justify-content-center p-0"
              style={{ width: 26, height: 26, bottom: -2, right: -2 }}
              onClick={() => fileInputRef.current?.click()}
              title="Upload photo"
            >
              <i className="ri-camera-line" style={{ fontSize: 13 }}></i>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="d-none" onChange={handleAvatarPick} />
          </div>

          <div className="flex-grow-1">
            <h5 className="fw-bold mb-0">{fields.name || 'Admin User'}</h5>
            <p className="text-muted mb-1 fs-sm">{fields.email}</p>
            {roleMeta && (
              <span className="badge" style={{ background: roleMeta.bg, color: roleMeta.color }}>
                <i className={`${roleMeta.icon} me-1`}></i>{roleMeta.label}
              </span>
            )}
          </div>

          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
              {avatar ? 'Change Photo' : 'Upload Photo'}
            </button>
            {avatar && (
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleRemoveAvatar} disabled={uploadingAvatar}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-bottom-0 pt-3">
          <ul className="nav nav-underline">
            <li className="nav-item">
              <button type="button" className={`nav-link ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
                <i className="ri-user-line me-1"></i>Profile & Contact
              </button>
            </li>
            <li className="nav-item">
              <button type="button" className={`nav-link ${tab === 'security' ? 'active' : ''}`} onClick={() => setTab('security')}>
                <i className="ri-shield-keyhole-line me-1"></i>Security & Password
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={fields.name}
                    onChange={(e) => setFields({ ...fields, name: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={fields.email}
                    onChange={(e) => setFields({ ...fields, email: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="+234 800 000 0000"
                    value={fields.phone}
                    onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Gender</label>
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
                  <label className="form-label fw-semibold">Address</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={fields.address}
                    onChange={(e) => setFields({ ...fields, address: e.target.value })}
                  ></textarea>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">ID Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. National ID / NIN"
                    value={fields.id_number}
                    onChange={(e) => setFields({ ...fields, id_number: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Tax ID</label>
                  <input
                    type="text"
                    className="form-control"
                    value={fields.tax_id}
                    onChange={(e) => setFields({ ...fields, tax_id: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Tax Country</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Nigeria"
                    value={fields.tax_country}
                    onChange={(e) => setFields({ ...fields, tax_country: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4">
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {tab === 'security' && (
            <form onSubmit={handleChangePassword} style={{ maxWidth: 420 }}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  autoComplete="current-password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">New Password</label>
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
              <div className="mb-3">
                <label className="form-label fw-semibold">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  autoComplete="new-password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
              <p className="text-muted fs-xs mt-3 mb-0">
                Changing your password will sign you out of all other active sessions.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
