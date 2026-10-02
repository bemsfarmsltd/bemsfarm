# Bems Farms — Driver Mobile App API Specification

**Target Platform:** React Native / Flutter / iOS & Android Native Mobile Application  
**Backend Base URL (Production):** `https://api.bemsfarms.com/api/driver`  
**Backend Base URL (Local/Staging):** `http://localhost:5000/api/driver`  
**Authentication Standard:** JSON Web Token (JWT) via `Authorization: Bearer <token>`  
**Response Content-Type:** `application/json`  

---

## 1. Overview & Architecture

The Bems Farms Driver API connects the **Mobile Driver Application** to the central logistics and order management ecosystem. 

```
┌─────────────────────────┐          ┌──────────────────────────┐          ┌─────────────────────────┐
│   Customer / Client     │          │    Bems Farms Backend    │          │    Driver Mobile App    │
│  (Places Order online)  │ ───────> │  Auto-Dispatches to Zone │ ───────> │ (Receives Notification) │
└─────────────────────────┘          └──────────────────────────┘          └─────────────────────────┘
                                                  │                                     │
                                                  ▼                                     ▼
                                     ┌──────────────────────────┐          ┌─────────────────────────┐
                                     │   Admin Operations Map   │ <─────── │ Periodic GPS Location   │
                                     │  (Live Driver Tracking)  │          │ (Every 10-15 seconds)   │
                                     └──────────────────────────┘          └─────────────────────────┘
```

### Key Workflow Lifecycle:
1. **Self-Service Registration:** Prospective drivers open the app, enter all required credentials (Name, Phone, Email, Password, NIN, Driver's License, Vehicle Type & Plate, Emergency Contact, Bank Details), and submit via `POST /api/driver/auth/register`.
2. **Pending Notification:** The driver immediately receives an in-app confirmation and notification stating their application is received and to await administrative compliance verification (`status: 'pending'`, `onboarding_status: 'pending_verification'`).
3. **Admin Verification & Immediate Email:** Admins inspect the credentials and documents in the Admin Portal and approve the driver (`PATCH /api/admin/deliveries/drivers/:id/approve` or `/compliance`). The system immediately dispatches an official approval email to the driver with their credentials summary and a direct **"Sign In to Your Driver Account"** link.
4. **Email Redirect & Driver Sign-In:** The driver taps the "Sign In" button in their approval email, which redirects them directly to the Driver App Login screen. The driver enters their registered email/phone and password to authenticate.
5. **Automatic Wallet Initialization:** Upon authentication, the system automatically initializes their driver commission wallet and dedicated virtual account (`driver_wallets` / Monnify Virtual Account), ready for earning commissions and requesting instant bank payouts.
6. **Shift Availability:** Active drivers toggle `is_available: true` (Go Online) to start receiving automated doorstep delivery dispatches. Unverified or suspended drivers are strictly prevented from toggling online.
7. **Delivery Milestones & Live Tracking:** Dispatches progress through `assigned` ➔ `awaiting_pickup` ➔ `en_route` ➔ `arrived` ➔ `delivered`, with GPS tracking coordinates streamed every 10–15s.

---

## 2. Authentication & Self-Service Registration Endpoints

### 2.0 Self-Service Driver Registration
Enables prospective drivers to register their profile and submit credentials directly.

* **Method:** `POST`
* **Path:** `/api/driver/auth/register` (or `/api/driver/register`)
* **Auth Required:** No
* **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "name": "Ifeanyi Nwachukwu",
  "phone": "08031234567",
  "email": "ifeanyi@example.com",
  "password": "SecurePassword123!",
  "vehicle_type": "motorcycle",
  "vehicle_plate": "ABA-456-XY",
  "nin_number": "12345678901",
  "license_number": "DL-98765432",
  "address": "24 Faulks Road, Aba, Abia State",
  "emergency_contact_name": "Ngozi Nwachukwu",
  "emergency_contact_phone": "08039876543",
  "emergency_contact_relationship": "Spouse",
  "guarantor_name": "Chief Emeka Okafor",
  "guarantor_phone": "08021112222",
  "guarantor_address": "12 Jubilee Road, Aba",
  "bank_name": "First Bank of Nigeria",
  "account_number": "3012345678",
  "account_name": "Ifeanyi Nwachukwu",
  "avatar_url": "https://api.bemsfarms.com/uploads/documents/AVATAR_123.jpg",
  "documents": {
    "driver_license_front": "https://api.bemsfarms.com/uploads/documents/LICENSE_123.jpg",
    "nin_slip": "https://api.bemsfarms.com/uploads/documents/NIN_123.jpg",
    "vehicle_photo": "https://api.bemsfarms.com/uploads/documents/VEHICLE_123.jpg"
  }
}
```

#### Success Response (`201 Created`)
```json
{
  "status": "success",
  "message": "Driver registered successfully. Your account is currently awaiting verification by the dispatch team.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "driver": {
    "id": 12,
    "name": "Ifeanyi Nwachukwu",
    "phone": "08031234567",
    "email": "ifeanyi@example.com",
    "vehicle_type": "motorcycle",
    "vehicle_plate": "ABA-456-XY",
    "status": "pending",
    "onboarding_status": "pending_verification",
    "is_available": false
  },
  "verification": {
    "status": "pending",
    "onboarding_status": "pending_verification",
    "is_verified": false,
    "can_accept_orders": false,
    "message": "Your application is currently under review by Bems Farms Dispatch. You can log in and update your profile or documents while awaiting activation."
  }
}
```

---

### 2.1 Driver Login
Authenticates registered drivers. Unverified (`pending`) drivers can also log in to check their application review status and update documents.

* **Method:** `POST`
* **Path:** `/api/driver/auth/login`
* **Auth Required:** No
* **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "phone": "08012345678",
  "password": "123456"
}
```
*(Also accepts `"emailOrPhone"` or `"email"` in place of `"phone"`).*

