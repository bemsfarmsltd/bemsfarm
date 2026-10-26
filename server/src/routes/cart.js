// server/src/routes/cart.js
// Mounted at /api/cart in index.js
//
// Persistent shopping cart operations across devices and sessions.
// Handles customer carts, guest carts, multi-device sync, and AI Chef webhook.

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is not defined!");
}

// ───────────────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────────────

/**
 * Resolves authenticated user from Authorization Bearer token or cookie.
 * Returns { id, name, email, role } or null.
 */
async function resolveCustomer(req) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) return null;

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }

    if (!decoded || !decoded.id) return null;

    const userRes = await pool.query(
      `SELECT id, name, email, role, status, token_version FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (!userRes.rows.length) return null;

    const u = userRes.rows[0];
    const status = String(u.status || "active").toLowerCase().trim();
    if (status === "suspended" || status === "inactive" || status === "deactivated" || status === "deleted") {
      return null;
    }

    const tokenVersion = Number(decoded.tokenVersion || 0);
    const dbTokenVersion = Number(u.token_version || 0);
    if (tokenVersion !== dbTokenVersion) {
      return null;
    }

    return { id: u.id, name: u.name, email: u.email, role: u.role };
  } catch (err) {
    console.warn("[cart:resolveCustomer] Error resolving token:", err.message);
    return null;
  }
}

/**
 * Finds or creates an active cart for customer or guest session.
 */
async function getOrCreateCart(clientOrPool, customerId, sessionId, createIfNotFound = true) {
  if (customerId) {
    const existing = await clientOrPool.query(
      `SELECT * FROM customer_carts WHERE customer_id = $1 AND status = 'active' ORDER BY updated_at DESC LIMIT 1`,
      [customerId]
    );
    if (existing.rows.length) {
      return existing.rows[0];
    }
    if (!createIfNotFound) return null;

    const inserted = await clientOrPool.query(
      `INSERT INTO customer_carts (customer_id, status, source, created_at, updated_at)
       VALUES ($1, 'active', 'web', NOW(), NOW())
       ON CONFLICT (customer_id) DO UPDATE SET status = 'active', updated_at = NOW()
       RETURNING *`,
      [customerId]
    );
    return inserted.rows[0];
  }

  if (sessionId) {
    const existing = await clientOrPool.query(
      `SELECT * FROM customer_carts WHERE customer_id IS NULL AND session_id = $1 AND status = 'active' ORDER BY updated_at DESC LIMIT 1`,
      [sessionId]
    );
    if (existing.rows.length) {
      return existing.rows[0];
    }
    if (!createIfNotFound) return null;

    const inserted = await clientOrPool.query(
      `INSERT INTO customer_carts (session_id, status, source, created_at, updated_at)
       VALUES ($1, 'active', 'web', NOW(), NOW())
       RETURNING *`,
      [sessionId]
    );
    return inserted.rows[0];
  }

  return null;
}

/**
 * Recalculates total and item_count on customer_carts.
 */
async function recalculateCartTotals(client, cartId) {
  const sumRes = await client.query(
    `SELECT
       COALESCE(SUM(quantity), 0)::int AS total_items,
       COALESCE(SUM(subtotal), 0)::numeric AS total_amount
     FROM customer_cart_items
     WHERE cart_id = $1`,
    [cartId]
  );
  const totalItems = parseInt(sumRes.rows[0]?.total_items || 0, 10);
  const totalAmount = parseFloat(sumRes.rows[0]?.total_amount || 0);

  await client.query(
    `UPDATE customer_carts
     SET item_count = $1, total = $2, updated_at = NOW()
     WHERE id = $3`,
    [totalItems, totalAmount, cartId]
  );

  return { totalItems, totalAmount };
}

/**
 * Fetches cart metadata and formatted items with full product details.
 */
async function fetchCartData(clientOrPool, cartId) {
  if (!cartId) return { cart: null, items: [] };

  const cartRes = await clientOrPool.query(
    `SELECT id, customer_id, session_id, total, item_count, status, coupon_id, updated_at, created_at
     FROM customer_carts WHERE id = $1`,
    [cartId]
  );

  if (!cartRes.rows.length) {
    return { cart: null, items: [] };
  }

  const cart = cartRes.rows[0];

  const itemsRes = await clientOrPool.query(
    `SELECT
       cci.id AS item_id,
       cci.cart_id,
       cci.product_id,
       cci.quantity,
       cci.unit_price,
       cci.subtotal,
       cci.notes,
       cci.created_at,
       cci.updated_at,
       p.name AS product_name,
       p.price AS product_price,
       p.unit_price AS product_unit_price,
       p.unit,
       p.image_url,
       p.stock,
       p.stock_quantity,
       p.status AS product_status,
       p.category_id
     FROM customer_cart_items cci
     JOIN products p ON p.id = cci.product_id
     WHERE cci.cart_id = $1
     ORDER BY cci.created_at ASC`,
    [cartId]
  );

  const items = itemsRes.rows.map((row) => {
    const rawPrice = row.product_price != null ? row.product_price : row.unit_price;
    const price = parseFloat(rawPrice || 0);
    const effStock = Math.max(
      Number(row.stock_quantity || 0),
      Number(row.stock || 0)
    );

    return {
      id: row.item_id,
      quantity: Number(row.quantity || 1),
      unit_price: parseFloat(row.unit_price || price),
      subtotal: parseFloat(row.subtotal || price * Number(row.quantity || 1)),
      notes: row.notes || "",
      product: {
        id: row.product_id,
        name: row.product_name,
        price: price,
        unit_price: parseFloat(row.product_unit_price || price),
        unit: row.unit || "item",
        image_url: row.image_url || "",
        stock: effStock > 0 ? effStock : 100,
        stock_quantity: effStock > 0 ? effStock : 100,
        status: row.product_status || "active",
        category_id: row.category_id,
      },
    };
  });

  return {
    cart: {
      id: cart.id,
      customer_id: cart.customer_id,
      session_id: cart.session_id,
      total: parseFloat(cart.total || 0),
      item_count: parseInt(cart.item_count || 0, 10),
      status: cart.status,
      coupon_id: cart.coupon_id,
      updated_at: cart.updated_at,
      created_at: cart.created_at,
    },
    items,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// ROUTES
// ───────────────────────────────────────────────────────────────────────────

/**
 * GET /api/cart
 * Fetches the active cart for the authenticated user or guest session.
 */
router.get("/", async (req, res, next) => {
  try {
    const customer = await resolveCustomer(req);
    const sessionId = req.headers["x-session-id"] || req.query.session_id || null;

    if (!customer && !sessionId) {
      return res.json({ cart: null, items: [] });
    }

    const cart = await getOrCreateCart(pool, customer?.id || null, sessionId, Boolean(customer));
    if (!cart) {
      return res.json({ cart: null, items: [] });
    }

    const data = await fetchCartData(pool, cart.id);
    return res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cart/items
 * Adds an item to the cart or increments its quantity.
 */
router.post("/items", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customer = await resolveCustomer(req);
    const sessionId = req.body.sessionId || req.headers["x-session-id"] || req.query.session_id || null;
    const { productId, quantity = 1, notes } = req.body;

    const prodId = parseInt(productId, 10);
    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

    if (!prodId || isNaN(prodId)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Valid productId is required" });
    }

    if (!customer && !sessionId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Authentication or sessionId required to modify cart" });
    }

    // Verify product exists and is active
    const prodRes = await client.query(
      `SELECT id, name, price, unit_price, stock, stock_quantity, status
       FROM products WHERE id = $1`,
      [prodId]
    );

    if (!prodRes.rows.length || prodRes.rows[0].status === "inactive") {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Product is currently unavailable" });
    }

    const prod = prodRes.rows[0];
    const effStock = Math.max(Number(prod.stock_quantity || 0), Number(prod.stock || 0));
    const unitPrice = parseFloat(prod.price != null ? prod.price : prod.unit_price || 0);

    // Get or create cart
    const cart = await getOrCreateCart(client, customer?.id || null, sessionId, true);

    // Check existing item in cart
    const existingItemRes = await client.query(
      `SELECT id, quantity FROM customer_cart_items WHERE cart_id = $1 AND product_id = $2`,
      [cart.id, prodId]
    );

    let nextQty = qtyToAdd;
    if (existingItemRes.rows.length) {
      const currentQty = existingItemRes.rows[0].quantity;
      nextQty = currentQty + qtyToAdd;
    }

    if (effStock > 0 && nextQty > effStock) {
      nextQty = effStock;
    }

    const lineSubtotal = unitPrice * nextQty;

    if (existingItemRes.rows.length) {
      await client.query(
        `UPDATE customer_cart_items
         SET quantity = $1, unit_price = $2, subtotal = $3, notes = COALESCE($4, notes), updated_at = NOW()
         WHERE id = $5`,
        [nextQty, unitPrice, lineSubtotal, notes || null, existingItemRes.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO customer_cart_items
           (cart_id, product_id, product_name, quantity, unit_price, subtotal, notes, source, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'web', NOW(), NOW())
         ON CONFLICT (cart_id, product_id)
         DO UPDATE SET
           quantity = EXCLUDED.quantity,
           unit_price = EXCLUDED.unit_price,
           subtotal = EXCLUDED.subtotal,
           updated_at = NOW()`,
        [cart.id, prodId, prod.name, nextQty, unitPrice, lineSubtotal, notes || null]
      );
    }

    await recalculateCartTotals(client, cart.id);
    await client.query("COMMIT");

    const data = await fetchCartData(pool, cart.id);
    return res.json({ success: true, message: "Item added to cart", ...data });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/cart/items/:productId
 * Updates the quantity of a specific item in the cart.
 */
