/**
 * Bems Farms Simplified Delivery Pricing Service
 * Formula:
 * - If distance is within base coverage (e.g. first 3 km), delivery fee = Base Zone Fee (e.g. ₦600).
 * - If trip exceeds base coverage, add (Extra KM * Rate Per KM).
 * - Always rounded to clean Naira increments (nearest ₦50/₦100) so customers never see weird change like ₦672.
 */

const ZONE_PRICING_DEFAULTS = {
  ZONE001: { base_fee: 600, base_distance_km: 3, per_km_rate: 80 },
  ZONE002: { base_fee: 1800, base_distance_km: 5, per_km_rate: 90 },
  ZONE003: { base_fee: 2500, base_distance_km: 15, per_km_rate: 60 },
  ZONE004: { base_fee: 3500, base_distance_km: 40, per_km_rate: 40 },
  ZONE005: { base_fee: 6000, base_distance_km: 150, per_km_rate: 15 },
  ZONE006: { base_fee: 35000, base_distance_km: 0, per_km_rate: 0 }
};

/**
 * Calculate delivery pricing for a zone and map distance
 * @param {Object} params
 * @param {Object} params.zone Matched delivery_zones database record
 * @param {number} params.distanceKm Actual map driving distance in km
 */
function calculateDeliveryPricing({
  zone = {},
  distanceKm = 0,
}) {
  const zoneId = zone.zone_id || 'ZONE001';
  const defaults = ZONE_PRICING_DEFAULTS[zoneId] || { base_fee: 600, base_distance_km: 3, per_km_rate: 80 };

  // 1. Base delivery fee for the zone (e.g. ₦600)
  const basePrice = zone.base_fee !== null && zone.base_fee !== undefined && !isNaN(Number(zone.base_fee))
    ? parseFloat(zone.base_fee)
    : (parseFloat(zone.delivery_fee) || defaults.base_fee);

  // 2. Base distance covered by the base fee (e.g. first 3 km)
  const baseDistanceKm = zone.base_distance_km !== null && zone.base_distance_km !== undefined && !isNaN(Number(zone.base_distance_km))
    ? parseFloat(zone.base_distance_km)
    : defaults.base_distance_km;

  // 3. Per-KM rate (e.g. ₦80/km, or 0 if flat rate)
  const isFlat = zone.pricing_type === 'flat' || zoneId === 'ZONE006';
  const perKmRate = isFlat
    ? 0
    : (zone.per_km_rate !== null && zone.per_km_rate !== undefined && !isNaN(Number(zone.per_km_rate))
        ? parseFloat(zone.per_km_rate)
        : defaults.per_km_rate);

  // 4. Distance addon: only charged for distance BEYOND the base distance!
  const dist = Math.max(0, parseFloat(distanceKm) || 0);
  const extraKm = Math.max(0, dist - baseDistanceKm);
  const rawDistanceAddon = isFlat || perKmRate <= 0 ? 0 : Math.round(extraKm * perKmRate);

  // 5. Clean Naira rounding (nearest ₦50) so customer sees clean amounts (₦600, ₦750, ₦800) never ₦672
  let rawTotal = basePrice + rawDistanceAddon;
  const totalDeliveryFee = Math.max(basePrice, Math.round(rawTotal / 50) * 50);

  // 6. Driver Commission (default 70% share)
  const commPct = zone.driver_commission_percent !== null && zone.driver_commission_percent !== undefined
    ? parseFloat(zone.driver_commission_percent) / 100
    : 0.70;

  const driverEarning = zone.driver_earning_fee && parseFloat(zone.driver_earning_fee) > 0 && isFlat
    ? Math.round(parseFloat(zone.driver_earning_fee))
    : Math.round(totalDeliveryFee * commPct);

  return {
    delivery_fee: totalDeliveryFee,
    original_delivery_fee: totalDeliveryFee,
    driver_earning: driverEarning,
    pricing_model: isFlat || perKmRate <= 0 ? 'flat' : 'base_plus_km',
    breakdown: {
      zone_id: zoneId,
      zone_name: zone.zone_name,
      base_fee: basePrice,
      base_distance_km: baseDistanceKm,
      distance_km: Math.round(dist * 10) / 10,
      extra_km: Math.round(extraKm * 10) / 10,
      per_km_rate: perKmRate,
      distance_addon: rawDistanceAddon,
      total_fee: totalDeliveryFee,
      driver_payout: driverEarning,
    }
  };
}

module.exports = {
  calculateDeliveryPricing,
  ZONE_PRICING_DEFAULTS,
};
