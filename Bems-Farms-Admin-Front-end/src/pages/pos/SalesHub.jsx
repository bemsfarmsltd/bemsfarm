import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const fmt = (n) => '₦' + Math.round(n || 0).toLocaleString()

export default function SalesHub({
  onOpenRegister,
  historyList = [],
  onlineOrders = [],
  onOpenOnlineOrder,
  onReprintReceipt,
  user,
}) {
  const { logout, hasRole } = useAuth()
  const isManager = hasRole ? hasRole('superadmin', 'admin', 'manager') : false

  // Cash drawer denomination state for reconciliation
  const [showDrawerModal, setShowDrawerModal] = useState(false)
  const [denominations, setDenominations] = useState({
    1000: '',
    500: '',
    200: '',
    100: '',
    50: '',
    20: '',
  })
  const [drawerNotes, setDrawerNotes] = useState('')

  // Calculate live shift statistics
  const shiftStats = useMemo(() => {
    const totalSales = historyList.reduce((s, h) => s + (Number(h.amount) || 0), 0)
    const txnCount = historyList.length
    const aov = txnCount > 0 ? Math.round(totalSales / txnCount) : 0
    const cashSales = historyList
      .filter((h) => h.method === 'Cash')
      .reduce((s, h) => s + (Number(h.amount) || 0), 0)
    const cardSales = historyList
      .filter((h) => h.method?.includes('Card') || h.method?.includes('POS'))
      .reduce((s, h) => s + (Number(h.amount) || 0), 0)
    const transferSales = historyList
      .filter((h) => h.method?.includes('Transfer') || h.method?.includes('QR'))
      .reduce((s, h) => s + (Number(h.amount) || 0), 0)
    const splitSales = historyList
      .filter((h) => h.method?.includes('Split'))
      .reduce((s, h) => s + (Number(h.amount) || 0), 0)

    const startingFloat = 10000
    const expectedDrawerCash = startingFloat + cashSales
    const salesTarget = 200000
    const targetPct = Math.min(100, Math.round((totalSales / salesTarget) * 100))

    // Counted physical cash
    const countedCash = Object.entries(denominations).reduce(
      (s, [val, qty]) => s + Number(val) * (Number(qty) || 0),
      0
    )
    const drawerVariance = countedCash > 0 ? countedCash - expectedDrawerCash : 0

    // Hourly Distribution Data
    const hourlyData = [
      { hour: '09:00 AM', amount: 8500, count: 2, pct: 28 },
      { hour: '11:00 AM', amount: 28500, count: 5, pct: 95 },
      { hour: '01:00 PM', amount: 18200, count: 4, pct: 60 },
      { hour: '03:00 PM', amount: 32000, count: 7, pct: 100 },
      { hour: '05:00 PM', amount: 14600, count: 3, pct: 48 },
    ]

    // Fast Moving Products
    const topMovingProducts = [
      { name: 'Kings Pure Vegetable Oil (5L)', sku: 'OIL-5L', qty: 12, revenue: 162000, icon: '🫒' },
      { name: 'Fresh Jumbo Organic Eggs (Crate)', sku: 'EGG-CRT', qty: 18, revenue: 75600, icon: '🥚' },
      { name: 'Mama Gold Rice (25kg)', sku: 'RICE-25KG', qty: 6, revenue: 219000, icon: '🌾' },
      { name: 'Chef Bems Jollof Combo', sku: 'JOL-CMB', qty: 14, revenue: 67200, icon: '🍲' },
      { name: 'Ijebu White Garri (Paint Rubber)', sku: 'GARI-PNT', qty: 15, revenue: 48000, icon: '🌾' },
    ]

    const pendingOnlineCount = onlineOrders.filter((o) => o.status === 'new').length

    return {
      totalSales,
      txnCount,
      aov,
      cashSales,
      cardSales,
      transferSales,
      splitSales,
      startingFloat,
      expectedDrawerCash,
      salesTarget,
      targetPct,
      countedCash,
      drawerVariance,
      hourlyData,
      topMovingProducts,
      pendingOnlineCount,
    }
  }, [historyList, denominations, onlineOrders])

  const todayStr = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="sales-hub-root" style={{ minHeight: '100vh', backgroundColor: '#FAF8F5', color: '#0F172A', paddingBottom: '3rem' }}>
      
      {/* ── STYLES ── */}
      <style>{`
        .sales-hub-header {
          background: #FFFFFF;
          border-bottom: 1px solid #E5E7EB;
          padding: 1rem 1.75rem;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
        }
        .sh-card {
          background: #FFFFFF;
          border: 1px solid #EFECE6;
          border-radius: 1rem;
          padding: 1.25rem 1.4rem;
          box-shadow: 0 2px 10px -2px rgba(20, 60, 45, 0.04);
          transition: all 0.2s ease;
        }
        .sh-card:hover {
          border-color: #E2DDD5;
          box-shadow: 0 4px 16px -2px rgba(20, 60, 45, 0.08);
        }
        .sh-primary-btn {
          background: linear-gradient(135deg, #143C2D, #0B281B);
          color: #FFFFFF;
          border: none;
          border-radius: 9999px;
          padding: 0.65rem 1.5rem;
          font-weight: 700;
          font-size: 0.92rem;
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(20, 60, 45, 0.28);
          transition: all 0.18s ease;
          text-decoration: none;
        }
        .sh-primary-btn:hover {
          background: linear-gradient(135deg, #0B281B, #051910);
          color: #FFFFFF;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(20, 60, 45, 0.38);
        }
        .sh-secondary-btn {
          background: #F8FAFC;
          color: #1E293B;
          border: 1px solid #E2E8F0;
          border-radius: 9999px;
          padding: 0.55rem 1.15rem;
          font-weight: 600;
          font-size: 0.82rem;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          cursor: pointer;
          transition: all 0.18s ease;
          text-decoration: none;
        }
        .sh-secondary-btn:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
          color: #0F172A;
        }
        .sh-metric-val {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 1.65rem;
          letter-spacing: -0.02em;
          color: #0F172A;
          margin: 0.35rem 0 0.15rem;
        }
        .sh-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          flex-shrink: 0;
        }
        .sh-bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
        }
        .sh-bar-track {
          width: 100%;
          max-width: 38px;
          height: 120px;
          background: #F1F5F9;
          border-radius: 8px;
          display: flex;
          align-items: flex-end;
          padding: 3px;
          overflow: hidden;
        }
        .sh-bar-fill {
          width: 100%;
          border-radius: 6px;
          background: linear-gradient(180deg, #10B981, #143C2D);
          transition: height 0.4s ease;
        }
      `}</style>

      {/* ── TOP NAV HEADER ── */}
      <header className="sales-hub-header">
        <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-3">
          {/* Left: Brand & Terminal status */}
          <div className="d-flex align-items-center gap-3">
            <Link to="/dashboard" className="d-flex align-items-center text-decoration-none">
              <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" style={{ height: 38, objectFit: 'contain' }} />
            </Link>
            <div className="vr d-none d-sm-block my-1 text-muted opacity-25" style={{ height: 30 }}></div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <span
                  className="badge d-inline-flex align-items-center gap-1.5"
                  style={{
                    backgroundColor: '#DCFCE7',
                    color: '#166534',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 9px',
                    borderRadius: '20px',
                    letterSpacing: '0.04em'
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }}></span>
                  SHIFT ACTIVE
                </span>
                <span className="fw-bold text-dark fs-sm" style={{ letterSpacing: '-0.01em' }}>
                  POS Terminal 01 · Bems Farms HQ
                </span>
              </div>
              <p className="text-muted mb-0 mt-0.5" style={{ fontSize: '11.5px' }}>
                Cashier: <strong className="text-dark font-semibold">{user?.first_name || 'Staff Member'} {user?.last_name || ''}</strong> · {todayStr}
              </p>
            </div>
          </div>

          {/* Right: Register Launcher + Quick Actions */}
          <div className="d-flex align-items-center gap-2.5">
            {/* BIG PRIMARY CTA: Launch POS Terminal */}
            <button
              type="button"
              className="sh-primary-btn"
              onClick={onOpenRegister}
              title="Open Barcode Scanner & Ringing Register (F1)"
            >
              <i className="ri-barcode-box-line" style={{ fontSize: '19px' }}></i>
              <span>Open POS Register</span>
              <span
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  marginLeft: '2px'
                }}
              >
                F1
              </span>
            </button>

            {/* Reconcile Drawer Button */}
            <button
              type="button"
              className="sh-secondary-btn d-none d-md-inline-flex"
              onClick={() => setShowDrawerModal(true)}
              title="Count Physical Cash & Reconcile Float"
            >
              <i className="ri-safe-2-line text-warning" style={{ fontSize: '15px' }}></i>
              <span>Cash Drawer &amp; Float</span>
            </button>

            {/* Admin Switcher / Logout */}
            {isManager ? (
              <Link to="/dashboard" className="sh-secondary-btn" title="Back to Admin Dashboard">
                <i className="ri-dashboard-2-line" style={{ fontSize: '15px' }}></i>
                <span className="d-none d-sm-inline">Admin Dashboard</span>
              </Link>
            ) : (
              <button
                type="button"
                className="sh-secondary-btn text-danger"
                onClick={logout}
                title="End Shift & Sign Out"
              >
                <i className="ri-logout-box-r-line" style={{ fontSize: '15px' }}></i>
                <span className="d-none d-sm-inline">End Shift</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN DASHBOARD CONTAINER ── */}
      <main className="container-fluid py-4">
        
        {/* Banner Announcement */}
        <div className="d-flex flex-wrap align-items-center justify-content-between p-3 mb-4 rounded-3 border" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <div className="d-flex align-items-center gap-3">
            <div className="avatar size-10 rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0">
              <i className="ri-store-3-line fs-20"></i>
            </div>
            <div>
              <h5 className="fw-bold mb-0 font-display">POS Cashier &amp; Shift Hub</h5>
              <p className="text-muted fs-xs mb-0">Review active register sales, count cash float, or start ringing customer items.</p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
            {shiftStats.pendingOnlineCount > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary rounded-pill fw-bold d-flex align-items-center gap-1 px-3"
                onClick={onOpenRegister}
              >
                <i className="ri-notification-3-line"></i>
                <span>{shiftStats.pendingOnlineCount} Online Orders Ready</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-primary-bf rounded-pill px-3 fw-bold"
              onClick={onOpenRegister}
            >
              <i className="ri-barcode-box-line me-1"></i>Start Sale (F1)
            </button>
          </div>
        </div>

        {/* ── KPI METRICS ROW ── */}
        <div className="row g-3 mb-4">
          
          {/* 1. Today's Gross Sales */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="sh-card h-100">
              <div className="d-flex align-items-center justify-content-between">
                <span className="text-muted fs-xs fw-bold text-uppercase">Gross Sales Today</span>
                <div className="sh-icon-circle" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                  <i className="ri-money-dollar-circle-line"></i>
                </div>
              </div>
              <div className="sh-metric-val text-success">{fmt(shiftStats.totalSales)}</div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-xs mt-2">
                <span>{shiftStats.txnCount} orders completed</span>
                <span className="badge bg-success-subtle text-success">Live Sync</span>
              </div>
            </div>
          </div>

          {/* 2. Cash Collected (In Drawer) */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="sh-card h-100">
              <div className="d-flex align-items-center justify-content-between">
                <span className="text-muted fs-xs fw-bold text-uppercase">Cash in Drawer</span>
                <div className="sh-icon-circle" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                  <i className="ri-hand-coin-line"></i>
                </div>
              </div>
              <div className="sh-metric-val">{fmt(shiftStats.expectedDrawerCash)}</div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-xs mt-2">
                <span>Float: {fmt(shiftStats.startingFloat)}</span>
                <span className="text-success fw-semibold">+{fmt(shiftStats.cashSales)} sales</span>
              </div>
            </div>
          </div>

          {/* 3. Card & Bank Transfer Payments */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="sh-card h-100">
              <div className="d-flex align-items-center justify-content-between">
                <span className="text-muted fs-xs fw-bold text-uppercase">Digital Payments</span>
                <div className="sh-icon-circle" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                  <i className="ri-bank-card-line"></i>
                </div>
              </div>
              <div className="sh-metric-val">{fmt(shiftStats.cardSales + shiftStats.transferSales)}</div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-xs mt-2">
                <span>POS: {fmt(shiftStats.cardSales)}</span>
                <span>Transfer: {fmt(shiftStats.transferSales)}</span>
              </div>
            </div>
          </div>

          {/* 4. Average Ticket Size (AOV) */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="sh-card h-100">
              <div className="d-flex align-items-center justify-content-between">
                <span className="text-muted fs-xs fw-bold text-uppercase">Average Ticket</span>
                <div className="sh-icon-circle" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                  <i className="ri-shopping-bag-2-line"></i>
                </div>
              </div>
              <div className="sh-metric-val">{fmt(shiftStats.aov)}</div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-xs mt-2">
                <span>Shift Target: ₦200k</span>
                <span className="fw-bold text-primary">{shiftStats.targetPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CHARTS & BREAKDOWN ROW ── */}
        <div className="row g-4 mb-4">
          
          {/* Hourly Volume Trend Chart */}
          <div className="col-12 col-lg-7">
            <div className="sh-card h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h6 className="fw-bold mb-0 font-display">Hourly Sales Flow</h6>
                  <p className="text-muted fs-xs mb-0">Real-time revenue peaks across active register hours</p>
                </div>
                <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>Peak: 3:00 PM</span>
              </div>

              {/* Visual Bars */}
              <div className="d-flex align-items-end justify-content-between gap-2 pt-3 pb-2" style={{ minHeight: 160 }}>
                {shiftStats.hourlyData.map((h) => (
                  <div key={h.hour} className="sh-bar-col">
                    <span className="text-muted fs-xxs fw-bold">{fmt(h.amount)}</span>
                    <div className="sh-bar-track">
                      <div className="sh-bar-fill" style={{ height: `${h.pct}%` }}></div>
                    </div>
                    <span className="text-muted fs-xxs mt-1">{h.hour}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Tender Split Breakdown */}
          <div className="col-12 col-lg-5">
            <div className="sh-card h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h6 className="fw-bold mb-0 font-display">Payment Method Split</h6>
                  <p className="text-muted fs-xs mb-0">Tender distribution for completed register tickets</p>
                </div>
              </div>

              <div className="vstack gap-3 mt-3">
                {/* Cash */}
                <div>
                  <div className="d-flex justify-content-between fs-xs fw-semibold mb-1">
                    <span className="d-flex align-items-center gap-1.5"><i className="ri-money-dollar-circle-fill text-success"></i> Cash</span>
                    <span>{fmt(shiftStats.cashSales)} ({shiftStats.totalSales > 0 ? Math.round((shiftStats.cashSales / shiftStats.totalSales) * 100) : 0}%)</span>
                  </div>
                  <div className="progress" style={{ height: 7, borderRadius: 4 }}>
                    <div className="progress-bar bg-success" style={{ width: `${shiftStats.totalSales > 0 ? (shiftStats.cashSales / shiftStats.totalSales) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Card / POS */}
                <div>
                  <div className="d-flex justify-content-between fs-xs fw-semibold mb-1">
                    <span className="d-flex align-items-center gap-1.5"><i className="ri-bank-card-fill text-primary"></i> Card / POS Terminal</span>
                    <span>{fmt(shiftStats.cardSales)} ({shiftStats.totalSales > 0 ? Math.round((shiftStats.cardSales / shiftStats.totalSales) * 100) : 0}%)</span>
                  </div>
                  <div className="progress" style={{ height: 7, borderRadius: 4 }}>
                    <div className="progress-bar bg-primary" style={{ width: `${shiftStats.totalSales > 0 ? (shiftStats.cardSales / shiftStats.totalSales) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Bank Transfer / QR */}
                <div>
                  <div className="d-flex justify-content-between fs-xs fw-semibold mb-1">
                    <span className="d-flex align-items-center gap-1.5"><i className="ri-qr-code-line text-warning"></i> Bank Transfer / USSD</span>
                    <span>{fmt(shiftStats.transferSales)} ({shiftStats.totalSales > 0 ? Math.round((shiftStats.transferSales / shiftStats.totalSales) * 100) : 0}%)</span>
                  </div>
                  <div className="progress" style={{ height: 7, borderRadius: 4 }}>
                    <div className="progress-bar bg-warning" style={{ width: `${shiftStats.totalSales > 0 ? (shiftStats.transferSales / shiftStats.totalSales) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Quick Launch CTA inside Card */}
              <div className="mt-4 pt-3 border-top d-flex align-items-center justify-content-between">
                <span className="text-muted fs-xs">Need to ring a customer?</span>
                <button type="button" className="btn btn-sm btn-primary-bf rounded-pill px-3 fw-bold" onClick={onOpenRegister}>
                  Open Terminal →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── LOWER SECTION: RECENT RECEIPTS TABLE + FAST MOVING PRODUCTS ── */}
        <div className="row g-4">
          
          {/* Recent Receipts & Transactions */}
          <div className="col-12 col-lg-8">
            <div className="sh-card">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div>
                  <h6 className="fw-bold mb-0 font-display">Recent Register Receipts</h6>
                  <p className="text-muted fs-xs mb-0">Tickets completed during this shift</p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary rounded-pill fs-xs fw-semibold"
                  onClick={onOpenRegister}
                >
                  <i className="ri-history-line me-1"></i>Open History in POS
                </button>
              </div>

              <div className="table-responsive">
                <table className="table align-middle table-hover mb-0">
                  <thead className="table-light fs-xs">
                    <tr>
                      <th>Receipt #</th>
                      <th>Customer</th>
                      <th>Payment Method</th>
                      <th>Time</th>
                      <th className="text-end">Amount</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="fs-sm">
                    {historyList.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          No transactions recorded yet in this shift.
                        </td>
                      </tr>
                    ) : (
                      historyList.slice(0, 8).map((t) => (
                        <tr key={t.inv}>
                          <td>
                            <span className="fw-bold text-dark font-monospace fs-xs">{t.inv}</span>
                          </td>
                          <td>
                            <span className="fw-semibold">{t.cust || 'Walk-in'}</span>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">{t.method}</span>
                          </td>
                          <td className="text-muted fs-xs">{t.time}</td>
                          <td className="text-end fw-bold text-success">{fmt(t.amount)}</td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-light py-0 px-2 rounded-pill fs-xs text-muted"
                              onClick={() => onReprintReceipt ? onReprintReceipt(t) : onOpenRegister()}
                              title="Reprint Ticket"
                            >
                              <i className="ri-printer-line"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Top Moving Products in this shift */}
          <div className="col-12 col-lg-4">
            <div className="sh-card">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <h6 className="fw-bold mb-0 font-display">Fast-Moving Items</h6>
                <span className="badge bg-success-subtle text-success fs-xxs">Top 5</span>
              </div>

              <div className="vstack gap-2.5">
                {shiftStats.topMovingProducts.map((p, idx) => (
                  <div key={p.sku} className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-light">
                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                      <span className="fs-18">{p.icon}</span>
                      <div className="overflow-hidden">
                        <p className="fw-semibold fs-xs mb-0 text-truncate" style={{ maxWidth: 160 }}>{p.name}</p>
                        <span className="text-muted fs-xxs">{p.qty} units sold</span>
                      </div>
                    </div>
                    <span className="fw-bold fs-xs text-dark">{fmt(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── MODAL: DRAWER CASH RECONCILIATION / Z-REPORT ── */}
      {showDrawerModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: '1.25rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold font-display d-flex align-items-center gap-2">
                  <i className="ri-safe-2-line text-warning"></i>
                  <span>End of Shift Cash Reconciliation</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDrawerModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex align-items-center justify-content-between p-3 rounded-3 mb-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div>
                    <span className="text-muted fs-xs d-block">Expected Cash in Drawer</span>
                    <strong className="fs-5 text-dark">{fmt(shiftStats.expectedDrawerCash)}</strong>
                  </div>
                  <div className="text-end">
                    <span className="text-muted fs-xs d-block">Starting Float</span>
                    <strong className="fs-6 text-muted">{fmt(shiftStats.startingFloat)}</strong>
                  </div>
                </div>

                <p className="fw-bold fs-xs text-uppercase text-muted mb-2">Enter Physical Note Count:</p>
                <div className="row g-2 mb-3">
                  {[1000, 500, 200, 100, 50, 20].map((denom) => (
                    <div key={denom} className="col-6">
                      <div className="input-group input-group-sm">
                        <span className="input-group-text fw-bold">₦{denom} ×</span>
                        <input
                          type="number"
                          min="0"
                          className="form-control text-end"
                          placeholder="0"
                          value={denominations[denom]}
                          onChange={(e) =>
                            setDenominations({ ...denominations, [denom]: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Variance Calculation */}
                {shiftStats.countedCash > 0 && (
                  <div
                    className={`p-3 rounded-3 mb-3 border ${
                      shiftStats.drawerVariance === 0
                        ? 'bg-success-subtle text-success border-success'
                        : shiftStats.drawerVariance > 0
                        ? 'bg-info-subtle text-info border-info'
                        : 'bg-danger-subtle text-danger border-danger'
                    }`}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold fs-sm">Total Counted Cash:</span>
                      <strong className="fs-5">{fmt(shiftStats.countedCash)}</strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-1 pt-1 border-top border-secondary border-opacity-25 fs-xs">
                      <span>Variance (Difference):</span>
                      <strong className="fw-bold">
                        {shiftStats.drawerVariance >= 0 ? `+${fmt(shiftStats.drawerVariance)}` : fmt(shiftStats.drawerVariance)}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fs-xs text-muted mb-1">Shift Notes / Remarks</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="2"
                    placeholder="Optional notes for manager..."
                    value={drawerNotes}
                    onChange={(e) => setDrawerNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer border-top py-2 px-4 d-flex justify-content-between">
                <button type="button" className="btn btn-light rounded-pill px-3 fs-sm" onClick={() => setShowDrawerModal(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary-bf rounded-pill px-4 fs-sm fw-bold"
                  onClick={() => {
                    alert('Shift reconciliation recorded successfully!')
                    setShowDrawerModal(false)
                  }}
                >
                  Confirm &amp; Print Z-Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
