import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function WalletOnboardingModal() {
  const { user, updateUser } = useAuth();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [missingPhone, setMissingPhone] = useState(false);
  const [missingWallet, setMissingWallet] = useState(false);

  const [phone, setPhone] = useState("");
  const [kycType, setKycType] = useState("bvn");
  const [kycNumber, setKycNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successWallet, setSuccessWallet] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setOpen(false);
      return;
    }

    const role = String(user.role || "user").toLowerCase();
    if (!["user", "customer"].includes(role)) return;

    const path = location.pathname || "/";
    if (
      path.startsWith("/driver") ||
      path.startsWith("/admin") ||
      path === "/login" ||
      path === "/register" ||
      path === "/verify-email" ||
      path === "/onboarding"
    ) {
      return;
    }

    const dismissKey = `bems_wallet_modal_dismissed_${user.id}`;
    if (sessionStorage.getItem(dismissKey) === "1") return;

    const needsPhone = !user.phone || !String(user.phone).trim();
    setMissingPhone(needsPhone);
    if (user.phone) setPhone(user.phone);

    let cancelled = false;
    api
      .get("/wallet")
      .then((res) => {
        if (cancelled) return;
        const acct = res.data?.wallet?.account_number;
        const needsWallet = !acct;
        setMissingWallet(needsWallet);
        if (needsPhone || needsWallet) {
          setOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled && needsPhone) {
          setOpen(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.phone, user?.role, location.pathname]);

  if (!open || !user) return null;

  const handleDismiss = () => {
    if (user?.id) {
      sessionStorage.setItem(`bems_wallet_modal_dismissed_${user.id}`, "1");
    }
    setOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let finalPhone = user.phone || "";
    if (missingPhone) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 13) {
        setError("Please enter a valid Nigerian phone number (e.g. 08012345678).");
        return;
      }
      finalPhone = digits.startsWith("234")
        ? `+${digits}`
        : digits.startsWith("0")
        ? `+234${digits.slice(1)}`
        : `+234${digits}`;
    }

    const cleanKyc = kycNumber.replace(/\D/g, "");
    if (missingWallet && cleanKyc.length !== 11) {
      setError(`Please enter a valid 11-digit ${kycType.toUpperCase()} to create your Dedicated Bems Wallet.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...(missingPhone ? { phone: finalPhone } : {}),
        ...(cleanKyc.length === 11 ? { [kycType]: cleanKyc } : {}),
      };
      const res = await api.post("/wallet/provision", payload);
      if (missingPhone && finalPhone) {
        updateUser({ phone: finalPhone, requiresWalletSetup: false });
      }
      const wallet = res.data?.wallet;
      if (wallet?.account_number) {
        setSuccessWallet(wallet);
      } else if (wallet?.provision_error) {
        setError(wallet.provision_error);
      } else {
        handleDismiss();
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save verification details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-emerald-100 overflow-hidden">
        <div
          className="px-6 py-5 text-white flex items-start justify-between gap-3"
          style={{ background: "linear-gradient(135deg, #1B4332 0%, #143c2d 100%)" }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 mb-1">
              Dedicated Bems Wallet Setup
            </p>
            <h2 className="text-lg font-black leading-tight">
              {successWallet
                ? "Your Dedicated Wallet Is Ready!"
                : missingPhone
                ? "Complete Your Phone & Wallet Setup"
                : "Verify NIN or BVN to Create Wallet"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-emerald-100 hover:text-white text-lg font-bold leading-none p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {successWallet ? (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                <div className="text-xs font-bold uppercase text-emerald-700">
                  {successWallet.bank_name || "Dedicated Monnify Account"}
                </div>
                <div className="text-2xl font-mono font-black text-[#143c2d] tracking-wider mt-1">
                  {successWallet.account_number}
                </div>
                <div className="text-xs text-gray-600 mt-1">{successWallet.account_name}</div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-3 rounded-xl bg-[#1B4332] hover:bg-[#143c2d] text-white font-bold text-sm"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                {missingPhone
                  ? "Please provide your phone number and NIN or BVN (required by CBN/Monnify) to activate your personal Bems Wallet NUBAN."
                  : "Enter your 11-digit NIN or BVN (required by CBN/Monnify) to generate your personal Dedicated Bems Wallet account number."}
              </p>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                  {error}
                </div>
              )}

              {missingPhone && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] text-sm outline-none"
                  />
                </div>
              )}

              {missingWallet && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      Verification Method (NIN / BVN) *
                    </label>
                    <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
                      {["bvn", "nin"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setKycType(t)}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                            kycType === t
                              ? "bg-[#1B4332] text-white shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    required
                    value={kycNumber}
                    onChange={(e) => setKycNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder={`Enter 11-digit ${kycType.toUpperCase()}`}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] text-sm font-mono outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Later
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143c2d] text-white text-xs font-bold disabled:opacity-60"
                >
                  {submitting ? "Verifying & Creating Wallet..." : "Verify & Create Wallet"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