router.patch("/items/:productId", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customer = await resolveCustomer(req);
    const sessionId = req.body.sessionId || req.headers["x-session-id"] || req.query.session_id || null;
    const prodId = parseInt(req.params.productId, 10);
    const requestedQty = parseInt(req.body.quantity, 10);

    if (!prodId || isNaN(prodId)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Valid productId required" });
    }

    if (isNaN(requestedQty)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Valid quantity required" });
    }

    const cart = await getOrCreateCart(client, customer?.id || null, sessionId, false);
    if (!cart) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Active cart not found" });
    }

    if (requestedQty <= 0) {
      await client.query(
        `DELETE FROM customer_cart_items WHERE cart_id = $1 AND product_id = $2`,
        [cart.id, prodId]
      );
    } else {
      // Check product stock and price
      const prodRes = await client.query(
        `SELECT id, price, unit_price, stock, stock_quantity FROM products WHERE id = $1`,
        [prodId]
      );
      if (!prodRes.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Product not found" });
      }

      const prod = prodRes.rows[0];
      const effStock = Math.max(Number(prod.stock_quantity || 0), Number(prod.stock || 0));
      const unitPrice = parseFloat(prod.price != null ? prod.price : prod.unit_price || 0);
      const safeQty = effStock > 0 ? Math.min(requestedQty, effStock) : requestedQty;
      const subtotal = unitPrice * safeQty;

      await client.query(
        `UPDATE customer_cart_items
         SET quantity = $1, unit_price = $2, subtotal = $3, updated_at = NOW()
         WHERE cart_id = $4 AND product_id = $5`,
        [safeQty, unitPrice, subtotal, cart.id, prodId]
      );
    }

    await recalculateCartTotals(client, cart.id);
    await client.query("COMMIT");

    const data = await fetchCartData(pool, cart.id);
    return res.json({ success: true, message: "Cart updated", ...data });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// Also support PUT /items/:productId