#### Success Response (`200 OK`)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicGhvbmUiOiIwODAxMjM0NTY3OCIsInJvbGUiOiJkcml2ZXIifQ...",
  "message": "Login successful",
  "driver": {
    "id": 1,
    "name": "Ibrahim Musa",
    "phone": "08012345678",
    "email": "ibrahim.musa@example.com",
    "avatar_url": "https://api.bemsfarms.com/uploads/drivers/avatar_1.jpg",
    "vehicle_type": "motorcycle",
    "vehicle_plate": "ABJ-892-XY",
    "zone_id": 1,
    "rating": 4.8,
    "total_deliveries": 128,
    "total_earnings": 64000.00,
    "commission_per_delivery": 500.00,
    "status": "active",
    "license_number": "DL-90821-NG",
    "bank_name": "Kuda Bank",
    "account_number": "2019823412",
    "account_name": "Ibrahim Musa",
    "is_available": true,
    "is_on_delivery": false
  }
}
```

#### Error Responses
* `400 Bad Request`: `{"message": "Phone number/email and password are required"}`
* `401 Unauthorized`: `{"message": "Invalid phone/email or password"}`
* `403 Forbidden`: `{"message": "Account is suspended. Please contact dispatch/admin."}`

---

### 2.2 Get Current Driver Profile
Retrieves latest profile stats, ratings, active status, and wallet summary.

* **Method:** `GET`
* **Path:** `/api/driver/auth/me`
* **Auth Required:** Yes (`Bearer <token>`)

#### Success Response (`200 OK`)
```json
{
  "driver": {
    "id": 1,
    "name": "Ibrahim Musa",
    "phone": "08012345678",
    "email": "ibrahim.musa@example.com",
    "avatar_url": "https://api.bemsfarms.com/uploads/drivers/avatar_1.jpg",
    "vehicle_type": "motorcycle",
    "vehicle_plate": "ABJ-892-XY",
    "rating": 4.8,
    "total_deliveries": 128,
    "total_earnings": 64000.00,
    "commission_per_delivery": 500.00,
    "status": "active",
    "is_available": true,
    "is_on_delivery": false
  }
}
```

---

### 2.3 Update Driver Profile
Updates profile avatar, contact details, or default bank payout credentials.

* **Method:** `PATCH`
* **Path:** `/api/driver/auth/profile`
* **Auth Required:** Yes (`Bearer <token>`)
* **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "phone": "08098765432",
  "email": "musa.driver@bemsfarms.com",
  "avatar_url": "https://api.bemsfarms.com/uploads/new_avatar.jpg",
  "bank_name": "Guaranty Trust Bank (GTBank)",
  "account_number": "0123456789",
  "account_name": "Ibrahim Musa"
}
```

