/**
 * driverStatementTemplate.js
 * Generates an executive, print/PDF-ready HTML Statement of Account for Bems Farms Drivers.
 * Styled in the Modern Fintech visual language (Emerald Header Band, Structured Summary Cards, High-Contrast Clean Ledger).
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
    <div class="bems-official-stamp" style="display:inline-block;width:72px;height:72px;transform:rotate(-12deg);user-select:none;flex-shrink:0;mix-blend-mode:multiply;opacity:0.94;">
      <svg viewBox="0 0 140 140" width="72" height="72" style="display:block;overflow:visible">
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
  const walletAccountNo = driver.wallet_account_number || `DRV-${String(driver.id || 1).padStart(4, '0')}`;

  const bankName = driver.bank_name || 'Designated Commercial Bank';
  const accountNumber = driver.account_number || '—';

  const openingBalance = Number(summary.opening_balance || 0);
  const totalCredits = Number(summary.total_credits || driver.total_earnings || 0);
  const totalDebits = Number(summary.total_debits || driver.total_paid || 0);
  const closingBalance = Number(summary.closing_balance ?? (totalCredits - totalDebits));

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

  // Multi-Page Chunking Logic
  const isMultiPage = statement.length > 6;

  let page1Count = Math.min(statement.length, 8);
  if (isMultiPage && statement.length - page1Count < 2) {
    page1Count = Math.ceil(statement.length / 2);
  }

  const page1Rows = isMultiPage ? statement.slice(0, page1Count) : statement;
  const afterPage1 = isMultiPage ? statement.slice(page1Count) : [];

  const remainingPages = [];
  if (isMultiPage && afterPage1.length > 0) {
    let remaining = [...afterPage1];
    while (remaining.length > 0) {
      if (remaining.length <= 10) {
        remainingPages.push({ rows: remaining, isFinal: true });
        remaining = [];
      } else {
        const chunkSize = Math.min(14, remaining.length - 2);
        remainingPages.push({ rows: remaining.slice(0, chunkSize), isFinal: false });
        remaining = remaining.slice(chunkSize);
      }
    }
  }

  const totalPages = isMultiPage ? 1 + remainingPages.length : 1;

  function renderRowsHtml(rows, startIndex = 0) {
    if (!rows || rows.length === 0) {
      return `<tr><td colspan="7" style="text-align:center;padding:30px 12px;color:#64748b;">No recorded transactions during this statement period.</td></tr>`;
    }
    return rows.map((ev, idx) => {
      const isCredit = ev.type === 'credit';
      const amt = parseFloat(ev.amount) || 0;
      const runningBal = ev.running_balance !== undefined ? parseFloat(ev.running_balance) : null;
      const rowNum = String(startIndex + idx + 1).padStart(2, '0');
      const desc = cleanStatementDescription(ev.description) || (isCredit ? 'Delivery Drop Commission' : 'Bank Withdrawal');
      const orderBadge = ev.order_id ? `<span style="background:#f1f5f9;color:#475569;font-size:8.5px;font-weight:700;padding:2px 5px;border-radius:4px;margin-left:6px;border:1px solid #e2e8f0;letter-spacing:0.04em;">ORDER #${ev.order_id}</span>` : '';
      const addressHtml = ev.delivery_address ? `<div style="font-size:9px;color:#64748b;margin-top:2px;">${ev.delivery_address}</div>` : '';

      return `
        <tr>
          <td class="mono" style="color:#94a3b8;font-size:10px;">${rowNum}</td>
          <td class="mono" style="font-size:10px;">${formatDate(ev.date)}</td>
          <td style="font-size:10.5px;">
            <b style="color:#0f172a;">${desc}</b>${orderBadge}
            ${addressHtml}
          </td>
          <td class="mono" style="font-size:9.5px;color:#0f3622;font-weight:600;">${ev.reference || '—'}</td>
          <td style="text-align:center;">
            <span class="${isCredit ? 'bems-stmt-badge-cr' : 'bems-stmt-badge-dr'}">
              ${isCredit ? 'CR' : 'DR'}
            </span>
          </td>
          <td class="mono ${isCredit ? 'bems-stmt-amt-cr' : 'bems-stmt-amt-dr'}" style="text-align:right;">
            ${isCredit ? '+' : '-'}₦${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td class="mono" style="text-align:right;font-weight:600;color:#0f3622;">
            ${runningBal !== null ? `₦${runningBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </td>
        </tr>
      `;
    }).join('');
  }

  const closingBlockHtml = `
    <div class="bems-fintech-closing">
      <div class="bems-fintech-verify">
        <div class="bems-fintech-qr">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="Verify Statement QR" style="width:50px;height:50px;display:block;">` : '<span style="font-size:10px;font-weight:700;color:#0f3622;">QR</span>'}
        </div>
        <div class="bems-fintech-verify-info">
          <h4>Official Settlement Verification</h4>
          <p>Scan with any device or visit bemsfarms.com/verify to authenticate tamper-proof ledger record.</p>
          <div class="bems-fintech-sec-hash mono">${securityCode}</div>
        </div>
      </div>

      <div class="bems-fintech-sign-box">
        <div class="bems-fintech-stamp-wrap">
          ${getOfficialStampSvg(companyName)}
        </div>
        ${signatureUrl ? `<img src="${signatureUrl}" alt="Authorised Signature" class="bems-fintech-sig-img">` : '<div style="height:34px;"></div>'}
        <div class="bems-fintech-sig-line"></div>
        <div class="bems-fintech-sig-name">For ${companyName}</div>
        <div class="bems-fintech-sig-title">Financial Controller &amp; Fleet Operations</div>
      </div>
    </div>
  `;

  const footerHtml = `
    <div class="bems-fintech-foot">
      <span><b>Bems Farms Global Ltd</b> · Official Fleet Settlement Hub</span>
      <span>Abia State, Nigeria · www.bemsfarms.com</span>
      <span>${companyEmail}</span>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Statement of Account - ${statementRef} - ${driverName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0b1320;
      color: #0f172a;
      padding: 30px 0;
      -webkit-font-smoothing: antialiased;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }

    .no-print { display: flex; }
    .bems-action-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      max-width: 210mm;
      margin: 0 auto 20px auto;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 10px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .bems-action-btn {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .bems-fintech-page {
      width: 210mm;
      height: 297mm;
      min-height: 297mm;
      max-height: 297mm;
      margin: 0 auto 30px auto;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(15, 54, 34, 0.16);
      box-sizing: border-box;
    }
    .bems-fintech-page:last-child { margin-bottom: 0; }

    .bems-fintech-band {
      background: linear-gradient(135deg, #062315 0%, #0a3d24 55%, #145a35 100%);
      color: #ffffff;
      padding: 13mm 16mm 11mm 16mm;
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 3.5px solid #10b981;
      flex-shrink: 0;
    }
    .bems-fintech-band::after {
      content: "";
      position: absolute;
      right: 0; top: 0; bottom: 0;
      width: 320px;
      background: radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.16) 0%, transparent 70%);
      pointer-events: none;
    }
    .bems-fintech-brand-col {
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1;
    }
    .bems-fintech-logo-wrap {
      display: inline-flex;
      align-items: center;
      background: #ffffff;
      padding: 5px 12px;
      border-radius: 8px;
      width: fit-content;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
    }
    .bems-fintech-logo-wrap img {
      height: 28px;
      width: auto;
      display: block;
    }
    .bems-fintech-brand-legal {
      font-size: 10px;
      line-height: 1.5;
      color: #cbd5e1;
    }
    .bems-fintech-brand-legal b {
      color: #ffffff;
      font-weight: 700;
    }
    .bems-fintech-meta-col {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      z-index: 1;
    }
    .bems-fintech-doc-type {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #34d399;
    }
    .bems-fintech-doc-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      line-height: 1.1;
      margin: 0;
    }
    .bems-fintech-id-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.22);
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10.5px;
      color: #f1f5f9;
      font-weight: 600;
      margin-top: 2px;
    }
    .bems-fintech-period {
      font-size: 9.5px;
      color: #cbd5e1;
      margin-top: 2px;
    }
    .bems-fintech-period b { color: #ffffff; }

    .bems-fintech-continuation-band {
      background: linear-gradient(135deg, #062315 0%, #0a3d24 100%);
      color: #ffffff;
      padding: 9px 16mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #10b981;
      font-size: 10px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .bems-fintech-continuation-band b { color: #34d399; }

    .bems-fintech-body {
      padding: 13px 16mm;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
      box-sizing: border-box;
    }

    .bems-fintech-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: 12px;
    }
    .bems-fintech-card {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
    }
    .bems-fintech-card-head {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .bems-fintech-driver-name {
      font-size: 15.5px;
      font-weight: 800;
      color: #064e3b;
      margin-bottom: 6px;
    }
    .bems-fintech-kv-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 12px;
      font-size: 9.5px;
    }
    .bems-fintech-kv-item {
      display: flex;
      flex-direction: column;
    }
    .bems-fintech-kv-label {
      font-size: 8px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 1px;
    }
    .bems-fintech-kv-val {
      font-weight: 600;
      color: #0f172a;
    }

    .bems-fintech-card.balance-highlight {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .bems-fintech-bal-amt {
      font-size: 25px;
      font-weight: 800;
      color: #064e3b;
      letter-spacing: -0.02em;
      line-height: 1;
      margin-bottom: 3px;
    }
    .bems-fintech-bal-amt small {
      font-size: 15px;
      font-weight: 600;
      margin-right: 2px;
    }
    .bems-fintech-bal-words {
      font-size: 9.5px;
      color: #166534;
      font-style: italic;
      margin-bottom: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bems-fintech-sub-kpi-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      padding-top: 7px;
      border-top: 1px dashed #bbf7d0;
    }
    .bems-fintech-sub-kpi-col {
      display: flex;
      flex-direction: column;
    }
    .bems-fintech-sub-kpi-lbl {
      font-size: 7.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.05em;
    }
    .bems-fintech-sub-kpi-val {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 1px;
    }

    .bems-fintech-ledger-wrap {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .bems-fintech-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    .bems-fintech-table thead th {
      background: #0f172a;
      color: #f8fafc;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 7.5px 10px;
      text-align: left;
    }
    .bems-fintech-table tbody td {
      padding: 7px 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: middle;
    }
    .bems-fintech-table tbody tr:nth-child(even) { background: #fafcfb; }
    .bems-fintech-table tbody tr:last-child td { border-bottom: none; }

    .bems-stmt-badge-cr {
      background: #dcfce7;
      color: #15803d;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      display: inline-block;
    }
    .bems-stmt-badge-dr {
      background: #fee2e2;
      color: #b91c1c;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      display: inline-block;
    }
    .bems-stmt-amt-cr { color: #15803d; font-weight: 700; }
    .bems-stmt-amt-dr { color: #b91c1c; font-weight: 700; }

    .bems-fintech-indicator {
      margin-top: auto;
      padding: 9px 12px;
      background: #f8fafc;
      border: 1px dashed #e2e8f0;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
    }

    .bems-fintech-closing {
      display: grid;
      grid-template-columns: 1fr 220px;
      gap: 16px;
      margin-top: auto;
      padding-top: 10px;
      align-items: center;
      border-top: 1px solid #e2e8f0;
    }
    .bems-fintech-verify {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 9px 12px;
    }
    .bems-fintech-qr {
      width: 58px;
      height: 58px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .bems-fintech-verify-info h4 {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .bems-fintech-verify-info p {
      font-size: 9px;
      color: #64748b;
      line-height: 1.4;
      margin-bottom: 3px;
    }
    .bems-fintech-sec-hash {
      font-size: 9px;
      font-weight: 700;
      color: #064e3b;
      letter-spacing: 0.05em;
    }

    .bems-fintech-sign-box {
      position: relative;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .bems-fintech-stamp-wrap {
      position: absolute;
      top: -22px;
      right: 18px;
      pointer-events: none;
      z-index: 2;
    }
    .bems-fintech-sig-img {
      height: 44px;
      max-width: 120px;
      object-fit: contain;
      display: block;
      margin: 0 auto -10px auto;
      position: relative;
      z-index: 1;
      mix-blend-mode: multiply;
    }
    .bems-fintech-sig-line {
      border-bottom: 1.5px solid #0f172a;
      width: 100%;
      margin: 28px 0 5px 0;
      position: relative;
      z-index: 1;
    }
    .bems-fintech-sig-name {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .bems-fintech-sig-title {
      font-size: 9px;
      color: #64748b;
    }

    .bems-fintech-foot {
      background: #092c19;
      color: #94a3b8;
      padding: 8px 16mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      flex-shrink: 0;
    }
    .bems-fintech-foot b { color: #ffffff; }

    @page { size: A4 portrait; margin: 0; }
    @media print {
      body { background: #ffffff !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .bems-fintech-page {
        box-shadow: none !important;
        margin: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .bems-fintech-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Download / Action Toolbar (Hidden during Print) -->
  <div class="bems-action-bar no-print">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="background:#10b981;color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;">
        OFFICIAL STATEMENT
      </span>
      <span style="font-size:12px;color:#cbd5e1;">
        ${driverName} (${walletAccountNo})
      </span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <button class="bems-action-btn" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Download PDF / Print
      </button>
    </div>
  </div>

  <!-- Page 1 -->
  <div class="bems-fintech-page">
    <div class="bems-fintech-band">
      <div class="bems-fintech-brand-col">
        <div class="bems-fintech-logo-wrap">
          <img src="https://api.bemsfarms.com/uploads/bemsfarms_logo.png" alt="Bems Farms" onerror="this.src='/bemsfarms_logo_compact.png'">
        </div>
        <div class="bems-fintech-brand-legal">
          <b>${companyName}</b> · RC: 1892041<br>
          ${companyAddress}<br>
          ${companyEmail}${companyPhone ? ` · ${companyPhone}` : ''}
        </div>
      </div>

      <div class="bems-fintech-meta-col">
        <div class="bems-fintech-doc-type">Official Settlement Record</div>
        <h1 class="bems-fintech-doc-title">Statement of Account</h1>
        <div class="bems-fintech-id-badge">
          <span style="opacity:0.75;font-size:9px;">DOCUMENT ID</span>
          <b>${statementRef}</b>
        </div>
        <div class="bems-fintech-period">
          Period: <b>${formatDate(periodStart)} – ${formatDate(periodEnd)}</b> · Generated: <b>${issuedDate}</b>
        </div>
      </div>
    </div>

    <div class="bems-fintech-body">
      <div class="bems-fintech-summary-grid">
        <div class="bems-fintech-card">
          <div>
            <div class="bems-fintech-card-head">
              <span>Driver &amp; Logistics Account</span>
              <span style="color:#10b981;font-weight:700;">● Active Fleet</span>
            </div>
            <div class="bems-fintech-driver-name">${driverName}</div>
            <div class="bems-fintech-kv-grid">
              <div class="bems-fintech-kv-item">
                <span class="bems-fintech-kv-label">Wallet Account</span>
                <span class="bems-fintech-kv-val mono">${walletAccountNo}</span>
              </div>
              <div class="bems-fintech-kv-item">
                <span class="bems-fintech-kv-label">Contact Phone</span>
                <span class="bems-fintech-kv-val">${driverPhone}</span>
              </div>
              <div class="bems-fintech-kv-item">
                <span class="bems-fintech-kv-label">Assigned Vehicle</span>
                <span class="bems-fintech-kv-val">${vehicleType}${vehiclePlate ? ` (${vehiclePlate})` : ''}</span>
              </div>
              <div class="bems-fintech-kv-item">
                <span class="bems-fintech-kv-label">Designated Bank</span>
                <span class="bems-fintech-kv-val">${bankName} · ${accountNumber}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bems-fintech-card balance-highlight">
          <div>
            <div class="bems-fintech-card-head">
              <span style="color:#15803d;">Net Closing Balance</span>
              <span style="font-size:9.5px;color:#16a34a;font-weight:700;">Audited &amp; Reconciled</span>
            </div>
            <div class="bems-fintech-bal-amt mono">
              <small>₦</small>${closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div class="bems-fintech-bal-words">
              ${balanceInWords}
            </div>
          </div>

          <div class="bems-fintech-sub-kpi-bar">
            <div class="bems-fintech-sub-kpi-col">
              <span class="bems-fintech-sub-kpi-lbl">Opening Balance</span>
              <span class="bems-fintech-sub-kpi-val mono">
                ₦${openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div class="bems-fintech-sub-kpi-col">
              <span class="bems-fintech-sub-kpi-lbl">Total Credits</span>
              <span class="bems-fintech-sub-kpi-val mono" style="color:#15803d;">
                +₦${totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div class="bems-fintech-sub-kpi-col">
              <span class="bems-fintech-sub-kpi-lbl">Total Debits</span>
              <span class="bems-fintech-sub-kpi-val mono" style="color:#b91c1c;">
                -₦${totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="bems-fintech-ledger-wrap">
        <table class="bems-fintech-table">
          <thead>
            <tr>
              <th style="width:5%;">#</th>
              <th style="width:13%;">Date</th>
              <th>Activity &amp; Transaction Details</th>
              <th style="width:16%;">Reference</th>
              <th style="width:10%;text-align:center;">Type</th>
              <th style="width:14%;text-align:right;">Amount (₦)</th>
              <th style="width:15%;text-align:right;">Balance (₦)</th>
            </tr>
          </thead>
          <tbody>
            ${renderRowsHtml(page1Rows, 0)}
          </tbody>
        </table>
      </div>

      ${!isMultiPage ? closingBlockHtml : `
        <div class="bems-fintech-indicator">
          <span>Statement ${statementRef} · Driver: ${driverName}</span>
          <span style="font-weight:700;color:#064e3b;">Page 1 of ${totalPages} · Continues on Page 2 ──►</span>
        </div>
      `}
    </div>

    ${!isMultiPage ? footerHtml : ''}
  </div>

  <!-- Continuation Pages (if any) -->
  ${isMultiPage ? remainingPages.map((page, pageIdx) => {
    const pageNum = pageIdx + 2;
    let priorRowsCount = page1Rows.length;
    for (let i = 0; i < pageIdx; i++) {
      priorRowsCount += remainingPages[i].rows.length;
    }
    return `
      <div class="bems-fintech-page">
        <div class="bems-fintech-continuation-band">
          <span>Official Statement of Account (Continued) — <b>${statementRef}</b></span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>

        <div class="bems-fintech-body">
          <div class="bems-fintech-ledger-wrap">
            <table class="bems-fintech-table">
              <thead>
                <tr>
                  <th style="width:5%;">#</th>
                  <th style="width:13%;">Date</th>
                  <th>Activity &amp; Transaction Details</th>
                  <th style="width:16%;">Reference</th>
                  <th style="width:10%;text-align:center;">Type</th>
                  <th style="width:14%;text-align:right;">Amount (₦)</th>
                  <th style="width:15%;text-align:right;">Balance (₦)</th>
                </tr>
              </thead>
              <tbody>
                ${renderRowsHtml(page.rows, priorRowsCount)}
              </tbody>
            </table>
          </div>

          ${page.isFinal ? closingBlockHtml : `
            <div class="bems-fintech-indicator">
              <span>Statement ${statementRef} · Driver: ${driverName}</span>
              <span style="font-weight:700;color:#064e3b;">Page ${pageNum} of ${totalPages} · Continues on Page ${pageNum + 1} ──►</span>
            </div>
          `}
        </div>

        ${page.isFinal ? footerHtml : ''}
      </div>
    `;
  }).join('') : ''}

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
