// server/src/routes/products_admin.js
// ─────────────────────────────────────────────────────────────────
// Admin product management routes
// Mounted at /api/admin/products in index.js
// ─────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

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
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      category = "",
      status = "",
      stock = "", // "low" | "out" | ""
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = ["p.status != 'archived'"];

    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`,
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
        p.id, p.name, p.sku, p.image_url,
        p.unit_price, p.cost_price, p.price,
        p.stock, p.low_stock_threshold,
        p.status, p.is_featured, p.available_for_sale,
        p.expiry_date, p.created_at, p.hsn_code, p.track_inventory,
        cat.name AS category,
        COALESCE(
          SUM(oi.subtotal),
          SUM(oi.quantity * oi.price), 0
        ) AS revenue
      FROM products p
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
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
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admin/products/form-data ────────────────────────────
// Returns categories, brands, units for dropdowns
router.get("/form-data", async (req, res) => {
  try {
    const [categories, subCategories, units] = await Promise.all([
      pool.query(
        "SELECT id, name, icon FROM categories WHERE status='active' ORDER BY sort_order, name",
      ),
      pool.query(
        "SELECT id, name, category_id FROM sub_categories WHERE status='active' ORDER BY name",
      ),
      pool.query(
        "SELECT id, name, abbreviation, type FROM units_of_measure ORDER BY type, name",
      ),
    ]);

    res.json({
      categories: categories.rows,
      sub_categories: subCategories.rows,
      units: units.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admin/products/:id ───────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        p.*,
        cat.name AS category_name,
        u.name   AS unit_name, u.abbreviation AS unit_abbr
      FROM products p
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN units_of_measure u ON p.unit_of_measure_id = u.id
      WHERE p.id = $1
    `,
      [req.params.id],
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "Product not found" });

    // Fetch images
    const images = await pool.query(
      "SELECT * FROM product_images WHERE product_id=$1 ORDER BY sort_order",
      [req.params.id],
    );

    res.json({ ...result.rows[0], images: images.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/admin/products ──────────────────────────────────────
router.post(
  "/",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
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

      if (!name?.trim())
        return res.status(400).json({ message: "Product name required" });
      if (!unit_price)
        return res.status(400).json({ message: "Unit price required" });
      if (!image_url?.trim())
        return res.status(400).json({ message: "Main Product Image URL is required" });

      if (barcode && barcode.trim()) {
        const barcodeCheck = await client.query(
          "SELECT id, name FROM products WHERE barcode = $1 AND status != 'archived'",
          [barcode.trim()]
        );
        if (barcodeCheck.rows.length) {
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
      if (skuCheck.rows.length)
        return res.status(400).json({ message: `SKU "${sku}" already exists` });

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
          INSERT INTO product_images (product_id, image_url, image_title, image_tags, is_primary, sort_order)
          VALUES ($1,$2,$3,$4,$5,$6)
        `,
            [
              product.id,
              allImages[i],
              image_title || null,
              image_tags || null,
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

      res
        .status(201)
        .json({ product, message: "Product created successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("POST /admin/products error:", err.message);
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/products/:id ────────────────────────────────
router.patch(
  "/:id",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await client.query(
        "SELECT * FROM products WHERE id=$1",
        [req.params.id],
      );
      if (!existing.rows.length)
        return res.status(404).json({ message: "Product not found" });

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
        return res.status(400).json({ message: "Main Product Image URL is required" });
      }

      if (barcode && barcode.trim()) {
        const barcodeCheck = await client.query(
          "SELECT id, name FROM products WHERE barcode = $1 AND id != $2 AND status != 'archived'",
          [barcode.trim(), req.params.id]
        );
        if (barcodeCheck.rows.length) {
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
        barcode             = CASE WHEN $19 = '' THEN NULL ELSE COALESCE($19, barcode) END,
        hsn_code            = CASE WHEN $20 = '' THEN NULL ELSE COALESCE($20, hsn_code) END,
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
          barcode !== undefined ? barcode : null,
          hsn_code !== undefined ? hsn_code : null,
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
      res.json({ message: "Product updated" });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

// ── DELETE /api/admin/products/:id (soft delete) ─────────────────
router.delete(
  "/:id",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
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
      res.json({ message: "Product archived" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── PATCH /api/admin/products/:id/featured ────────────────────────
router.patch(
  "/:id/featured",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "UPDATE products SET is_featured = NOT is_featured, updated_at=NOW() WHERE id=$1 RETURNING is_featured",
        [req.params.id],
      );
      res.json({ is_featured: result.rows[0]?.is_featured });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

module.exports = router;
