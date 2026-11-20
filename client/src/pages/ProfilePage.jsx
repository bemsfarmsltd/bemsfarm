import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import PageWrapper from "../components/layout/PageWrapper";
import AddressAutocomplete from "../components/ui/AddressAutocomplete";
import api from "../services/api";
import { getNairaPrice } from "../utils/currency";
import { getProductImage } from "../utils/productImages";
import { NIGERIAN_STATES, normalizeNigerianState, resolveNigerianPostalCode } from "../utils/nigerianStates";

export default function ProfilePage() {
  const { user, isLoggedIn, updateUser, logout } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "profile");
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);

  // Profile fields
  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    preferredState: "Abia State",
    deliveryNotes: "",
  });

  const [avatar, setAvatar] = useState(null);
  const [avatarError, setAvatarError] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Orders & Wishlist
  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const { wishlistProducts } = useWishlist();

  // Address book
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState({
    label: "",
    receiver_name: "",
    receiver_phone: "",
    street_address: "",
    city: "",
    state: "Abia State",
    is_default: false,
  });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressError, setAddressError] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);

  // Password change
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNextPassword, setShowNextPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Customer Monnify Dedicated Wallet
  const [walletData, setWalletData] = useState({ wallet: null, transactions: [] });
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [walletError, setWalletError] = useState(null);
  const [kycNumber, setKycNumber] = useState("");
  const [kycType, setKycType] = useState("bvn");
  const [copiedAcct, setCopiedAcct] = useState(false);
  const [walletFilter, setWalletFilter] = useState("all");
  const [pinFormOpen, setPinFormOpen] = useState(false);
  const [pinResetMode, setPinResetMode] = useState("current_pin"); // "current_pin" | "password"
  const [currentWalletPin, setCurrentWalletPin] = useState("");
  const [walletPinPassword, setWalletPinPassword] = useState("");
  const [newWalletPin, setNewWalletPin] = useState("");
  const [confirmWalletPin, setConfirmWalletPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState(null);
  const [pinSuccess, setPinSuccess] = useState(null);

  const loadWallet = () => {
    setLoadingWallet(true);
    setWalletError(null);
    api.get("/wallet")
      .then((r) => {
        if (r.data?.wallet) {
          setWalletData({ wallet: r.data.wallet, transactions: r.data.transactions || [] });
        }
      })
      .catch((err) => {
        setWalletError(err?.response?.data?.message || "Unable to load wallet right now.");
      })
      .finally(() => setLoadingWallet(false));
  };

  const handleProvisionWallet = (e) => {
    if (e) e.preventDefault();
    const cleaned = kycNumber.replace(/\D/g, "");
    if (cleaned.length !== 11) {
      setWalletError(`Please enter a valid 11-digit ${kycType.toUpperCase()}.`);
      return;
    }
    setLoadingWallet(true);
    setWalletError(null);
    api.post("/wallet/provision", { [kycType]: cleaned })
      .then((r) => {
        if (r.data?.wallet) {
          setWalletData({ wallet: r.data.wallet, transactions: r.data.transactions || [] });
        }
      })
      .catch((err) => {
        setWalletError(err?.response?.data?.message || "Failed to generate dedicated bank account.");
      })
      .finally(() => setLoadingWallet(false));
  };

  const handleSaveWalletPin = async (e) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);
    const hasPin = Boolean(walletData.wallet?.has_payment_pin);

    if (!/^\d{4}$/.test(newWalletPin)) {
      setPinError("New Payment PIN must be exactly 4 digits.");
      return;
    }
    if (newWalletPin !== confirmWalletPin) {
      setPinError("New Payment PIN and confirmation do not match.");
      return;
    }
    if (hasPin) {
      if (pinResetMode === "current_pin" && !/^\d{4}$/.test(currentWalletPin)) {
        setPinError("Please enter your current 4-digit Payment PIN.");
        return;
      }
      if (pinResetMode === "password" && !walletPinPassword) {
        setPinError("Please enter your account password to reset your PIN.");
        return;
      }
    }

    setPinSaving(true);
    try {
      const payload = { pin: newWalletPin };
      if (hasPin) {
        if (pinResetMode === "current_pin") payload.current_pin = currentWalletPin;
        else payload.account_password = walletPinPassword;
      }
      const res = await api.post("/wallet/pin", payload);
      setWalletData((prev) => ({
        ...prev,
        wallet: prev.wallet
          ? {
              ...prev.wallet,
              has_payment_pin: true,
              payment_pin_set_at: res.data?.payment_pin_set_at || new Date().toISOString(),
            }
          : prev.wallet,
      }));
      setCurrentWalletPin("");
      setWalletPinPassword("");
      setNewWalletPin("");
      setConfirmWalletPin("");
      setPinFormOpen(false);
      setPinSuccess(res.data?.message || "Payment PIN saved successfully.");
    } catch (err) {
      setPinError(err?.response?.data?.message || "Failed to save Payment PIN.");
    } finally {
      setPinSaving(false);
    }
  };

  // Load addresses
  const loadAddresses = () => {
    api.get("/addresses").then((r) => setAddresses(r.data?.addresses || [])).catch(() => {});
  };

  // Load orders
  const loadOrders = () => {
    setLoadingOrders(true);
    api.get("/orders")
      .then((r) => setMyOrders(r.data?.orders || []))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  };

  // Sync user state on mount
  useEffect(() => {
    if (!user) return;
    const nameParts = (user.name || "").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    setFields({
      firstName,
      lastName,
      email: user.email || "",
      phone: user.phone || "",
      preferredState: user.state || "Abia State",
      deliveryNotes: user.address || "",
    });
    setAvatar(user.avatar_url || null);

    loadAddresses();
    loadOrders();
    loadWallet();
  }, [user]);

  if (!isLoggedIn) {
    return (
      <PageWrapper>
        <div className="max-w-md mx-auto my-12 sm:my-20 text-center px-4 py-10 bg-white rounded-3xl border border-gray-100 shadow-xl">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#143c2d]/10 flex items-center justify-center text-[#143c2d]">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#143c2d] mb-2 font-display">
            Sign In to View Your Account
          </h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
            Access your order history, delivery addresses, and personal produce preferences.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/login")}
              className="bg-[#143c2d] text-white hover:bg-[#1c503d] rounded-xl px-6 py-3 font-bold text-sm transition shadow-md"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/register")}
              className="bg-white text-[#143c2d] border border-[#143c2d] hover:bg-emerald-50 rounded-xl px-6 py-3 font-bold text-sm transition"
            >
              Create Account
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Avatar Upload with client-side compression
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }
    setAvatarError(null);
    setUploadingAvatar(true);

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (event) => {
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 480;
          let { width, height } = img;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

          setAvatar(compressedDataUrl);
          const res = await api.patch("/auth/avatar", { avatar_url: compressedDataUrl });
          if (res.data?.user) {
            updateUser(res.data.user);
          }
        } catch (err) {
          setAvatar(user?.avatar_url || null);
          setAvatarError(err?.response?.data?.message || "Failed to save photo. Please try again.");
        } finally {
          setUploadingAvatar(false);
        }
      };
      img.onerror = () => {
        setUploadingAvatar(false);
        setAvatarError("Could not read image file.");
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setUploadingAvatar(false);
      setAvatarError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDeleteAvatar = async () => {
    setAvatar(null);
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const res = await api.patch("/auth/avatar", { avatar_url: null });
      if (res.data?.user) {
        updateUser(res.data.user);
      }
    } catch (err) {
      setAvatar(user?.avatar_url || null);
      setAvatarError(err?.response?.data?.message || "Failed to remove photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save Profile Details
  const handleSaveFields = async () => {
    setSaveError(null);
    setSavingProfile(true);
    try {
      const res = await api.patch("/auth/profile", {
        name: `${fields.firstName} ${fields.lastName}`.trim(),
        email: fields.email,
        phone: fields.phone,
        state: fields.preferredState,
        address: fields.deliveryNotes,
      });
      updateUser(res.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Failed to save changes");
    } finally {
      setSavingProfile(false);
    }
  };

  // Address Handlers
  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: "",
      receiver_name: user?.name || "",
      receiver_phone: user?.phone || "",
      street_address: "",
      city: "",
      state: "Abia State",
      latitude: null,
      longitude: null,
      is_default: addresses.length === 0,
    });
    setAddressError(null);
    setAddingAddress(true);
  };

  const openEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label || "",
      receiver_name: addr.receiver_name || "",
      receiver_phone: addr.receiver_phone || "",
      street_address: addr.street_address || "",
      city: addr.city || "",
      state: addr.state || "Abia State",
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
      is_default: !!addr.is_default,
    });
    setAddressError(null);
    setAddingAddress(true);
  };

  const saveAddress = async () => {
    if (!addressForm.street_address.trim()) {
      setAddressError("Street address is required");
      return;
    }
    if (!addressForm.latitude || !addressForm.longitude) {
      setAddressError("Verified GPS coordinates are required. Please select your address from suggestions or pin your location on the map.");
      return;
    }
    setSavingAddress(true);
    try {
      if (editingAddressId) {
        await api.patch(`/addresses/${editingAddressId}`, addressForm);
      } else {
        await api.post("/addresses", addressForm);
      }
      setAddingAddress(false);
      loadAddresses();
    } catch (err) {
      setAddressError(err?.response?.data?.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const setAsDefaultAddress = async (id) => {
    try {
      await api.patch(`/addresses/${id}`, { is_default: true });
      loadAddresses();
    } catch (err) {
      setAddressError(err?.response?.data?.message || "Failed to set default address");
    }
  };

  const deleteAddress = async (id) => {
    if (addresses.length <= 1) {
      setAddressError("You must keep at least one default delivery address in your profile.");
      return;
    }
    try {
      await api.delete(`/addresses/${id}`);
      loadAddresses();
    } catch (err) {
      setAddressError(err?.response?.data?.message || "Failed to delete address");
    }
  };

  // Password Change
  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (!passwordForm.current || !passwordForm.next) {
      setPasswordError("Please enter both current and new password");
      return;
    }
    if (passwordForm.next.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("New passwords do not match");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.post("/auth/change-password", {
        current_password: passwordForm.current,
        new_password: passwordForm.next,
      });
      setPasswordSuccess(true);
      setPasswordForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err?.response?.data?.message || "Failed to change password. Check your current password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const initials = (fields.firstName?.[0] || user?.name?.[0] || "U").toUpperCase();
  const defaultAddress = addresses.find((a) => a.is_default) || addresses[0];

  const menuTabs = [
    {
      id: "profile",
      label: "Personal Profile",
      icon: (
        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      id: "address",
      label: "Delivery Addresses",
      badge: addresses.length,
      icon: (
        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
    },
    {
      id: "orders",
      label: "My Orders & Tracking",
      badge: myOrders.length,
      icon: (
        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
    },
    {
      id: "wallet",
      label: "My Wallet",
      icon: (
        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
        </svg>
      ),
    },
    {
      id: "wishlist",
      label: "Saved Wishlist",
      badge: wishlistProducts.length,
      icon: (
        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
    {
      id: "password",
      label: "Security & Password",
      icon: (
        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
  ];

  return (
    <PageWrapper>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 font-sans">

        {/* Hero Profile Banner */}
        <div className="bg-gradient-to-r from-[#143c2d] via-[#1a4f3b] to-[#256f50] rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white mb-6 sm:mb-8 shadow-xl flex flex-col md:flex-row items-center md:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-4 sm:gap-5 w-full md:w-auto min-w-0">
            {/* Avatar / Monogram */}
            <div className="relative flex-shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Click to upload profile photo"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FAF8F5] text-[#143c2d] flex items-center justify-center text-2xl sm:text-3xl font-black shadow-lg overflow-hidden border-2 border-white/80 cursor-pointer p-0 relative transition transform hover:scale-105"
              >
                {uploadingAvatar ? (
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#143c2d] border-t-transparent" />
                ) : avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </button>

              {/* Camera Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Photo"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-slate-900 border-2 border-[#143c2d] flex items-center justify-center shadow-md cursor-pointer hover:bg-amber-400 transition"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            </div>

            <div className="min-w-0 max-w-full">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap min-w-0">
                <h1 className="text-lg sm:text-2xl font-black text-white truncate max-w-full m-0 font-display">
                  {user.name || "Customer Account"}
                </h1>
                <span className="bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wide flex-shrink-0">
                  Verified Member
                </span>
              </div>
              <p className="m-0 mt-1 text-xs sm:text-sm text-emerald-100/80 truncate max-w-full">
                {user.email} {user.phone ? `• ${user.phone}` : ""}
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto min-w-0">
            <button
              type="button"
              onClick={() => { setActiveTab("orders"); setAddingAddress(false); }}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl p-2.5 sm:p-3 text-center border border-white/15 transition cursor-pointer"
            >
              <div className="text-base sm:text-xl font-black text-white">{myOrders.length}</div>
              <div className="text-[10px] sm:text-xs text-emerald-200 font-semibold mt-0.5">Orders</div>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("address"); setAddingAddress(false); }}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl p-2.5 sm:p-3 text-center border border-white/15 transition cursor-pointer"
            >
              <div className="text-base sm:text-xl font-black text-white">{addresses.length}</div>
              <div className="text-[10px] sm:text-xs text-emerald-200 font-semibold mt-0.5">Addresses</div>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("wishlist"); setAddingAddress(false); }}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl p-2.5 sm:p-3 text-center border border-white/15 transition cursor-pointer"
            >
              <div className="text-base sm:text-xl font-black text-white">{wishlistProducts.length}</div>
              <div className="text-[10px] sm:text-xs text-emerald-200 font-semibold mt-0.5">Wishlist</div>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Navigation Tabs Strip (< lg) */}
        <div className="flex lg:hidden overflow-x-auto gap-2 pb-2 mb-5 -mx-4 px-4 sm:mx-0 sm:px-0">
          {menuTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setAddingAddress(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex-shrink-0 shadow-sm ${
                  isActive
                    ? 'bg-[#143c2d] text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-gray-500'}>{tab.icon}</span>
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6 items-start">

          {/* Left Navigation Sidebar (Desktop only) */}
          <div className="hidden lg:flex flex-col bg-white rounded-2xl p-3 border border-gray-200 shadow-sm gap-1 sticky top-24">
            {menuTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setAddingAddress(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border-none cursor-pointer text-left transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-[#143c2d] font-bold shadow-xs'
                      : 'bg-transparent text-gray-600 font-semibold hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-[#143c2d]' : 'text-gray-400'}>{tab.icon}</span>
                    <span className="text-sm">{tab.label}</span>
                  </div>
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-[#143c2d] text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="flex items-center gap-2.5 w-full p-3 rounded-xl border-none bg-red-50 text-red-600 font-bold text-xs cursor-pointer text-left hover:bg-red-100 transition"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Right Main Content Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 border border-gray-200 shadow-sm min-h-[420px] w-full min-w-0">
            <AnimatePresence mode="wait">

              {/* ── TAB 1: PERSONAL PROFILE ── */}
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <div className="mb-6">
                    <h2 className="text-lg sm:text-xl font-black text-[#143c2d] font-display">
                      Personal Profile
                    </h2>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                      Manage your contact details and default delivery preferences for instant checkout.
                    </p>
                  </div>

                  {/* Avatar Upload Card */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 p-4 sm:p-5 bg-gray-50 rounded-2xl mb-6 border border-gray-100">
                    <div className="w-16 h-16 rounded-full bg-[#143c2d] text-white flex items-center justify-center text-xl font-black overflow-hidden flex-shrink-0 shadow-sm">
                      {avatar ? (
                        <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-gray-900 m-0">Profile Photo</h4>
                      <p className="text-xs text-gray-500 my-1">JPG, PNG, or WebP up to 2MB.</p>
                      <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          className="px-3.5 py-1.5 bg-[#143c2d] hover:bg-[#1b4d3a] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          {uploadingAvatar ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <span>{avatar ? "Change Photo" : "Upload Photo"}</span>
                          )}
                        </button>
                        {avatar && !uploadingAvatar && (
                          <button
                            type="button"
                            onClick={handleDeleteAvatar}
                            className="px-3 py-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {avatarError && <p className="text-red-500 text-xs mt-1.5">{avatarError}</p>}
                    </div>
                  </div>

                  {/* Clean Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                        First Name *
                      </label>
                      <input
                        value={fields.firstName}
                        onChange={(e) => setFields({ ...fields, firstName: e.target.value })}
                        placeholder="e.g. Henry"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#143c2d] focus:border-transparent outline-none transition bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                        Last Name *
                      </label>
                      <input
                        value={fields.lastName}
                        onChange={(e) => setFields({ ...fields, lastName: e.target.value })}
                        placeholder="e.g. Adeleke"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#143c2d] focus:border-transparent outline-none transition bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={fields.email}
                        onChange={(e) => setFields({ ...fields, email: e.target.value })}
                        placeholder="henry@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#143c2d] focus:border-transparent outline-none transition bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                        Mobile Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={fields.phone}
                        onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                        placeholder="+234 800 000 0000"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#143c2d] focus:border-transparent outline-none transition bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                        Primary Delivery State
                      </label>
                      <select
                        value={fields.preferredState}
                        onChange={(e) => setFields({ ...fields, preferredState: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#143c2d] focus:border-transparent outline-none transition bg-white cursor-pointer"
                      >
                        {NIGERIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                        Default Saved Address
                      </label>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex-1 px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-700 truncate">
                          {defaultAddress ? `${defaultAddress.street_address}, ${defaultAddress.city}` : "No default address set"}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setActiveTab("address"); setAddingAddress(false); }}
                          className="px-3 py-2.5 bg-emerald-50 text-[#143c2d] border border-emerald-200 rounded-xl text-xs font-bold whitespace-nowrap hover:bg-emerald-100 transition cursor-pointer"
                        >
                          Manage
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                        Delivery Instructions / Dietary Notes (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={fields.deliveryNotes}
                        onChange={(e) => setFields({ ...fields, deliveryNotes: e.target.value })}
                        placeholder="e.g. Call upon arrival, leave at estate reception, prefer unpeeled tubers..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#143c2d] focus:border-transparent outline-none transition bg-white resize-none"
                      />
                    </div>
                  </div>

                  {saveError && <p className="text-red-500 text-xs sm:text-sm mb-4">{saveError}</p>}

                  <div className="flex items-center">
                    <button
                      onClick={handleSaveFields}
                      disabled={savingProfile}
                      className="w-full sm:w-auto px-7 py-3 bg-[#143c2d] hover:bg-[#1b4d3a] text-white rounded-xl font-extrabold text-sm shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {savingProfile ? "Saving Changes..." : saved ? "Changes Saved!" : "Save Profile Details"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── TAB 2: DELIVERY ADDRESSES ── */}
              {activeTab === "address" && (
                <motion.div
                  key="address"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-[#143c2d] font-display">
                        Delivery Addresses
                      </h2>
                      <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                        Set your permanent home or office address for fast 1-tap checkout.
                      </p>
                    </div>

                    {!addingAddress && (
                      <button
                        onClick={openAddAddress}
                        className="w-full sm:w-auto px-4 py-2.5 bg-[#143c2d] hover:bg-[#1b4d3a] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <span className="text-base leading-none">+</span>
                        <span>Add New Address</span>
                      </button>
                    )}
                  </div>

                  {addingAddress && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-200 mb-6"
                    >
                      <h3 className="text-sm sm:text-base font-extrabold text-[#143c2d] mb-1">
                        {editingAddressId ? "Edit Delivery Address" : "Add Permanent Delivery Address"}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 mb-4">
                        Enter your exact street address for doorstep delivery.
                      </p>

                      {addressError && <p className="text-red-500 text-xs mb-3">{addressError}</p>}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Address Label
                          </label>
                          <input
                            value={addressForm.label}
                            onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                            placeholder="e.g. Home, Lekki Office"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-[#143c2d]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Receiver's Full Name
                          </label>
                          <input
                            value={addressForm.receiver_name}
                            onChange={(e) => setAddressForm({ ...addressForm, receiver_name: e.target.value })}
                            placeholder="e.g. Henry Adeleke"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-[#143c2d]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Receiver's Phone Number
                          </label>
                          <input
                            value={addressForm.receiver_phone}
                            onChange={(e) => setAddressForm({ ...addressForm, receiver_phone: e.target.value })}
                            placeholder="e.g. 0801 234 5678"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-[#143c2d]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            State
                          </label>
                          <select
                            value={addressForm.state}
                            onChange={(e) => {
                              const nextState = e.target.value;
                              const nextPostcode = resolveNigerianPostalCode(nextState, addressForm.city, "", addressForm.street_address);
                              setAddressForm(prev => ({
                                ...prev,
                                state: nextState,
                                postal_code: (!prev.postal_code || prev.postal_code === resolveNigerianPostalCode(prev.state, prev.city, "", prev.street_address)) ? nextPostcode : prev.postal_code,
                              }));
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-[#143c2d]"
                          >
                            {NIGERIAN_STATES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Street Address & Location Pin *
                          </label>
                          <AddressAutocomplete
                            value={addressForm.street_address}
                            onChange={(e) => {
                              const nextAddr = e.target.value;
                              setAddressForm(prev => ({
                                ...prev,
                                street_address: nextAddr,
                                postal_code: resolveNigerianPostalCode(prev.state, prev.city, "", nextAddr),
                              }));
                            }}
                            onPlaceSelected={(place) => {
                              const matchedState = normalizeNigerianState(place.state);
                              const autoPostcode = place.postal_code || place.postcode || resolveNigerianPostalCode(matchedState || place.state, place.city || place.lga, "", place.address);
                              setAddressForm(prev => ({
                                ...prev,
                                // Preserve customer's typed street address
                                street_address: (prev.street_address && prev.street_address.trim().length >= 3) ? prev.street_address : (place.address || prev.street_address),
                                city: place.city || place.lga || prev.city,
                                state: matchedState || prev.state,
                                postal_code: autoPostcode || "440221",
                                latitude: place.latitude,
                                longitude: place.longitude,
                              }));
                            }}
                            initialLat={addressForm.latitude}
                            initialLng={addressForm.longitude}
                            placeholder="e.g. 14 Farm Road, Umuahia (or click Pin Map)"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-[#143c2d]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            City / LGA *
                          </label>
                          <input
                            value={addressForm.city}
                            onChange={(e) => {
                              const nextCity = e.target.value;
                              setAddressForm(prev => ({
                                ...prev,
                                city: nextCity,
                                postal_code: resolveNigerianPostalCode(prev.state, nextCity, "", prev.street_address),
                              }));
                            }}
                            placeholder="e.g. Umuahia / Lekki"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-[#143c2d]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Postal Code
                          </label>
                          <input
                            value={addressForm.postal_code || ""}
                            onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                            placeholder="e.g. 440221"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-[#143c2d]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-5">
                        <input
                          type="checkbox"
                          id="form_is_default"
                          checked={addressForm.is_default}
                          onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                          className="w-4 h-4 accent-[#143c2d] cursor-pointer rounded"
                        />
                        <label htmlFor="form_is_default" className="text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer">
                          Set as my permanent default delivery address
                        </label>
                      </div>

                      <div className="flex items-center gap-2.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setAddingAddress(false)}
                          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveAddress}
                          disabled={savingAddress}
                          className="px-5 py-2 bg-[#143c2d] hover:bg-[#1b4d3a] text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {savingAddress ? "Saving..." : "Save Address"}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Addresses List Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition ${
                          addr.is_default
                            ? 'bg-[#F4FBF6] border-2 border-[#143c2d] shadow-sm'
                            : 'bg-white border border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-extrabold text-xs sm:text-sm text-[#143c2d]">
                              {addr.label || "Delivery Location"}
                            </span>
                            {addr.is_default && (
                              <span className="bg-emerald-100 text-[#143c2d] text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                                Default
                              </span>
                            )}
                          </div>

                          {addr.receiver_name && (
                            <p className="m-0 mb-1 text-xs sm:text-sm font-bold text-gray-900">
                              {addr.receiver_name}
                            </p>
                          )}
                          <p className="m-0 mb-1 text-xs text-gray-600 leading-relaxed">
                            {addr.street_address}, {addr.city}, {addr.state}
                          </p>
                          {addr.receiver_phone && (
                            <p className="m-0 text-[11px] text-gray-500">
                              Phone: {addr.receiver_phone}
                            </p>
                          )}

                          {addr.latitude && addr.longitude && (
                            <div className="mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 rounded-lg px-2 py-0.5 inline-flex items-center gap-1">
                              <span>📍</span>
                              <span>GPS Mapped for Driver Navigation</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-gray-100">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => openEditAddress(addr)}
                              className="text-amber-700 hover:text-amber-800 font-bold text-xs cursor-pointer p-0 bg-transparent border-none"
                            >
                              Edit
                            </button>
                            {addresses.length > 1 ? (
                              <button
                                onClick={() => deleteAddress(addr.id)}
                                className="text-red-600 hover:text-red-700 font-semibold text-xs cursor-pointer p-0 bg-transparent border-none"
                              >
                                Delete
                              </button>
                            ) : (
                              <span className="text-gray-400 text-[11px] font-medium italic" title="Profile must always maintain at least one default delivery address">
                                Minimum 1 Required
                              </span>
                            )}
                          </div>

                          {!addr.is_default && (
                            <button
                              onClick={() => setAsDefaultAddress(addr.id)}
                              className="bg-white border border-[#143c2d] text-[#143c2d] hover:bg-emerald-50 rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer transition"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {addresses.length === 0 && !addingAddress && (
                      <div
                        onClick={openAddAddress}
                        className="col-span-full border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition"
                      >
                        <p className="text-sm sm:text-base font-bold text-[#143c2d] mb-1">
                          + Add Your Permanent Delivery Address
                        </p>
                        <p className="text-xs text-gray-500 m-0">
                          Save your address once to enjoy instant 1-tap checkout on farm fresh produce.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── TAB 3: ORDERS & TRACKING ── */}
              {activeTab === "orders" && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-[#143c2d] font-display">
                        Order History & Tracking
                      </h2>
                      <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                        Track live deliveries, review past shipments, and re-order in one tap.
                      </p>
                    </div>

                    <button
                      onClick={() => navigate("/products")}
                      className="w-full sm:w-auto px-4 py-2.5 bg-[#143c2d] hover:bg-[#1b4d3a] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
                    >
                      Shop Fresh Produce
                    </button>
                  </div>

                  {loadingOrders ? (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#143c2d] border-t-transparent mb-2" />
                      <p>Loading your orders...</p>
                    </div>
                  ) : myOrders.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-sm sm:text-base font-bold text-[#143c2d] mb-1">No Orders Yet</p>
                      <p className="text-xs text-gray-500 mb-5">You haven't placed any farm produce orders yet.</p>
                      <button
                        onClick={() => navigate("/products")}
                        className="px-5 py-2.5 bg-[#143c2d] hover:bg-[#1b4d3a] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
                      >
                        Browse Fresh Produce
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3.5">
                      {myOrders.map((order) => {
                        const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "";
                        const totalNaira = getNairaPrice(order.total_amount || order.total || 0);
                        const statusColor =
                          order.status === "delivered" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                          order.status === "cancelled" ? "bg-red-100 text-red-800 border-red-200" :
                          order.status === "in_transit" ? "bg-amber-100 text-amber-800 border-amber-200" :
                          "bg-blue-100 text-blue-800 border-blue-200";

                        return (
                          <div
                            key={order.id}
                            className="border border-gray-200 hover:border-emerald-200 rounded-2xl p-4 sm:p-5 bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span className="font-extrabold text-sm text-gray-900">
                                  Order #{order.id}
                                </span>
                                <span className={`text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-full border capitalize ${statusColor}`}>
                                  {order.status || "Processing"}
                                </span>
                              </div>
                              <p className="m-0 text-xs text-gray-500">
                                {dateStr} {order.delivery_code ? `• Code: ${order.delivery_code}` : ""}
                              </p>
                              {order.address && (
                                <p className="m-0 mt-1 text-xs text-gray-600 truncate">
                                  Destination: {order.address}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                              <div className="sm:text-right">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total</div>
                                <div className="text-sm sm:text-base font-black text-[#143c2d]">
                                  ₦{totalNaira.toLocaleString()}
                                </div>
                              </div>

                              <button
                                onClick={() => navigate(`/track-order?code=${encodeURIComponent(order.delivery_code || order.id)}`)}
                                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#143c2d] rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0"
                              >
                                Track Live
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── TAB 4: WISHLIST ── */}
              {activeTab === "wishlist" && (
                <motion.div
                  key="wishlist"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <div className="mb-6">
                    <h2 className="text-lg sm:text-xl font-black text-[#143c2d] font-display">
                      Saved Produce (Wishlist)
                    </h2>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                      Quick 1-tap re-ordering for your favorite household food items.
                    </p>
                  </div>

                  {wishlistProducts.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-sm sm:text-base font-bold text-[#143c2d] mb-1">Your Wishlist is Empty</p>
                      <p className="text-xs text-gray-500 mb-5">Tap the heart icon on any produce item to save it here for fast re-ordering.</p>
                      <button
                        onClick={() => navigate("/products")}
                        className="px-5 py-2.5 bg-[#143c2d] hover:bg-[#1b4d3a] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
                      >
                        Explore Storefront
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {wishlistProducts.map((p) => {
                        const price = getNairaPrice(p.price);
                        return (
                          <div
                            key={p.id}
                            className="border border-gray-200 hover:border-emerald-300 rounded-2xl p-3 sm:p-3.5 bg-white flex flex-col justify-between transition shadow-xs"
                          >
                            <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2.5 relative">
                              <img src={getProductImage(p)} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="m-0 text-xs sm:text-sm font-bold text-gray-900 truncate">{p.name}</h4>
                              <p className="m-0 my-1 text-[11px] text-gray-500 truncate">{p.unit || "Per item"}</p>
                              <div className="flex items-center justify-between gap-1 mt-2">
                                <span className="text-xs sm:text-sm font-black text-[#143c2d]">₦{price.toLocaleString()}</span>
                                <button
                                  onClick={() => addToCart(p)}
                                  className="px-2.5 py-1 bg-[#143c2d] hover:bg-[#1b4d3a] text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                                >
                                  + Basket
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── TAB 4B: MY WALLET (MONNIFY DEDICATED ACCOUNT) ── */}
              {activeTab === "wallet" && (
                <motion.div
                  key="wallet"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  {/* Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                          BemsFarms Wallet
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {walletData.wallet?.account_number ? "Account Active" : "Instant Funding"}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#143c2d] font-display tracking-tight">
                        My Dedicated Bems Wallet
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        Fund anytime via bank transfer and check out in one tap with zero card fees.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={loadWallet}
                        disabled={loadingWallet}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-[#143c2d] hover:bg-gray-50 inline-flex items-center gap-1.5 shadow-2xs transition"
                      >
                        <svg className={`w-3.5 h-3.5 ${loadingWallet ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {loadingWallet ? "Refreshing…" : "Refresh"}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/products")}
                        className="px-4 py-2 rounded-xl bg-[#1B4332] hover:bg-[#143c2d] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition"
                      >
                        Shop &amp; Pay →
                      </button>
                    </div>
                  </div>

                  {/* Hero Balance + Dedicated Account Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
                    {/* Left: Available Balance + Mini Metrics */}
                    <div
                      className="lg:col-span-6 rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between relative overflow-hidden"
                      style={{ background: "linear-gradient(135deg, #1B4332 0%, #0f2d20 100%)" }}
                    >
                      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-emerald-400/10 pointer-events-none" />
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-emerald-200/90 font-bold">
                          Available Wallet Balance
                        </div>
                        <div className="text-3xl sm:text-4xl font-black mt-2 tracking-tight">
                          ₦{Number(walletData.wallet?.balance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 mt-6 pt-4 border-t border-white/15">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-emerald-200/75 font-semibold">
                            Total Funded
                          </div>
                          <div className="text-sm sm:text-base font-extrabold mt-0.5">
                            ₦{Number(walletData.wallet?.total_topped_up || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-emerald-200/75 font-semibold">
                            Total Spent
                          </div>
                          <div className="text-sm sm:text-base font-extrabold mt-0.5">
                            ₦{Number(walletData.wallet?.total_spent || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-emerald-200/75 font-semibold">
                            Activity
                          </div>
                          <div className="text-sm sm:text-base font-extrabold mt-0.5">
                            {walletData.transactions.length} {walletData.transactions.length === 1 ? "tx" : "txs"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Dedicated Virtual Account OR Activation Card */}
                    <div className="lg:col-span-6 rounded-2xl p-5 sm:p-6 bg-emerald-50/50 border border-emerald-200/80 flex flex-col justify-between">
                      {walletData.wallet?.account_number ? (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] uppercase tracking-wider text-emerald-800 font-extrabold">
                              {walletData.wallet.bank_name || "Dedicated Bank Account"}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Instant Top-Up
                            </span>
                          </div>
                          <div className="my-3 p-3.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                                Account Number (NUBAN)
                              </div>
                              <div className="text-2xl font-mono font-black text-[#143c2d] tracking-wider mt-0.5">
                                {walletData.wallet.account_number}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(walletData.wallet.account_number);
                                setCopiedAcct(true);
                                setTimeout(() => setCopiedAcct(false), 2000);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-[#1B4332] hover:bg-[#143c2d] text-white text-xs font-bold transition whitespace-nowrap"
                            >
                              {copiedAcct ? "✓ Copied" : "Copy NUBAN"}
                            </button>
                          </div>
                          <div className="text-xs text-gray-600 flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#143c2d] truncate">
                              {walletData.wallet.account_name}
                            </span>
                            <span className="text-[11px] text-gray-500 whitespace-nowrap">
                              Credits automatically
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-xs font-black text-[#143c2d] uppercase tracking-wider">
                                Activate Dedicated Bank Account
                              </span>
                              <div className="inline-flex rounded-lg bg-white border border-emerald-200 p-0.5">
                                {["bvn", "nin"].map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => setKycType(t)}
                                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase transition ${
                                      kycType === t
                                        ? "bg-[#1B4332] text-white"
                                        : "text-gray-500 hover:text-gray-900"
                                    }`}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              Enter your 11-digit {kycType.toUpperCase()} (CBN requirement) to generate your personal NUBAN account number.
                            </p>
                            {(walletError || walletData.wallet?.provision_error) && (
                              <div className="mt-2.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
                                {walletError || walletData.wallet.provision_error}
                              </div>
                            )}
                          </div>

                          <form onSubmit={handleProvisionWallet} className="mt-3 flex gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={11}
                              value={kycNumber}
                              onChange={(e) => setKycNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                              placeholder={`11-digit ${kycType.toUpperCase()}`}
                              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-emerald-200 text-gray-900 text-xs font-mono font-semibold focus:outline-none focus:border-[#1B4332]"
                            />
                            <button
                              type="submit"
                              disabled={loadingWallet}
                              className="px-4 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143c2d] text-white font-bold text-xs whitespace-nowrap disabled:opacity-60 transition"
                            >
                              {loadingWallet ? "Generating…" : "Activate"}
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 3-Step Quick Guide */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
                    {[
                      { step: "1", title: "Copy Your NUBAN", desc: "Your personal BemsFarms account number" },
                      { step: "2", title: "Transfer Any Amount", desc: "Instant credit from any Nigerian bank app" },
                      { step: "3", title: "PIN-Protected Checkout", desc: "Pay faster with your 4-digit wallet PIN" },
                    ].map((item) => (
                      <div key={item.step} className="rounded-xl border border-gray-100 bg-gray-50/70 px-3.5 py-3 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#1B4332] text-white text-[10px] font-black grid place-items-center shrink-0 mt-0.5">
                          {item.step}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-[#143c2d]">{item.title}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Wallet Payment PIN Card */}
                  <div className="rounded-2xl border border-emerald-100 bg-[#F4F9F5] p-4 sm:p-5 mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#1B4332] text-white grid place-items-center shrink-0 mt-0.5">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-[#143c2d]">Checkout Payment PIN</h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                walletData.wallet?.has_payment_pin
                                  ? "bg-emerald-100 text-[#1B4332]"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {walletData.wallet?.has_payment_pin ? "PIN Active" : "PIN Not Set"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {walletData.wallet?.has_payment_pin
                              ? "Your 4-digit Payment PIN is required whenever you pay with Bems Wallet at checkout."
                              : "Set a 4-digit Payment PIN to authorize Bems Wallet payments at checkout."}
                          </p>
                        </div>
                      </div>

                      {walletData.wallet?.has_payment_pin && (
                        <button
                          type="button"
                          onClick={() => {
                            setPinFormOpen((o) => !o);
                            setPinError(null);
                            setPinSuccess(null);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-white border border-emerald-200 hover:border-[#1B4332] text-xs font-bold text-[#143c2d] transition"
                        >
                          {pinFormOpen ? "Cancel" : "Change / Reset PIN"}
                        </button>
                      )}
                    </div>

                    {pinSuccess && (
                      <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-100/80 border border-emerald-200 text-xs font-semibold text-[#1B4332]">
                        {pinSuccess}
                      </div>
                    )}
                    {pinError && (
                      <div className="mt-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                        {pinError}
                      </div>
                    )}

                    {(!walletData.wallet?.has_payment_pin || pinFormOpen) && (
                      <form onSubmit={handleSaveWalletPin} className="mt-4 pt-4 border-t border-emerald-200/70 space-y-3">
                        {walletData.wallet?.has_payment_pin && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPinResetMode("current_pin");
                                setPinError(null);
                              }}
                              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                                pinResetMode === "current_pin"
                                  ? "bg-[#1B4332] text-white"
                                  : "bg-white text-gray-600 border border-gray-200"
                              }`}
                            >
                              Use Current PIN
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPinResetMode("password");
                                setPinError(null);
                              }}
                              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                                pinResetMode === "password"
                                  ? "bg-[#1B4332] text-white"
                                  : "bg-white text-gray-600 border border-gray-200"
                              }`}
                            >
                              Forgot PIN? Use Account Password
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                          {walletData.wallet?.has_payment_pin && (
                            <div>
                              <label className="block text-[11px] font-bold text-[#143c2d] mb-1">
                                {pinResetMode === "current_pin" ? "Current 4-Digit PIN" : "Account Password"}
                              </label>
                              {pinResetMode === "current_pin" ? (
                                <input
                                  type="password"
                                  inputMode="numeric"
                                  maxLength={4}
                                  value={currentWalletPin}
                                  onChange={(e) => setCurrentWalletPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                  placeholder="••••"
                                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-emerald-200 text-gray-900 text-sm font-mono tracking-[0.3em] focus:outline-none focus:border-[#1B4332]"
                                />
                              ) : (
                                <input
                                  type="password"
                                  value={walletPinPassword}
                                  onChange={(e) => setWalletPinPassword(e.target.value)}
                                  placeholder="Enter password"
                                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-emerald-200 text-gray-900 text-xs focus:outline-none focus:border-[#1B4332]"
                                />
                              )}
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] font-bold text-[#143c2d] mb-1">
                              {walletData.wallet?.has_payment_pin ? "New 4-Digit PIN" : "Set 4-Digit PIN"}
                            </label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              value={newWalletPin}
                              onChange={(e) => setNewWalletPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                              placeholder="••••"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-emerald-200 text-gray-900 text-sm font-mono tracking-[0.3em] focus:outline-none focus:border-[#1B4332]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-[#143c2d] mb-1">
                              Confirm 4-Digit PIN
                            </label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              value={confirmWalletPin}
                              onChange={(e) => setConfirmWalletPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                              placeholder="••••"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-emerald-200 text-gray-900 text-sm font-mono tracking-[0.3em] focus:outline-none focus:border-[#1B4332]"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={pinSaving}
                            className="px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143c2d] text-white font-bold text-xs disabled:opacity-60 transition"
                          >
                            {pinSaving
                              ? "Saving…"
                              : walletData.wallet?.has_payment_pin
                              ? "Update Payment PIN"
                              : "Set Payment PIN"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Wallet Transactions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-black text-[#143c2d]">Recent Wallet Activity</h3>
                    <div className="inline-flex rounded-xl bg-gray-100 p-1">
                      {[
                        { id: "all", label: "All" },
                        { id: "credit", label: "Top-Ups" },
                        { id: "debit", label: "Payments" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setWalletFilter(f.id)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                            walletFilter === f.id
                              ? "bg-white text-[#143c2d] shadow-2xs"
                              : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(() => {
                    const filteredTx = walletData.transactions.filter((tx) =>
                      walletFilter === "all" ? true : String(tx.type || "").toLowerCase() === walletFilter
                    );
                    if (filteredTx.length === 0) {
                      return (
                        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                          <div className="text-xs font-bold text-gray-600">
                            {walletFilter === "all"
                              ? "No wallet transactions yet"
                              : `No ${walletFilter === "credit" ? "top-ups" : "order payments"} yet`}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            Transfer to your dedicated NUBAN above to fund your wallet instantly.
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {filteredTx.map((tx) => {
                          const isCredit = String(tx.type || "").toLowerCase() === "credit";
                          return (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-gray-100 bg-white hover:border-emerald-200 transition"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-xl grid place-items-center text-sm font-black shrink-0 ${
                                    isCredit ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                                  }`}
                                >
                                  {isCredit ? "↓" : "↑"}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                    {tx.description || (isCredit ? "Wallet Top-Up" : "Order Payment")}
                                  </div>
                                  <div className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">
                                    {tx.reference} · {new Date(tx.created_at).toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className={`text-sm font-black ${isCredit ? "text-emerald-700" : "text-rose-600"}`}>
                                  {isCredit ? "+" : "-"}₦{Number(tx.amount || 0).toLocaleString()}
                                </div>
                                <div className="text-[11px] text-gray-400">
                                  Bal: ₦{Number(tx.balance_after || 0).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {/* ── TAB 5: SECURITY & PASSWORD ── */}
              {activeTab === "password" && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <div className="mb-6">
                    <h2 className="text-lg sm:text-xl font-black text-[#143c2d] font-display">
                      Security & Password
                    </h2>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                      Keep your customer account secure by updating your password periodically.
                    </p>
                  </div>

                  <div className="w-full max-w-md flex flex-col gap-4">
                    {passwordError && (
                      <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs sm:text-sm font-semibold border border-red-100">
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="p-3 bg-emerald-50 text-[#143c2d] rounded-xl text-xs sm:text-sm font-bold border border-emerald-200">
                        Password updated successfully!
                      </div>
                    )}

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordForm.current}
                          onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                          placeholder="Enter current password"
                          className="w-full pl-3.5 pr-14 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#143c2d] outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-xs text-gray-400 hover:text-gray-700 font-semibold cursor-pointer"
                        >
                          {showCurrentPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNextPassword ? "text" : "password"}
                          value={passwordForm.next}
                          onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                          placeholder="At least 6 characters"
                          className="w-full pl-3.5 pr-14 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#143c2d] outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNextPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-xs text-gray-400 hover:text-gray-700 font-semibold cursor-pointer"
                        >
                          {showNextPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                          placeholder="Re-type new password"
                          className="w-full pl-3.5 pr-14 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#143c2d] outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-xs text-gray-400 hover:text-gray-700 font-semibold cursor-pointer"
                        >
                          {showConfirmPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={passwordSaving}
                      className="mt-2 w-full sm:w-auto px-7 py-3 bg-[#143c2d] hover:bg-[#1b4d3a] text-white rounded-xl font-extrabold text-sm shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {passwordSaving ? "Updating Password..." : "Update Password"}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
