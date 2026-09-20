import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import VerifiedLocationModal from "./VerifiedLocationModal";
import api from "../../services/api";

export default function LocationPromptBanner() {
  const { user } = useAuth();
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
      return;
    }

    // Check if user has saved verified addresses with latitude & longitude
    async function checkUserAddress() {
      try {
        const res = await api.get("/addresses");
        const addresses = res.data?.addresses || [];
        const hasCoords = addresses.some(a => a.latitude && a.longitude);
        setHasVerifiedLocation(hasCoords);
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

  const handleLocationConfirmed = (locationData) => {
    setHasVerifiedLocation(true);
  };

  if (!user || hasVerifiedLocation || dismissed) {
    return null;
  }

  return (
    <>
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

      <VerifiedLocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLocationConfirmed={handleLocationConfirmed}
        showSaveToAccount={true}
      />
    </>
  );
}