#### Success Response (`200 OK`)
```json
{
  "message": "Profile updated successfully",
  "driver": {
    "id": 1,
    "name": "Ibrahim Musa",
    "phone": "08098765432",
    "email": "musa.driver@bemsfarms.com",
    "bank_name": "Guaranty Trust Bank (GTBank)",
    "account_number": "0123456789",
    "account_name": "Ibrahim Musa"
  }
}
```

---

### 2.4 Toggle Online / Offline Availability
Allows driver to start or end shift. When offline (`is_available: false`), the automated routing system skips this driver.

* **Method:** `PATCH`
* **Path:** `/api/driver/availability`
* **Auth Required:** Yes (`Bearer <token>`)
* **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "is_available": true
}
```
*(If `is_available` is omitted, the endpoint toggles between true/false automatically).*

#### Success Response (`200 OK`)
```json
{
  "is_available": true,
  "status": "active",
  "message": "Driver is now ONLINE and ready for orders"
}
```

---

## 3. Deliveries & Order Lifecycle Endpoints

### 3.1 Get Active Assigned Deliveries
Fetches all pending and in-progress deliveries assigned to this driver. Each delivery item includes item details, photos, quantities, customer phone, and GPS target coordinates.

* **Method:** `GET`
* **Path:** `/api/driver/deliveries`
* **Auth Required:** Yes (`Bearer <token>`)

#### Success Response (`200 OK`)
```json
{
  "count": 1,
  "deliveries": [
    {
      "delivery_id": 42,
      "delivery_ref": "DEL-2026-0042",
      "delivery_status": "en_route",
      "assigned_at": "2026-09-20T10:15:00.000Z",
      "accepted_at": "2026-09-20T10:18:00.000Z",
      "dispatched_at": "2026-09-20T10:30:00.000Z",
      "eta_minutes": 25,
      "attempts": 1,
      "delivery_address": "Plot 12, Gana Street, Maitama, Abuja",
      "delivery_city": "Abuja",
      "customer_lat": 9.0820,
      "customer_lng": 7.4951,
      "customer_name": "Emelda Ejike",
      "customer_phone": "08123456789",
      "customer_email": "emelda@example.com",
      "zone_name": "Maitama & Wuse Zone",
      "order_id": 105,
      "order_ref": "ORD-2026-0105",
      "order_status": "shipped",
      "tracking_status": "out_for_delivery",
      "order_total": 18500.00,
      "subtotal": 17000.00,
      "delivery_fee": 1500.00,
      "payment_method": "paystack",
      "payment_status": "paid",
      "order_notes": "Call upon arrival at security gate.",
      "items": [
        {
          "id": 210,
          "product_id": 4,
          "product_name": "Fresh Farm Eggs (Crate of 30)",
          "quantity": 2,
          "unit_price": 4500.00,
          "total_price": 9000.00,
          "unit": "crate",
          "image_url": "https://api.bemsfarms.com/uploads/eggs.jpg"
        },
        {
          "id": 211,
          "product_id": 9,
          "product_name": "Frozen Dressed Broiler Chicken (1.5kg)",
          "quantity": 2,
          "unit_price": 4000.00,
          "total_price": 8000.00,
          "unit": "kg",
          "image_url": "https://api.bemsfarms.com/uploads/chicken.jpg"
        }
      ]
    }
  ]
}
```

---

### 3.2 Get Single Delivery Details
Fetches full details for a specific order.

* **Method:** `GET`
* **Path:** `/api/driver/deliveries/:orderId`
* **Auth Required:** Yes (`Bearer <token>`)
* **URL Parameter:** `:orderId` matches `delivery_id`, `order_id`, `delivery_ref`, or `order_ref`.

#### Success Response (`200 OK`)
```json
{
  "delivery": {
    "delivery_id": 42,
    "delivery_ref": "DEL-2026-0042",
    "delivery_status": "en_route",
    "order_id": 105,
    "order_ref": "ORD-2026-0105",
    "delivery_address": "Plot 12, Gana Street, Maitama, Abuja",
    "customer_name": "Emelda Ejike",
    "customer_phone": "08123456789",
    "items": [ ... ]
  }
}
```

---

### 3.3 Update Delivery Status (Action Milestones)
Updates the status of an active delivery. Automatically updates order state, customer live tracking status, and credits driver commission upon completion.

* **Method:** `PATCH`
* **Path:** `/api/driver/deliveries/:orderId/status`
* **Auth Required:** Yes (`Bearer <token>`)
* **Headers:** `Content-Type: application/json`

#### Allowed Status Codes & Actions:
| Input `status` | Normalized Action | Customer Tracking State | Driver Commission |
| :--- | :--- | :--- | :--- |
| `accepted` | Driver accepts assignment | `driver_assigned` (Courier Assigned) | — |
| `awaiting_pickup` / `at_store` | Driver at farm/store counter | `packed` (Packed & Staged at Store) | — |
| `picked_up` / `confirm-pickup` | **Driver confirms goods pickup at store** | `picked_up` / `in_transit` | — |
| `en_route` / `out_for_delivery` | Driver departs store & en route | `out_for_delivery` | — |
| `arrived` | Driver arrived at destination | `driver_arrived` | — |
| `delivered` | Successfully delivered to customer | `delivered` | **+₦500 Credited to Wallet** |
| `failed` / `delivery_attempted` | Delivery could not be completed | `delivery_attempted` | — |

> **IMPORTANT:** An order **cannot** move to `out_for_delivery` or `in_transit` until the driver confirms goods pickup at the store counter.

#### Request Payloads:

**1. Confirm Physical Goods Pickup at Store (Dedicated or via Status):**
* **Method:** `POST`
* **Path:** `/api/driver/deliveries/:orderId/confirm-pickup`
*(Or `PATCH /api/driver/deliveries/:orderId/status` with `{"status": "picked_up"}`)*
```json
{
  "notes": "Verified 3 crates with cashier, seals intact",
  "eta_minutes": 25
}
```

**2. Mark Out for Delivery (En Route):**
```json
{
  "status": "en_route",
  "eta_minutes": 25
}
```

**2. Mark Arrived at Destination:**
```json
{
  "status": "arrived"
}
```

**3. Mark Delivered (with Proof):**
```json
{
  "status": "delivered",
  "proof_note": "Package received by customer Mrs. Ejike in person.",
  "proof_photo": "https://api.bemsfarms.com/uploads/proof_42.jpg"
}
```

**4. Mark Failed / Delivery Attempted:**
```json
{
  "status": "failed",
  "failure_reason": "Customer phone unreachable after 3 attempts at security gate."
}
```

#### Success Response (`200 OK`)
```json
{
  "message": "Delivery status updated to delivered",
  "delivery": {
    "delivery_id": 42,
    "delivery_status": "delivered",
    "order_id": 105,
    "order_status": "delivered",
    "tracking_status": "delivered",
    "delivered_at": "2026-09-20T11:05:00.000Z"
  }
}
```

---

### 3.3.1 Proof of Delivery (POD) Retrieval
Retrieves the Proof of Delivery (POD) image(s), notes, and handover confirmation previously uploaded for an order. Used by the driver mobile app when tapping "POD" or "View Proof" on an order.

* **Method:** `GET`
* **Path:** `/api/driver/deliveries/:orderId/pod` *(Aliases: `/api/driver/deliveries/:orderId/proof`, `/api/driver/orders/:orderId/pod`)*
* **Auth Required:** Yes (`Bearer <driver_token>`)
* **URL Params:** `orderId` (accepts order ID integer, order ref `ORD-...`, or delivery ID)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "status": "success",
  "order_id": 105,
  "delivery_id": 42,
  "order_ref": "ORD-2026-0105",
  "delivery_ref": "DEL-2026-0042",
  "delivery_status": "delivered",
  "proof_photo": "https://api.bemsfarms.com/uploads/proofs/POD_1727856000_abcd1234.jpg",
  "photo_url": "https://api.bemsfarms.com/uploads/proofs/POD_1727856000_abcd1234.jpg",
  "url": "https://api.bemsfarms.com/uploads/proofs/POD_1727856000_abcd1234.jpg",
  "proof_photos": [
    "https://api.bemsfarms.com/uploads/proofs/POD_1727856000_abcd1234.jpg"
  ],
  "item_proofs": [],
  "proof_note": "Handed directly to customer at apartment door",
  "note": "Handed directly to customer at apartment door",
  "delivered_at": "2026-09-20T11:05:00.000Z",
  "customer_name": "Mrs. Chioma Eze",
  "delivery_address": "Flat 3B, Plot 14 Government Layout, Umuahia",
  "data": {
    "proof_photo": "https://api.bemsfarms.com/uploads/proofs/POD_1727856000_abcd1234.jpg",
    "photo_url": "https://api.bemsfarms.com/uploads/proofs/POD_1727856000_abcd1234.jpg",
    "url": "https://api.bemsfarms.com/uploads/proofs/POD_1727856000_abcd1234.jpg",
    "proof_photos": [
      "https://api.bemsfarms.com/uploads/proofs/POD_1727856000_abcd1234.jpg"
    ],
    "item_proofs": [],
    "proof_note": "Handed directly to customer at apartment door",
    "delivered_at": "2026-09-20T11:05:00.000Z"
  }
}
```

