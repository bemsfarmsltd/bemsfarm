// ================================================================
// ZOHO IMS INTEGRATION — BemsFarms Backend
// File: server/src/routes/zoho.js
//
// This skeleton handles:
// 1. POST /api/zoho/webhook  — receives sale events from Zoho Inventory
//    when a physical store sale is recorded on the IMS terminal
// 2. GET  /api/zoho/sync     — manual trigger to pull latest stock from Zoho
// 3. GET  /api/zoho/reconcile — admin reconciliation view (online + physical)
//
// SETUP REQUIRED (once you have Zoho credentials):
// Add to Render environment variables:
//   ZOHO_CLIENT_ID=...
//   ZOHO_CLIENT_SECRET=...
//   ZOHO_REFRESH_TOKEN=...
//   ZOHO_ORGANIZATION_ID=...
//   ZOHO_WEBHOOK_SECRET=...  (a secret string you define in Zoho webhook settings)
//
// In Zoho Inventory → Settings → Webhooks → New Webhook:
//   URL: https://bemsfarms-api.onrender.com/api/zoho/webhook
//   Events: Sales Order Created, Invoice Created
//   Secret: (same as ZOHO_WEBHOOK_SECRET above)
// ================================================================

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const crypto = require("crypto");

// ── ZOHO TOKEN MANAGEMENT ────────────────────────────────────────
// Zoho uses OAuth2. The access token expires every hour.
// We refresh it automatically using the stored refresh token.

let zohoAccessToken = null;
let tokenExpiresAt = 0;

async function getZohoToken() {
  if (zohoAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return zohoAccessToken; // Still valid
  }

  if (!process.env.ZOHO_CLIENT_ID) {
    throw new Error(
      "Zoho credentials not configured — set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN in environment",
    );
  }

  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: "refresh_token",
  });

  const res = await fetch(
    `https://accounts.zoho.com/oauth/v2/token?${params}`,
    {
      method: "POST",
    },
  );

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to get Zoho access token: " + JSON.stringify(data));
  }

  zohoAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  console.log("✅ Zoho token refreshed");
  return zohoAccessToken;
}

// ── ZOHO API HELPER ──────────────────────────────────────────────
async function zohoGet(path) {
  const token = await getZohoToken();
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  const res = await fetch(
    `https://inventory.zoho.com/api/v1/${path}?organization_id=${orgId}`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } },
  );
  if (!res.ok) throw new Error(`Zoho API error ${res.status}: ${path}`);
  return res.json();
}

// ── WEBHOOK SIGNATURE VERIFICATION ──────────────────────────────
// Verifies the request actually came from Zoho, not an attacker.
function verifyZohoSignature(rawBody, signature) {
  if (!process.env.ZOHO_WEBHOOK_SECRET) return true; // Skip if not configured yet
  const expected = crypto
    .createHmac("sha256", process.env.ZOHO_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex"),
  );
}

// ═══════════════════════════════════════════════════════════════
// ROUTE 1: Zoho webhook receiver
// Zoho calls this when a sale is recorded on the IMS terminal
// (physical store flow from your architecture diagram)
//
// Flow:
//   Store staff scans items on IMS terminal (Zoho)
//   → Customer pays cash/card
//   → Zoho records the sale → fires this webhook
//   → We decrement stock in our DB
//   → We write a physical_sale record to the orders table
// ═══════════════════════════════════════════════════════════════
router.post(
  "/webhook",
  express.raw({ type: "application/json" }), // Raw body for signature check
  async (req, res) => {
    try {
      const signature = req.headers["x-zoho-signature"] || "";
      const rawBody = req.body;

      if (!verifyZohoSignature(rawBody, signature)) {
        console.warn("⚠️ Zoho webhook signature mismatch — rejected");
        return res.status(401).json({ error: "Invalid signature" });
      }

      const event = JSON.parse(rawBody.toString());
      console.log("📦 Zoho webhook received:", event.event_type || "unknown");

      // Handle sale events (invoice or sales order creation = a physical sale)
      if (
        event.event_type === "invoice_created" ||
        event.event_type === "salesorder_created"
      ) {
        await handleZohoSale(event);
      }

      // Always acknowledge quickly — Zoho retries if no 200 within 5s
      res.json({ received: true });
    } catch (err) {
      console.error("❌ Zoho webhook error:", err.message);
      // Still return 200 to prevent Zoho retrying a bad payload
      res.json({ received: true, error: err.message });
    }
  },
);

