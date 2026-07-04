// server/src/routes/purchases_admin.js
// Mounted at /api/admin/purchases in index.js
//
// ── REQUIRED SCHEMA MIGRATIONS ─────────────────────────────────────────────
//
// -- PURCHASE ORDERS
// CREATE TABLE IF NOT EXISTS purchase_orders (
//   id               SERIAL PRIMARY KEY,
//   reference        VARCHAR(50) UNIQUE,         -- PO-0001
//   supplier_id      INT REFERENCES suppliers(id) ON DELETE SET NULL,
//   status           VARCHAR(30) DEFAULT 'draft', -- draft | pending | approved | ordered | partial | received | cancelled
//   subtotal         DECIMAL(12,2) DEFAULT 0,
//   tax_amount       DECIMAL(12,2) DEFAULT 0,
//   discount         DECIMAL(12,2) DEFAULT 0,
//   total            DECIMAL(12,2) NOT NULL,
//   paid_amount      DECIMAL(12,2) DEFAULT 0,
//   payment_status   VARCHAR(20) DEFAULT 'unpaid', -- unpaid | partial | paid
//   expected_date    DATE,
//   received_date    DATE,
//   delivery_address TEXT,
//   notes            TEXT,
//   created_by       INT REFERENCES users(id) ON DELETE SET NULL,
//   approved_by      INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at       TIMESTAMP DEFAULT NOW(),
//   updated_at       TIMESTAMP DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
// CREATE INDEX IF NOT EXISTS idx_po_status   ON purchase_orders(status);
//
// -- PURCHASE ORDER ITEMS
// CREATE TABLE IF NOT EXISTS purchase_order_items (
//   id                 SERIAL PRIMARY KEY,
//   purchase_order_id  INT REFERENCES purchase_orders(id) ON DELETE CASCADE,
//   product_id         INT REFERENCES products(id) ON DELETE SET NULL,
//   product_name       VARCHAR(255),
//   quantity_ordered   INT NOT NULL,
//   quantity_received  INT DEFAULT 0,
//   unit_cost          DECIMAL(10,2) NOT NULL,
//   subtotal           DECIMAL(12,2),
//   notes              TEXT
// );
//
// -- PURCHASE RETURNS
// CREATE TABLE IF NOT EXISTS purchase_returns (
//   id                 SERIAL PRIMARY KEY,
//   reference          VARCHAR(50) UNIQUE,
//   purchase_order_id  INT REFERENCES purchase_orders(id) ON DELETE SET NULL,
//   supplier_id        INT REFERENCES suppliers(id) ON DELETE SET NULL,
//   reason             TEXT,
//   total_value        DECIMAL(12,2) DEFAULT 0,
//   status             VARCHAR(20) DEFAULT 'pending',  -- pending | approved | refunded | cancelled
//   created_by         INT REFERENCES users(id) ON DELETE SET NULL,
//   approved_by        INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at         TIMESTAMP DEFAULT NOW()
// );
//
// -- PURCHASE RETURN ITEMS
// CREATE TABLE IF NOT EXISTS purchase_return_items (
//   id                  SERIAL PRIMARY KEY,
//   purchase_return_id  INT REFERENCES purchase_returns(id) ON DELETE CASCADE,
//   product_id          INT REFERENCES products(id) ON DELETE SET NULL,
//   product_name        VARCHAR(255),
//   quantity            INT NOT NULL,
//   unit_cost           DECIMAL(10,2),
//   subtotal            DECIMAL(12,2)
// );
//
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.use(protect);

