// server/src/routes/inventory_admin.js
// Mounted at /api/admin/inventory in index.js
//
// ── REQUIRED SCHEMA MIGRATIONS ─────────────────────────────────────────────
//
// Run these on your Render PostgreSQL database before deploying:
//
// -- WAREHOUSES
// CREATE TABLE IF NOT EXISTS warehouses (
//   id          SERIAL PRIMARY KEY,
//   name        VARCHAR(255) NOT NULL,
//   code        VARCHAR(20),
//   location    TEXT,
//   manager     VARCHAR(255),
//   capacity    INT,
//   status      VARCHAR(20) DEFAULT 'active',
//   created_at  TIMESTAMP DEFAULT NOW(),
//   updated_at  TIMESTAMP DEFAULT NOW()
// );
// INSERT INTO warehouses (name, code, location, status) VALUES
//   ('Main Store', 'MAIN', '14 Farm Road, Epe, Lagos', 'active'),
//   ('Cold Store',  'COLD', '14 Farm Road, Epe, Lagos', 'active')
// ON CONFLICT DO NOTHING;
//
// -- STOCK MOVEMENTS (audit trail for every stock change)
// CREATE TABLE IF NOT EXISTS stock_movements (
//   id           SERIAL PRIMARY KEY,
//   product_id   INT REFERENCES products(id) ON DELETE SET NULL,
//   warehouse_id INT REFERENCES warehouses(id) ON DELETE SET NULL,
//   type         VARCHAR(30) NOT NULL,  -- stock_in | stock_out | adjustment | transfer_in | transfer_out | lost
//   quantity     INT NOT NULL,
//   before_qty   INT,
//   after_qty    INT,
//   reference    VARCHAR(100),   -- batch no, PO ref, manual ref
//   reason       VARCHAR(255),
//   notes        TEXT,
//   unit_cost    DECIMAL(10,2),
//   created_by   INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at   TIMESTAMP DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
// CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);
//
// -- BATCH MANAGEMENT (lot/batch tracking with expiry)
// CREATE TABLE IF NOT EXISTS batch_management (
//   id                SERIAL PRIMARY KEY,
//   product_id        INT REFERENCES products(id) ON DELETE CASCADE,
//   warehouse_id      INT REFERENCES warehouses(id) ON DELETE SET NULL,
//   batch_no          VARCHAR(100) NOT NULL,
//   quantity          INT DEFAULT 0,
//   cost_price        DECIMAL(10,2),
//   expiry_date       DATE,
//   manufactured_date DATE,
//   supplier_id       INT,
//   notes             TEXT,
//   status            VARCHAR(20) DEFAULT 'active',  -- active | expired | depleted | recalled
//   received_at       TIMESTAMP DEFAULT NOW(),
//   created_at        TIMESTAMP DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_batch_expiry ON batch_management(expiry_date);
//
// -- LOST / DAMAGED ITEMS
// CREATE TABLE IF NOT EXISTS lost_items (
//   id               SERIAL PRIMARY KEY,
//   product_id       INT REFERENCES products(id) ON DELETE SET NULL,
//   warehouse_id     INT REFERENCES warehouses(id) ON DELETE SET NULL,
//   quantity         INT NOT NULL,
//   reason           VARCHAR(100),  -- damaged | expired | theft | miscounted | other
//   estimated_value  DECIMAL(10,2),
//   notes            TEXT,
//   reported_by      INT REFERENCES users(id) ON DELETE SET NULL,
//   approved_by      INT REFERENCES users(id) ON DELETE SET NULL,
//   status           VARCHAR(20) DEFAULT 'pending',  -- pending | approved | rejected
//   created_at       TIMESTAMP DEFAULT NOW()
// );
//
// -- Add warehouse_id to products if not already there:
// ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_id INT REFERENCES warehouses(id) ON DELETE SET NULL;
//
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.use(protect);