---

### 3.3.2 Driver Turn-by-Turn Road Navigation
Provides real road driving distance, live ETA, turn-by-turn guidance, and 1-tap navigation deep-links (Google Maps, Waze, Apple Maps) from the driver's current position to the customer's delivery destination.

* **Method:** `GET`
* **Path:** `/api/driver/deliveries/:orderId/navigation` *(Aliases: `/api/driver/deliveries/:orderId/route`, `/api/driver/deliveries/:orderId/directions`)*
* **Auth Required:** Yes (`Bearer <driver_token>`)
* **Optional Query Params:** `lat`, `lng` (driver's live coordinates; defaults to latest streamed location or store hub)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "order_id": 105,
  "delivery_id": 42,
  "customer_name": "Mrs. Chioma Eze",
  "customer_phone": "08031234567",
  "delivery_address": "Plot 14 Government Layout, Umuahia",
  "origin": { "lat": 5.5245, "lng": 7.4912, "label": "Driver Location" },
  "destination": { "lat": 5.518, "lng": 7.485, "label": "Plot 14 Government Layout" },
  "road_distance_km": 3.8,
  "eta_minutes": 11,
  "geometry": [[7.4912, 5.5245], [7.4895, 5.521], [7.485, 5.518]],
  "steps": [
    { "instruction": "turn-right onto Ossah Road", "distance_m": 850, "duration_s": 120 },
    { "instruction": "continue onto Bank Road", "distance_m": 1200, "duration_s": 240 }
  ],
  "navigation": {
    "google_maps_url": "https://www.google.com/maps/dir/?api=1&origin=5.5245,7.4912&destination=5.518,7.485&travelmode=driving",
    "waze_url": "https://waze.com/ul?ll=5.518,7.485&navigate=yes",
    "apple_maps_url": "https://maps.apple.com/?saddr=5.5245,7.4912&daddr=5.518,7.485&dirflg=d"
  }
}
```

---

### 3.3.3 Multi-Stop Batch Route Optimization (VRP / Multi-Drop)
Optimizes all active deliveries assigned to this driver into the fastest, most fuel-efficient single drop-off sequence (TSP solver).

* **Method:** `GET` or `POST`
* **Path:** `/api/driver/deliveries/routes/optimized` (or `POST /api/driver/deliveries/routes/optimize`)
* **Auth Required:** Yes (`Bearer <driver_token>`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "total_stops": 3,
  "total_distance_km": 14.2,
  "total_duration_mins": 38,
  "saved_distance_km": 8.6,
  "efficiency_gain": "38% fuel/time saved via sequenced drops",
  "optimized_sequence": [
    { "sequence": 1, "order_id": 103, "customer_name": "Ngozi", "address": "BCA Housing", "leg_distance_km": 2.1, "leg_duration_mins": 7 },
    { "sequence": 2, "order_id": 105, "customer_name": "Chioma", "address": "World Bank", "leg_distance_km": 3.4, "leg_duration_mins": 10 },
    { "sequence": 3, "order_id": 108, "customer_name": "Victor", "address": "Ubakala", "leg_distance_km": 8.7, "leg_duration_mins": 21 }
  ],
  "google_maps_url": "https://www.google.com/maps/dir/?api=1&origin=5.5245,7.4912&destination=5.48,7.45&travelmode=driving&waypoints=5.535%2C7.502%7C5.518%2C7.485"
}
```

