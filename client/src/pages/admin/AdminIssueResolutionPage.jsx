// src/pages/admin/AdminIssueResolutionPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full Issue Resolution Dashboard — matches the Figma Issue Resolution Flow:
// Customer reports → Admin reviews → Admin decides (Refund/Replace/No action)
// → SMS sent to customer → Issue closed
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../services/api";

// ─── Config ──────────────────────────────────────────────────────────────────
// Shared with the rest of the app — see services/api.js for why this can't
// have its own separate fallback URL.
const API = API_BASE_URL;

const ISSUE_TYPES = {
  damaged_item: { label: "Damaged Item", color: "#EF4444", bg: "#FEF2F2" },
  wrong_item: { label: "Wrong Item", color: "#F59E0B", bg: "#FEF3C7" },
  missing_item: { label: "Missing Item", color: "#F97316", bg: "#FFF7ED" },
  late_delivery: { label: "Late Delivery", color: "#8B5CF6", bg: "#EDE9FE" },
  not_delivered: { label: "Not Delivered", color: "#EC4899", bg: "#FDF2F8" },
  quality_issue: { label: "Quality Issue", color: "#06B6D4", bg: "#ECFEFF" },
  other: { label: "Other", color: "#6B7280", bg: "#F9FAFB" },
};

const STATUSES = {
  open: { label: "Open", color: "#EF4444", bg: "#FEF2F2", dot: "#EF4444" },
  under_review: {
    label: "Under Review",
    color: "#F59E0B",
    bg: "#FEF3C7",
    dot: "#F59E0B",
  },
  resolved_refund: {
    label: "Refunded",
    color: "#10B981",
    bg: "#D1FAE5",
    dot: "#10B981",
  },
  resolved_replacement: {
    label: "Replacement",
    color: "#3B82F6",
    bg: "#DBEAFE",
    dot: "#3B82F6",
  },
  resolved_no_action: {
    label: "No Action",
    color: "#6B7280",
    bg: "#F3F4F6",
    dot: "#9CA3AF",
  },
  closed: { label: "Closed", color: "#1a1a1a", bg: "#F3F4F6", dot: "#D1D5DB" },
};

// ─── Small reusable components ────────────────────────────────────────────────
function Badge({ value, map }) {
  const cfg = map[value] || {
    label: value,
    color: "#6B7280",
    bg: "#F3F4F6",
    dot: "#9CA3AF",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: cfg.bg,
        color: cfg.color,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {cfg.dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: cfg.dot,
          }}
        />
      )}
      {cfg.label}
    </span>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        border: "2px solid rgba(255,255,255,0.4)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

function TimeAgo({ date }) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const label =
    days > 0
      ? `${days}d ago`
      : hours > 0
        ? `${hours}h ago`
        : mins > 0
          ? `${mins}m ago`
          : "just now";
  return <span style={{ color: "#9CA3AF", fontSize: 12 }}>{label}</span>;
}

