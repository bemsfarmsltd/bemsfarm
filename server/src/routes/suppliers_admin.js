// server/src/routes/suppliers_admin.js
// Mounted at /api/admin/suppliers in index.js
//
// ── REQUIRED SCHEMA MIGRATIONS ─────────────────────────────────────────────
//
// -- SUPPLIERS
// CREATE TABLE IF NOT EXISTS suppliers (
//   id              SERIAL PRIMARY KEY,
//   supplier_code   VARCHAR(20) UNIQUE,
//   name            VARCHAR(255) NOT NULL,
//   contact_person  VARCHAR(255),
//   phone           VARCHAR(20),
//   email           VARCHAR(255),
//   address         TEXT,
//   category        VARCHAR(100) DEFAULT 'produce',  -- produce | packaging | logistics | equipment | other
//   payment_terms   INT DEFAULT 30,                  -- days credit
//   bank_name       VARCHAR(100),
//   account_number  VARCHAR(30),
//   account_name    VARCHAR(255),
//   tax_id          VARCHAR(50),
//   balance         DECIMAL(12,2) DEFAULT 0,         -- amount currently owed to supplier
//   total_purchases DECIMAL(12,2) DEFAULT 0,
//   total_paid      DECIMAL(12,2) DEFAULT 0,
//   notes           TEXT,
//   status          VARCHAR(20) DEFAULT 'active',
//   created_at      TIMESTAMP DEFAULT NOW(),
//   updated_at      TIMESTAMP DEFAULT NOW()
// );
//
// -- SUPPLIER PAYMENTS
// CREATE TABLE IF NOT EXISTS supplier_payments (
//   id              SERIAL PRIMARY KEY,
//   reference       VARCHAR(50) UNIQUE,
//   supplier_id     INT REFERENCES suppliers(id) ON DELETE SET NULL,
//   purchase_order_id INT,
//   amount          DECIMAL(12,2) NOT NULL,
//   payment_method  VARCHAR(50),
//   bank_account_id INT REFERENCES bank_accounts(id) ON DELETE SET NULL,
//   payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
//   notes           TEXT,
//   created_by      INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at      TIMESTAMP DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
//
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.use(protect);