---

### 3.4 Delivery History & Summary Metrics
Paginated history of all completed and past deliveries made by this driver.

* **Method:** `GET`
* **Path:** `/api/driver/deliveries/history`
* **Auth Required:** Yes (`Bearer <token>`)
* **Query Parameters:**
  - `page`: Page number (default `1`)
  - `limit`: Items per page (default `20`)
  - `from_date`: Filter start date (e.g. `2026-09-01`)
  - `to_date`: Filter end date (e.g. `2026-09-30`)

#### Success Response (`200 OK`)
```json
{
  "page": 1,
  "limit": 20,
  "total": 45,
  "stats": {
    "total_delivered": 43,
    "total_failed": 2,
    "total_history": 45
  },
  "deliveries": [
    {
      "delivery_id": 39,
      "delivery_ref": "DEL-2026-0039",
      "delivery_status": "delivered",
      "delivered_at": "2026-09-19T14:20:00.000Z",
      "order_ref": "ORD-2026-0100",
      "order_total": 12500.00,
      "customer_name": "Victor Kalu",
      "customer_phone": "08055551122",
      "delivery_address": "Wuse II, Abuja",
      "items": [
        {
          "product_name": "Smoked Catfish Pack",
          "quantity": 3,
          "unit": "pack"
        }
      ]
    }
  ]
}
```

