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

### Key Workflow Highlights:
1. **Self-Service Registration:** Prospective drivers can register themselves directly on the mobile app via `POST /api/driver/auth/register`. Their account is created with `status: 'pending'` and `onboarding_status: 'pending_verification'`.
2. **Review & KYC Documents:** While awaiting admin verification, drivers can log in, view their live verification status (`GET /api/driver/auth/status`), and upload their KYC documents (`POST /api/driver/upload/kyc`).
3. **Admin Verification & Activation:** Once dispatch verifies their credentials and documents in the admin dashboard, the account is activated (`status: 'active'`). Drivers receive an in-app alert and email.
4. **Shift Management:** Active drivers toggle `is_available: true` (Go Online) when starting shift to become eligible for automated order routing. Unverified drivers cannot toggle online.
5. **Delivery Lifecycle:** Delivery progresses through discrete milestones: `assigned` ➔ `awaiting_pickup` ➔ `en_route` ➔ `arrived` ➔ `delivered` / `delivery_attempted`.
6. **Live GPS Streaming:** Mobile app streams driver coordinates (`latitude`, `longitude`, `heading`, `speed`) every 10–15s while on active duty.
7. **Wallet & Payouts:** Every successful delivery credits the driver's wallet with their custom commission. Drivers can request direct bank payouts via `/withdraw`.

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
| `accepted` | Driver accepts assignment | `driver_assigned` | — |
| `awaiting_pickup` | Driver at farm/store loading goods | `packed_ready` | — |
| `en_route` / `out_for_delivery` | Driver picked up package & left | `out_for_delivery` | — |
| `arrived` | Driver arrived at destination | `driver_arrived` | — |
| `delivered` | Successfully delivered to customer | `delivered` | **+₦500 Credited to Wallet** |
| `failed` / `delivery_attempted` | Delivery could not be completed | `delivery_attempted` | — |

#### Request Payloads:

**1. Mark Out for Delivery (En Route):**
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
