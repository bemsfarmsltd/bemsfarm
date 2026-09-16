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

// ── HELPERS ──────────────────────────────────────────────────────
function generateSKU(name, categoryId) {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 4)
    .toUpperCase();
  const suffix = String(categoryId || "00").padStart(2, "0");
  const rand = Math.floor(Math.random() * 900 + 100);
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
    } catch (_) {}

    res.json({
      ...result.rows[0],
      images: images.rows,
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

      if (barcode && barcode.trim()) {
        const barcodeCheck = await client.query(
          "SELECT id, name FROM products WHERE barcode = $1 AND status != 'archived'",
          [barcode.trim()]
        );
        if (barcodeCheck.rows.length) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: `Barcode "${barcode.trim()}" is already assigned to product "${barcodeCheck.rows[0].name}"`
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

      // Auto-generate SKU if not provided
      const sku = req.body.sku?.trim() || generateSKU(name, category_id);

      // Check SKU uniqueness
      const skuCheck = await client.query(
        "SELECT id FROM products WHERE sku=$1",
        [sku],
      );
      if (skuCheck.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `SKU "${sku}" already exists` });
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
          barcode || null,
          hsn_code || null,
          video_url || null,
          image_url || null,
          req.user.id,
        ],
      );

      const product = result.rows[0];

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

    // Cache categories to avoid repetitive queries
    const categoriesMap = new Map();
    const existingCats = await pool.query("SELECT id, name, code FROM categories");
    existingCats.rows.forEach((c) => {
      categoriesMap.set(String(c.id), c.id);
      categoriesMap.set(c.name.toLowerCase().trim(), c.id);
      if (c.code) categoriesMap.set(c.code.toLowerCase().trim(), c.id);
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // account for the header row in the source file
      try {
        if (type === "products") {
          if (!row.name?.trim()) throw new Error("Product name is required");
          if (!row.sku?.trim()) throw new Error("SKU is required");

          // Clean currency & numeric values (handle ₦, $, commas)
          const rawPrice = String(row.unit_price ?? row.price ?? "").replace(/[^0-9.]/g, "");
          if (!rawPrice || isNaN(parseFloat(rawPrice))) {
            throw new Error("unit_price is required and must be a valid number");
          }
          const unitPrice = parseFloat(rawPrice);

          const rawStock = String(row.stock_qty ?? row.stock ?? "").replace(/[^0-9]/g, "");
          if (!rawStock || isNaN(parseInt(rawStock))) {
            throw new Error("stock_qty is required and must be a number");
          }
          const stockQty = parseInt(rawStock);

          const costPrice = row.cost_price ? parseFloat(String(row.cost_price).replace(/[^0-9.]/g, "")) : null;
          const lowStockAlert = row.low_stock_alert ? parseInt(String(row.low_stock_alert).replace(/[^0-9]/g, "")) : 10;
          // Some CSV templates (the richer "Add Product" bulk import schema)
          // use `tax`, the standalone Bulk Import page uses `tax_percent` —
          // accept either so one endpoint serves both flows.
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
          const trackInventory = parseYesNo(row.track_inventory, true);
          const tagsArr = row.tags
            ? String(row.tags).split(",").map((t) => t.trim()).filter(Boolean)
            : null;
          const imageUrl = row.main_image_url?.trim() || row.image_url?.trim() || null;
          const expiryDate = row.expiry_date?.trim() || null;

          // Resolve category (by ID or by name)
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

          // Check duplicate SKU
          const dup = await pool.query("SELECT id FROM products WHERE sku=$1", [row.sku.trim()]);
          if (dup.rows.length) {
            if (update_existing) {
              await pool.query(
                `UPDATE products
                 SET name = $1, barcode = COALESCE($2, barcode), category_id = $3,
                     unit_price = $4, price = $4, cost_price = COALESCE($5, cost_price),
                     stock = $6, stock_quantity = $6, unit = COALESCE($7, unit),
                     low_stock_threshold = COALESCE($8, low_stock_threshold),
                     tax_rate = COALESCE($9, tax_rate), description = COALESCE($10, description),
                     status = COALESCE($11, status),
                     available_for_sale = $13, track_inventory = $14,
                     model_variant = COALESCE($15, model_variant),
                     tags = COALESCE($16, tags),
                     image_url = COALESCE($17, image_url),
                     video_url = COALESCE($18, video_url),
                     hsn_code = COALESCE($19, hsn_code),
                     return_policy = COALESCE($20, return_policy),
                     expiry_date = COALESCE($21, expiry_date),
                     updated_at = NOW()
                 WHERE sku = $12`,
                [
                  row.name.trim(),
                  row.barcode?.trim() || null,
                  categoryId,
                  unitPrice,
                  costPrice,
                  stockQty,
                  row.unit?.trim() || null,
                  lowStockAlert,
                  taxRate,
                  row.description?.trim() || null,
                  row.status?.trim() || "active",
                  row.sku.trim(),
                  availableForSale,
                  trackInventory,
                  row.model_variant?.trim() || null,
                  tagsArr ? JSON.stringify(tagsArr) : null,
                  imageUrl,
                  row.video_url?.trim() || null,
                  row.hsn_code?.trim() || null,
                  row.return_policy?.trim() || null,
                  expiryDate,
                ]
              );
              updated++;
              continue;
            } else {
              throw new Error(`SKU "${row.sku.trim()}" already exists in the system`);
            }
          }

          await pool.query(
            `INSERT INTO products
               (name, sku, barcode, category_id, sub_category_id, unit_price, price, cost_price,
                stock, stock_quantity, unit, low_stock_threshold, tax_rate, description, status,
                available_for_sale, track_inventory, model_variant, tags, image_url, video_url,
                hsn_code, return_policy, expiry_date, created_by, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
                     $20,$21,$22,$23,NOW(),NOW())`,
            [
              row.name.trim(),
              row.sku.trim(),
              row.barcode?.trim() || null,
              categoryId,
              row.sub_category_id ? parseInt(row.sub_category_id) : null,
              unitPrice,
              costPrice,
              stockQty,
              row.unit?.trim() || null,
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
