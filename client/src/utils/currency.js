export const NAIRA_PER_UNIT = 1;

/**
 * Returns the effective price in Naira.
 * Prices are stored in plain Naira (e.g. ₦360, ₦1,440, ₦6,960).
 */
export function getNairaPrice(rawPrice) {
  const p = Number(rawPrice || 0);
  if (!Number.isFinite(p) || p <= 0) return 0;
  return Math.round(p);
}