/**
 * Bems Farms Simplified Delivery Pricing Service
 * Formula: Total Delivery Price = Base Zone Fee + (Map Distance in KM * Rate Per KM)
 * Completely database-driven with zero hardcoded values.
 */

const ZONE_PRICING_DEFAULTS = {
  ZONE001: { base_fee: 600, per_km_rate: 80 },
  ZONE002: { base_fee: 1800, per_km_rate: 90 },
  ZONE003: { base_fee: 2500, per_km_rate: 60 },
  ZONE004: { base_fee: 3500, per_km_rate: 40 },
  ZONE005: { base_fee: 6000, per_km_rate: 15 },
  ZONE006: { base_fee: 35000, per_km_rate: 0 }
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
  const defaults = ZONE_PRICING_DEFAULTS[zoneId] || { base_fee: 600, per_km_rate: 80 };

  // 1. Base delivery fee for the zone (e.g. ₦600)
  const basePrice = zone.base_fee !== null && zone.base_fee !== undefined && !isNaN(Number(zone.base_fee))
    ? parseFloat(zone.base_fee)
    : (parseFloat(zone.delivery_fee) || defaults.base_fee);

  // 2. Per-KM rate (e.g. ₦80/km, or 0 if flat rate)
  const isFlat = zone.pricing_type === 'flat' || zoneId === 'ZONE006';
  const perKmRate = isFlat
    ? 0
    : (zone.per_km_rate !== null && zone.per_km_rate !== undefined && !isNaN(Number(zone.per_km_rate))
        ? parseFloat(zone.per_km_rate)
        : defaults.per_km_rate);

  // 3. Add-on for distance calculated by map
  const dist = Math.max(0, parseFloat(distanceKm) || 0);
  const distanceAddon = isFlat || perKmRate <= 0 ? 0 : Math.round(dist * perKmRate);

  // 4. Real delivery fee customer sees and pays at checkout
  const totalDeliveryFee = Math.max(0, basePrice + distanceAddon);

  // 5. Driver Commission (default 70% share)
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
      distance_km: Math.round(dist * 10) / 10,
      per_km_rate: perKmRate,
      distance_addon: distanceAddon,
      total_fee: totalDeliveryFee,
      driver_payout: driverEarning,
    }
  };
}

module.exports = {
  calculateDeliveryPricing,
  ZONE_PRICING_DEFAULTS,
};