---

## 4. Live GPS Location Tracking

### 4.1 Periodic GPS Location Ping
The mobile app should stream GPS coordinate telemetry in the background (every 10–15s while `is_available: true` or actively `en_route`).

* **Method:** `POST`
* **Path:** `/api/driver/location`
* **Auth Required:** Yes (`Bearer <token>`)
* **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "latitude": 9.076543,
  "longitude": 7.398621,
  "heading": 182.5,
  "speed": 34.2,
  "accuracy": 5.0
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "location": {
    "id": 1045,
    "driver_id": 1,
    "latitude": 9.076543,
    "longitude": 7.398621,
    "heading": 182.5,
    "speed": 34.2,
    "accuracy": 5.0,
    "recorded_at": "2026-09-20T10:45:12.000Z"
  }
}
```

---

## 5. Wallet, Earnings & Withdrawals

### 5.1 Wallet Summary & Payout History
Retrieves available balance, total accumulated earnings, pending payout requests, commission breakdown, and banking details.

* **Method:** `GET`
* **Path:** `/api/driver/earnings`
* **Auth Required:** Yes (`Bearer <token>`)

#### Success Response (`200 OK`)
```json
{
  "wallet": {
    "total_earned": 64000.00,
    "total_paid": 50000.00,
    "pending_payouts": 5000.00,
    "available_balance": 9000.00,
    "commission_per_delivery": 500.00,
    "bank_details": {
      "bank_name": "Guaranty Trust Bank (GTBank)",
      "account_number": "0123456789",
      "account_name": "Ibrahim Musa"
    }
  },
  "commissions": [
    {
      "id": 14,
      "trips": 10,
      "deliveries": 10,
      "commission_per_delivery": 500.00,
      "total_earned": 5000.00,
      "status": "approved",
      "created_at": "2026-09-19T20:00:00.000Z"
    }
  ],
  "payouts": [
    {
      "id": 6,
      "payout_ref": "PAY-LM49-3A7F",
      "amount": 25000.00,
      "bank_name": "GTBank",
      "account_number": "0123456789",
      "account_name": "Ibrahim Musa",
      "status": "paid",
      "requested_at": "2026-09-15T12:30:00.000Z",
      "processed_at": "2026-09-15T15:00:00.000Z"
    }
  ]
}
```

---

### 5.2 Request Earnings Withdrawal
Submits a bank transfer withdrawal request for approval and processing.

* **Method:** `POST`
* **Path:** `/api/driver/withdraw`
* **Auth Required:** Yes (`Bearer <token>`)
* **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "amount": 5000,
  "bank_name": "GTBank",
  "account_number": "0123456789",
  "account_name": "Ibrahim Musa",
  "notes": "Weekly earnings withdrawal"
}
```
*(If `bank_name`, `account_number`, and `account_name` were saved previously on profile, they can be omitted).*

