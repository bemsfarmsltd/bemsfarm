import React, { useState, useEffect, useMemo } from 'react'
import QRCode from 'qrcode'
import api from '../../lib/api'
import './bems-document.css'
import { numberToWords } from './BemsOfficialDocument'
import BemsOfficialStamp from './BemsOfficialStamp'

/**
 * Format date to "24 Sep 2026" or "24 Sep 2026, 01:00 PM"
 */
function formatDate(val, withTime = false) {
  if (!val) return '—'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    if (withTime) {
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    }
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(val)
  }
}

function cleanStatementDescription(desc) {
  if (!desc) return ''
  return String(desc)
    .replace(/\s*\([^)]*Customer Fee[^)]*\)/gi, '')
    .replace(/\s*\(Customer Fee.*?\)/gi, '')
    .replace(/\s*\(Customer Delivery Fee.*?\)/gi, '')
    .trim()
}

/**
 * Generate a deterministic security code from reference and balance
 */
function generateSecurityCode(ref, amount) {
  const seed = (String(ref) + String(amount || 0)).toUpperCase().replace(/[^A-Z0-9]/g, '')
  let hash1 = 0x811c9dc5
  let hash2 = 0x55555555
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i)
    hash1 = (hash1 ^ c) * 0x01000193
    hash2 = (hash2 + c) * 0x45d9f3b
  }
  const h1 = Math.abs(hash1).toString(16).padStart(8, '0').slice(0, 8).toUpperCase()
  const h2 = Math.abs(hash2).toString(16).padStart(8, '0').slice(0, 8).toUpperCase()
  return `${h1.slice(0, 4)}-${h1.slice(4, 8)}-${h2.slice(0, 4)}-${h2.slice(4, 8)}`
}

/**
 * BemsDriverStatementDocument
 * Executive, audited Statement of Account for Bems Farms Logistics Drivers.
 * Supports OPay / Moniepoint style duration filtering and strict multi-page rules:
 * - Exactly 1 Header (Page 1 only)
 * - Exactly 1 Footer (Last Page only, docked at bottom)
 */
