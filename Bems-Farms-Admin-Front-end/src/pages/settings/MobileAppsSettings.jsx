import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function MobileAppsSettings() {
  const [customerFile, setCustomerFile] = useState(null)
  const [customerDragging, setCustomerDragging] = useState(false)
  const [uploadingCustomer, setUploadingCustomer] = useState(false)
  const [customerProgress, setCustomerProgress] = useState(0)

  const [driverFile, setDriverFile] = useState(null)
  const [driverDragging, setDriverDragging] = useState(false)
  const [uploadingDriver, setUploadingDriver] = useState(false)
  const [driverProgress, setDriverProgress] = useState(0)

  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const customerInputRef = useRef(null)
  const driverInputRef = useRef(null)

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await api.get('/admin/app-releases/history')
      if (res.data?.success && Array.isArray(res.data.history)) {
        setHistory(res.data.history)
      }
    } catch (err) {
      console.warn('Failed to fetch release history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleFileSelect = (file, appType) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.apk')) {
      toast.error('Only Android APK (.apk) files are supported')
      return
    }
    if (appType === 'customer') {
      setCustomerFile(file)
      setCustomerProgress(0)
    } else {
      setDriverFile(file)
      setDriverProgress(0)
    }
  }

  const handleUpload = async (appType) => {
    const isCustomer = appType === 'customer'
    const selectedFile = isCustomer ? customerFile : driverFile
    const setUploading = isCustomer ? setUploadingCustomer : setUploadingDriver
    const setFile = isCustomer ? setCustomerFile : setDriverFile
    const setProgress = isCustomer ? setCustomerProgress : setDriverProgress

    if (!selectedFile) {
      toast.error(`Please select a .apk file for ${isCustomer ? 'Customer App' : 'Driver App'}`)
      return
    }

    const formData = new FormData()
    formData.append('appType', appType)
    formData.append('apk', selectedFile)

    setUploading(true)
    setProgress(0)
    const toastId = toast.loading(`Uploading & deploying ${selectedFile.name}...`)

    try {
      const res = await api.post('/admin/app-releases/upload', formData, {
        timeout: 600000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setProgress(percent)
          }
        },
      })

      toast.success(res.data?.message || `${isCustomer ? 'Customer' : 'Driver'} APK deployed successfully!`, { id: toastId })
      setFile(null)
      setProgress(0)
      if (isCustomer && customerInputRef.current) customerInputRef.current.value = ''
      if (!isCustomer && driverInputRef.current) driverInputRef.current.value = ''
      await fetchHistory()
    } catch (err) {
      console.error('APK upload error:', err)
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.code === 'ECONNABORTED' ? 'Upload timed out. Please check your internet connection.' : null) ||
        err.message ||
        'Failed to upload APK'
      toast.error(errorMsg, { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteRelease = async (id) => {
    if (!window.confirm('Are you sure you want to remove this release record from history?')) {
      return
    }
    try {
      await api.delete(`/admin/app-releases/${id}`)
      toast.success('Release record removed')
      await fetchHistory()
    } catch (err) {
      console.error('Failed to delete release:', err)
      toast.error(err.response?.data?.error || 'Failed to remove release record')
    }
  }

  return (
    <div className="container-fluid py-4 px-sm-4" style={{ maxWidth: '1100px' }}>
      <style>{`
        .app-upload-card {
          background: #ffffff;
          border: 1px solid #EFECE6;
          border-radius: 18px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }
        .app-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }
        .app-dropzone {
          border: 2px dashed #CBD5E1;
          border-radius: 14px;
          padding: 1.75rem 1rem;
          text-align: center;
          cursor: pointer;
          background: #FAF8F5;
          transition: all 0.2s ease;
        }
        .app-dropzone:hover, .app-dropzone.dragging {
          border-color: #143C2D;
          background: #EAF5EF;
        }
        .app-dropzone-amber:hover, .app-dropzone-amber.dragging {
          border-color: #C85A17;
          background: #FEF3C7;
        }
        .file-ready-box {
          background: #EAF5EF;
          border: 1px solid #A7F3D0;
          border-radius: 14px;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .file-ready-box-amber {
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          border-radius: 14px;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .btn-deploy-green {
          background-color: #143C2D;
          border-color: #143C2D;
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          padding: 0.65rem 1.25rem;
          border-radius: 12px;
          transition: all 0.15s ease;
        }
        .btn-deploy-green:hover:not(:disabled) {
          background-color: #1A4E3B;
          border-color: #1A4E3B;
          color: #ffffff;
        }
        .btn-deploy-amber {
          background-color: #C85A17;
          border-color: #C85A17;
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          padding: 0.65rem 1.25rem;
          border-radius: 12px;
          transition: all 0.15s ease;
        }
        .btn-deploy-amber:hover:not(:disabled) {
          background-color: #B04F14;
          border-color: #B04F14;
          color: #ffffff;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* ── Breadcrumb & Header ── */}
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 pb-3 mb-4 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '13px', color: '#64748B' }}>
            <Link to="/settings" className="text-decoration-none text-muted">Settings</Link>
            <span>/</span>
            <span className="fw-semibold text-dark">Mobile Apps</span>
          </div>
          <h1 className="h3 fw-bold text-dark mb-1 font-display" style={{ letterSpacing: '-0.02em' }}>
            Mobile Apps Management
          </h1>
          <p className="text-muted small mb-0">
            Upload and update the official Android APK builds served to customers and dispatch couriers.
          </p>
        </div>

        <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill border" style={{ backgroundColor: '#EAF5EF', borderColor: '#A7F3D0', fontSize: '12px', fontWeight: '700', color: '#143C2D', alignSelf: 'flex-start' }}>
          <span className="spinner-grow spinner-grow-sm text-success" style={{ width: '8px', height: '8px' }} role="status"></span>
          <span>Live Storefront Download Active</span>
        </div>
      </div>

      {/* ── Two Upload Cards in Grid ── */}
      <div className="row g-4 mb-4">
        
        {/* 1. Customer App Card */}
        <div className="col-12 col-lg-6">
          <div className="app-upload-card p-4">
            <div>
              {/* Header */}
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="app-icon-box" style={{ background: '#EAF5EF', color: '#143C2D' }}>
                    <i className="ri-shopping-cart-2-line"></i>
                  </div>
                  <div>
                    <h2 className="h5 fw-bold text-dark mb-0 font-display">Customer Shopping App</h2>
                    <span className="small text-muted">File: <code className="text-success fw-bold">BemsCustomer.apk</code></span>
                  </div>
                </div>
                <span className="badge rounded-pill px-2.5 py-1" style={{ background: '#EAF5EF', color: '#143C2D', border: '1px solid #A7F3D0', fontSize: '11px', fontWeight: '700' }}>
                  For Shoppers
                </span>
              </div>

              {/* Hidden Native File Input */}
              <input
                ref={customerInputRef}
                type="file"
                accept=".apk"
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e.target.files?.[0], 'customer')}
              />

              {/* Interactive Dropzone */}
              {!customerFile ? (
                <div
                  className={`app-dropzone ${customerDragging ? 'dragging' : ''}`}
                  onClick={() => customerInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setCustomerDragging(true); }}
                  onDragLeave={() => setCustomerDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCustomerDragging(false);
                    handleFileSelect(e.dataTransfer.files?.[0], 'customer');
                  }}
                >
                  <div className="d-inline-flex align-items-center justify-center rounded-circle mb-2" style={{ width: '44px', height: '44px', background: '#EAF5EF', color: '#143C2D', fontSize: '20px' }}>
                    <i className="ri-upload-cloud-2-line"></i>
                  </div>
                  <div className="fw-bold text-dark small mb-1">
                    Click to select or drag and drop new APK
                  </div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>
                    Accepts Android Application Package (.apk) up to 200MB
                  </div>
                </div>
              ) : (
                <div className="file-ready-box">
                  <div className="d-flex align-items-center gap-3 text-truncate">
                    <i className="ri-checkbox-circle-fill text-success fs-4"></i>
                    <div className="text-truncate">
                      <div className="fw-bold text-dark small text-truncate">{customerFile.name}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>
                        {(customerFile.size / (1024 * 1024)).toFixed(1)} MB • Ready to deploy
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerFile(null);
                      if (customerInputRef.current) customerInputRef.current.value = '';
                    }}
                    className="btn btn-sm btn-link text-danger text-decoration-none fw-bold"
                    style={{ fontSize: '12px' }}
                  >
                    Change
                  </button>
                </div>
              )}

              {uploadingCustomer && (
                <div className="progress mt-3" style={{ height: '6px' }}>
                  <div
                    className="progress-bar bg-success progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${customerProgress}%` }}
                  ></div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="d-flex align-items-center justify-content-between pt-4 mt-3 border-top gap-2">
              <a
                href="/downloads/BemsCustomer.apk"
                download="BemsCustomer.apk"
                className="text-decoration-none fw-bold small text-success d-flex align-items-center gap-1.5"
              >
                <i className="ri-download-2-line"></i>
                <span>Test Download Current</span>
              </a>

              <button
                type="button"
                onClick={() => handleUpload('customer')}
                disabled={uploadingCustomer || !customerFile}
                className="btn btn-deploy-green d-flex align-items-center gap-2"
              >
                {uploadingCustomer ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>{customerProgress > 0 ? `Uploading ${customerProgress}%…` : 'Deploying…'}</span>
                  </>
                ) : (
                  <>
                    <i className="ri-upload-2-line"></i>
                    <span>Deploy Customer APK</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Driver App Card */}
        <div className="col-12 col-lg-6">
          <div className="app-upload-card p-4">
            <div>
              {/* Header */}
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="app-icon-box" style={{ background: '#FEF3C7', color: '#B45309' }}>
                    <i className="ri-e-bike-2-line"></i>
                  </div>
                  <div>
                    <h2 className="h5 fw-bold text-dark mb-0 font-display">Driver Dispatch App</h2>
                    <span className="small text-muted">File: <code className="text-warning-emphasis fw-bold">BemsDriver.apk</code></span>
                  </div>
                </div>
                <span className="badge rounded-pill px-2.5 py-1" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', fontSize: '11px', fontWeight: '700' }}>
                  For Courier Fleet
                </span>
              </div>

              {/* Hidden Native File Input */}
              <input
                ref={driverInputRef}
                type="file"
                accept=".apk"
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e.target.files?.[0], 'driver')}
              />

              {/* Interactive Dropzone */}
              {!driverFile ? (
                <div
                  className={`app-dropzone app-dropzone-amber ${driverDragging ? 'dragging' : ''}`}
                  onClick={() => driverInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDriverDragging(true); }}
                  onDragLeave={() => setDriverDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDriverDragging(false);
                    handleFileSelect(e.dataTransfer.files?.[0], 'driver');
                  }}
                >
                  <div className="d-inline-flex align-items-center justify-center rounded-circle mb-2" style={{ width: '44px', height: '44px', background: '#FEF3C7', color: '#B45309', fontSize: '20px' }}>
                    <i className="ri-upload-cloud-2-line"></i>
                  </div>
                  <div className="fw-bold text-dark small mb-1">
                    Click to select or drag and drop new APK
                  </div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>
                    Accepts Android Application Package (.apk) up to 200MB
                  </div>
                </div>
              ) : (
                <div className="file-ready-box-amber">
                  <div className="d-flex align-items-center gap-3 text-truncate">
                    <i className="ri-checkbox-circle-fill text-warning-emphasis fs-4"></i>
                    <div className="text-truncate">
                      <div className="fw-bold text-dark small text-truncate">{driverFile.name}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>
                        {(driverFile.size / (1024 * 1024)).toFixed(1)} MB • Ready to deploy
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDriverFile(null);
                      if (driverInputRef.current) driverInputRef.current.value = '';
                    }}
                    className="btn btn-sm btn-link text-danger text-decoration-none fw-bold"
                    style={{ fontSize: '12px' }}
                  >
                    Change
                  </button>
                </div>
              )}
              {uploadingDriver && (
                <div className="progress mt-3" style={{ height: '6px' }}>
                  <div
                    className="progress-bar bg-warning progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${driverProgress}%` }}
                  ></div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="d-flex align-items-center justify-content-between pt-4 mt-3 border-top gap-2">
              <a
                href="/downloads/BemsDriver.apk"
                download="BemsDriver.apk"
                className="text-decoration-none fw-bold small text-warning-emphasis d-flex align-items-center gap-1.5"
              >
                <i className="ri-download-2-line"></i>
                <span>Test Download Current</span>
              </a>

              <button
                type="button"
                onClick={() => handleUpload('driver')}
                disabled={uploadingDriver || !driverFile}
                className="btn btn-deploy-amber d-flex align-items-center gap-2"
              >
                {uploadingDriver ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>{driverProgress > 0 ? `Uploading ${driverProgress}%…` : 'Deploying…'}</span>
                  </>
                ) : (
                  <>
                    <i className="ri-upload-2-line"></i>
                    <span>Deploy Driver APK</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Upload & Release History Table ── */}
      <div className="card border-0 rounded-4 shadow-sm mb-4" style={{ background: '#ffffff', border: '1px solid #EFECE6' }}>
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
            <div className="d-flex align-items-center gap-2.5">
              <div className="d-inline-flex align-items-center justify-content-center rounded-circle" style={{ width: '36px', height: '36px', background: '#EAF5EF', color: '#143C2D', fontSize: '18px' }}>
                <i className="ri-history-line"></i>
              </div>
              <div>
                <h3 className="h6 fw-bold text-dark mb-0 font-display">Upload &amp; Release History</h3>
                <span className="text-muted" style={{ fontSize: '11px' }}>Detailed log of every Customer and Driver build published to the server</span>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1.5 text-muted px-3 py-1.5"
              style={{ fontSize: '12px', borderRadius: '10px' }}
            >
              <i className={`ri-refresh-line ${loadingHistory ? 'spin' : ''}`}></i>
              <span>Refresh Log</span>
            </button>
          </div>

          {loadingHistory && history.length === 0 ? (
            <div className="py-4 text-center text-muted small">
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Loading upload history…
            </div>
          ) : history.length === 0 ? (
            <div className="py-4 text-center text-muted small">
              No upload records found. Upload a build above to log deployment details here.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                <thead className="table-light text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <tr>
                    <th scope="col" className="ps-3 py-3">Application</th>
                    <th scope="col" className="py-3">Target File</th>
                    <th scope="col" className="py-3">File Size</th>
                    <th scope="col" className="py-3">Status</th>
                    <th scope="col" className="py-3">Uploaded By</th>
                    <th scope="col" className="py-3">Date &amp; Time</th>
                    <th scope="col" className="pe-3 py-3 text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const isCust = item.app_type === 'customer'
                    return (
                      <tr key={item.id}>
                        <td className="ps-3 py-3">
                          <div className="d-flex align-items-center gap-2.5">
                            <span className="fs-5">
                              {isCust ? '🛒' : '🛵'}
                            </span>
                            <div>
                              <div className="fw-bold text-dark">
                                {isCust ? 'Customer Shopping App' : 'Driver Dispatch App'}
                              </div>
                              <div className="text-muted" style={{ fontSize: '11px' }}>
                                {item.package_name || (isCust ? 'com.bemsfarms.customer' : 'com.bemsfarms.driver')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <code className={`fw-bold ${isCust ? 'text-success' : 'text-warning-emphasis'}`} style={{ fontSize: '12px' }}>
                            {item.file_name || (isCust ? 'BemsCustomer.apk' : 'BemsDriver.apk')}
                          </code>
                        </td>
                        <td className="py-3 fw-semibold text-dark">
                          {item.file_size || (item.file_size_bytes ? `${(item.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : '—')}
                        </td>
                        <td className="py-3">
                          {item.is_active ? (
                            <span className="badge rounded-pill px-2.5 py-1" style={{ background: '#EAF5EF', color: '#143C2D', border: '1px solid #A7F3D0', fontWeight: '700', fontSize: '11px' }}>
                              <span className="spinner-grow spinner-grow-sm me-1" style={{ width: '6px', height: '6px' }}></span>
                              Live Storefront
                            </span>
                          ) : (
                            <span className="badge rounded-pill px-2.5 py-1 bg-light text-muted border" style={{ fontWeight: '600', fontSize: '11px' }}>
                              Replaced / Archive
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-muted" style={{ fontSize: '12px' }}>
                          {item.uploaded_by_email || 'admin@bemsfarms.com'}
                        </td>
                        <td className="py-3 text-muted" style={{ fontSize: '12px' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          }) : '—'}
                        </td>
                        <td className="pe-3 py-3 text-end">
                          <div className="d-inline-flex align-items-center gap-1.5">
                            <a
                              href={item.download_url || `https://api.bemsfarms.com/api/app-releases/download-file/${item.id}`}
                              download={item.file_name || (isCust ? 'BemsCustomer.apk' : 'BemsDriver.apk')}
                              className="btn btn-sm btn-light border px-2.5 py-1 text-decoration-none fw-semibold d-inline-flex align-items-center gap-1"
                              style={{ fontSize: '11.5px', borderRadius: '8px' }}
                              title="Download APK package"
                            >
                              <i className="ri-download-2-line"></i>
                              <span>Download</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteRelease(item.id)}
                              className="btn btn-sm btn-light text-danger border px-2 py-1 d-inline-flex align-items-center"
                              style={{ fontSize: '11.5px', borderRadius: '8px' }}
                              title="Remove release from history"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div className="card border-0 rounded-4 shadow-sm" style={{ background: '#ffffff', border: '1px solid #EFECE6' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="ri-information-line text-success fs-5"></i>
            <h3 className="h6 fw-bold text-dark mb-0 font-display">How Live Distribution Works</h3>
          </div>
          <div className="row g-3" style={{ fontSize: '12.5px' }}>
            <div className="col-12 col-md-4">
              <div className="fw-bold text-dark mb-1">
                <i className="ri-flashlight-line text-warning me-1"></i> Instant Storefront Sync
              </div>
              <div className="text-muted">
                Uploading a file replaces the live download immediately without requiring any server reboot.
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="fw-bold text-dark mb-1">
                <i className="ri-smartphone-line text-primary me-1"></i> Direct User Downloads
              </div>
              <div className="text-muted">
                Visitors on the landing page click "Download App" to instantly download the APK file to their Android device.
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="fw-bold text-dark mb-1">
                <i className="ri-shield-check-line text-success me-1"></i> Verified Packaging
              </div>
              <div className="text-muted">
                The system only accepts valid Android APK files and verifies file integrity before publishing.
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
