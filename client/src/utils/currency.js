export const NAIRA_PER_UNIT = 1500;

/**
 * Returns the effective price in Naira.
 * Handles both legacy scaled base units (e.g. 2.8 -> ₦4,200)
 * and direct Naira inputs (e.g. 5600 -> ₦5,600, 13900 -> ₦13,900).
 */
export function getNairaPrice(rawPrice) {
  const p = Number(rawPrice || 0);
  if (!Number.isFinite(p) || p <= 0) return 0;
  if (p < 100) {
    return Math.round(p * NAIRA_PER_UNIT);
  }
  return Math.round(p);
}