import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../services/api";
import { NAIRA_PER_UNIT } from "../utils/currency";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80";

const PROFILE_CSS = `
.p-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px 80px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #111827;
}
.p-title-row {
  margin-bottom: 28px;
}
.p-title-row h1 {
  font-family: var(--heading-font), sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: #1B4332;
  margin: 0 0 6px;
}
.p-breadcrumb {
  font-size: 13px;
  color: #9CA3AF;
  display: flex;
  gap: 6px;
  align-items: center;
}
.p-breadcrumb span.active {
  color: #1B4332;
  font-weight: 700;
}

/* Two panel layout */
.p-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 32px;
  align-items: flex-start;
}

/* Inner Sidebar card */
.p-sidebar-card {
  background-color: white;
  border: 1px solid #E5E7EB;
  border-radius: 20px;
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.02);
}
.p-tab-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #4B5563;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  font-family: var(--body-font), sans-serif;
}
.p-tab-btn:hover {
  background-color: #F9FAFB;
  color: #1B4332;
}
.p-tab-btn.active {
  background-color: rgba(46, 125, 50, 0.08);
  color: #2E7D32;
}

/* Main Content Panel */
.p-content-card {
  background-color: white;
  border: 1px solid #E5E7EB;
  border-radius: 24px;
  padding: 36px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}

/* Form Styles */
.p-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 24px;
}
.p-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.p-field.full-width {
  grid-column: 1 / -1;
}
.p-label {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
}
.p-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  font-size: 14px;
  outline: none;
  background-color: #ffffff;
  color: #111827;
  font-family: var(--body-font), sans-serif;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.p-input:focus {
  border-color: #2E7D32;
  box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.1);
}
.p-input::placeholder {
  color: #9CA3AF;
}

/* Avatar Upload section */
.p-avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}
.p-avatar-wrap {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  position: relative;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 14px rgba(0,0,0,0.1);
  background-color: #F3F4F6;
  flex-shrink: 0;
}
.p-avatar-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.p-avatar-camera {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  background-color: #2E7D32;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 2px solid white;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.p-upload-btn {
  background-color: #2E7D32;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--body-font), sans-serif;
  transition: background-color 0.2s;
}
.p-upload-btn:hover {
  background-color: #1B4332;
}
.p-delete-btn {
  background-color: #F3F4F6;
  color: #4B5563;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--body-font), sans-serif;
  transition: all 0.2s;
}
.p-delete-btn:hover {
  background-color: #E5E7EB;
}

/* Gender Selection cards */
.p-gender-wrap {
  display: flex;
  gap: 16px;
}
.p-gender-card {
  flex: 1;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  color: #4B5563;
  background-color: #ffffff;
  transition: all 0.2s;
}
.p-gender-card.active {
  border-color: #2E7D32;
  background-color: rgba(46, 125, 50, 0.04);
  color: #2E7D32;
}
.p-gender-card input {
  cursor: pointer;
}

/* Tel Prefix Input */
.p-tel-wrapper {
  display: flex;
  gap: 10px;
}
.p-tel-flag {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #E5E7EB;
  background-color: #F9FAFB;
  border-radius: 12px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  pointer-events: none;
}

/* Form Action Buttons */
.p-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
}
.p-save-btn {
  background-color: #F57C00;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 28px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--body-font), sans-serif;
  box-shadow: 0 4px 12px rgba(245,124,0,0.2);
  transition: all 0.2s;
}
.p-save-btn:hover {
  background-color: #E65100;
  box-shadow: 0 6px 16px rgba(245,124,0,0.3);
}

/* RESPONSIVE LAYOUT MEDIA QUERIES */
@media (max-width: 900px) {
  .p-layout {
    grid-template-columns: 1fr;
  }
  .p-sidebar-card {
    flex-direction: row;
    overflow-x: auto;
    padding: 12px;
  }
  .p-tab-btn {
    white-space: nowrap;
  }
}
@media (max-width: 600px) {
  .p-content-card {
    padding: 24px;
  }
  .p-form-grid {
    grid-template-columns: 1fr;
  }
  .p-avatar-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
}
`;

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, isLoggedIn, updateUser, refreshToken } = useAuth();
  const { addToCart } = useCart();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);

  // Wishlist — reads the same localStorage["favorites"] map ProductsPage.jsx
  // writes to, so this tab shows what the customer actually favorited
  // instead of two hardcoded products.
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favorites") || "{}");
    } catch {
      return {};
    }
  });
  const [allProducts, setAllProducts] = useState([]);

  useEffect(() => {
    api.get("/products").then((r) => setAllProducts(r.data.products || [])).catch(() => {});
  }, []);

  const wishlistProducts = allProducts.filter((p) => favorites[p.id]);

  // Returns & cancellations — both derive from the customer's own orders,
  // so a cancelled order shows up under "My Cancellations" without a
  // second endpoint.
  const [myOrders, setMyOrders] = useState([]);
  const [myReturns, setMyReturns] = useState([]);

  useEffect(() => {
    api.get("/orders").then((r) => setMyOrders(r.data.orders || [])).catch(() => {});
    api.get("/orders/returns").then((r) => setMyReturns(r.data.returns || [])).catch(() => {});
  }, []);

  const cancelledOrders = myOrders.filter((o) => o.status === "cancelled");

  const RETURN_STATUS_META = {
    submitted: { label: "Pending Review", color: "#F57C00", bg: "#FFF3E0" },
    pending:   { label: "Pending Review", color: "#F57C00", bg: "#FFF3E0" },
    approved:  { label: "Approved",       color: "#2E7D32", bg: "#E8F5E9" },
    rejected:  { label: "Rejected",       color: "#DC2626", bg: "#FEE2E2" },
  };

  const removeFromWishlist = (productId) => {
    setFavorites((prev) => {
      const updated = { ...prev, [productId]: false };
      localStorage.setItem("favorites", JSON.stringify(updated));
      return updated;
    });
  };

  // Avatar — sourced from the server (users.avatar_url), not localStorage.
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);

  // Profile fields — the server is the source of truth. Previously these
  // only ever lived in localStorage (a global key, not even tied to the
  // signed-in account), so a new browser, device, or cleared cache made
  // "Save Changes" look like it silently reverted. Every field here now
  // has a matching users table column and round-trips through the API.
  const [fields, setFields] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    gender: "Male", idNumber: "", taxId: "", taxCountry: "Nigeria", address: "",
  });

  // Sync from the authenticated user whenever it's (re)loaded — on mount,
  // and again after a fresh login, so the form always reflects what's
  // actually saved on the account rather than stale local state.
  useEffect(() => {
    if (!user) return;
    const [firstName = "", ...rest] = (user.name || "").trim().split(" ");
    setFields({
      firstName,
      lastName: rest.join(" "),
      email: user.email || "",
      phone: user.phone || "",
      gender: user.gender || "Male",
      idNumber: user.id_number || "",
      taxId: user.tax_id || "",
      taxCountry: user.tax_country || "Nigeria",
      address: user.address || "",
    });
    setAvatar(user.avatar_url || DEFAULT_AVATAR);
  }, [user]);

  if (!isLoggedIn) {
    return (
      <PageWrapper>
        <div style={{ maxWidth: "500px", margin: "80px auto", textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: "108", marginBottom: "20px" }}>🔐</div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px", fontFamily: "var(--heading-font)" }}>Please Sign In</h2>
          <p style={{ color: "#9CA3AF", marginBottom: "24px", fontFamily: "var(--body-font)" }}>You need to be logged in to view your profile settings</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={() => navigate("/login")}
              style={{
                backgroundColor: "#2E7D32",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "14px 28px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "15px",
                fontFamily: "var(--body-font)"
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/register")}
              style={{
                backgroundColor: "white",
                color: "#111827",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "14px 28px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "15px",
                fontFamily: "var(--body-font)"
              }}
            >
              Register
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const [avatarError, setAvatarError] = useState(null);
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarError(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      setAvatar(reader.result); // optimistic — reflect it immediately
      try {
        const res = await api.patch("/auth/avatar", { avatar_url: reader.result });
        updateUser(res.data.user);
      } catch (err) {
        setAvatar(user?.avatar_url || DEFAULT_AVATAR); // roll back on failure
        setAvatarError(err?.response?.data?.message || "Failed to save photo — try a smaller image");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = async () => {
    setAvatar(DEFAULT_AVATAR);
    setAvatarError(null);
    try {
      const res = await api.patch("/auth/avatar", { avatar_url: DEFAULT_AVATAR });
      updateUser(res.data.user);
    } catch (err) {
      setAvatar(user?.avatar_url || DEFAULT_AVATAR);
      setAvatarError(err?.response?.data?.message || "Failed to remove photo");
    }
  };

  const [saveError, setSaveError] = useState(null);
  const handleSaveFields = async () => {
    setSaveError(null);
    try {
      const res = await api.patch("/auth/profile", {
        name: `${fields.firstName} ${fields.lastName}`.trim(),
        email: fields.email,
        phone: fields.phone,
        gender: fields.gender,
        id_number: fields.idNumber,
        tax_id: fields.taxId,
        tax_country: fields.taxCountry,
        address: fields.address,
      });
      updateUser(res.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Failed to save changes");
    }
  };

  // Password change
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const handleChangePassword = async () => {
    setPasswordError(null);
    if (!passwordForm.current || !passwordForm.next) {
      setPasswordError("Fill in all password fields");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("New passwords do not match");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await api.post("/auth/change-password", {
        current_password: passwordForm.current,
        new_password: passwordForm.next,
      });
      // Changing the password invalidates every existing token (see
      // server/src/routes/auth.js) including the one this request used —
      // swap in the fresh one returned or the very next API call 403s.
      if (res.data?.token) refreshToken(res.data.token);
      setPasswordForm({ current: "", next: "", confirm: "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setPasswordError(err?.response?.data?.message || "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  // Address book
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState({ label: "", receiver_name: "", receiver_phone: "", street_address: "", city: "", state: "" });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressError, setAddressError] = useState(null);

  const loadAddresses = () => {
    api.get("/addresses").then((r) => setAddresses(r.data.addresses || [])).catch(() => {});
  };
  useEffect(() => { loadAddresses(); }, []);

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({ label: "", receiver_name: "", receiver_phone: "", street_address: "", city: "", state: "" });
    setAddressError(null);
    setAdding(true);
  };
  const openEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label || "", receiver_name: addr.receiver_name || "", receiver_phone: addr.receiver_phone || "",
      street_address: addr.street_address || "", city: addr.city || "", state: addr.state || "",
    });
    setAddressError(null);
    setAdding(true);
  };
  const saveAddress = async () => {
    if (!addressForm.street_address.trim()) {
      setAddressError("Street address is required");
      return;
    }
    try {
      if (editingAddressId) {
        await api.patch(`/addresses/${editingAddressId}`, addressForm);
      } else {
        await api.post("/addresses", addressForm);
      }
      setAdding(false);
      loadAddresses();
    } catch (err) {
      setAddressError(err?.response?.data?.message || "Failed to save address");
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

  const menuTabs = [
    { id: "profile", label: "Profile Settings", icon: "ri-user-line" },
    { id: "password", label: "Password Changes", icon: "ri-lock-line" },
    { id: "address", label: "Address Book", icon: "ri-map-pin-line" },
    { id: "payment", label: "Payment Options", icon: "ri-bank-card-line" },
    { id: "wishlist", label: "Saved Items (Wishlist)", icon: "ri-heart-line" },
    { id: "returns", label: "My Returns", icon: "ri-arrow-go-back-line" },
    { id: "cancellations", label: "My Cancellations", icon: "ri-close-circle-line" },
  ];

  return (
    <PageWrapper>
      <div className="p-container">
        <style>{PROFILE_CSS}</style>

        {/* Header Breadcrumbs */}
        <div className="p-title-row">
          <div className="p-breadcrumb">
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/home")}>Home</span>
            <span>/</span>
            <span className="active">Account Settings</span>
          </div>
          <h1 style={{ marginTop: "8px" }}>Account settings</h1>
        </div>

        {/* Two column grid */}
        <div className="p-layout">
          {/* Inner Sidebar tabs */}
          <div className="p-sidebar-card">
            {menuTabs.map((t) => (
              <button
                key={t.id}
                className={`p-tab-btn ${activeTab === t.id ? "active" : ""}`}
                onClick={() => { setActiveTab(t.id); setAdding(false); }}
              >
                <i className={t.icon} style={{ fontSize: "16px" }} />
                <span>{t.label}</span>
              </button>
            ))}

            <button
              className="p-tab-btn"
              onClick={() => { logout(); navigate("/login"); }}
              style={{ color: "#EF4444", marginTop: "12px", borderTop: "1px dashed #E5E7EB", paddingTop: "14px" }}
            >
              <i className="ri-logout-box-r-line" />
              <span>Logout</span>
            </button>
          </div>

          {/* Right Area content card */}
          <div className="p-content-card">
            <AnimatePresence mode="wait">
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="p-avatar-section">
                    <div className="p-avatar-wrap">
                      <img src={avatar} alt="User Profile Avatar" />
                      <div className="p-avatar-camera" onClick={() => fileInputRef.current?.click()}>
                        <i className="ri-camera-line" />
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarUpload}
                      accept="image/*"
                      style={{ display: "none" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button className="p-upload-btn" onClick={() => fileInputRef.current?.click()}>Upload New</button>
                        <button className="p-delete-btn" onClick={handleDeleteAvatar}>Delete avatar</button>
                      </div>
                      {avatarError && <p style={{ color: "#EF4444", fontSize: "13px", margin: 0 }}>{avatarError}</p>}
                    </div>
                  </div>

                  <div className="p-form-grid">
                    <div className="p-field">
                      <label className="p-label">First Name *</label>
                      <input
                        className="p-input"
                        value={fields.firstName}
                        onChange={(e) => setFields({ ...fields, firstName: e.target.value })}
                        placeholder="First name"
                      />
                    </div>
                    <div className="p-field">
                      <label className="p-label">Last Name *</label>
                      <input
                        className="p-input"
                        value={fields.lastName}
                        onChange={(e) => setFields({ ...fields, lastName: e.target.value })}
                        placeholder="Last name"
                      />
                    </div>

                    <div className="p-field">
                      <label className="p-label">Email</label>
                      <input
                        className="p-input"
                        type="email"
                        value={fields.email}
                        onChange={(e) => setFields({ ...fields, email: e.target.value })}
                        placeholder="examples@gmail.com"
                      />
                    </div>

                    <div className="p-field">
                      <label className="p-label">Mobile Number *</label>
                      <div className="p-tel-wrapper">
                        <div className="p-tel-flag">
                          <span>🇳🇬</span>
                          <span>+234</span>
                        </div>
                        <input
                          className="p-input"
                          value={fields.phone}
                          onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                          placeholder="806 123 7890"
                        />
                      </div>
                    </div>

                    <div className="p-field">
                      <label className="p-label">Gender</label>
                      <div className="p-gender-wrap">
                        <div
                          className={`p-gender-card ${fields.gender === "Male" ? "active" : ""}`}
                          onClick={() => setFields({ ...fields, gender: "Male" })}
                        >
                          <input
                            type="radio"
                            checked={fields.gender === "Male"}
                            onChange={() => setFields({ ...fields, gender: "Male" })}
                          />
                          <span>Male</span>
                        </div>
                        <div
                          className={`p-gender-card ${fields.gender === "Female" ? "active" : ""}`}
                          onClick={() => setFields({ ...fields, gender: "Female" })}
                        >
                          <input
                            type="radio"
                            checked={fields.gender === "Female"}
                            onChange={() => setFields({ ...fields, gender: "Female" })}
                          />
                          <span>Female</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-field">
                      <label className="p-label">ID</label>
                      <input
                        className="p-input"
                        value={fields.idNumber}
                        onChange={(e) => setFields({ ...fields, idNumber: e.target.value })}
                        placeholder="ID details"
                      />
                    </div>

                    <div className="p-field">
                      <label className="p-label">Tax Identification Number</label>
                      <input
                        className="p-input"
                        value={fields.taxId}
                        onChange={(e) => setFields({ ...fields, taxId: e.target.value })}
                        placeholder="Tax Identification Number"
                      />
                    </div>

                    <div className="p-field">
                      <label className="p-label">Tax Identification Country</label>
                      <div className="p-tel-wrapper">
                        <div className="p-tel-flag">
                          <span>🇳🇬</span>
                        </div>
                        <input
                          className="p-input"
                          value={fields.taxCountry}
                          onChange={(e) => setFields({ ...fields, taxCountry: e.target.value })}
                          placeholder="Tax Identification Country"
                        />
                      </div>
                    </div>

                    <div className="p-field full-width">
                      <label className="p-label">Residential Address</label>
                      <textarea
                        className="p-input"
                        style={{ height: "100px", resize: "vertical" }}
                        value={fields.address}
                        onChange={(e) => setFields({ ...fields, address: e.target.value })}
                        placeholder="Residential address"
                      />
                    </div>
                  </div>

                  {saveError && <p style={{ color: "#EF4444", fontSize: "13px", marginBottom: "8px" }}>{saveError}</p>}
                  <div className="p-actions">
                    <button className="p-save-btn" onClick={handleSaveFields}>
                      {saved ? "✓ Changes Saved!" : "Save Changes"}
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === "password" && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "var(--heading-font)" }}>Password Changes</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "480px" }}>
                    {passwordError && <p style={{ color: "#EF4444", fontSize: "13px", margin: 0 }}>{passwordError}</p>}
                    <div className="p-field">
                      <label className="p-label">Current Password</label>
                      <input className="p-input" type="password" placeholder="Current Password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} />
                    </div>
                    <div className="p-field">
                      <label className="p-label">New Password</label>
                      <input className="p-input" type="password" placeholder="New Password" value={passwordForm.next} onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })} />
                    </div>
                    <div className="p-field">
                      <label className="p-label">Confirm New Password</label>
                      <input className="p-input" type="password" placeholder="Confirm New Password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
                    </div>
                  </div>
                  <div className="p-actions">
                    <button className="p-save-btn" onClick={handleChangePassword} disabled={passwordSaving}>
                      {passwordSaving ? "Updating…" : saved ? "✓ Updated!" : "Update Password"}
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === "address" && (
                <motion.div
                  key="address"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "var(--heading-font)" }}>Address Book</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                    {addresses.map((addr) => (
                      <div key={addr.id} style={{ border: addr.is_default ? "2px solid #2E7D32" : "1px solid #E5E7EB", borderRadius: "16px", padding: "18px", position: "relative" }}>
                        {addr.is_default && <span style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#E8F5E9", color: "#2E7D32", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px" }}>Default</span>}
                        <p style={{ fontWeight: 700, marginBottom: "6px", fontSize: "14px" }}>{addr.label}</p>
                        <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "4px" }}>{addr.street_address}{addr.city ? `, ${addr.city}` : ""}{addr.state ? `, ${addr.state}` : ""}</p>
                        <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "16px" }}>🇳🇬 {addr.receiver_phone || "—"}</p>
                        <div style={{ display: "flex", gap: "12px" }}>
                          <button onClick={() => openEditAddress(addr)} style={{ color: "#F57C00", border: "none", background: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>Edit</button>
                          <button onClick={() => deleteAddress(addr.id)} style={{ color: "#EF4444", border: "none", background: "none", cursor: "pointer", fontWeight: 500, fontSize: "13px" }}>Delete</button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={openAddAddress}
                      style={{
                        border: "2px dashed #E5E7EB",
                        borderRadius: "16px",
                        padding: "24px",
                        cursor: "pointer",
                        backgroundColor: "transparent",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        color: "#9CA3AF"
                      }}
                    >
                      <span style={{ fontSize: "28px" }}>+</span>
                      <span style={{ fontSize: "13px", fontWeight: 700 }}>Add New Address</span>
                    </button>
                  </div>

                  {adding && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ border: "1px solid #E5E7EB", borderRadius: "16px", padding: "24px", backgroundColor: "#F9FAFB" }}>
                      <h4 style={{ fontWeight: 700, marginBottom: "18px", fontSize: "15px" }}>{editingAddressId ? "Edit Address" : "Add New Address"}</h4>
                      {addressError && <p style={{ color: "#EF4444", fontSize: "13px", marginBottom: "12px" }}>{addressError}</p>}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                        <input className="p-input" placeholder="Label (e.g. Office, Parent's house)" value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} />
                        <input className="p-input" placeholder="Receiver's Full Name" value={addressForm.receiver_name} onChange={(e) => setAddressForm({ ...addressForm, receiver_name: e.target.value })} />
                        <input className="p-input" placeholder="Receiver's Phone Number" value={addressForm.receiver_phone} onChange={(e) => setAddressForm({ ...addressForm, receiver_phone: e.target.value })} />
                        <input className="p-input" placeholder="Street Address" value={addressForm.street_address} onChange={(e) => setAddressForm({ ...addressForm, street_address: e.target.value })} />
                        <input className="p-input" placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
                        <input className="p-input" placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} />
                      </div>
                      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                        <button className="p-delete-btn" onClick={() => setAdding(false)}>Cancel</button>
                        <button className="p-upload-btn" onClick={saveAddress}>Save Address</button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {activeTab === "payment" && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "var(--heading-font)" }}>Payment Options</h3>
                  <div
                    style={{
                      border: "1px dashed #E5E7EB",
                      borderRadius: "16px",
                      padding: "32px 24px",
                      textAlign: "center",
                      color: "#6B7280",
                    }}
                  >
                    <div style={{ fontSize: "43", marginBottom: "10px" }}>💳</div>
                    <p style={{ fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>No saved cards</p>
                    <p style={{ fontSize: "13px", margin: 0 }}>
                      BemsFarms doesn't store your card details — you'll enter them
                      securely through Monnify each time you check out.
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === "wishlist" && (
                <motion.div
                  key="wishlist"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "var(--heading-font)" }}>My Wishlist</h3>
                  {wishlistProducts.length === 0 ? (
                    <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
                      No saved items yet. Tap the ♡ on any product to save it here.
                    </p>
                  ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "20px" }}>
                    {wishlistProducts.map((item) => (
                      <div key={item.id} style={{ border: "1px solid #E5E7EB", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <div style={{ position: "relative" }}>
                          <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "130px", objectFit: "cover" }} onClick={() => navigate(`/product/${item.id}`)} />
                          <button
                            onClick={() => removeFromWishlist(item.id)}
                            title="Remove from wishlist"
                            style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", border: "none", backgroundColor: "rgba(255,255,255,0.9)", color: "#EF4444", cursor: "pointer", fontSize: "14px" }}
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column" }}>
                          <p style={{ fontWeight: 700, fontSize: "14px", margin: "0 0 4px" }}>{item.name}</p>
                          <p style={{ color: "#2E7D32", fontWeight: 800, fontSize: "15px", margin: "0 0 14px" }}>₦{(item.price * NAIRA_PER_UNIT).toLocaleString()}</p>
                          <button
                            onClick={() => addToCart(item)}
                            style={{
                              width: "100%",
                              backgroundColor: "#F57C00",
                              color: "white",
                              border: "none",
                              borderRadius: "10px",
                              padding: "10px",
                              fontSize: "13px",
                              fontWeight: 700,
                              cursor: "pointer",
                              marginTop: "auto"
                            }}
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </motion.div>
              )}

              {activeTab === "returns" && (
                <motion.div
                  key="returns"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "var(--heading-font)" }}>My Returns</h3>
                  {myReturns.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
                      {myReturns.map((ret) => {
                        const meta = RETURN_STATUS_META[ret.status] || RETURN_STATUS_META.pending;
                        return (
                          <div key={ret.id} style={{ border: "1px solid #E5E7EB", borderRadius: "14px", padding: "16px 20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: "14px", margin: "0 0 2px" }}>Order #{ret.order_id}</p>
                                <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0 }}>
                                  {new Date(ret.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              </div>
                              <span style={{ background: meta.bg, color: meta.color, fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "50px" }}>
                                {meta.label}
                              </span>
                            </div>
                            <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 4px", textTransform: "capitalize" }}>
                              Reason: {ret.reason?.replace(/_/g, " ")}
                            </p>
                            {ret.items?.length > 0 && (
                              <p style={{ fontSize: "13px", color: "#4B5563", margin: 0 }}>
                                {ret.items.map((i) => `${i.product_name} (×${i.returned_quantity})`).join(", ")}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {myReturns.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: "56px", marginBottom: "16px" }}>↩️</div>
                    <h4 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700 }}>No Returns Yet</h4>
                    <p style={{ color: "#9CA3AF", fontSize: "14px", margin: "0 0 24px" }}>You can request a return within 7 days of delivery.</p>
                    <div style={{ backgroundColor: "#F4FDF4", border: "1px solid #D1E7DD", borderRadius: "14px", padding: "20px", textAlign: "left", maxWidth: "480px", margin: "0 auto" }}>
                      <p style={{ color: "#2E7D32", fontWeight: 700, margin: "0 0 12px" }}>Return Policy Details</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Returns accepted within 7 days of delivery</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Items must be in original packaging and condition</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Refund will be processed in 3-5 business days</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0" }}>✓ Contact info@bemsfarms.com for assistance</p>
                    </div>
                  </div>
                  )}
                </motion.div>
              )}

              {activeTab === "cancellations" && (
                <motion.div
                  key="cancellations"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "var(--heading-font)" }}>My Cancellations</h3>
                  {cancelledOrders.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
                      {cancelledOrders.map((order) => (
                        <div key={order.id} style={{ border: "1px solid #E5E7EB", borderRadius: "14px", padding: "16px 20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: "14px", margin: "0 0 2px" }}>Order #{order.id}</p>
                              <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0 }}>
                                Cancelled {order.cancelled_at ? new Date(order.cancelled_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : ""}
                              </p>
                            </div>
                            <span style={{ background: "#FEE2E2", color: "#DC2626", fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "50px" }}>
                              Cancelled
                            </span>
                          </div>
                          {order.cancel_reason && (
                            <p style={{ fontSize: "13px", color: "#4B5563", margin: 0 }}>Reason: {order.cancel_reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {cancelledOrders.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: "76", marginBottom: "16px" }}>❌</div>
                    <h4 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700 }}>No Cancelled Orders</h4>
                    <p style={{ color: "#9CA3AF", fontSize: "14px", margin: "0 0 24px" }}>Orders can be cancelled any time before they're prepared for delivery.</p>
                    <div style={{ backgroundColor: "#FFF8F2", border: "1px solid #FFE6D5", borderRadius: "14px", padding: "20px", textAlign: "left", maxWidth: "480px", margin: "0 auto" }}>
                      <p style={{ color: "#F57C00", fontWeight: 700, margin: "0 0 12px" }}>Cancellation Policy Details</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Cancel any time while the order is pending or confirmed</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Orders already prepared/dispatched cannot be cancelled</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Full refund for eligible cancellations</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0" }}>✓ Contact support immediately to cancel</p>
                    </div>
                  </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
