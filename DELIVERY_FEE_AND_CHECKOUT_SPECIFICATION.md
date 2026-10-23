# BEMS FARMS — DELIVERY FEE & CHECKOUT API SPECIFICATION
**Target Audience:** Mobile Engineering Team (Flutter / React Native / Native iOS & Android)  
**Objective:** Guarantee 100% logic and payload parity between Web and Mobile applications.  
**System Status:** Live Production Reference  

---

## 1. Executive Summary

This document specifies the exact pricing models, distance algorithms, lookup matrices, and API contracts powering the Bems Farms checkout and delivery fee calculation engine.

To ensure consistency and prevent Monnify payment verification rejections (*"Amount does not match order total"*), the mobile application must implement identical calculations and endpoints.

---

## 2. Mathematical Delivery Fee Formula

Delivery pricing is defined in `server/src/services/pricingService.js`:

$$\text{Distance Fee (₦)} = \text{round}(\text{distance\_in\_km} \times \text{per\_km\_rate})$$
$$\text{Total Delivery Fee (₦)} = \text{base\_fee} + \text{distance\_fee}$$
$$\text{Customer Order Total (₦)} = \text{cart\_subtotal} + \text{total\_delivery\_fee} - \text{coupon\_discount}$$
$$\text{Driver Payout Share (₦)} = \text{round}(\text{total\_delivery\_fee} \times 0.70)$$

*(Note: If the zone is designated as Flat Fee or Test Mode, `distance_fee = 0`).*

---

## 3. Delivery Zone & Rate Lookup Matrix

| Zone ID | Operational Zone / Hub | Base Fee | Per-KM Rate | Pricing Model | Hub Coordinates |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ZONE_TEST`** | Test Zone (QA Testing) | **₦0** | ₦0 / km | Flat Free | *Any Location* |
| **`ZONE001`** | Umuahia Urban & Metro | **₦600** | ₦80 / km | Base + KM | 5.5255° N, 7.4916° E |
| **`ZONE002`** | Aba Commercial Metro | **₦1,800** | ₦90 / km | Base + KM | 5.1065° N, 7.3667° E |
| **`ZONE003`** | Abia Regional (Ohafia, Arochukwu) | **₦2,500** | ₦60 / km | Base + KM | 5.6186° N, 7.8286° E |
| **`ZONE004`** | Interstate SE/SS (Rivers, Enugu, Imo) | **₦3,500** | ₦40 / km | Base + KM | 5.0000° N, 7.0000° E |
| **`ZONE005`** | Nationwide Express (Lagos, Abuja, North) | **₦6,000** | ₦15 / km | Base + KM | 9.0765° N, 7.3986° E |
| **`ZONE006`** | Cargo / Export Bulk Delivery | **₦35,000** | ₦0 / km | Flat Rate | Cargo Hubs |

---

## 4. Haversine Distance Calculation (KM)

When GPS coordinates are available, the straight-line distance is computed between the customer location $(lat_1, lon_1)$ and the zone hub center $(lat_2, lon_2)$:

```typescript
function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_KM = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 10) / 10; // Round to 1 decimal place (e.g. 6.4 km)
}
```

### Concrete Worked Example:
- **Customer Address:** 10 Library Avenue, Umuahia
- **Assigned Zone:** `ZONE001` (Base ₦600, Rate ₦80/km)
- **Distance:** 6.4 km
- **Distance Fee:** `round(6.4 * 80)` = **₦512**
- **Total Delivery Fee:** 600 + 512 = **₦1,112**
- **Driver Commission:** `round(1112 * 0.70)` = **₦778**

---

## 5. Checkout Sequence & API Contracts

### Step 1: Location Verification & Zone Mapping
- **Method & Route:** `POST /api/locations/verify`
- **Request:**
```json
{
  "latitude": 5.5255,
  "longitude": 7.4916,
  "address": "10 Library Avenue",
  "city": "Umuahia",
  "state": "Abia State"
}
```
- **Response:**
```json
{
  "verified": true,
  "zone": {
    "zone_id": "ZONE001",
    "zone_name": "Umuahia Urban & Metro",
    "delivery_fee": 1112,
    "estimated_delivery_time": "30–60 mins"
  }
}
```

---

### Step 2: Lock Checkout Intent (Monnify Gateway)
- **Method & Route:** `POST /api/orders/checkout-intent`
- **Request:**
```json
{
  "items": [
    { "product_id": 14, "quantity": 2, "price": 4500 }
  ],
  "payment_ref": "BF-1718880000000-abcd",
  "address": "10 Library Avenue, Umuahia, Abia State",
  "city": "Umuahia",
  "state": "Abia State",
  "latitude": 5.5255,
  "longitude": 7.4916,
  "zone_id": "ZONE001",
  "delivery_fee": 1112,
  "coupon_code": "DISCOUNT10"
}
```
- **Response:**
```json
{
  "intentId": "INTENT-98234-XYZ",
  "total": 9212
}
```

---

### Step 3: Order Finalization
- **Method & Route:** `POST /api/orders`
- **Request:**
```json
{
  "items": [
    { "product_id": 14, "quantity": 2, "price": 4500 }
  ],
  "total": 9212,
  "zone_id": "ZONE001",
  "delivery_fee": 1112,
  "payment_method": "monnify",
  "payment_ref": "BF-1718880000000-abcd",
  "payment_reference": "BF-1718880000000-abcd",
  "transaction_reference": "MNFY|20261022|9988112",
  "checkout_intent_id": "INTENT-98234-XYZ",
  "address": "10 Library Avenue, Umuahia, Abia State",
  "city": "Umuahia",
  "state": "Abia State",
  "latitude": 5.5255,
  "longitude": 7.4916,
  "coupon_code": "DISCOUNT10"
}
```
*(For Cash on Delivery: set `"payment_method": "cod"` and omit `transaction_reference`).*

---

## 6. Engineering Parity Checklist for Mobile

1. **Initial Fallback State:** Use `STANDARD_DELIVERY_FEE = 1000` (₦1,000) prior to GPS resolution.
2. **Test Override Rule:** If `address`, `city`, or `state` contains the word `"test"`, immediately assign `delivery_fee = 0`.
3. **Total Calculation:** `Total = Math.max(0, Subtotal + DeliveryFee - Discount)`.
4. **Amount Integrity:** Never round the total arbitrarily; pass the exact intent amount to the Monnify SDK.
