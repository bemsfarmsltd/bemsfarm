import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function MobileAppsSettings() {
  const [customerFile, setCustomerFile] = useState(null)
  const [customerVersion, setCustomerVersion] = useState('2.4.1')
  const [uploadingCustomer, setUploadingCustomer] = useState(false)

  const [driverFile, setDriverFile] = useState(null)
  const [driverVersion, setDriverVersion] = useState('2.3.0')
  const [uploadingDriver, setUploadingDriver] = useState(false)

  const handleUpload = async (appType) => {
    const isCustomer = appType === 'customer'
    const selectedFile = isCustomer ? customerFile : driverFile
    const version = isCustomer ? customerVersion : driverVersion
    const setUploading = isCustomer ? setUploadingCustomer : setUploadingDriver
    const setFile = isCustomer ? setCustomerFile : setDriverFile

    if (!selectedFile) {
      toast.error(`Please select a .apk file for ${isCustomer ? 'Customer App' : 'Driver App'}`)
      return
    }

    if (!selectedFile.name.toLowerCase().endsWith('.apk')) {
      toast.error('Only Android APK (.apk) files are supported')
      return
    }

    const formData = new FormData()
    formData.append('apk', selectedFile)
    formData.append('appType', appType)
    formData.append('versionName', version || (isCustomer ? '2.4.1' : '2.3.0'))
    formData.append('versionCode', (version || '1').replace(/\D/g, '') || '1')

    setUploading(true)
    const toastId = toast.loading(`Uploading ${selectedFile.name}...`)

    try {
      const res = await api.post('/admin/app-releases/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      })

      toast.success(res.data?.message || 'App uploaded successfully!', { id: toastId })
      setFile(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload APK', { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link to="/settings" className="hover:text-emerald-800 transition">Settings</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Mobile Apps</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>📱</span>
            <span>Mobile App Uploads</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Upload new APK files here. When uploaded, users download them directly from the landing page.
          </p>
        </div>

        <a
          href="https://www.bemsfarms.com/#mobile-apps"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl transition"
        >
          View Landing Page Download Section →
        </a>
      </div>

      {/* Two Clean Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 1. Customer App Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-xl">
              🛒
            </span>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Customer App</h2>
              <p className="text-xs text-gray-500">File: BemsCustomer.apk</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Select APK File (.apk)
              </label>
              <input
                type="file"
                accept=".apk"
                onChange={(e) => setCustomerFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
              />
              {customerFile && (
                <p className="text-xs text-emerald-700 font-semibold mt-1.5">
                  Selected: {customerFile.name} ({(customerFile.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Version (e.g. 2.4.1)
              </label>
              <input
                type="text"
                value={customerVersion}
                onChange={(e) => setCustomerVersion(e.target.value)}
                placeholder="2.4.1"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-medium text-gray-900 focus:border-emerald-800 outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleUpload('customer')}
                disabled={uploadingCustomer || !customerFile}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 px-4 text-xs font-bold shadow-xs transition cursor-pointer disabled:cursor-not-allowed"
              >
                {uploadingCustomer ? 'Uploading Customer APK…' : 'Upload Customer APK'}
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-500 flex items-center justify-between">
              <span>Landing Page Link:</span>
              <a
                href="/downloads/BemsCustomer.apk"
                download
                className="font-bold text-emerald-800 hover:underline"
              >
                Download Active APK
              </a>
            </div>
          </div>
        </div>

        {/* 2. Driver App Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-xl">
              🛵
            </span>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Driver App</h2>
              <p className="text-xs text-gray-500">File: BemsDriver.apk</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Select APK File (.apk)
              </label>
              <input
                type="file"
                accept=".apk"
                onChange={(e) => setDriverFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100 cursor-pointer"
              />
              {driverFile && (
                <p className="text-xs text-amber-800 font-semibold mt-1.5">
                  Selected: {driverFile.name} ({(driverFile.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Version (e.g. 2.3.0)
              </label>
              <input
                type="text"
                value={driverVersion}
                onChange={(e) => setDriverVersion(e.target.value)}
                placeholder="2.3.0"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-medium text-gray-900 focus:border-emerald-800 outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleUpload('driver')}
                disabled={uploadingDriver || !driverFile}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#c85a17] hover:bg-[#b04f14] disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 px-4 text-xs font-bold shadow-xs transition cursor-pointer disabled:cursor-not-allowed"
              >
                {uploadingDriver ? 'Uploading Driver APK…' : 'Upload Driver APK'}
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-500 flex items-center justify-between">
              <span>Landing Page Link:</span>
              <a
                href="/downloads/BemsDriver.apk"
                download
                className="font-bold text-amber-900 hover:underline"
              >
                Download Active APK
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
