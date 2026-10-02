/**
 * Bems Farms Dynamic Logistics & Delivery Pricing Service (1A)
 * Implements Base Fee + Per-Kilometer, Basket Subsidies, Weight and Surge calculation
 */

// Zone specific defaults if not explicitly configured in database
const ZONE_PRICING_DEFAULTS = {
  ZONE001: { base_fee: 600, base_distance_km: 3, per_km_rate: 80, min_fee: 800, max_fee: 2200 },
  ZONE002: { base_fee: 1800, base_distance_km: 5, per_km_rate: 90, min_fee: 2000, max_fee: 4500 },
  ZONE003: { base_fee: 2500, base_distance_km: 15, per_km_rate: 60, min_fee: 3500, max_fee: 7000 },
  ZONE004: { base_fee: 3500, base_distance_km: 40, per_km_rate: 40, min_fee: 5000, max_fee: 14000 },
  ZONE005: { base_fee: 6000, base_distance_km: 150, per_km_rate: 15, min_fee: 8000, max_fee: 22000 },
  ZONE006: { base_fee: 35000, base_distance_km: 0, per_km_rate: 0, min_fee: 35000, max_fee: 75000 }
};

/**
 * Calculate dynamic delivery pricing for a matched zone and delivery trip
 * @param {Object} params
 * @param {Object} params.zone Matched delivery_zones row
 * @param {number} params.distanceKm Actual road distance in km
 * @param {number} [params.orderTotal] Cart items subtotal in Naira
 * @param {number} [params.weightKg] Optional estimated weight of goods
 * @param {number} [params.surgeMultiplier] Weather or peak hour surge (1.0 = normal, 1.2 = rain/peak)
 */
