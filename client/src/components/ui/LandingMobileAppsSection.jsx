import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import api from "../../services/api";

export default function LandingMobileAppsSection({ onOpenDownloadModal }) {
  const [customerQr, setCustomerQr] = useState("");
  const [driverQr, setDriverQr] = useState("");

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://bemsfarms.com";

  const [releases, setReleases] = useState({
    customer: {
      version_name: "2.4.1",
      version_code: 241,
      file_size: "18.4 MB",
      download_url: `${origin}/downloads/BemsCustomer.apk`,
      min_android: "Android 8.0+",
    },
    driver: {
      version_name: "2.3.0",
      version_code: 230,
      file_size: "16.8 MB",
      download_url: `${origin}/downloads/BemsDriver.apk`,
      min_android: "Android 8.0+",
    },
  });

  // Fetch dynamic releases from server
  useEffect(() => {
    api
      .get("/app-releases/latest")
      .then((res) => {
        if (res.data?.releases) {
          setReleases((prev) => ({
            customer: { ...prev.customer, ...res.data.releases.customer },
            driver: { ...prev.driver, ...res.data.releases.driver },
          }));
        }
      })
      .catch(() => {
        // Fall back gracefully to preset defaults
      });
  }, []);

  const customerDownloadUrl = releases.customer?.download_url || `${origin}/downloads/BemsCustomer.apk`;
  const driverDownloadUrl = releases.driver?.download_url || `${origin}/downloads/BemsDriver.apk`;

  useEffect(() => {
    QRCode.toDataURL(customerDownloadUrl, {
      width: 140,
      margin: 1,
      color: { dark: "#0f3824", light: "#ffffff" },
    }).then(setCustomerQr).catch(console.error);

    QRCode.toDataURL(driverDownloadUrl, {
      width: 140,
      margin: 1,
      color: { dark: "#78350f", light: "#ffffff" },
    }).then(setDriverQr).catch(console.error);
  }, [customerDownloadUrl, driverDownloadUrl]);

  const triggerDirectDownload = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section
      id="mobile-apps"
      className="scroll-mt-24 bg-[#FAF8F5] px-5 py-20 sm:px-8 lg:px-12 lg:py-28 relative overflow-hidden"
      aria-labelledby="mobile-apps-title"
    >
      {/* Decorative ambient background accents */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-200/30 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#143c2d] shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Official Mobile Ecosystem</span>
          </div>

          <h2
            id="mobile-apps-title"
            className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-black text-[#143c2d] leading-tight"
          >
            Download the Official BemsFarms Apps
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Experience lightning-fast farm grocery shopping, live Chef Bems AI meal planning,
            and dedicated logistics dispatch on your Android device.
          </p>
        </div>

        {/* Dual Cards Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* ─────────────────────────────────────────────────────────────
              CARD 1: CUSTOMER APP
              ───────────────────────────────────────────────────────────── */}
          <div className="group relative rounded-[2.5rem] bg-gradient-to-br from-[#0F3824] via-[#0A2E1C] to-[#14422B] text-white p-7 sm:p-10 lg:p-12 shadow-xl border border-emerald-500/20 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-emerald-400/40">
            {/* Ambient pattern */}
            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Header Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
                  <span>🛒 Shoppers &amp; Families</span>
                </span>
                <span className="text-xs font-bold text-emerald-200/80 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  v{releases.customer?.version_name || "2.4.1"} · Android APK ({releases.customer?.file_size || "18.4 MB"})
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="font-display text-2xl sm:text-3xl font-black text-white leading-tight">
                BemsFarms Customer App
              </h3>
              <p className="mt-3 text-sm sm:text-base text-emerald-100/85 leading-relaxed">
                Your direct mobile gateway to fresh farm harvests, sorted grains, and Nigerian staples.
                Order in seconds, consult Chef Bems AI for recipes, and track your courier live to your doorstep.
              </p>

              {/* Feature Highlights Grid */}
              <div className="mt-8 grid sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-400 text-[#0A2E1C] font-black text-xs shrink-0">✓</span>
                  <span className="font-bold text-white">1-Tap Fast Reorder</span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-400 text-[#0A2E1C] font-black text-xs shrink-0">✓</span>
                  <span className="font-bold text-white">Chef Bems AI Cooking</span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-400 text-[#0A2E1C] font-black text-xs shrink-0">✓</span>
                  <span className="font-bold text-white">Live Courier GPS Radar</span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-400 text-[#0A2E1C] font-black text-xs shrink-0">✓</span>
                  <span className="font-bold text-white">Safe Monnify &amp; Cards</span>
                </div>
              </div>
            </div>

            {/* Actions & QR Footer */}
            <div className="mt-10 pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="w-full sm:w-auto flex-1 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    triggerDirectDownload(customerDownloadUrl, "BemsCustomer.apk");
                    if (onOpenDownloadModal) onOpenDownloadModal("customer");
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-[#0A2E1C] px-7 py-4 text-sm font-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer active:scale-95"
                >
                  <span className="text-base">⬇️</span>
                  <span>Download Customer APK</span>
                  <span className="text-xs opacity-75 font-bold">({releases.customer?.file_size || "18.4 MB"})</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenDownloadModal && onOpenDownloadModal("customer")}
                    className="text-xs font-bold text-amber-300 hover:text-white underline transition cursor-pointer"
                  >
                    View install guide &amp; checksum →
                  </button>
                  <span className="text-white/30">•</span>
                  <span className="text-xs text-emerald-200/70">{releases.customer?.min_android || "Requires Android 8.0+"}</span>
                </div>
              </div>

              {/* QR Code widget */}
              <div
                onClick={() => onOpenDownloadModal && onOpenDownloadModal("customer")}
                className="cursor-pointer group/qr flex flex-col items-center bg-white/10 hover:bg-white/20 p-3 rounded-2xl border border-white/15 transition-all shrink-0 text-center"
                title="Scan to download Customer App"
              >
                <div className="p-1.5 bg-white rounded-xl shadow-xs">
                  {customerQr ? (
                    <img src={customerQr} alt="QR code to download Customer App" className="w-20 h-20 object-contain" />
                  ) : (
                    <div className="w-20 h-20 grid place-items-center text-xs text-slate-400">QR</div>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 mt-1.5">
                  Scan for Mobile
                </span>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              CARD 2: DRIVER APP
              ───────────────────────────────────────────────────────────── */}
          <div className="group relative rounded-[2.5rem] bg-gradient-to-br from-[#1C2A22] via-[#14231B] to-[#0D1812] text-white p-7 sm:p-10 lg:p-12 shadow-xl border border-amber-500/20 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-amber-400/40">
            {/* Ambient pattern */}
            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Header Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                  <span>🛵 Verified Couriers &amp; Fleet</span>
                </span>
                <span className="text-xs font-bold text-amber-200/80 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  v{releases.driver?.version_name || "2.3.0"} · Dispatch Build ({releases.driver?.file_size || "16.8 MB"})
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="font-display text-2xl sm:text-3xl font-black text-white leading-tight">
                BemsFarms Driver App
              </h3>
              <p className="mt-3 text-sm sm:text-base text-amber-100/85 leading-relaxed">
                The operations app for active dispatch riders and delivery partners. Receive proximity order dispatches,
                navigate routes, capture mandatory delivery proofs, and track daily earnings in real time.
              </p>

              {/* Feature Highlights Grid */}
              <div className="mt-8 grid sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-400 text-[#0A2E1C] font-black text-xs shrink-0">✓</span>
                  <span className="font-bold text-white">Auto-Dispatch Radar</span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-400 text-[#0A2E1C] font-black text-xs shrink-0">✓</span>
                  <span className="font-bold text-white">Mandatory Photo Proof</span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-400 text-[#0A2E1C] font-black text-xs shrink-0">✓</span>
                  <span className="font-bold text-white">Live Wallet &amp; Payouts</span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-400 text-[#0A2E1C] font-black text-xs shrink-0">✓</span>
                  <span className="font-bold text-white">4-Digit Security PIN</span>
                </div>
              </div>
            </div>

            {/* Actions & QR Footer */}
            <div className="mt-10 pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="w-full sm:w-auto flex-1 space-y-3">
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerDirectDownload(driverDownloadUrl, "BemsDriver.apk");
                      if (onOpenDownloadModal) onOpenDownloadModal("driver");
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-white hover:bg-amber-300 text-[#0A2E1C] px-7 py-4 text-sm font-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer active:scale-95"
                  >
                    <span className="text-base">⬇️</span>
                    <span>Download Driver APK</span>
                    <span className="text-xs opacity-75 font-bold">({releases.driver?.file_size || "16.8 MB"})</span>
                  </button>

                  <a
                    href="bemsdriver://login"
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white px-5 py-4 text-sm font-bold border border-white/20 transition-all text-center"
                    title="Launch BemsDriver app if already installed"
                  >
                    <span>📱 Launch App</span>
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/driver/onboarding"
                    className="text-xs font-bold text-amber-300 hover:text-white underline transition"
                  >
                    Apply to join courier fleet →
                  </Link>
                  <span className="text-white/30">•</span>
                  <Link
                    to="/driver/login"
                    className="text-xs text-emerald-200/80 hover:text-white transition"
                  >
                    Driver Web Portal
                  </Link>
                </div>
              </div>

              {/* QR Code widget */}
              <div
                onClick={() => onOpenDownloadModal && onOpenDownloadModal("driver")}
                className="cursor-pointer group/qr flex flex-col items-center bg-white/10 hover:bg-white/20 p-3 rounded-2xl border border-white/15 transition-all shrink-0 text-center"
                title="Scan to download Driver App"
              >
                <div className="p-1.5 bg-white rounded-xl shadow-xs">
                  {driverQr ? (
                    <img src={driverQr} alt="QR code to download Driver App" className="w-20 h-20 object-contain" />
                  ) : (
                    <div className="w-20 h-20 grid place-items-center text-xs text-slate-400">QR</div>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 mt-1.5">
                  Scan for Mobile
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
