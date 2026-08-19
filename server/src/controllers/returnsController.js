const pool = require("../db/pool");
const { clampLimit } = require("../utils/pagination");

// Ensure return_items table exists (runs once on first call, safe to repeat)
async function ensureReturnItemsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS return_items (
      id                SERIAL PRIMARY KEY,
      return_id         INTEGER NOT NULL,
      product_id        INTEGER NOT NULL,
      product_name      VARCHAR(255),
      ordered_quantity  INTEGER NOT NULL,
      returned_quantity INTEGER NOT NULL,
      condition         VARCHAR(30) NOT NULL,
      remarks           TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);
}

const VALID_REASONS    = ["damaged", "wrong_item", "quality", "changed_mind", "other"];
const VALID_CONDITIONS = ["reusable", "damaged", "partial_goods"];

const submitReturn = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { order_id, reason, description, items } = req.body;

    // ── Validate reason ──────────────────────────────────────────
    if (!VALID_REASONS.includes(reason))
      return res.status(400).json({ message: "Invalid reason" });

    if (reason === "other" && !description?.trim())
      return res.status(400).json({ message: "Please specify your reason when selecting 'Other'" });

    // ── Validate items array ─────────────────────────────────────
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "At least one item must be selected for return" });

    for (const item of items) {
      if (!item.product_id)
        return res.status(400).json({ message: "Product ID is required for each item" });
      if (!item.returned_quantity || item.returned_quantity <= 0)
        return res.status(400).json({ message: `Returned quantity must be greater than 0 for ${item.product_name || "an item"}` });
      if (!VALID_CONDITIONS.includes(item.condition))
        return res.status(400).json({ message: `Invalid condition for ${item.product_name || "an item"}. Must be reusable, damaged, or partial_goods` });
    }

    // ── Verify order belongs to user and is delivered ────────────
    const order = await pool.query(
      "SELECT * FROM orders WHERE id=$1 AND user_id=$2",
      [order_id, req.user.id]
    );
    if (!order.rows.length)
      return res.status(404).json({ message: "Order not found" });
    if (order.rows[0].status !== "delivered")
      return res.status(400).json({ message: "Only delivered orders can be returned" });

    // ── Verify each returned item actually belongs to this order, and cap
    // the returned quantity at what the order really contains — the client
    // can send whatever `ordered_quantity` it wants, so that field is never
    // trusted for the actual limit check.
    const realItems = await pool.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id=$1",
      [order_id]
    );
    const realQtyByProduct = new Map(realItems.rows.map((r) => [String(r.product_id), r.quantity]));
    for (const item of items) {
      const orderedQty = realQtyByProduct.get(String(item.product_id));
      if (orderedQty === undefined)
        return res.status(400).json({ message: `${item.product_name || "This item"} was not part of order ${order_id}` });
      if (item.returned_quantity > orderedQty)
        return res.status(400).json({ message: `Returned quantity cannot exceed the ${orderedQty} ordered for ${item.product_name || "this item"}` });
    }

    // ── 7-day return window ──────────────────────────────────────
    // Counted from delivery (updated_at, bumped when status flips to
    // 'delivered'), not order placement (created_at) — matches the error
    // message below and the client's own eligibility check (ReturnsPage.jsx,
    // OrderDetailPage.jsx), which was already using updated_at. An order that
    // takes longer than 7 days to arrive was previously already ineligible
    // for return the moment it was delivered.
    const daysDiff = (Date.now() - new Date(order.rows[0].updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 7)
      return res.status(400).json({ message: "Returns must be requested within 7 days of delivery" });

    await client.query("BEGIN");
    await ensureReturnItemsTable(client);

    // ── Insert return header ─────────────────────────────────────
    // product_id / quantity kept null for multi-item returns
    const result = await client.query(
      `INSERT INTO returns (order_id, user_id, product_id, quantity, reason, description)
       VALUES ($1, $2, NULL, NULL, $3, $4) RETURNING id`,
      [order_id, req.user.id, reason, description?.trim() || ""]
    );
    const returnId = result.rows[0].id;

    // ── Insert individual items ──────────────────────────────────
    for (const item of items) {
      await client.query(
        `INSERT INTO return_items
           (return_id, product_id, product_name, ordered_quantity, returned_quantity, condition, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          returnId,
          item.product_id,
          item.product_name  || "",
          realQtyByProduct.get(String(item.product_id)),
          item.returned_quantity,
          item.condition,
          item.remarks?.trim() || null,
        ]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({
      message:  "Return request submitted! We'll review within 24 hours.",
      returnId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

const getUserReturns = async (req, res, next) => {
  try {
    const returns = await pool.query(
      `SELECT r.* FROM returns r WHERE r.user_id=$1 ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    if (!returns.rows.length) return res.json({ returns: [] });

    const returnIds = returns.rows.map((r) => r.id);
    const items = await pool.query(
      `SELECT * FROM return_items WHERE return_id = ANY($1::int[]) ORDER BY id`,
      [returnIds]
    ).catch(() => ({ rows: [] })); // graceful if table missing

    const itemsMap = {};
    for (const item of items.rows) {
      if (!itemsMap[item.return_id]) itemsMap[item.return_id] = [];
      itemsMap[item.return_id].push(item);
    }

    const list = returns.rows.map((r) => ({ ...r, items: itemsMap[r.id] || [] }));
    res.json({ returns: list });
  } catch (err) {
    next(err);
  }
};

const getAllReturns = async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 20 } = req.query;
    const limit = clampLimit(limitRaw, 20);
    const offset = (parseInt(page) - 1) * limit;

    const countRes = await pool.query("SELECT COUNT(*) FROM returns");
    const returns = await pool.query(
      `SELECT r.*, u.name AS customer_name, u.email AS customer_email
       FROM returns r
       LEFT JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const total = parseInt(countRes.rows[0].count);
    if (!returns.rows.length) return res.json({ returns: [], total, page: parseInt(page), pages: Math.ceil(total / limit) });

    const returnIds = returns.rows.map((r) => r.id);
    const items = await pool.query(
      `SELECT * FROM return_items WHERE return_id = ANY($1::int[]) ORDER BY id`,
      [returnIds]
    ).catch(() => ({ rows: [] }));

    const itemsMap = {};
    for (const item of items.rows) {
      if (!itemsMap[item.return_id]) itemsMap[item.return_id] = [];
      itemsMap[item.return_id].push(item);
    }

    const list = returns.rows.map((r) => ({ ...r, items: itemsMap[r.id] || [] }));
    res.json({ returns: list, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const RETURN_STATUSES = ["pending", "approved", "rejected", "resolved"];

const updateReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    if (status && !RETURN_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${RETURN_STATUSES.join(", ")}` });
    }
    const result = await pool.query(
      "UPDATE returns SET status=COALESCE($1,status), resolution=$2, resolved_at=NOW() WHERE id=$3 RETURNING id",
      [status || null, resolution, id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Return not found" });
    res.json({ message: "Return updated" });
  } catch (err) {
    next(err);
  }
};

module.exports = { submitReturn, getUserReturns, getAllReturns, updateReturn };
