import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import QRCode from "qrcode";
import api from "../../services/api";

function numberToWords(num) {
  if (!num || isNaN(num)) return "Zero naira only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertGroup(n) {
    if (n === 0) return "";
    if (n < 20) return a[n] + " ";
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? "-" + a[n % 10].toLowerCase() : "") + " ";
    return a[Math.floor(n / 100)] + " hundred " + (n % 100 !== 0 ? "and " + convertGroup(n % 100) : "");
  }

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return "Zero naira only";

  const billions = Math.floor(integerPart / 1000000000);
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  let words = "";
  if (billions) words += convertGroup(billions) + "billion ";
  if (millions) words += convertGroup(millions) + "million ";
  if (thousands) words += convertGroup(thousands) + "thousand ";
  if (remainder) words += convertGroup(remainder);

  words = words.trim();
  words = words.charAt(0).toUpperCase() + words.slice(1).toLowerCase() + " naira";
  if (decimalPart > 0) {
    words += " and " + convertGroup(decimalPart).trim().toLowerCase() + " kobo";
  }
  return words + " only";
}

function formatDate(val, withTime = false) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    if (withTime) {
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(val);
  }
}

function generateSecurityCode(ref, amount) {
  const seed = (String(ref) + String(amount || 0)).toUpperCase().replace(/[^A-Z0-9]/g, "");
  let hash1 = 0x811c9dc5;
  let hash2 = 0x55555555;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    hash1 = (hash1 ^ c) * 0x01000193;
    hash2 = (hash2 + c) * 0x45d9f3b;
  }
  const h1 = Math.abs(hash1).toString(16).padStart(8, "0").slice(0, 8).toUpperCase();
  const h2 = Math.abs(hash2).toString(16).padStart(8, "0").slice(0, 8).toUpperCase();
  return `${h1.slice(0, 4)}-${h1.slice(4, 8)}-${h2.slice(0, 4)}-${h2.slice(4, 8)}`;
}

