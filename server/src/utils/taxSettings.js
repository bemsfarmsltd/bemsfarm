// utils/taxSettings.js
// Reads the real tax config the admin sets in Settings → Tax, so POS/checkout
// VAT calculations actually reflect it instead of a hardcoded rate.
const pool = require("../db/pool");

async function getTaxSettings() {
  const result = await pool.query(
    "SELECT key, value FROM settings WHERE group_name='tax'"
  );
  const raw = {};
  result.rows.forEach((r) => { raw[r.key] = r.value; });

  return {
    enabled: raw.tax_enabled === "true",
    rate: parseFloat(raw.tax_rate ?? "7.5") || 0,
    inclusive: raw.tax_inclusive === "true",
    label: raw.tax_label || "VAT",
  };
}

// amount is the taxable base (subtotal - discount)
function computeTax(amount, taxSettings) {
  if (!taxSettings.enabled || amount <= 0) return 0;
  if (taxSettings.inclusive) {
    return Math.round(amount - amount / (1 + taxSettings.rate / 100));
  }
  return Math.round(amount * (taxSettings.rate / 100));
}

module.exports = { getTaxSettings, computeTax };