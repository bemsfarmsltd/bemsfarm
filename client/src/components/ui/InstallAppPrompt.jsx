import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const DISMISS_KEY = "bems_pwa_install_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator?.standalone === true
  );
}

function isRecentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export default function InstallAppPrompt() {
  const { pathname } = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(() => isRecentlyDismissed() || isStandaloneMode());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (dismissed || isStandaloneMode()) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowIosTip(false);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // iOS Safari has no beforeinstallprompt — show a lightweight Add to Home Screen hint
    const ua = window.navigator.userAgent || "";
    const isIos = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    let iosTimer;
    if (isIos && isSafari) {
      iosTimer = setTimeout(() => setShowIosTip(true), 2500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, [dismissed]);

  if (dismissed || pathname.startsWith("/driver") || pathname.startsWith("/admin")) {
    return null;
  }

  if (!deferredPrompt && !showIosTip) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore storage quota errors
    }
    setDismissed(true);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        setDismissed(true);
      } else {
        handleDismiss();
      }
      setDeferredPrompt(null);
    } catch {
      handleDismiss();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md md:bottom-5 md:left-auto md:right-5"
      role="dialog"
      aria-label="Install BemsFarms App"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-[#1B4332]/15 bg-white/95 p-3.5 shadow-xl backdrop-blur-md">
        <img
          src="/pwa-192x192.png"
          alt="BemsFarms"
          className="h-12 w-12 shrink-0 rounded-xl border border-[#1B4332]/10 object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[#17352a]">
            Install BemsFarms App
          </div>
          {deferredPrompt ? (
            <p className="mt-0.5 text-xs leading-snug text-[#4a5d52]">
              Add to your home screen for faster shopping &amp; live order tracking.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-snug text-[#4a5d52]">
              Tap <strong>Share</strong> then <strong>&ldquo;Add to Home Screen&rdquo;</strong> to install.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installing}
              className="rounded-xl bg-[#1B4332] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#143326] disabled:opacity-60"
            >
              {installing ? "Installing…" : "Install"}
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="rounded-lg p-1.5 text-xs font-semibold text-[#6b7280] transition hover:bg-gray-100 hover:text-gray-900"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