// ── HELPER: log a stock movement and update product.stock atomically ────────
async function applyStockChange(client, { productId, warehouseId, type, delta, reference, reason, notes, unitCost, userId }) {
  const before = await client.query("SELECT stock FROM products WHERE id=$1 FOR UPDATE", [productId]);
  if (!before.rows.length) throw new Error("Product not found");

  const beforeQty = parseInt(before.rows[0].stock) || 0;
  const afterQty  = Math.max(0, beforeQty + delta);

  await client.query(
    "UPDATE products SET stock=$1, stock_quantity=$1, updated_at=NOW() WHERE id=$2",
    [afterQty, productId]
  );

  const mv = await client.query(
    `INSERT INTO stock_movements
       (product_id, warehouse_id, type, quantity, before_qty, after_qty, reference, reason, notes, unit_cost, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()) RETURNING id`,
    [productId, warehouseId || null, type, Math.abs(delta), beforeQty, afterQty, reference || null, reason || null, notes || null, unitCost || null, userId || null]
  );

  return { movement_id: mv.rows[0].id, before_qty: beforeQty, after_qty: afterQty };
}

// ════════════════════════════════════════════════════════════════════════════
// STOCK LIST  ──  GET /api/admin/inventory
// ════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", category = "", stock_status = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = ["p.status != 'archived'"];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }
    if (category) {
      params.push(parseInt(category));
      where.push(`p.category_id = $${params.length}`);
    }
    if (stock_status === "out")   where.push("p.stock = 0");
    if (stock_status === "low")   where.push("p.stock > 0 AND p.stock <= p.low_stock_threshold");
    if (stock_status === "ok")    where.push("p.stock > p.low_stock_threshold");

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRes = await pool.query(`SELECT COUNT(*) FROM products p ${whereClause}`, params);
    const total    = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        p.id, p.name, p.sku, p.image_url,
        p.stock, p.stock_quantity, p.low_stock_threshold,
        COALESCE(p.unit_price, p.price, 0) AS unit_price,
        COALESCE(p.cost_price, 0)          AS cost_price,
        p.status, p.expiry_date,
        cat.name AS category,
        ''       AS brand,
        COALESCE(p.unit, '')               AS unit,
        CASE
          WHEN p.stock = 0                         THEN 'out_of_stock'
          WHEN p.stock <= p.low_stock_threshold    THEN 'low'
          ELSE 'in_stock'
        END AS stock_status,
        p.stock * COALESCE(p.unit_price, p.price, 0) AS stock_value
      FROM products p
      LEFT JOIN categories cat ON p.category_id = cat.id
      ${whereClause}
      ORDER BY p.stock ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // Summary stats
    const stats = await pool.query(`
      SELECT
        COUNT(*)                                               AS total_skus,
        COUNT(*) FILTER (WHERE stock = 0)                     AS out_of_stock,
        COUNT(*) FILTER (WHERE stock > 0 AND stock <= low_stock_threshold) AS low_stock,
        COALESCE(SUM(stock * COALESCE(unit_price, price, 0)), 0) AS total_value
      FROM products
      WHERE status != 'archived'
    `);

    res.json({
      products: rows.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: stats.rows[0],
    });
  } catch (err) {
    console.error("GET /admin/inventory:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// STOCK ALERTS  ──  GET /api/admin/inventory/alerts
// ════════════════════════════════════════════════════════════════════════════
router.get("/alerts", async (req, res) => {
  try {
    const [lowStock, outOfStock, expiringSoon, expiringBatches] = await Promise.all([
      pool.query(`
        SELECT p.id, p.name, p.sku, p.stock, p.low_stock_threshold,
               cat.name AS category, p.image_url
        FROM products p
        LEFT JOIN categories cat ON p.category_id = cat.id
        WHERE p.stock > 0 AND p.stock <= p.low_stock_threshold
          AND p.status = 'active'
        ORDER BY (p.stock::float / NULLIF(p.low_stock_threshold,0)) ASC
      `),

      pool.query(`
        SELECT p.id, p.name, p.sku, cat.name AS category, p.image_url
        FROM products p
        LEFT JOIN categories cat ON p.category_id = cat.id
        WHERE p.stock = 0 AND p.status = 'active'
        ORDER BY p.updated_at DESC
      `),

      pool.query(`
        SELECT p.id, p.name, p.sku, p.expiry_date, p.stock,
               cat.name AS category
        FROM products p
        LEFT JOIN categories cat ON p.category_id = cat.id
        WHERE p.expiry_date IS NOT NULL
          AND p.expiry_date <= CURRENT_DATE + INTERVAL '7 days'
          AND p.status = 'active'
        ORDER BY p.expiry_date ASC
      `),

      pool.query(`
        SELECT b.id, b.batch_no, b.quantity, b.expiry_date,
               p.name AS product_name, p.sku,
               (b.expiry_date - CURRENT_DATE) AS days_left
        FROM batch_management b
        JOIN products p ON b.product_id = p.id
        WHERE b.expiry_date <= CURRENT_DATE + INTERVAL '14 days'
          AND b.status = 'active'
          AND b.quantity > 0
        ORDER BY b.expiry_date ASC
      `),
    ]);

    res.json({
      low_stock: lowStock.rows,
      out_of_stock: outOfStock.rows,
      expiring_soon: expiringSoon.rows,
      expiring_batches: expiringBatches.rows,
      summary: {
        low_stock_count: lowStock.rows.length,
        out_of_stock_count: outOfStock.rows.length,
        expiring_product_count: expiringSoon.rows.length,
        expiring_batch_count: expiringBatches.rows.length,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// STOCK VALUATION  ──  GET /api/admin/inventory/valuation
// ════════════════════════════════════════════════════════════════════════════
router.get("/valuation", async (req, res) => {
  try {
    const [totalValue, byCategory, topValueItems, movements30d] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_skus,
          COALESCE(SUM(stock * COALESCE(cost_price, unit_price, price, 0)), 0) AS cost_value,
          COALESCE(SUM(stock * COALESCE(unit_price, price, 0)), 0)             AS retail_value,
          COALESCE(SUM(stock), 0) AS total_units
        FROM products WHERE status = 'active'
      `),

      pool.query(`
        SELECT
          cat.name AS category,
          COUNT(p.id) AS skus,
          SUM(p.stock) AS total_units,
          COALESCE(SUM(p.stock * COALESCE(p.cost_price, p.unit_price, p.price, 0)), 0) AS cost_value,
          COALESCE(SUM(p.stock * COALESCE(p.unit_price, p.price, 0)), 0)               AS retail_value
        FROM products p
        JOIN categories cat ON p.category_id = cat.id
        WHERE p.status = 'active'
        GROUP BY cat.name
        ORDER BY retail_value DESC
      `),

      pool.query(`
        SELECT
          p.name, p.sku, p.stock,
          COALESCE(p.unit_price, p.price, 0) AS unit_price,
          COALESCE(p.cost_price, 0)          AS cost_price,
          p.stock * COALESCE(p.unit_price, p.price, 0) AS retail_value
        FROM products p
        WHERE p.status = 'active' AND p.stock > 0
        ORDER BY retail_value DESC
        LIMIT 10
      `),

      pool.query(`
        SELECT
          type,
          COUNT(*) AS count,
          SUM(quantity) AS total_units,
          SUM(quantity * COALESCE(unit_cost, 0)) AS total_cost
        FROM stock_movements
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY type
      `),
    ]);

    res.json({
      summary: totalValue.rows[0],
      by_category: byCategory.rows,
      top_value_items: topValueItems.rows,
      movements_30d: movements30d.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MOVEMENT HISTORY  ──  GET /api/admin/inventory/movements
// ════════════════════════════════════════════════════════════════════════════
router.get("/movements", async (req, res) => {
  try {
    const { page = 1, limit = 20, product_id = "", type = "", from = "", to = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = [];

    if (product_id) { params.push(parseInt(product_id)); where.push(`sm.product_id = $${params.length}`); }
    if (type)       { params.push(type); where.push(`sm.type = $${params.length}`); }
    if (from)       { params.push(from); where.push(`sm.created_at >= $${params.length}`); }
    if (to)         { params.push(to);   where.push(`sm.created_at <= $${params.length} + INTERVAL '1 day'`); }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRes = await pool.query(`SELECT COUNT(*) FROM stock_movements sm ${whereClause}`, params);
    const total    = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        sm.id, sm.type, sm.quantity, sm.before_qty, sm.after_qty,
        sm.reference, sm.reason, sm.notes, sm.unit_cost, sm.created_at,
        p.name AS product_name, p.sku,
        w.name AS warehouse_name,
        u.name AS created_by_name
      FROM stock_movements sm
      LEFT JOIN products   p ON sm.product_id   = p.id
      LEFT JOIN warehouses w ON sm.warehouse_id  = w.id
      LEFT JOIN users      u ON sm.created_by    = u.id
      ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      movements: rows.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// STOCK ADJUSTMENT  ──  POST /api/admin/inventory/adjust
// ════════════════════════════════════════════════════════════════════════════
router.post(
  "/adjust",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { product_id, warehouse_id, new_quantity, reason, notes } = req.body;

      if (!product_id) return res.status(400).json({ message: "product_id required" });
      if (new_quantity === undefined || new_quantity === null) return res.status(400).json({ message: "new_quantity required" });
      if (!reason) return res.status(400).json({ message: "reason required for stock adjustments" });

      const cur = await client.query("SELECT stock FROM products WHERE id=$1 FOR UPDATE", [parseInt(product_id)]);
      if (!cur.rows.length) return res.status(404).json({ message: "Product not found" });

      const beforeQty = parseInt(cur.rows[0].stock) || 0;
      const afterQty  = Math.max(0, parseInt(new_quantity));
      const delta     = afterQty - beforeQty;

      await client.query(
        "UPDATE products SET stock=$1, stock_quantity=$1, updated_at=NOW() WHERE id=$2",
        [afterQty, parseInt(product_id)]
      );

      await client.query(
        `INSERT INTO stock_movements
           (product_id, warehouse_id, type, quantity, before_qty, after_qty, reference, reason, notes, created_by, created_at)
         VALUES ($1,$2,'adjustment',$3,$4,$5,$6,$7,$8,$9,NOW())`,
        [
          parseInt(product_id),
          warehouse_id ? parseInt(warehouse_id) : null,
          Math.abs(delta),
          beforeQty,
          afterQty,
          null,
          reason,
          notes || null,
          req.user.id,
        ]
      );

      await client.query("COMMIT");
      res.json({ message: "Stock adjusted", before_qty: beforeQty, after_qty: afterQty, delta });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// STOCK TRANSFER  ──  POST /api/admin/inventory/transfer
// Moves stock between two warehouses (no net change to product.stock)
// ════════════════════════════════════════════════════════════════════════════
router.post(
  "/transfer",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { product_id, from_warehouse_id, to_warehouse_id, quantity, notes } = req.body;

      if (!product_id)       return res.status(400).json({ message: "product_id required" });
      if (!from_warehouse_id) return res.status(400).json({ message: "from_warehouse_id required" });
      if (!to_warehouse_id)  return res.status(400).json({ message: "to_warehouse_id required" });
      if (!quantity || parseInt(quantity) <= 0) return res.status(400).json({ message: "quantity must be > 0" });
      if (from_warehouse_id === to_warehouse_id) return res.status(400).json({ message: "From and To warehouses must be different" });

      const ref = `TRF-${Date.now()}`;
      const qty = parseInt(quantity);

      await client.query(
        `INSERT INTO stock_movements (product_id, warehouse_id, type, quantity, reference, notes, created_by, created_at)
         VALUES ($1,$2,'transfer_out',$3,$4,$5,$6,NOW())`,
        [parseInt(product_id), parseInt(from_warehouse_id), qty, ref, notes || null, req.user.id]
      );

      await client.query(
        `INSERT INTO stock_movements (product_id, warehouse_id, type, quantity, reference, notes, created_by, created_at)
         VALUES ($1,$2,'transfer_in',$3,$4,$5,$6,NOW())`,
        [parseInt(product_id), parseInt(to_warehouse_id), qty, ref, notes || null, req.user.id]
      );

      await client.query("COMMIT");
      res.json({ message: "Transfer recorded", reference: ref, quantity: qty });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// WAREHOUSES
// ════════════════════════════════════════════════════════════════════════════
router.get("/warehouses", async (req, res) => {
  try {
    const rows = await pool.query(`
      SELECT
        w.*,
        COUNT(DISTINCT p.id) AS product_count,
        COALESCE(SUM(p.stock), 0) AS total_units
      FROM warehouses w
      LEFT JOIN products p ON p.warehouse_id = w.id AND p.status != 'archived'
      GROUP BY w.id
      ORDER BY w.name
    `);
    res.json({ warehouses: rows.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/warehouses", requireRole("superadmin", "manager", "admin"), async (req, res) => {
  try {
    const { name, code, location, manager, capacity } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Warehouse name required" });

    const result = await pool.query(
      `INSERT INTO warehouses (name, code, location, manager, capacity, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'active',NOW(),NOW()) RETURNING *`,
      [name.trim(), code || null, location || null, manager || null, capacity ? parseInt(capacity) : null]
    );
    res.status(201).json({ warehouse: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/warehouses/:id", requireRole("superadmin", "manager", "admin"), async (req, res) => {
  try {
    const { name, code, location, manager, capacity, status } = req.body;
    const result = await pool.query(
      `UPDATE warehouses SET
         name     = COALESCE($1, name),
         code     = COALESCE($2, code),
         location = COALESCE($3, location),
         manager  = COALESCE($4, manager),
         capacity = COALESCE($5, capacity),
         status   = COALESCE($6, status),
         updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name || null, code || null, location || null, manager || null, capacity ? parseInt(capacity) : null, status || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Warehouse not found" });
    res.json({ warehouse: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/warehouses/:id", requireRole("superadmin"), async (req, res) => {
  try {
    await pool.query("UPDATE warehouses SET status='inactive', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json({ message: "Warehouse deactivated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// BATCH MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════
router.get("/batches", async (req, res) => {
  try {
    const { page = 1, limit = 20, product_id = "", status = "", expiring = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (product_id) { params.push(parseInt(product_id)); where.push(`b.product_id = $${params.length}`); }
    if (status)     { params.push(status);               where.push(`b.status = $${params.length}`); }
    if (expiring === "7")  where.push("b.expiry_date <= CURRENT_DATE + INTERVAL '7 days'  AND b.expiry_date >= CURRENT_DATE");
    if (expiring === "30") where.push("b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND b.expiry_date >= CURRENT_DATE");
    if (expiring === "expired") where.push("b.expiry_date < CURRENT_DATE");

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(`SELECT COUNT(*) FROM batch_management b ${whereClause}`, params);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        b.*,
        p.name AS product_name, p.sku,
        w.name AS warehouse_name,
        EXTRACT(DAY FROM (b.expiry_date - CURRENT_DATE)) AS days_until_expiry
      FROM batch_management b
      LEFT JOIN products   p ON b.product_id   = p.id
      LEFT JOIN warehouses w ON b.warehouse_id  = w.id
      ${whereClause}
      ORDER BY b.expiry_date ASC NULLS LAST
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      batches: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/batches", requireRole("superadmin", "manager", "admin", "storekeeper"), async (req, res) => {
  try {
    const { product_id, warehouse_id, batch_no, quantity, cost_price, expiry_date, manufactured_date, supplier_id, notes } = req.body;
    if (!product_id) return res.status(400).json({ message: "product_id required" });
    if (!batch_no)   return res.status(400).json({ message: "batch_no required" });

    const result = await pool.query(
      `INSERT INTO batch_management
         (product_id, warehouse_id, batch_no, quantity, cost_price, expiry_date, manufactured_date, supplier_id, notes, received_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`,
      [parseInt(product_id), warehouse_id ? parseInt(warehouse_id) : null, batch_no, parseInt(quantity) || 0, cost_price ? parseFloat(cost_price) : null, expiry_date || null, manufactured_date || null, supplier_id ? parseInt(supplier_id) : null, notes || null]
    );
    res.status(201).json({ batch: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/batches/:id", requireRole("superadmin", "manager", "admin"), async (req, res) => {
  try {
    const { quantity, expiry_date, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE batch_management SET
         quantity    = COALESCE($1, quantity),
         expiry_date = COALESCE($2, expiry_date),
         status      = COALESCE($3, status),
         notes       = COALESCE($4, notes)
       WHERE id = $5 RETURNING *`,
      [quantity ? parseInt(quantity) : null, expiry_date || null, status || null, notes || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Batch not found" });
    res.json({ batch: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/batches/:id", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    await pool.query("UPDATE batch_management SET status='recalled' WHERE id=$1", [req.params.id]);
    res.json({ message: "Batch recalled" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// LOST / DAMAGED ITEMS
// ════════════════════════════════════════════════════════════════════════════
router.get("/lost-items", async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where  = status ? ["li.status = $1"] : [];
    const params = status ? [status] : [];

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(`SELECT COUNT(*) FROM lost_items li ${whereClause}`, params);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        li.id, li.quantity, li.reason, li.estimated_value,
        li.notes, li.status, li.created_at,
        p.name AS product_name, p.sku,
        w.name AS warehouse_name,
        r.name AS reported_by_name,
        a.name AS approved_by_name
      FROM lost_items li
      LEFT JOIN products   p ON li.product_id   = p.id
      LEFT JOIN warehouses w ON li.warehouse_id  = w.id
      LEFT JOIN users      r ON li.reported_by   = r.id
      LEFT JOIN users      a ON li.approved_by   = a.id
      ${whereClause}
      ORDER BY li.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ items: rows.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post(
  "/lost-items",
  requireRole("superadmin", "manager", "admin", "storekeeper"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { product_id, warehouse_id, quantity, reason, notes, deduct_stock = true } = req.body;

      if (!product_id) return res.status(400).json({ message: "product_id required" });
      if (!quantity || parseInt(quantity) <= 0) return res.status(400).json({ message: "quantity must be > 0" });

      const prod = await client.query("SELECT unit_price, price FROM products WHERE id=$1", [parseInt(product_id)]);
      const unitValue = parseFloat(prod.rows[0]?.unit_price || prod.rows[0]?.price || 0);
      const estValue  = unitValue * parseInt(quantity);

      const result = await client.query(
        `INSERT INTO lost_items (product_id, warehouse_id, quantity, reason, estimated_value, notes, reported_by, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW()) RETURNING id`,
        [parseInt(product_id), warehouse_id ? parseInt(warehouse_id) : null, parseInt(quantity), reason || null, estValue, notes || null, req.user.id]
      );

      if (deduct_stock) {
        await applyStockChange(client, {
          productId: parseInt(product_id),
          warehouseId: warehouse_id ? parseInt(warehouse_id) : null,
          type: "lost",
          delta: -parseInt(quantity),
          reason: reason || "Lost/Damaged",
          notes,
          userId: req.user.id,
        });
      }

      await client.query("COMMIT");
      res.status(201).json({ message: "Lost item reported", id: result.rows[0].id, estimated_value: estValue });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  }
);

router.patch(
  "/lost-items/:id/approve",
  requireRole("superadmin", "manager"),
  async (req, res) => {
    try {
      const { action } = req.body; // "approve" | "reject"
      const status = action === "approve" ? "approved" : "rejected";
      await pool.query(
        "UPDATE lost_items SET status=$1, approved_by=$2 WHERE id=$3",
        [status, req.user.id, req.params.id]
      );
      res.json({ message: `Lost item ${status}` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ── PATCH /api/admin/inventory/products/:id/reorder ───────────────
router.patch(
  "/products/:id/reorder",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    try {
      const { reorder_level } = req.body;
      if (reorder_level === undefined || isNaN(parseInt(reorder_level))) {
        return res.status(400).json({ message: "reorder_level integer is required" });
      }
      await pool.query(
        "UPDATE products SET low_stock_threshold = $1, updated_at = NOW() WHERE id = $2",
        [parseInt(reorder_level), req.params.id]
      );
      res.json({ message: "Reorder level updated successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
