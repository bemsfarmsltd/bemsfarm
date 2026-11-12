import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import VerifiedLocationModal from "./VerifiedLocationModal";
import api from "../../services/api";

export default function LocationPromptBanner() {
  const { user, updateUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasVerifiedLocation, setHasVerifiedLocation] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("location_banner_dismissed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!user) {
      setHasVerifiedLocation(true);
      setIsModalOpen(false);
      return;
    }

    const shouldAutoPrompt =
      sessionStorage.getItem("bems_prompt_address_verification") === "true" ||
      localStorage.getItem("bems_prompt_address_verification") === "true" ||
      user.requires_address_verification === true;

    if (shouldAutoPrompt) {
      setIsModalOpen(true);
    }

    // Check if user has saved verified addresses with latitude & longitude
    async function checkUserAddress() {
      try {
        const res = await api.get("/addresses");
        const addresses = res.data?.addresses || [];
        const hasCoords = addresses.some((a) => a.latitude && a.longitude);
        setHasVerifiedLocation(hasCoords);
        if (!hasCoords && shouldAutoPrompt) {
          setIsModalOpen(true);
        }
      } catch (err) {
        // if request fails, don't nag the user
        setHasVerifiedLocation(true);
      }
    }

    checkUserAddress();
  }, [user]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("location_banner_dismissed", "true");
    } catch (e) {}
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    try {
      sessionStorage.removeItem("bems_prompt_address_verification");
      localStorage.removeItem("bems_prompt_address_verification");
    } catch (e) {}
  };

  const handleLocationConfirmed = (locationData) => {
    setHasVerifiedLocation(true);
    setIsModalOpen(false);
    try {
      sessionStorage.removeItem("bems_prompt_address_verification");
      localStorage.removeItem("bems_prompt_address_verification");
    } catch (e) {}
    if (updateUser) {
      updateUser({
        has_address: true,
        requires_address_verification: false,
        address: locationData.address || locationData.street_address,
      });
    }
  };

  if (!user || (hasVerifiedLocation && !isModalOpen)) {
    return null;
  }

  return (
    <>
      {!dismissed && !hasVerifiedLocation && (
        <div className="bg-gradient-to-r from-green-900 via-green-800 to-emerald-800 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs transition-all">
          <div className="flex items-center gap-2 max-w-2xl">
            <span className="text-base animate-bounce">📍</span>
            <span>
              <strong>Verify Your Delivery Location:</strong> Pin your exact delivery gate on the map so our drivers navigate directly to your doorstep.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1 bg-white text-green-900 font-bold rounded-lg shadow hover:bg-green-50 transition whitespace-nowrap"
            >
              Pin on Map ➔
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-white/70 hover:text-white px-1.5 py-0.5"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <VerifiedLocationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onLocationConfirmed={handleLocationConfirmed}
        showSaveToAccount={true}
      />
    </>
  );
}
