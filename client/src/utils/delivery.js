// utils/delivery.js
// Single source of truth for the delivery fee shown to customers — Cart and
// Checkout previously calculated this independently (Cart used this
// threshold, Checkout used a flat ₦500), so a customer could see one total
// on the Cart page and be charged a different one at Checkout.
// Mirrors server/src/routes/orders.js's getDeliveryFee, which computes the
// actual charge — the two must stay in sync or Monnify payment verification
// will reject a legitimate payment as "amount does not match order total".
export const FREE_DELIVERY_THRESHOLD = 15000;
export const STANDARD_DELIVERY_FEE = 1500;

export function getDeliveryFee(subtotal) {
  return subtotal > FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
}