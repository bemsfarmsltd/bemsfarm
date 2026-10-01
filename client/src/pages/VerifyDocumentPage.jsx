import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import api from '../services/api';
import BemsOfficialDocument from '../components/documents/BemsOfficialDocument';
import BemsDriverStatementDocument, { printOfficialDocument } from '../components/documents/BemsDriverStatementDocument';
import '../components/documents/bems-document.css';

export default function VerifyDocumentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlRef = searchParams.get('ref') || searchParams.get('q') || '';
  const urlCode = searchParams.get('code') || '';

  const [inputRef, setInputRef] = useState(urlRef);
  const [inputCode, setInputCode] = useState(urlCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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

  const handlePrint = () => {
    printOfficialDocument('.bems-doc-print-target', result?.documentType || 'Official Document');
  };

  // ── Transform result data for BemsOfficialDocument (Receipts & Invoices) ──
  const officialDocData = useMemo(() => {
    if (!result || result.isStatement) return null;
    const invRef = result.invoiceReference || result.reference || 'INV-2026-0001';
    const recRef = result.receiptReference || (invRef.startsWith('INV-') ? invRef.replace('INV-', 'REC-') : `REC-${invRef}`);
    const isReceipt = result.isReceipt || result.isPaid || result.documentType?.includes('Receipt') || result.reference?.startsWith('REC-');

    return {
      id: result.reference || invRef,
      invoice_ref: invRef,
      receiptNo: recRef,
      paymentRef: result.payment?.reference || result.reference,
      transactionRef: result.payment?.reference || result.reference,
      issuedDate: result.issuedDate,
      dueDate: result.dueDate || result.issuedDate,
      paidDate: result.paidDate || result.issuedDate,
      customer: {
        name: result.customer?.name || (result.isPos ? 'Walk-in Retail Customer' : 'Valued Customer'),
        address: result.customer?.address || 'Nigeria',
        phone: result.customer?.phone || '',
        email: result.customer?.email || '',
      },
      items: (result.items || []).map((it) => ({
        name: it.name || 'Produce Item',
        pack: it.pack || 'Unit',
        qty: Number(it.qty || 1),
        price: Number(it.price || 0),
        total: Number(it.total || 0),
        tag: it.sku || '',
      })),
      subtotal: Number(result.financials?.subtotal || 0),
      discount: Number(result.financials?.discount || 0),
      deliveryFee: Number(result.financials?.deliveryFee || 0),
      amount: Number(result.financials?.total || 0),
      amountPaid: Number(result.financials?.amountPaid || 0),
      status: result.isPaid ? 'paid' : (result.statusCode || 'pending'),
      paymentMethod: result.payment?.method || (result.isPos ? 'POS Terminal / Cash' : 'Bank Transfer'),
      signature_url: result.company?.signature_url || '',
    };
  }, [result]);

  const bankSettings = useMemo(() => {
    if (!result?.company) return null;
    return {
      invoice_company_name: (result.company.name && !result.company.name.includes('Limited')) ? result.company.name : 'Bems Farms Global Ltd',
      invoice_company_address: result.company.address || 'Central Farm Settlement Hub, Umuahia, Abia State',
      invoice_phone: (result.company.phone && !result.company.phone.includes('800 236 7326')) ? result.company.phone : '',
      invoice_email: result.company.email || 'corporate@bemsfarms.com',
      invoice_bank_name: result.company.bankName || 'Moniepoint MFB / Zenith Bank',
      invoice_account_name: result.company.accountName || 'Bems Farms Global Ltd',
      invoice_account_number: result.company.accountNumber || '1023849502',
      invoice_secondary_bank: result.company.secondaryBank || 'Zenith Bank',
      invoice_secondary_account_number: result.company.secondaryAccount || '1223849502',
      invoice_payment_terms: result.company.paymentTerms || 'Payment is due on issue date. Goods are released on confirmation of payment.',
      invoice_footer: result.company.footer || 'Thank you for choosing Bems Farms. Premium farm produce from Abia State to your table.',
    };
  }, [result]);

  const docType = useMemo(() => {
    if (!result) return 'invoice';
    if (result.isReceipt || result.isPaid || result.documentType?.includes('Receipt') || result.reference?.startsWith('REC-')) {
      return 'receipt';
    }
    if (result.documentType?.toLowerCase().includes('proforma')) {
      return 'proforma';
    }
    if (result.documentType?.toLowerCase().includes('tax')) {
      return 'tax_invoice';
    }
    return 'invoice';
  }, [result]);

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf6] text-[#123d27]">
      <Navbar />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Verification Hero Header */}
        <div className="text-center mb-8 no-print">
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
            Verify genuine Bems Farms payment receipts, commercial tax bills, POS store slips, and driver statements directly from our central registry.
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
                    placeholder="e.g. SOA-DRV-0004-2026, REC-2026-0007, POS-1001"
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
                  placeholder="e.g. 618D-CDED..."
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
                  onClick={() => { setInputRef('SOA-DRV-0004-2026'); setInputCode('618D-CDED-19C1-FDF3'); performVerification('SOA-DRV-0004-2026', '618D-CDED-19C1-FDF3'); }}
                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-mono font-semibold"
                >
                  SOA-DRV-0004-2026 (Driver Statement)
                </button>
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
                <button
                  type="button"
                  onClick={() => { setInputRef('POS-1001'); setInputCode(''); performVerification('POS-1001', ''); }}
                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-mono font-semibold"
                >
                  POS-1001 (Store Sale)
                </button>
                <button
                  type="button"
                  onClick={() => { setInputRef('BF-MUFN4UJ1'); setInputCode(''); performVerification('BF-MUFN4UJ1', ''); }}
                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-mono font-semibold"
                >
                  BF-MUFN4UJ1 (Order Receipt)
                </button>
              </div>
              <span className="text-gray-400">Primary Corporate Registry · Abia State</span>
            </div>
          </form>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-6 mb-8 flex items-start gap-4 no-print">
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

        {/* ── VERIFIED OFFICIAL DOCUMENT RENDERING ── */}
        {result && (
          <div className="space-y-6">
            {/* Top Verification Telemetry & Print Action Bar */}
            <div className="no-print bg-white rounded-2xl p-4 sm:p-5 border border-[#cfe2d7] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                  <svg className="w-3.5 h-3.5 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Verified Authentic
                </span>
                <span className="font-mono text-xs font-bold text-gray-800">
                  {result.reference}
                </span>
                {result.securityCode && (
                  <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    Sec Code: <strong>{result.securityCode}</strong>
                  </span>
                )}
                <span className="text-xs text-emerald-700 font-medium">
                  {result.status || 'Active · Reconciled'}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#123d27] hover:bg-[#0c2b1b] text-white font-medium text-xs shadow flex items-center justify-center gap-1.5 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print / Save PDF (A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setResult(null); setInputRef(''); setInputCode(''); setSearchParams({}); }}
                  className="px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs transition"
                >
                  Verify Another
                </button>
              </div>
            </div>

            {/* Document Stage: Pixel-perfect replica of the authentic document sheet */}
            <div className="bems-doc-stage-container w-full overflow-x-auto pb-12 flex justify-center">
              <div
                className="bems-doc-print-target shadow-2xl rounded-sm border border-[#e2e8f0] bg-white"
                style={{ minWidth: 'min-content' }}
              >
                {result.isStatement ? (
                  <BemsDriverStatementDocument
                    driver={result.driver || {}}
                    summary={{
                      opening_balance: Number(result.financials?.openingBalance || 0),
                      total_earnings: Number(result.financials?.totalCredits || 0),
                      total_payouts: Number(result.financials?.totalDebits || 0),
                      closing_balance: Number(result.financials?.closingBalance || 0),
                      pending_payouts: Number(result.financials?.pendingPayouts || 0),
                      total_trips: Number(result.financials?.totalTrips || 0),
                    }}
                    company={result.company || {}}
                    statement={result.statement || []}
                    period={{ start: null, end: null }}
                    showFilterToolbar={false}
                  />
                ) : (
                  <BemsOfficialDocument
                    documentType={docType}
                    data={officialDocData}
                    bankSettings={bankSettings}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