function calculateDeliveryPricing({
  zone,
  distanceKm = 0,
  orderTotal = 0,
  weightKg = 0,
  surgeMultiplier = null,
}) {
  const zoneId = zone.zone_id || 'ZONE001';
  const defaults = ZONE_PRICING_DEFAULTS[zoneId] || ZONE_PRICING_DEFAULTS.ZONE001;

  // 1. If flat-rate zone (e.g. International Air Cargo)
  if (zone.pricing_type === 'flat' || zoneId === 'ZONE006') {
    const flatFee = parseFloat(zone.delivery_fee) || defaults.base_fee;
    const commPct = zone.driver_commission_percent !== null && zone.driver_commission_percent !== undefined
      ? parseFloat(zone.driver_commission_percent) / 100
      : 0.70;
    const driverEarning = zone.driver_earning_fee && parseFloat(zone.driver_earning_fee) > 0
      ? Math.round(parseFloat(zone.driver_earning_fee))
      : Math.round(flatFee * commPct);

    return {
      delivery_fee: flatFee,
      driver_earning: driverEarning,
      pricing_model: 'flat_rate',
      breakdown: {
        zone_id: zoneId,
        zone_name: zone.zone_name,
        pricing_type: 'flat',
        base_fee: flatFee,
        distance_km: distanceKm,
        total_fee: flatFee,
        driver_payout: driverEarning,
      }
    };
  }

  // 2. Base Fee + Per-Kilometer Rate from Database Zone
  const baseFee = zone.base_fee !== null && zone.base_fee !== undefined ? parseFloat(zone.base_fee) : defaults.base_fee;
  const baseDistanceKm = zone.base_distance_km !== null && zone.base_distance_km !== undefined ? parseFloat(zone.base_distance_km) : defaults.base_distance_km;
  const perKmRate = zone.per_km_rate !== null && zone.per_km_rate !== undefined ? parseFloat(zone.per_km_rate) : defaults.per_km_rate;

  const dist = Math.max(0, parseFloat(distanceKm) || 0);
  const billableDistanceKm = Math.max(0, dist - baseDistanceKm);
  const distanceCharge = Math.round(billableDistanceKm * perKmRate);

  let rawFee = baseFee + distanceCharge;

  // Dynamic min / max boundaries configured per zone in database
  const minFee = zone.min_fee !== null && zone.min_fee !== undefined ? parseFloat(zone.min_fee) : defaults.min_fee;
  const maxFee = zone.max_fee !== null && zone.max_fee !== undefined ? parseFloat(zone.max_fee) : defaults.max_fee;

  if (minFee && rawFee < minFee) {
    rawFee = minFee;
  }
  if (maxFee && rawFee > maxFee) {
    rawFee = maxFee;
  }

  // 3. Weight surcharge (over 10kg bulk agro produce)
  let weightSurcharge = 0;
  const surchargePer5kg = zone.weight_surcharge_per_5kg !== null && zone.weight_surcharge_per_5kg !== undefined ? parseFloat(zone.weight_surcharge_per_5kg) : 250;
  if (weightKg > 10 && surchargePer5kg > 0) {
    const extraWeight = weightKg - 10;
    weightSurcharge = Math.round((extraWeight / 5) * surchargePer5kg);
    rawFee += weightSurcharge;
  }

  // 4. Surge multiplier (configured on zone or passed dynamically)
  const zoneSurge = zone.surge_multiplier !== null && zone.surge_multiplier !== undefined ? parseFloat(zone.surge_multiplier) : 1.0;
  const surge = surgeMultiplier !== null && surgeMultiplier !== undefined ? parseFloat(surgeMultiplier) : zoneSurge;
  if (surge > 1.0) {
    rawFee = Math.round(rawFee * surge);
  }

  // 5. Order Value Subsidies (Free or Discounted delivery on large orders from DB)
  let discountAmount = 0;
  let subsidyNote = null;
  const numOrderTotal = parseFloat(orderTotal) || 0;
  const freeThreshold = zone.free_delivery_threshold !== null && zone.free_delivery_threshold !== undefined
    ? parseFloat(zone.free_delivery_threshold)
    : (parseFloat(zone.min_order_value) || 0);

  if (freeThreshold > 0 && numOrderTotal >= freeThreshold) {
    discountAmount = rawFee;
    subsidyNote = `100% Free Delivery on orders above ₦${freeThreshold.toLocaleString()}`;
  } else if (freeThreshold > 0 && numOrderTotal >= (freeThreshold * 0.60)) {
    discountAmount = Math.round(rawFee * 0.50);
    subsidyNote = `50% Delivery Discount on orders above ₦${Math.round(freeThreshold * 0.60).toLocaleString()}`;
  }

  const finalCustomerFee = Math.max(0, rawFee - discountAmount);

  // Driver commission: Configurable per-zone commission % or fixed earning fee
  const commissionPercent = zone.driver_commission_percent !== null && zone.driver_commission_percent !== undefined
    ? parseFloat(zone.driver_commission_percent) / 100
    : 0.70;
  
  let driverTotalEarned = 0;
  if (zone.driver_earning_fee && parseFloat(zone.driver_earning_fee) > 0 && zone.pricing_type === 'flat') {
    driverTotalEarned = Math.round(parseFloat(zone.driver_earning_fee) * surge);
  } else {
    driverTotalEarned = Math.round(rawFee * commissionPercent);
  }

  return {
    delivery_fee: finalCustomerFee,
    original_delivery_fee: rawFee,
    discount_amount: discountAmount,
    subsidy_note: subsidyNote,
    driver_earning: driverTotalEarned,
    pricing_model: 'base_plus_per_km',
    breakdown: {
      zone_id: zoneId,
      zone_name: zone.zone_name,
      pricing_type: 'hybrid',
      distance_km: Math.round(dist * 10) / 10,
      base_fee: baseFee,
      base_distance_km: baseDistanceKm,
      billable_distance_km: Math.round(billableDistanceKm * 10) / 10,
      per_km_rate: perKmRate,
      distance_charge: distanceCharge,
      weight_surcharge: weightSurcharge,
      surge_multiplier: surge,
      subtotal: rawFee,
      discount_applied: discountAmount,
      total_customer_fee: finalCustomerFee,
      driver_payout: driverTotalEarned,
    }
  };
}

module.exports = {
  calculateDeliveryPricing,
  ZONE_PRICING_DEFAULTS,
};
