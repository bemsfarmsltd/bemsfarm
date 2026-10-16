import { useEffect } from 'react'

export default function AppDownloadModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-download-title"
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <div className="mb-6 pr-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 text-xs font-bold mb-2">
            <span>📱</span>
            <span>Android APK Downloads</span>
          </div>
          <h2 id="app-download-title" className="text-2xl font-black tracking-tight text-slate-900">
            Download Mobile App
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Select the app you want to download directly to your Android device.
          </p>
        </div>

        {/* The Two Download Actions */}
        <div className="space-y-4">
          {/* Customer App Card */}
          <a
            href="/downloads/BemsCustomer.apk"
            download="BemsCustomer.apk"
            onClick={onClose}
            className="group flex items-center gap-4 rounded-2xl border-2 border-[#143c2d] bg-[#143c2d] p-4 text-white shadow-md transition hover:bg-[#1a4e3b] hover:border-[#1a4e3b] active:scale-[0.98]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15 text-2xl group-hover:scale-105 transition">
              🛒
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-extrabold">Customer App</span>
                <span className="text-xs bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                  .APK
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5 truncate">
                For online shopping, orders &amp; live tracking
              </p>
            </div>
            <span className="text-lg">⬇️</span>
          </a>

          {/* Driver App Card */}
          <a
            href="/downloads/BemsDriver.apk"
            download="BemsDriver.apk"
            onClick={onClose}
            className="group flex items-center gap-4 rounded-2xl border-2 border-[#c85a17] bg-[#c85a17] p-4 text-white shadow-md transition hover:bg-[#b04f14] hover:border-[#b04f14] active:scale-[0.98]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15 text-2xl group-hover:scale-105 transition">
              🛵
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-extrabold">Driver App</span>
                <span className="text-xs bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                  .APK
                </span>
              </div>
              <p className="text-xs text-amber-100/80 mt-0.5 truncate">
                For delivery riders &amp; courier fleet dispatch
              </p>
            </div>
            <span className="text-lg">⬇️</span>
          </a>
        </div>

        {/* Simple Note */}
        <p className="mt-5 text-center text-[11px] text-slate-400">
          Direct package installation for Android. Tap above to begin instant download.
        </p>
      </div>
    </div>
  )
}
