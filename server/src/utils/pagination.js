// Clamps a query-string `limit` to a sane range so a caller can't force an
// unbounded/huge result set (e.g. ?limit=999999999) against admin list
// endpoints. Mirrors the page/limit clamping already used in productsController.js.
function clampLimit(value, fallback, max = 200) {
  const n = parseInt(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

module.exports = { clampLimit };
