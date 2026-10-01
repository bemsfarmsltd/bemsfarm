/**
 * driverStatementTemplate.js
 * Generates an executive, print/PDF-ready HTML Statement of Account for Bems Farms Drivers.
 * Matches the official Bems Farms invoice visual language.
 */

function numberToWords(num) {
  if (!num || isNaN(num)) return 'Zero naira only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n) {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10].toLowerCase() : '') + ' ';
    return a[Math.floor(n / 100)] + ' hundred ' + (n % 100 !== 0 ? 'and ' + convertGroup(n % 100) : '');
  }

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return 'Zero naira only';

  const billions = Math.floor(integerPart / 1000000000);
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  let words = '';
  if (billions) words += convertGroup(billions) + 'billion ';
  if (millions) words += convertGroup(millions) + 'million ';
  if (thousands) words += convertGroup(thousands) + 'thousand ';
  if (remainder) words += convertGroup(remainder);

  words = words.trim();
  words = words.charAt(0).toUpperCase() + words.slice(1).toLowerCase() + ' naira';
  if (decimalPart > 0) {
    words += ' and ' + convertGroup(decimalPart).trim().toLowerCase() + ' kobo';
  }
  return words + ' only';
}

function formatDate(val, withTime = false) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    if (withTime) {
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(val);
  }
}

function cleanStatementDescription(desc) {
  if (!desc) return '';
  return String(desc)
    .replace(/\s*\([^)]*Customer Fee[^)]*\)/gi, '')
    .replace(/\s*\(Customer Fee.*?\)/gi, '')
    .replace(/\s*\(Customer Delivery Fee.*?\)/gi, '')
    .trim();
}

function generateSecurityCode(ref, amount) {
  const seed = (String(ref) + String(amount || 0)).toUpperCase().replace(/[^A-Z0-9]/g, '');
  let hash1 = 0x811c9dc5;
  let hash2 = 0x55555555;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    hash1 = (hash1 ^ c) * 0x01000193;
    hash2 = (hash2 + c) * 0x45d9f3b;
  }
  const h1 = Math.abs(hash1).toString(16).padStart(8, '0').slice(0, 8).toUpperCase();
  const h2 = Math.abs(hash2).toString(16).padStart(8, '0').slice(0, 8).toUpperCase();
  return `${h1.slice(0, 4)}-${h1.slice(4, 8)}-${h2.slice(0, 4)}-${h2.slice(4, 8)}`;
}

function getOfficialStampSvg(companyName = 'BEMS FARMS GLOBAL LTD') {
  return `
    <div class="bems-official-stamp" style="display:inline-block;width:82px;height:82px;transform:rotate(-12deg);user-select:none;flex-shrink:0;mix-blend-mode:multiply;opacity:0.94;">
      <svg viewBox="0 0 140 140" width="82" height="82" style="display:block;overflow:visible">
        <defs>
          <path id="srv-stamp-top" d="M 18 70 A 52 52 0 0 1 122 70" fill="none" />
          <path id="srv-stamp-btm" d="M 12 70 A 58 58 0 0 0 128 70" fill="none" />
        </defs>
        <circle cx="70" cy="70" r="66" fill="none" stroke="#0c4a2a" stroke-width="3.2" />
        <circle cx="70" cy="70" r="61.5" fill="none" stroke="#0c4a2a" stroke-width="1" stroke-dasharray="3 1.5" />
        <circle cx="70" cy="70" r="41" fill="none" stroke="#0c4a2a" stroke-width="1.8" />
        <circle cx="70" cy="70" r="38" fill="none" stroke="#b8860b" stroke-width="0.8" stroke-dasharray="1.5 2" />
        <text fill="#0c4a2a" font-size="9.2" font-weight="800" font-family="'Cinzel', Georgia, serif" letter-spacing="2.2">
          <textPath href="#srv-stamp-top" startOffset="50%" text-anchor="middle">★ ${companyName} ★</textPath>
        </text>
        <text fill="#0c4a2a" font-size="7.2" font-weight="700" font-family="'Cinzel', Georgia, serif" letter-spacing="1.1">
          <textPath href="#srv-stamp-btm" startOffset="50%" text-anchor="middle">★ ABIA STATE · NIGERIA ★</textPath>
        </text>
        <polygon points="70,44 71.8,49.5 77.5,49.5 73,53 74.8,58.5 70,55 65.2,58.5 67,53 62.5,49.5 68.2,49.5" fill="#b8860b" />
        <text x="70" y="69" text-anchor="middle" fill="#0c4a2a" font-size="11.5" font-weight="900" font-family="'Cinzel', Georgia, serif" letter-spacing="2.5">OFFICIAL</text>
        <line x1="47" y1="74" x2="65" y2="74" stroke="#0c4a2a" stroke-width="0.8" />
        <polygon points="70,72.5 72,74 70,75.5 68,74" fill="#b8860b" />
        <line x1="75" y1="74" x2="93" y2="74" stroke="#0c4a2a" stroke-width="0.8" />
        <text x="70" y="85" text-anchor="middle" fill="#0c4a2a" font-size="9.5" font-weight="800" font-family="'Cinzel', Georgia, serif" letter-spacing="3">SEAL</text>
        <text x="70" y="95" text-anchor="middle" fill="#0c4a2a" font-size="5.8" font-weight="700" font-family="system-ui, sans-serif" letter-spacing="2">VERIFIED &amp; AUDITED</text>
      </svg>
    </div>
  `;
}