// ── HELPER: auto reference ───────────────────────────────────────────────────
async function nextRef(client, prefix, table) {
  const row = await client.query(`SELECT COUNT(*) FROM ${table}`);
  const n   = parseInt(row.rows[0].count) + 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

// ── HELPER: update supplier balance when PO total changes ────────────────────
async function syncSupplierBalance(client, supplierId) {
  await client.query(`
    UPDATE suppliers SET
      balance         = (SELECT COALESCE(SUM(total - paid_amount),0) FROM purchase_orders
                         WHERE supplier_id=$1 AND payment_status != 'paid' AND status NOT IN ('cancelled','draft')),
      total_purchases = (SELECT COALESCE(SUM(total),0) FROM purchase_orders
                         WHERE supplier_id=$1 AND status NOT IN ('cancelled','draft')),
      updated_at      = NOW()
    WHERE id=$1
  `, [supplierId]);
}

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDER LIST  ──  GET /api/admin/purchases
// ════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", status = "", payment_status = "", supplier_id = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(po.reference ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
    }
    if (status)         { params.push(status);              where.push(`po.status = $${params.length}`);         }
    if (payment_status) { params.push(payment_status);      where.push(`po.payment_status = $${params.length}`); }
    if (supplier_id)    { params.push(parseInt(supplier_id)); where.push(`po.supplier_id = $${params.length}`);  }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(
      `SELECT COUNT(*) FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.id ${whereClause}`, params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        po.*,
        s.name AS supplier_name, s.supplier_code, s.phone AS supplier_phone,
        u.name AS created_by_name,
        a.name AS approved_by_name,
        (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id=po.id) AS item_count
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u     ON po.created_by  = u.id
      LEFT JOIN users a     ON po.approved_by = a.id
      ${whereClause}
      ORDER BY po.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const stats = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE status = 'ordered')  AS ordered,
        COUNT(*) FILTER (WHERE status IN ('partial','received')) AS received,
        COALESCE(SUM(total) FILTER (WHERE status NOT IN ('cancelled','draft')), 0)   AS total_value,
        COALESCE(SUM(total - paid_amount) FILTER (WHERE payment_status != 'paid'), 0) AS outstanding
      FROM purchase_orders
    `);

    res.json({
      purchase_orders: rows.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: stats.rows[0],
    });
  } catch (err) {
    console.error("GET /admin/purchases:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDER DETAIL  ──  GET /api/admin/purchases/:id
// ════════════════════════════════════════════════════════════════════════════
router.get("/:id", async (req, res) => {
  try {
    const po = await pool.query(`
      SELECT po.*,
        s.name AS supplier_name, s.supplier_code, s.phone AS supplier_phone,
        s.bank_name AS supplier_bank, s.account_number AS supplier_account,
        u.name AS created_by_name,
        a.name AS approved_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.created_by = u.id
      LEFT JOIN users a ON po.approved_by = a.id
      WHERE po.id = $1
    `, [req.params.id]);

    if (!po.rows.length) return res.status(404).json({ message: "Purchase order not found" });

    const items = await pool.query(`
      SELECT poi.*, p.name AS current_product_name, p.sku, p.image_url
      FROM purchase_order_items poi
      LEFT JOIN products p ON poi.product_id = p.id
      WHERE poi.purchase_order_id = $1
      ORDER BY poi.id
    `, [req.params.id]);

    const payments = await pool.query(`
      SELECT sp.reference, sp.amount, sp.payment_method, sp.payment_date, ba.bank_name
      FROM supplier_payments sp
      LEFT JOIN bank_accounts ba ON sp.bank_account_id = ba.id
      WHERE sp.purchase_order_id = $1
      ORDER BY sp.payment_date DESC
    `, [req.params.id]);

    res.json({ ...po.rows[0], items: items.rows, payments: payments.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CREATE PURCHASE ORDER  ──  POST /api/admin/purchases
// ════════════════════════════════════════════════════════════════════════════
router.post("/", requireRole("superadmin", "manager", "admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      supplier_id, expected_date, delivery_address, notes,
      items = [],    // [{ product_id, product_name, quantity_ordered, unit_cost, notes }]
      tax_rate = 0, discount = 0,
      status = "draft",
    } = req.body;

    if (!supplier_id) return res.status(400).json({ message: "supplier_id required" });
    if (!items.length) return res.status(400).json({ message: "At least one item required" });

    // Calculate totals
    const subtotal = items.reduce((sum, it) => sum + parseFloat(it.unit_cost) * parseInt(it.quantity_ordered), 0);
    const taxAmt   = subtotal * (parseFloat(tax_rate) / 100);
    const total    = subtotal + taxAmt - parseFloat(discount);

    const ref    = await nextRef(client, "PO", "purchase_orders");
    const poRes  = await client.query(
      `INSERT INTO purchase_orders
         (reference, supplier_id, status, subtotal, tax_amount, discount, total, paid_amount, payment_status, expected_date, delivery_address, notes, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,'unpaid',$8,$9,$10,$11,NOW(),NOW())
       RETURNING *`,
      [ref, parseInt(supplier_id), status, subtotal, taxAmt, parseFloat(discount), total, expected_date||null, delivery_address||null, notes||null, req.user.id]
    );

    const po = poRes.rows[0];

    for (const it of items) {
      if (!it.quantity_ordered || !it.unit_cost) continue;
      const itemSubtotal = parseFloat(it.unit_cost) * parseInt(it.quantity_ordered);
      await client.query(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, product_name, quantity_ordered, quantity_received, unit_cost, subtotal, notes)
         VALUES ($1,$2,$3,$4,0,$5,$6,$7)`,
        [po.id, it.product_id?parseInt(it.product_id):null, it.product_name||null, parseInt(it.quantity_ordered), parseFloat(it.unit_cost), itemSubtotal, it.notes||null]
      );
    }

    // If not a draft, add to supplier balance
    if (status !== "draft") await syncSupplierBalance(client, parseInt(supplier_id));

    await client.query("COMMIT");
    res.status(201).json({ purchase_order: po, message: "Purchase order created" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /admin/purchases:", err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UPDATE STATUS  ──  PATCH /api/admin/purchases/:id/status
// ════════════════════════════════════════════════════════════════════════════
router.patch("/:id/status", requireRole("superadmin", "manager", "admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { status, notes } = req.body;
    const allowed = ["draft", "pending", "approved", "ordered", "partial", "received", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });

    const cur = await client.query("SELECT * FROM purchase_orders WHERE id=$1 FOR UPDATE", [req.params.id]);
    if (!cur.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Purchase order not found" }); }
    const po = cur.rows[0];

    const updates = { status, notes: notes || po.notes };
    if (status === "approved") updates.approved_by = req.user.id;

    await client.query(
      `UPDATE purchase_orders SET status=$1, notes=COALESCE($2,notes), approved_by=COALESCE($3,approved_by), updated_at=NOW() WHERE id=$4`,
      [status, updates.notes, updates.approved_by || null, req.params.id]
    );

    if (po.supplier_id && status !== "draft") await syncSupplierBalance(client, po.supplier_id);

    await client.query("COMMIT");
    res.json({ message: `Purchase order ${status}` });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// RECEIVE STOCK  ──  POST /api/admin/purchases/:id/receive
// Records received quantities and updates product.stock
// ════════════════════════════════════════════════════════════════════════════
router.post("/:id/receive", requireRole("superadmin", "manager", "admin", "storekeeper"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { items = [], warehouse_id } = req.body;
    // items: [{ purchase_order_item_id, quantity_received }]
    if (!items.length) return res.status(400).json({ message: "items required" });

    const po = await client.query("SELECT * FROM purchase_orders WHERE id=$1 FOR UPDATE", [req.params.id]);
    if (!po.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Purchase order not found" }); }
    if (po.rows[0].status === "cancelled") { await client.query("ROLLBACK"); return res.status(400).json({ message: "Cannot receive a cancelled order" }); }

    let allReceived = true;
    let anyReceived = false;

    for (const it of items) {
      const qty = parseInt(it.quantity_received);
      if (!qty || qty <= 0) continue;

      const item = await client.query(
        "SELECT * FROM purchase_order_items WHERE id=$1 AND purchase_order_id=$2 FOR UPDATE",
        [it.purchase_order_item_id, req.params.id]
      );
      if (!item.rows.length) continue;

      const poi = item.rows[0];
      const newReceived = (poi.quantity_received || 0) + qty;

      await client.query(
        "UPDATE purchase_order_items SET quantity_received=$1 WHERE id=$2",
        [Math.min(newReceived, poi.quantity_ordered), poi.id]
      );

      // Update product stock
      if (poi.product_id) {
        await client.query(
          "UPDATE products SET stock=stock+$1, stock_quantity=stock_quantity+$1, updated_at=NOW() WHERE id=$2",
          [qty, poi.product_id]
        );

        // Log stock movement
        await client.query(
          `INSERT INTO stock_movements (product_id, warehouse_id, type, quantity, reference, reason, unit_cost, created_by, created_at)
           VALUES ($1,$2,'stock_in',$3,$4,'Purchase order received',$5,$6,NOW())`,
          [poi.product_id, warehouse_id?parseInt(warehouse_id):null, qty, po.rows[0].reference, poi.unit_cost, req.user.id]
        );
      }

      if (newReceived < poi.quantity_ordered) allReceived = false;
      anyReceived = true;
    }

    // Update PO status
    const newStatus = allReceived ? "received" : anyReceived ? "partial" : po.rows[0].status;
    await client.query(
      "UPDATE purchase_orders SET status=$1, received_date=CASE WHEN $1='received' THEN CURRENT_DATE ELSE received_date END, updated_at=NOW() WHERE id=$2",
      [newStatus, req.params.id]
    );

    if (po.rows[0].supplier_id) await syncSupplierBalance(client, po.rows[0].supplier_id);

    await client.query("COMMIT");
    res.json({ message: `Stock received. Order status: ${newStatus}`, status: newStatus });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE PAYMENTS  ──  GET /api/admin/purchases/payments
// ════════════════════════════════════════════════════════════════════════════
router.get("/payments", async (req, res) => {
  try {
    const { page = 1, limit = 20, supplier_id = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where  = supplier_id ? [`sp.supplier_id = $1`] : [];
    const params = supplier_id ? [parseInt(supplier_id)] : [];

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(`SELECT COUNT(*) FROM supplier_payments sp ${whereClause}`, params);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        sp.*,
        s.name AS supplier_name, s.supplier_code,
        po.reference AS po_reference,
        ba.bank_name
      FROM supplier_payments sp
      LEFT JOIN suppliers     s  ON sp.supplier_id      = s.id
      LEFT JOIN purchase_orders po ON sp.purchase_order_id = po.id
      LEFT JOIN bank_accounts  ba ON sp.bank_account_id  = ba.id
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

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE RETURNS  ──  GET /api/admin/purchases/returns
// ════════════════════════════════════════════════════════════════════════════
router.get("/returns", async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where  = status ? ["pr.status = $1"] : [];
    const params = status ? [status] : [];

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(`SELECT COUNT(*) FROM purchase_returns pr ${whereClause}`, params);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        pr.*,
        s.name AS supplier_name,
        po.reference AS po_reference,
        u.name AS created_by_name,
        a.name AS approved_by_name
      FROM purchase_returns pr
      LEFT JOIN suppliers      s  ON pr.supplier_id      = s.id
      LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
      LEFT JOIN users u ON pr.created_by  = u.id
      LEFT JOIN users a ON pr.approved_by = a.id
      ${whereClause}
      ORDER BY pr.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      returns: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE PURCHASE RETURN  ──  POST /api/admin/purchases/returns
router.post("/returns", requireRole("superadmin", "manager", "admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { purchase_order_id, supplier_id, reason, items = [] } = req.body;
    if (!purchase_order_id) return res.status(400).json({ message: "purchase_order_id required" });
    if (!items.length)      return res.status(400).json({ message: "At least one return item required" });

    const totalValue = items.reduce((s, it) => s + (parseFloat(it.unit_cost || 0) * parseInt(it.quantity || 0)), 0);
    const ref        = await nextRef(client, "PR", "purchase_returns");

    // Get supplier_id from PO if not provided
    let suppId = supplier_id;
    if (!suppId) {
      const poRow = await client.query("SELECT supplier_id FROM purchase_orders WHERE id=$1", [parseInt(purchase_order_id)]);
      suppId = poRow.rows[0]?.supplier_id;
    }

    const retRes = await client.query(
      `INSERT INTO purchase_returns (reference, purchase_order_id, supplier_id, reason, total_value, status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,'pending',$6,NOW()) RETURNING *`,
      [ref, parseInt(purchase_order_id), suppId?parseInt(suppId):null, reason||null, totalValue, req.user.id]
    );

    const ret = retRes.rows[0];

    for (const it of items) {
      if (!it.quantity || parseInt(it.quantity) <= 0) continue;
      const sub = parseFloat(it.unit_cost || 0) * parseInt(it.quantity);

      await client.query(
        `INSERT INTO purchase_return_items (purchase_return_id, product_id, product_name, quantity, unit_cost, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [ret.id, it.product_id?parseInt(it.product_id):null, it.product_name||null, parseInt(it.quantity), parseFloat(it.unit_cost||0), sub]
      );

      // Deduct stock for returned items
      if (it.product_id) {
        await client.query(
          "UPDATE products SET stock=GREATEST(stock-$1,0), stock_quantity=GREATEST(stock_quantity-$1,0), updated_at=NOW() WHERE id=$2",
          [parseInt(it.quantity), parseInt(it.product_id)]
        );
        await client.query(
          `INSERT INTO stock_movements (product_id, type, quantity, reference, reason, created_by, created_at)
           VALUES ($1,'stock_out',$2,$3,'Purchase return',$4,NOW())`,
          [parseInt(it.product_id), parseInt(it.quantity), ref, req.user.id]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ return: ret, message: "Purchase return created" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// APPROVE RETURN  ──  PATCH /api/admin/purchases/returns/:id/approve
router.patch("/returns/:id/approve", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    const { action } = req.body; // "approve" | "reject" | "refunded"
    const allowed = ["approved", "refunded", "cancelled"];
    if (!allowed.includes(action)) return res.status(400).json({ message: `action must be: ${allowed.join(", ")}` });

    const result = await pool.query(
      "UPDATE purchase_returns SET status=$1, approved_by=$2 WHERE id=$3 RETURNING *",
      [action, req.user.id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Return not found" });
    res.json({ return: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// FORM DATA  ──  GET /api/admin/purchases/form-data
// Returns suppliers + products for dropdowns
// ════════════════════════════════════════════════════════════════════════════
router.get("/form-data", async (req, res) => {
  try {
    const [suppliers, products] = await Promise.all([
      pool.query("SELECT id, name, supplier_code, payment_terms FROM suppliers WHERE status='active' ORDER BY name"),
      pool.query("SELECT id, name, sku, COALESCE(cost_price, unit_price, price, 0) AS unit_cost FROM products WHERE status='active' ORDER BY name"),
    ]);
    res.json({ suppliers: suppliers.rows, products: products.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
