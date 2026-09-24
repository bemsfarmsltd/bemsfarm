import React, { useState, useEffect, useMemo } from 'react'
import QRCode from 'qrcode'
import './bems-document.css'

/**
 * Converts a numeric amount to formal Nigerian Naira words
 * e.g. 14500 -> "Fourteen thousand five hundred naira only"
 */
export function numberToWords(num) {
  if (!num || isNaN(num)) return 'Zero naira only'
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convertGroup(n) {
    if (n === 0) return ''
    if (n < 20) return a[n] + ' '
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10].toLowerCase() : '') + ' '
    return a[Math.floor(n / 100)] + ' hundred ' + (n % 100 !== 0 ? 'and ' + convertGroup(n % 100) : '')
  }

  const integerPart = Math.floor(Math.abs(num))
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100)

  if (integerPart === 0 && decimalPart === 0) return 'Zero naira only'

  const billions = Math.floor(integerPart / 1000000000)
  const millions = Math.floor((integerPart % 1000000000) / 1000000)
  const thousands = Math.floor((integerPart % 1000000) / 1000)
  const remainder = integerPart % 1000

  let words = ''
  if (billions) words += convertGroup(billions) + 'billion '
  if (millions) words += convertGroup(millions) + 'million '
  if (thousands) words += convertGroup(thousands) + 'thousand '
  if (remainder) words += convertGroup(remainder)

  words = words.trim()
  // Capitalize first letter, keep rest lowercase/natural
  words = words.charAt(0).toUpperCase() + words.slice(1).toLowerCase() + ' naira'
  if (decimalPart > 0) {
    words += ' and ' + convertGroup(decimalPart).trim().toLowerCase() + ' kobo'
  }
  return words + ' only'
}

/**
 * Format date nicely to "23 Sep 2026"
 */
function formatDate(val) {
  if (!val) return '—'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(val)
  }
}

/**
 * Generate a deterministic security code from a string reference
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
 * BemsOfficialDocument
 * Pixel-perfect implementation of the official Bems Farms Offline Sales Invoice and Receipt
 */
