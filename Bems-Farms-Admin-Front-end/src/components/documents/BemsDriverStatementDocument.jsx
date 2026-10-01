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

  const openingBalance = computedOpeningBalance

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

  // ── Modern Fintech Multi-Page Chunking Logic ──
  // Page 1: Emerald Brand Band + 2-Card Summary Grid + up to 8 table rows.
  // Intermediate Pages: Continuation band + up to 14 table rows.
  // Final Page: Up to 10 table rows + Official Closing Block (QR & Signatures) + Docked Footer.
  const isMultiPage = filteredStatement.length > 6

  let page1Count = Math.min(filteredStatement.length, 8)
  if (isMultiPage && filteredStatement.length - page1Count < 2) {
    page1Count = Math.ceil(filteredStatement.length / 2)
  }

  const page1Rows = isMultiPage ? filteredStatement.slice(0, page1Count) : filteredStatement
  const afterPage1 = isMultiPage ? filteredStatement.slice(page1Count) : []

  const remainingPages = []
  if (isMultiPage && afterPage1.length > 0) {
    let remaining = [...afterPage1]
    while (remaining.length > 0) {
      if (remaining.length <= 10) {
        remainingPages.push({ rows: remaining, isFinal: true })
        remaining = []
      } else {
        const chunkSize = Math.min(14, remaining.length - 2)
        remainingPages.push({ rows: remaining.slice(0, chunkSize), isFinal: false })
        remaining = remaining.slice(chunkSize)
      }
    }
  }

  const totalPages = isMultiPage ? 1 + remainingPages.length : 1

  // ── Render Helpers for Modern Fintech Layout ──
  const renderLedgerTable = (rows, startIndex = 0) => (
    <div className="bems-fintech-ledger-wrap">
      <table className="bems-fintech-table">
        <thead>
          <tr>
            <th style={{ width: '5%' }}>#</th>
            <th style={{ width: '13%' }}>Date</th>
            <th>Activity &amp; Transaction Details</th>
            <th style={{ width: '16%' }}>Reference</th>
            <th className="c" style={{ width: '10%' }}>Type</th>
            <th className="r" style={{ width: '14%' }}>Amount (₦)</th>
            <th className="r" style={{ width: '15%' }}>Balance (₦)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((ev, idx) => {
              const isCredit = ev.type === 'credit'
              const amt = parseFloat(ev.amount) || 0
              const runningBal = ev.running_balance !== undefined ? parseFloat(ev.running_balance) : null

              return (
                <tr key={ev.id || idx}>
                  <td className="mono" style={{ color: '#94a3b8', fontSize: 10 }}>
                    {String(startIndex + idx + 1).padStart(2, '0')}
                  </td>
                  <td className="mono" style={{ fontSize: 10 }}>{formatDate(ev.date)}</td>
                  <td style={{ fontSize: 10.5 }}>
                    <b style={{ color: '#0f172a' }}>
                      {cleanStatementDescription(ev.description) || (isCredit ? 'Delivery Drop Commission' : 'Bank Withdrawal')}
                    </b>
                    {ev.order_id && (
                      <span style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        fontSize: 8.5,
                        fontWeight: 700,
                        padding: '2px 5px',
                        borderRadius: 4,
                        marginLeft: 6,
                        border: '1px solid #e2e8f0',
                        letterSpacing: '0.04em'
                      }}>
                        ORDER #{ev.order_id}
                      </span>
                    )}
                    {ev.delivery_address && (
                      <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
                        {ev.delivery_address}
                      </div>
                    )}
                  </td>
                  <td className="mono" style={{ fontSize: 9.5, color: '#0f3622', fontWeight: 600 }}>
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
    </div>
  )

  const renderClosingBlock = () => (
    <div className="bems-fintech-closing">
      <div className="bems-fintech-verify">
        <div className="bems-fintech-qr">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Verify Driver Statement QR Code"
              style={{ width: 50, height: 50, display: 'block', imageRendering: 'pixelated' }}
            />
          ) : (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#0f3622' }}>QR</span>
          )}
        </div>
        <div className="bems-fintech-verify-info">
          <h4>Official Settlement Verification</h4>
          <p>Scan with any device or visit bemsfarms.com/verify to authenticate tamper-proof ledger record.</p>
          <div className="bems-fintech-sec-hash mono">{securityCode}</div>
        </div>
      </div>

      <div className="bems-fintech-sign-box">
        <div className="bems-fintech-stamp-wrap">
          <BemsOfficialStamp size={72} companyName={companyName} />
        </div>
        {effectiveSignature ? (
          <img src={effectiveSignature} alt="Authorised Signature" className="bems-fintech-sig-img" />
        ) : (
          <div style={{ height: 34 }} />
        )}
        <div className="bems-fintech-sig-line" />
        <div className="bems-fintech-sig-name">For {companyName}</div>
        <div className="bems-fintech-sig-title">Financial Controller &amp; Fleet Operations</div>
      </div>
    </div>
  )

  const renderFooter = () => (
    <div className="bems-fintech-foot">
      <span><b>Bems Farms Global Ltd</b> · Official Fleet Settlement Hub</span>
      <span>Abia State, Nigeria · www.bemsfarms.com</span>
      <span>{companyEmail}</span>
    </div>
  )

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
          PAGE 1 (Always Has Official Emerald Header Band)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="bems-fintech-page">
        {/* Emerald Header Band */}
        <div className="bems-fintech-band">
          <div className="bems-fintech-brand-col">
            <div className="bems-fintech-logo-wrap">
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
            <div className="bems-fintech-brand-legal">
              <b>{companyName}</b> · RC: 1892041<br />
              {companyAddress}<br />
              {companyEmail}{companyPhone ? ` · ${companyPhone}` : ''}
            </div>
          </div>

          <div className="bems-fintech-meta-col">
            <div className="bems-fintech-doc-type">Official Settlement Record</div>
            <h1 className="bems-fintech-doc-title">Statement of Account</h1>
            <div className="bems-fintech-id-badge">
              <span style={{ opacity: 0.75, fontSize: 9 }}>DOCUMENT ID</span>
              <b>{statementRef}</b>
            </div>
            <div className="bems-fintech-period">
              Period: <b>{formatDate(periodStart)} – {formatDate(periodEnd)}</b> · Generated: <b>{issuedDate}</b>
            </div>
          </div>
        </div>

        {/* Page 1 Body */}
        <div className="bems-fintech-body">
          {/* Structured 2-Card Summary Grid */}
          <div className="bems-fintech-summary-grid">
            {/* Card 1: Driver & Fleet Account */}
            <div className="bems-fintech-card">
              <div>
                <div className="bems-fintech-card-head">
                  <span>Driver &amp; Logistics Account</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>● Active Fleet</span>
                </div>
                <div className="bems-fintech-driver-name">{driverName}</div>
                <div className="bems-fintech-kv-grid">
                  <div className="bems-fintech-kv-item">
                    <span className="bems-fintech-kv-label">Wallet Account</span>
                    <span className="bems-fintech-kv-val mono">{walletAccountNo}</span>
                  </div>
                  <div className="bems-fintech-kv-item">
                    <span className="bems-fintech-kv-label">Contact Phone</span>
                    <span className="bems-fintech-kv-val">{driverPhone}</span>
                  </div>
                  <div className="bems-fintech-kv-item">
                    <span className="bems-fintech-kv-label">Assigned Vehicle</span>
                    <span className="bems-fintech-kv-val">{vehicleType}{vehiclePlate ? ` (${vehiclePlate})` : ''}</span>
                  </div>
                  <div className="bems-fintech-kv-item">
                    <span className="bems-fintech-kv-label">Designated Bank</span>
                    <span className="bems-fintech-kv-val">{bankName} · {accountNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Financial Balance & Flow Highlight */}
            <div className="bems-fintech-card balance-highlight">
              <div>
                <div className="bems-fintech-card-head">
                  <span style={{ color: '#15803d' }}>Net Closing Balance</span>
                  <span style={{ fontSize: 9.5, color: '#16a34a', fontWeight: 700 }}>Audited &amp; Reconciled</span>
                </div>
                <div className="bems-fintech-bal-amt mono">
                  <small>₦</small>{closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="bems-fintech-bal-words">
                  {numberToWords(closingBalance)}
                </div>
              </div>

              <div className="bems-fintech-sub-kpi-bar">
                <div className="bems-fintech-sub-kpi-col">
                  <span className="bems-fintech-sub-kpi-lbl">Opening Balance</span>
                  <span className="bems-fintech-sub-kpi-val mono">
                    ₦{openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bems-fintech-sub-kpi-col">
                  <span className="bems-fintech-sub-kpi-lbl">Total Credits</span>
                  <span className="bems-fintech-sub-kpi-val mono" style={{ color: '#15803d' }}>
                    +₦{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bems-fintech-sub-kpi-col">
                  <span className="bems-fintech-sub-kpi-lbl">Total Debits</span>
                  <span className="bems-fintech-sub-kpi-val mono" style={{ color: '#b91c1c' }}>
                    -₦{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Table (Page 1) */}
          {renderLedgerTable(page1Rows, 0)}

          {/* If Single Page: Closing Block & Signatures */}
          {!isMultiPage && renderClosingBlock()}

          {/* If Multi-page: Page 1 Indicator */}
          {isMultiPage && (
            <div className="bems-fintech-indicator">
              <span>Statement {statementRef} · Driver: {driverName}</span>
              <span style={{ fontWeight: 700, color: '#064e3b' }}>
                Page 1 of {totalPages} · Continues on Page 2 ──►
              </span>
            </div>
          )}
        </div>

        {/* Docked Footer (Single Page Only) */}
        {!isMultiPage && renderFooter()}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTINUATION PAGES (Slim Band, Ledger, & Closing on Last Page)
          ══════════════════════════════════════════════════════════════════════ */}
      {isMultiPage && remainingPages.map((page, pageIdx) => {
        const pageNum = pageIdx + 2
        let priorRowsCount = page1Rows.length
        for (let i = 0; i < pageIdx; i++) {
          priorRowsCount += remainingPages[i].rows.length
        }

        return (
          <div key={pageNum} className="bems-fintech-page">
            {/* Slim Continuation Band */}
            <div className="bems-fintech-continuation-band">
              <span>Official Statement of Account (Continued) — <b>{statementRef}</b></span>
              <span>Page {pageNum} of {totalPages}</span>
            </div>

            {/* Page Body */}
            <div className="bems-fintech-body">
              {renderLedgerTable(page.rows, priorRowsCount)}

              {/* Final Page: Closing Block */}
              {page.isFinal ? (
                renderClosingBlock()
              ) : (
                <div className="bems-fintech-indicator">
                  <span>Statement {statementRef} · Driver: {driverName}</span>
                  <span style={{ fontWeight: 700, color: '#064e3b' }}>
                    Page {pageNum} of {totalPages} · Continues on Page {pageNum + 1} ──►
                  </span>
                </div>
              )}
            </div>

            {/* Docked Footer (Final Page Only) */}
            {page.isFinal && renderFooter()}
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