router.put("/items/:productId", (req, res, next) => {
  return router.handle(Object.assign(req, { method: "PATCH" }), res, next);
});

/**
 * DELETE /api/cart/items/:productId
 * Removes a specific product from the cart.
 */
router.delete("/items/:productId", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customer = await resolveCustomer(req);
    const sessionId = req.headers["x-session-id"] || req.query.session_id || null;
    const prodId = parseInt(req.params.productId, 10);

    if (!prodId || isNaN(prodId)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Valid productId required" });
    }

    const cart = await getOrCreateCart(client, customer?.id || null, sessionId, false);
    if (!cart) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Cart not found" });
    }

    await client.query(
      `DELETE FROM customer_cart_items WHERE cart_id = $1 AND product_id = $2`,
      [cart.id, prodId]
    );

    await recalculateCartTotals(client, cart.id);
    await client.query("COMMIT");

    const data = await fetchCartData(pool, cart.id);
    return res.json({ success: true, message: "Item removed from cart", ...data });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/cart
 * Clears all items in the customer's active cart.
 */
router.delete("/", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customer = await resolveCustomer(req);
    const sessionId = req.headers["x-session-id"] || req.query.session_id || null;

    const cart = await getOrCreateCart(client, customer?.id || null, sessionId, false);
    if (!cart) {
      await client.query("ROLLBACK");
      return res.json({ success: true, message: "Cart already empty", cart: null, items: [] });
    }

    await client.query(`DELETE FROM customer_cart_items WHERE cart_id = $1`, [cart.id]);
    await client.query(
      `UPDATE customer_carts
       SET total = 0, item_count = 0, coupon_id = NULL, updated_at = NOW()
       WHERE id = $1`,
      [cart.id]
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      message: "Cart cleared",
      cart: { ...cart, total: 0, item_count: 0 },
      items: [],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /api/cart/sync
 * Merges local device items into the user's persistent backend cart.
 * Ideal for when a user logs in with an existing local cart or switches devices.
 */
router.post(["/sync", "/merge"], async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customer = await resolveCustomer(req);
    const sessionId = req.body.sessionId || req.headers["x-session-id"] || req.query.session_id || null;
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];

    if (!customer && !sessionId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Authentication or sessionId required to sync cart" });
    }

    const cart = await getOrCreateCart(client, customer?.id || null, sessionId, true);

    if (rawItems.length > 0) {
      for (const item of rawItems) {
        const prodId = parseInt(item.productId || item.product?.id || item.id, 10);
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        if (!prodId || isNaN(prodId)) continue;

        const prodRes = await client.query(
          `SELECT id, name, price, unit_price, stock, stock_quantity, status
           FROM products WHERE id = $1`,
          [prodId]
        );
        if (!prodRes.rows.length || prodRes.rows[0].status === "inactive") continue;

        const prod = prodRes.rows[0];
        const effStock = Math.max(Number(prod.stock_quantity || 0), Number(prod.stock || 0));
        const unitPrice = parseFloat(prod.price != null ? prod.price : prod.unit_price || 0);

        const existingRes = await client.query(
          `SELECT id, quantity FROM customer_cart_items WHERE cart_id = $1 AND product_id = $2`,
          [cart.id, prodId]
        );

        let finalQty;
        if (existingRes.rows.length) {
          // If already in DB, take whichever quantity is higher to ensure no loss
          finalQty = Math.max(existingRes.rows[0].quantity, qty);
        } else {
          finalQty = qty;
        }

        if (effStock > 0 && finalQty > effStock) {
          finalQty = effStock;
        }

        const subtotal = unitPrice * finalQty;

        if (existingRes.rows.length) {
          await client.query(
            `UPDATE customer_cart_items
             SET quantity = $1, unit_price = $2, subtotal = $3, updated_at = NOW()
             WHERE id = $4`,
            [finalQty, unitPrice, subtotal, existingRes.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO customer_cart_items
               (cart_id, product_id, product_name, quantity, unit_price, subtotal, notes, source, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'web', NOW(), NOW())
             ON CONFLICT (cart_id, product_id)
             DO UPDATE SET
               quantity = EXCLUDED.quantity,
               unit_price = EXCLUDED.unit_price,
               subtotal = EXCLUDED.subtotal,
               updated_at = NOW()`,
            [cart.id, prodId, prod.name, finalQty, unitPrice, subtotal, item.notes || null]
          );
        }
      }
    }

    await recalculateCartTotals(client, cart.id);
    await client.query("COMMIT");

    const data = await fetchCartData(pool, cart.id);
    return res.json({ success: true, message: "Cart synchronized", ...data });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /api/cart/notify
 * Webhook for AI Chef / external integrations.
 */
router.post("/notify", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customer = await resolveCustomer(req);
    let items = req.body.items;
    if (!items && req.body.product_id) {
      items = [{ product_id: req.body.product_id, quantity: req.body.quantity || 1, notes: req.body.notes }];
    }
    if (!items?.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No items provided" });
    }

    const sessionId = req.body.session_id || `guest_${Date.now()}`;
    const cart = await getOrCreateCart(client, customer?.id || req.body.customer_id || null, sessionId, true);

    const addedItems = [];
    for (const item of items) {
      const prodId = parseInt(item.product_id || item.productId, 10);
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      if (!prodId) continue;

      const prodRes = await client.query(
        `SELECT id, name, price, unit_price, stock, stock_quantity, status FROM products WHERE id = $1`,
        [prodId]
      );
      if (!prodRes.rows.length || prodRes.rows[0].status === "inactive") continue;

      const prod = prodRes.rows[0];
      const effStock = Math.max(Number(prod.stock_quantity || 0), Number(prod.stock || 0));
      const unitPrice = parseFloat(prod.price != null ? prod.price : prod.unit_price || 0);

      const existing = await client.query(
        `SELECT id, quantity FROM customer_cart_items WHERE cart_id = $1 AND product_id = $2`,
        [cart.id, prodId]
      );

      let finalQty = qty;
      if (existing.rows.length) {
        finalQty = existing.rows[0].quantity + qty;
      }
      if (effStock > 0 && finalQty > effStock) {
        finalQty = effStock;
      }
      const subtotal = unitPrice * finalQty;

      if (existing.rows.length) {
        await client.query(
          `UPDATE customer_cart_items
           SET quantity = $1, unit_price = $2, subtotal = $3, updated_at = NOW()
           WHERE id = $4`,
          [finalQty, unitPrice, subtotal, existing.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO customer_cart_items
             (cart_id, product_id, product_name, quantity, unit_price, subtotal, notes, source, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai_chef', NOW(), NOW())
           ON CONFLICT (cart_id, product_id)
           DO UPDATE SET
             quantity = EXCLUDED.quantity,
             unit_price = EXCLUDED.unit_price,
             subtotal = EXCLUDED.subtotal,
             updated_at = NOW()`,
          [cart.id, prodId, prod.name, finalQty, unitPrice, subtotal, item.notes || null]
        );
      }
      addedItems.push({ product_id: prodId, name: prod.name, quantity: finalQty, unit_price: unitPrice });
    }

    await recalculateCartTotals(client, cart.id);
    await client.query("COMMIT");

    const data = await fetchCartData(pool, cart.id);
    return res.json({
      success: true,
      message: `${addedItems.length} item(s) added to cart`,
      cart_id: cart.id,
      items_added: addedItems,
      ...data,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
