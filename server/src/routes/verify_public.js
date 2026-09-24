// server/src/routes/verify_public.js
// Public Document & Receipt Verification API
// Allows customers, corporate clients, auditors, and retail shoppers to
// verify any Bems Farms Invoice, Receipt, Order, POS Slip, or Waybill.

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");

// Deterministic security code generator matching BemsOfficialDocument.jsx
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

// Helper to fetch company settings
async function getCompanySettings() {
  const result = await pool.query(
    "SELECT key, value FROM settings WHERE group_name = 'invoices' OR group_name = 'general'"
  );
  const s = {};
  result.rows.forEach(r => { s[r.key] = r.value; });
  return {
    name:          s.invoice_company_name || s.store_name || "Bems Farms Limited",
    address:       s.invoice_company_address || s.store_address || "Central Farm Settlement Hub, Umuahia, Abia State",
    rc:            s.invoice_rc_number || "RC 1849204",
    tin:           s.invoice_tin || "TIN 24819402-0001",
    phone:         s.invoice_phone || s.store_phone || "+234 800 236 7326 / +234 814 000 0000",
    email:         s.invoice_email || s.store_email || "corporate@bemsfarms.com",
    bankName:      s.invoice_bank_name || s.bank_name || "Moniepoint MFB / Zenith Bank",
    accountName:   s.invoice_account_name || s.account_name || "Bems Farms Limited",
    accountNumber: s.invoice_account_number || s.account_number || "1023849502",
    secondaryBank: s.invoice_secondary_bank || "Zenith Bank",
    secondaryAccount: s.invoice_secondary_account_number || "1223849502",
    paymentTerms:  s.invoice_payment_terms || "Payment is due within 7 days of invoice issue date. Goods are released on confirmation of payment.",
    footer:        s.invoice_footer || "Thank you for choosing Bems Farms. Premium farm produce from Abia State to your table.",
  };
}

