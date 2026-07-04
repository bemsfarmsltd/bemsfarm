// server/src/routes/cart.js
// Mounted at /api/cart in index.js
//
// Public cart operations for the customer-facing app.
// Handles AI Chef "Add to Cart" webhook and general cart management.
//
// Cart model:
//   customer_carts      — one active cart per customer/session
//   customer_cart_items — line items within a cart
// ───────────────────────────────────────────────────────────────────────────

const express  = require("express");
const router   = express.Router();
const pool     = require("../db/pool");
const jwt      = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "frutella_super_secret_key_change_in_production";

// Optional auth — resolves user from Bearer token, returns null for guests
async function resolveCustomer(req) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    const decoded = jwt.verify(auth.split(" ")[1], JWT_SECRET);

    // Check both users table (admin) and customers table (shop)
    const result = await pool.query(
      "SELECT id, name, email FROM customers WHERE id=$1 UNION ALL SELECT id, name, email FROM users WHERE id=$1 LIMIT 1",
      [decoded.id]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// AI CHEF "ADD TO CART" WEBHOOK
// POST /api/cart/notify
//
// Called when a user clicks "Add to Cart" from the AI chef chat.
// Accepts:
//   { session_id, customer_id?, items: [{ product_id, quantity, notes? }] }
// or single-item shorthand:
//   { session_id, product_id, quantity, notes? }
// ════════════════════════════════════════════════════════════════════════════
router.post("/notify", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customer = await resolveCustomer(req);

    // Normalise payload — support both single-item and items[]
    let items = req.body.items;
    if (!items && req.body.product_id) {
      items = [{ product_id: req.body.product_id, quantity: req.body.quantity || 1, notes: req.body.notes }];
    }
    if (!items?.length) {
      return res.status(400).json({ message: "No items provided" });
    }

    const session_id  = req.body.session_id || `guest_${Date.now()}`;
    const customer_id = customer?.id || req.body.customer_id || null;

    // ── Find or create active cart ──────────────────────────────────────────
    let cartRow = await client.query(
      `SELECT id FROM customer_carts
       WHERE status='active'
         AND (
           (customer_id IS NOT NULL AND customer_id = $1)
           OR (customer_id IS NULL AND session_id = $2)
         )
       ORDER BY created_at DESC LIMIT 1`,
      [customer_id, session_id]
    );

    let cartId;
    if (cartRow.rows.length) {
      cartId = cartRow.rows[0].id;
    } else {
      const newCart = await client.query(
        `INSERT INTO customer_carts (customer_id, session_id, status, source, created_at, updated_at)
         VALUES ($1,$2,'active','ai_chef',NOW(),NOW())
         RETURNING id`,
        [customer_id, session_id]
      );
      cartId = newCart.rows[0].id;
    }

    // ── Upsert each item ────────────────────────────────────────────────────
    const addedItems = [];
    for (const item of items) {
      const { product_id, quantity = 1, notes } = item;
      if (!product_id) continue;

      // Fetch product details
      const prod = await client.query(
        `SELECT id, name, price, unit_price, image_url, status FROM products WHERE id=$1`,
        [product_id]
      );
      if (!prod.rows.length || prod.rows[0].status === 'inactive') continue;

      const product  = prod.rows[0];
      const price    = parseFloat(product.unit_price || product.price || 0);
      const subtotal = price * quantity;

      // Upsert: if same product already in cart, increment quantity
      const existing = await client.query(
        `SELECT id, quantity FROM customer_cart_items WHERE cart_id=$1 AND product_id=$2`,
        [cartId, product_id]
      );

      if (existing.rows.length) {
        const newQty = existing.rows[0].quantity + parseInt(quantity);
        await client.query(
          `UPDATE customer_cart_items
           SET quantity=$1, subtotal=$2, updated_at=NOW()
           WHERE id=$3`,
          [newQty, price * newQty, existing.rows[0].id]
        );
        addedItems.push({ product_id, name: product.name, quantity: newQty, price, subtotal: price * newQty });
      } else {
        await client.query(
          `INSERT INTO customer_cart_items
             (cart_id, product_id, product_name, quantity, unit_price, subtotal,
              notes, source, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'ai_chef',NOW(),NOW())`,
          [cartId, product_id, product.name, quantity, price, subtotal, notes || null]
        );
        addedItems.push({ product_id, name: product.name, quantity, price, subtotal });
      }
    }

    // ── Recalculate cart totals ─────────────────────────────────────────────
    await client.query(
      `UPDATE customer_carts
       SET total = (
             SELECT COALESCE(SUM(subtotal),0) FROM customer_cart_items WHERE cart_id=$1
           ),
           item_count = (
             SELECT COALESCE(SUM(quantity),0) FROM customer_cart_items WHERE cart_id=$1
           ),
           updated_at = NOW()
       WHERE id=$1`,
      [cartId]
    );

    // ── Return updated cart ─────────────────────────────────────────────────
    const [cart, cartItems] = await Promise.all([
      client.query("SELECT * FROM customer_carts WHERE id=$1", [cartId]),
      client.query(
        `SELECT cci.*, p.image_url
         FROM customer_cart_items cci
         LEFT JOIN products p ON p.id = cci.product_id
         WHERE cci.cart_id=$1
         ORDER BY cci.created_at`,
        [cartId]
      ),
    ]);

    await client.query("COMMIT");

    res.json({
      success:     true,
      message:     `${addedItems.length} item(s) added to cart`,
      cart_id:     cartId,
      items_added: addedItems,
      cart: {
        ...cart.rows[0],
        items: cartItems.rows,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET CART  ──  GET /api/cart
// Returns the current active cart for the customer/session.
// ════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const customer  = await resolveCustomer(req);
    const session_id = req.query.session_id || req.headers["x-session-id"];
    const customer_id = customer?.id || null;

    if (!customer_id && !session_id) {
      return res.json({ cart: null, items: [] });
    }

    const cartRow = await pool.query(
      `SELECT * FROM customer_carts
       WHERE status='active'
         AND (
           (customer_id IS NOT NULL AND customer_id = $1)
           OR (customer_id IS NULL AND session_id = $2)
         )
       ORDER BY created_at DESC LIMIT 1`,
      [customer_id, session_id]
    );

    if (!cartRow.rows.length) return res.json({ cart: null, items: [] });

    const cart  = cartRow.rows[0];
    const items = await pool.query(
      `SELECT cci.*, p.image_url, p.status AS product_status
       FROM customer_cart_items cci
       LEFT JOIN products p ON p.id = cci.product_id
       WHERE cci.cart_id=$1
       ORDER BY cci.created_at`,
      [cart.id]
    );

    res.json({ cart, items: items.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UPDATE ITEM QUANTITY  ──  PATCH /api/cart/items/:itemId
// ════════════════════════════════════════════════════════════════════════════
router.patch("/items/:itemId", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { quantity } = req.body;
    if (quantity === undefined) return res.status(400).json({ message: "quantity required" });

    const item = await client.query(
      "SELECT * FROM customer_cart_items WHERE id=$1", [req.params.itemId]
    );
    if (!item.rows.length) return res.status(404).json({ message: "Item not found" });

    if (parseInt(quantity) <= 0) {
      // Remove item
      await client.query("DELETE FROM customer_cart_items WHERE id=$1", [req.params.itemId]);
    } else {
      const price = parseFloat(item.rows[0].unit_price || 0);
      await client.query(
        `UPDATE customer_cart_items SET quantity=$1, subtotal=$2, updated_at=NOW() WHERE id=$3`,
        [parseInt(quantity), price * parseInt(quantity), req.params.itemId]
      );
    }

    // Recalculate cart totals
    const cartId = item.rows[0].cart_id;
    await client.query(
      `UPDATE customer_carts
       SET total=(SELECT COALESCE(SUM(subtotal),0) FROM customer_cart_items WHERE cart_id=$1),
           item_count=(SELECT COALESCE(SUM(quantity),0) FROM customer_cart_items WHERE cart_id=$1),
           updated_at=NOW()
       WHERE id=$1`,
      [cartId]
    );

    await client.query("COMMIT");
    res.json({ message: "Cart updated" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// REMOVE ITEM  ──  DELETE /api/cart/items/:itemId
// ════════════════════════════════════════════════════════════════════════════
router.delete("/items/:itemId", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const item = await client.query(
      "DELETE FROM customer_cart_items WHERE id=$1 RETURNING *", [req.params.itemId]
    );
    if (!item.rows.length) return res.status(404).json({ message: "Item not found" });

    const cartId = item.rows[0].cart_id;
    await client.query(
      `UPDATE customer_carts
       SET total=(SELECT COALESCE(SUM(subtotal),0) FROM customer_cart_items WHERE cart_id=$1),
           item_count=(SELECT COALESCE(SUM(quantity),0) FROM customer_cart_items WHERE cart_id=$1),
           updated_at=NOW()
       WHERE id=$1`,
      [cartId]
    );

    await client.query("COMMIT");
    res.json({ message: "Item removed from cart" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CLEAR CART  ──  DELETE /api/cart
// ════════════════════════════════════════════════════════════════════════════
router.delete("/", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customer   = await resolveCustomer(req);
    const session_id = req.query.session_id || req.headers["x-session-id"];
    const customer_id = customer?.id || null;

    const cart = await client.query(
      `SELECT id FROM customer_carts WHERE status='active'
         AND ((customer_id=$1 AND $1 IS NOT NULL) OR (session_id=$2 AND $1 IS NULL))
       LIMIT 1`,
      [customer_id, session_id]
    );
    if (!cart.rows.length) return res.status(404).json({ message: "No active cart" });

    await client.query("DELETE FROM customer_cart_items WHERE cart_id=$1", [cart.rows[0].id]);
    await client.query(
      "UPDATE customer_carts SET total=0, item_count=0, updated_at=NOW() WHERE id=$1",
      [cart.rows[0].id]
    );

    await client.query("COMMIT");
    res.json({ message: "Cart cleared" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
