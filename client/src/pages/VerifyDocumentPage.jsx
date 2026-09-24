import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import api from '../services/api';
import logo from '../assets/bemsfarms_logo_compact.png';

export default function VerifyDocumentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlRef = searchParams.get('ref') || searchParams.get('q') || '';
  const urlCode = searchParams.get('code') || '';

  const [inputRef, setInputRef] = useState(urlRef);
  const [inputCode, setInputCode] = useState(urlCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const performVerification = useCallback(async (refToVerify, codeToVerify) => {
    const qRef = (refToVerify || '').trim();
    const qCode = (codeToVerify || '').trim();

    if (!qRef && !qCode) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.get('/verify/document', {
        params: { ref: qRef, code: qCode },
      });
      if (res.data && res.data.valid) {
        setResult(res.data);
      } else {
        setError(res.data?.message || 'Document could not be verified.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      const msg = err.response?.data?.message || 'Unable to verify document. Please ensure the reference number or security code is entered correctly.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run on mount or when URL params change
  useEffect(() => {
    if (urlRef || urlCode) {
      setInputRef(urlRef);
      setInputCode(urlCode);
      performVerification(urlRef, urlCode);
    }
  }, [urlRef, urlCode, performVerification]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputRef.trim() && !inputCode.trim()) return;
    setSearchParams({
      ...(inputRef.trim() ? { ref: inputRef.trim() } : {}),
      ...(inputCode.trim() ? { code: inputCode.trim() } : {}),
    });
    performVerification(inputRef, inputCode);
  };

  const handleCopyAccount = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf6] text-[#123d27]">
      <Navbar />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* Verification Hero Header */}
        <div className="text-center mb-10 no-print">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e8f5ed] border border-[#c1e5cf] text-[#123d27] text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Official Authentication Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#123d27] font-serif tracking-tight mb-3">
            Verify Bems Farms Documents
          </h1>
          <p className="text-sm sm:text-base text-[#4a6b57] max-w-2xl mx-auto leading-relaxed">
            Verify genuine Bems Farms payment receipts, proforma invoices, commercial tax bills, POS store slips, and dispatch waybills directly from our central farm registry.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e5eae7] p-6 sm:p-8 mb-8 no-print">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-7">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#3d5a47] mb-1.5">
                  Document Reference Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#123d27] focus:border-[#123d27] text-sm font-mono uppercase bg-[#fafafa]"
                    placeholder="e.g. REC-2026-0007, INV-2026-0007, POS-1001"
                    value={inputRef}
                    onChange={(e) => setInputRef(e.target.value)}
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#3d5a47] mb-1.5">
                  Security Hash Code (Optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#123d27] focus:border-[#123d27] text-sm font-mono uppercase bg-[#fafafa]"
                  placeholder="e.g. 1E86-13B0..."
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 rounded-xl bg-[#123d27] hover:bg-[#0c2b1b] text-white font-medium text-sm transition-all duration-150 shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>Verify</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>Quick test references:</span>
                <button
                  type="button"
                  onClick={() => { setInputRef('REC-2026-0007'); setInputCode('1E86-13B0-159F-8533'); performVerification('REC-2026-0007', '1E86-13B0-159F-8533'); }}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[#123d27] font-mono font-medium"
                >
                  REC-2026-0007
                </button>
                <button
                  type="button"
                  onClick={() => { setInputRef('INV-2026-0007'); setInputCode(''); performVerification('INV-2026-0007', ''); }}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[#123d27] font-mono font-medium"
                >
                  INV-2026-0007
                </button>
              </div>
              <span className="text-gray-400">RC 1849204 · Registered in Nigeria</span>
            </div>
          </form>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-xl text-red-600 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base text-red-900 mb-1">Document Verification Failed</h3>
              <p className="text-sm text-red-700 leading-relaxed mb-3">{error}</p>
              <div className="text-xs text-red-600">
                Please check the spelling of your reference number or contact{' '}
                <a href="mailto:corporate@bemsfarms.com" className="font-semibold underline">corporate@bemsfarms.com</a>.
              </div>
            </div>
          </div>
        )}

        {/* Verification Certificate */}
        {result && (
          <div className="bg-white rounded-2xl shadow-xl border border-[#cfe2d7] overflow-hidden print:border-0 print:shadow-none print:m-0">
            {/* Certificate Top Banner */}
            <div className="bg-[#123d27] text-white p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-6 pointer-events-none">
                <img src={logo} alt="" className="w-64 h-64 object-contain filter invert" />
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold uppercase tracking-wider">
                      <svg className="w-3.5 h-3.5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Verified Authentic Document
                    </span>
                    <span className="text-xs text-emerald-200/80 font-mono">
                      {result.authenticityNotice || 'Primary Registry Record'}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-white tracking-wide">
                    {result.documentType}
                  </h2>
                  <div className="text-sm font-mono text-emerald-200 mt-1">
                    Reference: <strong className="text-white text-base">{result.reference}</strong>
                    {result.invoiceReference && result.invoiceReference !== result.reference && (
                      <span className="ml-2 text-xs opacity-75">(Invoice: {result.invoiceReference})</span>
                    )}
                  </div>
                </div>

                <div className="sm:text-right no-print">
                  <div className="text-xs uppercase tracking-wider text-emerald-200/80 font-medium">Status</div>
                  <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />
                    {result.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Cryptographic Security Seal Strip */}
            <div className="bg-[#f0f8f3] border-b border-[#cfe2d7] px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#123d27] uppercase tracking-wider">Security Code:</span>
                <span className="font-mono font-bold text-[#123d27] bg-white px-2 py-0.5 rounded border border-[#b8dbc6]">
                  {result.securityCode}
                </span>
                {result.securityCodeMatched && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Validated
                  </span>
                )}
              </div>
              <div className="text-gray-500">
                Verified at: {new Date(result.verifiedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>

            {/* Document Body */}
            <div className="p-6 sm:p-8 space-y-8">
              {/* Parties Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Issued By</h3>
                  <div className="font-serif font-bold text-lg text-[#123d27]">{result.company?.name || 'Bems Farms Limited'}</div>
                  <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                    {result.company?.address || 'Central Farm Settlement Hub, Umuahia, Abia State'}<br />
                    <strong>RC:</strong> {result.company?.rc || '1849204'} · <strong>TIN:</strong> {result.company?.tin || '24819402-0001'}<br />
                    <strong>Email:</strong> {result.company?.email || 'corporate@bemsfarms.com'}<br />
                    <strong>Phone:</strong> {result.company?.phone || '+234 800 236 7326'}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Billed / Issued To</h3>
                  <div className="font-serif font-bold text-lg text-[#123d27]">{result.customer?.name || 'Valued Customer'}</div>
                  <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                    {result.customer?.address || 'Nigeria'}<br />
                    {result.customer?.phone && <><strong>Phone:</strong> {result.customer.phone}<br /></>}
                    {result.customer?.email && <><strong>Email:</strong> {result.customer.email}<br /></>}
                    <strong>Sales Channel:</strong> {result.channel || 'Direct'}
                  </div>
                </div>
              </div>

              {/* Dates & Payment Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#f9fbf9] p-4 rounded-xl border border-[#e1ece4] text-xs">
                <div>
                  <span className="text-gray-500 block mb-0.5">Date Issued</span>
                  <span className="font-semibold text-gray-900 font-mono">
                    {new Date(result.issuedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Payment Status</span>
                  <span className={`font-semibold font-mono ${result.isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {result.isPaid ? 'Settled (Paid in Full)' : 'Awaiting Settlement'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Payment Method</span>
                  <span className="font-semibold text-gray-900">{result.payment?.method || 'Bank Transfer'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Transaction Ref</span>
                  <span className="font-mono text-gray-900">{result.payment?.reference || result.reference}</span>
                </div>
              </div>

              {/* Itemized Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Itemized Produce &amp; Goods</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f5f8f6] border-b border-gray-200 text-[#123d27] font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-center">Pack</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price (₦)</th>
                        <th className="py-2.5 px-3 text-right">Total (₦)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.items && result.items.length > 0 ? (
                        result.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3 font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</td>
                            <td className="py-2.5 px-3 font-medium text-gray-900">{it.name}</td>
                            <td className="py-2.5 px-3 text-center text-gray-500">{it.pack || 'kg'}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold">{it.qty}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{Number(it.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900">{Number(it.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-4 text-center text-gray-400">Order items summary available on file.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500 max-w-sm">
                  <strong>Terms &amp; Policies:</strong> {result.company?.paymentTerms || 'Goods are released upon confirmation of payment. Certified authentic produce by Bems Farms Limited.'}
                </div>

                <div className="w-full sm:w-72 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>₦{Number(result.financials?.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {Number(result.financials?.discount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span>−₦{Number(result.financials?.discount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {Number(result.financials?.deliveryFee || 0) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Fee:</span>
                      <span>₦{Number(result.financials?.deliveryFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>VAT (Exempt):</span>
                    <span>₦0.00</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#123d27] pt-2 border-t border-gray-200">
                    <span>Total Amount:</span>
                    <span>₦{Number(result.financials?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-800 font-semibold">
                    <span>Amount Paid:</span>
                    <span>₦{Number(result.financials?.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {Number(result.financials?.balanceDue || 0) > 0 ? (
                    <div className="flex justify-between text-xs text-red-700 font-bold pt-1">
                      <span>Balance Due:</span>
                      <span>₦{Number(result.financials?.balanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-xs text-emerald-700 font-bold pt-1">
                      <span>Balance Due:</span>
                      <span>₦0.00 (Fully Settled)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Remittance Info if Awaiting Payment */}
              {!result.isPaid && (
                <div className="bg-[#eef7f2] border border-[#bcdbc8] rounded-xl p-5 text-xs text-[#123d27]">
                  <div className="font-bold text-sm mb-1 flex items-center gap-1.5 text-emerald-900">
                    <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    How to Complete Payment for this Invoice:
                  </div>
                  <p className="text-gray-600 mb-3">
                    Please make a direct bank transfer to our official verified corporate account:
                  </p>
                  <div className="bg-white p-3.5 rounded-lg border border-[#c4e0ce] grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Bank Name</span>
                      <strong className="text-gray-900">{result.company?.bankName || 'Moniepoint MFB / Zenith Bank'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Account Name</span>
                      <strong className="text-gray-900">{result.company?.accountName || 'Bems Farms Limited'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Account Number</span>
                      <div className="flex items-center gap-2">
                        <strong className="text-emerald-700 text-sm">{result.company?.accountNumber || '1023849502'}</strong>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(result.company?.accountNumber || '1023849502')}
                          className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-sans text-[11px]"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Include your invoice reference <strong className="font-mono text-gray-900">{result.reference}</strong> as payment narration. Forward proof of payment to{' '}
                    <a href={`mailto:${result.company?.email || 'corporate@bemsfarms.com'}`} className="underline font-semibold">{result.company?.email || 'corporate@bemsfarms.com'}</a>.
                  </p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-gray-100 no-print">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-xl bg-[#123d27] hover:bg-[#0c2b1b] text-white font-medium text-xs shadow flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print Official Certificate</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setResult(null); setInputRef(''); setInputCode(''); setSearchParams({}); }}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs"
                  >
                    Verify Another Document
                  </button>
                  <Link
                    to="/products"
                    className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-xs"
                  >
                    Return to Shop
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
