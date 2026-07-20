import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import PageWrapper from "../components/layout/PageWrapper";

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
  font-family: 'Syne', sans-serif;
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
  font-family: 'Nunito', sans-serif;
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
  font-family: 'Nunito', sans-serif;
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
  font-family: 'Nunito', sans-serif;
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
  font-family: 'Nunito', sans-serif;
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
  font-family: 'Nunito', sans-serif;
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
  const { user, logout, isLoggedIn } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);

  // Avatar state
  const [avatar, setAvatar] = useState(() => {
    return localStorage.getItem("user_avatar") || DEFAULT_AVATAR;
  });

  // Additional Profile Fields (Local Storage Persisted)
  const [fields, setFields] = useState(() => {
    try {
      const stored = localStorage.getItem("user_profile_fields");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return {
      firstName: user?.name?.split(" ")[0] || "",
      lastName: user?.name?.split(" ")[1] || "",
      email: user?.email || "",
      phone: user?.phone || "",
      gender: "Male",
      idNumber: "1559 000 7788 8DER",
      taxId: "",
      taxCountry: "Nigeria",
      address: user?.address || "",
    };
  });

  // Keep fields synced with auth user on mount
  useEffect(() => {
    if (user) {
      setFields((prev) => ({
        ...prev,
        firstName: prev.firstName || user.name?.split(" ")[0] || "",
        lastName: prev.lastName || user.name?.split(" ")[1] || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
        address: prev.address || user.address || "",
      }));
    }
  }, [user]);

  if (!isLoggedIn) {
    return (
      <PageWrapper>
        <div style={{ maxWidth: "500px", margin: "80px auto", textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: "80px", marginBottom: "20px" }}>🔐</div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px", fontFamily: "Syne, sans-serif" }}>Please Sign In</h2>
          <p style={{ color: "#9CA3AF", marginBottom: "24px", fontFamily: "Nunito, sans-serif" }}>You need to be logged in to view your profile settings</p>
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
                fontFamily: "Nunito, sans-serif"
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
                fontFamily: "Nunito, sans-serif"
              }}
            >
              Register
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
        localStorage.setItem("user_avatar", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveFields = () => {
    localStorage.setItem("user_profile_fields", JSON.stringify(fields));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button className="p-upload-btn" onClick={() => fileInputRef.current?.click()}>Upload New</button>
                      <button
                        className="p-delete-btn"
                        onClick={() => {
                          setAvatar(DEFAULT_AVATAR);
                          localStorage.removeItem("user_avatar");
                        }}
                      >
                        Delete avatar
                      </button>
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
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "Syne, sans-serif" }}>Password Changes</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "480px" }}>
                    <div className="p-field">
                      <label className="p-label">Current Password</label>
                      <input className="p-input" type="password" placeholder="Current Password" />
                    </div>
                    <div className="p-field">
                      <label className="p-label">New Password</label>
                      <input className="p-input" type="password" placeholder="New Password" />
                    </div>
                    <div className="p-field">
                      <label className="p-label">Confirm New Password</label>
                      <input className="p-input" type="password" placeholder="Confirm New Password" />
                    </div>
                  </div>
                  <div className="p-actions">
                    <button className="p-save-btn" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
                      {saved ? "✓ Updated!" : "Update Password"}
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
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "Syne, sans-serif" }}>Address Book</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                    <div style={{ border: "2px solid #2E7D32", borderRadius: "16px", padding: "18px", position: "relative" }}>
                      <span style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#E8F5E9", color: "#2E7D32", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px" }}>Default</span>
                      <p style={{ fontWeight: 700, marginBottom: "6px", fontSize: "14px" }}>Home Address</p>
                      <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "4px" }}>{fields.address || "15C West 42nd Street, Lagos"}</p>
                      <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "16px" }}>🇳🇬 {fields.phone || "+234 801 234 5678"}</p>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <button style={{ color: "#F57C00", border: "none", background: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>Edit</button>
                        <button style={{ color: "#EF4444", border: "none", background: "none", cursor: "pointer", fontWeight: 500, fontSize: "13px" }}>Delete</button>
                      </div>
                    </div>

                    <button
                      onClick={() => setAdding(true)}
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
                      <h4 style={{ fontWeight: 700, marginBottom: "18px", fontSize: "15px" }}>Add New Address</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                        <input className="p-input" placeholder="Label (e.g. Office, Parent's house)" />
                        <input className="p-input" placeholder="Receiver's Full Name" />
                        <input className="p-input" placeholder="Receiver's Phone Number" />
                        <input className="p-input" placeholder="Street Address" />
                        <input className="p-input" placeholder="City" />
                        <input className="p-input" placeholder="State" />
                      </div>
                      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                        <button className="p-delete-btn" onClick={() => setAdding(false)}>Cancel</button>
                        <button className="p-upload-btn" onClick={() => setAdding(false)}>Save Address</button>
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
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "Syne, sans-serif" }}>Payment Options</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
                    {[
                      { type: "Visa", last4: "5496", expiry: "09/27", default: true, bg: "#1A1F71" },
                      { type: "Mastercard", last4: "2341", expiry: "03/26", default: false, bg: "#EB001B" },
                    ].map((card, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "18px",
                          border: `2px solid ${card.default ? "#2E7D32" : "#E5E7EB"}`,
                          borderRadius: "16px",
                          backgroundColor: card.default ? "rgba(46, 125, 50, 0.02)" : "white"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <div style={{ width: "50px", height: "32px", borderRadius: "6px", backgroundColor: card.bg, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "9px", fontWeight: 900 }}>
                            {card.type.toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: "14px", margin: "0 0 2px" }}>•••• •••• •••• {card.last4}</p>
                            <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0 }}>Expires {card.expiry}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {card.default && <span style={{ fontSize: "12px", color: "#2E7D32", fontWeight: 700 }}>Default</span>}
                          <button style={{ color: "#F57C00", border: "none", background: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>Edit</button>
                          <button style={{ color: "#EF4444", border: "none", background: "none", cursor: "pointer", fontSize: "13px" }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="p-delete-btn" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>+</span>
                    <span>Add New Card</span>
                  </button>
                </motion.div>
              )}

              {activeTab === "wishlist" && (
                <motion.div
                  key="wishlist"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "Syne, sans-serif" }}>My Wishlist</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "20px" }}>
                    {[
                      { id: 10, name: "Dried Crayfish", price: 7500, img: "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141631/crayfish_bslwl4.jpg" },
                      { id: 2, name: "Palm Oil", price: 4800, img: "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141485/palm_oil_ufbfu6.jpg" },
                    ].map((item) => (
                      <div key={item.id} style={{ border: "1px solid #E5E7EB", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <img src={item.img} alt={item.name} style={{ width: "100%", height: "130px", objectFit: "cover" }} />
                        <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column" }}>
                          <p style={{ fontWeight: 700, fontSize: "14px", margin: "0 0 4px" }}>{item.name}</p>
                          <p style={{ color: "#2E7D32", fontWeight: 800, fontSize: "15px", margin: "0 0 14px" }}>₦{item.price.toLocaleString()}</p>
                          <button
                            onClick={() => navigate(`/product/${item.id}`)}
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
                </motion.div>
              )}

              {activeTab === "returns" && (
                <motion.div
                  key="returns"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "Syne, sans-serif" }}>My Returns</h3>
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: "56px", marginBottom: "16px" }}>↩️</div>
                    <h4 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700 }}>No Returns Yet</h4>
                    <p style={{ color: "#9CA3AF", fontSize: "14px", margin: "0 0 24px" }}>You can request a return within 7 days of delivery.</p>
                    <div style={{ backgroundColor: "#F4FDF4", border: "1px solid #D1E7DD", borderRadius: "14px", padding: "20px", textAlign: "left", maxWidth: "480px", margin: "0 auto" }}>
                      <p style={{ color: "#2E7D32", fontWeight: 700, margin: "0 0 12px" }}>Return Policy Details</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Returns accepted within 7 days of delivery</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Items must be in original packaging and condition</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Refund will be processed in 3-5 business days</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0" }}>✓ Contact support@bemsfarm.ng for assistance</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "cancellations" && (
                <motion.div
                  key="cancellations"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", fontFamily: "Syne, sans-serif" }}>My Cancellations</h3>
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: "56px", marginBottom: "16px" }}>❌</div>
                    <h4 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700 }}>No Cancelled Orders</h4>
                    <p style={{ color: "#9CA3AF", fontSize: "14px", margin: "0 0 24px" }}>Orders can be cancelled within 1 hour of placement.</p>
                    <div style={{ backgroundColor: "#FFF8F2", border: "1px solid #FFE6D5", borderRadius: "14px", padding: "20px", textAlign: "left", maxWidth: "480px", margin: "0 auto" }}>
                      <p style={{ color: "#F57C00", fontWeight: 700, margin: "0 0 12px" }}>Cancellation Policy Details</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Cancel within 1 hour of placing the order</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Orders already prepared/dispatched cannot be cancelled</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px" }}>✓ Full refund for eligible cancellations</p>
                      <p style={{ fontSize: "13px", color: "#4B5563", margin: "0" }}>✓ Contact support immediately to cancel</p>
                    </div>
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
