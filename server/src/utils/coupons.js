// utils/coupons.js
// Shared server-side coupon validation + discount computation, used by both
// the POS sale endpoint and customer checkout. A coupon code is never
// trusted to already carry a correct discount amount — it's always looked
// up and recomputed here from the coupons table.
async function validateCoupon(client, { code, subtotal, customerId, userId }) {
  const couponRes = await client.query(
    "SELECT * FROM coupons WHERE UPPER(code)=UPPER($1) FOR UPDATE",
    [code.trim()],
  );
  if (!couponRes.rows.length) {
    return { ok: false, message: "Invalid coupon code" };
  }
  const c = couponRes.rows[0];
  const now = new Date();

  if (!c.is_active) return { ok: false, message: "Coupon is not active" };
  if (c.start_date && new Date(c.start_date) > now) return { ok: false, message: "Coupon not yet valid" };
  if (c.end_date && new Date(c.end_date) < now) return { ok: false, message: "Coupon has expired" };
  if (c.usage_limit && c.used_count >= c.usage_limit) return { ok: false, message: "Coupon usage limit reached" };
  if (subtotal < parseFloat(c.min_order || 0)) {
    return { ok: false, message: `Minimum order amount is ₦${c.min_order}` };
  }

  // POS identifies a redeemer via customers.id; website checkout only has a
  // users.id (JWT) — the two tables aren't reliably linked, so both are
  // checked independently rather than assuming one implies the other.
  if ((customerId || userId) && c.per_user_limit) {
    const userUsage = await client.query(
      "SELECT COUNT(*) FROM coupon_usages WHERE coupon_id=$1 AND ((customer_id=$2 AND $2 IS NOT NULL) OR (user_id=$3 AND $3 IS NOT NULL))",
      [c.id, customerId || null, userId || null],
    );
    if (parseInt(userUsage.rows[0].count) >= c.per_user_limit) {
      return { ok: false, message: "You have already used this coupon" };
    }
  }

  let discount;
  if (c.type === "percentage") {
    discount = (subtotal * parseFloat(c.value)) / 100;
    if (c.max_discount) discount = Math.min(discount, parseFloat(c.max_discount));
  } else {
    discount = Math.min(parseFloat(c.value), subtotal);
  }

  return { ok: true, coupon: c, discount };
}

// Records that a coupon was used — call after the order/sale is committed
// to the same values validateCoupon returned. Anonymous/walk-in redemptions
// (neither id available) skip the usage row but still bump used_count so
// usage_limit is still enforced.
async function recordCouponUsage(client, { coupon, discount, customerId, userId, orderId }) {
  if (customerId || userId) {
    await client.query(
      "INSERT INTO coupon_usages (coupon_id, customer_id, user_id, order_id, discount_amount, discount_applied, used_at) VALUES ($1,$2,$3,$4,$5,$5,NOW())",
      [coupon.id, customerId || null, userId || null, orderId, discount],
    );
  }
  await client.query(
    "UPDATE coupons SET used_count=used_count+1, updated_at=NOW() WHERE id=$1",
    [coupon.id],
  );
}

module.exports = { validateCoupon, recordCouponUsage };