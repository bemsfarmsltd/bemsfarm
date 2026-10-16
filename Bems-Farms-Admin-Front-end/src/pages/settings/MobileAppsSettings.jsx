import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function MobileAppsSettings() {
  const [customerFile, setCustomerFile] = useState(null)
  const [customerDragging, setCustomerDragging] = useState(false)
  const [uploadingCustomer, setUploadingCustomer] = useState(false)

  const [driverFile, setDriverFile] = useState(null)
  const [driverDragging, setDriverDragging] = useState(false)
  const [uploadingDriver, setUploadingDriver] = useState(false)

  const customerInputRef = useRef(null)
  const driverInputRef = useRef(null)

  const handleFileSelect = (file, appType) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.apk')) {
      toast.error('Only Android APK (.apk) files are supported')
      return
    }
    if (appType === 'customer') {
      setCustomerFile(file)
    } else {
      setDriverFile(file)
    }
  }

  const handleUpload = async (appType) => {
    const isCustomer = appType === 'customer'
    const selectedFile = isCustomer ? customerFile : driverFile
    const setUploading = isCustomer ? setUploadingCustomer : setUploadingDriver
    const setFile = isCustomer ? setCustomerFile : setDriverFile

    if (!selectedFile) {
      toast.error(`Please select a .apk file for ${isCustomer ? 'Customer App' : 'Driver App'}`)
      return
    }

    const formData = new FormData()
    formData.append('apk', selectedFile)
    formData.append('appType', appType)

    setUploading(true)
    const toastId = toast.loading(`Uploading & deploying ${selectedFile.name}...`)

    try {
      const res = await api.post('/admin/app-releases/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      })

      toast.success(res.data?.message || `${isCustomer ? 'Customer' : 'Driver'} APK deployed successfully!`, { id: toastId })
      setFile(null)
      if (isCustomer && customerInputRef.current) customerInputRef.current.value = ''
      if (!isCustomer && driverInputRef.current) driverInputRef.current.value = ''
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload APK', { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
            <Link to="/settings" className="hover:text-emerald-800 transition">Settings</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Mobile Apps</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mobile Apps Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Upload and update the official Android APK packages downloaded directly from the storefront.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shrink-0 self-start sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Storefront Download Active</span>
        </div>
      </div>

      {/* ── Two Upload Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Customer App Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="p-6 space-y-5">
            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100/80 text-2xl shrink-0">
                  🛒
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-base">Customer Shopping App</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Target: <code className="text-emerald-800 font-semibold">BemsCustomer.apk</code></p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                For Shoppers
              </span>
            </div>

            {/* Dropzone */}
            <div>
              <input
                ref={customerInputRef}
                type="file"
                accept=".apk"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0], 'customer')}
              />

              {!customerFile ? (
                <div
                  onClick={() => customerInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setCustomerDragging(true); }}
                  onDragLeave={() => setCustomerDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCustomerDragging(false);
                    handleFileSelect(e.dataTransfer.files?.[0], 'customer');
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    customerDragging
                      ? 'border-emerald-600 bg-emerald-50/70 scale-[0.99]'
                      : 'border-gray-300 hover:border-emerald-600 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-800 text-xl mb-2">
                    📁
                  </div>
                  <p className="text-xs font-bold text-gray-800">
                    Click to select or drag and drop new APK
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Android Application Package (.apk) up to 200MB
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">📦</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{customerFile.name}</p>
                      <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                        {(customerFile.size / (1024 * 1024)).toFixed(1)} MB • Ready to deploy
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerFile(null);
                      if (customerInputRef.current) customerInputRef.current.value = '';
                    }}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="bg-gray-50/80 px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <a
              href="/downloads/BemsCustomer.apk"
              download="BemsCustomer.apk"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition"
            >
              <span>⬇️</span>
              <span>Test Download Active File</span>
            </a>

            <button
              type="button"
              onClick={() => handleUpload('customer')}
              disabled={uploadingCustomer || !customerFile}
              className="rounded-xl bg-[#143c2d] hover:bg-[#1a4e3b] disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 px-5 text-xs font-bold shadow-xs transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploadingCustomer ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deploying…</span>
                </>
              ) : (
                <span>Upload &amp; Deploy APK</span>
              )}
            </button>
          </div>
        </div>

        {/* 2. Driver App Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="p-6 space-y-5">
            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100/80 text-2xl shrink-0">
                  🛵
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-base">Driver Dispatch App</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Target: <code className="text-amber-800 font-semibold">BemsDriver.apk</code></p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                For Courier Fleet
              </span>
            </div>

            {/* Dropzone */}
            <div>
              <input
                ref={driverInputRef}
                type="file"
                accept=".apk"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0], 'driver')}
              />

              {!driverFile ? (
                <div
                  onClick={() => driverInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDriverDragging(true); }}
                  onDragLeave={() => setDriverDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDriverDragging(false);
                    handleFileSelect(e.dataTransfer.files?.[0], 'driver');
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    driverDragging
                      ? 'border-amber-600 bg-amber-50/70 scale-[0.99]'
                      : 'border-gray-300 hover:border-amber-600 hover:bg-amber-50/30'
                  }`}
                >
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-amber-50 text-amber-800 text-xl mb-2">
                    📁
                  </div>
                  <p className="text-xs font-bold text-gray-800">
                    Click to select or drag and drop new APK
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Android Application Package (.apk) up to 200MB
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">📦</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{driverFile.name}</p>
                      <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                        {(driverFile.size / (1024 * 1024)).toFixed(1)} MB • Ready to deploy
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDriverFile(null);
                      if (driverInputRef.current) driverInputRef.current.value = '';
                    }}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="bg-gray-50/80 px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <a
              href="/downloads/BemsDriver.apk"
              download="BemsDriver.apk"
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 transition"
            >
              <span>⬇️</span>
              <span>Test Download Active File</span>
            </a>

            <button
              type="button"
              onClick={() => handleUpload('driver')}
              disabled={uploadingDriver || !driverFile}
              className="rounded-xl bg-[#c85a17] hover:bg-[#b04f14] disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 px-5 text-xs font-bold shadow-xs transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploadingDriver ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deploying…</span>
                </>
              ) : (
                <span>Upload &amp; Deploy APK</span>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* ── Deployment Information Footer Card ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
          <span>ℹ️</span>
          <span>How Live Distribution Works</span>
        </h3>
        <div className="grid sm:grid-cols-3 gap-4 text-xs text-gray-600">
          <div className="flex items-start gap-2.5">
            <span className="text-base">⚡</span>
            <div>
              <p className="font-bold text-gray-900">Instant Storefront Sync</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Uploading a file replaces the live download immediately without server downtime.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-base">📱</span>
            <div>
              <p className="font-bold text-gray-900">Direct User Downloads</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Landing page visitors tap "Download App" to get the latest APK directly.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-base">🔒</span>
            <div>
              <p className="font-bold text-gray-900">Verified Packaging</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Only authentic Android APK packages are accepted and distributed.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
