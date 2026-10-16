import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { Link } from "react-router-dom";
import api from "../../services/api";

export default function AppDownloadModal({
  isOpen,
  onClose,
  initialApp = "customer", // "customer" | "driver"
}) {
  const [selectedApp, setSelectedApp] = useState(initialApp);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [liveReleases, setLiveReleases] = useState(null);

  useEffect(() => {
    if (initialApp) {
      setSelectedApp(initialApp);
    }
  }, [initialApp]);

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://bemsfarms.com";

  useEffect(() => {
    api
      .get("/app-releases/latest")
      .then((res) => {
        if (res.data?.releases) {
          setLiveReleases(res.data.releases);
        }
      })
      .catch(() => {});
  }, []);

  const custData = liveReleases?.customer;
  const drivData = liveReleases?.driver;

  const appData = {
    customer: {
      id: "customer",
      title: custData?.app_name || "BemsFarms Customer App",
      badge: "Shoppers & Pantry",
      version: custData?.version_name ? `v${custData.version_name}` : "v2.4.1",
      size: custData?.file_size || "18.4 MB",
      minAndroid: custData?.min_android || "Android 8.0+",
      apkName: custData?.file_name || "BemsCustomer.apk",
      downloadUrl: custData?.download_url || `${origin}/downloads/BemsCustomer.apk`,
      accentColor: "bg-emerald-600",
      accentBorder: "border-emerald-500",
      pillBadge: "bg-emerald-100 text-emerald-900 border-emerald-200",
      icon: (
        <svg className="w-8 h-8 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      description:
        custData?.release_notes ||
        "The fastest way to browse farm-fresh produce, order sorted grains, consult Chef Bems AI, and track deliveries straight to your kitchen.",
      highlights: [
        "1-Tap Reorder with real-time farm inventory",
        "Chef Bems AI meal ideas and recipe cart additions",
        "Live door-to-door GPS dispatch tracking radar",
        "Instant, secure Monnify / Card checkout & wallet",
      ],
    },
    driver: {
      id: "driver",
      title: drivData?.app_name || "BemsFarms Driver App",
      badge: "Fleet & Dispatch",
      version: drivData?.version_name ? `v${drivData.version_name}` : "v2.3.0",
      size: drivData?.file_size || "16.8 MB",
      minAndroid: drivData?.min_android || "Android 8.0+",
      apkName: drivData?.file_name || "BemsDriver.apk",
      downloadUrl: drivData?.download_url || `${origin}/downloads/BemsDriver.apk`,
      accentColor: "bg-amber-600",
      accentBorder: "border-amber-500",
      pillBadge: "bg-amber-100 text-amber-900 border-amber-200",
      icon: (
        <svg className="w-8 h-8 text-amber-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
      description:
        drivData?.release_notes ||
        "Dedicated mobile dispatch tool for verified BemsFarms couriers. Manage order pickups, turn-by-turn navigation, mandatory delivery snapshots, and live earnings.",
      highlights: [
        "Proximity auto-dispatch alerts & route-bundling",
        "Mandatory item-by-item photo proof-of-delivery",
        "Real-time wallet balance, payout requests & ledger",
        "4-digit security PIN & online availability toggle",
      ],
    },
  };

  const current = appData[selectedApp] || appData.customer;

  // Generate QR code whenever the selected app changes
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(current.downloadUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: "#143c2d",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("QR generation failed", err);
      });
    return () => {
      active = false;
    };
  }, [current.downloadUrl]);

  // Handle direct download trigger
  const handleDownload = () => {
    setDownloadStarted(true);
    const link = document.createElement("a");
    link.href = current.downloadUrl;
    link.download = current.apkName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadStarted(false), 4000);
  };

  // Copy download link
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(current.downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-modal-title"
        >
          {/* Header Banner */}
          <div className="bg-[#143c2d] px-6 py-5 text-white flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-amber-300 font-black text-lg">
                📲
              </span>
              <div>
                <h3 id="app-modal-title" className="font-display text-lg sm:text-xl font-bold">
                  BemsFarms Mobile Apps
                </h3>
                <p className="text-xs text-emerald-100/80">
                  Direct Android APK installation &amp; mobile gateways
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* App Switcher Tabs */}
          <div className="p-4 sm:p-6 pb-0">
            <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedApp("customer")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
                  selectedApp === "customer"
                    ? "bg-white text-[#143c2d] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🛒</span>
                <span>Customer App</span>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {current.id === "customer" ? current.version : "v2.4.1"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedApp("driver")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
                  selectedApp === "driver"
                    ? "bg-white text-[#143c2d] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🛵</span>
                <span>Driver App</span>
                <span className="hidden sm:inline-block text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  {current.id === "driver" ? current.version : "v2.3.0"}
                </span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Top Info Banner */}
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start p-4 sm:p-5 rounded-2xl border border-slate-200 bg-[#FAF9F6]">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white border border-slate-200 shadow-sm shrink-0">
                {current.icon}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                  <h4 className="font-display text-lg font-black text-[#143c2d]">
                    {current.title}
                  </h4>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${current.pillBadge}`}>
                    {current.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {current.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Android APK ({current.size})
                  </span>
                  <span>•</span>
                  <span>{current.minAndroid}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-extrabold">Verified Malware-Free</span>
                </div>
              </div>
            </div>

            {/* Download & QR Action Row */}
            <div className="grid sm:grid-cols-[1.25fr_.75fr] gap-4 items-stretch">
              {/* Primary Direct Download Box */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between space-y-4">
                <div>
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Option 1: Direct APK Download
                  </h5>
                  <p className="text-xs text-slate-600 mt-1">
                    Download and install the verified installation package directly on your phone.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#143c2d] hover:bg-[#1a4e3b] text-white px-5 py-3.5 text-sm font-black shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>⬇️</span>
                    <span>
                      {downloadStarted ? "Downloading APK…" : `Download ${current.apkName}`}
                    </span>
                    <span className="text-xs opacity-80 font-normal">({current.size})</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 px-3 text-xs font-bold transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>{copied ? "Link Copied!" : "Copy Link"}</span>
                    </button>

                    {selectedApp === "driver" && (
                      <a
                        href="bemsdriver://login"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 py-2 px-3 text-xs font-bold transition text-center"
                      >
                        <span>📱 Open App</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* QR Code Box for Phone Camera */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-[#FAF9F6] flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
                  Scan with Phone
                </span>
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR code for ${current.title} download`}
                      className="w-28 h-28 object-contain"
                    />
                  ) : (
                    <div className="w-28 h-28 grid place-items-center text-xs text-slate-400">
                      Generating…
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  Point your smartphone camera to download instantly
                </p>
              </div>
            </div>

            {/* Quick 3-Step Install Guide */}
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 sm:p-5">
              <h5 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <span>💡</span>
                <span>Simple 3-Step Android Installation</span>
              </h5>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs text-slate-700">
                <div className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-xs">
                  <span className="inline-block font-black text-amber-800 text-xs mb-1">
                    Step 1 · Download
                  </span>
                  <p className="leading-relaxed text-slate-600">
                    Tap the download button. If your browser asks, tap <strong>“Download anyway”</strong>.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-xs">
                  <span className="inline-block font-black text-amber-800 text-xs mb-1">
                    Step 2 · Allow Install
                  </span>
                  <p className="leading-relaxed text-slate-600">
                    Tap the notification or find <strong>{current.apkName}</strong> in your Downloads folder.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-xs">
                  <span className="inline-block font-black text-amber-800 text-xs mb-1">
                    Step 3 · Launch
                  </span>
                  <p className="leading-relaxed text-slate-600">
                    Tap <strong>Install</strong>, then open the app and sign in with your credentials.
                  </p>
                </div>
              </div>
            </div>

            {/* Key App Highlights */}
            <div className="border-t border-slate-200 pt-4">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                Key Capabilities included in this release
              </h5>
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {current.highlights.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-emerald-700 font-black">✓</span>
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Links for Web / Driver Gateway */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-100">
              {selectedApp === "customer" ? (
                <>
                  <span>Using an iPhone or desktop browser?</span>
                  <Link
                    to="/products"
                    onClick={onClose}
                    className="font-bold text-[#143c2d] hover:text-[#c85a17] underline transition"
                  >
                    Continue shopping on Web Storefront →
                  </Link>
                </>
              ) : (
                <>
                  <span>Want to drive for BemsFarms?</span>
                  <div className="flex items-center gap-3">
                    <Link
                      to="/driver/onboarding"
                      onClick={onClose}
                      className="font-bold text-amber-800 hover:text-amber-950 underline transition"
                    >
                      Driver Registration
                    </Link>
                    <span>•</span>
                    <Link
                      to="/driver/login"
                      onClick={onClose}
                      className="font-bold text-[#143c2d] hover:text-[#c85a17] underline transition"
                    >
                      Web Gateway Login
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