// ── GET /api/verify/bank-details ──────────────────────────────────────────
// Public remittance instructions for Bems Farms customer payments
router.get("/bank-details", async (req, res, next) => {
  try {
    const company = await getCompanySettings();
    res.json({
      bankName: company.bankName,
      accountName: company.accountName,
      accountNumber: company.accountNumber,
      secondaryBank: company.secondaryBank,
      secondaryAccount: company.secondaryAccount,
      companyName: company.name,
      rc: company.rc,
      tin: company.tin,
      supportEmail: company.email,
      supportPhone: company.phone,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/verify/document ──────────────────────────────────────────────
// Accepts: ?ref=... &code=...
router.get("/document", async (req, res, next) => {
  try {
    const rawRef = (req.query.ref || req.query.q || req.query.id || "").trim();
    const rawCode = (req.query.code || "").trim();

    if (!rawRef && !rawCode) {
      return res.status(400).json({
        valid: false,
        message: "Please provide a document reference number (e.g. REC-2026-0007, INV-2026-0007, or POS-1001) or security verification code."
      });
    }

    const company = await getCompanySettings();
    const cleanRef = rawRef.toUpperCase();
    const cleanCode = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // ────────────────────────────────────────────────────────────────────────
    // 1. Search in `invoices` table
    // ────────────────────────────────────────────────────────────────────────
    let invoiceMatch = null;
    let isReceiptRequested = cleanRef.startsWith("REC-");

    // Try finding by exact invoice_ref, or swapped prefix REC- <-> INV-
    const searchVariants = [
      cleanRef,
      cleanRef.replace(/^REC-/, "INV-"),
      cleanRef.replace(/^INV-/, "REC-"),
    ];

    // Also check numeric ID if input is or ends with digits
    const numMatch = cleanRef.match(/\d+$/);
    const numericId = numMatch ? parseInt(numMatch[0], 10) : null;

    const invQuery = await pool.query(
      `SELECT * FROM invoices 
       WHERE invoice_ref = ANY($1) 
          OR ($2::integer IS NOT NULL AND id = $2)
          OR order_id = ANY($1)
       ORDER BY id DESC LIMIT 1`,
      [searchVariants, numericId]
    );

    if (invQuery.rows.length) {
      invoiceMatch = invQuery.rows[0];
    }

    // If still not found and rawCode was provided without ref, or ref looks like a security code
    if (!invoiceMatch && (cleanCode || cleanRef.includes("-"))) {
      const codeToTest = cleanCode || cleanRef.replace(/[^A-Z0-9]/g, "");
      if (codeToTest.length >= 8) {
        const recentInvs = await pool.query(
          "SELECT * FROM invoices ORDER BY id DESC LIMIT 50"
        );
        for (const inv of recentInvs.rows) {
          const tot = parseFloat(inv.amount || 0);
          const iRef = inv.invoice_ref || `INV-${String(inv.id).padStart(4, "0")}`;
          const rRef = iRef.replace("INV-", "REC-");
          const s1 = generateSecurityCode(rRef, tot).replace(/[^A-Z0-9]/g, "");
          const s2 = generateSecurityCode(iRef, tot).replace(/[^A-Z0-9]/g, "");
          if (s1 === codeToTest || s2 === codeToTest) {
            invoiceMatch = inv;
            if (s1 === codeToTest) isReceiptRequested = true;
            break;
          }
        }
      }
    }

    if (invoiceMatch) {
      const inv = invoiceMatch;
      const invRef = inv.invoice_ref || `INV-${String(inv.id).padStart(4, "0")}`;
      const recRef = invRef.startsWith("INV-") ? invRef.replace("INV-", "REC-") : `REC-${invRef}`;
      const isPaid = inv.status === "paid" || isReceiptRequested;
      const activeDocRef = isPaid || isReceiptRequested ? recRef : invRef;
      
      const rawItems = Array.isArray(inv.items) ? inv.items : [];
      const items = rawItems.map(it => {
        const qty = Number(it.qty || it.quantity || 1);
        const price = parseFloat(it.price || it.unit_price || 0);
        return {
          name: it.name || it.product_name || "Farm Produce",
          pack: it.unit || "kg",
          qty,
          price,
          total: parseFloat(it.total || (qty * price)),
        };
      });

      const subtotal = items.reduce((sum, it) => sum + it.total, 0);
      const discount = parseFloat(inv.discount_amount || 0);
      const deliveryFee = parseFloat(inv.delivery_fee || 0);
      const totalAmount = parseFloat(inv.amount || (subtotal + deliveryFee - discount));
      const amountPaid = isPaid ? totalAmount : 0;
      const balanceDue = Math.max(0, totalAmount - amountPaid);

      const computedSecurityCode = generateSecurityCode(activeDocRef, totalAmount);
      const isCodeMatch = cleanCode 
        ? computedSecurityCode.replace(/[^A-Z0-9]/g, "") === cleanCode
        : true;

      const docType = isReceiptRequested || inv.status === "paid"
        ? "Payment Receipt"
        : (inv.type === "proforma" ? "Proforma Invoice" : "Commercial Tax Invoice");

      return res.json({
        valid: true,
        documentType: docType,
        isReceipt: isReceiptRequested || inv.status === "paid",
        isPaid,
        reference: activeDocRef,
        invoiceReference: invRef,
        receiptReference: recRef,
        orderId: inv.order_id || null,
        securityCode: computedSecurityCode,
        securityCodeMatched: isCodeMatch,
        channel: inv.channel || (inv.type === "manual" ? "Direct Corporate" : "Online Store"),
        status: isPaid ? "Confirmed & Settled" : (inv.status || "Awaiting Payment"),
        statusCode: inv.status,
        fulfillmentStatus: inv.fulfillment_status || "unfulfilled",
        issuedDate: inv.date_issued || inv.created_at,
        dueDate: inv.due_date || null,
        paidDate: inv.paid_at || (isPaid ? inv.date_issued : null),
        customer: {
          name: inv.customer_name || "Valued Customer",
          phone: inv.customer_phone || "",
          email: inv.customer_email || "",
          address: inv.customer_address || "Abia State, Nigeria",
        },
        items,
        financials: {
          subtotal,
          discount,
          deliveryFee,
          vat: 0,
          total: totalAmount,
          amountPaid,
          balanceDue,
        },
        payment: {
          method: inv.payment_method || "Bank Transfer",
          reference: invRef.replace("INV-", "TXN-"),
          status: isPaid ? "Settled" : "Pending",
        },
        company,
        verifiedAt: new Date().toISOString(),
        authenticityNotice: "Official genuine Bems Farms document verified against primary database records.",
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. Search in `orders` table (Online orders, POS sales, customer receipts)
    // ────────────────────────────────────────────────────────────────────────
    const rawClean = cleanRef.replace(/^(REC|INV|ORD)-/, "");
    const searchOrderRefs = [
      cleanRef,
      rawClean,
      `POS-${rawClean}`,
      `BF-${rawClean}`,
      cleanRef.replace(/^REC-/, ""),
      cleanRef.replace(/^INV-/, ""),
    ];

    const ordQuery = await pool.query(
      `SELECT * FROM orders 
       WHERE id = ANY($1) 
          OR order_ref = ANY($1)
          OR id ILIKE $2
          OR order_ref ILIKE $2
          OR ('REC-' || id) ILIKE $2
          OR ('INV-' || id) ILIKE $2
          OR ('ORD-' || id) ILIKE $2
       ORDER BY created_at DESC LIMIT 1`,
      [searchOrderRefs, cleanRef]
    );

    if (ordQuery.rows.length) {
      const ord = ordQuery.rows[0];
      const itemsRes = await pool.query(
        "SELECT * FROM order_items WHERE order_id = $1",
        [ord.id]
      );

      const items = itemsRes.rows.map(it => {
        const qty = Number(it.quantity || 1);
        const price = parseFloat(it.price || it.unit_price || 0);
        return {
          name: it.product_name || "Produce Item",
          sku: it.sku || "",
          pack: it.unit || "unit",
          qty,
          price,
          total: parseFloat(it.total_price || it.subtotal || (qty * price)),
        };
      });

      const subtotal = parseFloat(ord.subtotal || items.reduce((s, i) => s + i.total, 0));
      const discount = parseFloat(ord.discount_amount || 0);
      const deliveryFee = parseFloat(ord.delivery_fee || 0);
      const tax = parseFloat(ord.tax_amount || 0);
      const totalAmount = parseFloat(ord.total || (subtotal + deliveryFee + tax - discount));
      const isPaid = ord.payment_status === "paid" || ord.status === "delivered";
      const amountPaid = isPaid ? totalAmount : 0;
      const balanceDue = Math.max(0, totalAmount - amountPaid);

      const docRef = cleanRef.startsWith("REC-") ? cleanRef : (isPaid ? `REC-${ord.id}` : (ord.order_ref || ord.id));
      const computedSecurityCode = generateSecurityCode(docRef, totalAmount);
      const isCodeMatch = cleanCode 
        ? computedSecurityCode.replace(/[^A-Z0-9]/g, "") === cleanCode
        : true;

      const isPos = String(ord.id).startsWith("POS-") || ord.source === "Physical Store (POS)" || String(ord.channel || "").toLowerCase().includes("pos");

      // Staff / Cashier lookup
      let cashierName = isPos ? "Store Cashier" : null;
      if (ord.created_by) {
        try {
          const staffRes = await pool.query("SELECT name FROM users WHERE id = $1", [ord.created_by]);
          if (staffRes.rows.length) {
            cashierName = staffRes.rows[0].name;
          }
        } catch (e) { /* ignore */ }
      }

      // Customer email lookup if missing
      let customerEmail = ord.customer_email || "";
      if (!customerEmail && (ord.user_id || ord.customer_id)) {
        try {
          const uRes = await pool.query("SELECT email, phone, name FROM users WHERE id = $1", [ord.user_id || ord.customer_id]);
          if (uRes.rows.length) {
            customerEmail = uRes.rows[0].email || "";
            if (!ord.customer_name || ord.customer_name === "Walk-in Customer") {
              ord.customer_name = uRes.rows[0].name;
            }
            if (!ord.customer_phone) {
              ord.customer_phone = uRes.rows[0].phone;
            }
          }
        } catch (e) { /* ignore */ }
      }

      // Driver lookup
      let driverName = null;
      if (ord.driver_id) {
        try {
          const dRes = await pool.query("SELECT name FROM drivers WHERE id = $1 UNION SELECT name FROM users WHERE id = $1 LIMIT 1", [ord.driver_id]);
          if (dRes.rows.length) driverName = dRes.rows[0].name;
        } catch (e) { /* ignore */ }
      }

      let docType = "Order Confirmation & Receipt";
      if (isPos) {
        docType = isPaid ? "Official POS Store Sales Receipt" : "POS Sales Slip";
      } else if (isPaid) {
        docType = "Official Order Payment Receipt";
      } else {
        docType = "Customer Order Confirmation";
      }

      return res.json({
        valid: true,
        documentType: docType,
        isReceipt: isPaid || cleanRef.startsWith("REC-"),
        isPaid,
        isPos,
        reference: docRef,
        orderId: ord.id,
        orderRef: ord.order_ref || ord.id,
        invoiceReference: `INV-${ord.id}`,
        receiptReference: `REC-${ord.id}`,
        securityCode: computedSecurityCode,
        securityCodeMatched: isCodeMatch,
        channel: isPos ? "Physical Store (POS)" : (ord.source || "Web Storefront"),
        posSessionId: ord.pos_session_id || null,
        cashier: cashierName,
        driver: driverName,
        deliveryCity: ord.delivery_city || null,
        deliveryRef: ord.delivery_ref || null,
        status: isPaid ? "Confirmed & Settled" : (ord.status || "Pending"),
        statusCode: ord.status,
        fulfillmentStatus: ord.delivery_status || ord.status,
        customerConfirmed: Boolean(ord.customer_confirmed),
        customerConfirmedAt: ord.customer_confirmed_at || null,
        driverConfirmed: Boolean(ord.driver_confirmed),
        driverConfirmedAt: ord.driver_confirmed_at || null,
        deliveredAt: ord.delivered_at || null,
        issuedDate: ord.created_at,
        dueDate: ord.created_at,
        paidDate: isPaid ? (ord.updated_at || ord.created_at) : null,
        customer: {
          name: ord.customer_name || (isPos ? "Walk-in Retail Customer" : "Valued Customer"),
          phone: ord.customer_phone || "",
          email: customerEmail,
          address: ord.address || ord.delivery_city || "Abia State, Nigeria",
        },
        items,
        financials: {
          subtotal,
          discount,
          deliveryFee,
          vat: tax,
          total: totalAmount,
          amountPaid,
          balanceDue,
        },
        payment: {
          method: ord.payment_method || (isPos ? "POS Terminal / Cash" : "Online Gateway"),
          reference: ord.payment_ref || ord.id,
          status: isPaid ? "Settled" : "Pending",
        },
        company,
        verifiedAt: new Date().toISOString(),
        authenticityNotice: isPos
          ? "Official genuine Bems Farms POS sales receipt verified against register database."
          : "Official genuine Bems Farms order & delivery receipt verified against system records.",
      });
    }

    // If no record found
    return res.status(404).json({
      valid: false,
      message: `No matching Bems Farms document found for reference "${rawRef}". Please verify the number printed on your invoice or receipt.`
    });

  } catch (err) {
    next(err);
  }
});

// Dynamic parameter alias: GET /api/verify/:ref
router.get("/:ref", (req, res, next) => {
  req.query.ref = req.params.ref;
  return router.handle({ ...req, url: "/document", path: "/document" }, res, next);
});

module.exports = router;
