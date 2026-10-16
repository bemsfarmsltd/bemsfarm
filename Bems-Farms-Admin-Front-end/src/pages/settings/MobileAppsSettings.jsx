import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import api from '../../lib/api'

export default function MobileAppsSettings() {
  const [activeTab, setActiveTab] = useState('customer') // 'customer' | 'driver'
  const [loading, setLoading] = useState(true)
  const [releases, setReleases] = useState({ customer: null, driver: null })
  const [history, setHistory] = useState([])
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  // Upload Form State
  const [file, setFile] = useState(null)
  const [versionName, setVersionName] = useState('')
  const [versionCode, setVersionCode] = useState('')
  const [minAndroid, setMinAndroid] = useState('Android 8.0+')
  const [releaseNotes, setReleaseNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // Load current releases and history
  const loadData = async () => {
    try {
      setLoading(true)
      const [resLatest, resHistory] = await Promise.all([
        api.get('/app-releases/latest'),
        api.get('/admin/app-releases/history'),
      ])

      if (resLatest.data?.releases) {
        setReleases(resLatest.data.releases)
      }
      if (resHistory.data?.history) {
        setHistory(resHistory.data.history)
      }
    } catch (err) {
      console.error('Failed loading app releases:', err)
      toast.error('Failed to load mobile app releases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const currentRelease = releases[activeTab]

  // Generate QR code for the current download URL
  useEffect(() => {
    if (currentRelease?.download_url) {
      QRCode.toDataURL(currentRelease.download_url, {
        width: 180,
        margin: 1,
        color: { dark: '#143c2d', light: '#ffffff' },
      })
        .then(setQrCodeUrl)
        .catch(console.error)
    }
  }, [currentRelease?.download_url, activeTab])

  // Reset form when tab changes
  useEffect(() => {
    setFile(null)
    setVersionName('')
    setVersionCode('')
    setReleaseNotes('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [activeTab])

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files?.[0]
    validateAndSetFile(droppedFile)
  }

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    validateAndSetFile(selected)
  }

  const validateAndSetFile = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.apk')) {
      toast.error('Invalid file type! Only Android .apk files are supported.')
      return
    }
    setFile(f)
    toast.success(`Selected: ${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`)

    // Attempt to auto-infer version from filename (e.g. app-v2.4.2.apk or bems-2.4.2.apk)
    const match = f.name.match(/v?(\d+\.\d+\.\d+)/i)
    if (match && !versionName) {
      setVersionName(match[1])
      const code = match[1].replace(/\./g, '')
      if (!versionCode) setVersionCode(code)
    }
  }

  // Handle Form Submit
  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select an APK file to upload')
      return
    }
    if (!versionName.trim() || !versionCode.toString().trim()) {
      toast.error('Please specify both Version Name and Version Code')
      return
    }

    const formData = new FormData()
    formData.append('apk', file)
    formData.append('appType', activeTab)
    formData.append('versionName', versionName.trim())
    formData.append('versionCode', versionCode.toString().trim())
    formData.append('minAndroid', minAndroid.trim())
    formData.append('releaseNotes', releaseNotes.trim())

    setUploading(true)
    const toastId = toast.loading(`Uploading & publishing ${activeTab === 'customer' ? 'Customer App' : 'Driver App'}...`)

    try {
      const res = await api.post('/admin/app-releases/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 min timeout for big APK uploads
      })

      toast.success(res.data?.message || 'New app build published successfully!', { id: toastId })
      setFile(null)
      setVersionName('')
      setVersionCode('')
      setReleaseNotes('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadData()
    } catch (err) {
      console.error('App upload failed:', err)
      const msg = err.response?.data?.error || err.message || 'Failed to upload app package'
      toast.error(msg, { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  const tabHistory = history.filter((h) => h.app_type === activeTab)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link to="/settings" className="hover:text-emerald-800 transition">Settings</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Mobile Apps &amp; Builds</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <span>📱</span>
            <span>Mobile App Deployment &amp; APK Releases</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Upload new Android APK packages for customer shopping and driver fleet dispatch. Uploads automatically update the public landing page download links in real time.
          </p>
        </div>

        <a
          href="https://www.bemsfarms.com/#mobile-apps"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#143c2d] px-4 py-2.5 text-xs font-bold border border-emerald-200 transition shadow-xs self-start sm:self-auto"
        >
          <span>🌐 Preview on Landing Page</span>
          <span>→</span>
        </a>
      </div>

      {/* App Selector Tabs */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('customer')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition cursor-pointer ${
            activeTab === 'customer'
              ? 'border-emerald-800 text-emerald-900 bg-emerald-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>🛒</span>
          <span>Customer Shopping App</span>
          <span className="ml-1 text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold">
            {releases.customer?.version_name ? `v${releases.customer.version_name}` : 'v2.4.1'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('driver')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition cursor-pointer ${
            activeTab === 'driver'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>🛵</span>
          <span>Driver Dispatch App</span>
          <span className="ml-1 text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-extrabold">
            {releases.driver?.version_name ? `v${releases.driver.version_name}` : 'v2.3.0'}
          </span>
        </button>
      </div>

      {/* Main Grid: Active Release & Upload Form */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Active Build Card & Live Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Build Status */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-gray-900 text-base">Live Active Release</h3>
              </div>
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Publicly Live
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading release status…</div>
            ) : currentRelease ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                    <span>{currentRelease.app_name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      Version {currentRelease.version_name} (Build {currentRelease.version_code})
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      Size: <strong>{currentRelease.file_size || '18.4 MB'}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-600 bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 leading-relaxed">
                  <strong>Release Notes:</strong>
                  <p className="mt-1 text-gray-700 whitespace-pre-line">
                    {currentRelease.release_notes || 'Official verified release.'}
                  </p>
                </div>

                {/* Direct Download & QR Code Section */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 bg-[#FAF9F6] p-4 rounded-xl border border-gray-200">
                  <div className="p-1.5 bg-white rounded-lg border border-gray-200 shrink-0 shadow-xs">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="Download QR code" className="w-24 h-24 object-contain" />
                    ) : (
                      <div className="w-24 h-24 grid place-items-center text-xs text-gray-400">QR Code</div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                      Live Download Link
                    </span>
                    <a
                      href={currentRelease.download_url}
                      download
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition shadow-xs w-full sm:w-auto"
                    >
                      <span>⬇️</span>
                      <span>Test Download APK</span>
                    </a>
                    <p className="text-[10px] text-gray-400 break-all">
                      {currentRelease.download_url}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1">
                  <span>Target: {currentRelease.min_android || 'Android 8.0+'}</span>
                  <span>Updated: {new Date(currentRelease.updated_at || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-500">No active release found.</div>
            )}
          </div>

          {/* Quick Notice Card */}
          <div className="bg-amber-50/70 rounded-2xl border border-amber-200/70 p-5 space-y-2 text-xs text-amber-900 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <span>⚡</span>
              <span>Landing Page Instant Sync</span>
            </div>
            <p>
              When you upload a new APK, the system automatically replaces <code>{activeTab === 'customer' ? 'BemsCustomer.apk' : 'BemsDriver.apk'}</code> in the distribution directory and updates the version badge and QR code on the live storefront.
            </p>
          </div>
        </div>

        {/* Right Column: Upload New Release Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleUploadSubmit}
            className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 sm:p-7 space-y-5"
          >
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span>🚀</span>
                <span>Publish New {activeTab === 'customer' ? 'Customer' : 'Driver'} App Build</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Select your compiled release APK file and specify version numbers.
              </p>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-emerald-600 bg-emerald-50/60 scale-[1.01]'
                  : file
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-gray-300 hover:border-emerald-700 bg-gray-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".apk"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white border border-gray-200 shadow-xs text-2xl mb-3">
                {file ? '📦' : '☁️'}
              </div>

              {file ? (
                <div>
                  <p className="text-sm font-extrabold text-emerald-900">{file.name}</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to publish
                  </p>
                  <span className="inline-block mt-3 text-xs text-gray-500 underline">
                    Click or drag another file to replace
                  </span>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    Click to select APK file or drag and drop here
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Only Android Application Packages (.apk) up to 200MB are supported
                  </p>
                </div>
              )}
            </div>

            {/* Version Information Inputs */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Version Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="e.g. 2.4.2"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800 outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Displayed to users (Semantic versioning)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Version Code (Integer) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={versionCode}
                  onChange={(e) => setVersionCode(e.target.value)}
                  placeholder="e.g. 242"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800 outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Internal Android build increment</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Minimum Supported Android OS
              </label>
              <input
                type="text"
                value={minAndroid}
                onChange={(e) => setMinAndroid(e.target.value)}
                placeholder="e.g. Android 8.0+ (Oreo)"
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800 outline-none"
              />
            </div>

            {/* Release Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Release Notes &amp; What's New
              </label>
              <textarea
                rows={3}
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="Highlight key updates, performance fixes, or new features in this version…"
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-xs font-medium text-gray-900 focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800 outline-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setFile(null)
                  setVersionName('')
                  setVersionCode('')
                  setReleaseNotes('')
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                disabled={uploading}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={uploading || !file}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-6 py-2.5 text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading APK ({file ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : ''})…</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Upload &amp; Publish Build</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Release History Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              {activeTab === 'customer' ? 'Customer App' : 'Driver App'} Release History
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Audit log of previously deployed mobile packages</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="text-xs text-gray-600 hover:text-emerald-800 font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-extrabold uppercase tracking-wider border-b border-gray-200 text-[10px]">
              <tr>
                <th className="px-5 py-3">Version</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">File Size</th>
                <th className="px-5 py-3">Uploaded By</th>
                <th className="px-5 py-3">Release Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {tabHistory.length > 0 ? (
                tabHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-5 py-3.5 font-bold text-gray-900">
                      v{item.version_name} <span className="text-gray-400 font-normal">({item.version_code})</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Live Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium">Archived</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-medium">{item.file_size || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{item.uploaded_by_email || 'admin'}</td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <a
                        href={item.download_url}
                        download
                        className="text-emerald-800 hover:text-emerald-950 font-bold underline transition"
                      >
                        Download APK
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    No release history for this application yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