async function handleZohoSale(event) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const zohoOrderId =
      event.salesorder_id || event.invoice_id || "ZOHO-" + Date.now();
    const lineItems = event.line_items || [];
    const totalAmount = parseFloat(event.total || 0);
    const salesperson = event.salesperson_name || "In-store";

    console.log(
      `📍 Processing Zoho physical sale: ${zohoOrderId} — ${lineItems.length} items, ₦${totalAmount}`,
    );

    // 1. Write to orders table as a physical_sale type
    const orderId = "BF-PHYS-" + Date.now().toString(36).toUpperCase();
    await client.query(
      `INSERT INTO orders
         (id, user_id, total, status, payment_method, payment_ref, address,
          created_at, tracking_status, notes, source)
       VALUES ($1, NULL, $2, 'delivered', 'physical_store', $3, 'Physical Store', NOW(), 'delivered', $4, 'Physical Store (POS)')
       ON CONFLICT DO NOTHING`,
      [
        orderId,
        totalAmount,
        zohoOrderId,
        `Physical sale via Zoho IMS. Salesperson: ${salesperson}`,
      ],
    );

    // 2. Decrement stock for each item sold
    for (const item of lineItems) {
      const itemName = item.name || item.description || "";
      const qty = parseInt(item.quantity || 1);

      // Find matching product by name (fuzzy)
      const product = await client.query(
        `SELECT id, name, stock FROM products
         WHERE LOWER(name) LIKE LOWER($1)
         LIMIT 1`,
        [`%${itemName.split(" ")[0]}%`], // Match on first word for flexibility
      );

      if (product.rows.length > 0) {
        const p = product.rows[0];
        await client.query(
          `UPDATE products
           SET stock = GREATEST(0, COALESCE(stock, 100) - $1)
           WHERE id = $2`,
          [qty, p.id],
        );

        // Write order_item record
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4)`,
          [orderId, p.id, qty, parseFloat(item.rate || item.price || 0) / 1500],
        );

        console.log(
          `  ✅ Stock decremented: ${p.name} -${qty} (Zoho item: "${itemName}")`,
        );
      } else {
        console.warn(
          `  ⚠️ No matching product found for Zoho item: "${itemName}"`,
        );
      }
    }

    await client.query("COMMIT");
    console.log(`✅ Zoho physical sale processed: ${orderId}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════
// ROUTE 2: Manual stock sync from Zoho
// Admin can trigger this to pull current inventory from Zoho
// and reconcile it with the BemsFarms database
// ═══════════════════════════════════════════════════════════════
router.get("/sync", async (req, res) => {
  try {
    if (!process.env.ZOHO_CLIENT_ID) {
      return res.status(503).json({
        message:
          "Zoho not configured. Add ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORGANIZATION_ID to environment variables.",
        configured: false,
      });
    }

    console.log("🔄 Starting Zoho stock sync...");

    const data = await zohoGet("items?status=active&per_page=200");
    const zohoItems = data.items || [];

    const updates = [];
    for (const item of zohoItems) {
      // Match by name
      const product = await pool.query(
        `SELECT id, name, stock FROM products
         WHERE LOWER(name) LIKE LOWER($1) LIMIT 1`,
        [`%${item.name.split(" ")[0]}%`],
      );

      if (product.rows.length > 0) {
        const p = product.rows[0];
        const zohoStock = parseInt(item.actual_available_stock || 0);

        await pool.query(`UPDATE products SET stock = $1 WHERE id = $2`, [
          zohoStock,
          p.id,
        ]);

        updates.push({
          product: p.name,
          zoho_item: item.name,
          old_stock: p.stock,
          new_stock: zohoStock,
        });
      }
    }

    console.log(`✅ Zoho sync complete: ${updates.length} products updated`);
    res.json({
      success: true,
      items_from_zoho: zohoItems.length,
      products_updated: updates.length,
      updates,
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Zoho sync error:", err.message);
    res.status(500).json({ message: "Sync failed: " + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ROUTE 3: Reconciliation dashboard data
// Returns side-by-side view of online orders vs physical sales
// for the admin reconciliation dashboard
// ═══════════════════════════════════════════════════════════════
router.get("/reconcile", async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate =
      from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = to || new Date().toISOString();

    const [online, physical, lowStock] = await Promise.all([
      // Online orders (via Paystack/web)
      pool.query(
        `SELECT
           COUNT(*) as count,
           COALESCE(SUM(total), 0) as revenue,
           COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
           COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
         FROM orders
         WHERE payment_method != 'physical_store'
           AND created_at BETWEEN $1 AND $2`,
        [fromDate, toDate],
      ),
      // Physical store sales (via Zoho IMS)
      pool.query(
        `SELECT
           COUNT(*) as count,
           COALESCE(SUM(total), 0) as revenue
         FROM orders
         WHERE payment_method = 'physical_store'
           AND created_at BETWEEN $1 AND $2`,
        [fromDate, toDate],
      ),
      // Low stock alerts
      pool.query(
        `SELECT id, name, stock
         FROM products
         WHERE COALESCE(stock, 100) <= 10
         ORDER BY stock ASC LIMIT 10`,
      ),
    ]);

    const onlineRow = online.rows[0];
    const physicalRow = physical.rows[0];

    res.json({
      period: { from: fromDate, to: toDate },
      online: {
        orders: parseInt(onlineRow.count),
        revenue: parseFloat(onlineRow.revenue),
        delivered: parseInt(onlineRow.delivered),
        cancelled: parseInt(onlineRow.cancelled),
      },
      physical_store: {
        sales: parseInt(physicalRow.count),
        revenue: parseFloat(physicalRow.revenue),
      },
      combined_revenue:
        parseFloat(onlineRow.revenue) + parseFloat(physicalRow.revenue),
      low_stock_alerts: lowStock.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Reconciliation error:", err.message);
    res.status(500).json({ message: "Reconciliation failed: " + err.message });
  }
});

// ── ZOHO CONNECTION TEST ─────────────────────────────────────────
router.get("/status", async (req, res) => {
  const configured = !!(
    process.env.ZOHO_CLIENT_ID &&
    process.env.ZOHO_CLIENT_SECRET &&
    process.env.ZOHO_REFRESH_TOKEN &&
    process.env.ZOHO_ORGANIZATION_ID
  );

  if (!configured) {
    return res.json({
      configured: false,
      message:
        "Zoho credentials not set. Add environment variables to proceed.",
      required_vars: [
        "ZOHO_CLIENT_ID",
        "ZOHO_CLIENT_SECRET",
        "ZOHO_REFRESH_TOKEN",
        "ZOHO_ORGANIZATION_ID",
        "ZOHO_WEBHOOK_SECRET (recommended)",
      ],
    });
  }

  try {
    await getZohoToken();
    res.json({
      configured: true,
      connected: true,
      message: "Zoho connection OK",
    });
  } catch (err) {
    res.json({ configured: true, connected: false, error: err.message });
  }
});

module.exports = router;
