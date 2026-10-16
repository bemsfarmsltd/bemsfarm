export default function LandingMobileAppsSection() {
  return (
    <section
      id="mobile-apps"
      className="scroll-mt-24 border-t border-[#DDD3BF] bg-[#FAF8F5] px-5 py-16 sm:px-8 lg:px-12"
      aria-labelledby="mobile-apps-title"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#143c2d]">
            Mobile Applications
          </p>
          <h2
            id="mobile-apps-title"
            className="mt-2 font-display text-3xl font-bold text-[#143c2d] sm:text-4xl"
          >
            Download the BemsFarms Apps
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Install the official Android apps directly on your phone to shop or deliver with BemsFarms.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* 1. Customer App */}
          <div className="rounded-3xl border border-[#DFD6C2] bg-white p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-2xl">
                  🛒
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#143c2d]">
                    Customer App
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Android APK
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Shop fresh farm produce, grains, and kitchen essentials with 1-tap reorders and live doorstep order tracking.
              </p>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100">
              <a
                href="/downloads/BemsCustomer.apk"
                download="BemsCustomer.apk"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#143c2d] hover:bg-[#1a4e3b] text-white py-3.5 px-6 font-bold text-sm shadow-md transition active:scale-[0.98]"
              >
                <span>⬇️</span>
                <span>Download Customer App (.apk)</span>
              </a>
            </div>
          </div>

          {/* 2. Driver App */}
          <div className="rounded-3xl border border-[#DFD6C2] bg-white p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-2xl">
                  🛵
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#143c2d]">
                    Driver App
                  </h3>
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Android APK
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                For registered dispatch couriers. Receive order assignments, navigate routes, capture photo delivery proof, and track earnings.
              </p>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100">
              <a
                href="/downloads/BemsDriver.apk"
                download="BemsDriver.apk"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#c85a17] hover:bg-[#b04f14] text-white py-3.5 px-6 font-bold text-sm shadow-md transition active:scale-[0.98]"
              >
                <span>⬇️</span>
                <span>Download Driver App (.apk)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