export default function BemsOfficialDocument({
  documentType = 'invoice', // 'invoice' | 'tax_invoice' | 'proforma' | 'receipt'
  data = {},
  bankSettings = null,
  showPrintStyles = true
}) {
  const isReceipt = documentType === 'receipt'
  const isProforma = documentType === 'proforma'

  // Identifiers
  const invoiceNo = data.id || data.invoice_ref || 'INV-2026-0001'
  const receiptNo = data.receiptNo || (invoiceNo.startsWith('INV-') ? invoiceNo.replace('INV-', 'REC-') : `REC-${invoiceNo}`)
  const transactionRef = data.paymentRef || data.payment_reference || data.transactionRef || (invoiceNo.startsWith('INV-') ? invoiceNo.replace('INV-', 'TXN-') : `TXN-${invoiceNo}`)
  const docNumber = isReceipt ? receiptNo : invoiceNo

  // Dates
  const issuedDate = formatDate(data.issuedDate || data.created_at || new Date())
  const dueDate = formatDate(data.dueDate || new Date(Date.now() + 7 * 86400000))
  const paidDate = formatDate(data.paidDate || data.payment_date || data.issuedDate || new Date())

  // Customer
  const customerName = data.customer?.name || data.customer?.full_name || data.customName || 'Valued Customer'
  const customerAddress = data.customer?.address || data.customAddress || data.shipping_address || 'Central Farm Settlement Hub, Umuahia, Abia State'
  const customerPhone = data.customer?.phone || data.customPhone || ''
  const customerEmail = data.customer?.email || data.customEmail || ''

  // Items
  const rawItems = Array.isArray(data.items) ? data.items : []
  const items = rawItems.length > 0 ? rawItems : [
    {
      name: 'Fresh Farm Produce',
      pack: 'Standard pack',
      qty: 1,
      price: data.amount || 0,
      total: data.amount || 0,
      tag: 'Grade A'
    }
  ]

  // Totals
  const subtotal = data.subtotal || items.reduce((acc, it) => acc + Number(it.total || (it.qty * it.price) || 0), 0)
  const discount = Number(data.discount || 0)
  const total = Number(data.amount || (subtotal - discount))
  const isPaid = isReceipt || data.status === 'paid'
  const amountPaid = isPaid ? total : Number(data.amountPaid || 0)
  const balanceDue = Math.max(0, total - amountPaid)

  // Words
  const amountInWords = numberToWords(isReceipt ? amountPaid : total)

  // Status label
  let statusText = 'Awaiting payment'
  let statusColor = '#f0dc97'
  if (isPaid) {
    statusText = 'Confirmed'
    statusColor = '#9fe0b3'
  } else if (data.status === 'overdue') {
    statusText = 'Past Due'
    statusColor = '#fca5a5'
  } else if (data.status === 'cancelled') {
    statusText = 'Cancelled'
    statusColor = '#cbd5e1'
  }

  // Security code for verification
  const securityCode = generateSecurityCode(docNumber, total)

  // Dynamic Bank and Company Info
  const accountName = bankSettings?.invoice_account_name || bankSettings?.account_name || 'Bems Farms Limited'
  const bankName = bankSettings?.invoice_bank_name || bankSettings?.bank_name || 'Moniepoint MFB / Zenith Bank'
  const accountNumber = bankSettings?.invoice_account_number || bankSettings?.account_number || '1023849502'
  const secondaryBank = bankSettings?.invoice_secondary_bank || bankSettings?.secondary_bank || ''
  const secondaryAccount = bankSettings?.invoice_secondary_account_number || bankSettings?.secondary_account || ''
  const companyName = bankSettings?.invoice_company_name || bankSettings?.company_name || 'Bems Farms Limited'
  const companyAddress = bankSettings?.invoice_company_address || bankSettings?.company_address || 'Central Farm Settlement Hub, Umuahia, Abia State'
  const rcNumber = bankSettings?.invoice_rc_number || bankSettings?.rc_number || 'RC 1849204'
  const tinNumber = bankSettings?.invoice_tin || bankSettings?.tin || 'TIN 24819402-0001'
  const companyEmail = bankSettings?.invoice_email || bankSettings?.email || 'corporate@bemsfarms.com'
  const companyPhone = bankSettings?.invoice_phone || bankSettings?.phone || '+234 800 236 7326 / +234 814 000 0000'

  // Dynamic Scannable QR Code generation
  const verifyUrl = useMemo(() => {
    let origin = 'https://bemsfarms.com'
    if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes(':517')) {
      origin = window.location.origin
    }
    return `${origin}/verify?ref=${encodeURIComponent(docNumber)}&code=${encodeURIComponent(securityCode)}`
  }, [docNumber, securityCode])

  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    let isMounted = true
    QRCode.toDataURL(verifyUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#123d27',
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

  const firstCustomerName = customerName.split(' ')[0] || 'Customer'

  return (
    <div className="bems-doc-root">
      <div className="bems-doc-page" id="bems-official-doc-page">
        <div className="bems-doc-body">

          {/* ── HEADER ── */}
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
              <div className="bems-doc-co">
                <b>{companyName}</b> · {companyAddress}<br />
                {rcNumber} · {tinNumber} · {companyEmail}
              </div>
            </div>

            <div className="bems-doc-meta-right">
              <div className="cap">
                {isReceipt ? 'Official' : (isProforma ? 'Proforma' : 'Tax invoice')}
              </div>
              <h1>
                {isReceipt ? 'Payment Receipt' : (isProforma ? 'Proforma Invoice' : 'Invoice')}
              </h1>
              <div className="no">{docNumber}</div>
              <div className="dt">
                {isReceipt ? `Issued ${issuedDate}` : `Issued ${issuedDate} · Due ${dueDate}`}
              </div>
            </div>
          </header>

          {/* ── HERO BANNER WITH GUILLOCHE & STAMP ── */}
          <section className="bems-doc-hero">
            {/* Guilloche SVG Security Wave Pattern */}
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
              <polyline points="0,119.3 4,123.9 8,128.5 12,132.9 16,137.1 20,141.2 24,144.9 28,148.4 32,151.6 36,154.5 40,157.0 44,159.2 48,160.9 52,162.3 56,163.3 60,164.0 64,164.2 68,164.0 72,163.4 76,162.4 80,161.1 84,159.4 88,157.4 92,155.1 96,152.5 100,149.6 104,146.5 108,143.1 112,139.6 116,136.0 120,132.3 124,128.4 128,124.6 132,120.7 136,116.9 140,113.1 144,109.5 148,105.9 152,102.5 156,99.3 160,96.3 164,93.6 168,91.1 172,88.8 176,86.9 180,85.2 184,83.9 188,82.8 192,82.1 196,81.6 200,81.5 204,81.7 208,82.1 212,82.8 216,83.8 220,85.0 224,86.4 228,88.0 232,89.8 236,91.7 240,93.7 244,95.7 248,97.8 252,99.9 256,102.0 260,104.1 264,106.0 268,107.9 272,109.6 276,111.1 280,112.4 284,113.5 288,114.3 292,114.9 296,115.2 300,115.3 304,115.0 308,114.4 312,113.4 316,112.2 320,110.6 324,108.7 328,106.6 332,104.1 336,101.4 340,98.3 344,95.1 348,91.6 352,88.0 356,84.2 360,80.2 364,76.2 368,72.1 372,68.0 376,63.8 380,59.7 384,55.7 388,51.7 392,47.9 396,44.3 400,40.9 404,37.7 408,34.8 412,32.2 416,29.9 420,27.9 424,26.3 428,25.0 432,24.2 436,23.7 440,23.7 444,24.0 448,24.7 452,25.9 456,27.4 460,29.3 464,31.6 468,34.2 472,37.1 476,40.4 480,43.9 484,47.7 488,51.7 492,56.0 496,60.3 500,64.8 504,69.4 508,74.0 512,78.7 516,83.3 520,87.9 524,92.4 528,96.8 532,101.0 536,105.1 540,108.9 544,112.5 548,115.8 552,118.9 556,121.6 560,124.1 564,126.2 568,128.0 572,129.4 576,130.5 580,131.2 584,131.6 588,131.7 592,131.4 596,130.9 600,130.0 604,128.9 608,127.5 612,126.0 616,124.2 620,122.2 624,120.1 628,117.9 632,115.6 636,113.3 640,110.9 644,108.6 648,106.3 652,104.1 656,102.0 660,100.1 664,98.3 668,96.7 672,95.3 676,94.2 680,93.3 684,92.6 688,92.3 692,92.2 696,92.4 700,92.9 704,93.7 708,94.8 712,96.2 716,97.9 720,99.8" />
              <polyline points="0,137.8 4,141.8 8,145.6 12,149.1 16,152.4 20,155.4 24,158.2 28,160.6 32,162.6 36,164.3 40,165.6 44,166.5 48,167.0 52,167.2 56,166.9 60,166.2 64,165.1 68,163.6 72,161.8 76,159.6 80,157.0 84,154.1 88,150.9 92,147.5 96,143.8 100,139.9 104,135.8 108,131.6 112,127.3 116,122.8 120,118.4 124,113.9 128,109.4 132,105.1 136,100.8 140,96.6 144,92.6 148,88.8 152,85.2 156,81.9 160,78.8 164,76.0 168,73.5 172,71.3 176,69.4 180,67.9 184,66.7 188,65.8 192,65.3 196,65.1 200,65.2 204,65.6 208,66.3 212,67.2 216,68.4 220,69.8 224,71.5 228,73.3 232,75.2 236,77.3 240,79.4 244,81.6 248,83.9 252,86.1 256,88.2 260,90.3 264,92.3 268,94.1 272,95.8 276,97.3 280,98.6 284,99.7 288,100.5 292,101.0 296,101.3 300,101.3 304,100.9 308,100.3 312,99.4 316,98.2 320,96.7 324,94.9 328,92.9 332,90.6 336,88.0 340,85.3 344,82.3 348,79.2 352,76.0 356,72.7 360,69.2 364,65.8 368,62.3 372,58.9 376,55.5 380,52.2 384,49.0 388,46.0 392,43.2 396,40.6 400,38.3 404,36.2 408,34.4 412,32.9 416,31.8 420,31.1 424,30.7 428,30.7 432,31.0 436,31.8 440,33.0 444,34.5 448,36.4 452,38.7 456,41.4 460,44.4 464,47.7 468,51.3 472,55.2 476,59.3 480,63.7 484,68.2 488,72.9 492,77.7 496,82.6 500,87.5 504,92.5 508,97.4 512,102.3 516,107.0 520,111.7 524,116.1 528,120.4 532,124.4 536,128.2 540,131.8 544,135.0 548,137.9 552,140.4 556,142.6 560,144.5 564,146.0 568,147.1 572,147.8 576,148.2 580,148.2 584,147.8 588,147.2 592,146.1 596,144.8 600,143.2 604,141.4 608,139.3 612,137.0 616,134.5 620,131.9 624,129.2 628,126.4 632,123.5 636,120.6 640,117.8 644,115.0 648,112.2 652,109.6 656,107.1 660,104.8 664,102.7 668,100.8 672,99.1 676,97.7 680,96.5 684,95.6 688,95.0 692,94.7 696,94.7 700,95.0 704,95.5 708,96.3 712,97.4 716,98.8 720,100.4" />
              <polyline points="0,146.7 4,149.7 8,152.4 12,154.9 16,157.0 20,158.9 24,160.4 28,161.6 32,162.4 36,162.8 40,162.8 44,162.5 48,161.7 52,160.5 56,159.0 60,157.1 64,154.8 68,152.1 72,149.1 76,145.8 80,142.2 84,138.3 88,134.2 92,129.9 96,125.4 100,120.7 104,116.0 108,111.1 112,106.3 116,101.4 120,96.6 124,91.8 128,87.2 132,82.6 136,78.3 140,74.1 144,70.2 148,66.6 152,63.2 156,60.1 160,57.3 164,54.9 168,52.8 172,51.1 176,49.7 180,48.7 184,48.1 188,47.8 192,47.9 196,48.2 200,49.0 204,50.0 208,51.3 212,52.9 216,54.7 220,56.7 224,58.9 228,61.2 232,63.7 236,66.3 240,68.9 244,71.5 248,74.2 252,76.8 256,79.3 260,81.7 264,84.0 268,86.2 272,88.1 276,89.9 280,91.4 284,92.7 288,93.7 292,94.4 296,94.9 300,95.1 304,95.0 308,94.6 312,93.9 316,92.9 320,91.7 324,90.2 328,88.4 332,86.5 336,84.3 340,82.0 344,79.5 348,76.9 352,74.2 356,71.5 360,68.7 364,65.9 368,63.1 372,60.4 376,57.8 380,55.4 384,53.1 388,50.9 392,49.1 396,47.4 400,46.1 404,45.0 408,44.2 412,43.8 416,43.7 420,44.0 424,44.6 428,45.6 432,47.0 436,48.7 440,50.8 444,53.3 448,56.0 452,59.1 456,62.6 460,66.3 464,70.2 468,74.4 472,78.8 476,83.4 480,88.1 484,92.9 488,97.8 492,102.7 496,107.6 500,112.5 504,117.3 508,122.0 512,126.6 516,131.0 520,135.2 524,139.1 528,142.8 532,146.2 536,149.2 540,152.0 544,154.3 548,156.3 552,158.0 556,159.2 560,160.1 564,160.5 568,160.6 572,160.3 576,159.6 580,158.5 584,157.1 588,155.4 592,153.4 596,151.0 600,148.4 604,145.6 608,142.6 612,139.4 616,136.1 620,132.6 624,129.1 628,125.5 632,122.0 636,118.5 640,115.0 644,111.6 648,108.4 652,105.3 656,102.4 660,99.7 664,97.2 668,95.0 672,93.0 676,91.3 680,89.9 684,88.8 688,88.0 692,87.5 696,87.3 700,87.4 704,87.7 708,88.4 712,89.3 716,90.4 720,91.8" />
              <polyline points="0,144.6 4,146.5 8,148.2 12,149.6 16,150.7 20,151.4 24,151.8 28,151.9 32,151.6 36,150.9 40,149.8 44,148.3 48,146.5 52,144.3 56,141.8 60,138.9 64,135.6 68,132.1 72,128.3 76,124.3 80,120.0 84,115.5 88,110.9 92,106.1 96,101.2 100,96.3 104,91.3 108,86.3 112,81.4 116,76.6 120,71.9 124,67.3 128,62.9 132,58.7 136,54.8 140,51.1 144,47.8 148,44.7 152,42.0 156,39.7 160,37.7 164,36.1 168,34.9 172,34.0 176,33.6 180,33.5 184,33.8 188,34.5 192,35.5 196,36.8 200,38.5 204,40.4 208,42.7 212,45.1 216,47.8 220,50.7 224,53.7 228,56.8 232,60.0 236,63.3 240,66.6 244,69.9 248,73.1 252,76.2 256,79.3 260,82.2 264,84.9 268,87.5 272,89.8 276,91.9 280,93.7 284,95.3 288,96.6 292,97.6 296,98.3 300,98.7 304,98.8 308,98.7 312,98.2 316,97.5 320,96.5 324,95.3 328,93.8 332,92.2 336,90.3 340,88.4 344,86.3 348,84.1 352,81.8 356,79.5 360,77.2 364,74.9 368,72.7 372,70.6 376,68.7 380,66.8 384,65.2 388,63.7 392,62.6 396,61.6 400,61.0 404,60.6 408,60.5 412,60.8 416,61.4 420,62.4 424,63.7 428,65.3 432,67.3 436,69.5 440,72.2 444,75.1 448,78.3 452,81.7 456,85.4 460,89.4 464,93.5 468,97.8 472,102.2 476,106.7 480,111.2 484,115.8 488,120.4 492,125.0 496,129.5 500,133.8 504,138.0 508,142.0 512,145.9 516,149.4 520,152.7 524,155.7 528,158.4 532,160.7 536,162.7 540,164.3 544,165.5 548,166.3 552,166.7 556,166.7 560,166.3 564,165.5 568,164.3 572,162.8 576,160.8 580,158.6 584,156.0 588,153.1 592,149.9 596,146.5 600,142.9 604,139.1 608,135.1 612,131.0 616,126.9 620,122.6 624,118.4 628,114.2 632,110.1 636,106.0 640,102.1 644,98.3 648,94.7 652,91.3 656,88.1 660,85.2 664,82.6 668,80.3 672,78.2 676,76.5 680,75.1 684,74.0 688,73.2 692,72.8 696,72.6 700,72.8 704,73.2 708,74.0 712,75.0 716,76.2 720,77.6" />
              <polyline points="0,133.4 4,134.5 8,135.4 12,135.9 16,136.2 20,136.1 24,135.6 28,134.9 32,133.7 36,132.2 40,130.4 44,128.2 48,125.7 52,122.9 56,119.8 60,116.4 64,112.7 68,108.7 72,104.6 76,100.3 80,95.8 84,91.2 88,86.5 92,81.8 96,77.0 100,72.3 104,67.6 108,63.0 112,58.5 116,54.2 120,50.1 124,46.2 128,42.6 132,39.2 136,36.1 140,33.4 144,31.0 148,29.0 152,27.4 156,26.1 160,25.3 164,24.8 168,24.8 172,25.1 176,25.9 180,27.0 184,28.5 188,30.3 192,32.5 196,35.0 200,37.8 204,40.8 208,44.1 212,47.6 216,51.2 220,55.0 224,58.9 228,62.8 232,66.8 236,70.8 240,74.7 244,78.6 248,82.3 252,86.0 256,89.4 260,92.7 264,95.8 268,98.6 272,101.2 276,103.5 280,105.5 284,107.3 288,108.7 292,109.8 296,110.5 300,111.0 304,111.2 308,111.1 312,110.6 316,109.9 320,109.0 324,107.8 328,106.4 332,104.9 336,103.1 340,101.2 344,99.3 348,97.2 352,95.1 356,93.0 360,90.9 364,88.9 368,86.9 372,85.1 376,83.4 380,81.9 384,80.6 388,79.5 392,78.6 396,78.0 400,77.7 404,77.6 408,77.9 412,78.5 416,79.4 420,80.6 424,82.1 428,84.0 432,86.1 436,88.5 440,91.2 444,94.1 448,97.3 452,100.7 456,104.2 460,108.0 464,111.8 468,115.7 472,119.7 476,123.8 480,127.8 484,131.8 488,135.7 492,139.5 496,143.1 500,146.6 504,149.9 508,152.9 512,155.7 516,158.1 520,160.3 524,162.1 528,163.5 532,164.6 536,165.3 540,165.6 544,165.5 548,165.0 552,164.1 556,162.8 560,161.1 564,159.1 568,156.6 572,153.9 576,150.8 580,147.4 584,143.7 588,139.8 592,135.7 596,131.3 600,126.9 604,122.3 608,117.6 612,112.9 616,108.2 620,103.5 624,98.8 628,94.3 632,89.8 636,85.6 640,81.5 644,77.7 648,74.1 652,70.7 656,67.7 660,64.9 664,62.5 668,60.4 672,58.7 676,57.3 680,56.3 684,55.6 688,55.2 692,55.2 696,55.5 700,56.1 704,57.0 708,58.2 712,59.6 716,61.3 720,63.2" />
              <polyline points="0,117.6 4,118.2 8,118.6 12,118.7 16,118.4 20,117.9 24,117.0 28,115.8 32,114.3 36,112.5 40,110.3 44,107.9 48,105.1 52,102.1 56,98.9 60,95.4 64,91.7 68,87.8 72,83.8 76,79.7 80,75.5 84,71.2 88,66.9 92,62.7 96,58.5 100,54.4 104,50.4 108,46.6 112,43.0 116,39.6 120,36.4 124,33.5 128,31.0 132,28.7 136,26.9 140,25.3 144,24.2 148,23.4 152,23.1 156,23.2 160,23.6 164,24.5 168,25.7 172,27.4 176,29.4 180,31.7 184,34.5 188,37.5 192,40.8 196,44.4 200,48.2 204,52.2 208,56.5 212,60.8 216,65.3 220,69.8 224,74.3 228,78.9 232,83.4 236,87.9 240,92.2 244,96.4 248,100.5 252,104.3 256,107.9 260,111.3 264,114.4 268,117.3 272,119.8 276,122.0 280,123.8 284,125.4 288,126.6 292,127.4 296,127.9 300,128.1 304,128.0 308,127.6 312,126.8 316,125.8 320,124.6 324,123.1 328,121.4 332,119.6 336,117.6 340,115.5 344,113.3 348,111.0 352,108.7 356,106.5 360,104.3 364,102.1 368,100.1 372,98.2 376,96.4 380,94.9 384,93.5 388,92.4 392,91.5 396,90.9 400,90.6 404,90.5 408,90.7 412,91.3 416,92.1 420,93.3 424,94.7 428,96.4 432,98.3 436,100.5 440,103.0 444,105.6 448,108.4 452,111.4 456,114.6 460,117.8 464,121.1 468,124.4 472,127.8 476,131.1 480,134.3 484,137.5 488,140.5 492,143.4 496,146.1 500,148.5 504,150.7 508,152.6 512,154.3 516,155.6 520,156.6 524,157.2 528,157.4 532,157.3 536,156.8 540,155.9 544,154.6 548,152.9 552,150.9 556,148.4 560,145.7 564,142.6 568,139.2 572,135.5 576,131.5 580,127.3 584,122.9 588,118.3 592,113.5 596,108.7 600,103.7 604,98.8 608,93.8 612,88.9 616,84.0 620,79.3 624,74.7 628,70.2 632,66.0 636,62.0 640,58.2 644,54.8 648,51.6 652,48.8 656,46.3 660,44.2 664,42.5 668,41.1 672,40.1 676,39.4 680,39.2 684,39.3 688,39.7 692,40.5 696,41.7 700,43.1 704,44.8 708,46.8 712,49.0 716,51.4 720,54.0" />
              <polyline points="0,102.8 4,103.4 8,103.6 12,103.6 16,103.3 20,102.6 24,101.7 28,100.5 32,99.0 36,97.1 40,95.1 44,92.7 48,90.1 52,87.3 56,84.3 60,81.1 64,77.8 68,74.3 72,70.8 76,67.2 80,63.6 84,60.0 88,56.5 92,53.0 96,49.6 100,46.4 104,43.4 108,40.6 112,38.0 116,35.7 120,33.7 124,32.0 128,30.6 132,29.6 136,28.9 140,28.7 144,28.8 148,29.3 152,30.2 156,31.5 160,33.2 164,35.3 168,37.7 172,40.5 176,43.6 180,47.0 184,50.8 188,54.7 192,58.9 196,63.4 200,67.9 204,72.7 208,77.5 212,82.4 216,87.3 220,92.2 224,97.0 228,101.8 232,106.5 236,111.0 240,115.3 244,119.5 248,123.4 252,127.0 256,130.3 260,133.4 264,136.1 268,138.4 272,140.5 276,142.1 280,143.4 284,144.3 288,144.9 292,145.1 296,145.0 300,144.5 304,143.7 308,142.5 312,141.1 316,139.5 320,137.6 324,135.4 328,133.1 332,130.7 336,128.1 340,125.4 344,122.7 348,119.9 352,117.2 356,114.5 360,111.9 364,109.3 368,106.9 372,104.7 376,102.7 380,100.8 384,99.2 388,97.8 392,96.7 396,95.8 400,95.3 404,95.0 408,95.0 412,95.3 416,95.9 420,96.8 424,97.9 428,99.3 432,101.0 436,102.8 440,104.9 444,107.1 448,109.5 452,112.0 456,114.6 460,117.3 464,119.9 468,122.6 472,125.3 476,127.9 480,130.4 484,132.7 488,134.9 492,136.9 496,138.7 500,140.2 504,141.5 508,142.4 512,143.1 516,143.4 520,143.4 524,143.1 528,142.3 532,141.3 536,139.8 540,138.0 544,135.8 548,133.3 552,130.5 556,127.3 560,123.9 564,120.1 568,116.2 572,112.0 576,107.6 580,103.0 584,98.3 588,93.5 592,88.6 596,83.7 600,78.9 604,74.0 608,69.3 612,64.6 616,60.1 620,55.8 624,51.8 628,47.9 632,44.3 636,41.1 640,38.1 644,35.5 648,33.3 652,31.4 656,29.9 660,28.8 664,28.1 668,27.8 672,27.9 676,28.3 680,29.2 684,30.4 688,31.9 692,33.8 696,36.0 700,38.5 704,41.3 708,44.2 712,47.4 716,50.7 720,54.2" />
            </svg>

            <div className="bems-doc-hero-top">
              <div>
                <div className="cap">
                  {isReceipt ? 'Amount received' : 'Amount due'}
                </div>
                <div className="bems-doc-amt">
                  <small className="naira">₦</small>
                  {Number(isReceipt ? amountPaid : total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="bems-doc-words">{amountInWords}</div>
              </div>

              {/* Dynamic Circular Security Stamp */}
              {isPaid ? (
                <div className="bems-doc-stamp">
                  <div>
                    <span>SETTLED</span>
                    <b>PAID</b>
                    <span>IN FULL</span>
                  </div>
                </div>
              ) : (
                <div className="bems-doc-stamp due">
                  <div>
                    <span>PAYMENT</span>
                    <b>DUE</b>
                    <span>{dueDate.toUpperCase()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom 4-Column Meta Grid */}
            <div className="bems-doc-hero-meta">
              {isReceipt ? (
                <>
                  <div>
                    <div className="cap">Payment date</div>
                    <p>{paidDate}</p>
                  </div>
                  <div>
                    <div className="cap">Method</div>
                    <p>{data.paymentMethod || 'Bank transfer'}</p>
                  </div>
                  <div>
                    <div className="cap">Transaction ref</div>
                    <p className="mono">{transactionRef}</p>
                  </div>
                  <div>
                    <div className="cap">Status</div>
                    <p style={{ color: statusColor }}>{statusText}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="cap">Invoice date</div>
                    <p>{issuedDate}</p>
                  </div>
                  <div>
                    <div className="cap">Due date</div>
                    <p>{dueDate}</p>
                  </div>
                  <div>
                    <div className="cap">Payment reference</div>
                    <p className="mono">{invoiceNo}</p>
                  </div>
                  <div>
                    <div className="cap">Status</div>
                    <p style={{ color: statusColor }}>{statusText}</p>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ── GREETING ── */}
          <section className="bems-doc-greet">
            <div>
              <h2>{isReceipt ? `Thank you, ${firstCustomerName}.` : `Hello ${firstCustomerName},`}</h2>
              <p>
                {isReceipt
                  ? 'We have received your payment in full for the order below. Please keep this receipt for your records.'
                  : `Thank you for your order. Here is your invoice for the items below. Kindly make payment by ${dueDate}, using your invoice number as the payment reference.`
                }
              </p>
            </div>
          </section>

          {/* ── PARTIES ── */}
          <section className="bems-doc-parties">
            <div className="bems-doc-party">
              <div className="cap">{isReceipt ? 'Customer' : 'Billed To'}</div>
              <div className="nm">{customerName}</div>
              <p>
                {customerAddress}<br />
                {[customerPhone, customerEmail].filter(Boolean).join(' · ')}
              </p>
            </div>

            <div className="bems-doc-party help">
              <div className="cap">Questions about this order?</div>
              <div className="nm">We're here to help</div>
              <p>
                <b>Call</b> {companyPhone}<br />
                <b>Email</b> {companyEmail}<br />
                Quote {isReceipt ? 'receipt' : 'invoice'} no. <span className="mono">{docNumber}</span>
              </p>
            </div>
          </section>

          {/* ── ITEMS TABLE ── */}
          <table className="bems-doc-table">
            <thead>
              <tr>
                <th style={{ width: '6%' }}>#</th>
                <th>Description</th>
                <th className="c" style={{ width: '15%' }}>Pack</th>
                <th className="c" style={{ width: '8%' }}>Qty</th>
                <th className="r" style={{ width: '18%' }}>Unit price (₦)</th>
                <th className="r" style={{ width: '18%' }}>Amount (₦)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const itemQty = Number(it.qty || it.quantity || 1)
                const itemPrice = Number(it.price || it.unit_price || 0)
                const itemTotal = Number(it.total || it.amount || (itemQty * itemPrice))
                const pack = it.pack || it.pack_size || it.unit || 'Unit'
                const tag = it.tag || it.grade || (it.category ? it.category : null)

                return (
                  <tr key={idx}>
                    <td className="mono">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="it">
                      <b>{it.name || it.title || it.description || 'Farm Produce'}</b>
                      {tag && <span className="bems-doc-tag">{tag}</span>}
                    </td>
                    <td className="c">{pack}</td>
                    <td className="c mono">{itemQty.toLocaleString()}</td>
                    <td className="r mono">{itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="r mono">{itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* ── SETTLEMENT / VERIFICATION & TOTALS ── */}
          <section className="bems-doc-vt">
            {isReceipt ? (
              /* Genuine Verification Box with Real Scannable QR Code */
              <div className="bems-doc-verify">
                <div className="qr" style={{ padding: 4, background: '#ffffff', border: '1px solid #c9d6ce', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Verify Receipt QR Code"
                      style={{ width: 76, height: 76, display: 'block', imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div style={{ width: 76, height: 76, display: 'grid', placeItems: 'center', background: '#eef7f2', color: '#123d27', fontWeight: 'bold', fontSize: 11 }}>
                      QR Code
                    </div>
                  )}
                </div>
                <div>
                  <h4>Check this receipt is genuine</h4>
                  <p>Scan with any camera or visit bemsfarms.com/verify to verify authenticity.</p>
                  <div className="cap" style={{ marginBottom: 2 }}>Security code</div>
                  <div className="code">{securityCode}</div>
                </div>
              </div>
            ) : (
              /* How To Pay Box with Verification Badge */
              <div className="bems-doc-pay">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h4>How to pay</h4>
                    <p className="sub">Bank transfer to the official account below</p>
                    <dl>
                      <dt>Account name</dt>
                      <dd>{accountName}</dd>
                      <dt>Bank</dt>
                      <dd className="ph">{bankName}</dd>
                      <dt>Account number</dt>
                      <dd className="mono ph">{accountNumber}</dd>
                      {secondaryBank && secondaryAccount && (
                        <>
                          <dt>Alt. Bank</dt>
                          <dd className="ph">{secondaryBank} ({secondaryAccount})</dd>
                        </>
                      )}
                      <dt>Reference</dt>
                      <dd className="mono">{invoiceNo}</dd>
                    </dl>
                    <p className="fine">
                      Send proof of payment to {companyEmail}. Your official receipt will be issued once payment is confirmed.
                    </p>
                  </div>
                  {/* Scannable Verification QR on Invoices */}
                  <div className="bems-doc-invoice-qr text-center" style={{ minWidth: 84, padding: '6px 8px', background: '#fff', border: '1px solid #c9e0d1', borderRadius: 8, flexShrink: 0 }}>
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Scan to Verify Invoice"
                        style={{ width: 68, height: 68, display: 'block', margin: '0 auto', imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div style={{ width: 68, height: 68, display: 'grid', placeItems: 'center', background: '#eef7f2', fontSize: 10, color: '#123d27', fontWeight: 'bold' }}>QR</div>
                    )}
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: '#123d27', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginTop: 3 }}>Scan to Verify</span>
                    <span className="mono" style={{ fontSize: 8, color: '#4a6b57', display: 'block' }}>{securityCode.slice(0, 9)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Totals Table */}
            <dl className="bems-doc-tot">
              <dt>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</dt>
              <dd className="mono">₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
              
              {isReceipt ? (
                <>
                  <dt>Discount</dt>
                  <dd className="mono">₦{discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
                  <dt className="grand">Total paid</dt>
                  <dd className="grand"><span className="naira" style={{ fontSize: 15 }}>₦</span>{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
                  <dt>Balance due</dt>
                  <dd className="bal mono">₦0.00</dd>
                </>
              ) : (
                <>
                  <dt>VAT (exempt)</dt>
                  <dd className="mono">₦0.00</dd>
                  <dt>Amount paid</dt>
                  <dd className="mono">₦{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
                  <dt className="grand">Balance due</dt>
                  <dd className="grand"><span className="naira" style={{ fontSize: 15 }}>₦</span>{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
                  <dt>Due by</dt>
                  <dd className="bal">{dueDate}</dd>
                </>
              )}
            </dl>
          </section>

          {/* ── SIGN-OFF & TERMS ── */}
          <section className="bems-doc-sign">
            {isReceipt ? (
              <div className="bems-doc-keep">
                <b>Keep this receipt.</b> It is your proof of payment to {companyName} for the goods listed and can be used for your accounting, reimbursement or audit records.
              </div>
            ) : (
              <div className="bems-doc-keep terms">
                <b>Payment terms.</b> Payment is due by {dueDate}. Goods are released on confirmation of payment. Prices are in Nigerian naira. Please contact us before the due date if you have any questions about this invoice.
              </div>
            )}

            <div className="bems-doc-sig">
              <div className="ln" />
              <b>For {companyName}</b>
              <span>Authorised signature · Accounts</span>
            </div>
          </section>

        </div>

        {/* ── THANKS BANNER ── */}
        <div className="bems-doc-thanks">
          <h3>{isReceipt ? `Thank you for choosing ${companyName}.` : 'Thank you for your order.'}</h3>
          <span>Premium farm produce from Abia State to your table.</span>
        </div>

        {/* ── FOOTER ── */}
        <div className="bems-doc-foot">
          <span>{companyPhone}</span>
          <span>www.bemsfarms.com</span>
          <span>{rcNumber} · {tinNumber}</span>
        </div>

      </div>
    </div>
  )
}
