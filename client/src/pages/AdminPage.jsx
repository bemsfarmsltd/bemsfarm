import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import api from "../services/api";
import logoImg from "../assets/bemsfarms_logo.png";
import { NAIRA_PER_UNIT } from "../utils/currency";
const C = {
  sidebar: "#0F172A", // Dark navy (more modern than dark blue-purple)
  sidebarBorder: "rgba(255,255,255,0.07)",
  primary: "#40916C", // Medium green
  accent: "#F59E0B", // Amber
  danger: "#EF4444",
  text: "#111827",
  muted: "#9CA3AF",
  border: "#F3F4F6",
  bg: "#F8FAFC",
  white: "#FFFFFF",
};
const statusColors = {
  delivered: { bg: "#E8F5E9", color: "#2E7D32" },
  pending: { bg: "#FFF3E0", color: "#E65100" },
  confirmed: { bg: "#E3F2FD", color: "#1565C0" },
  cancelled: { bg: "#FFEBEE", color: "#C62828" },
};
const tabs = [
  { id: "overview", label: "Overview", emoji: "📊" },
  { id: "orders", label: "Orders", emoji: "📦" },
  { id: "products", label: "Products", emoji: "🌾" },
  { id: "customers", label: "Customers", emoji: "👥" },
  { id: "subscribers", label: "Subscribers", emoji: "📧" },
  { id: "returns", label: "Returns", emoji: "↩️" },
];
export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile, isTablet, isDesktop, isTabletAny, padding, gap, cols } =
    useResponsive();
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [editProduct, setEditProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [orderFilter, setOrderFilter] = useState("All");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [subscribers, setSubscribers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [customers, setCustomers] = useState([]);
  // Real stats state
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  // Image upload
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [addImagePreview, setAddImagePreview] = useState(null);
  const editImageRef = useRef(null);
  const addImageRef = useRef(null);
  // Add product form state
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    unit: "1kg",
    stock: "100",
    description: "",
    category_id: "1",
    is_featured: false,
  });
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [subscribersRes, returnsRes, customersRes] = await Promise.all([
          api.get("/admin/subscribers"),
          api.get("/admin/returns"),
          api.get("/admin/customers", { params: { limit: 100 } }),
        ]);
        if (!isMounted) return;
        setSubscribers(subscribersRes.data.subscribers || []);
        setReturns(returnsRes.data.returns || []);
        setCustomers(customersRes.data.customers || []);
      } catch (err) {
        console.error("Admin data fetch error:", err);
      }
    };
    fetchProducts();
    fetchStats();
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);
  const fetchProducts = () => {
    api
      .get("/products")
      .then((r) => setProducts(r.data.products))
      .catch(() => {});
  };
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data.stats);
      setRecentOrders(res.data.recentOrders || []);
      setTopProducts(res.data.topProducts || []);
    } catch (err) {
      // Fallback to mock data if endpoint not available
      setStats({
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        activeProducts: products.length,
      });
      setRecentOrders([]);
      setTopProducts([]);
    } finally {
      setStatsLoading(false);
    }
  };
  const handleSaveProduct = async () => {
    if (!editProduct) return;
    setSaving(true);
    try {
      const payload = {
        name: editProduct.name,
        price: editProduct.price * NAIRA_PER_UNIT,
        unit: editProduct.unit,
        description: editProduct.description || "",
        is_featured: editProduct.is_featured,
        image_url: editImagePreview || editProduct.image_url || "",
      };
      await api.put(`/admin/products/${editProduct.id}`, payload);
      // Update local state immediately
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editProduct.id
            ? {
                ...p,
                ...payload,
                price: payload.price / NAIRA_PER_UNIT,
                image_url: payload.image_url,
              }
            : p,
        ),
      );
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setEditProduct(null);
        setEditImagePreview(null);
      }, 1200);
    } catch (err) {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteProduct = async () => {
    if (!deleteProduct) return;
    try {
      await api.delete(`/admin/products/${deleteProduct.id}`);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      // Always remove from UI and refetch
      setProducts((prev) => prev.filter((p) => p.id !== deleteProduct.id));
      setDeleteProduct(null);
      // Refetch to confirm
      setTimeout(fetchProducts, 500);
    }
  };
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      alert("Please fill in at least name and price");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        image_url: addImagePreview || "",
      };
      const res = await api.post("/admin/products", payload);
      setProducts((prev) => [...prev, res.data.product]);
      setAddModal(false);
      setNewProduct({
        name: "",
        price: "",
        unit: "1kg",
        stock: "100",
        description: "",
        category_id: "1",
        is_featured: false,
      });
      setAddImagePreview(null);
    } catch (err) {
      alert("Failed to add product. Please check all fields.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, {
        status: newStatus,
        tracking_status: newStatus,
      });
      // Update both recentOrders and viewOrder state immediately so
      // the UI reflects the change without needing a manual refresh.
      setRecentOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus, tracking_status: newStatus }
            : o,
        ),
      );
      setViewOrder((prev) =>
        prev && prev.id === orderId ? { ...prev, status: newStatus } : prev,
      );
      console.log("✅ Order status updated:", orderId, "->", newStatus);
    } catch (err) {
      console.error("❌ Status update failed:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setEditImagePreview(reader.result);
    reader.readAsDataURL(file);
  };
  const handleAddImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAddImagePreview(reader.result);
    reader.readAsDataURL(file);
  };
  const statCards = stats
    ? [
        {
          label: "Total Revenue",
          // ── BUG FIX ──────────────────────────────────────────
          // All four fields below now use `?? 0` as a safety net.
          // The actual crash was caused by reading `stats.totalProducts`,
          // a key that never exists in the backend response (see the
          // last field for the real story) — but since `stats` itself
          // is a real object once set, *any* of these four could break
          // the same way if a backend field is ever renamed again.
          // `?? 0` means a missing field renders "0" instead of
          // throwing and white-screening the whole dashboard.
          value: `₦${(stats.totalRevenue ?? 0).toLocaleString()}`,
          change: "Live",
          icon: "💰",
          color: "#2E7D32",
        },
        {
          label: "Total Orders",
          value: (stats.totalOrders ?? 0).toLocaleString(),
          change: "Live",
          icon: "📦",
          color: "#1565C0",
        },
        {
          label: "Customers",
          value: (stats.totalCustomers ?? 0).toLocaleString(),
          change: "Live",
          icon: "👥",
          color: "#6A1B9A",
        },
        {
          label: "Products",
          // ── THE ACTUAL CRASH ──────────────────────────────────
          // server/src/controllers/adminController.js's getStats()
          // returns this field as `activeProducts` (count of products
          // with stock > 0) — there has never been a `totalProducts`
          // key in the response. Reading stats.totalProducts returned
          // `undefined`, and undefined.toLocaleString() threw
          // immediately on render, crashing to a white screen about
          // 1 second after the page loaded (the moment setStats()
          // landed and triggered this re-render with the real data).
          value: (stats.activeProducts ?? 0).toLocaleString(),
          change: "Live",
          icon: "🌾",
          color: "#E65100",
        },
      ]
    : [
        {
          label: "Total Revenue",
          value: "—",
          change: "Loading",
          icon: "💰",
          color: "#2E7D32",
        },
        {
          label: "Total Orders",
          value: "—",
          change: "Loading",
          icon: "📦",
          color: "#1565C0",
        },
        {
          label: "Customers",
          value: "—",
          change: "Loading",
          icon: "👥",
          color: "#6A1B9A",
        },
        {
          label: "Products",
          value: products.length.toString(),
          change: "Live",
          icon: "🌾",
          color: "#E65100",
        },
      ];
  const filteredOrders =
    orderFilter === "All"
      ? recentOrders
      : recentOrders.filter((o) => o.status === orderFilter.toLowerCase());
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: C.bg,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          style={{
            width: "240px",
            backgroundColor: C.sidebar,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            position: "sticky",
            top: 0,
            height: "100vh",
            overflow: "auto",
          }}
        >
          {/* Logo Div*/}
          <div
            style={{
              padding: "20px 16px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Logo using just text + icon since the PNG has bg issues on dark */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #40916C, #52B788)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  boxShadow: "0 4px 12px rgba(64,145,108,0.4)",
                  flexShrink: 0,
                }}
              >
                🌿
              </div>
              <div>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "white",
                    fontFamily: "Syne, sans-serif",
                    letterSpacing: "-0.3px",
                  }}
                >
                  Bems<span style={{ color: "#52B788" }}>Farms</span>
                </span>
                <p
                  style={{
                    fontSize: "9px",
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    marginTop: "1px",
                  }}
                >
                  Admin Dashboard
                </p>
              </div>
            </div>
          </div>
          <nav style={{ padding: "16px 12px", flex: 1 }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                // Replace the tab button styles in the sidebar:
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  backgroundColor:
                    activeTab === tab.id
                      ? "rgba(64,145,108,0.2)"
                      : "transparent",
                  color:
                    activeTab === tab.id ? "#52B788" : "rgba(255,255,255,0.55)",
                  marginBottom: "2px",
                  transition: "all 0.15s",
                  borderLeft:
                    activeTab === tab.id
                      ? "3px solid #52B788"
                      : "3px solid transparent",
                }}
              >
                <span style={{ fontSize: "18px" }}>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                marginTop: "16px",
                paddingTop: "16px",
              }}
            >
              <button
                onClick={() => navigate("/home")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.5)",
                  backgroundColor: "transparent",
                }}
              >
                <span>🏠</span> Back to Store
              </button>
            </div>
          </nav>
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: C.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "white",
                fontSize: "14px",
              }}
            >
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "white",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.name || "Admin"}
              </p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                Administrator
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Main Area */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          paddingBottom: isMobile ? "80px" : 0,
        }}
      >
        {/* Top Bar */}
        <div
          style={{
            backgroundColor: "white",
            padding: "16px 24px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 100,
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: C.text,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>{tabs.find((t) => t.id === activeTab)?.emoji}</span>
              {tabs.find((t) => t.id === activeTab)?.label}
            </h1>
            <p style={{ fontSize: "12px", color: C.muted }}>
              {new Date().toLocaleDateString("en-NG", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={fetchStats}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                border: `1px solid ${C.border}`,
                backgroundColor: "white",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                color: C.muted,
              }}
            >
              🔄 Refresh
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setAddModal(true)}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                backgroundColor: C.primary,
                color: "white",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "14px",
                whiteSpace: "nowrap",
              }}
            >
              + Add Product
            </motion.button>
          </div>
        </div>
        <div style={{ padding: "24px" }}>
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              {/* Real Stats Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`,
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                {statCards.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "16px",
                      padding: "20px",
                      border: `1px solid ${C.border}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "12px",
                          backgroundColor: `${s.color}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px",
                        }}
                      >
                        {s.icon}
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: s.change === "Loading" ? C.muted : "#2E7D32",
                          backgroundColor:
                            s.change === "Loading" ? C.bg : "#E8F5E9",
                          padding: "2px 7px",
                          borderRadius: "20px",
                        }}
                      >
                        {s.change === "Live" ? "🟢 Live" : s.change}
                      </span>
                    </div>
                    {statsLoading ? (
                      <motion.div
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        style={{
                          height: "28px",
                          backgroundColor: C.bg,
                          borderRadius: "6px",
                          marginBottom: "8px",
                        }}
                      />
                    ) : (
                      <p
                        style={{
                          fontSize: isMobile ? "18px" : "24px",
                          fontWeight: 900,
                          color: C.text,
                          marginBottom: "4px",
                        }}
                      >
                        {s.value}
                      </p>
                    )}
                    <p style={{ fontSize: "12px", color: C.muted }}>
                      {s.label}
                    </p>
                  </motion.div>
                ))}
              </div>
              {/* Charts */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "24px",
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          marginBottom: "2px",
                        }}
                      >
                        Revenue Overview
                      </h3>
                      <p style={{ fontSize: "12px", color: C.muted }}>
                        Based on actual orders
                      </p>
                    </div>
                    <select
                      style={{
                        padding: "6px 12px",
                        border: `1px solid ${C.border}`,
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    >
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                    </select>
                  </div>
                  {statsLoading ? (
                    <div
                      style={{
                        height: "140px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <p style={{ color: C.muted, fontSize: "14px" }}>
                        Loading chart data...
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-end",
                        height: "140px",
                      }}
                    >
                      {[65, 40, 80, 55, 90, 70, 85].map((h, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${h * 1.2}px` }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            style={{
                              width: "100%",
                              backgroundColor: i === 6 ? C.primary : "#E8F5E9",
                              borderRadius: "6px 6px 0 0",
                            }}
                          />
                          <p style={{ fontSize: "11px", color: C.muted }}>
                            {["M", "T", "W", "T", "F", "S", "S"][i]}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "24px",
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "18px",
                    }}
                  >
                    <h3 style={{ fontSize: "16px", fontWeight: 700 }}>
                      Top Products
                    </h3>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#2E7D32",
                        backgroundColor: "#E8F5E9",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        fontWeight: 600,
                      }}
                    >
                      🟢 Live
                    </span>
                  </div>
                  {statsLoading
                    ? [...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.4, 0.8, 0.4] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                          style={{
                            height: "32px",
                            backgroundColor: C.bg,
                            borderRadius: "6px",
                            marginBottom: "10px",
                          }}
                        />
                      ))
                    : topProducts.length > 0
                      ? topProducts.map((p, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              marginBottom: "14px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                color: C.muted,
                                fontWeight: 700,
                                minWidth: "16px",
                              }}
                            >
                              {i + 1}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: C.text,
                                  marginBottom: "4px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {p.name}
                              </p>
                              <div
                                style={{
                                  height: "4px",
                                  backgroundColor: "#F1F3F4",
                                  borderRadius: "2px",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${Math.max(15, 90 - i * 15)}%`,
                                    backgroundColor: C.primary,
                                    borderRadius: "2px",
                                  }}
                                />
                              </div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <p
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  color: C.primary,
                                }}
                              >
                                ₦{((p.price ?? 0) * NAIRA_PER_UNIT).toLocaleString()}
                              </p>
                              <p style={{ fontSize: "10px", color: C.muted }}>
                                {p.total_sold || 0} sold
                              </p>
                            </div>
                          </div>
                        ))
                      : /* Fallback to all products if no orders yet */
                        products.slice(0, 5).map((p, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              marginBottom: "14px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                color: C.muted,
                                fontWeight: 700,
                                minWidth: "16px",
                              }}
                            >
                              {i + 1}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: C.text,
                                  marginBottom: "4px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {p.name}
                              </p>
                              <div
                                style={{
                                  height: "4px",
                                  backgroundColor: "#F1F3F4",
                                  borderRadius: "2px",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${90 - i * 15}%`,
                                    backgroundColor: C.primary,
                                    borderRadius: "2px",
                                  }}
                                />
                              </div>
                            </div>
                            <p
                              style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: C.primary,
                                flexShrink: 0,
                              }}
                            >
                              ₦{((p.price ?? 0) * NAIRA_PER_UNIT).toLocaleString()}
                            </p>
                          </div>
                        ))}
                </div>
              </div>
              {/* Recent Orders — Real Data */}
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  border: `1px solid ${C.border}`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700 }}>
                      Recent Orders
                    </h3>
                    <p style={{ fontSize: "12px", color: C.muted }}>
                      Live from database
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("orders")}
                    style={{
                      fontSize: "13px",
                      color: C.accent,
                      fontWeight: 600,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    View All →
                  </button>
                </div>
                {statsLoading ? (
                  <div
                    style={{
                      padding: "24px",
                      textAlign: "center",
                      color: C.muted,
                    }}
                  >
                    Loading orders...
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                      📭
                    </div>
                    <p style={{ color: C.muted, fontSize: "15px" }}>
                      No orders yet
                    </p>
                    <p
                      style={{
                        color: C.muted,
                        fontSize: "13px",
                        marginTop: "4px",
                      }}
                    >
                      Orders will appear here when customers place them
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "500px",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: C.bg }}>
                          {[
                            "Order ID",
                            "Customer",
                            "Date",
                            "Amount",
                            "Status",
                            "Action",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "12px 16px",
                                textAlign: "left",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: C.muted,
                                letterSpacing: "0.5px",
                                textTransform: "uppercase",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order, i) => {
                          const s =
                            statusColors[order.status] || statusColors.pending;
                          return (
                            <tr
                              key={order.id}
                              style={{ borderBottom: "1px solid #F5F5F5" }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor = C.bg)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                              }
                            >
                              <td
                                style={{
                                  padding: "14px 16px",
                                  fontSize: "14px",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                #{order.id}
                              </td>
                              <td
                                style={{
                                  padding: "14px 16px",
                                  fontSize: "14px",
                                  color: "#5F6368",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {order.customer}
                              </td>
                              <td
                                style={{
                                  padding: "14px 16px",
                                  fontSize: "13px",
                                  color: C.muted,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {new Date(order.date).toLocaleDateString()}
                              </td>
                              <td
                                style={{
                                  padding: "14px 16px",
                                  fontSize: "14px",
                                  fontWeight: 700,
                                  color: C.primary,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                ₦
                                {parseFloat(order.amount ?? 0).toLocaleString()}
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                <span
                                  style={{
                                    backgroundColor: s.bg,
                                    color: s.color,
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    textTransform: "capitalize",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setViewOrder(order)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    border: `1px solid ${C.border}`,
                                    backgroundColor: "white",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    color: "#5F6368",
                                  }}
                                >
                                  View
                                </motion.button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ORDERS TAB */}
          {activeTab === "orders" && (
            <div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                }}
              >
                {["All", "Pending", "Confirmed", "Delivered", "Cancelled"].map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => setOrderFilter(s)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: `1px solid ${s === orderFilter ? C.primary : C.border}`,
                        backgroundColor:
                          s === orderFilter ? C.primary : "white",
                        color: s === orderFilter ? "white" : C.muted,
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {s}
                    </button>
                  ),
                )}
              </div>
              {recentOrders.length === 0 ? (
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    border: `1px solid ${C.border}`,
                    padding: "60px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "64px", marginBottom: "16px" }}>
                    📭
                  </div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      marginBottom: "8px",
                    }}
                  >
                    No orders yet
                  </h3>
                  <p style={{ color: C.muted }}>
                    Orders from customers will appear here
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    border: `1px solid ${C.border}`,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "500px",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: C.bg }}>
                          {[
                            "Order ID",
                            "Customer",
                            "Date",
                            "Amount",
                            "Status",
                            "Action",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "12px 16px",
                                textAlign: "left",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: C.muted,
                                letterSpacing: "0.5px",
                                textTransform: "uppercase",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order, i) => {
                          const s =
                            statusColors[order.status] || statusColors.pending;
                          return (
                            <tr
                              key={order.id}
                              style={{ borderBottom: "1px solid #F5F5F5" }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor = C.bg)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                              }
                            >
                              <td
                                style={{
                                  padding: "14px 16px",
                                  fontSize: "14px",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                #{order.id}
                              </td>
                              <td
                                style={{
                                  padding: "14px 16px",
                                  fontSize: "14px",
                                  color: "#5F6368",
                                }}
                              >
                                {order.customer}
                              </td>
                              <td
                                style={{
                                  padding: "14px 16px",
                                  fontSize: "13px",
                                  color: C.muted,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {new Date(order.date).toLocaleDateString()}
                              </td>
                              <td
                                style={{
                                  padding: "14px 16px",
                                  fontSize: "14px",
                                  fontWeight: 700,
                                  color: C.primary,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                ₦
                                {parseFloat(order.amount ?? 0).toLocaleString()}
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                <span
                                  style={{
                                    backgroundColor: s.bg,
                                    color: s.color,
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    textTransform: "capitalize",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setViewOrder(order)}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "8px",
                                      border: `1px solid ${C.border}`,
                                      backgroundColor: "white",
                                      cursor: "pointer",
                                      fontSize: "13px",
                                      color: "#5F6368",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    View
                                  </motion.button>
                                  <select
                                    value={order.status}
                                    onChange={(e) =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        e.target.value,
                                      )
                                    }
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: "8px",
                                      border: `1px solid ${C.border}`,
                                      fontSize: "12px",
                                      outline: "none",
                                      cursor: "pointer",
                                      color: "#5F6368",
                                    }}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="being_packed">
                                      Being Packed
                                    </option>
                                    <option value="out_for_delivery">
                                      Out for Delivery
                                    </option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* PRODUCTS TAB */}
          {activeTab === "products" && (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                border: `1px solid ${C.border}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: `1px solid ${C.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <h3 style={{ fontSize: "16px", fontWeight: 700 }}>
                  All Products ({products.length})
                </h3>
                <input
                  placeholder="Search products..."
                  style={{
                    padding: "8px 14px",
                    border: `1px solid ${C.border}`,
                    borderRadius: "10px",
                    fontSize: "14px",
                    outline: "none",
                    width: "200px",
                  }}
                />
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "600px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: C.bg }}>
                      {[
                        "Product",
                        "Category",
                        "Price",
                        "Stock",
                        "⭐",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: C.muted,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        style={{ borderBottom: "1px solid #F5F5F5" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = C.bg)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <div
                              style={{
                                width: "44px",
                                height: "44px",
                                borderRadius: "10px",
                                overflow: "hidden",
                                flexShrink: 0,
                                border: `1px solid ${C.border}`,
                              }}
                            >
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.parentNode.innerHTML = `<div style="width:100%;height:100%;background:#F1F8F1;display:flex;align-items:center;justify-content:center;font-size:20px">${getEmoji(p.name)}</div>`;
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    backgroundColor: "#F1F8F1",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "20px",
                                  }}
                                >
                                  {getEmoji(p.name)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p
                                style={{
                                  fontWeight: 600,
                                  fontSize: "14px",
                                  color: C.text,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {p.name}
                              </p>
                              <p style={{ fontSize: "12px", color: C.muted }}>
                                {p.unit}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontSize: "13px",
                            color: C.muted,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.category_name}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: C.primary,
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₦{((p.price ?? 0) * NAIRA_PER_UNIT).toLocaleString()}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              backgroundColor: "#E8F5E9",
                              color: C.primary,
                              fontSize: "12px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: "20px",
                            }}
                          >
                            {p.stock || 100}
                          </span>
                        </td>
                        <td
                          style={{ padding: "14px 16px", textAlign: "center" }}
                        >
                          <span style={{ fontSize: "18px" }}>
                            {p.is_featured ? "⭐" : "—"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                setEditProduct(p);
                                setEditImagePreview(p.image_url || null);
                              }}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: `1px solid ${C.border}`,
                                backgroundColor: "white",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: 600,
                                color: C.accent,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Edit
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setDeleteProduct(p)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "none",
                                backgroundColor: "#FFEBEE",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#C62828",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Delete
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* CUSTOMERS TAB */}
          {activeTab === "customers" && (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                border: `1px solid ${C.border}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <h3 style={{ fontSize: "16px", fontWeight: 700 }}>
                  Customer Management
                </h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "500px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: C.bg }}>
                      {[
                        "Customer",
                        "Email",
                        "Orders",
                        "Total Spent",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: C.muted,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => (
                      <tr
                        key={c.id}
                        style={{ borderBottom: "1px solid #F5F5F5" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = C.bg)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                backgroundColor: C.accent,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: 700,
                                fontSize: "14px",
                                flexShrink: 0,
                              }}
                            >
                              {(c.name || "?")[0]}
                            </div>
                            <p
                              style={{
                                fontWeight: 600,
                                fontSize: "14px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.name}
                            </p>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontSize: "13px",
                            color: C.muted,
                          }}
                        >
                          {c.email}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontSize: "14px",
                            fontWeight: 600,
                            textAlign: "center",
                          }}
                        >
                          {c.total_orders || 0}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: C.primary,
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₦{(Number(c.total_spent) || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              backgroundColor: c.status === "active" ? "#E8F5E9" : "#F5F5F5",
                              color: c.status === "active" ? C.primary : C.muted,
                              fontSize: "12px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: "20px",
                            }}
                          >
                            {c.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setViewCustomer(c)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "8px",
                              border: `1px solid ${C.border}`,
                              backgroundColor: "white",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#5F6368",
                            }}
                          >
                            View
                          </motion.button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* SUBSCRIBERS TAB */}
      {activeTab === "subscribers" && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            border: `1px solid ${C.border}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700 }}>
                Email Subscribers
              </h3>
              <p style={{ fontSize: "12px", color: C.muted }}>
                {subscribers.length} total subscribers
              </p>
            </div>
            <div
              style={{
                backgroundColor: "#D1FAE5",
                color: "#065F46",
                padding: "4px 12px",
                borderRadius: "50px",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {subscribers.filter((s) => s.is_active).length} active
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "400px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: C.bg }}>
                  {["Email", "Subscribed", "Code", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: C.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{ borderBottom: "1px solid #F5F5F5" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = C.bg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "14px",
                        color: C.text,
                      }}
                    >
                      {s.email}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: C.muted,
                      }}
                    >
                      {new Date(s.subscribed_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <code
                        style={{
                          backgroundColor: "#FEF3C7",
                          color: "#92400E",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {s.discount_code}
                      </code>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          backgroundColor: s.is_active ? "#D1FAE5" : "#F5F5F5",
                          color: s.is_active ? "#065F46" : C.muted,
                          fontSize: "12px",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: "50px",
                        }}
                      >
                        {s.is_active ? "● Active" : "○ Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/*RETURNS TAB */}
      {activeTab === "returns" && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            border: `1px solid ${C.border}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700 }}>
              Return Requests
            </h3>
          </div>
          {returns.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "60px", color: C.muted }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>↩️</div>
              <p>No return requests yet</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "600px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: C.bg }}>
                    {[
                      "Customer",
                      "Product",
                      "Reason",
                      "Date",
                      "Status",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: C.muted,
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r) => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: "1px solid #F5F5F5" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = C.bg)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                        {r.customer_name}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: C.muted,
                        }}
                      >
                        {r.product_name}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: C.muted,
                        }}
                      >
                        {r.reason.replace(/_/g, " ")}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "12px",
                          color: C.muted,
                        }}
                      >
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            backgroundColor:
                              r.status === "submitted"
                                ? "#FEF3C7"
                                : r.status === "approved"
                                  ? "#D1FAE5"
                                  : "#FEE2E2",
                            color:
                              r.status === "submitted"
                                ? "#92400E"
                                : r.status === "approved"
                                  ? "#065F46"
                                  : "#991B1B",
                            fontSize: "12px",
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: "50px",
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <select
                          defaultValue={r.status}
                          onChange={async (e) => {
                            await api.patch(`/admin/returns/${r.id}`, {
                              status: e.target.value,
                            });
                            api
                              .get("/admin/returns")
                              .then((res) =>
                                setReturns(res.data.returns || []),
                              );
                          }}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "8px",
                            border: `1px solid ${C.border}`,
                            fontSize: "12px",
                            cursor: "pointer",
                            outline: "none",
                          }}
                        >
                          <option value="submitted">Submitted</option>
                          <option value="approved">Approve</option>
                          <option value="rejected">Reject</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Mobile Bottom Tab Bar */}
      {isMobile && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: C.sidebar,
            display: "flex",
            zIndex: 200,
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "10px 4px",
                border: "none",
                background: "none",
                cursor: "pointer",
                color:
                  activeTab === tab.id ? "#4CAF50" : "rgba(255,255,255,0.5)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span style={{ fontSize: "20px" }}>{tab.emoji}</span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: activeTab === tab.id ? 700 : 400,
                }}
              >
                {tab.label}
              </span>
            </button>
          ))}
          <button
            onClick={() => navigate("/home")}
            style={{
              flex: 1,
              padding: "10px 4px",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <span style={{ fontSize: "20px" }}>🏠</span>
            <span style={{ fontSize: "10px" }}>Store</span>
          </button>
        </div>
      )}
      {/* ── MODALS ── */}
      {/* Edit Product Modal */}
      <AnimatePresence>
        {editProduct && (
          <Modal
            onClose={() => {
              setEditProduct(null);
              setEditImagePreview(null);
            }}
            title="Edit Product"
          >
            {/* Image Upload */}
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  fontSize: "13px",
                  color: C.muted,
                  marginBottom: "8px",
                  display: "block",
                }}
              >
                Product Image
              </label>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "160px",
                  borderRadius: "14px",
                  overflow: "hidden",
                  border: `2px dashed ${editImagePreview ? C.primary : C.border}`,
                  backgroundColor: "#F8F9FA",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onClick={() => editImageRef.current?.click()}
              >
                {editImagePreview ? (
                  <>
                    <img
                      src={editImagePreview}
                      alt="Preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(0,0,0,0.4)";
                        e.currentTarget.querySelector("span").style.opacity =
                          "1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(0,0,0,0)";
                        e.currentTarget.querySelector("span").style.opacity =
                          "0";
                      }}
                    >
                      <span
                        style={{
                          color: "white",
                          fontWeight: 700,
                          fontSize: "14px",
                          opacity: 0,
                          transition: "opacity 0.2s",
                          backgroundColor: "rgba(0,0,0,0.5)",
                          padding: "8px 16px",
                          borderRadius: "8px",
                        }}
                      >
                        📷 Change Photo
                      </span>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "36px" }}>📷</span>
                    <p
                      style={{
                        fontSize: "14px",
                        color: C.muted,
                        fontWeight: 600,
                      }}
                    >
                      Click to upload image
                    </p>
                    <p style={{ fontSize: "12px", color: "#C4C4C4" }}>
                      PNG, JPG, WebP — max 5MB
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={editImageRef}
                type="file"
                accept="image/*"
                onChange={handleEditImageUpload}
                style={{ display: "none" }}
              />
              {editImagePreview && (
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button
                    onClick={() => editImageRef.current?.click()}
                    style={{
                      fontSize: "12px",
                      color: C.accent,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Change image
                  </button>
                  <span style={{ color: C.border }}>|</span>
                  <button
                    onClick={() => setEditImagePreview(null)}
                    style={{
                      fontSize: "12px",
                      color: "#C62828",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>
            {/* Fields */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginBottom: "20px",
              }}
            >
              {[
                { label: "Product Name", key: "name", type: "text" },
                {
                  label: "Price (₦)",
                  key: "displayPrice",
                  type: "number",
                  value: Math.round((editProduct.price ?? 0) * NAIRA_PER_UNIT),
                },
                { label: "Unit", key: "unit", type: "text" },
                { label: "Stock", key: "stock", type: "number" },
              ].map((f) => (
                <div key={f.key}>
                  <label
                    style={{
                      fontSize: "13px",
                      color: C.muted,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    defaultValue={
                      f.value !== undefined ? f.value : editProduct[f.key] || ""
                    }
                    onChange={(e) => {
                      if (f.key === "displayPrice") {
                        setEditProduct((prev) => ({
                          ...prev,
                          price: parseFloat(e.target.value) / NAIRA_PER_UNIT || 0,
                        }));
                      } else {
                        setEditProduct((prev) => ({
                          ...prev,
                          [f.key]: e.target.value,
                        }));
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: `1px solid ${C.border}`,
                      borderRadius: "10px",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = C.primary)}
                    onBlur={(e) => (e.target.style.borderColor = C.border)}
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: C.muted,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Description
                </label>
                <textarea
                  defaultValue={editProduct.description || ""}
                  rows={3}
                  onChange={(e) =>
                    setEditProduct((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: `1px solid ${C.border}`,
                    borderRadius: "10px",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "Inter, sans-serif",
                  }}
                />
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                <input
                  type="checkbox"
                  defaultChecked={editProduct.is_featured}
                  onChange={(e) =>
                    setEditProduct((prev) => ({
                      ...prev,
                      is_featured: e.target.checked,
                    }))
                  }
                  style={{
                    width: "18px",
                    height: "18px",
                    accentColor: C.accent,
                  }}
                />
                Featured Product (shows ⭐ badge)
              </label>
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setEditProduct(null);
                  setEditImagePreview(null);
                }}
                style={{
                  padding: "10px 20px",
                  border: `1px solid ${C.border}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "14px",
                  backgroundColor: "white",
                }}
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSaveProduct}
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  border: "none",
                  borderRadius: "10px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: 700,
                  backgroundColor: saveSuccess ? C.primary : C.accent,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background-color 0.3s",
                }}
              >
                {saving ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      ⏳
                    </motion.span>{" "}
                    Saving...
                  </>
                ) : saveSuccess ? (
                  "✓ Saved!"
                ) : (
                  "Save Changes"
                )}
              </motion.button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
      {/* Delete Modal */}
      <AnimatePresence>
        {deleteProduct && (
          <Modal onClose={() => setDeleteProduct(null)} title="">
            <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
              <div style={{ fontSize: "52px", marginBottom: "14px" }}>⚠️</div>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Delete Product?
              </h3>
              <p
                style={{
                  color: C.muted,
                  marginBottom: "24px",
                  fontSize: "14px",
                }}
              >
                Are you sure you want to delete{" "}
                <strong>{deleteProduct.name}</strong>?<br />
                This action cannot be undone.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => setDeleteProduct(null)}
                  style={{
                    padding: "12px 24px",
                    border: `1px solid ${C.border}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "14px",
                    backgroundColor: "white",
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDeleteProduct}
                  style={{
                    padding: "12px 24px",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                    backgroundColor: "#C62828",
                    color: "white",
                  }}
                >
                  Delete
                </motion.button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
      {/* View Order Modal */}
      <AnimatePresence>
        {viewOrder && (
          <Modal
            onClose={() => setViewOrder(null)}
            title={`Order #${viewOrder.id}`}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              {[
                { label: "Customer", value: viewOrder.customer },
                {
                  label: "Date",
                  value: new Date(viewOrder.date).toLocaleDateString(),
                },
                {
                  label: "Amount",
                  value: `₦${parseFloat(viewOrder.amount ?? 0).toLocaleString()}`,
                  green: true,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    backgroundColor: C.bg,
                    borderRadius: "10px",
                  }}
                >
                  <span style={{ color: C.muted, fontSize: "14px" }}>
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "14px",
                      color: row.green ? C.primary : C.text,
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  backgroundColor: C.bg,
                  borderRadius: "10px",
                  alignItems: "center",
                }}
              >
                <span style={{ color: C.muted, fontSize: "14px" }}>Status</span>
                <span
                  style={{
                    backgroundColor: (
                      statusColors[viewOrder.status] || statusColors.pending
                    ).bg,
                    color: (
                      statusColors[viewOrder.status] || statusColors.pending
                    ).color,
                    fontSize: "13px",
                    fontWeight: 600,
                    padding: "4px 14px",
                    borderRadius: "20px",
                    textTransform: "capitalize",
                  }}
                >
                  {viewOrder.status}
                </span>
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: C.muted,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Update Status
                </label>
                <select
                  value={viewOrder.status}
                  onChange={(e) =>
                    handleUpdateOrderStatus(viewOrder.id, e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: `1px solid ${C.border}`,
                    borderRadius: "10px",
                    fontSize: "14px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="being_packed">Being Packed</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setViewOrder(null)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: C.primary,
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              Close
            </motion.button>
          </Modal>
        )}
      </AnimatePresence>
      {/* Add Product Modal */}
      <AnimatePresence>
        {addModal && (
          <Modal
            onClose={() => {
              setAddModal(false);
              setAddImagePreview(null);
            }}
            title="Add New Product"
          >
            {/* Image Upload */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  fontSize: "13px",
                  color: C.muted,
                  marginBottom: "8px",
                  display: "block",
                }}
              >
                Product Image
              </label>
              <div
                style={{
                  width: "100%",
                  height: "130px",
                  borderRadius: "12px",
                  border: `2px dashed ${addImagePreview ? C.primary : C.border}`,
                  backgroundColor: "#F8F9FA",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  gap: "6px",
                  overflow: "hidden",
                  position: "relative",
                }}
                onClick={() => addImageRef.current?.click()}
              >
                {addImagePreview ? (
                  <img
                    src={addImagePreview}
                    alt="Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <>
                    <span style={{ fontSize: "28px" }}>📷</span>
                    <p
                      style={{
                        fontSize: "13px",
                        color: C.muted,
                        fontWeight: 600,
                      }}
                    >
                      Click to upload product photo
                    </p>
                    <p style={{ fontSize: "11px", color: "#C4C4C4" }}>
                      PNG, JPG, WebP max 5MB
                    </p>
                  </>
                )}
              </div>
              <input
                ref={addImageRef}
                type="file"
                accept="image/*"
                onChange={handleAddImageUpload}
                style={{ display: "none" }}
              />
              {addImagePreview && (
                <button
                  onClick={() => setAddImagePreview(null)}
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "#C62828",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Remove image
                </button>
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {[
                {
                  label: "Product Name *",
                  key: "name",
                  placeholder: "e.g. Ofada Rice",
                  type: "text",
                },
                {
                  label: "Price (₦) *",
                  key: "price",
                  placeholder: "e.g. 3750",
                  type: "number",
                },
                {
                  label: "Unit",
                  key: "unit",
                  placeholder: "e.g. 1kg",
                  type: "text",
                },
                {
                  label: "Stock",
                  key: "stock",
                  placeholder: "e.g. 100",
                  type: "number",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label
                    style={{
                      fontSize: "13px",
                      color: C.muted,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={newProduct[f.key]}
                    onChange={(e) =>
                      setNewProduct((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: `1px solid ${C.border}`,
                      borderRadius: "10px",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = C.primary)}
                    onBlur={(e) => (e.target.style.borderColor = C.border)}
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: C.muted,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Category
                </label>
                <select
                  value={newProduct.category_id}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      category_id: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: `1px solid ${C.border}`,
                    borderRadius: "10px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                >
                  <option value="1">Rice & Grains</option>
                  <option value="2">Oils & Fats</option>
                  <option value="3">Legumes</option>
                  <option value="4">Vegetables</option>
                  <option value="5">Tubers</option>
                  <option value="6">Spices</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: C.muted,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Product description..."
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: `1px solid ${C.border}`,
                    borderRadius: "10px",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "Inter, sans-serif",
                  }}
                />
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                <input
                  type="checkbox"
                  checked={newProduct.is_featured}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      is_featured: e.target.checked,
                    }))
                  }
                  style={{
                    width: "18px",
                    height: "18px",
                    accentColor: C.accent,
                  }}
                />
                Featured Product
              </label>
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setAddModal(false);
                  setAddImagePreview(null);
                }}
                style={{
                  padding: "10px 20px",
                  border: `1px solid ${C.border}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "14px",
                  backgroundColor: "white",
                }}
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAddProduct}
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  border: "none",
                  borderRadius: "10px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: 700,
                  backgroundColor: C.primary,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {saving ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      ⏳
                    </motion.span>{" "}
                    Adding...
                  </>
                ) : (
                  "Add Product"
                )}
              </motion.button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
      {/* Customer View Modal */}
      <AnimatePresence>
        {viewCustomer && (
          <Modal
            onClose={() => setViewCustomer(null)}
            title={`Customer Details`}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px",
                  backgroundColor: C.bg,
                  borderRadius: "12px",
                  marginBottom: "6px",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    backgroundColor: C.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "white",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  {(viewCustomer.name || "?")[0]}
                </div>
                <div>
                  <p
                    style={{ fontWeight: 700, fontSize: "16px", color: C.text }}
                  >
                    {viewCustomer.name}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: viewCustomer.status === "active" ? C.primary : C.muted,
                    }}
                  >
                    {viewCustomer.status === "active" ? "✅ Active Customer" : "⭕ Inactive"}
                  </p>
                </div>
              </div>
              {[
                { label: "Email", value: viewCustomer.email },
                {
                  label: "Total Orders",
                  value: `${viewCustomer.total_orders || 0} orders`,
                },
                {
                  label: "Total Spent",
                  value: `₦${(Number(viewCustomer.total_spent) || 0).toLocaleString()}`,
                  green: true,
                },
                {
                  label: "Status",
                  value: viewCustomer.status === "active" ? "Active" : "Inactive",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    backgroundColor: C.bg,
                    borderRadius: "10px",
                  }}
                >
                  <span style={{ color: C.muted, fontSize: "14px" }}>
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      color: row.green ? C.primary : C.text,
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setViewCustomer(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: C.primary,
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                View Orders
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setViewCustomer(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: `1px solid ${C.border}`,
                  backgroundColor: "white",
                  color: C.text,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Close
              </motion.button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
function Modal({ children, onClose, title }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          backgroundColor: "white",
          borderRadius: "20px",
          padding: "28px",
          width: "100%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {title && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ fontSize: "19px", fontWeight: 700, color: "#202124" }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "20px",
                color: "#9AA0A6",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </motion.div>
    </div>
  );
}
function getEmoji(name) {
  const map = {
    "Ofada Rice": "🌾",
    "Long Grain Rice": "🍚",
    "Palm Oil": "🛢️",
    "Groundnut Oil": "🥜",
    "Black-eyed Beans": "⚫",
    "Brown Beans": "🟤",
    "Garri (White)": "🍚",
    "Garri (Yellow)": "🟡",
    "Fresh Tomatoes": "🍅",
    "Dried Crayfish": "🦐",
    Cocoyam: "🍠",
    "Ugu Leaves": "🥬",
  };
  return map[name] || "🛒";
}
