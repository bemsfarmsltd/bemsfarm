// server/src/routes/products_admin.js
// ─────────────────────────────────────────────────────────────────
// Admin product management routes
// Mounted at /api/admin/products in index.js
// ─────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { clampLimit } = require("../utils/pagination");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { trackActivity } = require("../utils/aiContext");

router.use(protect);

// ── SCHEMA MIGRATION ─────────────────────────────────────────────
let packagingSchemaEnsured = false;
async function ensurePackagingTables() {
  if (packagingSchemaEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_packaging_units (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        unit_name VARCHAR(100) NOT NULL,
        multiplier NUMERIC(10,2) NOT NULL DEFAULT 1,
        price NUMERIC(12,2) NOT NULL DEFAULT 0,
        cost_price NUMERIC(12,2),
        barcode VARCHAR(100),
        sku VARCHAR(100),
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pkg_units_prod ON product_packaging_units(product_id);
      CREATE INDEX IF NOT EXISTS idx_pkg_units_barcode ON product_packaging_units(barcode);
    `);
    packagingSchemaEnsured = true;
  } catch (err) {
    console.warn("ensurePackagingTables warning:", err.message);
  }
}
ensurePackagingTables();

router.use(async (req, res, next) => {
  await ensurePackagingTables();
  next();
});

// ── HELPERS ──────────────────────────────────────────────────────
function calculateEan13Checksum(code12) {
  const digits = String(code12).padStart(12, "0").split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += i % 2 === 0 ? digits[i] : digits[i] * 3;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

async function generateUniqueBarcode(clientOrPool, categoryId) {
  const catPad = String(categoryId || 1).padStart(3, "0").slice(-3);
  for (let i = 0; i < 20; i++) {
    const rand = String(Math.floor(100000 + Math.random() * 900000));
    const code12 = `615${catPad}${rand}`;
    const check = calculateEan13Checksum(code12);
    const candidate = `${code12}${check}`;
    const dup = await clientOrPool.query(
      "SELECT id FROM products WHERE barcode = $1",
      [candidate]
    );
    if (dup.rows.length === 0) {
      return candidate;
    }
  }
  return `615000${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 9)}`;
}

async function generateUniqueSKU(clientOrPool, name, categoryId) {
  const cleanName = (name || "PROD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const prefix = cleanName.substring(0, 4) || "ITEM";
  const cat = String(categoryId || "00").padStart(2, "0");

  for (let i = 0; i < 15; i++) {
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const candidate = `${prefix}-${cat}-${rand}`;
    const check = await clientOrPool.query("SELECT id FROM products WHERE sku=$1", [candidate]);
    if (check.rows.length === 0) {
      return candidate;
    }
  }
  return `${prefix}-${cat}-${Date.now().toString().slice(-6)}`;
}

function generateSKU(name, categoryId) {
  const prefix = (name || "PROD")
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 4)
    .toUpperCase();
  const suffix = String(categoryId || "00").padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${suffix}-${rand}`;
}

async function syncToCatalogue(client, product) {
  // Keep n8n catalogue in sync whenever a product is created/updated
  await client.query(
    `
    INSERT INTO catalogue (
      sku, product_name, product_category, selling_unit,
      unit_price, currency, stock_qty, availability_status,
      eligible_for_ai
    ) VALUES ($1,$2,$3,$4,$5,'NGN',$6,$7,true)
    ON CONFLICT (sku) DO UPDATE SET
      product_name        = EXCLUDED.product_name,
      product_category    = EXCLUDED.product_category,
      selling_unit        = EXCLUDED.selling_unit,
      unit_price          = EXCLUDED.unit_price,
      stock_qty           = EXCLUDED.stock_qty,
      availability_status = EXCLUDED.availability_status
  `,
    [
      product.sku,
      product.name,
      product.category_name || "",
      product.unit || "",
      product.unit_price || 0,
      product.stock || 0,
      (product.stock || 0) > 0 ? "In Stock" : "Out of Stock",
    ],
  );
}

// ── SUBCATEGORIES CRUD ──────────────────────────────────────────
router.get("/subcategories", requireRole("superadmin", "manager", "admin", "kitchen_staff"), async (req, res, next) => {
  try {
    const { category_id, search, status } = req.query;
    let query = `
      SELECT 
        s.id,
        s.category_id,
        s.name,
        s.code,
        s.description,
        COALESCE(s.status, 'active') AS status,
        s.created_at,
        c.name AS category_name,
        (SELECT COUNT(*) FROM products p WHERE p.sub_category_id = s.id OR p.category_id = s.category_id) AS product_count
      FROM subcategories s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      params.push(parseInt(category_id));
      query += ` AND s.category_id = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (s.name ILIKE $${params.length} OR s.code ILIKE $${params.length} OR s.description ILIKE $${params.length})`;
    }

    query += ` ORDER BY s.name ASC`;
    const result = await pool.query(query, params);
    res.json({ subcategories: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post("/subcategories", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {
    const { category_id, name, code, description, status = "active" } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Subcategory name is required" });
    }
    const catId = category_id ? parseInt(category_id) : null;
    const subCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 10);

    const result = await pool.query(
      `
      INSERT INTO subcategories (category_id, name, code, description, status, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
      `,
      [catId, name.trim(), subCode, description || "", status]
    );

    res.status(201).json({ message: "Subcategory created successfully", subcategory: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put("/subcategories/:id", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_id, name, code, description, status } = req.body;

    const result = await pool.query(
      `
      UPDATE subcategories
      SET 
        category_id = COALESCE($1, category_id),
        name = COALESCE($2, name),
        code = COALESCE($3, code),
        description = COALESCE($4, description),
        status = COALESCE($5, status)
      WHERE id = $6
      RETURNING *
      `,
      [category_id ? parseInt(category_id) : null, name?.trim(), code, description, status, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    res.json({ message: "Subcategory updated successfully", subcategory: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete("/subcategories/:id", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const prodCount = await pool.query("SELECT COUNT(*) FROM products WHERE sub_category_id = $1", [parseInt(id)]);
    if (parseInt(prodCount.rows[0].count) > 0) {
      return res.status(400).json({ message: `Cannot delete subcategory linked to ${prodCount.rows[0].count} product(s)` });
    }

    const result = await pool.query("DELETE FROM subcategories WHERE id = $1 RETURNING id", [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    res.json({ message: "Subcategory deleted successfully" });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/products ───────────────────────────────────────
// Paginated product list with filters
router.get("/", requireRole("superadmin", "manager", "admin", "kitchen_staff"), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit: limitRaw = 20,
      search = "",
      category = "",
      status = "",
      stock = "", // "low" | "out" | ""
    } = req.query;
    const limit = clampLimit(limitRaw, 20, 1000);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = ["p.status != 'archived'"];

    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`,
      );
    }
    if (category) {
      params.push(category);
      where.push(`p.category_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`p.status = $${params.length}`);
    }
    if (stock === "low")
      where.push("p.stock <= p.low_stock_threshold AND p.stock > 0");
    if (stock === "out") where.push("p.stock = 0");

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM products p ${whereClause}`,
      params,
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(
      `
      SELECT
        p.id, p.name, p.sku, p.image_url, p.barcode, p.category_id,
        p.unit_price, p.cost_price, p.price,
        p.stock, p.low_stock_threshold,
        p.status, p.is_featured, p.available_for_sale,
        p.expiry_date, p.created_at, p.hsn_code, p.track_inventory,
        cat.name AS category,
        COALESCE(
          SUM(oi.subtotal) FILTER (WHERE o.status NOT IN ('cancelled','failed')),
          SUM(oi.quantity * oi.price) FILTER (WHERE o.status NOT IN ('cancelled','failed')), 0
        ) AS revenue
      FROM products p
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id
      ${whereClause}
      GROUP BY p.id, cat.name
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
      params,
    );

    res.json({
      products: rows.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("GET /admin/products error:", err.message);
    next(err);
  }
});

// ── GET /api/admin/products/form-data ────────────────────────────
// Returns categories, brands, units for dropdowns
router.get("/form-data", requireRole("superadmin", "manager", "admin", "kitchen_staff"), async (req, res, next) => {
  try {
    const [categories, subCategories, units] = await Promise.all([
      pool.query(
        "SELECT id, name, icon FROM categories WHERE status='active' ORDER BY sort_order, name",
      ),
      pool.query(
        "SELECT id, name, category_id FROM sub_categories WHERE status='active' ORDER BY name",
      ),
      pool.query(
        "SELECT id, name, short AS abbreviation, type FROM units WHERE status='active' ORDER BY type, name",
      ),
    ]);

    res.json({
      categories: categories.rows,
      sub_categories: subCategories.rows,
      units: units.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ── VARIANTS ──────────────────────────────────────────────────────
// GET /api/admin/products/variants ── list all variants (optionally scoped
// to one product or filtered by a search term across variant/SKU/product name)
router.get(
  "/variants",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const { product_id, search } = req.query;
      const params = [];
      const where = [];
      if (product_id) {
        params.push(product_id);
        where.push(`v.product_id = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`);
        where.push(
          `(v.name ILIKE $${params.length} OR v.sku ILIKE $${params.length} OR p.name ILIKE $${params.length})`,
        );
      }
      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const result = await pool.query(
        `SELECT v.*, p.name AS product_name, p.sku AS product_sku
         FROM product_variants v
         JOIN products p ON p.id = v.product_id
         ${whereClause}
         ORDER BY v.created_at DESC`,
        params,
      );
      res.json({ variants: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/variants",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const { product_id, name, sku, price_adjustment, stock_count, is_active } = req.body;
      if (!product_id) return res.status(400).json({ message: "Product is required" });
      if (!name?.trim()) return res.status(400).json({ message: "Variant name is required" });

      const prod = await pool.query("SELECT id FROM products WHERE id=$1", [product_id]);
      if (!prod.rows.length) return res.status(400).json({ message: "Selected product does not exist" });

      if (sku?.trim()) {
        const dup = await pool.query("SELECT id FROM product_variants WHERE sku=$1", [sku.trim()]);
        if (dup.rows.length) {
          return res.status(400).json({ message: `SKU "${sku.trim()}" is already used by another variant` });
        }
      }

      const result = await pool.query(
        `INSERT INTO product_variants (product_id, name, sku, price_adjustment, stock_count, is_active, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
        [
          product_id,
          name.trim(),
          sku?.trim() || null,
          price_adjustment !== undefined && price_adjustment !== "" ? parseFloat(price_adjustment) : 0,
          stock_count !== undefined && stock_count !== "" ? parseInt(stock_count) : 0,
          is_active !== false,
        ],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/variants/:id",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const { product_id, name, sku, price_adjustment, stock_count, is_active } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Variant name is required" });

      if (sku?.trim()) {
        const dup = await pool.query(
          "SELECT id FROM product_variants WHERE sku=$1 AND id != $2",
          [sku.trim(), req.params.id],
        );
        if (dup.rows.length) {
          return res.status(400).json({ message: `SKU "${sku.trim()}" is already used by another variant` });
        }
      }

      const result = await pool.query(
        `UPDATE product_variants
         SET product_id = COALESCE($1, product_id),
             name = $2,
             sku = $3,
             price_adjustment = $4,
             stock_count = $5,
             is_active = $6
         WHERE id = $7
         RETURNING *`,
        [
          product_id || null,
          name.trim(),
          sku?.trim() || null,
          price_adjustment !== undefined && price_adjustment !== "" ? parseFloat(price_adjustment) : 0,
          stock_count !== undefined && stock_count !== "" ? parseInt(stock_count) : 0,
          is_active !== false,
          req.params.id,
        ],
      );
      if (!result.rows.length) return res.status(404).json({ message: "Variant not found" });
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/variants/:id",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const result = await pool.query("DELETE FROM product_variants WHERE id=$1 RETURNING id", [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ message: "Variant not found" });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── PACKAGING & MULTI-UNIT TIERS ─────────────────────────────────
// GET /api/admin/products/:id/packaging-units
router.get(
  "/:id/packaging-units",
  requireRole("superadmin", "manager", "admin", "kitchen_staff", "cashier"),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, product_id, unit_name, multiplier, price, cost_price, barcode, sku, is_default, is_active, created_at
         FROM product_packaging_units
         WHERE product_id = $1
         ORDER BY multiplier ASC`,
        [req.params.id]
      );
      res.json({
        packaging_units: result.rows.map(u => ({
          ...u,
          multiplier: parseFloat(u.multiplier || 1),
          price: parseFloat(u.price || 0),
          cost_price: u.cost_price ? parseFloat(u.cost_price) : null
        }))
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/products/:id/packaging-units
router.post(
  "/:id/packaging-units",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const { unit_name, multiplier, price, cost_price, barcode, sku, is_default } = req.body;
      if (!unit_name?.trim()) return res.status(400).json({ message: "Packaging unit name is required (e.g. Carton, Pack, Crate)" });
      const mult = parseFloat(multiplier);
      if (isNaN(mult) || mult <= 0) return res.status(400).json({ message: "Multiplier must be greater than 0 (e.g. 40 pieces per carton)" });
      const unitPrice = parseFloat(price);
      if (isNaN(unitPrice) || unitPrice < 0) return res.status(400).json({ message: "Price must be a valid number" });

      if (barcode?.trim()) {
        const dupBc = await pool.query("SELECT id FROM product_packaging_units WHERE barcode=$1", [barcode.trim()]);
        if (dupBc.rows.length) {
          return res.status(400).json({ message: `Barcode "${barcode.trim()}" is already assigned to another packaging unit` });
        }
      }

      if (sku?.trim()) {
        const dupSku = await pool.query("SELECT id FROM product_packaging_units WHERE sku=$1", [sku.trim()]);
        if (dupSku.rows.length) {
          return res.status(400).json({ message: `SKU "${sku.trim()}" is already assigned to another packaging unit` });
        }
      }

      const result = await pool.query(
        `INSERT INTO product_packaging_units (product_id, unit_name, multiplier, price, cost_price, barcode, sku, is_default, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
         RETURNING *`,
        [
          req.params.id,
          unit_name.trim(),
          mult,
          unitPrice,
          cost_price ? parseFloat(cost_price) : null,
          barcode?.trim() || null,
          sku?.trim() || null,
          Boolean(is_default)
        ]
      );

      res.status(201).json({
        packaging_unit: {
          ...result.rows[0],
          multiplier: parseFloat(result.rows[0].multiplier),
          price: parseFloat(result.rows[0].price),
          cost_price: result.rows[0].cost_price ? parseFloat(result.rows[0].cost_price) : null
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/admin/products/packaging-units/:unitId
router.put(
  "/packaging-units/:unitId",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const { unit_name, multiplier, price, cost_price, barcode, sku, is_default, is_active } = req.body;
      if (!unit_name?.trim()) return res.status(400).json({ message: "Packaging unit name is required" });
      const mult = parseFloat(multiplier);
      if (isNaN(mult) || mult <= 0) return res.status(400).json({ message: "Multiplier must be greater than 0" });
      const unitPrice = parseFloat(price);
      if (isNaN(unitPrice) || unitPrice < 0) return res.status(400).json({ message: "Price must be a valid number" });

      if (barcode?.trim()) {
        const dupBc = await pool.query("SELECT id FROM product_packaging_units WHERE barcode=$1 AND id != $2", [barcode.trim(), req.params.unitId]);
        if (dupBc.rows.length) {
          return res.status(400).json({ message: `Barcode "${barcode.trim()}" is already in use` });
        }
      }

      const result = await pool.query(
        `UPDATE product_packaging_units
         SET unit_name = $1,
             multiplier = $2,
             price = $3,
             cost_price = $4,
             barcode = $5,
             sku = $6,
             is_default = COALESCE($7, is_default),
             is_active = COALESCE($8, is_active),
             updated_at = NOW()
         WHERE id = $9
         RETURNING *`,
        [
          unit_name.trim(),
          mult,
          unitPrice,
          cost_price ? parseFloat(cost_price) : null,
          barcode?.trim() || null,
          sku?.trim() || null,
          is_default !== undefined ? Boolean(is_default) : null,
          is_active !== undefined ? Boolean(is_active) : null,
          req.params.unitId
        ]
      );

      if (!result.rows.length) return res.status(404).json({ message: "Packaging unit not found" });

      res.json({
        packaging_unit: {
          ...result.rows[0],
          multiplier: parseFloat(result.rows[0].multiplier),
          price: parseFloat(result.rows[0].price),
          cost_price: result.rows[0].cost_price ? parseFloat(result.rows[0].cost_price) : null
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/products/packaging-units/:unitId
router.delete(
  "/packaging-units/:unitId",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const result = await pool.query("DELETE FROM product_packaging_units WHERE id=$1 RETURNING id", [req.params.unitId]);
      if (!result.rows.length) return res.status(404).json({ message: "Packaging unit not found" });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// ── REVIEWS (moderation) ──────────────────────────────────────────
// GET /api/admin/products/reviews ── list all reviews, optionally filtered
// by status ('approved' | 'pending' | 'rejected') and/or a search term
router.get(
  "/reviews",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const { status, search } = req.query;
      const params = [];
      const where = [];
      if (status && status !== "all") {
        params.push(status);
        where.push(`r.status = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`);
        where.push(
          `(p.name ILIKE $${params.length} OR COALESCE(u.name, c.name) ILIKE $${params.length} OR r.body ILIKE $${params.length})`,
        );
      }
      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const result = await pool.query(
        `SELECT r.*, p.name AS product_name, p.image_url AS product_image,
                COALESCE(u.name, c.name) AS customer_name,
                COALESCE(u.email, c.email) AS customer_email
         FROM product_reviews r
         JOIN products p ON p.id = r.product_id
         LEFT JOIN users u ON u.id = r.user_id
         LEFT JOIN customers c ON c.id = r.customer_id
         ${whereClause}
         ORDER BY r.created_at DESC`,
        params,
      );
      res.json({ reviews: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/reviews/:id",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!["approved", "pending", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const result = await pool.query(
        "UPDATE product_reviews SET status=$1 WHERE id=$2 RETURNING *",
        [status, req.params.id],
      );
      if (!result.rows.length) return res.status(404).json({ message: "Review not found" });
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/reviews/:id",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const result = await pool.query("DELETE FROM product_reviews WHERE id=$1 RETURNING id", [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ message: "Review not found" });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/admin/products/:id ───────────────────────────────────
router.get("/:id", requireRole("superadmin", "manager", "admin", "kitchen_staff"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT
        p.*,
        cat.name AS category_name,
        sub.name AS sub_category_name,
        u.name   AS unit_name, u.short AS unit_abbr
      FROM products p
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN sub_categories sub ON p.sub_category_id = sub.id
      LEFT JOIN units u ON p.unit_of_measure_id = u.id
      WHERE p.id = $1
    `,
      [req.params.id],
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "Product not found" });

    // Fetch images — aliased to the image_url/image_title field names the
    // admin edit form already expects, since the underlying columns are
    // named url/alt_text.
    const images = await pool.query(
      "SELECT id, product_id, url AS image_url, alt_text AS image_title, is_primary, sort_order, created_at FROM product_images WHERE product_id=$1 ORDER BY sort_order",
      [req.params.id],
    );

    // Sales Performance & Volume
    const salesStats = await pool.query(
      `
      SELECT
        COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
        COALESCE(SUM(COALESCE(oi.subtotal, oi.quantity * oi.price)), 0) AS total_revenue,
        COUNT(DISTINCT o.id) AS total_orders
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = $1 AND o.status NOT IN ('cancelled', 'failed')
    `,
      [req.params.id],
    );

    // Recent Orders featuring this product
    const recentOrders = await pool.query(
      `
      SELECT
        o.id, o.order_ref, o.customer_name, o.created_at, o.status,
        oi.quantity, oi.price, COALESCE(oi.subtotal, oi.quantity * oi.price) AS total
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = $1
      ORDER BY o.created_at DESC
      LIMIT 8
    `,
      [req.params.id],
    );

    // Recent Stock Movements (Audit Trail)
    let recentMovements = [];
    try {
      const smRes = await pool.query(
        `SELECT sm.id, sm.type, sm.quantity, sm.before_qty, sm.after_qty, sm.reference, sm.reason, sm.created_at
         FROM stock_movements sm
         WHERE sm.product_id = $1
         ORDER BY sm.created_at DESC
         LIMIT 6`,
        [req.params.id]
      );
      recentMovements = smRes.rows;
    } catch (smErr) {
      console.warn("Product movements enrichment notice:", smErr?.message);
    }

    // Packaging & Multi-Unit Tiers (Cartons, Packs, Crates)
    let packagingUnits = [];
    try {
      const puRes = await pool.query(
        `SELECT id, product_id, unit_name, multiplier, price, cost_price, barcode, sku, is_default, is_active, created_at
         FROM product_packaging_units
         WHERE product_id = $1
         ORDER BY multiplier ASC`,
        [req.params.id]
      );
      packagingUnits = puRes.rows.map(u => ({
        ...u,
        multiplier: parseFloat(u.multiplier || 1),
        price: parseFloat(u.price || 0),
        cost_price: u.cost_price ? parseFloat(u.cost_price) : null
      }));
    } catch (puErr) {
      console.warn("Packaging units enrichment notice:", puErr?.message);
    }

    res.json({
      ...result.rows[0],
      images: images.rows,
      packaging_units: packagingUnits,
      sales_stats: salesStats.rows[0] || { total_units_sold: 0, total_revenue: 0, total_orders: 0 },
      recent_orders: recentOrders.rows || [],
      recent_movements: recentMovements,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/products ──────────────────────────────────────
router.post(
  "/",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const {
        name,
        description,
        category_id,
        sub_category_id,
        unit_of_measure_id,
        unit,
        model_variant,
        tags,
        unit_price,
        cost_price,
        tax_rate,
        available_for_sale = true,
        stock_quantity = 0,
        low_stock_threshold = 10,
        track_inventory = true,
        expiry_date,
        return_policy,
        status = "active",
        store_id,
        barcode,
        hsn_code,
        video_url,
        image_url,
        // Images
        image_title,
        image_tags,
        image_2_url,
        image_3_url,
        image_4_url,
      } = req.body;

      if (!name?.trim()) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Product name required" });
      }
      if (!image_url?.trim()) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Main Product Image URL is required" });
      }

      // unit_price/cost_price/stock/low_stock_threshold/tax_rate are typed
      // as numbers by the DB but arrive as arbitrary JSON here — a garbage
      // or negative value must be rejected before it reaches parseFloat/parseInt,
      // which would otherwise silently store NaN or a negative price/stock.
      const parsedUnitPrice = parseFloat(unit_price);
      if (unit_price === undefined || unit_price === "" || isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Unit price must be a number that isn't negative" });
      }
      if (cost_price !== undefined && cost_price !== "" && (isNaN(parseFloat(cost_price)) || parseFloat(cost_price) < 0)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Cost price must be a number that isn't negative" });
      }
      if (isNaN(parseInt(stock_quantity)) || parseInt(stock_quantity) < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Stock quantity must be a whole number that isn't negative" });
      }
      if (isNaN(parseInt(low_stock_threshold)) || parseInt(low_stock_threshold) < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Low stock threshold must be a whole number that isn't negative" });
      }
      if (tax_rate !== undefined && tax_rate !== "" && (isNaN(parseFloat(tax_rate)) || parseFloat(tax_rate) < 0)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Tax rate must be a number that isn't negative" });
      }

      // Auto-generate Barcode if not provided or validate provided Barcode
      let finalBarcode = barcode?.trim();
      if (!finalBarcode) {
        finalBarcode = await generateUniqueBarcode(client, category_id);
      } else {
        const barcodeCheck = await client.query(
          "SELECT id, name FROM products WHERE barcode = $1 AND status != 'archived'",
          [finalBarcode]
        );
        if (barcodeCheck.rows.length) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: `Barcode "${finalBarcode}" is already assigned to product "${barcodeCheck.rows[0].name}"`
          });
        }
      }

      // Fetch category name for SKU + catalogue sync
      let categoryName = "";
      if (category_id) {
        const catRow = await client.query(
          "SELECT name FROM categories WHERE id=$1",
          [category_id],
        );
        categoryName = catRow.rows[0]?.name || "";
      }

      // Auto-generate SKU if not provided or validate provided SKU
      let sku = req.body.sku?.trim();
      if (!sku) {
        sku = await generateUniqueSKU(client, name, category_id);
      } else {
        const skuCheck = await client.query(
          "SELECT id FROM products WHERE sku=$1",
          [sku],
        );
        if (skuCheck.rows.length) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: `SKU "${sku}" already exists` });
        }
      }

      // Calculate margin
      const margin =
        cost_price && unit_price
          ? (
              ((parseFloat(unit_price) - parseFloat(cost_price)) /
                parseFloat(unit_price)) *
              100
            ).toFixed(2)
          : null;

      const result = await client.query(
        `
      INSERT INTO products (
        name, description, category_id, sub_category_id,
        unit_of_measure_id, unit, model_variant, tags,
        sku, unit_price, price, cost_price, margin_pct, tax_rate,
        available_for_sale, stock, stock_quantity, low_stock_threshold,
        track_inventory, expiry_date, return_policy,
        status, store_id, barcode, hsn_code, video_url, image_url,
        is_featured, created_by, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13,
        $14,$15,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
        false,$26,NOW(),NOW()
      )
      RETURNING *
    `,
        [
          name.trim(),
          description || null,
          category_id || null,
          sub_category_id || null,
          unit_of_measure_id || null,
          unit || null,
          model_variant || null,
          tags ? JSON.stringify(tags) : null,
          sku,
          parseFloat(unit_price),
          cost_price ? parseFloat(cost_price) : null,
          margin,
          tax_rate ? parseFloat(tax_rate) : 7.5,
          available_for_sale,
          parseInt(stock_quantity),
          parseInt(low_stock_threshold),
          track_inventory,
          expiry_date || null,
          return_policy || "no_return",
          status,
          store_id || null,
          finalBarcode,
          hsn_code || null,
          video_url || null,
          image_url || null,
          req.user.id,
        ],
      );

      const product = result.rows[0];

      // Always auto-register batch entry in batch_management for newly created products
      const initialQty = parseInt(stock_quantity || stock || 0);
      const batchNo = `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${product.id}`;
      const defaultExp = expiry_date || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await client.query(
        `INSERT INTO batch_management (product_id, batch_no, quantity, cost_price, expiry_date, status, received_at, created_at)
         VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
        [product.id, batchNo, initialQty, cost_price ? parseFloat(cost_price) : null, defaultExp]
      ).catch(() => {});

      // Save additional images
      const extraImages = [image_2_url, image_3_url, image_4_url].filter(
        Boolean,
      );
      if (image_url || extraImages.length) {
        const allImages = [image_url, ...extraImages].filter(Boolean);
        for (let i = 0; i < allImages.length; i++) {
          await client.query(
            `
          INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
          VALUES ($1,$2,$3,$4,$5)
        `,
            [
              product.id,
              allImages[i],
              image_title || null,
              i === 0,
              i + 1,
            ],
          );
        }
      }

      // Save Packaging Units (Cartons, Packs, Crates, etc.)
      const { packaging_units } = req.body;
      if (Array.isArray(packaging_units) && packaging_units.length > 0) {
        for (const unit of packaging_units) {
          if (!unit.unit_name?.trim()) continue;
          const uMult = parseFloat(unit.multiplier) || 1;
          const uPrice = parseFloat(unit.price) || 0;
          const uCost = unit.cost_price ? parseFloat(unit.cost_price) : null;
          const uBc = unit.barcode?.trim() || null;
          const uSku = unit.sku?.trim() || null;
          const uIsDef = Boolean(unit.is_default);

          await client.query(
            `INSERT INTO product_packaging_units (product_id, unit_name, multiplier, price, cost_price, barcode, sku, is_default, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())`,
            [product.id, unit.unit_name.trim(), uMult, uPrice, uCost, uBc, uSku, uIsDef]
          );
        }
      }

      // Sync to n8n catalogue
      await syncToCatalogue(client, {
        ...product,
        category_name: categoryName,
      });

      await client.query("COMMIT");

      trackActivity(req.user.id, "product_created", {
        entityType: "product",
        entityId: product.id,
        metadata: { name: product.name, price: product.unit_price, stock: product.stock }
      });

      res
        .status(201)
        .json({ product, message: "Product created successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("POST /admin/products error:", err.message);
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── POST /api/admin/products/bulk-import ────────────────────────────
// Accepts rows already mapped client-side to the target field names
// (see Bems-Farms-Admin-Front-end BulkImport.jsx). Each row is inserted
// independently so one bad row doesn't roll back the rest of the batch.
router.post(
  "/bulk-import",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    const { type, rows, update_existing = false, auto_create_categories = true } = req.body;
    if (!["products", "categories", "sub_categories"].includes(type)) {
      return res.status(400).json({ message: "Invalid import type" });
    }
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ message: "No rows to import" });
    }
    if (rows.length > 2000) {
      return res.status(400).json({ message: "Cannot import more than 2000 rows at once" });
    }

    let imported = 0;
    let updated = 0;
    const errors = [];

    // Cache categories, brands, and units to avoid repetitive queries & deduplicate
    const categoriesMap = new Map();
    const existingCats = await pool.query("SELECT id, name, code FROM categories");
    existingCats.rows.forEach((c) => {
      categoriesMap.set(String(c.id), c.id);
      categoriesMap.set(c.name.toLowerCase().trim(), c.id);
      if (c.code) categoriesMap.set(c.code.toLowerCase().trim(), c.id);
    });

    const brandsMap = new Map();
    const existingBrands = await pool.query("SELECT id, name FROM brands");
    existingBrands.rows.forEach((b) => {
      brandsMap.set(String(b.id), b.id);
      brandsMap.set(b.name.toLowerCase().trim(), b.id);
    });

    const unitsMap = new Map();
    const existingUnits = await pool.query("SELECT id, name, short FROM units");
    existingUnits.rows.forEach((u) => {
      unitsMap.set(String(u.id), u);
      unitsMap.set(u.name.toLowerCase().trim(), u);
      if (u.short) unitsMap.set(u.short.toLowerCase().trim(), u);
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // account for the header row in the source file
      try {
        if (type === "products") {
          if (!row.name?.trim()) throw new Error("Product name is required");

          // Clean currency & numeric values (handle ₦, $, commas)
          const rawPrice = String(row.unit_price ?? row.price ?? "").replace(/[^0-9.]/g, "");
          if (!rawPrice || isNaN(parseFloat(rawPrice))) {
            throw new Error("unit_price is required and must be a valid number");
          }
          const unitPrice = parseFloat(rawPrice);

          const rawStock = String(row.quantity ?? row.stock_qty ?? row.stock ?? row.qty ?? row.count ?? 0).replace(/[^0-9]/g, "");
          const incomingStock = rawStock ? parseInt(rawStock, 10) : 0;

          const costPrice = row.cost_price ? parseFloat(String(row.cost_price).replace(/[^0-9.]/g, "")) : null;
          const lowStockAlert = row.low_stock_alert ? parseInt(String(row.low_stock_alert).replace(/[^0-9]/g, ""), 10) : 5;
          const taxInput = row.tax_percent ?? row.tax;
          const taxRate = taxInput ? parseFloat(String(taxInput).replace(/[^0-9.]/g, "")) : 7.5;

          const parseYesNo = (val, fallback) => {
            if (val === undefined || val === null || val === "") return fallback;
            const v = String(val).trim().toLowerCase();
            if (["no", "false", "0"].includes(v)) return false;
            if (["yes", "true", "1"].includes(v)) return true;
            return fallback;
          };
          const availableForSale = parseYesNo(row.available_for_sale, true);
          // System decision: track inventory is always true
          const trackInventory = true;

          const tagsArr = row.tags
            ? String(row.tags).split(",").map((t) => t.trim()).filter(Boolean)
            : null;
          const imageUrl = row.main_image_url?.trim() || row.image_url?.trim() || null;
          const expiryDate = row.expiry_date?.trim() || null;

          // 1. Resolve / Auto-create Category
          let categoryId = null;
          const catInput = String(row.category_id || row.category || "").trim();
          if (catInput) {
            const catKey = catInput.toLowerCase();
            if (categoriesMap.has(catKey)) {
              categoryId = categoriesMap.get(catKey);
            } else if (auto_create_categories) {
              const newCat = await pool.query(
                "INSERT INTO categories (name, status, created_at) VALUES ($1, 'active', NOW()) RETURNING id",
                [catInput]
              );
              categoryId = newCat.rows[0].id;
              categoriesMap.set(catKey, categoryId);
              categoriesMap.set(String(categoryId), categoryId);
            }
          }
          if (!categoryId) {
            const fallback = existingCats.rows[0]?.id || 1;
            categoryId = fallback;
          }

          // 2. Resolve / Auto-create Brand
          let brandId = null;
          const brandInput = String(row.brand || "").trim();
          if (brandInput) {
            const brandKey = brandInput.toLowerCase();
            if (brandsMap.has(brandKey)) {
              brandId = brandsMap.get(brandKey);
            } else {
              const newBrand = await pool.query(
                "INSERT INTO brands (name, status, created_at) VALUES ($1, 'active', NOW()) RETURNING id",
                [brandInput]
              );
              brandId = newBrand.rows[0].id;
              brandsMap.set(brandKey, brandId);
              brandsMap.set(String(brandId), brandId);
            }
          }

          // 3. Resolve / Auto-create Unit of Measure
          let unitOfMeasureId = null;
          let unitStr = "kg";
          const unitInput = String(row.unit || row.unit_of_measure || "").trim();
          if (unitInput) {
            const unitKey = unitInput.toLowerCase();
            if (unitsMap.has(unitKey)) {
              const uObj = unitsMap.get(unitKey);
              unitOfMeasureId = uObj.id;
              unitStr = uObj.short || uObj.name || unitInput;
            } else {
              const newUnit = await pool.query(
                "INSERT INTO units (name, short, type, step, status) VALUES ($1, $2, 'custom', 1.0, 'active') RETURNING id, name, short",
                [unitInput, unitInput.substring(0, 10)]
              );
              const uObj = newUnit.rows[0];
              unitOfMeasureId = uObj.id;
              unitStr = uObj.short || uObj.name;
              unitsMap.set(unitKey, uObj);
              unitsMap.set(String(uObj.id), uObj);
            }
          }

          // Duplicate avoidance & Smart Restock:
          // Check if product already exists by Barcode, SKU (if given), or Product Name
          let existingProduct = null;
          if (row.barcode?.trim()) {
            const byBarcode = await pool.query("SELECT * FROM products WHERE barcode = $1 LIMIT 1", [row.barcode.trim()]);
            if (byBarcode.rows.length) existingProduct = byBarcode.rows[0];
          }
          if (!existingProduct && row.sku?.trim()) {
            const bySku = await pool.query("SELECT * FROM products WHERE sku = $1 LIMIT 1", [row.sku.trim()]);
            if (bySku.rows.length) existingProduct = bySku.rows[0];
          }
          if (!existingProduct) {
            const byName = await pool.query(
              "SELECT * FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1",
              [row.name.trim()]
            );
            if (byName.rows.length) existingProduct = byName.rows[0];
          }

          if (existingProduct) {
            // Smart restock: increment stock count and update details
            await pool.query(
              `UPDATE products
               SET stock = stock + $1,
                   stock_quantity = stock_quantity + $1,
                   unit_price = COALESCE($2, unit_price),
                   price = COALESCE($2, price),
                   cost_price = COALESCE($3, cost_price),
                   barcode = COALESCE($4, barcode),
                   unit = COALESCE($5, unit),
                   low_stock_threshold = COALESCE($6, low_stock_threshold),
                   tax_rate = COALESCE($7, tax_rate),
                   description = COALESCE($8, description),
                   status = COALESCE($9, status),
                   available_for_sale = $10,
                   track_inventory = $11,
                   model_variant = COALESCE($12, model_variant),
                   tags = COALESCE($13, tags),
                   image_url = COALESCE($14, image_url),
                   video_url = COALESCE($15, video_url),
                   hsn_code = COALESCE($16, hsn_code),
                   return_policy = COALESCE($17, return_policy),
                   expiry_date = COALESCE($18, expiry_date),
                   category_id = COALESCE($19, category_id),
                   brand_id = COALESCE($20, brand_id),
                   unit_of_measure_id = COALESCE($21, unit_of_measure_id),
                   updated_at = NOW()
               WHERE id = $22`,
              [
                incomingStock,
                unitPrice,
                costPrice,
                row.barcode?.trim() || null,
                unitStr || row.unit?.trim() || null,
                lowStockAlert,
                taxRate,
                row.description?.trim() || null,
                row.status?.trim() || "active",
                availableForSale,
                trackInventory,
                row.model_variant?.trim() || null,
                tagsArr ? JSON.stringify(tagsArr) : null,
                imageUrl,
                row.video_url?.trim() || null,
                row.hsn_code?.trim() || null,
                row.return_policy?.trim() || null,
                expiryDate,
                categoryId,
                brandId,
                unitOfMeasureId,
                existingProduct.id,
              ]
            );
            if (existingProduct.id && (incomingStock > 0 || expiryDate)) {
              const batchNo = `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${existingProduct.id}-${Date.now().toString().slice(-4)}`;
              const effectiveExp = expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
              await pool.query(
                `INSERT INTO batch_management (product_id, batch_no, quantity, cost_price, expiry_date, status, received_at, created_at)
                 VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
                [existingProduct.id, batchNo, incomingStock, costPrice, effectiveExp]
              ).catch(() => {});
            }
            updated++;
            continue;
          }

          // New product: Auto-generate collision-proof unique SKU and Barcode
          const newSku = row.sku?.trim() || (await generateUniqueSKU(pool, row.name.trim(), categoryId));
          const newBarcode = row.barcode?.trim() || (await generateUniqueBarcode(pool, categoryId));

          const insRes = await pool.query(
            `INSERT INTO products
               (name, sku, barcode, category_id, sub_category_id, brand_id, unit_of_measure_id,
                unit_price, price, cost_price, stock, stock_quantity, unit, low_stock_threshold,
                tax_rate, description, status, available_for_sale, track_inventory, model_variant,
                tags, image_url, video_url, hsn_code, return_policy, expiry_date, created_by,
                created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
                     $20,$21,$22,$23,$24,$25,NOW(),NOW())
             RETURNING id`,
            [
              row.name.trim(),
              newSku,
              newBarcode,
              categoryId,
              row.sub_category_id ? parseInt(row.sub_category_id) : null,
              brandId,
              unitOfMeasureId,
              unitPrice,
              costPrice,
              incomingStock,
              unitStr || row.unit?.trim() || "kg",
              lowStockAlert,
              taxRate,
              row.description?.trim() || null,
              row.status?.trim() || "active",
              availableForSale,
              trackInventory,
              row.model_variant?.trim() || null,
              tagsArr ? JSON.stringify(tagsArr) : null,
              imageUrl,
              row.video_url?.trim() || null,
              row.hsn_code?.trim() || null,
              row.return_policy?.trim() || null,
              expiryDate,
              req.user.id,
            ],
          );
          const newProdId = insRes.rows[0]?.id;
          if (newProdId && (incomingStock > 0 || expiryDate)) {
            const batchNo = `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${newProdId}-${Date.now().toString().slice(-4)}`;
            const effectiveExp = expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            await pool.query(
              `INSERT INTO batch_management (product_id, batch_no, quantity, cost_price, expiry_date, status, received_at, created_at)
               VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
              [newProdId, batchNo, incomingStock, costPrice, effectiveExp]
            ).catch(() => {});
          }
          imported++;
        } else if (type === "categories") {
          if (!row.name?.trim()) throw new Error("name is required");
          await pool.query(
            `INSERT INTO categories (name, code, description, status, created_at)
             VALUES ($1,$2,$3,$4,NOW())`,
            [row.name.trim(), row.code?.trim() || null, row.description?.trim() || null, row.status?.trim() || "active"],
          );
        } else {
          if (!row.name?.trim()) throw new Error("name is required");
          if (!row.category_id) throw new Error("category_id is required");
          const catCheck = await pool.query("SELECT id FROM categories WHERE id=$1", [parseInt(row.category_id)]);
          if (!catCheck.rows.length) throw new Error(`category_id ${row.category_id} does not exist`);
          await pool.query(
            `INSERT INTO sub_categories (name, category_id, description, status, created_at)
             VALUES ($1,$2,$3,$4,NOW())`,
            [row.name.trim(), parseInt(row.category_id), row.description?.trim() || null, row.status?.trim() || "active"],
          );
        }
        imported++;
      } catch (err) {
        errors.push({ row: rowNum, message: err.message });
      }
    }

    res.status(imported > 0 || updated > 0 ? 201 : 400).json({
      imported,
      updated,
      failed: errors.length,
      total: rows.length,
      errors: errors.slice(0, 50),
      message: `${imported} imported, ${updated} updated of ${rows.length} rows${errors.length ? `, ${errors.length} failed` : ""}`,
    });
  },
);

// ── PATCH /api/admin/products/:id ────────────────────────────────
router.patch(
  "/:id",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await client.query(
        "SELECT * FROM products WHERE id=$1",
        [req.params.id],
      );
      if (!existing.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Product not found" });
      }

      const p = existing.rows[0];
      const {
        name,
        description,
        category_id,
        sub_category_id,
        unit_of_measure_id,
        unit,
        model_variant,
        tags,
        unit_price,
        cost_price,
        tax_rate,
        available_for_sale,
        stock_quantity,
        low_stock_threshold,
        track_inventory,
        expiry_date,
        return_policy,
        status,
        barcode,
        hsn_code,
        video_url,
        image_url,
        is_featured,
      } = req.body;

      if (image_url !== undefined && (!image_url || !image_url.trim())) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Main Product Image URL is required" });
      }

      // Only fields actually present in the PATCH body are validated —
      // COALESCE below keeps anything omitted at its existing value.
      if (unit_price !== undefined && unit_price !== "" && (isNaN(parseFloat(unit_price)) || parseFloat(unit_price) < 0)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Unit price must be a number that isn't negative" });
      }
      if (cost_price !== undefined && cost_price !== "" && (isNaN(parseFloat(cost_price)) || parseFloat(cost_price) < 0)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Cost price must be a number that isn't negative" });
      }
      if (stock_quantity !== undefined && (isNaN(parseInt(stock_quantity)) || parseInt(stock_quantity) < 0)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Stock quantity must be a whole number that isn't negative" });
      }
      if (low_stock_threshold !== undefined && (isNaN(parseInt(low_stock_threshold)) || parseInt(low_stock_threshold) < 0)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Low stock threshold must be a whole number that isn't negative" });
      }
      if (tax_rate !== undefined && tax_rate !== "" && (isNaN(parseFloat(tax_rate)) || parseFloat(tax_rate) < 0)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Tax rate must be a number that isn't negative" });
      }

      if (barcode && barcode.trim()) {
        const barcodeCheck = await client.query(
          "SELECT id, name FROM products WHERE barcode = $1 AND id != $2 AND status != 'archived'",
          [barcode.trim(), req.params.id]
        );
        if (barcodeCheck.rows.length) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: `Barcode "${barcode.trim()}" is already assigned to product "${barcodeCheck.rows[0].name}"`
          });
        }
      }

      const newUnitPrice = unit_price ? parseFloat(unit_price) : p.unit_price;
      const newCostPrice = cost_price ? parseFloat(cost_price) : p.cost_price;
      const newMargin =
        newCostPrice && newUnitPrice
          ? (((newUnitPrice - newCostPrice) / newUnitPrice) * 100).toFixed(2)
          : p.margin_pct;
      const newStock =
        stock_quantity !== undefined ? parseInt(stock_quantity) : p.stock;

      await client.query(
        `
      UPDATE products SET
        name                = COALESCE($1, name),
        description         = COALESCE($2, description),
        category_id         = COALESCE($3, category_id),
        sub_category_id     = COALESCE($4, sub_category_id),
        unit_of_measure_id  = COALESCE($5, unit_of_measure_id),
        unit                = COALESCE($6, unit),
        model_variant       = COALESCE($7, model_variant),
        unit_price          = $8,
        price               = $8,
        cost_price          = $9,
        margin_pct          = $10,
        tax_rate            = COALESCE($11, tax_rate),
        available_for_sale  = COALESCE($12, available_for_sale),
        stock               = $13,
        stock_quantity      = $13,
        low_stock_threshold = COALESCE($14, low_stock_threshold),
        track_inventory     = COALESCE($15, track_inventory),
        expiry_date         = COALESCE($16, expiry_date),
        return_policy       = COALESCE($17, return_policy),
        status              = COALESCE($18, status),
        barcode             = CASE WHEN $19 = '__CLEAR__' OR $19 = '' THEN NULL WHEN $19 IS NOT NULL THEN $19 ELSE barcode END,
        hsn_code            = CASE WHEN $20 = '__CLEAR__' OR $20 = '' THEN NULL WHEN $20 IS NOT NULL THEN $20 ELSE hsn_code END,
        video_url           = COALESCE($21, video_url),
        image_url           = COALESCE($22, image_url),
        is_featured         = COALESCE($23, is_featured),
        updated_at          = NOW()
      WHERE id = $24
      RETURNING *
    `,
        [
          name || null,
          description || null,
          category_id || null,
          sub_category_id || null,
          unit_of_measure_id || null,
          unit || null,
          model_variant || null,
          newUnitPrice,
          newCostPrice,
          newMargin,
          tax_rate ? parseFloat(tax_rate) : null,
          available_for_sale !== undefined ? available_for_sale : null,
          newStock,
          low_stock_threshold ? parseInt(low_stock_threshold) : null,
          track_inventory !== undefined ? track_inventory : null,
          expiry_date || null,
          return_policy || null,
          status || null,
          barcode !== undefined ? (barcode === null || barcode === '' ? '__CLEAR__' : String(barcode).trim()) : null,
          hsn_code !== undefined ? (hsn_code === null || hsn_code === '' ? '__CLEAR__' : String(hsn_code).trim()) : null,
          video_url || null,
          image_url || null,
          is_featured !== undefined ? is_featured : null,
          req.params.id,
        ],
      );

      // Sync catalogue
      let categoryName = "";
      if (category_id) {
        const catRow = await client.query(
          "SELECT name FROM categories WHERE id=$1",
          [category_id],
        );
        categoryName = catRow.rows[0]?.name || "";
      }
      await syncToCatalogue(client, {
        sku: p.sku,
        name: name || p.name,
        category_name: categoryName,
        unit: unit || p.unit,
        unit_price: newUnitPrice,
        stock: newStock,
      });

      // Update Packaging Units if provided
      const { packaging_units } = req.body;
      if (Array.isArray(packaging_units)) {
        await client.query("DELETE FROM product_packaging_units WHERE product_id = $1", [req.params.id]);
        for (const unit of packaging_units) {
          if (!unit.unit_name?.trim()) continue;
          const uMult = parseFloat(unit.multiplier) || 1;
          const uPrice = parseFloat(unit.price) || 0;
          const uCost = unit.cost_price ? parseFloat(unit.cost_price) : null;
          const uBc = unit.barcode?.trim() || null;
          const uSku = unit.sku?.trim() || null;
          const uIsDef = Boolean(unit.is_default);

          await client.query(
            `INSERT INTO product_packaging_units (product_id, unit_name, multiplier, price, cost_price, barcode, sku, is_default, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())`,
            [req.params.id, unit.unit_name.trim(), uMult, uPrice, uCost, uBc, uSku, uIsDef]
          );
        }
      }

      await client.query("COMMIT");

      trackActivity(req.user.id, "product_updated", {
        entityType: "product",
        entityId: req.params.id,
        metadata: { name: name || p.name, price: newUnitPrice, stock: newStock }
      });

      res.json({ message: "Product updated" });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── DELETE /api/admin/products/:id (soft delete) ─────────────────
router.delete(
  "/:id",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      await pool.query(
        "UPDATE products SET status='archived', updated_at=NOW() WHERE id=$1",
        [req.params.id],
      );
      // Mark unavailable in catalogue
      await pool.query(
        "UPDATE catalogue SET availability_status='Discontinued' WHERE sku=(SELECT sku FROM products WHERE id=$1)",
        [req.params.id],
      );

      trackActivity(req.user.id, "product_deleted", {
        entityType: "product",
        entityId: req.params.id
      });

      res.json({ message: "Product archived" });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/admin/products/:id/featured ────────────────────────
router.patch(
  "/:id/featured",
  requireRole("superadmin", "manager", "admin", "kitchen_staff"),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        "UPDATE products SET is_featured = NOT is_featured, updated_at=NOW() WHERE id=$1 RETURNING is_featured",
        [req.params.id],
      );
      if (!result.rows.length) return res.status(404).json({ message: "Product not found" });
      res.json({ is_featured: result.rows[0].is_featured });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