// ── HELPER: auto-generate supplier code ─────────────────────────────────────
async function nextSupplierCode(client) {
  const row = await client.query("SELECT COUNT(*) FROM suppliers");
  const n   = parseInt(row.rows[0].count) + 1;
  return `SUP-${String(n).padStart(3, "0")}`;
}

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIER LIST  ──  GET /api/admin/suppliers
// ════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", category = "", status = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(s.name ILIKE $${params.length} OR s.supplier_code ILIKE $${params.length} OR s.phone ILIKE $${params.length} OR s.contact_person ILIKE $${params.length})`);
    }
    if (category) { params.push(category); where.push(`s.category = $${params.length}`); }
    if (status)   { params.push(status);   where.push(`s.status = $${params.length}`);   }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(`SELECT COUNT(*) FROM suppliers s ${whereClause}`, params);
    const total       = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        s.*,
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id) AS total_orders,
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id AND po.payment_status != 'paid') AS unpaid_orders
      FROM suppliers s
      ${whereClause}
      ORDER BY s.total_purchases DESC NULLS LAST
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const stats = await pool.query(`
      SELECT
        COUNT(*)                                           AS total,
        COUNT(*) FILTER (WHERE status = 'active')         AS active,
        COALESCE(SUM(balance), 0)                         AS total_outstanding,
        COALESCE(SUM(total_purchases), 0)                 AS total_purchased
      FROM suppliers
    `);

    res.json({
      suppliers: rows.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: stats.rows[0],
    });
  } catch (err) {
    console.error("GET /admin/suppliers:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIER DETAIL  ──  GET /api/admin/suppliers/:id
// ════════════════════════════════════════════════════════════════════════════
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM suppliers WHERE id=$1 OR supplier_code=$1",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Supplier not found" });

    const supplier = result.rows[0];

    const [orders, payments, returns] = await Promise.all([
      pool.query(`
        SELECT po.id, po.reference, po.total, po.paid_amount,
               po.status, po.payment_status, po.expected_date, po.created_at,
               (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) AS item_count
        FROM purchase_orders po
        WHERE po.supplier_id = $1
        ORDER BY po.created_at DESC LIMIT 10
      `, [supplier.id]),

      pool.query(`
        SELECT sp.*, ba.bank_name
        FROM supplier_payments sp
        LEFT JOIN bank_accounts ba ON sp.bank_account_id = ba.id
        WHERE sp.supplier_id = $1
        ORDER BY sp.payment_date DESC LIMIT 20
      `, [supplier.id]),

      pool.query(`
        SELECT pr.id, pr.reference, pr.total_value, pr.status, pr.created_at
        FROM purchase_returns pr
        WHERE pr.supplier_id = $1
        ORDER BY pr.created_at DESC LIMIT 10
      `, [supplier.id]),
    ]);

    res.json({
      ...supplier,
      orders: orders.rows,
      payments: payments.rows,
      returns: returns.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ADD SUPPLIER  ──  POST /api/admin/suppliers
// ════════════════════════════════════════════════════════════════════════════
router.post("/", requireRole("superadmin", "manager", "admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      name, contact_person, phone, email, address,
      category, payment_terms,
      bank_name, account_number, account_name,
      tax_id, notes,
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: "Supplier name required" });

    if (phone) {
      const dup = await client.query("SELECT id FROM suppliers WHERE phone=$1", [phone]);
      if (dup.rows.length) return res.status(400).json({ message: "A supplier with this phone already exists" });
    }

    const code   = await nextSupplierCode(client);
    const result = await client.query(
      `INSERT INTO suppliers
         (supplier_code, name, contact_person, phone, email, address, category, payment_terms,
          bank_name, account_number, account_name, tax_id, notes, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active',NOW(),NOW())
       RETURNING *`,
      [code, name.trim(), contact_person||null, phone||null, email||null, address||null, category||"produce", parseInt(payment_terms)||30, bank_name||null, account_number||null, account_name||null, tax_id||null, notes||null]
    );

    await client.query("COMMIT");
    res.status(201).json({ supplier: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UPDATE SUPPLIER  ──  PATCH /api/admin/suppliers/:id
// ════════════════════════════════════════════════════════════════════════════
router.patch("/:id", requireRole("superadmin", "manager", "admin"), async (req, res) => {
  try {
    const {
      name, contact_person, phone, email, address,
      category, payment_terms,
      bank_name, account_number, account_name,
      tax_id, notes, status,
    } = req.body;

    const result = await pool.query(
      `UPDATE suppliers SET
         name            = COALESCE($1, name),
         contact_person  = COALESCE($2, contact_person),
         phone           = COALESCE($3, phone),
         email           = COALESCE($4, email),
         address         = COALESCE($5, address),
         category        = COALESCE($6, category),
         payment_terms   = COALESCE($7, payment_terms),
         bank_name       = COALESCE($8, bank_name),
         account_number  = COALESCE($9, account_number),
         account_name    = COALESCE($10, account_name),
         tax_id          = COALESCE($11, tax_id),
         notes           = COALESCE($12, notes),
         status          = COALESCE($13, status),
         updated_at      = NOW()
       WHERE id = $14 RETURNING *`,
      [name||null, contact_person||null, phone||null, email||null, address||null, category||null, payment_terms?parseInt(payment_terms):null, bank_name||null, account_number||null, account_name||null, tax_id||null, notes||null, status||null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Supplier not found" });
    res.json({ supplier: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE / DEACTIVATE  ──  DELETE /api/admin/suppliers/:id
// ════════════════════════════════════════════════════════════════════════════
router.delete("/:id", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    await pool.query("UPDATE suppliers SET status='inactive', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json({ message: "Supplier deactivated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIER BALANCE  ──  GET /api/admin/suppliers/:id/balance
// ════════════════════════════════════════════════════════════════════════════
router.get("/:id/balance", async (req, res) => {
  try {
    const supplier = await pool.query(
      "SELECT id, name, supplier_code, balance, total_purchases, total_paid, payment_terms FROM suppliers WHERE id=$1",
      [req.params.id]
    );
    if (!supplier.rows.length) return res.status(404).json({ message: "Supplier not found" });

    const s = supplier.rows[0];

    const [unpaidOrders, paymentHistory, ageing] = await Promise.all([
      pool.query(`
        SELECT po.id, po.reference, po.total, po.paid_amount,
               po.total - po.paid_amount AS outstanding,
               po.expected_date, po.created_at,
               EXTRACT(DAY FROM NOW() - po.created_at) AS age_days
        FROM purchase_orders po
        WHERE po.supplier_id = $1 AND po.payment_status != 'paid'
        ORDER BY po.created_at ASC
      `, [s.id]),

      pool.query(`
        SELECT sp.reference, sp.amount, sp.payment_method, sp.payment_date, ba.bank_name
        FROM supplier_payments sp
        LEFT JOIN bank_accounts ba ON sp.bank_account_id = ba.id
        WHERE sp.supplier_id = $1
        ORDER BY sp.payment_date DESC LIMIT 10
      `, [s.id]),

      // Ageing buckets
      pool.query(`
        SELECT
          COALESCE(SUM(total - paid_amount) FILTER (WHERE EXTRACT(DAY FROM NOW()-created_at) <= 30), 0) AS "0_30",
          COALESCE(SUM(total - paid_amount) FILTER (WHERE EXTRACT(DAY FROM NOW()-created_at) BETWEEN 31 AND 60), 0) AS "31_60",
          COALESCE(SUM(total - paid_amount) FILTER (WHERE EXTRACT(DAY FROM NOW()-created_at) BETWEEN 61 AND 90), 0) AS "61_90",
          COALESCE(SUM(total - paid_amount) FILTER (WHERE EXTRACT(DAY FROM NOW()-created_at) > 90), 0) AS "over_90"
        FROM purchase_orders
        WHERE supplier_id = $1 AND payment_status != 'paid'
      `, [s.id]),
    ]);

    res.json({
      supplier: s,
      unpaid_orders: unpaidOrders.rows,
      payment_history: paymentHistory.rows,
      ageing: ageing.rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIER PAYMENTS  ──  GET /api/admin/suppliers/payments (all)
// ════════════════════════════════════════════════════════════════════════════
router.get("/payments/all", async (req, res) => {
  try {
    const { page = 1, limit = 20, supplier_id = "", from = "", to = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (supplier_id) { params.push(parseInt(supplier_id)); where.push(`sp.supplier_id = $${params.length}`); }
    if (from)        { params.push(from);  where.push(`sp.payment_date >= $${params.length}`); }
    if (to)          { params.push(to);    where.push(`sp.payment_date <= $${params.length}`); }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(`SELECT COUNT(*) FROM supplier_payments sp ${whereClause}`, params);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        sp.*,
        s.name AS supplier_name, s.supplier_code,
        ba.bank_name
      FROM supplier_payments sp
      LEFT JOIN suppliers s     ON sp.supplier_id     = s.id
      LEFT JOIN bank_accounts ba ON sp.bank_account_id = ba.id
      ${whereClause}
      ORDER BY sp.payment_date DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      payments: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// RECORD PAYMENT  ──  POST /api/admin/suppliers/:id/payments
router.post(
  "/:id/payments",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { amount, payment_method, bank_account_id, purchase_order_id, payment_date, notes } = req.body;
      if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ message: "amount must be > 0" });

      const suppRow = await client.query("SELECT * FROM suppliers WHERE id=$1 FOR UPDATE", [req.params.id]);
      if (!suppRow.rows.length) return res.status(404).json({ message: "Supplier not found" });

      const ref    = `SPAY-${Date.now()}`;
      const txDate = payment_date || new Date().toISOString().slice(0, 10);
      const amt    = parseFloat(amount);

      await client.query(
        `INSERT INTO supplier_payments (reference, supplier_id, purchase_order_id, amount, payment_method, bank_account_id, payment_date, notes, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
        [ref, parseInt(req.params.id), purchase_order_id?parseInt(purchase_order_id):null, amt, payment_method||null, bank_account_id?parseInt(bank_account_id):null, txDate, notes||null, req.user.id]
      );

      // Reduce supplier balance
      await client.query(
        "UPDATE suppliers SET balance=balance-$1, total_paid=total_paid+$1, updated_at=NOW() WHERE id=$2",
        [amt, req.params.id]
      );

      // Update PO paid_amount if linked
      if (purchase_order_id) {
        await client.query(`
          UPDATE purchase_orders SET
            paid_amount    = paid_amount + $1,
            payment_status = CASE
              WHEN paid_amount + $1 >= total THEN 'paid'
              WHEN paid_amount + $1 > 0       THEN 'partial'
              ELSE 'unpaid'
            END,
            updated_at = NOW()
          WHERE id = $2
        `, [amt, parseInt(purchase_order_id)]);
      }

      // Debit bank account
      if (bank_account_id) {
        await client.query(
          "UPDATE bank_accounts SET balance=balance-$1, updated_at=NOW() WHERE id=$2",
          [amt, parseInt(bank_account_id)]
        );
        await client.query(
          `INSERT INTO transactions (reference, type, source_type, bank_account_id, amount, description, payment_method, date, status, created_by, created_at)
           VALUES ($1,'debit','supplier_payment',$2,$3,$4,$5,$6,'completed',$7,NOW())`,
          [ref, parseInt(bank_account_id), amt, `Payment to supplier: ${suppRow.rows[0].name}`, payment_method||null, txDate, req.user.id]
        );
      }

      await client.query("COMMIT");
      res.status(201).json({ message: "Payment recorded", reference: ref });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