#### Success Response (`201 Created`)
```json
{
  "message": "Withdrawal request submitted successfully. It will be reviewed and processed by admin.",
  "payout": {
    "id": 7,
    "payout_ref": "PAY-MK91-8C3D",
    "amount": 5000.00,
    "bank_name": "GTBank",
    "account_number": "0123456789",
    "account_name": "Ibrahim Musa",
    "status": "pending",
    "requested_at": "2026-09-20T12:15:00.000Z"
  },
  "remaining_available_balance": 4000.00
}
```

#### Error Responses:
* `400 Bad Request`: `{"message": "Insufficient available balance. Available: ₦9,000, Requested: ₦15,000"}`
* `400 Bad Request`: `{"message": "Bank name and account number are required for withdrawal"}`

---

## 6. Mobile Implementation Checklist

For the mobile app engineer building with React Native, Flutter, or Swift/Kotlin:

1. **Token Persistence:** Store the JWT token securely using `SecureStore` / `Keychain` / `EncryptedSharedPreferences`.
2. **Background GPS Tracking:** Use background location listeners (e.g. `expo-location`, `react-native-background-geolocation`, or `geolocator` in Flutter) to ping `POST /api/driver/location` every 10–15s when active.
3. **Turn-by-Turn Navigation:** Tap customer address or `customer_lat` / `customer_lng` to launch Google Maps / Apple Maps deep link:
   - Android: `geo:${lat},${lng}?q=${lat},${lng}(${customer_name})`
   - iOS: `maps://?daddr=${lat},${lng}`
4. **Direct Call / WhatsApp Customer:** Direct dialer link `tel:${customer_phone}` or WhatsApp link `https://wa.me/234${phone}`.
5. **Image Upload for Proof of Delivery:** Send photo URL or base64 photo via `proof_photo` in `PATCH /api/driver/deliveries/:orderId/status`.
