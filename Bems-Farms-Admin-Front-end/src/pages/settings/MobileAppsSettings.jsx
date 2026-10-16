import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function MobileAppsSettings() {
  const [customerFile, setCustomerFile] = useState(null)
  const [uploadingCustomer, setUploadingCustomer] = useState(false)

  const [driverFile, setDriverFile] = useState(null)
  const [uploadingDriver, setUploadingDriver] = useState(false)

  const handleUpload = async (appType) => {
    const isCustomer = appType === 'customer'
    const selectedFile = isCustomer ? customerFile : driverFile
    const setUploading = isCustomer ? setUploadingCustomer : setUploadingDriver
    const setFile = isCustomer ? setCustomerFile : setDriverFile

    if (!selectedFile) {
      toast.error(`Please select a .apk file for ${isCustomer ? 'Customer App' : 'Driver App'}`)
      return
    }

    if (!selectedFile.name.toLowerCase().endsWith('.apk')) {
      toast.error('Only Android APK (.apk) files are accepted')
      return
    }

    const formData = new FormData()
    formData.append('apk', selectedFile)
    formData.append('appType', appType)

    setUploading(true)
    const toastId = toast.loading(`Uploading ${selectedFile.name}...`)

    try {
      const res = await api.post('/admin/app-releases/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      })

      toast.success(res.data?.message || 'APK uploaded successfully!', { id: toastId })
      setFile(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload APK', { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Link to="/settings" className="hover:text-emerald-800 transition">Settings</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Mobile Apps</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Mobile Apps</h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload new Android APK files. Once uploaded, users can download them directly from the landing page.
        </p>
      </div>

      {/* Two Upload Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Customer App */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-gray-900">Customer App</h2>
            <p className="text-xs text-gray-500">File: BemsCustomer.apk</p>
          </div>

          <div className="space-y-3">
            <input
              type="file"
              accept=".apk"
              onChange={(e) => setCustomerFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
            />
            {customerFile && (
              <p className="text-xs text-emerald-700 font-medium">
                Ready to upload: {customerFile.name} ({(customerFile.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            )}

            <button
              type="button"
              onClick={() => handleUpload('customer')}
              disabled={uploadingCustomer || !customerFile}
              className="w-full rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 px-4 text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
            >
              {uploadingCustomer ? 'Uploading Customer APK...' : 'Upload Customer App APK'}
            </button>
          </div>
        </div>

        {/* Driver App */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-gray-900">Driver App</h2>
            <p className="text-xs text-gray-500">File: BemsDriver.apk</p>
          </div>

          <div className="space-y-3">
            <input
              type="file"
              accept=".apk"
              onChange={(e) => setDriverFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100 cursor-pointer"
            />
            {driverFile && (
              <p className="text-xs text-amber-800 font-medium">
                Ready to upload: {driverFile.name} ({(driverFile.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            )}

            <button
              type="button"
              onClick={() => handleUpload('driver')}
              disabled={uploadingDriver || !driverFile}
              className="w-full rounded-xl bg-[#c85a17] hover:bg-[#b04f14] disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 px-4 text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
            >
              {uploadingDriver ? 'Uploading Driver APK...' : 'Upload Driver App APK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
