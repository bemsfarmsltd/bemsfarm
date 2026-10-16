import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.bemsfarms.com/api'

export default function LandingMobileAppsSection() {
  const [releases, setReleases] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/app-releases/latest`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.releases) {
          setReleases(data.releases)
        }
      })
      .catch((err) => {
        console.warn('Could not fetch app releases for landing section:', err)
      })
  }, [])

  const customerApp = releases?.customer
  const driverApp = releases?.driver

  const customerDownloadUrl = customerApp?.download_url || `${API_BASE}/app-releases/download/customer`
  const driverDownloadUrl = driverApp?.download_url || `${API_BASE}/app-releases/download/driver`

  return (
    <section
      id="mobile-apps"
      className="scroll-mt-24 border-t border-[#DDD3BF] bg-[#FAF8F5] px-5 py-20 sm:px-8 lg:px-12"
      aria-labelledby="mobile-apps-title"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/20 bg-emerald-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#143c2d] mb-3">
            <span>📱</span>
            <span>Official Mobile Apps</span>
          </div>
          <h2
            id="mobile-apps-title"
            className="font-display text-3xl font-extrabold text-[#143c2d] sm:text-4xl lg:text-5xl tracking-tight"
          >
            Download the <span className="text-[#c85a17]">BemsFarms</span> Apps
          </h2>
          <p className="mt-3.5 text-base text-slate-600 leading-relaxed">
            Install the official Android packages directly to your device for high-speed shopping, live tracking, and driver fleet dispatch.
          </p>
        </div>

        {/* 2 App Cards */}
        <div className="grid gap-8 md:grid-cols-2">
          
          {/* 1. Customer App */}
          <div className="relative rounded-[2rem] border-2 border-[#143c2d]/15 bg-white p-7 sm:p-9 flex flex-col justify-between shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#143c2d]/40 hover:shadow-2xl">
            <div className="absolute top-6 right-6">
              <span className="badge rounded-full px-3 py-1 bg-emerald-100/80 text-emerald-900 border border-emerald-200 text-xs font-bold">
                For Shoppers
              </span>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#143c2d] text-white text-3xl shadow-md shadow-emerald-950/20">
                  🛒
                </div>
                <div>
                  <h3 className="font-display text-2xl font-black text-[#143c2d]">
                    Customer App
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {customerApp?.file_size || '18.4 MB'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      v{customerApp?.version_name || '2.4.1'}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {customerApp?.min_android || 'Android 8.0+'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
                Shop fresh produce, in-house packed grains, and pantry staples. Enjoy 1-tap reorders, AI meal planning with Chef Bems, and real-time doorstep delivery tracking.
              </p>

              <div className="space-y-2.5 mb-8">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-800 text-xs">✓</span>
                  <span>Live GPS order status &amp; courier milestones</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-800 text-xs">✓</span>
                  <span>Instant alerts on fresh harvests &amp; restocks</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-800 text-xs">✓</span>
                  <span>Safe checkout with debit card, transfer &amp; USSD</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <a
                href={customerDownloadUrl}
                download="BemsCustomer.apk"
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-[#143c2d] hover:bg-[#1a4e3b] text-white py-4 px-6 font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-950/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">⬇️</span>
                <span>Download Customer App (.apk)</span>
              </a>
              <p className="text-center text-[11px] text-slate-400 mt-2.5">
                Direct installation for Android devices • Verified secure package
              </p>
            </div>
          </div>

          {/* 2. Driver App */}
          <div className="relative rounded-[2rem] border-2 border-[#c85a17]/15 bg-white p-7 sm:p-9 flex flex-col justify-between shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#c85a17]/40 hover:shadow-2xl">
            <div className="absolute top-6 right-6">
              <span className="badge rounded-full px-3 py-1 bg-amber-100/80 text-amber-900 border border-amber-200 text-xs font-bold">
                For Delivery Couriers
              </span>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#c85a17] text-white text-3xl shadow-md shadow-orange-950/20">
                  🛵
                </div>
                <div>
                  <h3 className="font-display text-2xl font-black text-[#143c2d]">
                    Driver Dispatch App
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {driverApp?.file_size || '57.3 MB'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      v{driverApp?.version_name || 'latest'}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {driverApp?.min_android || 'Android 8.0+'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
                For registered delivery riders and logistics contractors. Accept delivery orders, optimize multi-stop routes, upload delivery photos, and manage daily earnings.
              </p>

              <div className="space-y-2.5 mb-8">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-100 text-amber-900 text-xs">✓</span>
                  <span>Proximity auto-dispatch &amp; instant audio alerts</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-100 text-amber-900 text-xs">✓</span>
                  <span>Turn-by-turn routing with customer contact hotline</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-100 text-amber-900 text-xs">✓</span>
                  <span>Mandatory photo proof of delivery &amp; automated ledger</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <a
                href={driverDownloadUrl}
                download="BemsDriver.apk"
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-[#c85a17] hover:bg-[#b04f14] text-white py-4 px-6 font-extrabold text-sm sm:text-base shadow-lg shadow-orange-950/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">⬇️</span>
                <span>Download Driver App (.apk)</span>
              </a>
              <p className="text-center text-[11px] text-slate-400 mt-2.5">
                Direct installation for Android devices • Fleet fleet dispatch ready
              </p>
            </div>
          </div>

        </div>

        {/* Android Installation Guide Card */}
        <div className="mt-10 rounded-2xl bg-white border border-[#DFD6C2] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-lg">💡</span>
            <h4 className="text-sm font-bold text-slate-800">
              Installing on Android (2 Simple Steps):
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            1. Tap the download button above. If Chrome or your browser asks <em>“File might be harmful”</em>, tap <strong>“Download anyway”</strong> (this standard Android prompt appears for all apps installed outside Google Play).
            <br className="hidden sm:inline" />
            2. When the download completes, tap the notification to open and select <strong>“Install”</strong>.
          </p>
        </div>

      </div>
    </section>
  )
}
