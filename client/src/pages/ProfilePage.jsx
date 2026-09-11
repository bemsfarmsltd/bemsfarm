import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../services/api";
import { getNairaPrice } from "../utils/currency";
import { getProductImage } from "../utils/productImages";

const NIGERIAN_STATES = [
  "Lagos", "Abuja (FCT)", "Ogun", "Oyo", "Rivers", "Delta", "Edo",
  "Kaduna", "Kano", "Enugu", "Anambra", "Akwa Ibom", "Ondo", "Osun",
  "Kwara", "Plateau", "Abia", "Imo", "Benue", "Bayelsa"
];

export default function ProfilePage() {
  const { user, isLoggedIn, updateUser, logout } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);

  // Profile fields
  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    preferredState: "Lagos",
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
  const [wishlistProducts, setWishlistProducts] = useState([]);

  // Address book
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState({
    label: "",
    receiver_name: "",
    receiver_phone: "",
    street_address: "",
    city: "",
    state: "Lagos",
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

  // Load addresses
  const loadAddresses = () => {
    api.get("/addresses").then((r) => setAddresses(r.data.addresses || [])).catch(() => {});
  };

  // Load orders
  const loadOrders = () => {
    setLoadingOrders(true);
    api.get("/orders")
      .then((r) => setMyOrders(r.data.orders || []))
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
      preferredState: user.state || "Lagos",
      deliveryNotes: user.address || "",
    });
    setAvatar(user.avatar_url || null);

    loadAddresses();
    loadOrders();
  }, [user]);

  // Load wishlist items
  useEffect(() => {
    const rawFavs = localStorage.getItem("favorites");
    if (!rawFavs) return;
    try {
      const favMap = JSON.parse(rawFavs);
      const favIds = Object.keys(favMap).filter((k) => favMap[k]);
      if (favIds.length > 0) {
        api.get("/products", { params: { limit: 100 } })
          .then((res) => {
            const all = res.data?.products || [];
            setWishlistProducts(all.filter((p) => favIds.includes(String(p.id))));
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  if (!isLoggedIn) {
    return (
      <PageWrapper>
        <div style={{ maxWidth: "460px", margin: "80px auto", textAlign: "center", padding: "40px 24px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 20px",
              borderRadius: "20px",
              backgroundColor: "rgba(20, 60, 45, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#143c2d",
            }}
          >
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#143c2d", margin: "0 0 8px", fontFamily: "var(--heading-font)" }}>
            Sign In to View Your Account
          </h2>
          <p style={{ color: "#6B7280", fontSize: "14px", margin: "0 0 24px" }}>
            Access your order history, delivery addresses, and personal produce preferences.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={() => navigate("/login")}
              style={{
                backgroundColor: "#143c2d",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "12px 24px",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/register")}
              style={{
                backgroundColor: "white",
                color: "#143c2d",
                border: "1px solid #143c2d",
                borderRadius: "12px",
                padding: "12px 24px",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
              }}
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
      state: "Lagos",
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
      state: addr.state || "Lagos",
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
    try {
      await api.delete(`/addresses/${id}`);
      loadAddresses();
    } catch {
      // ignore
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
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      id: "address",
      label: "Delivery Addresses",
      badge: addresses.length,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
    },
    {
      id: "wishlist",
      label: "Saved Wishlist",
      badge: wishlistProducts.length,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
    {
      id: "password",
      label: "Security & Password",
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
  ];

  return (
    <PageWrapper>
      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "28px 20px 80px", fontFamily: "var(--body-font), sans-serif" }}>

        {/* Hero Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #143c2d 0%, #1a4f3b 60%, #23654b 100%)",
            borderRadius: "24px",
            padding: "32px 36px",
            color: "white",
            marginBottom: "32px",
            boxShadow: "0 10px 30px rgba(20, 60, 45, 0.15)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {/* Avatar / Monogram with Interactive Upload Badge */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Click to upload/change profile photo"
                style={{
                  width: "76px",
                  height: "76px",
                  borderRadius: "50%",
                  backgroundColor: "#FAF8F5",
                  color: "#143c2d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: 900,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                  overflow: "hidden",
                  border: "3px solid rgba(255,255,255,0.85)",
                  cursor: uploadingAvatar ? "wait" : "pointer",
                  padding: 0,
                  position: "relative",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!uploadingAvatar) e.currentTarget.style.transform = "scale(1.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {uploadingAvatar ? (
                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-3 border-[#143c2d] border-t-transparent" />
                ) : avatar ? (
                  <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>{initials}</span>
                )}
              </button>

              {/* Camera Icon Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Photo"
                style={{
                  position: "absolute",
                  bottom: "-2px",
                  right: "-2px",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#F59E0B",
                  color: "#071F14",
                  border: "2px solid #071F14",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  cursor: "pointer",
                  padding: 0,
                  transition: "transform 0.15s, background-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FBBF24")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F59E0B")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, fontFamily: "var(--heading-font)" }}>
                  {user.name || "Customer Account"}
                </h1>
                <span
                  style={{
                    backgroundColor: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    padding: "2px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                  }}
                >
                  Verified Customer
                </span>
              </div>
              <p style={{ margin: "4px 0 0", color: "#E0EFE8", fontSize: "13px" }}>
                {user.email} {user.phone ? `• ${user.phone}` : ""}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div
              onClick={() => setActiveTab("orders")}
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "12px 20px",
                textAlign: "center",
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.15)",
                minWidth: "90px",
              }}
            >
              <div style={{ fontSize: "20px", fontWeight: 800 }}>{myOrders.length}</div>
              <div style={{ fontSize: "11px", color: "#D1E7DD", fontWeight: 600 }}>Orders</div>
            </div>

            <div
              onClick={() => setActiveTab("address")}
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "12px 20px",
                textAlign: "center",
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.15)",
                minWidth: "90px",
              }}
            >
              <div style={{ fontSize: "20px", fontWeight: 800 }}>{addresses.length}</div>
              <div style={{ fontSize: "11px", color: "#D1E7DD", fontWeight: 600 }}>Addresses</div>
            </div>

            <div
              onClick={() => setActiveTab("wishlist")}
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "12px 20px",
                textAlign: "center",
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.15)",
                minWidth: "90px",
              }}
            >
              <div style={{ fontSize: "20px", fontWeight: 800 }}>{wishlistProducts.length}</div>
              <div style={{ fontSize: "11px", color: "#D1E7DD", fontWeight: 600 }}>Saved</div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "28px", alignItems: "flex-start" }}>

          {/* Left Navigation Sidebar */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "20px",
              padding: "16px",
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {menuTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setAddingAddress(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: "none",
                    background: isActive ? "#F0FFF4" : "transparent",
                    color: isActive ? "#143c2d" : "#4B5563",
                    fontWeight: isActive ? 700 : 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: isActive ? "#143c2d" : "#9CA3AF" }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </div>
                  {typeof tab.badge === "number" && tab.badge > 0 && (
                    <span
                      style={{
                        backgroundColor: isActive ? "#143c2d" : "#F3F4F6",
                        color: isActive ? "white" : "#6B7280",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: "12px",
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #F3F4F6" }}>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "#FEF2F2",
                  color: "#DC2626",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Right Main Content Card */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "24px",
              padding: "32px 36px",
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
              minHeight: "420px",
            }}
          >
            <AnimatePresence mode="wait">

              {/* ── TAB 1: PERSONAL PROFILE ── */}
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div style={{ marginBottom: "24px" }}>
                    <h2 style={{ fontSize: "19px", fontWeight: 800, color: "#143c2d", margin: "0 0 4px", fontFamily: "var(--heading-font)" }}>
                      Personal Profile
                    </h2>
                    <p style={{ color: "#6B7280", fontSize: "13px", margin: 0 }}>
                      Manage your contact details and default delivery preferences for fast checkout.
                    </p>
                  </div>

                  {/* Avatar Upload Box */}
                  <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "18px 20px", backgroundColor: "#F9FAFB", borderRadius: "16px", marginBottom: "28px", border: "1px solid #F3F4F6" }}>
                    <div
                      style={{
                        width: "68px",
                        height: "68px",
                        borderRadius: "50%",
                        backgroundColor: "#143c2d",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        fontWeight: 800,
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      {avatar ? (
                        <img src={avatar} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>

                    <div>
                      <h4 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                        Profile Photo
                      </h4>
                      <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#6B7280" }}>
                        JPG or PNG up to 2MB.
                      </p>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          style={{
                            padding: "7px 16px",
                            backgroundColor: "#143c2d",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: uploadingAvatar ? "wait" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
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
                            style={{
                              padding: "7px 14px",
                              backgroundColor: "transparent",
                              color: "#DC2626",
                              border: "1px solid #FCA5A5",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {avatarError && <p style={{ color: "#EF4444", fontSize: "12px", margin: "6px 0 0" }}>{avatarError}</p>}
                    </div>
                  </div>

                  {/* Clean Form */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "24px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        First Name *
                      </label>
                      <input
                        value={fields.firstName}
                        onChange={(e) => setFields({ ...fields, firstName: e.target.value })}
                        placeholder="e.g. Henry"
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          borderRadius: "10px",
                          border: "1px solid #D1D5DB",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Last Name *
                      </label>
                      <input
                        value={fields.lastName}
                        onChange={(e) => setFields({ ...fields, lastName: e.target.value })}
                        placeholder="e.g. Adeleke"
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          borderRadius: "10px",
                          border: "1px solid #D1D5DB",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={fields.email}
                        onChange={(e) => setFields({ ...fields, email: e.target.value })}
                        placeholder="henry@example.com"
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          borderRadius: "10px",
                          border: "1px solid #D1D5DB",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Mobile Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={fields.phone}
                        onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                        placeholder="+234 800 000 0000"
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          borderRadius: "10px",
                          border: "1px solid #D1D5DB",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Primary Delivery State
                      </label>
                      <select
                        value={fields.preferredState}
                        onChange={(e) => setFields({ ...fields, preferredState: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          borderRadius: "10px",
                          border: "1px solid #D1D5DB",
                          fontSize: "14px",
                          outline: "none",
                          backgroundColor: "#FFFFFF",
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        {NIGERIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Permanent Delivery Address
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ flex: 1, padding: "10px 14px", backgroundColor: "#F9FAFB", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "13px", color: "#374151", truncate: "true" }}>
                          {defaultAddress ? `${defaultAddress.street_address}, ${defaultAddress.city}` : "No default address set"}
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("address")}
                          style={{
                            padding: "10px 14px",
                            backgroundColor: "#F0FFF4",
                            color: "#143c2d",
                            border: "1px solid #C8E6C9",
                            borderRadius: "10px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Manage
                        </button>
                      </div>
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Delivery Instructions / Dietary Notes (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={fields.deliveryNotes}
                        onChange={(e) => setFields({ ...fields, deliveryNotes: e.target.value })}
                        placeholder="e.g. Call before arrival, leave package at estate gate, prefer fresh unpeeled tubers..."
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          borderRadius: "10px",
                          border: "1px solid #D1D5DB",
                          fontSize: "14px",
                          outline: "none",
                          resize: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {saveError && <p style={{ color: "#EF4444", fontSize: "13px", marginBottom: "12px" }}>{saveError}</p>}

                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <button
                      onClick={handleSaveFields}
                      disabled={savingProfile}
                      style={{
                        padding: "12px 28px",
                        backgroundColor: "#143c2d",
                        color: "white",
                        border: "none",
                        borderRadius: "12px",
                        fontWeight: 800,
                        fontSize: "14px",
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(20,60,45,0.2)",
                        transition: "all 0.2s",
                      }}
                    >
                      {savingProfile ? "Saving Changes..." : saved ? "Changes Saved!" : "Save Changes"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── TAB 2: DELIVERY ADDRESSES ── */}
              {activeTab === "address" && (
                <motion.div
                  key="address"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                    <div>
                      <h2 style={{ fontSize: "19px", fontWeight: 800, color: "#143c2d", margin: "0 0 4px", fontFamily: "var(--heading-font)" }}>
                        Delivery Addresses
                      </h2>
                      <p style={{ color: "#6B7280", fontSize: "13px", margin: 0 }}>
                        Set your permanent home/office address or add extra locations for flexible checkout.
                      </p>
                    </div>

                    {!addingAddress && (
                      <button
                        onClick={openAddAddress}
                        style={{
                          padding: "9px 16px",
                          backgroundColor: "#143c2d",
                          color: "white",
                          border: "none",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>+</span>
                        <span>Add New Address</span>
                      </button>
                    )}
                  </div>

                  {addingAddress && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        backgroundColor: "#F9FAFB",
                        borderRadius: "16px",
                        padding: "24px",
                        border: "1px solid #E5E7EB",
                        marginBottom: "24px",
                      }}
                    >
                      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#143c2d", margin: "0 0 6px" }}>
                        {editingAddressId ? "Edit Delivery Address" : "Add Permanent Delivery Address"}
                      </h3>
                      <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 18px" }}>
                        Enter your exact street address for doorstep delivery.
                      </p>

                      {addressError && <p style={{ color: "#EF4444", fontSize: "13px", marginBottom: "14px" }}>{addressError}</p>}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                            Address Label
                          </label>
                          <input
                            value={addressForm.label}
                            onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                            placeholder="e.g. Home, Lekki Residence, Office"
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", boxSizing: "border-box" }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                            Receiver's Full Name
                          </label>
                          <input
                            value={addressForm.receiver_name}
                            onChange={(e) => setAddressForm({ ...addressForm, receiver_name: e.target.value })}
                            placeholder="e.g. Henry Adeleke"
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", boxSizing: "border-box" }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                            Receiver's Phone Number
                          </label>
                          <input
                            value={addressForm.receiver_phone}
                            onChange={(e) => setAddressForm({ ...addressForm, receiver_phone: e.target.value })}
                            placeholder="e.g. 0801 234 5678"
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", boxSizing: "border-box" }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                            State
                          </label>
                          <select
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", backgroundColor: "#FFFFFF", boxSizing: "border-box" }}
                          >
                            {NIGERIAN_STATES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                            Street Address *
                          </label>
                          <input
                            value={addressForm.street_address}
                            onChange={(e) => setAddressForm({ ...addressForm, street_address: e.target.value })}
                            placeholder="e.g. 14 Farm Road, Lekki Phase 1"
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", boxSizing: "border-box" }}
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                            City / Town *
                          </label>
                          <input
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            placeholder="e.g. Lekki, Ikeja, Victoria Island"
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", boxSizing: "border-box" }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "14px 0 20px" }}>
                        <input
                          type="checkbox"
                          id="form_is_default"
                          checked={addressForm.is_default}
                          onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                          style={{ width: "16px", height: "16px", accentColor: "#143c2d", cursor: "pointer" }}
                        />
                        <label htmlFor="form_is_default" style={{ fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                          Set as my permanent default delivery address
                        </label>
                      </div>

                      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setAddingAddress(false)}
                          style={{
                            padding: "9px 16px",
                            backgroundColor: "white",
                            border: "1px solid #D1D5DB",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveAddress}
                          disabled={savingAddress}
                          style={{
                            padding: "9px 20px",
                            backgroundColor: "#143c2d",
                            color: "white",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {savingAddress ? "Saving..." : "Save Address"}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Addresses List */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        style={{
                          border: addr.is_default ? "2px solid #143c2d" : "1px solid #E5E7EB",
                          borderRadius: "16px",
                          padding: "20px",
                          backgroundColor: addr.is_default ? "#F4FBF6" : "#FFFFFF",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          minHeight: "150px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                            <span style={{ fontWeight: 800, fontSize: "14px", color: "#143c2d" }}>
                              {addr.label || "Delivery Location"}
                            </span>
                            {addr.is_default && (
                              <span style={{ backgroundColor: "#E8F5E9", color: "#143c2d", fontSize: "11px", fontWeight: 800, padding: "2px 8px", borderRadius: "12px", border: "1px solid #C8E6C9" }}>
                                Permanent Default
                              </span>
                            )}
                          </div>

                          {addr.receiver_name && (
                            <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                              {addr.receiver_name}
                            </p>
                          )}
                          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#4B5563", lineHeight: "1.4" }}>
                            {addr.street_address}, {addr.city}, {addr.state}
                          </p>
                          {addr.receiver_phone && (
                            <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                              Phone: {addr.receiver_phone}
                            </p>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", marginTop: "14px", borderTop: "1px solid #F3F4F6" }}>
                          <div style={{ display: "flex", gap: "12px" }}>
                            <button
                              onClick={() => openEditAddress(addr)}
                              style={{ background: "none", border: "none", color: "#c85a17", fontWeight: 700, fontSize: "12px", cursor: "pointer", padding: 0 }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteAddress(addr.id)}
                              style={{ background: "none", border: "none", color: "#DC2626", fontWeight: 600, fontSize: "12px", cursor: "pointer", padding: 0 }}
                            >
                              Delete
                            </button>
                          </div>

                          {!addr.is_default && (
                            <button
                              onClick={() => setAsDefaultAddress(addr.id)}
                              style={{
                                backgroundColor: "white",
                                border: "1px solid #143c2d",
                                color: "#143c2d",
                                borderRadius: "8px",
                                padding: "4px 10px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
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
                        style={{
                          gridColumn: "1 / -1",
                          border: "2px dashed #D1D5DB",
                          borderRadius: "16px",
                          padding: "36px 20px",
                          textAlign: "center",
                          cursor: "pointer",
                          backgroundColor: "#FAFAF9",
                        }}
                      >
                        <p style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: "#143c2d" }}>
                          + Add Your Permanent Delivery Address
                        </p>
                        <p style={{ margin: 0, fontSize: "13px", color: "#6B7280" }}>
                          Save your address once to enjoy instant, 1-tap checkout on fresh produce.
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                      <h2 style={{ fontSize: "19px", fontWeight: 800, color: "#143c2d", margin: "0 0 4px", fontFamily: "var(--heading-font)" }}>
                        Order History & Tracking
                      </h2>
                      <p style={{ color: "#6B7280", fontSize: "13px", margin: 0 }}>
                        Review your farm produce deliveries, track live shipments, or re-order.
                      </p>
                    </div>

                    <button
                      onClick={() => navigate("/products")}
                      style={{
                        padding: "9px 16px",
                        backgroundColor: "#143c2d",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Shop Produce
                    </button>
                  </div>

                  {loadingOrders ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>Loading your orders...</div>
                  ) : myOrders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 20px", backgroundColor: "#F9FAFB", borderRadius: "16px", border: "1px dashed #E5E7EB" }}>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: "#143c2d", margin: "0 0 6px" }}>No Orders Yet</p>
                      <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 16px" }}>You haven't placed any farm produce orders yet.</p>
                      <button
                        onClick={() => navigate("/products")}
                        style={{
                          padding: "10px 20px",
                          backgroundColor: "#143c2d",
                          color: "white",
                          border: "none",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Browse Fresh Produce
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {myOrders.map((order) => {
                        const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "";
                        const totalNaira = getNairaPrice(order.total_amount || order.total || 0);
                        const statusColor =
                          order.status === "delivered" ? "#2E7D32" :
                          order.status === "cancelled" ? "#DC2626" :
                          order.status === "in_transit" ? "#c85a17" : "#143c2d";

                        return (
                          <div
                            key={order.id}
                            style={{
                              border: "1px solid #E5E7EB",
                              borderRadius: "16px",
                              padding: "18px 20px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "14px",
                              backgroundColor: "#FFFFFF",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 800, fontSize: "14px", color: "#111827" }}>
                                  Order #{order.id}
                                </span>
                                <span
                                  style={{
                                    backgroundColor: `${statusColor}15`,
                                    color: statusColor,
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {order.status || "Processing"}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                                {dateStr} {order.delivery_code ? `• Delivery Code: ${order.delivery_code}` : ""}
                              </p>
                              {order.address && (
                                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#4B5563" }}>
                                  Destination: {order.address}
                                </p>
                              )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "11px", color: "#6B7280" }}>Total Amount</div>
                                <div style={{ fontSize: "15px", fontWeight: 900, color: "#143c2d" }}>
                                  ₦{totalNaira.toLocaleString()}
                                </div>
                              </div>

                              <button
                                onClick={() => navigate(`/track-order?code=${encodeURIComponent(order.delivery_code || order.id)}`)}
                                style={{
                                  padding: "8px 14px",
                                  backgroundColor: "#F0FFF4",
                                  border: "1px solid #C8E6C9",
                                  color: "#143c2d",
                                  borderRadius: "10px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div style={{ marginBottom: "24px" }}>
                    <h2 style={{ fontSize: "19px", fontWeight: 800, color: "#143c2d", margin: "0 0 4px", fontFamily: "var(--heading-font)" }}>
                      Saved Produce (Wishlist)
                    </h2>
                    <p style={{ color: "#6B7280", fontSize: "13px", margin: 0 }}>
                      Quick 1-tap re-ordering for your favorite household produce.
                    </p>
                  </div>

                  {wishlistProducts.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 20px", backgroundColor: "#F9FAFB", borderRadius: "16px", border: "1px dashed #E5E7EB" }}>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: "#143c2d", margin: "0 0 6px" }}>Your Wishlist is Empty</p>
                      <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 16px" }}>Tap the heart icon on any produce item to save it here for fast re-ordering.</p>
                      <button
                        onClick={() => navigate("/products")}
                        style={{
                          padding: "10px 20px",
                          backgroundColor: "#143c2d",
                          color: "white",
                          border: "none",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Explore Storefront
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
                      {wishlistProducts.map((p) => {
                        const price = getNairaPrice(p.price);
                        return (
                          <div
                            key={p.id}
                            style={{
                              border: "1px solid #E5E7EB",
                              borderRadius: "16px",
                              padding: "14px",
                              backgroundColor: "white",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ width: "100%", height: "120px", borderRadius: "10px", overflow: "hidden", backgroundColor: "#FAF9F6", marginBottom: "10px" }}>
                              <img src={getProductImage(p)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                            <div>
                              <h4 style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 700, color: "#111827", truncate: "true" }}>{p.name}</h4>
                              <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#6B7280" }}>{p.unit || "Per item"}</p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "14px", fontWeight: 800, color: "#143c2d" }}>₦{price.toLocaleString()}</span>
                                <button
                                  onClick={() => addToCart(p)}
                                  style={{
                                    padding: "6px 10px",
                                    backgroundColor: "#143c2d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
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

              {/* ── TAB 5: SECURITY & PASSWORD ── */}
              {activeTab === "password" && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div style={{ marginBottom: "24px" }}>
                    <h2 style={{ fontSize: "19px", fontWeight: 800, color: "#143c2d", margin: "0 0 4px", fontFamily: "var(--heading-font)" }}>
                      Security & Password
                    </h2>
                    <p style={{ color: "#6B7280", fontSize: "13px", margin: 0 }}>
                      Keep your account safe by updating your password periodically.
                    </p>
                  </div>

                  <div style={{ maxWidth: "440px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {passwordError && (
                      <div style={{ padding: "10px 14px", backgroundColor: "#FEF2F2", color: "#DC2626", borderRadius: "10px", fontSize: "13px", fontWeight: 600 }}>
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div style={{ padding: "10px 14px", backgroundColor: "#F0FFF4", color: "#143c2d", borderRadius: "10px", fontSize: "13px", fontWeight: 700, border: "1px solid #C8E6C9" }}>
                        Password updated successfully!
                      </div>
                    )}

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Current Password
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordForm.current}
                          onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                          placeholder="Enter current password"
                          style={{ width: "100%", padding: "11px 40px 11px 14px", borderRadius: "10px", border: "1px solid #D1D5DB", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword((p) => !p)}
                          style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}
                        >
                          {showCurrentPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        New Password
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showNextPassword ? "text" : "password"}
                          value={passwordForm.next}
                          onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                          placeholder="At least 6 characters"
                          style={{ width: "100%", padding: "11px 40px 11px 14px", borderRadius: "10px", border: "1px solid #D1D5DB", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNextPassword((p) => !p)}
                          style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}
                        >
                          {showNextPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Confirm New Password
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                          placeholder="Re-type new password"
                          style={{ width: "100%", padding: "11px 40px 11px 14px", borderRadius: "10px", border: "1px solid #D1D5DB", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}
                        >
                          {showConfirmPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={passwordSaving}
                      style={{
                        marginTop: "8px",
                        padding: "12px 24px",
                        backgroundColor: "#143c2d",
                        color: "white",
                        border: "none",
                        borderRadius: "12px",
                        fontWeight: 800,
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
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
