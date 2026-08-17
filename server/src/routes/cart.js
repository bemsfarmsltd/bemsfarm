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
const { NAIRA_PER_UNIT } = require("../utils/currency");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is not defined!");
}

// Optional auth — resolves user from Bearer token, returns null for guests
// (or for a suspended/deactivated/session-revoked one — same checks
// protect() applies, which this hand-rolled verifier previously skipped
// entirely, letting a suspended account or a token invalidated by a
// password reset keep adding/removing cart items indefinitely).
async function resolveCustomer(req) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    const decoded = jwt.verify(auth.split(" ")[1], JWT_SECRET);

    // customers (shop) and users (admin/website) are separate identity
    // tables — check whichever one the token actually belongs to.
    const customer = await pool.query(
      "SELECT id, name, email, status FROM customers WHERE id=$1",
      [decoded.id]
    );
    if (customer.rows.length) {
      const c = customer.rows[0];
      if (c.status === "suspended" || c.status === "inactive") return null;
      return { id: c.id, name: c.name, email: c.email };
    }

    const user = await pool.query(
      "SELECT id, name, email, status, token_version FROM users WHERE id=$1",
      [decoded.id]
    );
    if (!user.rows.length) return null;
    const u = user.rows[0];
    if (u.status === "suspended" || u.status === "inactive") return null;
    const tokenVersion = decoded.tokenVersion || 0;
    if (tokenVersion !== u.token_version) return null;
    return { id: u.id, name: u.name, email: u.email };
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
router.post("/notify", async (req, res, next) => {
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
      await client.query("ROLLBACK");
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

    // ── Upsert each item (With Smart Resolve and Self-Healing Catalogue Fallback) ──
    const addedItems = [];
    for (const item of items) {
      const { product_id, quantity = 1, notes } = item;
      if (!product_id) continue;

      let product_id_int = parseInt(product_id);
      let prod;
      let isIdQuery = Number.isInteger(product_id_int) && String(product_id) === String(product_id_int);

      if (isIdQuery) {
        prod = await client.query(
          `SELECT id, name, price, unit_price, image_url, status FROM products WHERE id=$1`,
          [product_id_int]
        );
      } else {
        const cleanName = String(product_id).trim();
        prod = await client.query(
          `SELECT id, name, price, unit_price, image_url, status 
           FROM products 
           WHERE LOWER(name) = LOWER($1) OR LOWER(name) LIKE LOWER($2)
           ORDER BY CASE WHEN LOWER(name) = LOWER($1) THEN 1 ELSE 2 END
           LIMIT 1`,
          [cleanName, `%${cleanName}%`]
        );

        if (!prod.rows.length) {
          const parts = cleanName.split(/\s+/).filter(p => p.length > 2);
          if (parts.length > 0) {
            const likePatterns = parts.map(p => `%${p}%`);
            prod = await client.query(
              `SELECT id, name, price, unit_price, image_url, status 
               FROM products 
               WHERE (${parts.map((_, idx) => `LOWER(name) LIKE LOWER($${idx + 1})`).join(" OR ")})
               LIMIT 1`,
              likePatterns
            );
          }
        }
      }

      // SELF-HEALING FALLBACK: If not found in products table, check the catalogue table
      if ((!prod || !prod.rows.length) && !isIdQuery) {
        const cleanName = String(product_id).trim();
        let catalogueRow = null;
        
        const catRes = await client.query(
          `SELECT * FROM catalogue 
           WHERE LOWER(product_name) = LOWER($1) OR LOWER(product_name) LIKE LOWER($2)
           ORDER BY CASE WHEN LOWER(product_name) = LOWER($1) THEN 1 ELSE 2 END
           LIMIT 1`,
          [cleanName, `%${cleanName}%`]
        );
        
        if (catRes.rows.length) {
          catalogueRow = catRes.rows[0];
        } else {
          const parts = cleanName.split(/\s+/).filter(p => p.length > 2);
          if (parts.length > 0) {
            const likePatterns = parts.map(p => `%${p}%`);
            const catRes2 = await client.query(
              `SELECT * FROM catalogue 
               WHERE (${parts.map((_, idx) => `LOWER(product_name) LIKE LOWER($${idx + 1})`).join(" OR ")})
               LIMIT 1`,
              likePatterns
            );
            if (catRes2.rows.length) {
              catalogueRow = catRes2.rows[0];
            }
          }
        }

        if (catalogueRow) {
          let categoryId = 1;
          const catMap = {
            "grains": 1, "cereals": 1,
            "vegetables": 2, "vegetable": 2,
            "oils": 3, "oil": 3,
            "legumes": 4, "beans": 4,
            "tubers": 5, "roots": 5, "yam": 5,
            "spices": 6, "seasonings": 6, "seasoning": 6,
            "leafy": 7, "greens": 7,
            "fruits": 8, "fruit": 8
          };
          const catLower = String(catalogueRow.product_category || "").toLowerCase();
          for (const [key, id] of Object.entries(catMap)) {
            if (catLower.includes(key)) {
              categoryId = id;
              break;
            }
          }

          const priceInNaira = parseFloat(catalogueRow.unit_price || 0);
          const priceInUsd = priceInNaira / NAIRA_PER_UNIT;

          const stockQty = catalogueRow.stock_qty || 100;
          const insertRes = await client.query(
            `INSERT INTO products
               (name, price, unit_price, unit, description, sku, status, stock, stock_quantity, category_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $7, $8, NOW(), NOW())
             RETURNING id, name, price, unit_price, image_url, status`,
            [
              catalogueRow.product_name,
              priceInUsd,
              priceInUsd,
              catalogueRow.selling_unit || "1 kg",
              `Farm fresh ingredient sourced by Chef Bems AI.`,
              catalogueRow.sku,
              stockQty,
              categoryId
            ]
          );

          if (insertRes.rows.length) {
            prod = insertRes;
            console.log(`✨ Dynamically self-healed product "${catalogueRow.product_name}" from catalogue into products table.`);
          }
        }
      }

      if (!prod || !prod.rows.length || prod.rows[0].status === 'inactive') continue;

      const product = prod.rows[0];
      const resolved_product_id = product.id;
      const price = parseFloat(product.unit_price || product.price || 0);
      const subtotal = price * quantity;

      // Upsert: if same product already in cart, increment quantity
      const existing = await client.query(
        `SELECT id, quantity FROM customer_cart_items WHERE cart_id=$1 AND product_id=$2`,
        [cartId, resolved_product_id]
      );

      if (existing.rows.length) {
        const newQty = existing.rows[0].quantity + parseInt(quantity);
        await client.query(
          `UPDATE customer_cart_items
           SET quantity=$1, subtotal=$2, updated_at=NOW()
           WHERE id=$3`,
          [newQty, price * newQty, existing.rows[0].id]
        );
        addedItems.push({ product_id: resolved_product_id, name: product.name, quantity: newQty, price, subtotal: price * newQty });
      } else {
        await client.query(
          `INSERT INTO customer_cart_items
             (cart_id, product_id, product_name, quantity, unit_price, subtotal,
              notes, source, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'ai_chef',NOW(),NOW())`,
          [cartId, resolved_product_id, product.name, quantity, price, subtotal, notes || null]
        );
        addedItems.push({ product_id: resolved_product_id, name: product.name, quantity, price, subtotal });
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

    // ── Update ai_conversations for super admin monitoring ────────────────────
    // Non-critical side effect — runs after COMMIT, on the pool (not the
    // now-released transactional client), so a failure here can never abort
    // or silently discard the cart save that already succeeded above. (It
    // used to run inside the transaction and swallow its own errors via
    // console.warn — but since Postgres treats COMMIT on an already-aborted
    // transaction as an implicit rollback with no client-visible error, a
    // failure here was silently discarding the entire cart/product save
    // while the API still reported success.)
    try {
      const cartSnapshotJson = JSON.stringify(cartItems.rows);
      const activeConv = await pool.query(
        `SELECT id FROM ai_conversations WHERE session_id = $1 LIMIT 1`,
        [session_id]
      );
      if (activeConv.rows.length) {
        await pool.query(
          `UPDATE ai_conversations
           SET cart_snapshot = $1,
               last_message_at = NOW()
           WHERE session_id = $2`,
          [cartSnapshotJson, session_id]
        );
      } else {
        await pool.query(
          `INSERT INTO ai_conversations
             (session_id, channel, customer_id, cart_snapshot, status, started_at, last_message_at)
           VALUES ($1, 'web', $2, $3, 'active', NOW(), NOW())`,
          [session_id, customer_id || null, cartSnapshotJson]
        );
      }
      console.log(`📡 Updated ai_conversations cart_snapshot notification for session: ${session_id}`);
    } catch (convErr) {
      console.warn("⚠️ Failed to update ai_conversations snapshot:", convErr.message);
    }

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
    next(err);
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET CART  ──  GET /api/cart
// Returns the current active cart for the customer/session.
// ════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res, next) => {
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
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UPDATE ITEM QUANTITY  ──  PATCH /api/cart/items/:itemId
// ════════════════════════════════════════════════════════════════════════════
router.patch("/items/:itemId", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { quantity } = req.body;
    if (quantity === undefined) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "quantity required" });
    }

    // Nothing previously checked that this item's cart belonged to the
    // caller — any client could mutate any other customer's cart item by
    // guessing/incrementing itemId. Resolve who's asking and require the
    // item's cart to match, the same way GET / and DELETE / already do.
    const customer   = await resolveCustomer(req);
    const session_id = req.body.session_id || req.query.session_id || req.headers["x-session-id"];
    const customer_id = customer?.id || null;

    const item = await client.query(
      `SELECT cci.*, cc.customer_id AS cart_customer_id, cc.session_id AS cart_session_id
       FROM customer_cart_items cci
       JOIN customer_carts cc ON cc.id = cci.cart_id
       WHERE cci.id=$1`,
      [req.params.itemId]
    );
    if (!item.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Item not found" });
    }
    const owned = item.rows[0].cart_customer_id != null
      ? item.rows[0].cart_customer_id === customer_id
      : session_id && item.rows[0].cart_session_id === session_id;
    if (!owned) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Not authorized to modify this cart item" });
    }

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
    next(err);
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// REMOVE ITEM  ──  DELETE /api/cart/items/:itemId
// ════════════════════════════════════════════════════════════════════════════
router.delete("/items/:itemId", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customer   = await resolveCustomer(req);
    const session_id = req.query.session_id || req.headers["x-session-id"];
    const customer_id = customer?.id || null;

    const existing = await client.query(
      `SELECT cci.id, cc.customer_id AS cart_customer_id, cc.session_id AS cart_session_id
       FROM customer_cart_items cci
       JOIN customer_carts cc ON cc.id = cci.cart_id
       WHERE cci.id=$1`,
      [req.params.itemId]
    );
    if (!existing.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Item not found" });
    }
    const owned = existing.rows[0].cart_customer_id != null
      ? existing.rows[0].cart_customer_id === customer_id
      : session_id && existing.rows[0].cart_session_id === session_id;
    if (!owned) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Not authorized to modify this cart item" });
    }

    const item = await client.query(
      "DELETE FROM customer_cart_items WHERE id=$1 RETURNING *", [req.params.itemId]
    );

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
    next(err);
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CLEAR CART  ──  DELETE /api/cart
// ════════════════════════════════════════════════════════════════════════════
router.delete("/", async (req, res, next) => {
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
    if (!cart.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "No active cart" });
    }

    await client.query("DELETE FROM customer_cart_items WHERE cart_id=$1", [cart.rows[0].id]);
    await client.query(
      "UPDATE customer_carts SET total=0, item_count=0, updated_at=NOW() WHERE id=$1",
      [cart.rows[0].id]
    );

    await client.query("COMMIT");
    res.json({ message: "Cart cleared" });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