function renderDriverStatementHtml({
  driver = {},
  summary = {},
  company = {},
  statement = [],
  qrDataUrl = '',
  autoPrint = false,
}) {
  const signatureUrl = company.signature_url || company.company_signature_url || '';
  const driverName = driver.name || 'Bems Farms Driver';
  const driverPhone = driver.phone || '—';
  const driverEmail = driver.email || '—';
  const vehicleType = driver.vehicle_type ? (driver.vehicle_type.charAt(0).toUpperCase() + driver.vehicle_type.slice(1)) : 'Motorcycle';
  const vehiclePlate = driver.vehicle_plate || '—';
  const licenseNumber = driver.license_number || '—';
  const walletAccountNo = driver.wallet_account_number || `DRV-${String(driver.id || 1).padStart(4, '0')}`;

  const bankName = driver.bank_name || 'Designated Commercial Bank';
  const accountNumber = driver.account_number || '—';
  const accountName = driver.account_name || driverName;

  const openingBalance = Number(summary.opening_balance || 0);
  const totalCredits = Number(summary.total_credits || driver.total_earnings || 0);
  const totalDebits = Number(summary.total_debits || driver.total_paid || 0);
  const pendingPayouts = Number(summary.pending_payouts || 0);
  const closingBalance = Number(summary.closing_balance ?? (totalCredits - totalDebits - pendingPayouts));
  const totalTrips = Number(summary.total_trips || driver.total_delivered || driver.total_deliveries || statement.filter(s => s.category === 'delivery_commission' || s.category === 'delivery_drop').length || 0);

  const periodStart = summary.period_start || (statement.length > 0 ? statement[0].date : driver.joined_at || new Date());
  const periodEnd = summary.period_end || (statement.length > 0 ? statement[statement.length - 1].date : new Date());
  const issuedDate = formatDate(new Date());

  const statementRef = `SOA-${walletAccountNo}-${new Date().getFullYear()}`;
  const balanceInWords = numberToWords(closingBalance);
  const securityCode = generateSecurityCode(statementRef, closingBalance);

  let companyName = company.name || 'Bems Farms Global Ltd';
  if (!companyName || companyName.includes('Limited') || companyName === 'Bems Farms') {
    companyName = 'Bems Farms Global Ltd';
  }
  const companyAddress = company.address || 'Central Farm Settlement Hub, Umuahia, Abia State';
  const companyEmail = company.email || 'corporate@bemsfarms.com';
  const companyPhone = (company.phone && !company.phone.includes('800 236 7326')) ? company.phone : '';

  const isMultiPage = statement && statement.length > 3;

  let page1Count = Math.min(statement.length, 6);
  if (isMultiPage && statement.length - page1Count < 2) {
    page1Count = Math.ceil(statement.length / 2);
  }

  const page1Rows = isMultiPage ? statement.slice(0, page1Count) : statement;
  const afterPage1 = isMultiPage ? statement.slice(page1Count) : [];

  const remainingPages = [];
  if (isMultiPage && afterPage1.length > 0) {
    let remaining = [...afterPage1];
    while (remaining.length > 0) {
      if (remaining.length <= 8) {
        remainingPages.push({ rows: remaining, isFinal: true });
        remaining = [];
      } else {
        const chunkSize = Math.min(12, remaining.length - 1);
        remainingPages.push({ rows: remaining.slice(0, chunkSize), isFinal: false });
        remaining = remaining.slice(chunkSize);
      }
    }
  }
  const totalPages = 1 + remainingPages.length;

  function renderRowsHtml(rows, startIndex = 0) {
    if (!rows || rows.length === 0) {
      return `
        <tr>
          <td colspan="7" class="c" style="padding:30px 12px;color:#64748b;">
            No recorded transactions during this statement period.
          </td>
        </tr>
      `;
    }
    return rows.map((ev, idx) => {
      const isCredit = ev.type === 'credit';
      const amt = parseFloat(ev.amount) || 0;
      const runningBal = ev.running_balance !== undefined ? parseFloat(ev.running_balance) : null;
      const tagHtml = ev.order_id 
        ? `<span class="bems-doc-tag" style="background:#e0f2fe;color:#0369a1;margin-left:6px;">Order #${ev.order_id}</span>` 
        : '';
      const addrHtml = ev.delivery_address 
        ? `<div style="font-size:9.5px;color:#64748b;margin-top:2px;">${ev.delivery_address}</div>` 
        : '';

      return `
        <tr>
          <td class="mono">${String(startIndex + idx + 1).padStart(2, '0')}</td>
          <td class="mono" style="font-size:10.5px;">${formatDate(ev.date)}</td>
          <td class="it">
            <b>${cleanStatementDescription(ev.description) || (isCredit ? 'Delivery Drop Commission' : 'Bank Withdrawal')}</b>
            ${tagHtml}
            ${addrHtml}
          </td>
          <td class="mono" style="font-size:10px;color:#0f3622;font-weight:600;">${ev.reference || '—'}</td>
          <td class="c">
            <span class="${isCredit ? 'bems-stmt-badge-cr' : 'bems-stmt-badge-dr'}">
              ${isCredit ? 'CR' : 'DR'}
            </span>
          </td>
          <td class="r mono ${isCredit ? 'bems-stmt-amt-cr' : 'bems-stmt-amt-dr'}">
            ${isCredit ? '+' : '-'}₦${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td class="r mono" style="font-weight:600;color:#0f3622;">
            ${runningBal !== null ? `₦${runningBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </td>
        </tr>
      `;
    }).join('');
  }

  const totalsAndSignoffHtml = `
      <!-- Verification & Totals -->
      <section class="bems-doc-vt">
        <div class="bems-doc-verify">
          <div class="qr" style="padding:4px;background:#ffffff;border:1px solid #c9d6ce;border-radius:8px;display:flex;align-items:center;justify-content:center;">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="Verify Statement" style="width:72px;height:72px;display:block;">` : '<div style="width:72px;height:72px;background:#eef7f2;"></div>'}
          </div>
          <div>
            <h4>Verified Logistics Settlement</h4>
            <p>Scan with any smartphone camera or visit bemsfarms.com/verify to authenticate this official statement.</p>
            <div class="cap" style="margin-bottom:2px;">Security Verification Code</div>
            <div class="code">${securityCode}</div>
          </div>
        </div>

        <dl class="bems-doc-tot">
          <dt>Gross Delivery Earnings</dt>
          <dd class="mono">₦${totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>

          <dt>Disbursed to Bank</dt>
          <dd class="mono">₦${totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>

          ${pendingPayouts > 0 ? `
            <dt>In-Flight Payouts</dt>
            <dd class="mono" style="color:#d97706;">₦${pendingPayouts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
          ` : ''}

          <dt class="grand">Closing Balance</dt>
          <dd class="grand">
            <span class="naira" style="font-size:14px;">₦</span>${closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </dd>

          <dt>Settlement Account</dt>
          <dd class="mono" style="font-size:9.5px;color:#8a6d12;">${accountNumber} (${bankName})</dd>
        </dl>
      </section>

      <!-- Sign-off & Audit Notice -->
      <section class="bems-doc-sign">
        <div class="bems-doc-keep">
          <b>Audit &amp; Settlement Notice.</b> This Statement of Account reflects all verified delivery compensations, bonuses, adjustments, and electronic bank settlements recorded in the Bems Farms driver settlement system. All figures are audited and reconciled against delivery telemetry and payment gateway logs. Please report any discrepancies within 14 days.
        </div>

        <div class="bems-doc-sign-right">
          <div class="bems-doc-sig">
            ${signatureUrl ? `<img src="${signatureUrl}" alt="Authorised Signature" class="bems-doc-sig-img" />` : ''}
            <div class="ln"></div>
            <b>For ${companyName}</b>
            <span>Financial Controller &amp; Head of Logistics</span>
          </div>
          <div class="bems-doc-stamp-wrapper">
            ${getOfficialStampSvg(companyName)}
          </div>
        </div>
      </section>
  `;

  const footerGroupHtml = `
    <div class="bems-doc-footer-group">
      <!-- Thanks Banner -->
      <div class="bems-doc-thanks">
        <h3>Thank you for powering Bems Farms logistics.</h3>
        <span>Safe deliveries, fresh produce from Abia State farm hub to your table.</span>
      </div>

      <!-- Footer -->
      <div class="bems-doc-foot">
        <span>${companyPhone || 'Logistics & Fleet Hub'}</span>
        <span>www.bemsfarms.com</span>
        <span>${companyEmail}</span>
      </div>
    </div>
  `;

  const continuationPagesHtml = isMultiPage ? remainingPages.map((page, pageIdx) => {
    const pageNum = pageIdx + 2;
    let priorRowsCount = page1Rows.length;
    for (let i = 0; i < pageIdx; i++) {
      priorRowsCount += remainingPages[i].rows.length;
    }
    const pageRowsHtml = renderRowsHtml(page.rows, priorRowsCount);

    return `
      <!-- Continuation Page ${pageNum} of ${totalPages} -->
      <div class="bems-doc-page ${!page.isFinal ? 'bems-doc-page-intermediate' : ''}">
        <div class="bems-doc-body" style="${!page.isFinal ? 'padding-bottom:24px !important;' : ''}">
          <!-- Discreet Continuation Bar (NO HEADER ON CONTINUATION PAGES) -->
          <div class="bems-stmt-page-head">
            <span>Official Statement of Account (Continued) — ${statementRef}</span>
            <span>Page ${pageNum} of ${totalPages}</span>
          </div>

          <!-- Table Continuation -->
          <table class="bems-doc-table">
            <thead>
              <tr>
                <th style="width:5%;">#</th>
                <th style="width:13%;">Date</th>
                <th>Activity & Transaction Details</th>
                <th style="width:16%;">Reference</th>
                <th class="c" style="width:10%;">Type</th>
                <th class="r" style="width:14%;">Amount (₦)</th>
                <th class="r" style="width:15%;">Balance (₦)</th>
              </tr>
            </thead>
            <tbody>
              ${pageRowsHtml}
            </tbody>
          </table>

          ${page.isFinal ? totalsAndSignoffHtml : `
            <div class="bems-stmt-page-indicator">
              <span>Statement ${statementRef} · Driver: ${driverName}</span>
              <span style="font-weight:600;color:#0f3622;">Page ${pageNum} of ${totalPages} · Continues on Page ${pageNum + 1} ──►</span>
            </div>
          `}
        </div>

        ${page.isFinal ? footerGroupHtml : ''}
      </div>
    `;
  }).join('') : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${driverName} Commission Statement of Account - Bems Farms</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css">

  <style>
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
      --bems-bg: #dfe4e1;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 24px 12px;
      background: #0f172a;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: var(--bems-ink);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
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

    /* Floating Download / Action Bar */
    .bems-action-bar {
      max-width: 840px;
      margin: 0 auto 18px;
      padding: 10px 16px;
      background: #1e293b;
      color: #ffffff;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }

    .bems-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #16a34a;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .bems-action-btn:hover { background: #15803d; }

    /* Page container */
    .bems-doc-page {
      width: 210mm;
      height: 297mm;
      min-height: 297mm;
      max-height: 297mm;
      margin: 0 auto 32px auto;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      display: block;
      box-shadow: 0 20px 60px rgba(15, 54, 34, .18);
      text-align: left;
      box-sizing: border-box;
    }

    .bems-doc-page:last-child {
      margin-bottom: 0;
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
      padding: 10mm 14mm 85px 14mm;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow: hidden;
      box-sizing: border-box;
    }

    .bems-doc-page-1-multi .bems-doc-body,
    .bems-doc-page-intermediate .bems-doc-body {
      padding-bottom: 24px !important;
    }

    .bems-stmt-page-indicator {
      padding: 8px 14mm;
      font-size: 9.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px dashed var(--bems-line);
      background: #fafcfb;
      margin-top: auto !important;
      width: 100% !important;
      box-sizing: border-box;
      flex-shrink: 0 !important;
    }

    .bems-stmt-page-head {
      padding: 8px 14mm;
      font-size: 10px;
      font-weight: 600;
      color: var(--bems-g9);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--bems-line);
      background: #fafcfb;
      margin-bottom: 12px;
      margin-left: -14mm;
      margin-right: -14mm;
      margin-top: -10mm;
    }

    /* Header */
    /* Header */
    .bems-doc-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 14px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e9ecef;
      position: relative;
    }

    .bems-doc-head::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 72px;
      height: 2.5px;
      background: var(--bems-g6);
      border-radius: 2px;
    }

    .bems-doc-logo img {
      height: 46px;
      width: auto;
      display: block;
      object-fit: contain;
    }

    .bems-doc-dept-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #065f46;
      background: #ecfdf5;
      border: 1px solid #d1fae5;
      padding: 2.5px 8px;
      border-radius: 4px;
      margin-top: 6px;
    }

    .bems-doc-dept-badge .badge-pulse-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #10b981;
    }

    .bems-doc-co {
      margin-top: 5px;
      font-size: 9.5px;
      color: var(--bems-muted);
      line-height: 1.5;
    }
    .bems-doc-co b { color: var(--bems-ink); font-weight: 700; font-size: 10.5px; }

    .bems-doc-meta-right { text-align: right; }

    .bems-doc-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #065f46;
      background: #f0fdf9;
      border: 1px solid #a7f3d0;
      padding: 3px 10px;
      border-radius: 999px;
      margin-bottom: 4px;
    }

    .bems-doc-status-badge .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }

    .bems-doc-meta-right h1 {
      font-family: 'Fraunces', Georgia, serif;
      font-weight: 800;
      font-size: 28px;
      line-height: 1.1;
      color: var(--bems-g9);
      letter-spacing: -0.02em;
      margin: 0;
    }

    .bems-doc-ref-wrap {
      margin-top: 6px;
    }

    .bems-doc-ref-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 10px;
      border-radius: 5px;
      background: #064e3b;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      box-shadow: 0 1px 3px rgba(6, 78, 59, 0.2);
    }

    .bems-doc-ref-pill .ref-prefix {
      color: #6ee7b7;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.14em;
    }

    .bems-doc-meta-right .no {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 10px;
      border-radius: 5px;
      background: #064e3b;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: .05em;
      box-shadow: 0 1px 3px rgba(6, 78, 59, 0.2);
    }

    .bems-doc-dates {
      margin-top: 6px;
      font-size: 10px;
      color: var(--bems-muted);
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
    }

    .bems-doc-dates b {
      color: var(--bems-ink);
      font-weight: 600;
    }

    .bems-doc-dates .dt-sep {
      opacity: 0.5;
    }

    .bems-doc-meta-right .dt {
      margin-top: 6px;
      font-size: 10px;
      color: var(--bems-muted);
    }

    /* Hero Banner */
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
      grid-template-columns: repeat(5, 1fr);
      border-top: 1px solid rgba(255, 255, 255, .12);
      background: rgba(0, 0, 0, .18);
      z-index: 2;
      overflow: hidden;
    }
    .bems-doc-hero-meta > div,
    .bems-doc-hero-meta > div + div {
      padding: 10px 14px;
      border: none !important;
      border-left: none !important;
      border-right: none !important;
      outline: none !important;
      box-shadow: none !important;
    }
    .bems-doc-hero-meta .cap { letter-spacing: .12em; white-space: nowrap; }
    .bems-doc-hero,
    .bems-doc-hero-top,
    .bems-doc-hero-top > div,
    .bems-doc-amt,
    .bems-doc-words {
      border-left: none !important;
      border-right: none !important;
    }
    .bems-doc-hero-meta p {
      font-size: 11.5px;
      font-weight: 600;
      margin: 2px 0 0;
      color: #ffffff;
    }

    /* Parties */
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

    /* 4-KPI Grid */
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

    /* Table */
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
      padding: 6.5px 10px;
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

    /* Verify & Totals */
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

    /* Footer Group (Anchored to Absolute Bottom of A4 Document) */
    .bems-doc-footer-group {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      background: #ffffff;
      z-index: 10;
      box-sizing: border-box;
    }

    .bems-doc-sign,
    .bems-doc-body .bems-doc-sign,
    .bems-doc-footer-group .bems-doc-sign {
      display: grid;
      grid-template-columns: 1fr 210px;
      gap: 16px;
      align-items: end;
      margin-top: 36px;
      padding: 12px 0 4px 0;
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
    .bems-doc-sign-right {
      position: relative;
      width: 210px;
      max-width: 210px;
      text-align: center;
    }
    .bems-doc-sig {
      width: 100%;
      position: relative;
      z-index: 1;
      text-align: center;
    }
    .bems-doc-sig-img {
      height: 52px;
      max-width: 130px;
      object-fit: contain;
      display: block;
      margin: 0 auto 3px auto;
      mix-blend-mode: multiply !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      position: relative;
      z-index: 3;
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.04));
    }
    .bems-doc-sig-placeholder {
      height: 48px;
    }
    .bems-doc-sig .ln {
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border-bottom: 1.5px solid var(--bems-ink) !important;
      width: 100% !important;
      position: relative;
      z-index: 1;
    }
    .bems-doc-sig b {
      display: block;
      margin-top: 6px;
      font-size: 11px;
      font-weight: 700;
      color: var(--bems-ink);
      line-height: 1.35;
      text-align: center;
    }
    .bems-doc-sig span {
      display: block;
      font-size: 9.5px;
      color: var(--bems-muted);
      line-height: 1.35;
      text-align: center;
    }
    .bems-doc-stamp-wrapper {
      position: absolute;
      left: 50%;
      top: 14px;
      transform: translate(-50%, -50%);
      z-index: 2;
      pointer-events: none;
      mix-blend-mode: multiply !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .bems-official-stamp {
      transition: transform 0.2s ease;
      mix-blend-mode: multiply !important;
      opacity: 0.92;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Thanks & Foot */
    .bems-doc-thanks {
      margin-left: 6px;
      flex-shrink: 0;
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
      flex-shrink: 0;
      padding: 6px 15mm 7px 11mm;
      background: var(--bems-g9);
      color: #a9c9b5;
      font-size: 9px;
      display: flex;
      justify-content: space-between;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    @media print {
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print, .no-print * { display: none !important; }
      .bems-doc-page {
        position: relative !important;
        display: block !important;
        width: 210mm !important;
        height: 297mm !important;
        min-height: 297mm !important;
        max-height: 297mm !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
        background: #ffffff !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .bems-doc-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      .bems-doc-body {
        display: block !important;
        padding: 10mm 14mm 85px 14mm !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      .bems-doc-page-1-multi .bems-doc-body,
      .bems-doc-page-intermediate .bems-doc-body {
        padding-bottom: 24px !important;
      }
      .bems-doc-head { margin-bottom: 0 !important; }
      .bems-doc-logo img { height: 38px !important; }
      .bems-doc-meta-right h1 { font-size: 22px !important; }
      .bems-doc-hero {
        border-radius: 8px !important;
        border-left: none !important;
        border-right: none !important;
      }
      .bems-doc-hero-top {
        padding: 8px 14px 6px !important;
        border-left: none !important;
        border-right: none !important;
      }
      .bems-doc-amt {
        font-size: 28px !important;
        margin: 2px 0 !important;
        border-left: none !important;
        border-right: none !important;
      }
      .bems-doc-stamp { width: 66px !important; height: 66px !important; }
      .bems-doc-stamp b { font-size: 13px !important; }
      .bems-doc-stamp span { font-size: 6.5px !important; }
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
        outline: none !important;
        box-shadow: none !important;
      }
      .bems-doc-hero-meta p { font-size: 11px !important; }
      .bems-doc-parties { border-radius: 8px !important; }
      .bems-doc-party { padding: 6px 12px !important; }
      .bems-doc-party .nm { font-size: 13px !important; margin: 2px 0 !important; }
      .bems-doc-party p { font-size: 10px !important; line-height: 1.4 !important; }
      .bems-stmt-kpi-grid { gap: 8px !important; margin-bottom: 0 !important; }
      .bems-stmt-kpi-card { padding: 5px 10px !important; border-radius: 6px !important; }
      .bems-stmt-kpi-card .kpi-label { font-size: 8px !important; margin-bottom: 2px !important; }
      .bems-stmt-kpi-card .kpi-val { font-size: 12.5px !important; }
      .bems-doc-table { margin-top: 2px !important; }
      .bems-doc-table th { padding: 5px 8px !important; font-size: 8px !important; }
      .bems-doc-table td { padding: 5.5px 8px !important; font-size: 10px !important; }
      .bems-doc-table tr { page-break-inside: avoid !important; }
      .bems-doc-hero, .bems-doc-parties, .bems-stmt-kpi-grid, .bems-doc-vt, .bems-doc-sign {
        page-break-inside: avoid !important;
      }
      .bems-doc-vt { gap: 14px !important; grid-template-columns: 1fr 220px !important; }
      .bems-doc-verify { padding: 6px 10px !important; }
      .bems-doc-tot dt, .bems-doc-tot dd { font-size: 10px !important; }
      .bems-doc-tot .grand { padding: 5px 8px !important; font-size: 13px !important; }
      .bems-doc-body .bems-doc-sign,
      .bems-doc-sign {
        margin-top: 10px !important;
        padding-top: 8px !important;
        padding-bottom: 4px !important;
        display: grid !important;
        grid-template-columns: 1fr 210px !important;
        gap: 16px !important;
        align-items: end !important;
      }
      .bems-doc-footer-group {
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        background: #ffffff !important;
        z-index: 10 !important;
      }
      .bems-doc-keep { font-size: 9px !important; padding: 6px 10px !important; line-height: 1.35 !important; }
      .bems-doc-sign-right { position: relative !important; width: 210px !important; max-width: 210px !important; display: block !important; text-align: center !important; }
      .bems-doc-sig { width: 100% !important; max-width: 210px !important; position: relative !important; z-index: 1 !important; text-align: center !important; }
      .bems-doc-sig-img { height: 48px !important; max-width: 120px !important; margin: 0 auto 3px auto !important; mix-blend-mode: multiply !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; position: relative !important; z-index: 3 !important; }
      .bems-doc-sig .ln { height: 0 !important; margin: 0 !important; padding: 0 !important; border-bottom: 1.5px solid #111 !important; width: 100% !important; position: relative !important; z-index: 1 !important; }
      .bems-doc-sig b { text-align: center !important; }
      .bems-doc-sig span { text-align: center !important; }
      .bems-doc-stamp-wrapper { position: absolute !important; left: 50% !important; top: 22px !important; transform: translate(-50%, -50%) !important; right: auto !important; margin: 0 !important; z-index: 2 !important; pointer-events: none !important; mix-blend-mode: multiply !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .bems-official-stamp { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; mix-blend-mode: multiply !important; opacity: 0.92 !important; }
      .bems-doc-thanks { padding: 6px 10mm !important; }
      .bems-doc-thanks h3 { font-size: 12.5px !important; }
      .bems-doc-thanks span { font-size: 9px !important; }
      .bems-doc-foot { padding: 4px 10mm 5px !important; font-size: 8.5px !important; }
    }
  </style>
</head>
<body>

  <!-- Floating Download / Action Toolbar (Hidden during Print) -->
  <div class="bems-action-bar no-print">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="background:#16a34a;color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;">
        OFFICIAL STATEMENT
      </span>
      <span style="font-size:12px;color:#cbd5e1;">
        ${driverName} (${walletAccountNo})
      </span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <button class="bems-action-btn" onclick="window.print()">
        <i class="ri-printer-line" style="font-size:15px;"></i>
        Download PDF / Print
      </button>
    </div>
  </div>

  <!-- A4 Printable Document Root (Page 1) -->
  <div class="bems-doc-page ${isMultiPage ? 'bems-doc-page-1-multi' : ''}" id="statement-document">
    <div class="bems-doc-body" style="${isMultiPage ? 'padding-bottom:24px !important;' : ''}">

      <!-- Header -->
      <header class="bems-doc-head">
        <div>
          <div class="bems-doc-logo">
            <img src="https://api.bemsfarms.com/uploads/bemsfarms_logo.png" alt="Bems Farms" onerror="this.src='/bemsfarms_logo_compact.png'">
          </div>
          <div class="bems-doc-dept-badge">
            <span class="badge-pulse-dot"></span>
            Logistics & Fleet Operations Hub
          </div>
          <div class="bems-doc-co">
            <b>${companyName}</b> · RC: 1892041<br>
            ${companyAddress}<br>
            ${companyEmail} · ${companyPhone}
          </div>
        </div>

        <div class="bems-doc-meta-right">
          <div class="bems-doc-status-badge">
            <span class="badge-dot"></span>
            Official Settlement Record
          </div>
          <h1>Statement of Account</h1>
          <div class="bems-doc-ref-wrap">
            <span class="bems-doc-ref-pill">
              <span class="ref-prefix">DOCUMENT ID</span>
              ${statementRef}
            </span>
          </div>
          <div class="bems-doc-dates">
            <span>Period: <b>${formatDate(periodStart)} – ${formatDate(periodEnd)}</b></span>
            <span class="dt-sep">·</span>
            <span>Generated: <b>${issuedDate}</b></span>
          </div>
        </div>
      </header>

      <!-- Hero Banner with Guilloche Security Waves & Stamp -->
      <section class="bems-doc-hero">
        <svg class="bems-doc-guil" viewBox="0 0 720 190" preserveAspectRatio="none" fill="none" stroke="#9fd6a9" stroke-width=".6" opacity=".22">
          <polyline points="0,95.0 4,100.0 8,104.9 12,109.8 16,114.5 20,119.1 24,123.6 28,127.8 32,131.8 36,135.5 40,139.0 44,142.1 48,144.9 52,147.4 56,149.5 60,151.2 64,152.6 68,153.5 72,154.1 76,154.3 80,154.1 84,153.6 88,152.7 92,151.5 96,150.0 100,148.2 104,146.1 108,143.8 112,141.2 116,138.5 120,135.6 124,132.6 128,129.5 132,126.4 136,123.2 140,120.1 144,117.0 148,113.9 152,111.0 156,108.2 160,105.6 164,103.1 168,100.9 172,98.9 176,97.2 180,95.7 184,94.5 188,93.6 192,93.0 196,92.6 200,92.6 204,92.8 208,93.4 212,94.2 216,95.2 220,96.5 224,98.1 228,99.8 232,101.7 236,103.7 240,105.9 244,108.2 248,110.5 252,112.9 256,115.2 260,117.6 264,119.9 268,122.0 272,124.1 276,126.0 280,127.7 284,129.2 288,130.4 292,131.4 296,132.1 300,132.5 304,132.6 308,132.4 312,131.8 316,130.9 320,129.7 324,128.1 328,126.1 332,123.8 336,121.2 340,118.3 344,115.1 348,111.6 352,107.9 356,103.9 360,99.8 364,95.5 368,91.0 372,86.4 376,81.8 380,77.1 384,72.5 388,67.8 392,63.2 396,58.8 400,54.5 404,50.3 408,46.4 412,42.7 416,39.2 420,36.1 424,33.3 428,30.8 432,28.7 436,26.9 440,25.5 444,24.6 448,24.0 452,23.8 456,24.1 460,24.7 464,25.7 468,27.1 472,28.9 476,31.0 480,33.4 484,36.1 488,39.1 492,42.4 496,45.9 500,49.6 504,53.4 508,57.4 512,61.4 516,65.5 520,69.6 524,73.7 528,77.7 532,81.7 536,85.6 540,89.3 544,92.8 548,96.1 552,99.2 556,102.1 560,104.6 564,106.9 568,108.9 572,110.6 576,112.0 580,113.1 584,113.8 588,114.3 592,114.4 596,114.2 600,113.8 604,113.0 608,112.0 612,110.8 616,109.4 620,107.8 624,106.0 628,104.1 632,102.1 636,100.1 640,97.9 644,95.8 648,93.8 652,91.7 656,89.8 660,88.0 664,86.3 668,84.8 672,83.5 676,82.4 680,81.6 684,81.0 688,80.8 692,80.8 696,81.1 700,81.7 704,82.6 708,83.8 712,85.4 716,87.2 720,89.3" />
        </svg>

        <div class="bems-doc-hero-top">
          <div>
            <div class="cap">Net Available / Closing Balance</div>
            <div class="bems-doc-amt">
              <small class="naira">₦</small>${closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div class="bems-doc-words">${balanceInWords}</div>
          </div>

          <div class="bems-doc-stamp">
            <div>
              <span>BEMS FARMS</span>
              <b>AUDITED</b>
              <span>RECONCILED</span>
            </div>
          </div>
        </div>

        <div class="bems-doc-hero-meta">
          <div>
            <div class="cap">Opening Balance</div>
            <p>₦${openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <div class="cap">Total Earned (Gross)</div>
            <p>+₦${totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <div class="cap">Total Disbursed</div>
            <p>-₦${totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <div class="cap">Completed Drops</div>
            <p>${totalTrips} ${totalTrips === 1 ? 'Delivery' : 'Deliveries'}</p>
          </div>
          <div>
            <div class="cap">Wallet Status</div>
            <p style="color:${driver.wallet_is_frozen ? '#fca5a5' : '#9fe0b3'};">
              ${driver.wallet_is_frozen ? 'Frozen / Suspended' : 'Active · Good Standing'}
            </p>
          </div>
        </div>
      </section>

      <!-- Parties Block -->
      <section class="bems-doc-parties">
        <div class="bems-doc-party">
          <div class="cap">Driver & Fleet Profile</div>
          <div class="nm">${driverName}</div>
          <p>
            <b>Wallet Account:</b> <span class="mono">${walletAccountNo}</span><br>
            <b>Phone:</b> ${driverPhone} · <b>Email:</b> ${driverEmail}<br>
            <b>Vehicle:</b> ${vehicleType} (${vehiclePlate})<br>
            <b>License No:</b> ${licenseNumber} · <b>Base:</b> Abia & Rivers Region
          </p>
        </div>

        <div class="bems-doc-party">
          <div class="cap">Designated Bank Settlement Details</div>
          <div class="nm">${bankName}</div>
          <p>
            <b>Account Name:</b> ${accountName}<br>
            <b>Account Number (NUBAN):</b> <span class="mono">${accountNumber}</span><br>
            <b>Settlement Mode:</b> Monnify Instant / Scheduled Fleet Batch<br>
            <b>Logistics Helpline:</b> ${companyPhone}
          </p>
        </div>
      </section>

      <!-- 4-Card Summary Strip -->
      <div class="bems-stmt-kpi-grid">
        <div class="bems-stmt-kpi-card">
          <div class="kpi-label">Opening Balance</div>
          <div class="kpi-val">₦${openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="bems-stmt-kpi-card">
          <div class="kpi-label">Total Credits (+)</div>
          <div class="kpi-val" style="color:#166534;">
            +₦${totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div class="bems-stmt-kpi-card">
          <div class="kpi-label">Total Withdrawals (-)</div>
          <div class="kpi-val" style="color:#991B1B;">
            -₦${totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div class="bems-stmt-kpi-card highlight">
          <div class="kpi-label">Net Closing Balance</div>
          <div class="kpi-val" style="color:#0f3622;">
            ₦${closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <!-- Itemized Ledger Table -->
      <table class="bems-doc-table">
        <thead>
          <tr>
            <th style="width:5%;">#</th>
            <th style="width:13%;">Date</th>
            <th>Activity & Transaction Details</th>
            <th style="width:16%;">Reference</th>
            <th class="c" style="width:10%;">Type</th>
            <th class="r" style="width:14%;">Amount (₦)</th>
            <th class="r" style="width:15%;">Balance (₦)</th>
          </tr>
        </thead>
        <tbody>
          ${renderRowsHtml(page1Rows, 0)}
        </tbody>
      </table>

      ${!isMultiPage ? totalsAndSignoffHtml : `
        <div class="bems-stmt-page-indicator">
          <span>Statement ${statementRef} · Driver: ${driverName}</span>
          <span style="font-weight:600;color:#0f3622;">Page 1 of ${totalPages} · Continues on Page 2 ──►</span>
        </div>
      `}

    </div>

    ${!isMultiPage ? footerGroupHtml : ''}
  </div>

  ${continuationPagesHtml}

  ${autoPrint ? `
    <script>
      window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
      });
    </script>
  ` : ''}

</body>
</html>`;
}

module.exports = {
  renderDriverStatementHtml,
  numberToWords,
  formatDate,
  generateSecurityCode,
};
