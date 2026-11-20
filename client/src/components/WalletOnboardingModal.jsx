import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import AddressAutocomplete from "./ui/AddressAutocomplete";
import { NIGERIAN_STATES, normalizeNigerianState } from "../utils/nigerianStates";

export default function WalletOnboardingModal() {
  const { user, updateUser } = useAuth();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [missingPhone, setMissingPhone] = useState(false);
  const [missingAddress, setMissingAddress] = useState(false);
  const [missingWallet, setMissingWallet] = useState(false);

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("Abia");
  const [postalCode, setPostalCode] = useState("440221");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const [kycType, setKycType] = useState("bvn");
  const [kycNumber, setKycNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);

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

    Promise.allSettled([api.get("/wallet"), api.get("/addresses")]).then(
      ([walletResult, addressResult]) => {
        if (cancelled) return;

        let needsWallet = false;
        if (walletResult.status === "fulfilled") {
          const acct = walletResult.value.data?.wallet?.account_number;
          needsWallet = !acct;
        }

        let needsAddress = false;
        if (addressResult.status === "fulfilled") {
          const addrs = addressResult.value.data?.addresses || [];
          needsAddress = !addrs.some((a) => a.street_address && a.latitude && a.longitude);
        }

        setMissingWallet(needsWallet);
        setMissingAddress(needsAddress);

        if (needsPhone || needsAddress || needsWallet) {
          setOpen(true);
        }
      }
    );

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
    const hasPhoneInput = missingPhone && phone.trim().length > 0;
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

    const hasAddressInput = missingAddress && address.trim().length > 0;
    if (hasAddressInput) {
      if (!latitude || !longitude) {
        setError("Please select your address from the suggestions or click 'Pin Map' to verify your delivery coordinates.");
        return;
      }
    }

    const cleanKyc = kycNumber.replace(/\D/g, "");
    const hasKycInput = missingWallet && cleanKyc.length > 0;
    if (hasKycInput && cleanKyc.length !== 11) {
      setError(`Please enter a valid 11-digit ${kycType.toUpperCase()} to activate your Dedicated Bems Wallet.`);
      return;
    }

    // Require at least one field to be filled (or KYC if wallet is the only missing item)
    if (!hasPhoneInput && !hasAddressInput && !hasKycInput) {
      if (missingWallet && !missingPhone && !missingAddress) {
        setError(`Please enter a valid 11-digit ${kycType.toUpperCase()} to create your Dedicated Bems Wallet.`);
      } else if (missingAddress && !missingPhone && !missingWallet) {
        setError("Please enter and pin your delivery address to continue.");
      } else {
        setError("Please fill in your profile details or click Later to continue.");
      }
      return;
    }

    setSubmitting(true);
    try {
      let savedWallet = null;
      let savedAddress = false;

      // 1. Save Delivery Address if provided
      if (hasAddressInput) {
        await api.post("/addresses", {
          label: "Home",
          receiver_name: user.name || "",
          receiver_phone: finalPhone || user.phone || "",
          street_address: address.trim(),
          city: city.trim() || stateName,
          state: stateName,
          postal_code: postalCode || "440221",
          latitude,
          longitude,
          is_default: true,
        });
        savedAddress = true;
        updateUser({
          has_address: true,
          requires_address_verification: false,
          address: address.trim(),
        });
      }

      // 2. Save Phone and/or Provision Dedicated Bems Wallet if provided
      if (hasPhoneInput || hasKycInput) {
        const payload = {
          ...(hasPhoneInput ? { phone: finalPhone } : {}),
          ...(cleanKyc.length === 11 ? { [kycType]: cleanKyc } : {}),
        };
        const res = await api.post("/wallet/provision", payload);
        if (hasPhoneInput && finalPhone) {
          updateUser({ phone: finalPhone });
        }
        const wallet = res.data?.wallet;
        if (wallet?.account_number) {
          savedWallet = wallet;
          updateUser({ requiresWalletSetup: false });
        } else if (hasKycInput && wallet?.provision_error) {
          setError(wallet.provision_error);
          setSubmitting(false);
          return;
        }
      }

      if (savedWallet) {
        setSuccessInfo({ wallet: savedWallet, savedAddress });
      } else {
        handleDismiss();
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save profile details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = successInfo?.wallet
    ? "Your Profile & Wallet Are Ready!"
    : missingPhone || missingAddress
    ? "Complete Your Profile"
    : "Verify NIN or BVN to Create Wallet";

  const modalSubtitle =
    missingPhone || missingAddress
      ? "Quick Profile Setup"
      : "Dedicated Bems Wallet Setup";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-emerald-100 overflow-hidden">
        <div
          className="px-6 py-5 text-white flex items-start justify-between gap-3 shrink-0"
          style={{ background: "linear-gradient(135deg, #1B4332 0%, #143c2d 100%)" }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 mb-1">
              {modalSubtitle}
            </p>
            <h2 className="text-lg font-black leading-tight">{modalTitle}</h2>
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

        <div className="p-6 overflow-y-auto">
          {successInfo?.wallet ? (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                <div className="text-xs font-bold uppercase text-emerald-700">
                  {successInfo.wallet.bank_name || "Dedicated Bems Account"}
                </div>
                <div className="text-2xl font-mono font-black text-[#143c2d] tracking-wider mt-1">
                  {successInfo.wallet.account_number}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {successInfo.wallet.account_name}
                </div>
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
                {missingPhone || missingAddress
                  ? "Add your remaining details below so we can deliver to your doorstep and activate your Dedicated Bems Wallet."
                  : "Enter your 11-digit NIN or BVN (CBN requirement) to generate your personal Dedicated Bems Wallet account number."}
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

              {missingAddress && (
                <div className="space-y-2.5 rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Delivery Address &amp; Map Pin
                    </label>
                    <AddressAutocomplete
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setLatitude(null);
                        setLongitude(null);
                      }}
                      onPlaceSelected={(place) => {
                        const matchedState = normalizeNigerianState(place.state);
                        setAddress((prev) =>
                          prev && prev.trim().length >= 3 ? prev : place.address || prev
                        );
                        if (place.city || place.lga) setCity(place.city || place.lga);
                        if (matchedState) setStateName(matchedState);
                        if (place.postal_code || place.postcode) {
                          setPostalCode(place.postal_code || place.postcode);
                        }
                        setLatitude(place.latitude);
                        setLongitude(place.longitude);
                      }}
                      initialLat={latitude}
                      initialLng={longitude}
                      placeholder="Type street or click 'Pin Map'"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] bg-white text-sm outline-none"
                    />
                    {latitude && longitude ? (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                        ✓ Location pinned ({city || stateName})
                      </p>
                    ) : address.trim().length > 0 ? (
                      <p className="mt-1 text-[10.5px] font-medium text-amber-700">
                        Select a suggestion or click <strong>Pin Map</strong> to verify coordinates.
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        City / LGA
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Umuahia"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#1B4332] bg-white text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        State
                      </label>
                      <select
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#1B4332] bg-white text-xs outline-none"
                      >
                        {NIGERIAN_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {missingWallet && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      Wallet Verification (NIN / BVN){!missingPhone && !missingAddress ? " *" : ""}
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
                    required={!missingPhone && !missingAddress}
                    value={kycNumber}
                    onChange={(e) => setKycNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder={`Enter 11-digit ${kycType.toUpperCase()}`}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] text-sm font-mono outline-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Required by CBN to generate your personal Dedicated Bems Wallet account number.
                  </p>
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
                  {submitting
                    ? "Saving Profile..."
                    : missingPhone || missingAddress
                    ? "Save & Complete Profile"
                    : "Verify & Create Wallet"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
