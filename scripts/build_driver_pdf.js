const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'BEMS_FARMS_DRIVER_APP_API_SPECIFICATION.pdf');
const htmlPath = path.join(__dirname, '..', 'scratch_driver_doc_full.html');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bems Farms Driver Mobile App API Specification</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
      @bottom-right {
        content: "Page " counter(page);
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 9px;
        color: #94A3B8;
      }
      @bottom-left {
        content: "Bems Farms Driver App API Reference · Confidential";
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 9px;
        color: #94A3B8;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1E293B;
      background: #FFFFFF;
      font-size: 12px;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }

    /* ── COVER BANNER ───────────────────────────────── */
    .cover-banner {
      background: linear-gradient(135deg, #064E3B 0%, #0F5132 40%, #198754 100%);
      color: #FFFFFF;
      padding: 28px 32px;
      border-radius: 14px;
      margin-bottom: 24px;
      box-shadow: 0 10px 25px -5px rgba(15, 81, 50, 0.25);
      position: relative;
      overflow: hidden;
    }

    .cover-banner::after {
      content: "";
      position: absolute;
      right: -20px;
      bottom: -40px;
      width: 180px;
      height: 180px;
      background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%);
      border-radius: 50%;
    }

    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .cover-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.6px;
      line-height: 1.2;
      margin-bottom: 6px;
    }

    .cover-subtitle {
      font-size: 13px;
      color: #D1E7DD;
      font-weight: 400;
      max-width: 600px;
      line-height: 1.4;
      margin-bottom: 16px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 14px;
      margin-top: 14px;
    }

    .meta-item .meta-label {
      font-size: 9.5px;
      color: #A3CFBB;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.4px;
      margin-bottom: 2px;
    }

    .meta-item .meta-value {
      font-size: 11.5px;
      font-weight: 700;
      color: #FFFFFF;
    }

    /* ── TYPOGRAPHY & SECTIONS ──────────────────────── */
    h2.section-header {
      font-size: 16px;
      font-weight: 800;
      color: #064E3B;
      margin: 24px 0 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 6px;
      page-break-after: avoid;
    }

    h2.section-header .section-num {
      background: #0F5132;
      color: #FFF;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 6px;
    }

    h3.sub-header {
      font-size: 13.5px;
      font-weight: 700;
      color: #1E293B;
      margin: 18px 0 8px 0;
      page-break-after: avoid;
    }

    p {
      margin-bottom: 10px;
      color: #334155;
      font-size: 11.5px;
    }

    /* ── CALLOUT BOXES ──────────────────────────────── */
    .callout {
      border-radius: 8px;
      padding: 12px 16px;
      margin: 12px 0;
      font-size: 11px;
      page-break-inside: avoid;
    }

    .callout-info {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-left: 4px solid #16A34A;
      color: #14532D;
    }

    .callout-warning {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-left: 4px solid #F59E0B;
      color: #78350F;
    }

    .callout-tip {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-left: 4px solid #2563EB;
      color: #1E3A8A;
    }

    .callout-title {
      font-weight: 700;
      font-size: 11.5px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* ── ENDPOINT CARD ──────────────────────────────── */
    .endpoint-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      margin-bottom: 18px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.03);
      page-break-inside: avoid;
      overflow: hidden;
    }

    .endpoint-header {
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .endpoint-title-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .method-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 5px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .method-get    { background: #DBEAFE; color: #1E40AF; border: 1px solid #BFDBFE; }
    .method-post   { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
    .method-patch  { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    .method-delete { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }

    .endpoint-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: #0F172A;
    }

    .auth-badge {
      font-size: 9.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      background: #F1F5F9;
      color: #475569;
      border: 1px solid #CBD5E1;
    }

    .auth-badge.required {
      background: #FEF2F2;
      color: #991B1B;
      border-color: #FECACA;
    }

    .endpoint-body {
      padding: 12px 14px;
    }

    .endpoint-desc {
      font-size: 11.5px;
      color: #475569;
      margin-bottom: 10px;
    }

    /* ── CODE BOXES ─────────────────────────────────── */
    .code-box {
      background: #0F172A;
      border-radius: 6px;
      margin: 8px 0 12px 0;
      border: 1px solid #1E293B;
      overflow: hidden;
    }

    .code-box-header {
      background: #1E293B;
      color: #94A3B8;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
    }

    pre {
      padding: 10px 12px;
      overflow-x: auto;
      margin: 0;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #F8FAFC;
      line-height: 1.45;
    }

    .inline-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      background: #F1F5F9;
      color: #0F5132;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 600;
      border: 1px solid #E2E8F0;
    }

    /* ── TABLES ─────────────────────────────────────── */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 12px 0;
      font-size: 11px;
    }

    table.data-table th {
      background: #F8FAFC;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #E2E8F0;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    table.data-table td {
      padding: 6px 8px;
      border: 1px solid #E2E8F0;
      color: #475569;
      vertical-align: middle;
    }

    table.data-table tr:nth-child(even) td {
      background: #FAFAFA;
    }

    /* ── DIAGRAM CARDS ──────────────────────────────── */
    .flow-diagram {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px;
      margin: 12px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #334155;
      line-height: 1.5;
      white-space: pre;
      overflow-x: auto;
      page-break-inside: avoid;
    }

    .state-pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .state-assigned   { background: #DBEAFE; color: #1E40AF; }
    .state-pickup     { background: #FEF3C7; color: #92400E; }
    .state-enroute    { background: #E0E7FF; color: #3730A3; }
    .state-arrived    { background: #EDE9FE; color: #5B21B6; }
    .state-delivered  { background: #DCFCE7; color: #166534; }
    .state-failed     { background: #FEE2E2; color: #991B1B; }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- ════════════════ COVER BANNER ════════════════ -->
  <div class="cover-banner">
    <div class="brand-pill">Bems Farms Logistics Ecosystem</div>
    <div class="cover-title">Driver Mobile App — API Specification</div>
    <div class="cover-subtitle">
      Complete Integration Manual for iOS & Android Mobile Engineers. Covers Authentication, Automated Dispatch, Real-Time Location Telemetry, Order State Transitions, and Driver Earnings.
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Target Apps</div>
        <div class="meta-value">React Native / Flutter / Native</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Protocol</div>
        <div class="meta-value">RESTful HTTPS JSON</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Auth Format</div>
        <div class="meta-value">JWT Bearer Token</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Environment</div>
        <div class="meta-value">api.bemsfarms.com</div>
      </div>
    </div>
  </div>

  <!-- ════════════════ 1. ARCHITECTURE & WORKFLOW ════════════════ -->
  <h2 class="section-header"><span class="section-num">01</span> System Architecture & Core Lifecycle</h2>
  <p>
    The Bems Farms Driver App coordinates between customer orders, automated delivery routing, administrative fleet dispatch, and live client delivery tracking.
  </p>

  <div class="flow-diagram">
┌─────────────────────────┐          ┌──────────────────────────┐          ┌─────────────────────────┐
│   Customer / Client     │          │    Bems Farms Backend    │          │    Driver Mobile App    │
│  (Places Order online)  │ ───────> │  Auto-Dispatches to Zone │ ───────> │ (Receives Notification) │
└─────────────────────────┘          └──────────────────────────┘          └─────────────────────────┘
                                                  │                                     │
                                                  ▼                                     ▼
                                     ┌──────────────────────────┐          ┌─────────────────────────┐
                                     │   Admin Operations Map   │ <─────── │ Periodic GPS Location   │
                                     │  (Live Fleet Monitoring) │          │ (Every 10-15s in shift) │
                                     └──────────────────────────┘          └─────────────────────────┘</div>

  <h3 class="sub-header">Delivery Milestone State Transitions</h3>
  <table class="data-table">
    <thead>
      <tr>
        <th>Driver API Action</th>
        <th>Delivery Status</th>
        <th>Customer Tracking State</th>
        <th>System Action Trigger</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code class="inline-code">PATCH /status ("accepted")</code></td>
        <td><span class="state-pill state-assigned">assigned</span></td>
        <td>Driver Assigned</td>
        <td>Locks order to driver; notifies customer of driver assignment.</td>
      </tr>
      <tr>
        <td><code class="inline-code">PATCH /status ("awaiting_pickup")</code></td>
        <td><span class="state-pill state-pickup">awaiting_pickup</span></td>
        <td>Packed & Ready</td>
        <td>Driver arrives at farm/store hub to verify item checklist.</td>
      </tr>
      <tr>
        <td><code class="inline-code">PATCH /status ("en_route")</code></td>
        <td><span class="state-pill state-enroute">en_route</span></td>
        <td>Out for Delivery</td>
        <td>Driver departs hub with goods; triggers customer live GPS map.</td>
      </tr>
      <tr>
        <td><code class="inline-code">PATCH /status ("arrived")</code></td>
        <td><span class="state-pill state-arrived">arrived</span></td>
        <td>Driver Arrived</td>
        <td>Driver reaches delivery address / security gate.</td>
      </tr>
      <tr>
        <td><code class="inline-code">PATCH /status ("delivered")</code></td>
        <td><span class="state-pill state-delivered">delivered</span></td>
        <td>Delivered</td>
        <td><strong>Credits driver wallet (+₦500 commission)</strong> and marks order completed.</td>
      </tr>
      <tr>
        <td><code class="inline-code">PATCH /status ("failed")</code></td>
        <td><span class="state-pill state-failed">delivery_attempted</span></td>
        <td>Delivery Attempted</td>
        <td>Logs failure reason (unreachable, incorrect address) for admin follow-up.</td>
      </tr>
    </tbody>
  </table>

  <!-- ════════════════ 2. AUTHENTICATION & PROFILE ════════════════ -->
  <h2 class="section-header"><span class="section-num">02</span> Authentication & Profile Endpoints</h2>

  <!-- 2.1 Login -->
  <div class="endpoint-card">
    <div class="endpoint-header">
      <div class="endpoint-title-box">
        <span class="method-badge method-post">POST</span>
        <span class="endpoint-path">/api/driver/auth/login</span>
      </div>
      <span class="auth-badge">Public</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">
        Authenticates a driver using their registered phone number (or email) and 6-digit access PIN/password.
      </div>
      <div class="code-box">
        <div class="code-box-header"><span>REQUEST PAYLOAD (JSON)</span><span>application/json</span></div>
        <pre><code>{
  "phone": "08012345678",
  "password": "123456"
}</code></pre>
      </div>

      <div class="code-box">
        <div class="code-box-header"><span>SUCCESS RESPONSE (200 OK)</span><span>application/json</span></div>
        <pre><code>{
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
}</code></pre>
      </div>
    </div>
  </div>

  <!-- 2.2 Get Profile -->
  <div class="endpoint-card">
    <div class="endpoint-header">
      <div class="endpoint-title-box">
        <span class="method-badge method-get">GET</span>
        <span class="endpoint-path">/api/driver/auth/me</span>
      </div>
      <span class="auth-badge required">Bearer Token Required</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Retrieves fresh driver session data, rating, and current online status.</div>
      <div class="code-box">
        <div class="code-box-header"><span>SUCCESS RESPONSE (200 OK)</span><span>application/json</span></div>
        <pre><code>{
  "driver": {
    "id": 1,
    "name": "Ibrahim Musa",
    "phone": "08012345678",
    "rating": 4.8,
    "total_deliveries": 128,
    "total_earnings": 64000.00,
    "is_available": true,
    "is_on_delivery": false
  }
}</code></pre>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- 2.3 Update Profile -->
  <div class="endpoint-card">
    <div class="endpoint-header">
      <div class="endpoint-title-box">
        <span class="method-badge method-patch">PATCH</span>
        <span class="endpoint-path">/api/driver/auth/profile</span>
      </div>
      <span class="auth-badge required">Bearer Token Required</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">Updates avatar photo, email, contact phone, or default bank payout credentials.</div>
      <div class="code-box">
        <div class="code-box-header"><span>REQUEST PAYLOAD (JSON)</span><span>application/json</span></div>
        <pre><code>{
  "avatar_url": "https://api.bemsfarms.com/uploads/new_avatar.jpg",
  "bank_name": "Guaranty Trust Bank (GTBank)",
  "account_number": "0123456789",
  "account_name": "Ibrahim Musa"
}</code></pre>
      </div>
    </div>
  </div>

  <!-- 2.4 Toggle Availability -->
  <div class="endpoint-card">
    <div class="endpoint-header">
      <div class="endpoint-title-box">
        <span class="method-badge method-patch">PATCH</span>
        <span class="endpoint-path">/api/driver/availability</span>
      </div>
      <span class="auth-badge required">Bearer Token Required</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">
        Toggles driver shift availability. When <code class="inline-code">is_available: true</code>, driver receives automated order dispatching.
      </div>
      <div class="code-box">
        <div class="code-box-header"><span>REQUEST PAYLOAD (JSON)</span><span>application/json</span></div>
        <pre><code>{
  "is_available": true
}</code></pre>
      </div>
      <div class="code-box">
        <div class="code-box-header"><span>SUCCESS RESPONSE (200 OK)</span><span>application/json</span></div>
        <pre><code>{
  "is_available": true,
  "status": "active",
  "message": "Driver is now ONLINE and ready for orders"
}</code></pre>
      </div>
    </div>
  </div>

  <!-- ════════════════ 3. DELIVERIES & ORDERS ════════════════ -->
  <h2 class="section-header"><span class="section-num">03</span> Deliveries & Order Management</h2>

  <!-- 3.1 Active Deliveries -->
  <div class="endpoint-card">
    <div class="endpoint-header">
      <div class="endpoint-title-box">
        <span class="method-badge method-get">GET</span>
        <span class="endpoint-path">/api/driver/deliveries</span>
      </div>
      <span class="auth-badge required">Bearer Token Required</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">
        Returns all active assigned orders for this driver. Includes line items, product pictures, packaging unit, customer contact, and delivery GPS coordinates.
      </div>
      <div class="code-box">
        <div class="code-box-header"><span>SUCCESS RESPONSE (200 OK)</span><span>application/json</span></div>
        <pre><code>{
  "count": 1,
  "deliveries": [
    {
      "delivery_id": 42,
      "delivery_ref": "DEL-2026-0042",
      "delivery_status": "en_route",
      "assigned_at": "2026-09-20T10:15:00.000Z",
      "dispatched_at": "2026-09-20T10:30:00.000Z",
      "eta_minutes": 25,
      "delivery_address": "Plot 12, Gana Street, Maitama, Abuja",
      "customer_name": "Emelda Ejike",
      "customer_phone": "08123456789",
      "customer_lat": 9.0820,
      "customer_lng": 7.4951,
      "zone_name": "Maitama & Wuse Zone",
      "order_id": 105,
      "order_ref": "ORD-2026-0105",
      "order_total": 18500.00,
      "payment_method": "paystack",
      "payment_status": "paid",
      "order_notes": "Please call when at the gate.",
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
}</code></pre>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- 3.2 Update Status -->
  <div class="endpoint-card">
    <div class="endpoint-header">
      <div class="endpoint-title-box">
        <span class="method-badge method-patch">PATCH</span>
        <span class="endpoint-path">/api/driver/deliveries/:orderId/status</span>
      </div>
      <span class="auth-badge required">Bearer Token Required</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">
        Progresses the delivery lifecycle. When marking as <code class="inline-code">delivered</code>, attach proof photo and delivery notes.
      </div>

      <div class="code-box">
        <div class="code-box-header"><span>MARK OUT FOR DELIVERY</span><span>application/json</span></div>
        <pre><code>{
  "status": "en_route",
  "eta_minutes": 25
}</code></pre>
      </div>

      <div class="code-box">
        <div class="code-box-header"><span>MARK DELIVERED WITH PROOF</span><span>application/json</span></div>
        <pre><code>{
  "status": "delivered",
  "proof_note": "Handed directly to customer at door.",
  "proof_photo": "https://api.bemsfarms.com/uploads/delivery_proof_42.jpg"
}</code></pre>
      </div>

      <div class="code-box">
        <div class="code-box-header"><span>SUCCESS RESPONSE (200 OK)</span><span>application/json</span></div>
        <pre><code>{
  "message": "Delivery status updated to delivered",
  "delivery": {
    "delivery_id": 42,
    "delivery_status": "delivered",
    "order_id": 105,
    "order_status": "delivered",
    "tracking_status": "delivered",
    "delivered_at": "2026-09-20T11:05:00.000Z"
  }
}</code></pre>
      </div>
    </div>
  </div>

  <!-- 3.3 Delivery History -->
  <div class="endpoint-card">
    <div class="endpoint-header">
      <div class="endpoint-title-box">
        <span class="method-badge method-get">GET</span>
        <span class="endpoint-path">/api/driver/deliveries/history</span>
      </div>
      <span class="auth-badge required">Bearer Token Required</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">
        Paginated history of all completed and past deliveries with summary metrics. Query parameters: <code class="inline-code">page</code>, <code class="inline-code">limit</code>, <code class="inline-code">from_date</code>, <code class="inline-code">to_date</code>.
      </div>
      <div class="code-box">
        <div class="code-box-header"><span>SUCCESS RESPONSE (200 OK)</span><span>application/json</span></div>
        <pre><code>{
  "page": 1,
  "limit": 20,
  "total": 45,
  "stats": {
    "total_delivered": 43,
    "total_failed": 2,
    "total_history": 45
  },
  "deliveries": [ ... ]
}</code></pre>
      </div>
    </div>
  </div>

  <!-- ════════════════ 4. GPS & LOCATION ════════════════ -->
  <h2 class="section-header"><span class="section-num">04</span> Live GPS Location Telemetry</h2>

  <div class="endpoint-card">
    <div class="endpoint-header">
      <div class="endpoint-title-box">
        <span class="method-badge method-post">POST</span>
        <span class="endpoint-path">/api/driver/location</span>
      </div>
      <span class="auth-badge required">Bearer Token Required</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">
        Streams real-time GPS coordinate telemetry from the driver device to the dispatch center and customer live map.
      </div>
      <div class="code-box">
        <div class="code-box-header"><span>REQUEST PAYLOAD (JSON)</span><span>application/json</span></div>
        <pre><code>{
  "latitude": 9.076543,
  "longitude": 7.398621,
  "heading": 182.5,
  "speed": 34.2,
  "accuracy": 4.5
}</code></pre>
      </div>
      <div class="code-box">
        <div class="code-box-header"><span>SUCCESS RESPONSE (201 CREATED)</span><span>application/json</span></div>
        <pre><code>{
  "success": true,
  "location": {
    "id": 1045,
    "driver_id": 1,
    "latitude": 9.076543,
    "longitude": 7.398621,
    "recorded_at": "2026-09-20T10:45:12.000Z"
  }
}</code></pre>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ════════════════ 5. WALLET & WITHDRAWALS ════════════════ -->
  <h2 class="section-header"><span class="section-num">05</span> Driver Wallet & Bank Withdrawals</h2>

  <!-- 5.1 Earnings -->
  <div class="endpoint-card">
    <div class="endpoint-header">
      <div class="endpoint-title-box">
        <span class="method-badge method-get">GET</span>
        <span class="endpoint-path">/api/driver/earnings</span>
      </div>
      <span class="auth-badge required">Bearer Token Required</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">
        Returns available balance, total accumulated earnings, pending withdrawals, per-delivery commission, and payout history.
      </div>
      <div class="code-box">
        <div class="code-box-header"><span>SUCCESS RESPONSE (200 OK)</span><span>application/json</span></div>
        <pre><code>{
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
  "commissions": [ ... ],
  "payouts": [ ... ]
}</code></pre>
      </div>
    </div>
  </div>

  <!-- 5.2 Withdraw -->
  <div class="endpoint-card">
    <div class="endpoint-header">
      <div class="endpoint-title-box">
        <span class="method-badge method-post">POST</span>
        <span class="endpoint-path">/api/driver/withdraw</span>
      </div>
      <span class="auth-badge required">Bearer Token Required</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-desc">
        Requests a direct bank transfer payout from available balance to the driver's bank account.
      </div>
      <div class="code-box">
        <div class="code-box-header"><span>REQUEST PAYLOAD (JSON)</span><span>application/json</span></div>
        <pre><code>{
  "amount": 5000,
  "bank_name": "GTBank",
  "account_number": "0123456789",
  "account_name": "Ibrahim Musa",
  "notes": "Weekly earnings withdrawal"
}</code></pre>
      </div>
      <div class="code-box">
        <div class="code-box-header"><span>SUCCESS RESPONSE (201 CREATED)</span><span>application/json</span></div>
        <pre><code>{
  "message": "Withdrawal request submitted successfully. It will be reviewed and processed by admin.",
  "payout": {
    "id": 9,
    "payout_ref": "PAY-MK92-4B2E",
    "amount": 5000.00,
    "status": "pending",
    "requested_at": "2026-09-20T12:00:00.000Z"
  },
  "remaining_available_balance": 4000.00
}</code></pre>
      </div>
    </div>
  </div>

  <!-- ════════════════ 6. MOBILE CLIENT IMPLEMENTATION ════════════════ -->
  <h2 class="section-header"><span class="section-num">06</span> Mobile App Guidelines for Developers</h2>

  <div class="callout callout-tip">
    <div class="callout-title">🛰️ 1. Background GPS Telemetry Tracking</div>
    When the driver switches availability to <code class="inline-code">is_available: true</code> or enters <code class="inline-code">en_route</code>, register a background GPS task that pings <code class="inline-code">POST /api/driver/location</code> every <strong>10 to 15 seconds</strong>:
    <ul style="margin-top: 6px; margin-left: 18px;">
      <li><strong>iOS:</strong> Add <code class="inline-code">UIBackgroundModes: ["location"]</code> to <code class="inline-code">Info.plist</code> and request <code class="inline-code">kCLAuthorizationStatusAuthorizedAlways</code>.</li>
      <li><strong>Android:</strong> Configure <code class="inline-code">ACCESS_FINE_LOCATION</code>, <code class="inline-code">ACCESS_BACKGROUND_LOCATION</code> and a Foreground Notification Service.</li>
    </ul>
  </div>

  <div class="callout callout-info">
    <div class="callout-title">🗺️ 2. Deep-Link Navigation Links</div>
    Add a 1-tap "Navigate" button on active order cards using direct OS map schemes:
    <ul style="margin-top: 6px; margin-left: 18px;">
      <li><strong>Google Maps:</strong> <code class="inline-code">https://www.google.com/maps/dir/?api=1&destination=\${customer_lat},\${customer_lng}</code></li>
      <li><strong>Apple Maps:</strong> <code class="inline-code">maps://?daddr=\${customer_lat},\${customer_lng}</code></li>
    </ul>
  </div>

  <div class="callout callout-warning">
    <div class="callout-title">📞 3. Direct Customer Call / WhatsApp Links</div>
    Allow drivers to contact customers immediately in 1 tap:
    <ul style="margin-top: 6px; margin-left: 18px;">
      <li><strong>Phone Dialer:</strong> <code class="inline-code">tel:\${customer_phone}</code></li>
      <li><strong>WhatsApp Chat:</strong> <code class="inline-code">https://wa.me/234\${customer_phone.replace(/^0/, '')}</code></li>
    </ul>
  </div>

</body>
</html>
`;

fs.writeFileSync(htmlPath, htmlContent, 'utf8');

try {
  const chromePath = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome';
  execSync(`${chromePath} --headless --disable-gpu --print-to-pdf="${pdfPath}" --no-pdf-header-footer "${htmlPath}"`);
  console.log(`✅ High-Fidelity PDF successfully generated at: ${pdfPath}`);
} catch (err) {
  console.error('Error generating PDF with Chrome:', err.message);
} finally {
  if (fs.existsSync(htmlPath)) {
    fs.unlinkSync(htmlPath);
  }
}