export default function BemsDriverStatementDocument({
  driver = {},
  summary = {},
  company = {},
  statement = [],
  period = {},
  signatureUrl = null,
  showFilterToolbar = true,
  onDateRangeChange,
}) {
  const driverName = driver.name || 'Bems Farms Driver'
  const driverPhone = driver.phone || '—'
  const driverEmail = driver.email || '—'
  const vehicleType = driver.vehicle_type ? (driver.vehicle_type.charAt(0).toUpperCase() + driver.vehicle_type.slice(1)) : 'Motorcycle'
  const vehiclePlate = driver.vehicle_plate || '—'
  const licenseNumber = driver.license_number || '—'
  const walletAccountNo = driver.wallet_account_number || `DRV-${String(driver.id || 1).padStart(4, '0')}`

  // Driver Settlement Bank Details
  const bankName = driver.bank_name || 'Designated Commercial Bank'
  const accountNumber = driver.account_number || '—'
  const accountName = driver.account_name || driverName

  // ── OPay / Moniepoint Style Duration Filter State ──
  const [filterPreset, setFilterPreset] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Compute active date boundaries
  const activeDateRange = useMemo(() => {
    const now = new Date()
    if (filterPreset === '7d') {
      const s = new Date(Date.now() - 7 * 86400000)
      return { start: s.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) }
    }
    if (filterPreset === '30d') {
      const s = new Date(Date.now() - 30 * 86400000)
      return { start: s.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) }
    }
    if (filterPreset === '90d') {
      const s = new Date(Date.now() - 90 * 86400000)
      return { start: s.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) }
    }
    if (filterPreset === 'this_month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: s.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) }
    }
    if (filterPreset === 'prev_month') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) }
    }
    if (filterPreset === 'custom') {
      return { start: customStart || null, end: customEnd || null }
    }
    return { start: null, end: null }
  }, [filterPreset, customStart, customEnd])

  // Filter transactions within range
  const filteredStatement = useMemo(() => {
    if (!activeDateRange.start && !activeDateRange.end) return statement
    const sTime = activeDateRange.start ? new Date(activeDateRange.start).getTime() : 0
    const eTime = activeDateRange.end ? new Date(new Date(activeDateRange.end).setHours(23, 59, 59, 999)).getTime() : Infinity
    return statement.filter(item => {
      const t = new Date(item.date).getTime()
      return t >= sTime && t <= eTime
    })
  }, [statement, activeDateRange])

  // Compute opening balance prior to activeDateRange.start
  const computedOpeningBalance = useMemo(() => {
    if (!activeDateRange.start) return Number(summary.opening_balance || 0)
    const sTime = new Date(activeDateRange.start).getTime()
    let priorNet = 0
    for (const item of statement) {
      if (new Date(item.date).getTime() < sTime) {
        const amt = parseFloat(item.amount) || 0
        if (item.type === 'credit') priorNet += amt
        else priorNet -= amt
      }
    }
    return Math.max(0, priorNet + Number(summary.opening_balance || 0))
  }, [statement, activeDateRange, summary.opening_balance])

  // Compute summary figures
  const totalCredits = useMemo(() => {
    return filteredStatement.reduce((acc, item) => acc + (item.type === 'credit' ? (parseFloat(item.amount) || 0) : 0), 0)
  }, [filteredStatement])

  const totalDebits = useMemo(() => {
    return filteredStatement.reduce((acc, item) => acc + (item.type === 'debit' ? (parseFloat(item.amount) || 0) : 0), 0)
  }, [filteredStatement])

  const pendingPayouts = Number(summary.pending_payouts || 0)
  const closingBalance = Math.max(0, computedOpeningBalance + totalCredits - totalDebits - pendingPayouts)

  const totalTrips = useMemo(() => {
    if (!activeDateRange.start && !activeDateRange.end) {
      return Number(summary.total_trips || driver.total_delivered || filteredStatement.filter(s => s.category === 'delivery_commission' || s.category === 'delivery_drop').length || 0)
    }
    return filteredStatement.filter(s => s.category === 'delivery_commission' || s.category === 'delivery_drop').length
  }, [filteredStatement, activeDateRange, summary.total_trips, driver.total_delivered])

  // Statement Period
  const periodStart = activeDateRange.start || summary.period_start || period.start_date || (filteredStatement.length > 0 ? filteredStatement[0].date : driver.joined_at || new Date())
  const periodEnd = activeDateRange.end || summary.period_end || period.end_date || (filteredStatement.length > 0 ? filteredStatement[filteredStatement.length - 1].date : new Date())
  const issuedDate = formatDate(new Date())

  // Statement Reference Code
  const statementRef = `SOA-${walletAccountNo}-${new Date().getFullYear()}`

  // Amount in Words
  const balanceInWords = numberToWords(closingBalance)

  // Verification Security Code
  const securityCode = generateSecurityCode(statementRef, closingBalance)

  // Scannable QR Code
  const verifyUrl = useMemo(() => {
    let origin = 'https://bemsfarms.com'
    if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes(':517')) {
      origin = window.location.origin
    }
    return `${origin}/verify?type=driver_statement&ref=${encodeURIComponent(statementRef)}&code=${encodeURIComponent(securityCode)}`
  }, [statementRef, securityCode])

  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    let isMounted = true
    QRCode.toDataURL(verifyUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f3622',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    }).then(url => {
      if (isMounted) setQrDataUrl(url)
    }).catch(err => {
      console.warn('QR Code generation error:', err)
    })
    return () => { isMounted = false }
  }, [verifyUrl])

  // Company Details
  let companyName = company.name || 'Bems Farms Global Ltd'
  if (!companyName || companyName.includes('Limited') || companyName === 'Bems Farms') {
    companyName = 'Bems Farms Global Ltd'
  }
  const companyAddress = company.address || 'Central Farm Settlement Hub, Umuahia, Abia State'
  const companyEmail = company.email || 'corporate@bemsfarms.com'
  const companyPhone = (company.phone && !company.phone.includes('800 236 7326')) ? company.phone : ''

  // Signature resolution with fallback to settings
  const [fetchedSig, setFetchedSig] = useState('')
  useEffect(() => {
    if (!signatureUrl && !company.signature_url && !company.company_signature_url) {
      api.get('/admin/settings/invoices')
        .then(res => {
          if (res.data?.settings?.company_signature_url) {
            setFetchedSig(res.data.settings.company_signature_url)
          }
        })
        .catch(() => {})
    }
  }, [signatureUrl, company.signature_url, company.company_signature_url])

  const effectiveSignature = signatureUrl || company.signature_url || company.company_signature_url || fetchedSig || ''

  // ── Multi-Page Chunking Logic ──
  // Rule: Statement has exactly 1 Official Header (Page 1) and 1 Official Footer (Last Page).
  // Single page fits up to 4 transactions alongside all summary cards, totals, and signatures.
  // When multi-page, closing totals & signatures move to the final page, allowing Page 1 to comfortably hold up to 10 transactions.
  const isMultiPage = filteredStatement.length > 4

  let page1Count = Math.min(filteredStatement.length, 10)
  if (isMultiPage && filteredStatement.length - page1Count < 2) {
    page1Count = Math.max(4, filteredStatement.length - 2)
  }

  const page1Rows = isMultiPage ? filteredStatement.slice(0, page1Count) : filteredStatement
  const afterPage1 = isMultiPage ? filteredStatement.slice(page1Count) : []

  const remainingPages = []
  if (isMultiPage && afterPage1.length > 0) {
    let remaining = [...afterPage1]
    while (remaining.length > 0) {
      if (remaining.length <= 8) {
        remainingPages.push({ rows: remaining, isFinal: true })
        remaining = []
      } else {
        const chunkSize = Math.min(12, remaining.length - 2)
        remainingPages.push({ rows: remaining.slice(0, chunkSize), isFinal: false })
        remaining = remaining.slice(chunkSize)
      }
    }
  }

  const totalPages = isMultiPage ? 1 + remainingPages.length : 1

  return (
    <div className="bems-doc-root">

      {/* ── OPay & Moniepoint Style Duration Filter Bar (Screen Only) ── */}
      {showFilterToolbar && (
        <div className="bems-stmt-filter-container no-print">
          <div className="bems-stmt-filter-header">
            <span className="bems-stmt-filter-title">
              <i className="ri-calendar-event-line" style={{ color: '#154a2f' }} />
              Statement Duration Filter
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Showing {filteredStatement.length} {filteredStatement.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>

          <div className="bems-stmt-filter-pills">
            {[
              { id: 'all', label: 'All Time' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: 'Last 90 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'prev_month', label: 'Previous Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                className={`bems-stmt-pill-btn ${filterPreset === preset.id ? 'active' : ''}`}
                onClick={() => setFilterPreset(preset.id)}
              >
                {filterPreset === preset.id && <i className="ri-check-line" style={{ fontSize: 12 }} />}
                {preset.label}
              </button>
            ))}
          </div>

          {filterPreset === 'custom' && (
            <div className="bems-stmt-custom-inputs">
              <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>From:</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
              <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>To:</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
              {(customStart || customEnd) && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6 }}
                  onClick={() => { setCustomStart(''); setCustomEnd('') }}
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE 1 (Always Has the Only Official Header)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className={`bems-doc-page ${isMultiPage ? 'bems-doc-page-1-multi' : ''}`}>
        <div className="bems-doc-body" style={isMultiPage ? { paddingBottom: '24px' } : undefined}>

          {/* ── OFFICIAL HEADER (PAGE 1 ONLY) ── */}
          <header className="bems-doc-head">
            <div>
              <div className="bems-doc-logo">
                <img
                  src="/bemsfarms_logo.png"
                  alt="Bems Farms"
                  onError={(e) => {
                    if (!e.currentTarget.src.includes('bemsfarms_logo_compact.png')) {
                      e.currentTarget.src = '/bemsfarms_logo_compact.png'
                    }
                  }}
                />
              </div>
              <div className="bems-doc-dept-badge">
                <span className="badge-pulse-dot" />
                Logistics & Fleet Operations Hub
              </div>
              <div className="bems-doc-co">
                <b>{companyName}</b> · RC: 1892041<br />
                {companyAddress}<br />
                {companyEmail}{companyPhone ? ` · ${companyPhone}` : ''}
              </div>
            </div>

            <div className="bems-doc-meta-right">
              <div className="bems-doc-status-badge">
                <span className="badge-dot" />
                Official Settlement Record
              </div>
              <h1>Statement of Account</h1>
              <div className="bems-doc-ref-wrap">
                <span className="bems-doc-ref-pill">
                  <span className="ref-prefix">DOCUMENT ID</span>
                  {statementRef}
                </span>
              </div>
              <div className="bems-doc-dates">
                <span>Period: <b>{formatDate(periodStart)} – {formatDate(periodEnd)}</b></span>
                <span className="dt-sep">·</span>
                <span>Generated: <b>{issuedDate}</b></span>
              </div>
            </div>
          </header>

          {/* ── HERO BANNER WITH GUILLOCHE & STAMP (PAGE 1 ONLY) ── */}
          <section className="bems-doc-hero">
            <svg
              className="bems-doc-guil"
              viewBox="0 0 720 190"
              preserveAspectRatio="none"
              fill="none"
              stroke="#9fd6a9"
              strokeWidth=".6"
              opacity=".22"
            >
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
                <div className="cap">Opening Balance</div>
                <p>₦{computedOpeningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <div className="cap">Total Earned (Gross)</div>
                <p>+₦{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <div className="cap">Total Disbursed</div>
                <p>-₦{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <div className="cap">Completed Drops</div>
                <p>{totalTrips} {totalTrips === 1 ? 'Delivery' : 'Deliveries'}</p>
              </div>
              <div>
                <div className="cap">Wallet Status</div>
                <p style={{ color: driver.wallet_is_frozen ? '#fca5a5' : '#9fe0b3' }}>
                  {driver.wallet_is_frozen ? 'Frozen / Suspended' : 'Active · Good Standing'}
                </p>
              </div>
            </div>
          </section>

          {/* ── DRIVER PROFILE & SETTLEMENT ACCOUNT DETAILS (PAGE 1 ONLY) ── */}
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

            <div className="bems-doc-party help">
              <div className="cap">Designated Bank Settlement Details</div>
              <div className="nm">{bankName}</div>
              <p>
                <b>Account Name:</b> {accountName}<br />
                <b>Account Number (NUBAN):</b> <span className="mono">{accountNumber}</span><br />
                <b>Settlement Mode:</b> Monnify Instant / Scheduled Fleet Batch<br />
                {companyPhone && <><b>Logistics Helpline:</b> {companyPhone}</>}
              </p>
            </div>
          </section>

          {/* ── 4-KPI STRIP (PAGE 1 ONLY) ── */}
          <div className="bems-stmt-kpi-grid">
            <div className="bems-stmt-kpi-card">
              <div className="kpi-label">Opening Balance</div>
              <div className="kpi-val">₦{computedOpeningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bems-stmt-kpi-card">
              <div className="kpi-label">Total Credits (+)</div>
              <div className="kpi-val" style={{ color: '#166534' }}>
                +₦{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bems-stmt-kpi-card">
              <div className="kpi-label">Total Withdrawals (-)</div>
              <div className="kpi-val text-danger" style={{ color: '#991B1B' }}>
                -₦{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bems-stmt-kpi-card highlight">
              <div className="kpi-label">Net Closing Balance</div>
              <div className="kpi-val" style={{ color: '#0f3622' }}>
                ₦{closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* ── ITEMIZED STATEMENT LEDGER TABLE (PAGE 1 ROWS) ── */}
          <table className="bems-doc-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>#</th>
                <th style={{ width: '13%' }}>Date</th>
                <th>Activity & Transaction Details</th>
                <th style={{ width: '16%' }}>Reference</th>
                <th className="c" style={{ width: '10%' }}>Type</th>
                <th className="r" style={{ width: '14%' }}>Amount (₦)</th>
                <th className="r" style={{ width: '15%' }}>Balance (₦)</th>
              </tr>
            </thead>
            <tbody>
              {page1Rows && page1Rows.length > 0 ? (
                page1Rows.map((ev, idx) => {
                  const isCredit = ev.type === 'credit'
                  const amt = parseFloat(ev.amount) || 0
                  const runningBal = ev.running_balance !== undefined ? parseFloat(ev.running_balance) : null

                  return (
                    <tr key={ev.id || idx}>
                      <td className="mono">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="mono" style={{ fontSize: 10.5 }}>{formatDate(ev.date)}</td>
                      <td className="it">
                        <b>{cleanStatementDescription(ev.description) || (isCredit ? 'Delivery Drop Commission' : 'Bank Withdrawal')}</b>
                        {ev.order_id && (
                          <span className="bems-doc-tag" style={{ background: '#e0f2fe', color: '#0369a1', marginLeft: 6 }}>
                            Order #{ev.order_id}
                          </span>
                        )}
                        {ev.delivery_address && (
                          <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 3 }}>
                            {ev.delivery_address}
                          </div>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 10, color: '#0f3622', fontWeight: 600 }}>
                        {ev.reference || '—'}
                      </td>
                      <td className="c">
                        <span className={isCredit ? 'bems-stmt-badge-cr' : 'bems-stmt-badge-dr'}>
                          {isCredit ? 'CR' : 'DR'}
                        </span>
                      </td>
                      <td className={`r mono ${isCredit ? 'bems-stmt-amt-cr' : 'bems-stmt-amt-dr'}`}>
                        {isCredit ? '+' : '-'}₦{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="r mono" style={{ fontWeight: 600, color: '#0f3622' }}>
                        {runningBal !== null
                          ? `₦${runningBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="7" className="c" style={{ padding: '30px 12px', color: '#64748b' }}>
                    No recorded transactions during this statement period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* If statement fits on 1 page: Totals & Sign-off on Page 1 */}
          {!isMultiPage && (
            <>
              {/* Verification & Totals */}
              <section className="bems-doc-vt">
                <div className="bems-doc-verify">
                  <div className="qr" style={{ padding: 4, background: '#ffffff', border: '1px solid #c9d6ce', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Verify Driver Statement QR Code"
                        style={{ width: 72, height: 72, display: 'block', imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div style={{ width: 72, height: 72, display: 'grid', placeItems: 'center', background: '#eef7f2', color: '#0f3622', fontWeight: 'bold', fontSize: 11 }}>
                        QR
                      </div>
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
                      <dd className="mono" style={{ color: '#d97706' }}>
                        ₦{pendingPayouts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </dd>
                    </>
                  )}

                  <dt className="grand">Closing Balance</dt>
                  <dd className="grand">
                    <span className="naira" style={{ fontSize: 15 }}>₦</span>
                    {closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>

                  <dt>Settlement Account</dt>
                  <dd className="bal mono" style={{ fontSize: 10 }}>{accountNumber} ({bankName})</dd>
                </dl>
              </section>

              {/* Sign-off & Audit Notice (Together with Totals at the Top) */}
              <section className="bems-doc-sign">
                <div className="bems-doc-keep terms">
                  <b>Audit & Settlement Notice.</b> This Statement of Account reflects all verified delivery compensations, bonuses, adjustments, and electronic bank settlements recorded in the Bems Farms driver settlement system. All figures are audited and reconciled against delivery telemetry and payment gateway logs. Please report any discrepancies within 14 days.
                </div>

                <div className="bems-doc-sign-right">
                  <div className="bems-doc-sig">
                    {effectiveSignature ? (
                      <img src={effectiveSignature} alt="Authorised Signature" className="bems-doc-sig-img" />
                    ) : (
                      <div className="bems-doc-sig-placeholder" />
                    )}
                    <div className="ln" />
                    <b>For {companyName}</b>
                    <span>Financial Controller &amp; Head of Logistics</span>
                  </div>
                  <div className="bems-doc-stamp-wrapper">
                    <BemsOfficialStamp
                      size={82}
                      companyName={companyName}
                    />
                  </div>
                </div>
              </section>
            </>
          )}

        </div>

        {/* ── Page 1 Bottom: Either Only Footer (if 1 Page) OR Continuation Indicator (NO FOOTER if 2 Pages) ── */}
        {!isMultiPage ? (
          <div className="bems-doc-footer-group">
            <div className="bems-doc-thanks">
              <h3>Thank you for powering Bems Farms logistics.</h3>
              <span>Safe deliveries, fresh produce from Abia State farm hub to your table.</span>
            </div>
            <div className="bems-doc-foot">
              <span>{companyPhone || 'Logistics & Fleet Hub'}</span>
              <span>www.bemsfarms.com</span>
              <span>{companyEmail}</span>
            </div>
          </div>
        ) : (
          <div className="bems-stmt-page-indicator">
            <span>Statement {statementRef} · Driver: {driverName}</span>
            <span style={{ fontWeight: 600, color: '#0f3622' }}>Page 1 of {totalPages} · Continues on Page 2 ──►</span>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE 2 (NO HEADER — Table Continuation, Totals, Signature, & ONLY FOOTER)
          ══════════════════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════════════════
          CONTINUATION PAGES (Discreet Continuation Head, Ledger, & Final Sign-off)
          ══════════════════════════════════════════════════════════════════════ */}
      {isMultiPage && remainingPages.map((page, pageIdx) => {
        const pageNum = pageIdx + 2
        let priorRowsCount = page1Rows.length
        for (let i = 0; i < pageIdx; i++) {
          priorRowsCount += remainingPages[i].rows.length
        }

        return (
          <div
            key={pageNum}
            className={`bems-doc-page ${!page.isFinal ? 'bems-doc-page-intermediate' : ''}`}
          >
            <div
              className="bems-doc-body"
              style={!page.isFinal ? { paddingBottom: '24px' } : undefined}
            >
              {/* Discreet Continuation Bar (NO HEADER ON CONTINUATION PAGES) */}
              <div className="bems-stmt-page-head">
                <span>Official Statement of Account (Continued) — {statementRef}</span>
                <span>Page {pageNum} of {totalPages}</span>
              </div>

              {/* Table Continuation */}
              <table className="bems-doc-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '13%' }}>Date</th>
                    <th>Activity & Transaction Details</th>
                    <th style={{ width: '16%' }}>Reference</th>
                    <th className="c" style={{ width: '10%' }}>Type</th>
                    <th className="r" style={{ width: '14%' }}>Amount (₦)</th>
                    <th className="r" style={{ width: '15%' }}>Balance (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((ev, idx) => {
                    const isCredit = ev.type === 'credit'
                    const amt = parseFloat(ev.amount) || 0
                    const runningBal = ev.running_balance !== undefined ? parseFloat(ev.running_balance) : null

                    return (
                      <tr key={ev.id || idx}>
                        <td className="mono">{String(priorRowsCount + idx + 1).padStart(2, '0')}</td>
                        <td className="mono" style={{ fontSize: 10.5 }}>{formatDate(ev.date)}</td>
                        <td className="it">
                          <b>{cleanStatementDescription(ev.description) || (isCredit ? 'Delivery Drop Commission' : 'Bank Withdrawal')}</b>
                          {ev.order_id && (
                            <span className="bems-doc-tag" style={{ background: '#e0f2fe', color: '#0369a1', marginLeft: 6 }}>
                              Order #{ev.order_id}
                            </span>
                          )}
                          {ev.delivery_address && (
                            <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 3 }}>
                              {ev.delivery_address}
                            </div>
                          )}
                        </td>
                        <td className="mono" style={{ fontSize: 10, color: '#0f3622', fontWeight: 600 }}>
                          {ev.reference || '—'}
                        </td>
                        <td className="c">
                          <span className={isCredit ? 'bems-stmt-badge-cr' : 'bems-stmt-badge-dr'}>
                            {isCredit ? 'CR' : 'DR'}
                          </span>
                        </td>
                        <td className={`r mono ${isCredit ? 'bems-stmt-amt-cr' : 'bems-stmt-amt-dr'}`}>
                          {isCredit ? '+' : '-'}₦{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="r mono" style={{ fontWeight: 600, color: '#0f3622' }}>
                          {runningBal !== null
                            ? `₦${runningBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* If final page: Totals, Verification & Signature */}
              {page.isFinal ? (
                <>
                  {/* Verification Box & Reconciliation Totals */}
                  <section className="bems-doc-vt">
                    <div className="bems-doc-verify">
                      <div className="qr" style={{ padding: 4, background: '#ffffff', border: '1px solid #c9d6ce', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="Verify Driver Statement QR Code"
                            style={{ width: 68, height: 68, display: 'block', imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <div style={{ width: 68, height: 68, display: 'grid', placeItems: 'center', background: '#eef7f2', color: '#0f3622', fontWeight: 'bold', fontSize: 11 }}>
                            QR
                          </div>
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
                          <dd className="mono" style={{ color: '#d97706' }}>
                            ₦{pendingPayouts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </dd>
                        </>
                      )}

                      <dt className="grand">Closing Balance</dt>
                      <dd className="grand">
                        <span className="naira" style={{ fontSize: 15 }}>₦</span>
                        {closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </dd>

                      <dt>Settlement Account</dt>
                      <dd className="bal mono" style={{ fontSize: 10 }}>{accountNumber} ({bankName})</dd>
                    </dl>
                  </section>

                  {/* Sign-off & Audit Notice */}
                  <section className="bems-doc-sign">
                    <div className="bems-doc-keep terms">
                      <b>Audit & Settlement Notice.</b> This Statement of Account reflects all verified delivery compensations, bonuses, adjustments, and electronic bank settlements recorded in the Bems Farms driver settlement system. All figures are audited and reconciled against delivery telemetry and payment gateway logs. Please report any discrepancies within 14 days.
                    </div>

                    <div className="bems-doc-sign-right">
                      <div className="bems-doc-sig">
                        {effectiveSignature ? (
                          <img src={effectiveSignature} alt="Authorised Signature" className="bems-doc-sig-img" />
                        ) : (
                          <div className="bems-doc-sig-placeholder" />
                        )}
                        <div className="ln" />
                        <b>For {companyName}</b>
                        <span>Financial Controller &amp; Head of Logistics</span>
                      </div>
                      <div className="bems-doc-stamp-wrapper">
                        <BemsOfficialStamp
                          size={82}
                          companyName={companyName}
                        />
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <div className="bems-stmt-page-indicator">
                  <span>Statement {statementRef} · Driver: {driverName}</span>
                  <span style={{ fontWeight: 600, color: '#0f3622' }}>
                    Page {pageNum} of {totalPages} · Continues on Page {pageNum + 1} ──►
                  </span>
                </div>
              )}

            </div>

            {/* ── FOOTER GROUP (ONLY ON THE FINAL PAGE) ── */}
            {page.isFinal && (
              <div className="bems-doc-footer-group">
                <div className="bems-doc-thanks">
                  <h3>Thank you for powering Bems Farms logistics.</h3>
                  <span>Safe deliveries, fresh produce from Abia State farm hub to your table.</span>
                </div>

                <div className="bems-doc-foot">
                  <span>{companyPhone || 'Logistics & Fleet Hub'}</span>
                  <span>www.bemsfarms.com</span>
                  <span>{companyEmail}</span>
                </div>
              </div>
            )}

          </div>
        )
      })}

    </div>
  )
}

/**
 * Clean Print Utility for Official Documents
 * Uses an invisible in-DOM iframe to preserve same-origin assets, fonts,
 * and prevent Chrome print preview from clipping headers or showing blank screens.
 */
export function printOfficialDocument(targetSelector = '.bems-doc-print-target', title = 'Commission Statement of Account - Bems Farms') {
  const target = typeof targetSelector === 'string' ? document.querySelector(targetSelector) : targetSelector
  const originalTitle = document.title
  if (!target) {
    try {
      document.title = title
      window.print()
    } finally {
      setTimeout(() => {
        document.title = originalTitle
      }, 3000)
    }
    return
  }

  // Remove any lingering print iframes
  const oldIframe = document.getElementById('bems-doc-print-iframe')
  if (oldIframe) oldIframe.remove()

  // Create an invisible in-DOM iframe
  const iframe = document.createElement('iframe')
  iframe.id = 'bems-doc-print-iframe'
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  iframe.style.zIndex = '-9999'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document

  // Copy stylesheets, stripping any conflicting visibility:hidden rules
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(s => {
      const html = s.outerHTML
      return html.replace(/visibility\s*:\s*hidden\s*!important/gi, '')
    })
    .join('\n')

  const contentHtml = target.innerHTML

  doc.open()
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${styles}
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      visibility: visible !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      width: 100% !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print, .no-print * {
      display: none !important;
      visibility: hidden !important;
    }
    .bems-doc-root {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    .bems-doc-page {
      margin: 0 auto !important;
      box-shadow: none !important;
      border: none !important;
      width: 210mm !important;
      height: 296mm !important;
      min-height: 296mm !important;
      max-height: 296.5mm !important;
      overflow: hidden !important;
      page-break-after: always !important;
      break-after: page !important;
    }
    .bems-doc-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .bems-doc-page::before {
      display: none !important;
    }
    .bems-doc-print-target {
      position: static !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
    }
    .bems-doc-head {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      padding-bottom: 12px !important;
      margin-bottom: 10px !important;
      border-bottom: 1px solid #e9ecef !important;
      position: relative !important;
    }
    .bems-doc-head::after {
      content: '' !important;
      position: absolute !important;
      bottom: -1px !important;
      left: 0 !important;
      width: 72px !important;
      height: 2.5px !important;
      background: #10b981 !important;
      border-radius: 2px !important;
    }
    .bems-doc-dept-badge {
      display: inline-flex !important;
      align-items: center !important;
      gap: 5px !important;
      font-size: 8.5px !important;
      font-weight: 700 !important;
      letter-spacing: 0.14em !important;
      text-transform: uppercase !important;
      color: #065f46 !important;
      background: #ecfdf5 !important;
      border: 1px solid #d1fae5 !important;
      padding: 2.5px 8px !important;
      border-radius: 4px !important;
      margin-top: 6px !important;
    }
    .bems-doc-dept-badge .badge-pulse-dot {
      width: 5px !important;
      height: 5px !important;
      border-radius: 50% !important;
      background: #10b981 !important;
    }
    .bems-doc-status-badge {
      display: inline-flex !important;
      align-items: center !important;
      gap: 5px !important;
      font-size: 8.5px !important;
      font-weight: 700 !important;
      letter-spacing: 0.16em !important;
      text-transform: uppercase !important;
      color: #065f46 !important;
      background: #f0fdf9 !important;
      border: 1px solid #a7f3d0 !important;
      padding: 3px 10px !important;
      border-radius: 999px !important;
      margin-bottom: 4px !important;
    }
    .bems-doc-status-badge .badge-dot {
      width: 6px !important;
      height: 6px !important;
      border-radius: 50% !important;
      background: #10b981 !important;
    }
    .bems-doc-ref-pill {
      display: inline-flex !important;
      align-items: center !important;
      gap: 7px !important;
      padding: 4px 10px !important;
      border-radius: 5px !important;
      background: #064e3b !important;
      color: #ffffff !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      letter-spacing: 0.05em !important;
    }
    .bems-doc-ref-pill .ref-prefix {
      color: #6ee7b7 !important;
      font-size: 8.5px !important;
      font-weight: 700 !important;
      letter-spacing: 0.14em !important;
    }
    .bems-doc-dates {
      margin-top: 6px !important;
      font-size: 10px !important;
      color: #64748b !important;
      display: flex !important;
      justify-content: flex-end !important;
      align-items: center !important;
      gap: 6px !important;
    }
    .bems-doc-dates b {
      color: #1e293b !important;
      font-weight: 600 !important;
    }
    .bems-doc-hero, .bems-doc-hero-top, .bems-doc-hero-top > div, .bems-doc-amt {
      border-left: none !important;
      border-right: none !important;
    }
    .bems-doc-hero-meta {
      grid-template-columns: repeat(5, 1fr) !important;
      overflow: hidden !important;
    }
    .bems-doc-hero-meta > div,
    .bems-doc-hero-meta > div + div {
      padding: 5px 8px !important;
      border: none !important;
      border-left: none !important;
      border-right: none !important;
    }
    .bems-doc-body {
      padding: 10mm 14mm 85px 14mm !important;
      gap: 10px !important;
    }
    .bems-doc-page-1-multi .bems-doc-body,
    .bems-doc-page-intermediate .bems-doc-body {
      padding-bottom: 24px !important;
    }
    .bems-doc-sign {
      margin-top: 10px !important;
      padding-top: 8px !important;
    }
    .bems-doc-table th {
      padding: 7px 10px !important;
      font-size: 8.5px !important;
    }
    .bems-doc-table td {
      padding: 6.5px 10px !important;
    }
    .bems-doc-vt {
      margin-top: 2px !important;
    }
  </style>
</head>
<body>
  <div class="bems-doc-root">
    ${contentHtml}
  </div>
</body>
</html>`)
  doc.close()

  try {
    doc.title = title
  } catch (_) {}

  // Wait for fonts and images to settle in the iframe, then trigger print
  setTimeout(() => {
    try {
      // Temporarily set parent window document.title so all browsers (especially Chrome Save as PDF)
      // assign the intended download filename.
      document.title = title
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print():', e)
      window.print()
    } finally {
      setTimeout(() => {
        document.title = originalTitle
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }, 5000)
    }
  }, 400)
}