export default function DriverStatementPage() {
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get("token");

  const [token, setToken] = useState(
    queryToken || localStorage.getItem("driverToken") || ""
  );

  // Login form state
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Statement data
  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [dateFilter, setDateFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");

  // Sync token if queryToken changes
  useEffect(() => {
    if (queryToken && queryToken !== token) {
      setToken(queryToken);
      localStorage.setItem("driverToken", queryToken);
    }
  }, [queryToken]);

  // Load statement
  const fetchStatement = useCallback(async (activeToken, sDate, eDate) => {
    if (!activeToken) return;
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (sDate) params.start_date = sDate;
      if (eDate) params.end_date = eDate;

      const res = await api.get("/driver/wallet/statement", {
        headers: { Authorization: `Bearer ${activeToken}` },
        params,
      });

      setStatementData(res.data);
    } catch (err) {
      console.error("Statement fetch error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setToken("");
        localStorage.removeItem("driverToken");
        setError("Your driver session has expired. Please sign in again.");
      } else {
        setError(err.response?.data?.message || "Failed to load statement of account.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchStatement(token, startDate, endDate);
    }
  }, [token, fetchStatement]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await api.post("/driver/auth/login", { phone, password });
      const receivedToken = res.data?.token;
      if (!receivedToken) {
        throw new Error("No authorization token received.");
      }
      setToken(receivedToken);
      localStorage.setItem("driverToken", receivedToken);
      fetchStatement(receivedToken, startDate, endDate);
    } catch (err) {
      setLoginError(err.response?.data?.message || "Invalid phone number or password/PIN.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("driverToken");
    setStatementData(null);
  };

  const handleDatePreset = (preset) => {
    setDateFilter(preset);
    const now = new Date();
    let s = "";
    let e = now.toISOString().split("T")[0];

    if (preset === "this_month") {
      s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    } else if (preset === "last_30_days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      s = d.toISOString().split("T")[0];
    } else if (preset === "this_week") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      s = d.toISOString().split("T")[0];
    } else {
      s = "";
      e = "";
    }

    setStartDate(s);
    setEndDate(e);
    fetchStatement(token, s, e);
  };

  const handleSendEmail = async () => {
    if (!token) return;
    setSendingEmail(true);
    setEmailStatus("");
    try {
      const res = await api.post(
        "/driver/wallet/statement",
        { email: true, start_date: startDate || undefined, end_date: endDate || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEmailStatus(res.data?.message || "Statement sent to your email!");
      setTimeout(() => setEmailStatus(""), 5000);
    } catch (err) {
      setEmailStatus("Failed to send email. Please try downloading the PDF directly.");
    } finally {
      setSendingEmail(false);
    }
  };

  const driver = statementData?.driver || {};
  const summary = statementData?.summary || {};
  const company = statementData?.company || {};
  const statement = statementData?.statement || [];

  const driverName = driver.name || "Bems Farms Driver";
  const driverPhone = driver.phone || "—";
  const driverEmail = driver.email || "—";
  const vehicleType = driver.vehicle_type ? (driver.vehicle_type.charAt(0).toUpperCase() + driver.vehicle_type.slice(1)) : "Motorcycle";
  const vehiclePlate = driver.vehicle_plate || "—";
  const licenseNumber = driver.license_number || "—";
  const walletAccountNo = driver.wallet_account_number || `DRV-${String(driver.id || 1).padStart(4, "0")}`;

  const bankName = driver.bank_name || "Designated Commercial Bank";
  const accountNumber = driver.account_number || "—";
  const accountName = driver.account_name || driverName;

  const openingBalance = Number(summary.opening_balance || 0);
  const totalCredits = Number(summary.total_credits || driver.total_earnings || 0);
  const totalDebits = Number(summary.total_debits || driver.total_paid || 0);
  const pendingPayouts = Number(summary.pending_payouts || 0);
  const closingBalance = Number(summary.closing_balance ?? (totalCredits - totalDebits - pendingPayouts));
  const totalTrips = Number(summary.total_trips || driver.total_delivered || driver.total_deliveries || 0);

  const periodStart = summary.period_start || (statement.length > 0 ? statement[0].date : driver.joined_at || new Date());
  const periodEnd = summary.period_end || (statement.length > 0 ? statement[statement.length - 1].date : new Date());
  const issuedDate = formatDate(new Date());

  const statementRef = `SOA-${walletAccountNo}-${new Date().getFullYear()}`;
  const balanceInWords = numberToWords(closingBalance);
  const securityCode = generateSecurityCode(statementRef, closingBalance);

  const [qrDataUrl, setQrDataUrl] = useState("");
  useEffect(() => {
    let isMounted = true;
    const verifyUrl = `https://bemsfarms.com/verify?type=driver_statement&ref=${encodeURIComponent(statementRef)}&code=${encodeURIComponent(securityCode)}`;
    QRCode.toDataURL(verifyUrl, {
      width: 240,
      margin: 1,
      color: { dark: "#0f3622", light: "#ffffff" },
    }).then((url) => {
      if (isMounted) setQrDataUrl(url);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [statementRef, securityCode]);

  const companyName = company.name || "Bems Farms Limited";
  const companyAddress = company.address || "Central Farm Settlement Hub, Umuahia, Abia State";
  const rcNumber = company.rc_number || "RC 1849204";
  const tinNumber = company.tin || "TIN 24819402-0001";
  const companyEmail = company.email || "corporate@bemsfarms.com";
  const companyPhone = company.phone || "+234 800 236 7326 / +234 814 000 0000";

  return (
    <div className="min-h-screen bg-slate-900 py-6 px-3 sm:px-6 text-slate-800">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        :root {
          --bems-g9: #0f3622;
          --bems-g8: #154a2f;
          --bems-g6: #1f7a45;
          --bems-g4: #3aa865;
          --bems-g1: #e9f5ee;
          --bems-g0: #f5faf7;
          --bems-gold: #b09a3e;
          --bems-gold1: #f6f1dc;
          --bems-ink: #132019;
          --bems-ink2: #3b4a41;
          --bems-muted: #7a877f;
          --bems-line: #e2e8e4;
        }

        .mono { font-family: 'JetBrains Mono', monospace; font-feature-settings: "tnum"; }
        .serif { font-family: 'Fraunces', Georgia, serif; }
        .naira { font-family: 'Inter', sans-serif; font-weight: 600; }

        .cap {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: var(--bems-muted);
        }

        .bems-doc-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          text-align: left;
        }

        .bems-doc-page::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 6px;
          background: linear-gradient(var(--bems-g9), var(--bems-g6) 60%, var(--bems-gold));
          z-index: 10;
        }

        .bems-doc-body {
          padding: 14mm 15mm 0 17mm;
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .bems-doc-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .bems-doc-logo img {
          height: 48px;
          width: auto;
          display: block;
          object-fit: contain;
        }

        .bems-doc-co {
          margin-top: 8px;
          font-size: 10px;
          color: var(--bems-muted);
          line-height: 1.6;
        }
        .bems-doc-co b { color: var(--bems-ink2); font-weight: 600; }

        .bems-doc-meta-right { text-align: right; }
        .bems-doc-meta-right h1 {
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 28px;
          line-height: 1.1;
          color: var(--bems-g9);
          margin: 3px 0 0;
        }
        .bems-doc-meta-right .no {
          display: inline-block;
          margin-top: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          background: var(--bems-gold1);
          color: #6d5d17;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          font-size: 11.5px;
          letter-spacing: .04em;
        }
        .bems-doc-meta-right .dt {
          margin-top: 5px;
          font-size: 10px;
          color: var(--bems-muted);
          line-height: 1.4;
        }

        .bems-doc-hero {
          position: relative;
          border-radius: 14px;
          background: radial-gradient(120% 140% at 0% 0%, var(--bems-g8), var(--bems-g9) 60%);
          color: #ffffff;
          overflow: hidden;
        }

        .bems-doc-guil {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .bems-doc-hero-top {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 22px 14px;
          z-index: 2;
        }

        .bems-doc-amt {
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 40px;
          line-height: 1.05;
          letter-spacing: -.015em;
          margin: 4px 0;
          color: #ffffff;
        }
        .bems-doc-amt small {
          font-size: 22px;
          opacity: .75;
          margin-right: 3px;
          vertical-align: 3px;
        }

        .bems-doc-words {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-weight: 400;
          font-size: 12px;
          color: #cfe3d6;
        }

        .bems-doc-stamp {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          border: 2px solid #7fd09a;
          display: grid;
          place-items: center;
          transform: rotate(-12deg);
          box-shadow: inset 0 0 0 5px var(--bems-g9), inset 0 0 0 6.5px #7fd09a;
          text-align: center;
          color: #9fe0b3;
          flex-shrink: 0;
        }
        .bems-doc-stamp b {
          display: block;
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 19px;
          line-height: 1;
          letter-spacing: .08em;
          color: #ffffff;
        }
        .bems-doc-stamp span {
          font-size: 7px;
          font-weight: 700;
          letter-spacing: .2em;
        }

        .bems-doc-hero-meta {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-top: 1px solid rgba(255, 255, 255, .12);
          background: rgba(0, 0, 0, .18);
          z-index: 2;
        }
        .bems-doc-hero-meta > div { padding: 10px 18px; }
        .bems-doc-hero-meta > div + div { border-left: 1px solid rgba(255, 255, 255, .1); }
        .bems-doc-hero-meta p {
          font-size: 11.5px;
          font-weight: 600;
          margin: 2px 0 0;
          color: #ffffff;
        }

        .bems-doc-parties {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border: 1px solid var(--bems-line);
          border-radius: 12px;
          overflow: hidden;
        }
        .bems-doc-party { padding: 12px 16px; }
        .bems-doc-party + .bems-doc-party {
          border-left: 1px solid var(--bems-line);
          background: var(--bems-g0);
        }
        .bems-doc-party .nm {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 14.5px;
          color: var(--bems-g9);
          margin: 3px 0 2px;
        }
        .bems-doc-party p {
          font-size: 10.5px;
          color: var(--bems-ink2);
          line-height: 1.55;
          margin: 0;
        }

        .bems-stmt-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .bems-stmt-kpi-card {
          border: 1px solid var(--bems-line);
          background: var(--bems-g0);
          border-radius: 8px;
          padding: 9px 12px;
        }
        .bems-stmt-kpi-card.highlight {
          border-color: var(--bems-g6);
          background: var(--bems-g1);
        }
        .bems-stmt-kpi-card .kpi-label {
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--bems-muted);
          margin-bottom: 3px;
        }
        .bems-stmt-kpi-card .kpi-val {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          font-size: 14px;
          color: var(--bems-ink);
          line-height: 1.2;
        }

        .bems-doc-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
        }
        .bems-doc-table th {
          white-space: nowrap;
          text-align: left;
          padding: 8px 10px;
          background: var(--bems-g9);
          color: #d8ebdf;
          font-size: 8.5px;
          font-weight: 600;
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        .bems-doc-table th:first-child { border-radius: 6px 0 0 6px; }
        .bems-doc-table th:last-child { border-radius: 0 6px 6px 0; }
        .bems-doc-table td {
          padding: 10px 10px;
          border-bottom: 1px solid var(--bems-line);
          vertical-align: middle;
          font-size: 11px;
        }
        .bems-doc-table .r { text-align: right; }
        .bems-doc-table .c { text-align: center; }
        .bems-doc-table .it b { font-weight: 600; color: var(--bems-ink); font-size: 11.5px; }

        .bems-doc-tag {
          display: inline-block;
          margin-left: 5px;
          padding: 1px 6px;
          border-radius: 99px;
          background: var(--bems-g1);
          color: var(--bems-g6);
          font-size: 8.5px;
          font-weight: 600;
        }

        .bems-stmt-badge-cr {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          background: #DCFCE7;
          color: #166534;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          font-size: 9px;
        }
        .bems-stmt-badge-dr {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          background: #FEE2E2;
          color: #991B1B;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          font-size: 9px;
        }
        .bems-stmt-amt-cr { color: #15803d; font-weight: 600; }
        .bems-stmt-amt-dr { color: #b91c1c; font-weight: 600; }

        .bems-doc-vt {
          display: grid;
          grid-template-columns: 1fr 240px;
          gap: 20px;
          align-items: start;
        }
        .bems-doc-verify {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 10px 14px;
          border: 1px dashed #c9d6ce;
          border-radius: 10px;
          background: #ffffff;
        }
        .bems-doc-verify .qr {
          padding: 4px;
          background: #ffffff;
          border: 1px solid var(--bems-line);
          border-radius: 6px;
          flex-shrink: 0;
        }
        .bems-doc-verify h4 {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 13px;
          color: var(--bems-g9);
          margin: 0 0 2px;
        }
        .bems-doc-verify p {
          font-size: 9.5px;
          color: var(--bems-muted);
          margin: 0 0 4px;
          line-height: 1.35;
        }
        .bems-doc-verify .code {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          font-size: 10.5px;
          color: var(--bems-ink);
        }

        .bems-doc-tot {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 6px 0;
          font-size: 11px;
          margin: 0;
        }
        .bems-doc-tot dt { color: var(--bems-muted); }
        .bems-doc-tot dd { text-align: right; margin: 0; font-weight: 600; }
        .bems-doc-tot .grand {
          margin-top: 4px;
          padding: 9px 12px;
          background: var(--bems-g9);
          color: #ffffff;
          font-weight: 600;
        }
        .bems-doc-tot dt.grand { border-radius: 8px 0 0 8px; }
        .bems-doc-tot dd.grand {
          border-radius: 0 8px 8px 0;
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 15px;
        }

        .bems-doc-sign {
          margin-top: auto;
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: 32px;
          align-items: end;
          padding-bottom: 12px;
        }
        .bems-doc-keep {
          padding: 10px 14px;
          border-left: 3px solid var(--bems-g6);
          background: var(--bems-g0);
          border-radius: 0 8px 8px 0;
          font-size: 9.5px;
          color: var(--bems-ink2);
          line-height: 1.5;
        }
        .bems-doc-sig .ln {
          height: 30px;
          border-bottom: 1px solid var(--bems-ink);
        }
        .bems-doc-sig b {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          color: var(--bems-ink);
        }
        .bems-doc-sig span {
          font-size: 9.5px;
          color: var(--bems-muted);
        }

        .bems-doc-thanks {
          margin-left: 6px;
          padding: 10px 15mm 10px 11mm;
          background: var(--bems-g0);
          border-top: 1px solid var(--bems-line);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .bems-doc-thanks h3 {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-weight: 400;
          font-size: 15px;
          color: var(--bems-g9);
          margin: 0;
        }
        .bems-doc-thanks span { font-size: 10px; color: var(--bems-muted); }

        .bems-doc-foot {
          margin-left: 6px;
          padding: 6px 15mm 7px 11mm;
          background: var(--bems-g9);
          color: #a9c9b5;
          font-size: 9px;
          display: flex;
          justify-content: space-between;
        }

        @page {
          size: A4 portrait;
          margin: 10mm 0 10mm 0;
        }

        @media print {
          body {
            background: #ffffff !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .bems-doc-page {
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            min-height: auto !important;
          }
          .bems-doc-table tr { page-break-inside: avoid; }
          .bems-doc-hero, .bems-doc-parties, .bems-stmt-kpi-grid, .bems-doc-vt, .bems-doc-sign {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* ── Driver Not Logged In ── */}
      {!token && (
        <div className="max-w-md mx-auto mt-12 bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <img
              src="/bemsfarms_logo.png"
              alt="Bems Farms"
              className="h-12 mx-auto mb-3 object-contain"
              onError={(e) => { e.currentTarget.src = "/bemsfarms_logo_compact.png"; }}
            />
            <h2 className="text-xl font-bold text-emerald-950 font-serif">Driver Statement Portal</h2>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your driver credentials to download your official Bems Farms Statement of Account.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Phone Number</label>
              <input
                type="tel"
                required
                placeholder="e.g. 08034567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password or 4-Digit PIN</label>
              <input
                type="password"
                required
                placeholder="••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg text-sm transition shadow-md flex items-center justify-center gap-2"
            >
              {loggingIn ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Access My Statement</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link to="/contact" className="text-xs text-emerald-800 hover:underline">
              Need assistance? Contact Driver Operations Support
            </Link>
          </div>
        </div>
      )}

      {/* ── Driver Logged In: Controls & Statement ── */}
      {token && (
        <div className="max-w-[840px] mx-auto">
          {/* Top Floating Control Bar */}
          <div className="no-print bg-slate-800 text-white rounded-xl shadow-lg p-3 sm:p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded">
                    DRIVER SELF-SERVICE
                  </span>
                  <span className="text-sm font-semibold">{driverName}</span>
                  <span className="text-xs text-slate-400 font-mono">({walletAccountNo})</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Download or print your official audited logistics settlement document
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow flex items-center gap-1.5 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                  <span>Download / Print PDF</span>
                </button>

                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition"
                  title="Email this statement to your registered email"
                >
                  {sendingEmail ? "Sending..." : "Email to Me"}
                </button>

                <button
                  onClick={handleLogout}
                  className="px-2.5 py-2 text-slate-400 hover:text-white text-xs transition"
                  title="Sign out of portal"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Period:</span>
              {[
                { key: "all", label: "All Time" },
                { key: "this_week", label: "This Week" },
                { key: "this_month", label: "This Month" },
                { key: "last_30_days", label: "Last 30 Days" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => handleDatePreset(p.key)}
                  className={`text-xs px-2.5 py-1 rounded-md transition ${
                    dateFilter === p.key
                      ? "bg-emerald-600 text-white font-semibold"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {p.label}
                </button>
              ))}

              {emailStatus && (
                <span className="text-xs text-emerald-400 font-medium ml-auto">
                  ✓ {emailStatus}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-white">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mb-2"></div>
              <p className="text-sm font-semibold">Generating Your Statement of Account...</p>
              <p className="text-xs text-slate-400">Auditing delivery commissions and payouts</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/60 border border-red-700 text-red-200 rounded-xl text-center text-sm">
              {error}
            </div>
          ) : (
            /* ── Official A4 Document Target ── */
            <div className="bems-doc-page">
              <div className="bems-doc-body">

                {/* Header */}
                <header className="bems-doc-head">
                  <div>
                    <div className="bems-doc-logo">
                      <img
                        src="/bemsfarms_logo.png"
                        alt="Bems Farms"
                        onError={(e) => { e.currentTarget.src = "/bemsfarms_logo_compact.png"; }}
                      />
                    </div>
                    <div className="bems-doc-co">
                      <b>{companyName}</b> · Logistics & Fleet Operations<br />
                      {companyAddress}<br />
                      {rcNumber} · {tinNumber} · {companyEmail}
                    </div>
                  </div>

                  <div className="bems-doc-meta-right">
                    <div className="cap">Official Settlement Record</div>
                    <h1>Statement of Account</h1>
                    <div className="no">{statementRef}</div>
                    <div className="dt">
                      Period: {formatDate(periodStart)} – {formatDate(periodEnd)}<br />
                      Generated on {issuedDate}
                    </div>
                  </div>
                </header>

                {/* Hero Banner with Guilloche Security Waves & Stamp */}
                <section className="bems-doc-hero">
                  <svg className="bems-doc-guil" viewBox="0 0 720 190" preserveAspectRatio="none" fill="none" stroke="#9fd6a9" strokeWidth=".6" opacity=".22">
                    <polyline points="0,95.0 4,100.0 8,104.9 12,109.8 16,114.5 20,119.1 24,123.6 28,127.8 32,131.8 36,135.5 40,139.0 44,142.1 48,144.9 52,147.4 56,149.5 60,151.2 64,152.6 68,153.5 72,154.1 76,154.3 80,154.1 84,153.6 88,152.7 92,151.5 96,150.0 100,148.2 104,146.1 108,143.8 112,141.2 116,138.5 120,135.6 124,132.6 128,129.5 132,126.4 136,123.2 140,120.1 144,117.0 148,113.9 152,111.0 156,108.2 160,105.6 164,103.1 168,100.9 172,98.9 176,97.2 180,95.7 184,94.5 188,93.6 192,93.0 196,92.6 200,92.6 204,92.8 208,93.4 212,94.2 216,95.2 220,96.5 224,98.1 228,99.8 232,101.7 236,103.7 240,105.9 244,108.2 248,110.5 252,112.9 256,115.2 260,117.6 264,119.9 268,122.0 272,124.1 276,126.0 280,127.7 284,129.2 288,130.4 292,131.4 296,132.1 300,132.5 304,132.6 308,132.4 312,131.8 316,130.9 320,129.7 324,128.1 328,126.1 332,123.8 336,121.2 340,118.3 344,115.1 348,111.6 352,107.9 356,103.9 360,99.8 364,95.5 368,91.0 372,86.4 376,81.8 380,77.1 384,72.5 388,67.8 392,63.2 396,58.8 400,54.5 404,50.3 408,46.4 412,42.7 416,39.2 420,36.1 424,33.3 428,30.8 432,28.7 436,26.9 440,25.5 444,24.6 448,24.0 452,23.8 456,24.1 460,24.7 464,25.7 468,27.1 472,28.9 476,31.0 480,33.4 484,36.1 488,39.1 492,42.4 496,45.9 500,49.6 504,53.4 508,57.4 512,61.4 516,65.5 520,69.6 524,73.7 528,77.7 532,81.7 536,85.6 540,89.3 544,92.8 548,96.1 552,99.2 556,102.1 560,104.6 564,106.9 568,108.9 572,110.6 576,112.0 580,113.1 584,113.8 588,114.3 592,114.4 596,114.2 600,113.8 604,113.0 608,112.0 612,110.8 616,109.4 620,107.8 624,106.0 628,104.1 632,102.1 636,100.1 640,97.9 644,95.8 648,93.8 652,91.7 656,89.8 660,88.0 664,86.3 668,84.8 672,83.5 676,82.4 680,81.6 684,81.0 688,80.8 692,80.8 696,81.1 700,81.7 704,82.6 708,83.8 712,85.4 716,87.2 720,89.3" />
                  </svg>

                  <div className="bems-doc-hero-top">
                    <div>
                      <div className="cap">Net Available / Closing Balance</div>
                      <div className="bems-doc-amt">
                        <small className="naira">₦</small>
                        {closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="bems-doc-words">{balanceInWords}</div>
                    </div>

                    <div className="bems-doc-stamp">
                      <div>
                        <span>BEMS FARMS</span>
                        <b>AUDITED</b>
                        <span>RECONCILED</span>
                      </div>
                    </div>
                  </div>

                  <div className="bems-doc-hero-meta">
                    <div>
                      <div className="cap">Total Earned (Gross)</div>
                      <p>₦{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <div className="cap">Total Disbursed</div>
                      <p>₦{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <div className="cap">Completed Drops</div>
                      <p>{totalTrips} {totalTrips === 1 ? "Delivery" : "Deliveries"}</p>
                    </div>
                    <div>
                      <div className="cap">Wallet Status</div>
                      <p style={{ color: driver.wallet_is_frozen ? "#fca5a5" : "#9fe0b3" }}>
                        {driver.wallet_is_frozen ? "Frozen / Suspended" : "Active · Good Standing"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Driver Profile & Bank Section */}
                <section className="bems-doc-parties">
                  <div className="bems-doc-party">
                    <div className="cap">Driver & Fleet Profile</div>
                    <div className="nm">{driverName}</div>
                    <p>
                      <b>Wallet Account:</b> <span className="mono">{walletAccountNo}</span><br />
                      <b>Phone:</b> {driverPhone} · <b>Email:</b> {driverEmail}<br />
                      <b>Vehicle:</b> {vehicleType} ({vehiclePlate})<br />
                      <b>License No:</b> {licenseNumber} · <b>Base:</b> Abia & Rivers Region
                    </p>
                  </div>

                  <div className="bems-doc-party">
                    <div className="cap">Designated Bank Settlement Details</div>
                    <div className="nm">{bankName}</div>
                    <p>
                      <b>Account Name:</b> {accountName}<br />
                      <b>Account Number (NUBAN):</b> <span className="mono">{accountNumber}</span><br />
                      <b>Settlement Mode:</b> Monnify Instant / Scheduled Fleet Batch<br />
                      <b>Logistics Helpline:</b> {companyPhone}
                    </p>
                  </div>
                </section>

                {/* 4-KPI Strip */}
                <div className="bems-stmt-kpi-grid">
                  <div className="bems-stmt-kpi-card">
                    <div className="kpi-label">Opening Balance</div>
                    <div className="kpi-val">₦{openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="bems-stmt-kpi-card">
                    <div className="kpi-label">Total Credits (+)</div>
                    <div className="kpi-val" style={{ color: "#166534" }}>
                      +₦{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bems-stmt-kpi-card">
                    <div className="kpi-label">Total Withdrawals (-)</div>
                    <div className="kpi-val" style={{ color: "#991B1B" }}>
                      -₦{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bems-stmt-kpi-card highlight">
                    <div className="kpi-label">Net Closing Balance</div>
                    <div className="kpi-val" style={{ color: "#0f3622" }}>
                      ₦{closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Itemized Table */}
                <table className="bems-doc-table">
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>#</th>
                      <th style={{ width: "13%" }}>Date</th>
                      <th>Activity & Transaction Details</th>
                      <th style={{ width: "16%" }}>Reference</th>
                      <th className="c" style={{ width: "10%" }}>Type</th>
                      <th className="r" style={{ width: "14%" }}>Amount (₦)</th>
                      <th className="r" style={{ width: "15%" }}>Balance (₦)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement && statement.length > 0 ? (
                      statement.map((ev, idx) => {
                        const isCredit = ev.type === "credit";
                        const amt = parseFloat(ev.amount) || 0;
                        const runningBal = ev.running_balance !== undefined ? parseFloat(ev.running_balance) : null;

                        return (
                          <tr key={ev.id || idx}>
                            <td className="mono">{String(idx + 1).padStart(2, "0")}</td>
                            <td className="mono" style={{ fontSize: 10.5 }}>{formatDate(ev.date)}</td>
                            <td className="it">
                              <b>{ev.description || (isCredit ? "Delivery Drop Commission" : "Bank Withdrawal")}</b>
                              {ev.order_id && (
                                <span className="bems-doc-tag" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                                  Order #{ev.order_id}
                                </span>
                              )}
                              {ev.delivery_address && (
                                <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 2 }}>
                                  {ev.delivery_address}
                                </div>
                              )}
                            </td>
                            <td className="mono" style={{ fontSize: 10, color: "#0f3622", fontWeight: 600 }}>
                              {ev.reference || "—"}
                            </td>
                            <td className="c">
                              <span className={isCredit ? "bems-stmt-badge-cr" : "bems-stmt-badge-dr"}>
                                {isCredit ? "CR" : "DR"}
                              </span>
                            </td>
                            <td className={`r mono ${isCredit ? "bems-stmt-amt-cr" : "bems-stmt-amt-dr"}`}>
                              {isCredit ? "+" : "-"}₦{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="r mono" style={{ fontWeight: 600, color: "#0f3622" }}>
                              {runningBal !== null
                                ? `₦${runningBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : "—"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="c" style={{ padding: "30px 12px", color: "#64748b" }}>
                          No recorded transactions during this statement period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Verification & Totals */}
                <section className="bems-doc-vt">
                  <div className="bems-doc-verify">
                    <div className="qr" style={{ padding: 4, background: "#ffffff", border: "1px solid #c9d6ce", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Verify Driver Statement QR Code"
                          style={{ width: 72, height: 72, display: "block" }}
                        />
                      ) : (
                        <div style={{ width: 72, height: 72, background: "#eef7f2" }}></div>
                      )}
                    </div>
                    <div>
                      <h4>Verified Logistics Settlement</h4>
                      <p>Scan with any smartphone camera or visit bemsfarms.com/verify to authenticate this official statement.</p>
                      <div className="cap" style={{ marginBottom: 2 }}>Security Verification Code</div>
                      <div className="code">{securityCode}</div>
                    </div>
                  </div>

                  <dl className="bems-doc-tot">
                    <dt>Gross Delivery Earnings</dt>
                    <dd className="mono">₦{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>

                    <dt>Disbursed to Bank</dt>
                    <dd className="mono">₦{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>

                    {pendingPayouts > 0 && (
                      <>
                        <dt>In-Flight Payouts</dt>
                        <dd className="mono" style={{ color: "#d97706" }}>
                          ₦{pendingPayouts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </dd>
                      </>
                    )}

                    <dt className="grand">Closing Balance</dt>
                    <dd className="grand">
                      <span className="naira" style={{ fontSize: 14 }}>₦</span>
                      {closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </dd>

                    <dt>Settlement Account</dt>
                    <dd className="mono" style={{ fontSize: 9.5, color: "#8a6d12" }}>{accountNumber} ({bankName})</dd>
                  </dl>
                </section>

                {/* Sign-off & Audit Notice */}
                <section className="bems-doc-sign">
                  <div className="bems-doc-keep">
                    <b>Audit & Settlement Notice.</b> This Statement of Account reflects all verified delivery compensations, bonuses, adjustments, and electronic bank settlements recorded in the Bems Farms driver settlement system. All figures are audited and reconciled against delivery telemetry and payment gateway logs. Please report any discrepancies within 14 days.
                  </div>

                  <div className="bems-doc-sig">
                    <div className="ln"></div>
                    <b>For {companyName}</b>
                    <span>Financial Controller & Head of Logistics</span>
                  </div>
                </section>

              </div>

              {/* Thanks Banner */}
              <div className="bems-doc-thanks">
                <h3>Thank you for powering Bems Farms logistics.</h3>
                <span>Safe deliveries, fresh produce from Abia State farm hub to your table.</span>
              </div>

              {/* Footer */}
              <div className="bems-doc-foot">
                <span>{companyPhone}</span>
                <span>www.bemsfarms.com</span>
                <span>{rcNumber} · {tinNumber}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
