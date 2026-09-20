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
//   ('Main Store', 'MAIN', '14 Farm Road, Aba, Abia State', 'active'),
//   ('Cold Store',  'COLD', '14 Farm Road, Aba, Abia State', 'active')
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
// -- Negative stock constraint
// ALTER TABLE products ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0);
//
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { clampLimit } = require("../utils/pagination");
const { protect, requireRole } = require("../middleware/authMiddleware");

let inventoryTablesReady = false;
async function ensureInventoryTables() {
  if (inventoryTablesReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        code        VARCHAR(20) UNIQUE NOT NULL,
        location    VARCHAR(255),
        manager     VARCHAR(100),
        capacity    INT,
        status      VARCHAR(20) DEFAULT 'active',
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO warehouses (name, code, location, status) VALUES
        ('Main Central Coldroom', 'WH-COLD-01', 'Abia Hub 1', 'active'),
        ('Vegetable Packhouse',   'WH-VEG-01',  'Greenhouse Bay 2', 'active'),
        ('Dry Goods Store',       'WH-DRY-01',  'Warehouse B', 'active'),
        ('Dispatch Sorting Bay',  'WH-DISP-01', 'Main Facility Gate', 'active')
      ON CONFLICT (code) DO NOTHING;

      CREATE TABLE IF NOT EXISTS batch_management (
        id                SERIAL PRIMARY KEY,
        product_id        INT REFERENCES products(id) ON DELETE CASCADE,
        warehouse_id      INT REFERENCES warehouses(id) ON DELETE SET NULL,
        batch_no          VARCHAR(100) NOT NULL,
        quantity          INT DEFAULT 0,
        cost_price        DECIMAL(10,2),
        expiry_date       DATE,
        manufactured_date DATE,
        supplier_id       INT,
        notes             TEXT,
        status            VARCHAR(20) DEFAULT 'active',
        received_at       TIMESTAMP DEFAULT NOW(),
        created_at        TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_batch_expiry ON batch_management(expiry_date);
      CREATE INDEX IF NOT EXISTS idx_batch_product ON batch_management(product_id);

      CREATE TABLE IF NOT EXISTS stock_movements (
        id           SERIAL PRIMARY KEY,
        product_id   INT REFERENCES products(id) ON DELETE CASCADE,
        warehouse_id INT REFERENCES warehouses(id) ON DELETE SET NULL,
        type         VARCHAR(30) NOT NULL,
        quantity     INT NOT NULL,
        before_qty   INT,
        after_qty    INT,
        reference    VARCHAR(100),
        reason       VARCHAR(255),
        notes        TEXT,
        unit_cost    DECIMAL(10,2),
        created_by   INT REFERENCES users(id) ON DELETE SET NULL,
        created_at   TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);

      CREATE TABLE IF NOT EXISTS lost_items (
        id               SERIAL PRIMARY KEY,
        product_id       INT REFERENCES products(id) ON DELETE SET NULL,
        warehouse_id     INT REFERENCES warehouses(id) ON DELETE SET NULL,
        quantity         INT NOT NULL,
        reason           VARCHAR(100),
        estimated_value  DECIMAL(10,2),
        notes            TEXT,
        reported_by      INT REFERENCES users(id) ON DELETE SET NULL,
        approved_by      INT REFERENCES users(id) ON DELETE SET NULL,
        status           VARCHAR(20) DEFAULT 'pending',
        created_at       TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_id INT REFERENCES warehouses(id) ON DELETE SET NULL;
    `);
    inventoryTablesReady = true;
  } catch (err) {
    console.error("Error creating inventory tables:", err.message);
  }
}

router.use(protect);
router.use(async (req, res, next) => {
  await ensureInventoryTables();
  next();
});

// ── HELPER: log a stock movement and update product.stock atomically ────────
async function applyStockChange(client, { productId, warehouseId, type, delta, reference, reason, notes, unitCost, userId }) {
  const before = await client.query("SELECT stock FROM products WHERE id=$1 FOR UPDATE", [productId]);
  if (!before.rows.length) throw new Error("Product not found");

  const beforeQty = parseInt(before.rows[0].stock) || 0;
  const afterQty = beforeQty + delta;
  if (afterQty < 0) {
    const error = new Error(`Insufficient stock. Only ${beforeQty} available.`);
    error.status = 409;
    throw error;
  }

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
router.get("/", requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"), async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 20, search = "", category = "", stock_status = "" } = req.query;
    const limit = clampLimit(limitRaw, 20);
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
    if (stock_status === "low")   where.push("p.stock > 0 AND p.stock <= COALESCE(p.low_stock_threshold, 0)");
    if (stock_status === "ok")    where.push("p.stock > COALESCE(p.low_stock_threshold, 0)");

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
          WHEN p.stock = 0                                       THEN 'out_of_stock'
          WHEN p.stock <= COALESCE(p.low_stock_threshold, 0)     THEN 'low'
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
        COUNT(*) FILTER (WHERE stock > 0 AND stock <= COALESCE(low_stock_threshold, 0)) AS low_stock,
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
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// STOCK TRANSFER  ──  POST /api/admin/inventory/transfer
// ════════════════════════════════════════════════════════════════════════════
router.post(
  "/transfer",
  requireRole("superadmin", "manager", "admin", "storekeeper"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const { product_id, from_warehouse_id, to_warehouse_id, quantity, notes } = req.body;
      const qty = parseInt(quantity);
      
      if (!product_id || !from_warehouse_id || !to_warehouse_id || isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: "Invalid transfer parameters" });
      }
      if (Number(from_warehouse_id) === Number(to_warehouse_id)) {
        return res.status(400).json({ message: "Source and destination warehouses must be different" });
      }

      await client.query("BEGIN");

      // Lock the product row to ensure integrity and check global stock
      const prodRes = await client.query("SELECT stock, cost_price, unit_price FROM products WHERE id=$1 FOR UPDATE", [product_id]);
      if (!prodRes.rows.length) {
        throw new Error("Product not found");
      }
      
      const currentStock = parseInt(prodRes.rows[0].stock) || 0;
      if (currentStock < qty) {
        throw new Error(`Insufficient stock. Only ${currentStock} available.`);
      }

      const unitCost = prodRes.rows[0].cost_price || prodRes.rows[0].unit_price || 0;

      // 1. Insert transfer_out for source warehouse
      await client.query(
        `INSERT INTO stock_movements
           (product_id, warehouse_id, type, quantity, before_qty, after_qty, reference, notes, unit_cost, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
        [product_id, from_warehouse_id, 'transfer_out', qty, currentStock, currentStock, 'TRANSFER', notes || null, unitCost, req.user.id]
      );

      // 2. Insert transfer_in for destination warehouse
      await client.query(
        `INSERT INTO stock_movements
           (product_id, warehouse_id, type, quantity, before_qty, after_qty, reference, notes, unit_cost, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
        [product_id, to_warehouse_id, 'transfer_in', qty, currentStock, currentStock, 'TRANSFER', notes || null, unitCost, req.user.id]
      );

      // Note: global products.stock doesn't change during an internal transfer, so we don't UPDATE products.stock
      // We rely on the constraint \`check_stock_non_negative\` added in the schema for ultimate DB-level protection

      await client.query("COMMIT");
      res.json({ success: true, message: "Transfer completed successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.message.includes("Insufficient") || err.message.includes("not found")) {
        return res.status(400).json({ message: err.message });
      }
      next(err);
    } finally {
      client.release();
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// CARTON BREAKDOWN / DE-BULKING  ──  POST /api/admin/inventory/debulk
// Unbundles whole cartons/crates into individual shelf pieces
// ════════════════════════════════════════════════════════════════════════════
router.post(
  "/debulk",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const {
        source_product_id,
        target_product_id,
        cartons_to_break,
        pieces_per_carton,
        warehouse_id,
        notes,
      } = req.body;

      const cartonsCount = parseInt(cartons_to_break);
      const multiplier = parseFloat(pieces_per_carton);

      if (!source_product_id || !target_product_id || isNaN(cartonsCount) || cartonsCount <= 0 || isNaN(multiplier) || multiplier <= 0) {
        return res.status(400).json({ message: "Invalid breakdown parameters. Please specify source, target, cartons count, and pieces per carton." });
      }

      await client.query("BEGIN");

      // 1. Lock and check source (Carton) product stock
      const srcRes = await client.query(
        "SELECT id, name, stock, stock_quantity, cost_price, unit_price FROM products WHERE id=$1 FOR UPDATE",
        [source_product_id]
      );
      if (!srcRes.rows.length) throw new Error("Source carton product not found");
      const src = srcRes.rows[0];
      const srcBefore = parseInt(src.stock ?? src.stock_quantity ?? 0);
      if (srcBefore < cartonsCount) {
        throw new Error(`Insufficient carton stock. Only ${srcBefore} carton(s) available in inventory.`);
      }

      // 2. Lock target (Pieces) product stock
      const tgtRes = await client.query(
        "SELECT id, name, stock, stock_quantity, cost_price, unit_price FROM products WHERE id=$1 FOR UPDATE",
        [target_product_id]
      );
      if (!tgtRes.rows.length) throw new Error("Target pieces product not found");
      const tgt = tgtRes.rows[0];
      const tgtBefore = parseInt(tgt.stock ?? tgt.stock_quantity ?? 0);

      const piecesGained = Math.round(cartonsCount * multiplier);
      const srcAfter = srcBefore - cartonsCount;
      const tgtAfter = tgtBefore + piecesGained;

      // 3. Update source stock (-Cartons)
      await client.query(
        "UPDATE products SET stock=$1, stock_quantity=$1, updated_at=NOW() WHERE id=$2",
        [srcAfter, source_product_id]
      );

      // 4. Update target stock (+Pieces)
      await client.query(
        "UPDATE products SET stock=$1, stock_quantity=$1, updated_at=NOW() WHERE id=$2",
        [tgtAfter, target_product_id]
      );

      // 5. Record stock movements
      const ref = `DEBULK-${Date.now().toString().slice(-6)}`;
      const noteStr = notes 
        ? `${notes} (Unbundled ${cartonsCount}x "${src.name}" into ${piecesGained}x "${tgt.name}")` 
        : `Unbundled ${cartonsCount}x "${src.name}" into ${piecesGained}x "${tgt.name}"`;

      await client.query(
        `INSERT INTO stock_movements (product_id, warehouse_id, type, quantity, before_qty, after_qty, reference, notes, unit_cost, created_by, created_at)
         VALUES ($1,$2,'debulk_out',$3,$4,$5,$6,$7,$8,$9,NOW())`,
        [source_product_id, warehouse_id || null, cartonsCount, srcBefore, srcAfter, ref, noteStr, src.cost_price || src.unit_price || 0, req.user.id]
      );

      await client.query(
        `INSERT INTO stock_movements (product_id, warehouse_id, type, quantity, before_qty, after_qty, reference, notes, unit_cost, created_by, created_at)
         VALUES ($1,$2,'debulk_in',$3,$4,$5,$6,$7,$8,$9,NOW())`,
        [target_product_id, warehouse_id || null, piecesGained, tgtBefore, tgtAfter, ref, noteStr, (src.cost_price ? src.cost_price / multiplier : tgt.cost_price || tgt.unit_price || 0), req.user.id]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: `Successfully unbundled ${cartonsCount} carton(s) into ${piecesGained} piece(s).`,
        source: { id: source_product_id, name: src.name, before: srcBefore, after: srcAfter, deducted: cartonsCount },
        target: { id: target_product_id, name: tgt.name, before: tgtBefore, after: tgtAfter, added: piecesGained },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: err.message || "Failed to execute carton breakdown" });
    } finally {
      client.release();
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// STOCK ALERTS  ──  GET /api/admin/inventory/alerts
// ════════════════════════════════════════════════════════════════════════════
router.get("/alerts", requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"), async (req, res, next) => {
  try {
    const [lowStock, outOfStock, expiringSoon, expiringBatches] = await Promise.all([
      pool.query(`
        SELECT p.id, p.name, p.sku, p.stock, p.low_stock_threshold,
               cat.name AS category, p.image_url
        FROM products p
        LEFT JOIN categories cat ON p.category_id = cat.id
        WHERE p.stock > 0 AND p.stock <= COALESCE(p.low_stock_threshold, 0)
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
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// STOCK VALUATION  ──  GET /api/admin/inventory/valuation
// ════════════════════════════════════════════════════════════════════════════
router.get("/valuation", requireRole("superadmin", "manager", "admin", "accountant", "storekeeper", "kitchen_staff"), async (req, res, next) => {
  try {
    const [totalValue, byCategory, products, movements30d] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_skus,
          COALESCE(SUM(stock * COALESCE(cost_price, 0)), 0) AS cost_value,
          COALESCE(SUM(stock * COALESCE(unit_price, price, 0)), 0)             AS retail_value,
          COALESCE(SUM(stock), 0) AS total_units
        FROM products WHERE status = 'active'
      `),

      pool.query(`
        SELECT
          cat.name AS category,
          COUNT(p.id) AS skus,
          SUM(p.stock) AS total_units,
          COALESCE(SUM(p.stock * COALESCE(p.cost_price, 0)), 0) AS cost_value,
          COALESCE(SUM(p.stock * COALESCE(p.unit_price, p.price, 0)), 0)               AS retail_value
        FROM products p
        JOIN categories cat ON p.category_id = cat.id
        WHERE p.status = 'active'
        GROUP BY cat.name
        ORDER BY retail_value DESC
      `),

      pool.query(`
        SELECT
          p.id, p.name, p.sku, p.barcode, p.image_url, p.stock, p.unit, cat.name AS category,
          COALESCE(p.low_stock_threshold, p.reorder_level, 5) AS low_stock_threshold,
          COALESCE(p.unit_price, p.price, 0) AS unit_price,
          COALESCE(p.cost_price, 0)          AS cost_price,
          p.stock * COALESCE(p.cost_price, 0) AS cost_value,
          p.stock * COALESCE(p.unit_price, p.price, 0) AS retail_value,
          p.stock * (COALESCE(p.unit_price, p.price, 0) - COALESCE(p.cost_price, 0)) AS potential_profit,
          CASE WHEN COALESCE(p.unit_price, p.price, 0) > 0
            THEN ROUND(((COALESCE(p.unit_price, p.price, 0) - COALESCE(p.cost_price, 0)) /
              COALESCE(p.unit_price, p.price, 0)) * 100, 2)
            ELSE 0 END AS margin_pct
        FROM products p
        LEFT JOIN categories cat ON cat.id = p.category_id
        WHERE p.status = 'active'
        ORDER BY retail_value DESC
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
      products: products.rows,
      top_value_items: products.rows.slice(0, 10),
      movements_30d: movements30d.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MOVEMENT HISTORY  ──  GET /api/admin/inventory/movements
// ════════════════════════════════════════════════════════════════════════════
router.get("/movements", requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"), async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 20, product_id = "", type = "", from = "", to = "", search = "" } = req.query;
    const limit = clampLimit(limitRaw, 20);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = [];

    if (product_id) { params.push(parseInt(product_id)); where.push(`sm.product_id = $${params.length}`); }
    if (type) {
      if (type === "transfer") {
        where.push(`sm.type IN ('transfer_in', 'transfer_out')`);
      } else {
        params.push(type);
        where.push(`sm.type = $${params.length}`);
      }
    }
    if (from)       { params.push(from); where.push(`sm.created_at >= $${params.length}`); }
    if (to)         { params.push(to);   where.push(`sm.created_at <= $${params.length} + INTERVAL '1 day'`); }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR sm.reference ILIKE $${params.length})`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM stock_movements sm LEFT JOIN products p ON sm.product_id = p.id ${whereClause}`,
      params
    );
    const total    = parseInt(countRes.rows[0].count);

    // Real added/deducted totals across every matching row, not just the
    // current page — before_qty/after_qty (not quantity, which is always
    // stored as a positive magnitude) is what actually encodes direction.
    const statsRes = await pool.query(
      `SELECT
         COALESCE(SUM(GREATEST(sm.after_qty - sm.before_qty, 0)), 0) AS added,
         COALESCE(SUM(GREATEST(sm.before_qty - sm.after_qty, 0)), 0) AS deducted
       FROM stock_movements sm LEFT JOIN products p ON sm.product_id = p.id ${whereClause}`,
      params
    );

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
      stats: {
        added: parseInt(statsRes.rows[0].added),
        deducted: parseInt(statsRes.rows[0].deducted),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// STOCK IN / RECEIVING  ──  POST /api/admin/inventory/stock-in
// ════════════════════════════════════════════════════════════════════════════
router.post(
  "/stock-in",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const {
        product_id,
        warehouse_id,
        quantity,
        unit_cost,
        supplier,
        supplier_id,
        reference,
        notes,
        batch_no,
        expiry_date,
      } = req.body;

      const qty = parseInt(quantity);
      if (!product_id || isNaN(qty) || qty <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Valid product_id and quantity (> 0) required" });
      }

      const prodRes = await client.query(
        "SELECT id, name, sku, stock, cost_price, unit_price FROM products WHERE id = $1 FOR UPDATE",
        [parseInt(product_id)]
      );
      if (!prodRes.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Product not found" });
      }

      const prod = prodRes.rows[0];
      const cost = unit_cost !== undefined && unit_cost !== null && !isNaN(parseFloat(unit_cost))
        ? parseFloat(unit_cost)
        : parseFloat(prod.cost_price || 0);

      const ref = reference?.trim() || `SI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const stockChange = await applyStockChange(client, {
        productId: parseInt(product_id),
        warehouseId: warehouse_id ? parseInt(warehouse_id) : null,
        type: "stock_in",
        delta: qty,
        reference: ref,
        reason: supplier ? `Intake from ${supplier}` : "Direct Stock In / Harvest Intake",
        notes: notes || null,
        unitCost: cost,
        userId: req.user.id,
      });

      let createdBatch = null;
      if (batch_no?.trim()) {
        const batchRes = await client.query(
          `INSERT INTO batch_management
             (product_id, warehouse_id, batch_no, quantity, cost_price, expiry_date, supplier_id, notes, received_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING *`,
          [
            parseInt(product_id),
            warehouse_id ? parseInt(warehouse_id) : null,
            batch_no.trim(),
            qty,
            cost,
            expiry_date || null,
            supplier_id ? parseInt(supplier_id) : null,
            notes || null,
          ]
        );
        createdBatch = batchRes.rows[0];
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: `Stock received: +${qty} units for "${prod.name}"`,
        movement_id: stockChange.movement_id,
        before_qty: stockChange.before_qty,
        after_qty: stockChange.after_qty,
        batch: createdBatch,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// STOCK OUT / DISPATCH  ──  POST /api/admin/inventory/stock-out
// ════════════════════════════════════════════════════════════════════════════
router.post(
  "/stock-out",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { product_id, warehouse_id, quantity, reason, reference, notes } = req.body;

      const qty = parseInt(quantity);
      if (!product_id || isNaN(qty) || qty <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Valid product_id and quantity (> 0) required" });
      }

      const prodRes = await client.query(
        "SELECT id, name, sku, stock, cost_price, unit_price FROM products WHERE id = $1 FOR UPDATE",
        [parseInt(product_id)]
      );
      if (!prodRes.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Product not found" });
      }

      const prod = prodRes.rows[0];
      const currentStock = parseInt(prod.stock) || 0;
      if (currentStock < qty) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Insufficient stock. Only ${currentStock} available.` });
      }

      const ref = reference?.trim() || `SO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const cost = parseFloat(prod.cost_price || prod.unit_price || 0);

      const stockChange = await applyStockChange(client, {
        productId: parseInt(product_id),
        warehouseId: warehouse_id ? parseInt(warehouse_id) : null,
        type: "stock_out",
        delta: -qty,
        reference: ref,
        reason: reason || "Dispatch",
        notes: notes || null,
        unitCost: cost,
        userId: req.user.id,
      });

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: `Stock dispatched: -${qty} units for "${prod.name}"`,
        movement_id: stockChange.movement_id,
        before_qty: stockChange.before_qty,
        after_qty: stockChange.after_qty,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// STOCK ADJUSTMENT  ──  POST /api/admin/inventory/adjust
// ════════════════════════════════════════════════════════════════════════════
router.post(
  "/adjust",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { product_id, warehouse_id, new_quantity, reason, notes } = req.body;

      if (!product_id) { await client.query("ROLLBACK"); return res.status(400).json({ message: "product_id required" }); }
      if (new_quantity === undefined || new_quantity === null) { await client.query("ROLLBACK"); return res.status(400).json({ message: "new_quantity required" }); }
      if (!reason) { await client.query("ROLLBACK"); return res.status(400).json({ message: "reason required for stock adjustments" }); }
      if (isNaN(parseInt(new_quantity))) { await client.query("ROLLBACK"); return res.status(400).json({ message: "new_quantity must be a number" }); }

      const cur = await client.query("SELECT stock FROM products WHERE id=$1 FOR UPDATE", [parseInt(product_id)]);
      if (!cur.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Product not found" }); }

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
      next(err);
    } finally {
      client.release();
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// WAREHOUSES
// ════════════════════════════════════════════════════════════════════════════
router.get("/warehouses", requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"), async (req, res, next) => {
  try {
    const rows = await pool.query(`
      SELECT
        w.*,
        COUNT(DISTINCT p.id) AS product_count,
        COALESCE(SUM(p.stock), 0) AS total_units,
        COALESCE(SUM(p.stock * COALESCE(p.unit_price, p.price, 0)), 0) AS total_value
      FROM warehouses w
      LEFT JOIN products p ON p.warehouse_id = w.id AND p.status != 'archived'
      GROUP BY w.id
      ORDER BY w.id ASC
    `);
    res.json({ warehouses: rows.rows });
  } catch (err) {
    next(err);
  }
});

router.get("/warehouses/:id/products", requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"), async (req, res, next) => {
  try {
    const products = await pool.query(`
      SELECT
        p.id, p.name, p.sku, p.barcode, p.image_url,
        p.stock, p.low_stock_threshold,
        COALESCE(p.unit_price, p.price, 0) AS unit_price,
        COALESCE(p.cost_price, 0) AS cost_price,
        p.status,
        c.name AS category
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.warehouse_id = $1 AND p.status != 'archived'
      ORDER BY p.name ASC
    `, [req.params.id]);

    const recentMovements = await pool.query(`
      SELECT
        sm.id, sm.type, sm.quantity, sm.before_qty, sm.after_qty, sm.reason, sm.reference, sm.created_at,
        p.name AS product_name, p.sku,
        u.name AS created_by_name
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.product_id
      LEFT JOIN users u ON u.id = sm.created_by
      WHERE sm.warehouse_id = $1
      ORDER BY sm.created_at DESC
      LIMIT 10
    `, [req.params.id]);

    res.json({
      products: products.rows,
      recent_movements: recentMovements.rows,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/warehouses", requireRole("superadmin", "manager", "admin", "kitchen_staff"), async (req, res, next) => {
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
    next(err);
  }
});

router.patch("/warehouses/:id", requireRole("superadmin", "manager", "admin", "kitchen_staff"), async (req, res, next) => {
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
    next(err);
  }
});

router.delete("/warehouses/:id", requireRole("superadmin"), async (req, res, next) => {
  try {
    await pool.query("UPDATE warehouses SET status='inactive', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json({ message: "Warehouse deactivated" });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// BATCH MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════
router.get("/batches", requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"), async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 20, product_id = "", status = "", expiring = "" } = req.query;
    const limit = clampLimit(limitRaw, 20);
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
        (b.expiry_date - CURRENT_DATE) AS days_until_expiry
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
    next(err);
  }
});

router.post("/batches", requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"), async (req, res, next) => {
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
    next(err);
  }
});

router.patch("/batches/:id", requireRole("superadmin", "manager", "admin", "kitchen_staff"), async (req, res, next) => {
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
    next(err);
  }
});

router.post("/batches/auto-populate", requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"), async (req, res, next) => {
  try {
    const productsRes = await pool.query(`
      SELECT p.id, p.name, p.sku, p.stock, p.stock_quantity, p.cost_price, p.expiry_date, p.created_at
      FROM products p
      WHERE (p.stock > 0 OR p.stock_quantity > 0 OR p.expiry_date IS NOT NULL)
        AND NOT EXISTS (SELECT 1 FROM batch_management b WHERE b.product_id = p.id)
    `);

    let createdCount = 0;
    for (const p of productsRes.rows) {
      const stockQty = parseInt(p.stock || p.stock_quantity || 0);
      const batchNo = `LOT-${new Date(p.created_at || Date.now()).toISOString().slice(0, 10).replace(/-/g, "")}-${p.id}`;
      const defaultExp = p.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      await pool.query(
        `INSERT INTO batch_management
           (product_id, batch_no, quantity, cost_price, expiry_date, status, received_at, created_at)
         VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [p.id, batchNo, stockQty, p.cost_price ? parseFloat(p.cost_price) : null, defaultExp]
      );
      createdCount++;
    }

    res.json({ message: `Successfully initialized ${createdCount} batches for current in-stock products.`, count: createdCount });
  } catch (err) {
    next(err);
  }
});

router.post("/batches/bulk-import", requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"), async (req, res, next) => {
  try {
    const { rows = [] } = req.body;
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ message: "No batch rows provided for import" });
    }

    // Cache products and warehouses
    const prodRes = await pool.query("SELECT id, name, sku, barcode, stock FROM products WHERE status != 'archived'");
    const prodMap = new Map();
    prodRes.rows.forEach(p => {
      prodMap.set(String(p.id), p);
      if (p.sku) prodMap.set(p.sku.toLowerCase().trim(), p);
      if (p.barcode) prodMap.set(p.barcode.toLowerCase().trim(), p);
      if (p.name) prodMap.set(p.name.toLowerCase().trim(), p);
    });

    const whRes = await pool.query("SELECT id, name, code FROM warehouses WHERE status = 'active'");
    const whMap = new Map();
    whRes.rows.forEach(w => {
      whMap.set(String(w.id), w.id);
      if (w.name) whMap.set(w.name.toLowerCase().trim(), w.id);
      if (w.code) whMap.set(w.code.toLowerCase().trim(), w.id);
    });

    let imported = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const prodIdentifier = String(row.product_id || row.sku || row.barcode || row.product_name || row.product || "").trim().toLowerCase();
        if (!prodIdentifier) throw new Error("Product identifier (name, SKU, or ID) is required");

        const product = prodMap.get(prodIdentifier);
        if (!product) throw new Error(`Product "${prodIdentifier}" not found in catalog`);

        let warehouseId = null;
        const whInput = String(row.warehouse_id || row.warehouse_name || row.warehouse || "").trim().toLowerCase();
        if (whInput && whMap.has(whInput)) {
          warehouseId = whMap.get(whInput);
        } else if (whRes.rows.length > 0) {
          warehouseId = whRes.rows[0].id;
        }

        const rawQty = String(row.quantity ?? row.qty ?? row.count ?? 0).replace(/[^0-9]/g, "");
        const quantity = rawQty ? parseInt(rawQty, 10) : 0;

        const rawCost = row.cost_price ? String(row.cost_price).replace(/[^0-9.]/g, "") : null;
        const costPrice = rawCost && !isNaN(parseFloat(rawCost)) ? parseFloat(rawCost) : null;

        const expiryDate = row.expiry_date?.trim() || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const mfgDate = row.manufactured_date?.trim() || row.mfg_date?.trim() || new Date().toISOString().slice(0, 10);
        const batchNo = row.batch_no?.trim() || `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${product.id}-${Date.now().toString().slice(-4)}`;
        const notes = row.notes?.trim() || "Bulk batch import";

        await pool.query(
          `INSERT INTO batch_management
             (product_id, warehouse_id, batch_no, quantity, cost_price, expiry_date, manufactured_date, notes, status, received_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW(), NOW())`,
          [product.id, warehouseId, batchNo, quantity, costPrice, expiryDate, mfgDate, notes]
        );

        // Also ensure product stock reflects newly imported batch if positive
        if (quantity > 0) {
          await pool.query(
            `UPDATE products SET stock = stock + $1, stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2`,
            [quantity, product.id]
          );
        }

        imported++;
      } catch (err) {
        errors.push({ row: rowNum, error: err.message });
      }
    }

    res.json({
      message: `Bulk import completed: ${imported} batches created.`,
      imported,
      errors,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/batches/:id", requireRole("superadmin", "manager"), async (req, res, next) => {
  try {
    await pool.query("UPDATE batch_management SET status='recalled' WHERE id=$1", [req.params.id]);
    res.json({ message: "Batch recalled" });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// LOST / DAMAGED ITEMS
// ════════════════════════════════════════════════════════════════════════════
router.get("/lost-items", requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"), async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 20, status = "", search = "" } = req.query;
    const limit = clampLimit(limitRaw, 20);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where  = [];
    const params = [];
    if (status) { params.push(status); where.push(`li.status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(p.name ILIKE $${params.length} OR li.reason ILIKE $${params.length} OR li.id::text ILIKE $${params.length})`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(
      `SELECT COUNT(*) FROM lost_items li LEFT JOIN products p ON li.product_id = p.id ${whereClause}`,
      params
    );

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        li.id, li.quantity, li.reason, li.estimated_value,
        li.notes, li.status, li.created_at,
        p.name AS product_name, p.sku, c.name AS category_name,
        w.name AS warehouse_name,
        r.name AS reported_by_name,
        a.name AS approved_by_name
      FROM lost_items li
      LEFT JOIN products   p ON li.product_id   = p.id
      LEFT JOIN categories c ON p.category_id    = c.id
      LEFT JOIN warehouses w ON li.warehouse_id  = w.id
      LEFT JOIN users      r ON li.reported_by   = r.id
      LEFT JOIN users      a ON li.approved_by   = a.id
      ${whereClause}
      ORDER BY li.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ items: rows.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/lost-items",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { product_id, warehouse_id, quantity, reason, notes, deduct_stock = true } = req.body;

      if (!product_id) { await client.query("ROLLBACK"); return res.status(400).json({ message: "product_id required" }); }
      if (!quantity || parseInt(quantity) <= 0) { await client.query("ROLLBACK"); return res.status(400).json({ message: "quantity must be > 0" }); }

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
      next(err);
    } finally {
      client.release();
    }
  }
);

// ── PATCH /api/admin/inventory/lost-items/:id ───────────────────────────
// Corrects a report's own fields (reason/notes/quantity/warehouse) — does
// NOT touch stock, since the original stock deduction already happened at
// creation and adjusting it here would require reconciling a second delta.
// Only allowed while the report is still 'pending': once approved/rejected
// it's part of the audit trail, same reasoning as blocking delete on an
// already-refunded return elsewhere in this codebase.
router.patch(
  "/lost-items/:id",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const existing = await pool.query("SELECT status, product_id FROM lost_items WHERE id=$1", [req.params.id]);
      if (!existing.rows.length) {
        return res.status(404).json({ message: "Report not found" });
      }
      if (existing.rows[0].status !== "pending") {
        return res.status(400).json({ message: "Only a pending report can be edited — this one has already been reviewed." });
      }

      const { warehouse_id, quantity, reason, notes } = req.body;
      if (quantity !== undefined && (!quantity || parseInt(quantity) <= 0)) {
        return res.status(400).json({ message: "quantity must be > 0" });
      }

      let estimated_value;
      if (quantity !== undefined) {
        const prod = await pool.query("SELECT unit_price, price FROM products WHERE id=$1", [existing.rows[0].product_id]);
        const unitValue = parseFloat(prod.rows[0]?.unit_price || prod.rows[0]?.price || 0);
        estimated_value = unitValue * parseInt(quantity);
      }

      await pool.query(
        `UPDATE lost_items SET
           warehouse_id     = COALESCE($1, warehouse_id),
           quantity         = COALESCE($2, quantity),
           reason           = COALESCE($3, reason),
           notes            = COALESCE($4, notes),
           estimated_value  = COALESCE($5, estimated_value)
         WHERE id = $6`,
        [
          warehouse_id ? parseInt(warehouse_id) : null,
          quantity !== undefined ? parseInt(quantity) : null,
          reason || null,
          notes || null,
          estimated_value !== undefined ? estimated_value : null,
          req.params.id,
        ]
      );

      res.json({ message: "Report updated" });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/lost-items/:id/approve",
  requireRole("superadmin", "manager"),
  async (req, res, next) => {
    try {
      const { action } = req.body; // "approve" | "reject"
      const status = action === "approve" ? "approved" : "rejected";
      await pool.query(
        "UPDATE lost_items SET status=$1, approved_by=$2 WHERE id=$3",
        [status, req.user.id, req.params.id]
      );
      res.json({ message: `Lost item ${status}` });
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/admin/inventory/products/:id/reorder ───────────────
router.patch(
  "/products/:id/reorder",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
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
      next(err);
    }
  }
);

// ── GET /api/admin/inventory/alerts/check ──────────────────────────────
router.get(
  "/alerts/check",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    try {
      // 1. Get low stock products
      const lowStockRes = await pool.query(
        `SELECT id, name, sku, stock, low_stock_threshold
         FROM products
         WHERE stock > 0 AND stock <= low_stock_threshold AND status = 'active'
         ORDER BY stock ASC`
      );

      const items = lowStockRes.rows;

      // 2. Fetch configurations
      const configRes = await pool.query(
        `SELECT key, value FROM settings WHERE key IN ('notif_low_stock', 'store_email', 'notif_email_enabled')`
      );

      const settings = {};
      configRes.rows.forEach(r => { settings[r.key] = r.value; });

      const notifLowStock = settings['notif_low_stock'] === 'true';
      const emailEnabled = settings['notif_email_enabled'] !== 'false';
      const storeEmail = settings['store_email'] || 'info@bemsfarms.com';

      let notified = false;
      let emailResult = null;

      if (items.length > 0 && notifLowStock && emailEnabled) {
        const { sendLowStockAlertEmail } = require("../services/emailService");
        emailResult = await sendLowStockAlertEmail(storeEmail, items);
        notified = true;
      }

      res.json({
        success: true,
        checked_at: new Date(),
        low_stock_count: items.length,
        notified,
        email_sent_to: notified ? storeEmail : null,
        email_result: emailResult,
        items,
        config: {
          notif_low_stock: notifLowStock,
          notif_email_enabled: emailEnabled,
          store_email: storeEmail
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/admin/inventory/lost-items/:id ─────────────────────────
router.delete(
  "/lost-items/:id",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      await pool.query("DELETE FROM lost_items WHERE id = $1", [req.params.id]);
      res.json({ success: true, message: "Lost item report deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE & RESTOCK CALENDAR SCHEDULER
// ════════════════════════════════════════════════════════════════════════════

let scheduledTableReady = false;
async function ensureScheduledPurchasesTable() {
  if (scheduledTableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_purchases (
      id                 SERIAL PRIMARY KEY,
      product_id         INT REFERENCES products(id) ON DELETE SET NULL,
      product_name       VARCHAR(255) NOT NULL,
      expected_date      DATE NOT NULL,
      quantity           INT NOT NULL,
      unit               VARCHAR(50) DEFAULT 'pcs',
      estimated_cost     DECIMAL(12,2) DEFAULT 0,
      supplier_name      VARCHAR(255),
      supplier_id        INT,
      notes              TEXT,
      status             VARCHAR(30) DEFAULT 'scheduled',
      received_date      DATE,
      received_quantity  INT,
      created_by         INT REFERENCES users(id) ON DELETE SET NULL,
      created_at         TIMESTAMP DEFAULT NOW(),
      updated_at         TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_scheduled_purchases_date ON scheduled_purchases(expected_date);
    CREATE INDEX IF NOT EXISTS idx_scheduled_purchases_status ON scheduled_purchases(status);
  `);
  scheduledTableReady = true;
}

// ── GET /api/admin/inventory/schedules ──────────────────────────────
router.get(
  "/schedules",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    try {
      await ensureScheduledPurchasesTable();
      const { start_date, end_date, month, status, search } = req.query;
      const params = [];
      const where = [];

      if (start_date && end_date) {
        params.push(start_date);
        params.push(end_date);
        where.push(`sp.expected_date BETWEEN $${params.length - 1} AND $${params.length}`);
      } else if (month) {
        params.push(`${month}%`);
        where.push(`TO_CHAR(sp.expected_date, 'YYYY-MM') LIKE $${params.length}`);
      }

      if (status && status !== "all") {
        if (status === "overdue") {
          where.push(`sp.status = 'scheduled' AND sp.expected_date < CURRENT_DATE`);
        } else {
          params.push(status);
          where.push(`sp.status = $${params.length}`);
        }
      }

      if (search) {
        params.push(`%${search}%`);
        where.push(`(sp.product_name ILIKE $${params.length} OR sp.supplier_name ILIKE $${params.length} OR sp.notes ILIKE $${params.length})`);
      }

      const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

      const query = `
        SELECT
          sp.*,
          TO_CHAR(sp.expected_date, 'YYYY-MM-DD') AS expected_date_str,
          TO_CHAR(sp.received_date, 'YYYY-MM-DD') AS received_date_str,
          p.sku AS product_sku,
          p.stock AS current_stock,
          p.low_stock_threshold,
          p.price AS current_price,
          p.cost_price AS current_cost_price,
          p.image_url AS product_image,
          u.name AS created_by_name,
          CASE 
            WHEN sp.status = 'scheduled' AND sp.expected_date < CURRENT_DATE THEN 'overdue'
            ELSE sp.status
          END AS computed_status
        FROM scheduled_purchases sp
        LEFT JOIN products p ON sp.product_id = p.id
        LEFT JOIN users u ON sp.created_by = u.id
        ${whereClause}
        ORDER BY sp.expected_date ASC, sp.id ASC
      `;

      const result = await pool.query(query, params);
      res.json({ schedules: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/admin/inventory/schedules/:id ──────────────────────────
router.get(
  "/schedules/:id",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    try {
      await ensureScheduledPurchasesTable();
      const result = await pool.query(
        `SELECT sp.*, p.sku AS product_sku, p.stock AS current_stock, p.image_url AS product_image
         FROM scheduled_purchases sp
         LEFT JOIN products p ON sp.product_id = p.id
         WHERE sp.id = $1`,
        [req.params.id]
      );
      if (!result.rows.length) return res.status(404).json({ message: "Schedule not found" });
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/admin/inventory/schedules ─────────────────────────────
router.post(
  "/schedules",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    try {
      await ensureScheduledPurchasesTable();
      const {
        product_id,
        product_name,
        expected_date,
        quantity,
        unit = "pcs",
        estimated_cost = 0,
        supplier_name,
        supplier_id,
        notes,
      } = req.body;

      if (!expected_date) {
        return res.status(400).json({ message: "Expected date is required" });
      }
      if (!quantity || Number(quantity) <= 0) {
        return res.status(400).json({ message: "Quantity must be greater than 0" });
      }

      let resolvedName = product_name;
      if (product_id && !resolvedName) {
        const prod = await pool.query("SELECT name FROM products WHERE id = $1", [product_id]);
        if (prod.rows.length) resolvedName = prod.rows[0].name;
      }
      if (!resolvedName) {
        return res.status(400).json({ message: "Product name or product selection is required" });
      }

      const result = await pool.query(
        `INSERT INTO scheduled_purchases
           (product_id, product_name, expected_date, quantity, unit, estimated_cost, supplier_name, supplier_id, notes, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', $10)
         RETURNING *`,
        [
          product_id ? parseInt(product_id) : null,
          resolvedName.trim(),
          expected_date,
          parseInt(quantity),
          unit || "pcs",
          parseFloat(estimated_cost) || 0,
          supplier_name ? supplier_name.trim() : null,
          supplier_id ? parseInt(supplier_id) : null,
          notes ? notes.trim() : null,
          req.user?.id || null,
        ]
      );

      res.status(201).json({
        message: "Purchase scheduled successfully",
        schedule: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/admin/inventory/schedules/:id ────────────────────────
router.patch(
  "/schedules/:id",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    try {
      await ensureScheduledPurchasesTable();
      const {
        product_id,
        product_name,
        expected_date,
        quantity,
        unit,
        estimated_cost,
        supplier_name,
        notes,
        status,
      } = req.body;

      const existing = await pool.query("SELECT * FROM scheduled_purchases WHERE id = $1", [req.params.id]);
      if (!existing.rows.length) return res.status(404).json({ message: "Schedule not found" });

      const prev = existing.rows[0];

      const result = await pool.query(
        `UPDATE scheduled_purchases SET
           product_id     = COALESCE($1, product_id),
           product_name   = COALESCE($2, product_name),
           expected_date  = COALESCE($3, expected_date),
           quantity       = COALESCE($4, quantity),
           unit           = COALESCE($5, unit),
           estimated_cost = COALESCE($6, estimated_cost),
           supplier_name  = COALESCE($7, supplier_name),
           notes          = COALESCE($8, notes),
           status         = COALESCE($9, status),
           updated_at     = NOW()
         WHERE id = $10
         RETURNING *`,
        [
          product_id !== undefined ? (product_id ? parseInt(product_id) : null) : prev.product_id,
          product_name !== undefined ? product_name.trim() : prev.product_name,
          expected_date !== undefined ? expected_date : prev.expected_date,
          quantity !== undefined ? parseInt(quantity) : prev.quantity,
          unit !== undefined ? unit : prev.unit,
          estimated_cost !== undefined ? parseFloat(estimated_cost) : prev.estimated_cost,
          supplier_name !== undefined ? supplier_name : prev.supplier_name,
          notes !== undefined ? notes : prev.notes,
          status !== undefined ? status : prev.status,
          req.params.id,
        ]
      );

      res.json({ message: "Schedule updated", schedule: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/admin/inventory/schedules/:id/receive ─────────────────
// Marks scheduled purchase as received and updates inventory stock atomically
router.post(
  "/schedules/:id/receive",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await ensureScheduledPurchasesTable();
      await client.query("BEGIN");

      const check = await client.query("SELECT * FROM scheduled_purchases WHERE id = $1 FOR UPDATE", [req.params.id]);
      if (!check.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Schedule not found" });
      }

      const sch = check.rows[0];
      if (sch.status === "received") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "This purchase has already been received and stocked in." });
      }

      const receivedQty = parseInt(req.body.received_quantity || sch.quantity);
      const receivedDate = req.body.received_date || new Date().toISOString().split("T")[0];
      const warehouseId = req.body.warehouse_id ? parseInt(req.body.warehouse_id) : null;
      const unitCost = sch.estimated_cost && receivedQty > 0 ? (sch.estimated_cost / receivedQty) : null;

      let stockResult = null;
      if (sch.product_id) {
        stockResult = await applyStockChange(client, {
          productId: sch.product_id,
          warehouseId,
          type: "stock_in",
          delta: receivedQty,
          reference: `SCH-${sch.id}`,
          reason: `Scheduled purchase restock (${sch.supplier_name || "Supplier"})`,
          notes: sch.notes || `Stocked in from Restock Calendar schedule #${sch.id}`,
          unitCost,
          userId: req.user?.id,
        });
      }

      const updated = await client.query(
        `UPDATE scheduled_purchases SET
           status            = 'received',
           received_date     = $1,
           received_quantity = $2,
           updated_at        = NOW()
         WHERE id = $3
         RETURNING *`,
        [receivedDate, receivedQty, sch.id]
      );

      await client.query("COMMIT");

      res.json({
        message: `Successfully received ${receivedQty} ${sch.unit || 'units'} and updated inventory.`,
        schedule: updated.rows[0],
        stock: stockResult,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  }
);

// ── DELETE /api/admin/inventory/schedules/:id ───────────────────────
router.delete(
  "/schedules/:id",
  requireRole("superadmin", "manager", "admin", "storekeeper", "kitchen_staff"),
  async (req, res, next) => {
    try {
      await ensureScheduledPurchasesTable();
      await pool.query("DELETE FROM scheduled_purchases WHERE id = $1", [req.params.id]);
      res.json({ success: true, message: "Scheduled purchase deleted" });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