// ─── Issue Detail Panel (right side slide-in) ─────────────────────────────────
function IssueDetailPanel({ issue, onClose, onUpdated }) {
  const [status, setStatus] = useState(issue.status);
  const [adminNotes, setAdminNotes] = useState(issue.admin_notes || "");
  const [resolution, setResolution] = useState(issue.resolution || "");
  const [refundAmt, setRefundAmt] = useState(issue.refund_amount || "");
  const [newNote, setNewNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [success, setSuccess] = useState("");
  const token = localStorage.getItem("token");

  const customer = issue.users || {};
  const order = issue.orders || {};
  const activities = [...(issue.issue_activities || [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`${API}/issues/${issue.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          admin_notes: adminNotes,
          resolution,
          refund_amount: refundAmt || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSuccess("Issue updated & SMS sent to customer");
      onUpdated(data.issue);
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      alert("Failed to update issue. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await fetch(`${API}/issues/${issue.id}/note`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: newNote }),
      });
      setNewNote("");
      setSuccess("Note added");
      setTimeout(() => setSuccess(""), 2000);
    } catch {
      alert("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(580px, 100vw)",
        background: "#fff",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        animation: "slideInRight 0.3s ease",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          background: "linear-gradient(135deg,#0A2E0A,#1B5E20)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#A5D6A7",
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              Issue Resolution
            </div>
            <h2
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: 900,
                margin: 0,
              }}
            >
              {issue.title}
            </h2>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 8,
                flexWrap: "wrap",
              }}
            >
              <Badge value={issue.type} map={ISSUE_TYPES} />
              <Badge value={issue.status} map={STATUSES} />
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#fff",
              borderRadius: 10,
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Success message */}
        {success && (
          <div
            style={{
              background: "#D1FAE5",
              border: "1px solid #6EE7B7",
              borderRadius: 12,
              padding: "10px 16px",
              color: "#065F46",
              fontWeight: 700,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ✓ {success}
          </div>
        )}

        {/* Customer card */}
        <div
          style={{
            background: "#F8FAFC",
            border: "1px solid #E5E7EB",
            borderRadius: 14,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#9CA3AF",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            Customer
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#2E7D32,#F57F17)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 900,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {(customer.name || "C").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, color: "#0D1117", fontSize: 15 }}>
                {customer.name || "Unknown"}
              </div>
              <div style={{ color: "#6B7280", fontSize: 13 }}>
                {customer.email}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#E8F5E9",
                  color: "#1B5E20",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Call {customer.phone}
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#EDE9FE",
                  color: "#5B21B6",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Email
              </a>
            )}
          </div>
        </div>

        {/* Order info */}
        {order.id && (
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E5E7EB",
              borderRadius: 14,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              Related Order
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{ fontWeight: 800, color: "#0D1117", fontSize: 14 }}
                >
                  #{String(order.id).toUpperCase().slice(-10)}
                </div>
                <div style={{ color: "#6B7280", fontSize: 13 }}>
                  ₦{Number(order.total_amount || 0).toLocaleString()} ·{" "}
                  {order.payment_method || "Monnify"}
                </div>
              </div>
              <Badge
                value={order.status || "pending"}
                map={{
                  pending: {
                    label: "Pending",
                    color: "#92400E",
                    bg: "#FEF3C7",
                    dot: "#F59E0B",
                  },
                  delivered: {
                    label: "Delivered",
                    color: "#065F46",
                    bg: "#D1FAE5",
                    dot: "#10B981",
                  },
                  cancelled: {
                    label: "Cancelled",
                    color: "#991B1B",
                    bg: "#FEE2E2",
                    dot: "#EF4444",
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* Issue description */}
        <div
          style={{
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: 14,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#92400E",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            Customer's Report
          </div>
          <p
            style={{
              color: "#374151",
              fontSize: 14,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {issue.description}
          </p>
          {/* Photos */}
          {issue.photo_urls?.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              {issue.photo_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt={`Evidence ${i + 1}`}
                    style={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: "2px solid #FDE68A",
                    }}
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* ── ADMIN DECISION PANEL ─────────────────────────────────────── */}
        <div
          style={{
            background: "#fff",
            border: "2px solid #E5E7EB",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#0D1117",
              marginBottom: 16,
            }}
          >
            Admin Decision
          </div>

          {/* Status selector */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Resolution Action
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                {
                  value: "under_review",
                  label: "Mark as Under Review",
                  icon: "🔍",
                  desc: "Still investigating",
                },
                {
                  value: "resolved_refund",
                  label: "Approve Refund",
                  icon: "💰",
                  desc: "Process Monnify refund",
                },
                {
                  value: "resolved_replacement",
                  label: "Send Replacement",
                  icon: "📦",
                  desc: "Reschedule delivery",
                },
                {
                  value: "resolved_no_action",
                  label: "Close — No Action",
                  icon: "🚫",
                  desc: "Reject the claim",
                },
                {
                  value: "closed",
                  label: "Close Issue",
                  icon: "✓",
                  desc: "Mark as fully resolved",
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: `2px solid ${status === opt.value ? STATUSES[opt.value]?.dot || "#2E7D32" : "#E5E7EB"}`,
                    background:
                      status === opt.value
                        ? STATUSES[opt.value]?.bg || "#F0FDF4"
                        : "#fff",
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="radio"
                    name="resolution-status"
                    value={opt.value}
                    checked={status === opt.value}
                    onChange={() => setStatus(opt.value)}
                    style={{ accentColor: "#2E7D32" }}
                  />
                  <span style={{ fontSize: 18 }}>{opt.icon}</span>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#0D1117",
                      }}
                    >
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                      {opt.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Refund amount — only show if refund selected */}
          {status === "resolved_refund" && (
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Refund Amount (₦)
              </label>
              <input
                type="number"
                value={refundAmt}
                onChange={(e) => setRefundAmt(e.target.value)}
                placeholder={`Max: ₦${Number(order.total_amount || 0).toLocaleString()}`}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "2px solid #E5E7EB",
                  borderRadius: 10,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                Refund will be initiated via Monnify automatically
              </div>
            </div>
          )}

          {/* Resolution note to customer */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Resolution Note (sent to customer via SMS)
            </label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="e.g. We confirmed the damage and are processing your refund..."
              rows={2}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "2px solid #E5E7EB",
                borderRadius: 10,
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>

          {/* Internal admin notes */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Internal Notes (not sent to customer)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes, evidence reviewed, team decisions..."
              rows={2}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "2px solid #E5E7EB",
                borderRadius: 10,
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>

          <button
            onClick={handleUpdateStatus}
            disabled={updating}
            style={{
              width: "100%",
              padding: "13px",
              background: updating
                ? "#9CA3AF"
                : "linear-gradient(135deg,#1B5E20,#2E7D32)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: updating ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: updating ? "none" : "0 4px 14px rgba(46,125,50,0.35)",
            }}
          >
            {updating ? (
              <>
                <Spinner /> Updating & Sending SMS...
              </>
            ) : (
              "Update & Notify Customer"
            )}
          </button>
        </div>

        {/* ── ACTIVITY LOG ──────────────────────────────────────────────── */}
        <div
          style={{
            background: "#F8FAFC",
            border: "1px solid #E5E7EB",
            borderRadius: 14,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#0D1117",
              marginBottom: 14,
            }}
          >
            Activity Timeline
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activities.map((act, i) => (
              <div key={act.id || i} style={{ display: "flex", gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background:
                      act.actor_type === "admin"
                        ? "#1B5E20"
                        : act.actor_type === "customer"
                          ? "#1E40AF"
                          : "#6B7280",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  {act.actor_type === "admin"
                    ? "A"
                    : act.actor_type === "customer"
                      ? "C"
                      : "⚙"}
                </div>
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#1a1a1a",
                      }}
                    >
                      {act.action}
                    </span>
                    <TimeAgo date={act.created_at} />
                  </div>
                  {act.note && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: 2,
                        lineHeight: 1.5,
                      }}
                    >
                      {act.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div style={{ color: "#9CA3AF", fontSize: 13 }}>
                No activity yet
              </div>
            )}
          </div>

          {/* Quick note */}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add internal note..."
              onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
              style={{
                flex: 1,
                padding: "9px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !newNote.trim()}
              style={{
                padding: "9px 16px",
                background: "#1B5E20",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {addingNote ? "..." : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export default function AdminIssueResolutionPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelected] = useState(null);
  const [filterStatus, setFilter] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({});
  const token = localStorage.getItem("token");

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterType !== "all") params.set("type", filterType);

      const res = await fetch(`${API}/issues/admin?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = data.issues || [];
      setIssues(list);

      // Compute stats
      const s = {};
      Object.keys(STATUSES).forEach((k) => {
        s[k] = list.filter((i) => i.status === k).length;
      });
      s.total = list.length;
      setStats(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [filterStatus, filterType]);

  const handleIssueUpdated = (updatedIssue) => {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === updatedIssue.id ? { ...i, ...updatedIssue } : i,
      ),
    );
    setSelected((prev) => (prev ? { ...prev, ...updatedIssue } : null));
  };

  const filtered = issues.filter((issue) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      issue.title?.toLowerCase().includes(q) ||
      issue.users?.name?.toLowerCase().includes(q) ||
      issue.users?.email?.toLowerCase().includes(q) ||
      issue.id?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        minHeight: "100vh",
        background: "#F8FAFC",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg,#0A2E0A,#1B5E20)",
          padding: "28px 32px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: 900,
                margin: "0 0 4px",
              }}
            >
              Issue Resolution Dashboard
            </h1>
            <p style={{ color: "#A5D6A7", fontSize: 14, margin: 0 }}>
              Review customer complaints and take action
            </p>
          </div>
          <button
            onClick={fetchIssues}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              borderRadius: 10,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div
          style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}
        >
          {[
            { label: "Total", value: stats.total || 0, color: "#fff" },
            { label: "Open", value: stats.open || 0, color: "#FCA5A5" },
            {
              label: "Under Review",
              value: stats.under_review || 0,
              color: "#FDE68A",
            },
            {
              label: "Refunded",
              value: stats.resolved_refund || 0,
              color: "#6EE7B7",
            },
            {
              label: "Replaced",
              value: stats.resolved_replacement || 0,
              color: "#93C5FD",
            },
            { label: "Closed", value: stats.closed || 0, color: "#D1D5DB" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: "12px 18px",
                minWidth: 90,
              }}
            >
              <div style={{ color: s.color, fontWeight: 900, fontSize: 22 }}>
                {s.value}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email or issue ID..."
            style={{
              flex: "1 1 260px",
              padding: "10px 16px",
              border: "2px solid #E5E7EB",
              borderRadius: 12,
              fontSize: 14,
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
            onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
          />

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              border: "2px solid #E5E7EB",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              outline: "none",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUSES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: "10px 14px",
              border: "2px solid #E5E7EB",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              outline: "none",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="all">All Types</option>
            {Object.entries(ISSUE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* Issue list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: "3px solid #E5E7EB",
                borderTopColor: "#2E7D32",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ color: "#9CA3AF" }}>Loading issues...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "60px 32px",
              textAlign: "center",
              border: "2px dashed #E5E7EB",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                overflow: "hidden",
                margin: "0 auto 16px",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=64&q=80"
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <h3
              style={{
                color: "#374151",
                margin: "0 0 8px",
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              No issues found
            </h3>
            <p style={{ color: "#9CA3AF", margin: 0 }}>
              {filterStatus !== "all"
                ? "Try a different filter"
                : "No customer complaints yet — great sign!"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((issue) => {
              const customer = issue.users || {};
              const isSelected = selectedIssue?.id === issue.id;
              const sDate = new Date(issue.created_at);

              return (
                <div
                  key={issue.id}
                  onClick={() => setSelected(issue)}
                  style={{
                    background: "#fff",
                    border: `2px solid ${isSelected ? "#2E7D32" : "#E5E7EB"}`,
                    borderRadius: 16,
                    padding: "16px 20px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                    boxShadow: isSelected
                      ? "0 0 0 3px rgba(46,125,50,0.15)"
                      : "0 2px 10px rgba(0,0,0,0.04)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.borderColor = "#A7F3D0";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.borderColor = "#E5E7EB";
                  }}
                >
                  {/* Priority dot */}
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background:
                        issue.status === "open"
                          ? "#EF4444"
                          : issue.status === "under_review"
                            ? "#F59E0B"
                            : "#10B981",
                    }}
                  />

                  {/* Customer avatar */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: "linear-gradient(135deg,#2E7D32,#F57F17)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 16,
                    }}
                  >
                    {(customer.name || "?").charAt(0).toUpperCase()}
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 800,
                          color: "#0D1117",
                          fontSize: 14,
                        }}
                      >
                        {issue.title}
                      </span>
                      <Badge value={issue.type} map={ISSUE_TYPES} />
                      <Badge value={issue.status} map={STATUSES} />
                    </div>
                    <div style={{ color: "#6B7280", fontSize: 13 }}>
                      {customer.name || "Unknown customer"}
                      {issue.order_id &&
                        ` · Order #${String(issue.order_id).slice(-8).toUpperCase()}`}
                    </div>
                    <div
                      style={{
                        color: "#9CA3AF",
                        fontSize: 12,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {issue.description}
                    </div>
                  </div>

                  {/* Date + arrow */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <TimeAgo date={issue.created_at} />
                    <div
                      style={{ color: "#9CA3AF", fontSize: 18, marginTop: 4 }}
                    >
                      →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel overlay */}
      {selectedIssue && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 99,
              backdropFilter: "blur(2px)",
            }}
          />
          <IssueDetailPanel
            issue={selectedIssue}
            onClose={() => setSelected(null)}
            onUpdated={handleIssueUpdated}
          />
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
