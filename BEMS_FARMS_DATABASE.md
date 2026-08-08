# Bems Farms — Complete Database Documentation
> The single source of truth for every table, column, relationship, and data flow in the Bems Farms platform.  
> Version: 1.0 | Date: June 28, 2026 | Status: Living Document

---

## TABLE OF CONTENTS

1. [System Architecture](#1-system-architecture)
2. [Database Overview](#2-database-overview)
3. [n8n AI Integration Map](#3-n8n-ai-integration-map)
4. [Module 1 — Auth & Users](#4-module-1--auth--users)
5. [Module 2 — Products](#5-module-2--products)
6. [Module 3 — Inventory](#6-module-3--inventory)
7. [Module 4 — Orders](#7-module-4--orders)
8. [Module 5 — Deliveries](#8-module-5--deliveries)
9. [Module 6 — Customers & Loyalty](#9-module-6--customers--loyalty)
10. [Module 7 — Staff & HR](#10-module-7--staff--hr)
11. [Module 8 — Accounts & Finance](#11-module-8--accounts--finance)
12. [Module 9 — Point of Sale](#12-module-9--point-of-sale)
13. [Module 10 — Chef Bems AI (Admin Layer)](#13-module-10--chef-bems-ai-admin-layer)
14. [Module 11 — Multi-Store](#14-module-11--multi-store)
15. [Module 12 — Settings & Config](#15-module-12--settings--config)
16. [Module 13 — Customer App](#16-module-13--customer-app)
17. [Module 14 — Driver App](#17-module-14--driver-app)
18. [Module 15 — Order Notification Pipeline](#18-module-15--order-notification-pipeline)
19. [n8n-Owned Tables](#19-n8n-owned-tables)
20. [Migration Strategy](#20-migration-strategy)
21. [RLS Security Policy](#21-rls-security-policy)
22. [API Sync Points](#22-api-sync-points)

---

## 1. SYSTEM ARCHITECTURE

### Platform Overview

Bems Farms runs on a **unified backend** serving four frontends from one Supabase PostgreSQL database:

```
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                  │
│              Project: helhpaybcjrxljizblve               │
│              Region: eu-central-1                         │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │   Node.js / Express API  │
              │   (Unified Backend)      │
              └──┬──────┬──────┬──────┬─┘
                 │      │      │      │
         ┌───────▼┐ ┌───▼──┐ ┌▼─────┐ ┌▼──────────┐
         │ Admin   │ │Cust. │ │Driver│ │Web / Next │
         │ React   │ │React │ │React │ │.js (PWA)  │
         │ (this)  │ │Native│ │Native│ │           │
         └─────────┘ └──────┘ └──────┘ └───────────┘
                           │
              ┌────────────▼────────────┐
              │   n8n (Chef Bems AI)    │
              │  bemsfarms.app.n8n.cloud │
              │  Reads Supabase directly │
              └─────────────────────────┘
```

### Three Auth Systems (Same Database)

| Auth System | Table | Who Uses It |
|---|---|---|
| Admin staff | `users` | Admin React app — 6 roles |
| Customers | `customers` + `customer_auth` | Customer app + Website |
| Drivers | `drivers` + `driver_auth` | Driver mobile app |

### Role-Based Access Control (RBAC)

| Role | Access Level |
|---|---|
| `superadmin` | Full access — all modules |
| `manager` | All modules except finance deep-dive |
| `accountant` | Finance, orders view only |
| `delivery_manager` | Deliveries, drivers, orders view |
| `cashier` | POS, orders, customers |
| `kitchen_staff` | Inventory, orders (kitchen view) |

---

## 2. DATABASE OVERVIEW

### Current State vs Target

| Status | Tables |
|---|---|
| Existing in Supabase | 28 |
| n8n-owned (keep, hands-off) | 14 |
| Exist but need column additions | 8 |
| Missing — need to be created | 52 |
| **Target total** | **~86** |

### All Tables at a Glance

| Module | Tables | Status |
|---|---|---|
| Auth & Users | users | Exists (needs columns) |
| Products | categories, sub_categories, brands, units_of_measure, products, product_images, product_variants, product_reviews | categories/products exist (needs columns); rest missing |
| Inventory | warehouses, stock_in, stock_in_items, stock_out, stock_out_items, stock_adjustments, stock_adjustment_items, stock_transfers, stock_transfer_items, batch_management, lost_items, stock_alerts | inventory exists (partial); rest missing |
| Orders | orders, order_items, order_status_history, invoices, refunds | orders/order_items exist (needs columns); rest missing |
| Deliveries | drivers, delivery_zones, zone_drivers, deliveries | delivery_zones exists; rest missing |
| Customers & Loyalty | customers, customer_dietary_profiles, loyalty_tiers, customer_loyalty, loyalty_transactions, customer_activity_log | All missing |
| Staff & HR | staff, staff_attendance, staff_schedules, staff_holidays, payroll | All missing |
| Accounts & Finance | bank_accounts, income, expenses, money_transfers, transactions, driver_commissions, commission_payments | All missing |
| POS | pos_sessions, pos_held_orders | All missing |
| Chef Bems AI (admin) | dietary_rules, meal_associations, meal_dietary_flags, meal_ai_pairings, ai_conversations | dietary_rules exists (n8n-owned); admin overlay tables missing |
| Multi-Store | stores | Missing |
| Settings & Config | system_settings, tax_settings, coupons, coupon_usages, payment_gateways, currencies, notifications | All missing |
| Customer App | customer_auth, customer_devices, customer_addresses, customer_wallets, wallet_transactions, customer_saved_items, customer_carts, customer_cart_items, customer_notifications | All missing |
| Driver App | driver_auth, driver_devices, driver_availability, driver_locations, driver_notifications, delivery_assignments | All missing |
| Notification Pipeline | order_tracking_events, notification_templates, notification_logs | All missing |
| n8n AI (owned) | ingredients, meals, meal_ingredients, allergy_rules, substitutions, unit_conversions, customer_preferences, nancy_conversations, nancy_cart_sessions, chef_bems_memory, product_associations, catalogue, promotions_bundles, dietary_rules | All exist — DO NOT modify structure |

---

## 3. N8N AI INTEGRATION MAP

Chef Bems AI (Nancy) runs in n8n and connects **directly to Supabase**. The admin backend must keep these tables in sync.

### Tables n8n Reads (Admin Must Keep Updated)

| Table | What n8n Uses It For | Admin Action That Must Sync |
|---|---|---|
| `catalogue` | Product search, price, stock availability | When admin adds/updates `products`, also update `catalogue` |
| `inventory` | Stock level check (JOIN with catalogue on SKU) | When stock changes, update `inventory.available_qty` |
| `dietary_rules` | Dietary filtering by rule name | Admin edits dietary rules → same table |
| `allergy_rules` | Allergy checks UNION with dietary_rules | Admin edits allergy rules → same table |
| `promotions_bundles` | Active promotions for AI to recommend | Admin creates promos → same table |
| `delivery_zones` | Zone lookup by area name | Admin edits zones → same table |
| `customer_preferences` | Customer dietary profile per session | Customer updates profile → sync here |
| `product_associations` | "You might also need" recommendations | Trained from order history |
| `meals` | Browse all meals, meal search | Admin edits meals → same table |
| `meal_ingredients` | Ingredient list per meal | Admin edits meal ingredients → same table |
| `substitutions` | Ingredient substitution suggestions | Admin manages substitutions → same table |
| `unit_conversions` | Quantity math (all 315 rows) | Rarely changes |

### Tables n8n Writes To

| Table | Operation | When |
|---|---|---|
| `nancy_conversations` | INSERT per turn | Every AI chat message |
| `nancy_cart_sessions` | INSERT | When customer confirms AI cart |
| `chef_bems_memory` | UPSERT | Per session (managed by LangChain) |

### Key API Endpoint (Not Yet Wired)

When an AI cart is confirmed in n8n, it POSTs to:
```
POST https://your-backend.com/api/cart/notify
```
This endpoint needs to be built. It should receive the cart payload from n8n and create an `orders` + `order_items` record in Supabase.

---

## 4. MODULE 1 — AUTH & USERS

### `users`
> Admin staff who log into the Bems Farms admin panel.  
> **Status: EXISTS** (9 rows) — needs column additions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | SERIAL / BIGINT | PK | Auto-increment |
| name | VARCHAR(100) | NOT NULL | Full name |
| email | VARCHAR(150) | UNIQUE NOT NULL | Login email |
| password | VARCHAR | NOT NULL | bcrypt hash |
| role | VARCHAR(30) | CHECK IN enum | superadmin, manager, accountant, delivery_manager, cashier, kitchen_staff |
| phone | VARCHAR(20) | | |
| avatar_url | TEXT | | Profile photo URL |
| status | VARCHAR(20) | DEFAULT 'active' | active, inactive, suspended |
| store_id | INT | FK → stores | NULL = HQ / all stores access |
| email_verified | BOOLEAN | DEFAULT false | |
| verification_token | VARCHAR | | Email verification |
| reset_token | VARCHAR | | Password reset |
| reset_expires | TIMESTAMP | | Reset token expiry |
| failed_login_attempts | INT | DEFAULT 0 | Lockout logic |
| locked_until | TIMESTAMP | | Account lockout |
| refresh_token | TEXT | | JWT refresh |
| last_login | TIMESTAMP | | Last successful login |
| google_id | TEXT | | Google OAuth |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Columns to ADD:**
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS store_id INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin','manager','accountant','delivery_manager','cashier','kitchen_staff','user'));
```

---

## 5. MODULE 2 — PRODUCTS

### `categories`
> Top-level product groupings.  
> **Status: EXISTS** (8 rows) — needs column additions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | SERIAL | PK | |
| name | VARCHAR(100) | UNIQUE NOT NULL | e.g. Meals, Seafood, Meat |
| icon | VARCHAR(50) | | emoji or icon class |
| description | TEXT | | |
| status | VARCHAR(20) | DEFAULT 'active' | active, inactive |
| sort_order | INT | DEFAULT 0 | display order |
| created_at | TIMESTAMP | DEFAULT NOW() | |

```sql
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS icon VARCHAR(50),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
```

---

### `sub_categories`
> Nested under categories.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| category_id | INT | FK → categories NOT NULL | |
| name | VARCHAR(100) | NOT NULL | |
| description | TEXT | | |
| status | VARCHAR(20) | DEFAULT 'active' | active, inactive |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `brands`
> Product brands/manufacturers.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| name | VARCHAR(100) | UNIQUE NOT NULL | |
| logo_url | TEXT | | |
| description | TEXT | | |
| status | VARCHAR(20) | DEFAULT 'active' | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `units_of_measure`
> Measurement units: kg, g, bag, bunch, litre, piece, crate, tuber, bottle, pack.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| name | VARCHAR(50) | UNIQUE NOT NULL | e.g. Kilogram |
| abbreviation | VARCHAR(10) | NOT NULL | e.g. kg |
| type | VARCHAR(20) | | weight, volume, count, length |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `products`
> Core product/SKU catalogue for the admin system.  
> **Status: EXISTS** (42 rows) — needs significant column additions.  
> ⚠️ The n8n AI does NOT read this table — it reads `catalogue`. Keep them in sync via backend.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | SERIAL | PK | |
| sku | VARCHAR(50) | UNIQUE | Auto-generated or manual |
| name | VARCHAR(200) | NOT NULL | |
| description | TEXT | | |
| category_id | INT | FK → categories | |
| sub_category_id | INT | FK → sub_categories | nullable |
| brand_id | INT | FK → brands | nullable |
| unit_of_measure_id | INT | FK → units_of_measure | |
| unit (legacy) | VARCHAR | | existing column — keep for now |
| model_variant | VARCHAR(100) | | e.g. 1kg, 500ml |
| tags | JSONB | | array of strings |
| price (legacy) | DECIMAL(12,2) | | existing — maps to unit_price |
| unit_price | DECIMAL(12,2) | NOT NULL | selling price |
| cost_price | DECIMAL(12,2) | | purchase price |
| margin_pct | DECIMAL(5,2) | | auto-calculated |
| tax_rate | DECIMAL(5,2) | DEFAULT 7.5 | |
| stock | INT | DEFAULT 100 | existing stock column |
| stock_quantity | INT | | alias for stock |
| low_stock_threshold | INT | DEFAULT 10 | |
| track_inventory | BOOLEAN | DEFAULT true | |
| available_for_sale | BOOLEAN | DEFAULT true | |
| is_featured | BOOLEAN | DEFAULT false | |
| expiry_date | DATE | | nullable |
| return_policy | VARCHAR(20) | DEFAULT 'no_return' | no_return, 24h, 48h, 7days |
| barcode | VARCHAR(100) | | |
| image_url | TEXT | | existing — primary image |
| video_url | TEXT | | YouTube/Vimeo link |
| status | VARCHAR(20) | DEFAULT 'active' | active, inactive, archived |
| store_id | INT | FK → stores | NULL = all stores |
| created_by | INT | FK → users | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS sub_category_id INTEGER,
  ADD COLUMN IF NOT EXISTS brand_id INTEGER,
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS margin_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 7.5,
  ADD COLUMN IF NOT EXISTS model_variant VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tags JSONB,
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS available_for_sale BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS return_policy VARCHAR(20) DEFAULT 'no_return',
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS store_id INTEGER,
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
-- Backfill unit_price from existing price column:
UPDATE products SET unit_price = price WHERE unit_price IS NULL;
```

---

### `product_images`
> Up to 4 images per product.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| product_id | INT | FK → products NOT NULL | |
| image_url | TEXT | NOT NULL | |
| image_title | VARCHAR(100) | | |
| image_tags | VARCHAR(200) | | |
| is_primary | BOOLEAN | DEFAULT false | |
| sort_order | INT | DEFAULT 1 | 1–4 |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `product_variants`
> Different sizes/forms of the same product (500g, 1kg, 2L, etc.).  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| product_id | INT | FK → products NOT NULL | |
| name | VARCHAR(100) | NOT NULL | e.g. "500g", "1kg" |
| sku | VARCHAR(50) | UNIQUE NOT NULL | |
| unit_price | DECIMAL(12,2) | NOT NULL | |
| cost_price | DECIMAL(12,2) | | |
| stock_quantity | INT | DEFAULT 0 | |
| barcode | VARCHAR(100) | | |
| status | VARCHAR(20) | DEFAULT 'active' | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `product_reviews`
> Customer star ratings and written reviews.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| product_id | INT | FK → products NOT NULL | |
| customer_id | INT | FK → customers NOT NULL | |
| order_id | INT | FK → orders | ensures they purchased it |
| rating | SMALLINT | CHECK 1–5 | |
| comment | TEXT | | |
| status | VARCHAR(20) | DEFAULT 'pending' | pending, approved, rejected |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

## 6. MODULE 3 — INVENTORY

### `warehouses`
> Physical storage locations.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| code | VARCHAR(20) | UNIQUE NOT NULL | e.g. WH-001 |
| name | VARCHAR(100) | NOT NULL | Main Store, Cold Room, Dry Store, Farm Store |
| type | VARCHAR(30) | NOT NULL | general, cold_chain, dry_goods, farm |
| manager_name | VARCHAR(100) | | |
| address | VARCHAR(255) | | |
| phone | VARCHAR(20) | | |
| capacity | INT | | total units capacity |
| status | VARCHAR(20) | DEFAULT 'active' | active, inactive |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `stock_in`
> Purchase receipts — stock arriving at a warehouse.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| reference_no | VARCHAR(30) | UNIQUE NOT NULL | e.g. SI-2026-001 |
| date | DATE | NOT NULL | |
| supplier_name | VARCHAR(150) | | free text |
| warehouse_id | INT | FK → warehouses NOT NULL | |
| total_qty | INT | | sum of line items |
| total_value | DECIMAL(12,2) | | |
| status | VARCHAR(20) | DEFAULT 'pending' | pending, completed, cancelled |
| notes | TEXT | | |
| approved_by | INT | FK → users | nullable |
| created_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `stock_in_items`
> Line items within a stock-in receipt.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| stock_in_id | INT | FK → stock_in NOT NULL | |
| product_id | INT | FK → products NOT NULL | |
| quantity | INT | NOT NULL | |
| cost_price | DECIMAL(12,2) | | per unit at purchase |
| total | DECIMAL(12,2) | | quantity × cost_price |
| expiry_date | DATE | | nullable |
| batch_no | VARCHAR(50) | | nullable |

---

### `stock_out`
> Stock leaving warehouse (wastage, spoilage, internal consumption).  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| reference_no | VARCHAR(30) | UNIQUE NOT NULL | e.g. SO-2026-001 |
| date | DATE | NOT NULL | |
| warehouse_id | INT | FK → warehouses NOT NULL | |
| reason | VARCHAR(200) | | |
| total_qty | INT | | |
| status | VARCHAR(20) | DEFAULT 'pending' | pending, completed |
| notes | TEXT | | |
| created_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `stock_out_items`
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| stock_out_id | INT | FK → stock_out NOT NULL | |
| product_id | INT | FK → products NOT NULL | |
| quantity | INT | NOT NULL | |
| cost_price | DECIMAL(12,2) | | |
| total | DECIMAL(12,2) | | |

---

### `stock_adjustments`
> Manual stock corrections after physical counting.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| reference_no | VARCHAR(30) | UNIQUE NOT NULL | e.g. ADJ-2026-001 |
| date | DATE | NOT NULL | |
| warehouse_id | INT | FK → warehouses NOT NULL | |
| reason | VARCHAR(30) | | damaged, expired, theft, recount, other |
| notes | TEXT | | |
| status | VARCHAR(20) | DEFAULT 'pending' | pending, approved, rejected |
| approved_by | INT | FK → users | |
| created_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `stock_adjustment_items`
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| adjustment_id | INT | FK → stock_adjustments NOT NULL | |
| product_id | INT | FK → products NOT NULL | |
| qty_before | INT | NOT NULL | |
| qty_after | INT | NOT NULL | |
| difference | INT | | qty_after - qty_before (can be negative) |

---

### `stock_transfers`
> Moving stock between warehouses.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| reference_no | VARCHAR(30) | UNIQUE NOT NULL | e.g. TRF-2026-001 |
| date | DATE | NOT NULL | |
| from_warehouse_id | INT | FK → warehouses NOT NULL | |
| to_warehouse_id | INT | FK → warehouses NOT NULL | |
| status | VARCHAR(30) | DEFAULT 'pending' | pending, in_transit, completed, cancelled |
| notes | TEXT | | |
| created_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `stock_transfer_items`
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| transfer_id | INT | FK → stock_transfers NOT NULL | |
| product_id | INT | FK → products NOT NULL | |
| quantity | INT | NOT NULL | |

---

### `batch_management`
> Tracks product batches with expiry for FEFO (First Expired, First Out).  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| product_id | INT | FK → products NOT NULL | |
| warehouse_id | INT | FK → warehouses NOT NULL | |
| batch_no | VARCHAR(50) | NOT NULL | |
| quantity | INT | NOT NULL | |
| cost_price | DECIMAL(12,2) | | |
| expiry_date | DATE | NOT NULL | |
| status | VARCHAR(20) | DEFAULT 'active' | active, expired, consumed |
| received_at | TIMESTAMP | DEFAULT NOW() | |

---

### `lost_items`
> Damaged, lost, or stolen stock records.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| product_id | INT | FK → products NOT NULL | |
| warehouse_id | INT | FK → warehouses NOT NULL | |
| quantity | INT | NOT NULL | |
| reason | TEXT | | |
| estimated_value | DECIMAL(12,2) | | |
| reported_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `stock_alerts`
> Auto-triggered when stock falls below reorder threshold.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| product_id | INT | FK → products NOT NULL | |
| warehouse_id | INT | FK → warehouses | |
| current_qty | INT | | |
| reorder_qty | INT | | |
| alert_type | VARCHAR(20) | | low_stock, out_of_stock, expiry_soon |
| status | VARCHAR(20) | DEFAULT 'open' | open, acknowledged, resolved |
| created_at | TIMESTAMP | DEFAULT NOW() | |

> Also note: The existing `inventory` table (1,793 rows) is n8n-owned and tracks stock per SKU. Link it to the warehouse system by adding `warehouse_id` and `product_id` columns to `inventory`.

---

## 7. MODULE 4 — ORDERS

### `orders`
> Every order regardless of channel (online, app, AI chat, POS, walk-in).  
> **Status: EXISTS** (4 rows) — needs significant column additions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(30) | PK | e.g. ORD-2026-0130 — existing |
| order_ref | VARCHAR(30) | UNIQUE | structured ref (may equal id) |
| user_id | INT | FK → users | existing — admin who created it (nullable for online) |
| customer_id | INT | FK → customers | NEW — the actual customer |
| customer_name | VARCHAR(100) | | walk-in fallback |
| customer_phone | VARCHAR(20) | | walk-in fallback |
| channel | VARCHAR(30) | DEFAULT 'online' | online, mobile_app, chef_bems_ai, pos, physical_store |
| payment_method | VARCHAR(30) | | monnify, cash, bank_transfer, pos_card, qr_ussd, split |
| payment_ref | VARCHAR(100) | | gateway reference |
| subtotal | DECIMAL(12,2) | | before discounts |
| discount_amount | DECIMAL(12,2) | DEFAULT 0 | |
| delivery_fee | DECIMAL(12,2) | DEFAULT 0 | |
| tax_amount | DECIMAL(12,2) | DEFAULT 0 | |
| total | DECIMAL(12,2) | NOT NULL | final amount |
| driver_id | INT | FK → drivers | nullable until assigned |
| delivery_address | TEXT | | |
| zone_id | VARCHAR(50) | FK → delivery_zones | nullable |
| address | TEXT | | existing column |
| status | VARCHAR(30) | DEFAULT 'pending' | new_order, processing, packed_ready, driver_assigned, out_for_delivery, delivery_attempted, delivered, dispute, cancelled |
| tracking_status | VARCHAR(30) | | existing |
| tracking_notes | TEXT | | existing |
| store_id | INT | FK → stores | |
| notes | TEXT | | |
| cancel_reason | TEXT | | existing |
| cancelled_at | TIMESTAMP | | existing |
| created_by | INT | FK → users | nullable for online |
| created_at | TIMESTAMP | DEFAULT NOW() | existing |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_ref VARCHAR(30),
  ADD COLUMN IF NOT EXISTS customer_id INTEGER,
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS channel VARCHAR(30) DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_id INTEGER,
  ADD COLUMN IF NOT EXISTS zone_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS store_id INTEGER,
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
```

---

### `order_items`
> Line items per order.  
> **Status: EXISTS** (5 rows) — needs column additions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | SERIAL | PK | |
| order_id | VARCHAR(30) | FK → orders NOT NULL | |
| product_id | INT | FK → products NOT NULL | |
| product_name | VARCHAR(200) | | snapshot at time of sale |
| sku | VARCHAR(50) | | snapshot |
| quantity | INT | NOT NULL | |
| price | DECIMAL(12,2) | | existing — maps to unit_price |
| unit_price | DECIMAL(12,2) | | |
| discount_pct | DECIMAL(5,2) | DEFAULT 0 | |
| subtotal | DECIMAL(12,2) | | quantity × unit_price × (1 - discount_pct) |

```sql
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS sku VARCHAR(50),
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS discount_pct DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2);
UPDATE order_items SET unit_price = price WHERE unit_price IS NULL;
```

---

### `order_status_history`
> Full audit trail of every status change on every order.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| order_id | VARCHAR(30) | FK → orders NOT NULL | |
| from_status | VARCHAR(50) | | |
| to_status | VARCHAR(50) | NOT NULL | |
| changed_by | INT | FK → users | nullable for system/auto changes |
| notes | TEXT | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `invoices`
> Auto-generated from orders or manually created for corporate clients.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| invoice_ref | VARCHAR(30) | UNIQUE NOT NULL | e.g. INV-2026-0142 |
| order_id | VARCHAR(30) | FK → orders | nullable for manual invoices |
| customer_id | INT | FK → customers | |
| customer_name | VARCHAR(150) | | for corporate invoices |
| channel | VARCHAR(50) | | online, pos, corporate |
| type | VARCHAR(10) | DEFAULT 'auto' | auto, manual |
| date_issued | DATE | NOT NULL | |
| due_date | DATE | | |
| amount | DECIMAL(12,2) | NOT NULL | |
| discount_amount | DECIMAL(12,2) | DEFAULT 0 | |
| payment_method | VARCHAR(50) | | |
| status | VARCHAR(20) | DEFAULT 'draft' | draft, sent, paid, overdue, cancelled |
| paid_at | TIMESTAMP | | |
| notes | TEXT | | |
| created_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `refunds`
> Customer returns and refund processing.  
> **Status: EXISTS as `returns`** (0 rows) — rename and extend.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | SERIAL | PK | existing |
| refund_ref | VARCHAR(30) | UNIQUE | e.g. RFC-0048 |
| order_id | VARCHAR(30) | FK → orders | existing |
| customer_id | INT | FK → customers | |
| user_id | INT | FK → users | existing (admin who processed) |
| product_id | INT | FK → products | existing (single product) |
| reason | TEXT | | existing |
| description | TEXT | | existing |
| refund_amount | DECIMAL(12,2) | | |
| refund_method | VARCHAR(30) | DEFAULT 'original_payment' | original_payment, wallet_credit, cash |
| items_returned | JSONB | | array of {product_id, qty, condition} |
| quantity | INT | DEFAULT 1 | existing |
| status | VARCHAR(30) | DEFAULT 'submitted' | existing: submitted → pending → approved/rejected → processed |
| processed_by | INT | FK → users | |
| created_at | TIMESTAMP | DEFAULT NOW() | existing |

```sql
-- Rename returns → refunds (optional but cleaner)
-- ALTER TABLE returns RENAME TO refunds;
ALTER TABLE returns
  ADD COLUMN IF NOT EXISTS refund_ref VARCHAR(30) UNIQUE,
  ADD COLUMN IF NOT EXISTS customer_id INTEGER,
  ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS refund_method VARCHAR(30) DEFAULT 'original_payment',
  ADD COLUMN IF NOT EXISTS items_returned JSONB,
  ADD COLUMN IF NOT EXISTS processed_by INTEGER REFERENCES users(id);
```

---

## 8. MODULE 5 — DELIVERIES

### `drivers`
> Delivery staff — profiles, vehicle, and performance data.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| name | VARCHAR(100) | NOT NULL | |
| email | VARCHAR(150) | UNIQUE | |
| phone | VARCHAR(20) | UNIQUE NOT NULL | |
| avatar_url | TEXT | | |
| vehicle_type | VARCHAR(20) | | motorcycle, bicycle, car, van |
| vehicle_plate | VARCHAR(20) | | e.g. LAG-567-CD |
| primary_zone_id | VARCHAR(50) | FK → delivery_zones | |
| rating | DECIMAL(3,1) | DEFAULT 5.0 | 1.0–5.0 |
| total_deliveries | INT | DEFAULT 0 | |
| success_rate | DECIMAL(5,2) | DEFAULT 100 | percentage |
| total_earnings | DECIMAL(12,2) | DEFAULT 0 | lifetime earnings |
| commission_per_delivery | DECIMAL(10,2) | | per-trip rate |
| status | VARCHAR(20) | DEFAULT 'active' | on_delivery, active, off_duty, suspended |
| joined_date | DATE | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `delivery_zones`
> Geographic zones with delivery fees and area coverage.  
> **Status: EXISTS** (10 rows) — needs column additions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| zone_id | VARCHAR(50) | PK | existing text PK |
| zone_name | VARCHAR(100) | | existing |
| areas_covered | TEXT | | existing (free text) |
| coverage_areas | JSONB | | NEW — structured array of area names |
| min_order_value | DECIMAL(12,2) | | existing |
| delivery_fee | DECIMAL(10,2) | | existing |
| estimated_delivery_time | VARCHAR(50) | | existing |
| avg_delivery_mins | INT | | NEW |
| available_channels | TEXT | | existing |
| total_deliveries | INT | DEFAULT 0 | NEW |
| status | VARCHAR(20) | DEFAULT 'active' | NEW: active, inactive |
| notes | TEXT | | NEW: internal notes |
| created_at | TIMESTAMP | DEFAULT NOW() | NEW |

```sql
ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS coverage_areas JSONB,
  ADD COLUMN IF NOT EXISTS avg_delivery_mins INT,
  ADD COLUMN IF NOT EXISTS total_deliveries INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
```

---

### `zone_drivers`
> Many-to-many: which drivers are assigned to which zones.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| zone_id | VARCHAR(50) | FK → delivery_zones NOT NULL | |
| driver_id | INT | FK → drivers NOT NULL | |
| assigned_at | TIMESTAMP | DEFAULT NOW() | |

---

### `deliveries`
> Live tracking record per individual delivery.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| delivery_ref | VARCHAR(30) | UNIQUE NOT NULL | e.g. DEL-2026-0042 |
| order_id | VARCHAR(30) | FK → orders NOT NULL | |
| driver_id | INT | FK → drivers | nullable until assigned |
| zone_id | VARCHAR(50) | FK → delivery_zones | |
| delivery_address | TEXT | | |
| status | VARCHAR(30) | DEFAULT 'assigned' | assigned, awaiting_pickup, en_route, delivery_attempted, delivered, cancelled |
| dispatched_at | TIMESTAMP | | |
| delivered_at | TIMESTAMP | | |
| eta_minutes | INT | | estimated time of arrival |
| attempts | SMALLINT | DEFAULT 0 | number of delivery attempts |
| max_attempts | SMALLINT | DEFAULT 2 | |
| failure_reason | TEXT | | if attempted but failed |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

## 9. MODULE 6 — CUSTOMERS & LOYALTY

### `customers`
> Online self-registered customers (app, website, AI chat).  
> **Status: MISSING** — distinct from admin `users`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_code | VARCHAR(20) | UNIQUE NOT NULL | e.g. CUS-001 |
| name | VARCHAR(100) | NOT NULL | |
| phone | VARCHAR(20) | UNIQUE NOT NULL | primary identifier |
| email | VARCHAR(150) | UNIQUE | nullable |
| area | VARCHAR(100) | | neighbourhood / local area |
| zone_id | VARCHAR(50) | FK → delivery_zones | nullable |
| avatar_url | TEXT | | |
| status | VARCHAR(20) | DEFAULT 'active' | active, inactive |
| notes | TEXT | | admin notes |
| total_orders | INT | DEFAULT 0 | denormalized counter |
| total_spent | DECIMAL(12,2) | DEFAULT 0 | denormalized |
| joined_at | TIMESTAMP | DEFAULT NOW() | |
| last_order_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `customer_dietary_profiles`
> Links customers to their dietary restrictions (for Chef Bems AI).  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers NOT NULL | |
| dietary_rule_id | TEXT | FK → dietary_rules | (dietary_rules has text PK) |
| assigned_at | TIMESTAMP | DEFAULT NOW() | |
| assigned_by | VARCHAR(20) | DEFAULT 'self' | self, admin, ai |

---

### `loyalty_tiers`
> Bronze, Silver, Gold, Platinum tier configuration.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| name | VARCHAR(50) | UNIQUE NOT NULL | Bronze, Silver, Gold, Platinum |
| min_points | INT | NOT NULL | e.g. 0 |
| max_points | INT | | null = no cap (top tier) |
| earn_rate | DECIMAL(5,2) | NOT NULL | pts earned per ₦ spent |
| benefits | JSONB | | array of benefit strings |
| color | VARCHAR(20) | | hex color |
| icon | VARCHAR(50) | | |

---

### `customer_loyalty`
> Running loyalty balance per customer — one row per customer.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers UNIQUE NOT NULL | one record per customer |
| tier_id | INT | FK → loyalty_tiers | |
| points_balance | INT | DEFAULT 0 | current redeemable balance |
| lifetime_points | INT | DEFAULT 0 | all-time earned (never decrements) |
| last_earned_at | TIMESTAMP | | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### `loyalty_transactions`
> Every earn / redeem / bonus / deduction event.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers NOT NULL | |
| order_id | VARCHAR(30) | FK → orders | nullable |
| type | VARCHAR(20) | NOT NULL | earned, redeemed, bonus, referral, deducted |
| points | INT | NOT NULL | positive = earn, negative = redeem/deduct |
| description | VARCHAR(255) | | e.g. "Order ORD-2026-0142 — 1pt per ₦10" |
| created_by | INT | FK → users | nullable for system events |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `customer_activity_log`
> Unified timeline of all customer interactions.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers NOT NULL | |
| type | VARCHAR(30) | NOT NULL | order, loyalty, delivery, refund, account_change |
| description | TEXT | NOT NULL | human-readable summary |
| reference_type | VARCHAR(50) | | orders, deliveries, refunds, etc. |
| reference_id | BIGINT | | polymorphic FK to the referenced record |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

## 10. MODULE 7 — STAFF & HR

### `staff`
> All internal Bems Farms employees.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| employee_id | VARCHAR(20) | UNIQUE NOT NULL | e.g. EMP-1021 |
| user_id | INT | FK → users | nullable — for staff with system login |
| name | VARCHAR(100) | NOT NULL | |
| avatar_url | TEXT | | |
| role | VARCHAR(100) | | job title e.g. "Senior Cashier" |
| system_role | VARCHAR(30) | | superadmin, manager, accountant, etc. |
| department | VARCHAR(100) | | Sales, Finance, HR, Logistics |
| email | VARCHAR(150) | UNIQUE | |
| phone | VARCHAR(20) | | |
| shift | VARCHAR(20) | | morning, afternoon, evening |
| status | VARCHAR(20) | DEFAULT 'active' | active, inactive, on_leave |
| joined_date | DATE | | |
| store_id | INT | FK → stores | nullable |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `staff_attendance`
> Daily clock-in/clock-out records.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| staff_id | INT | FK → staff NOT NULL | |
| date | DATE | NOT NULL | |
| clock_in | TIME | | |
| clock_out | TIME | | nullable |
| shift | VARCHAR(20) | | morning, afternoon, evening |
| status | VARCHAR(20) | DEFAULT 'present' | present, absent, late, on_leave |
| notes | TEXT | | |
| recorded_by | INT | FK → users | nullable for self-check-in |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `staff_schedules`
> Planned work shifts per staff member.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| staff_id | INT | FK → staff NOT NULL | |
| date | DATE | NOT NULL | |
| shift | VARCHAR(20) | NOT NULL | morning, afternoon, evening |
| is_off | BOOLEAN | DEFAULT false | |
| notes | TEXT | | |
| created_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `staff_holidays`
> Leave requests and approved time off.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| staff_id | INT | FK → staff NOT NULL | |
| from_date | DATE | NOT NULL | |
| to_date | DATE | NOT NULL | |
| type | VARCHAR(20) | NOT NULL | annual, sick, maternity, paternity, unpaid, public |
| status | VARCHAR(20) | DEFAULT 'pending' | pending, approved, rejected |
| notes | TEXT | | |
| approved_by | INT | FK → users | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `payroll`
> Monthly salary disbursement records.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| staff_id | INT | FK → staff NOT NULL | |
| employee_id | VARCHAR(20) | | snapshot |
| department | VARCHAR(100) | | snapshot |
| pay_period_start | DATE | NOT NULL | |
| pay_period_end | DATE | NOT NULL | |
| pay_date | DATE | | |
| basic_amount | DECIMAL(12,2) | NOT NULL | |
| allowances | DECIMAL(12,2) | DEFAULT 0 | |
| deductions | DECIMAL(12,2) | DEFAULT 0 | taxes, absent days |
| total_amount | DECIMAL(12,2) | NOT NULL | basic + allowances - deductions |
| payment_status | VARCHAR(20) | DEFAULT 'pending' | pending, paid, failed |
| payment_method | VARCHAR(20) | | bank_transfer, cash |
| bank_account_id | INT | FK → bank_accounts | which Bems account paid from |
| created_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

## 11. MODULE 8 — ACCOUNTS & FINANCE

### `bank_accounts`
> Bems Farms business bank accounts.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| bank_name | VARCHAR(100) | NOT NULL | GTBank, Access, First Bank, Zenith, UBA |
| account_name | VARCHAR(150) | NOT NULL | |
| account_number | VARCHAR(20) | | masked version for display |
| account_number_full | VARCHAR(20) | | encrypted full number |
| account_type | VARCHAR(20) | DEFAULT 'current' | current, savings, domiciliary |
| currency | VARCHAR(10) | DEFAULT 'NGN' | |
| balance | DECIMAL(14,2) | DEFAULT 0 | |
| status | VARCHAR(20) | DEFAULT 'active' | active, inactive |
| last_transaction_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `income`
> All money coming into the business.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| reference | VARCHAR(30) | UNIQUE NOT NULL | e.g. INC-2026-001 |
| date | DATE | NOT NULL | |
| source_type | VARCHAR(30) | NOT NULL | online_order, pos_sale, corporate_supply, wallet_topup, delivery_fee, other |
| description | VARCHAR(255) | | |
| amount | DECIMAL(12,2) | NOT NULL | |
| bank_account_id | INT | FK → bank_accounts | |
| payment_method | VARCHAR(50) | | |
| order_id | VARCHAR(30) | FK → orders | nullable |
| status | VARCHAR(20) | DEFAULT 'completed' | pending, completed, failed |
| notes | TEXT | | |
| created_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `expenses`
> All money going out of the business.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| reference | VARCHAR(30) | UNIQUE NOT NULL | e.g. EXP-2026-001 |
| date | DATE | NOT NULL | |
| category | VARCHAR(50) | NOT NULL | produce_purchase, staff_salary, fuel_transport, packaging, utilities_rent, maintenance, marketing, other |
| description | VARCHAR(255) | | |
| amount | DECIMAL(12,2) | NOT NULL | |
| bank_account_id | INT | FK → bank_accounts | |
| payment_method | VARCHAR(50) | | |
| receipt_url | TEXT | | uploaded receipt image |
| status | VARCHAR(20) | DEFAULT 'pending' | pending, approved, rejected, paid |
| approved_by | INT | FK → users | |
| notes | TEXT | | |
| created_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `money_transfers`
> Internal transfers between Bems Farms bank accounts.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| reference | VARCHAR(30) | UNIQUE NOT NULL | e.g. TXF-2026-001 |
| date | DATE | NOT NULL | |
| from_account_id | INT | FK → bank_accounts NOT NULL | |
| to_account_id | INT | FK → bank_accounts NOT NULL | |
| amount | DECIMAL(12,2) | NOT NULL | |
| fee | DECIMAL(10,2) | DEFAULT 0 | bank transfer charges |
| reason | TEXT | | |
| status | VARCHAR(20) | DEFAULT 'pending' | pending, completed, failed |
| created_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `transactions`
> Unified financial ledger — every money movement across all accounts.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| reference | VARCHAR(30) | UNIQUE NOT NULL | |
| date | DATE | NOT NULL | |
| time | TIME | | |
| type | VARCHAR(20) | NOT NULL | income, expense, commission, transfer, refund |
| sub_type | VARCHAR(50) | | e.g. online_order, driver_commission, staff_salary |
| description | VARCHAR(255) | | |
| bank_account_id | INT | FK → bank_accounts | |
| amount | DECIMAL(12,2) | NOT NULL | positive = in, negative = out |
| status | VARCHAR(20) | DEFAULT 'completed' | pending, completed, failed |
| related_ref | VARCHAR(50) | | order ref / expense ref / etc. |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `driver_commissions`
> Weekly commission tracking per driver.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| driver_id | INT | FK → drivers NOT NULL | |
| week_start | DATE | NOT NULL | |
| week_end | DATE | NOT NULL | |
| trips | INT | DEFAULT 0 | deliveries completed that week |
| commission_per_delivery | DECIMAL(10,2) | NOT NULL | rate at time of record |
| total_earned | DECIMAL(12,2) | | trips × rate |
| total_paid | DECIMAL(12,2) | DEFAULT 0 | amount actually paid |
| unpaid_balance | DECIMAL(12,2) | | total_earned - total_paid |
| status | VARCHAR(20) | DEFAULT 'pending' | pending, paid, partial |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `commission_payments`
> Individual payout events to a driver.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| driver_id | INT | FK → drivers NOT NULL | |
| commission_id | INT | FK → driver_commissions | nullable for bulk pay |
| amount | DECIMAL(12,2) | NOT NULL | |
| paid_at | TIMESTAMP | DEFAULT NOW() | |
| payment_method | VARCHAR(20) | | bank_transfer, cash |
| bank_account_id | INT | FK → bank_accounts | which Bems account paid from |
| created_by | INT | FK → users NOT NULL | |
| notes | TEXT | | |

---

## 12. MODULE 9 — POINT OF SALE

### `pos_sessions`
> Each cashier's open/close POS session.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| session_ref | VARCHAR(30) | UNIQUE NOT NULL | e.g. POS-SESSION-001 |
| cashier_id | INT | FK → users NOT NULL | |
| store_id | INT | FK → stores | |
| opened_at | TIMESTAMP | NOT NULL | |
| closed_at | TIMESTAMP | | nullable until session ends |
| opening_float | DECIMAL(12,2) | DEFAULT 0 | cash in till at open |
| closing_float | DECIMAL(12,2) | | cash in till at close |
| total_sales | DECIMAL(12,2) | DEFAULT 0 | |
| total_transactions | INT | DEFAULT 0 | |
| status | VARCHAR(10) | DEFAULT 'open' | open, closed |

---

### `pos_held_orders`
> Orders put on hold during a POS session (customer steps aside).  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| session_id | INT | FK → pos_sessions NOT NULL | |
| hold_ref | VARCHAR(30) | | e.g. BF-2026-17185 |
| customer_label | VARCHAR(100) | | walk-in label e.g. "Table 3" |
| items | JSONB | NOT NULL | cart snapshot |
| subtotal | DECIMAL(12,2) | | |
| notes | TEXT | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

## 13. MODULE 10 — CHEF BEMS AI (ADMIN LAYER)

> These are **admin-side overlay tables** — separate from the n8n-owned tables.  
> The n8n tables (`meals`, `meal_ingredients`, `dietary_rules`, `allergy_rules`) remain unchanged.  
> These admin tables add management metadata, confidence scores, and training state on top.

### `meal_associations`
> Admin view of meals — adds AI training status and nutritional data.  
> **Status: MISSING** (distinct from n8n's `meals` table)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| meal_code | VARCHAR(20) | UNIQUE NOT NULL | e.g. MEAL-001 |
| meal_id | TEXT | FK → meals (n8n) | links to n8n meal |
| name | VARCHAR(150) | NOT NULL | e.g. Jollof Rice |
| category | VARCHAR(100) | | Rice Dishes, Soups, Seafood |
| protein_g | INT | | per serving |
| carbs_g | INT | | per serving |
| calories_kcal | INT | | per serving |
| allergens | JSONB | | array of allergen names |
| training_status | VARCHAR(20) | DEFAULT 'untrained' | trained, needs_update, untrained |
| ai_confidence | DECIMAL(5,2) | | 0.00–100.00 |
| last_trained_at | TIMESTAMP | | |
| product_id | INT | FK → products | links meal to a POS product |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### `meal_dietary_flags`
> Many-to-many: which dietary rules apply to each meal.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| meal_id | INT | FK → meal_associations NOT NULL | |
| dietary_rule_id | TEXT | FK → dietary_rules NOT NULL | |

---

### `meal_ai_pairings`
> AI-suggested meal combinations and confidence scores.  
> **Status: MISSING** (distinct from n8n's `product_associations`)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| meal_id | INT | FK → meal_associations NOT NULL | |
| paired_meal_id | INT | FK → meal_associations NOT NULL | |
| confidence | DECIMAL(5,2) | | 0–100 |

---

### `ai_conversations`
> Admin view of all Chef Bems AI chat sessions with analytics metadata.  
> **Status: MISSING** (distinct from n8n's `nancy_conversations`)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| conversation_ref | VARCHAR(20) | UNIQUE | e.g. CHB-001 |
| nancy_conversation_id | INT | FK → nancy_conversations | links to n8n raw log |
| customer_id | INT | FK → customers | nullable if anonymous |
| customer_message | TEXT | NOT NULL | |
| ai_response | TEXT | NOT NULL | |
| ai_status | VARCHAR(20) | DEFAULT 'success' | success, failed, low_confidence, escalated |
| confidence_score | DECIMAL(5,2) | | null if n8n failed |
| response_time_ms | INT | | |
| n8n_execution_id | VARCHAR(100) | | n8n workflow execution ID |
| dietary_rules_applied | JSONB | | array of rule IDs used |
| is_resolved | BOOLEAN | DEFAULT true | |
| escalation_reason | TEXT | | null unless escalated |
| admin_notes | TEXT | | admin action notes |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

## 14. MODULE 11 — MULTI-STORE

### `stores`
> Individual store branches under Bems Farms.  
> **Status: MISSING** — required by users, products, orders, inventory.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| store_code | VARCHAR(20) | UNIQUE NOT NULL | e.g. STR-001 |
| store_name | VARCHAR(150) | NOT NULL | |
| location | VARCHAR(200) | | city / area |
| address | TEXT | | full address |
| manager_name | VARCHAR(100) | | |
| email | VARCHAR(150) | | |
| phone | VARCHAR(20) | | |
| store_type | VARCHAR(20) | DEFAULT 'retail' | retail, franchise, warehouse, farm_outlet |
| status | VARCHAR(20) | DEFAULT 'open' | open, closed, inactive |
| created_at | TIMESTAMP | DEFAULT NOW() | |

> ⚠️ Create `stores` first — many other tables have FK → stores.

---

## 15. MODULE 12 — SETTINGS & CONFIG

### `system_settings`
> Key-value store for all application configuration.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| key | VARCHAR(100) | UNIQUE NOT NULL | e.g. store_name, default_tax_pct |
| value | TEXT | | |
| group | VARCHAR(50) | | general, pos, payment, invoice |
| description | TEXT | | human-readable explanation |
| updated_by | INT | FK → users | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### `tax_settings`
> Named tax rules applied to products or categories.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| name | VARCHAR(100) | NOT NULL | e.g. VAT |
| rate | DECIMAL(5,2) | NOT NULL | |
| applies_to | VARCHAR(30) | DEFAULT 'all' | all, specific_categories |
| status | VARCHAR(20) | DEFAULT 'active' | active, inactive |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `coupons`
> Discount codes for orders.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| code | VARCHAR(50) | UNIQUE NOT NULL | |
| type | VARCHAR(20) | NOT NULL | percentage, fixed_amount |
| value | DECIMAL(10,2) | NOT NULL | |
| min_order_value | DECIMAL(12,2) | DEFAULT 0 | |
| max_uses | INT | | null = unlimited |
| used_count | INT | DEFAULT 0 | |
| valid_from | DATE | | |
| valid_until | DATE | | |
| status | VARCHAR(20) | DEFAULT 'active' | active, inactive, expired |
| created_by | INT | FK → users NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `coupon_usages`
> Tracks which customer used which coupon on which order.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| coupon_id | INT | FK → coupons NOT NULL | |
| customer_id | INT | FK → customers NOT NULL | |
| order_id | VARCHAR(30) | FK → orders NOT NULL | |
| discount_applied | DECIMAL(10,2) | NOT NULL | |
| used_at | TIMESTAMP | DEFAULT NOW() | |

---

### `payment_gateways`
> Gateway configurations (Monnify, Flutterwave, etc.).  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| name | VARCHAR(100) | NOT NULL | e.g. Monnify |
| public_key | TEXT | | |
| secret_key | TEXT | | stored encrypted |
| webhook_url | TEXT | | |
| mode | VARCHAR(10) | DEFAULT 'test' | test, live |
| is_active | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `currencies`
> Supported currencies with exchange rates relative to NGN.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| code | VARCHAR(10) | UNIQUE NOT NULL | NGN, USD, GBP |
| symbol | VARCHAR(5) | NOT NULL | ₦, $, £ |
| name | VARCHAR(50) | | Nigerian Naira |
| exchange_rate | DECIMAL(12,6) | DEFAULT 1 | relative to NGN |
| is_default | BOOLEAN | DEFAULT false | |
| is_active | BOOLEAN | DEFAULT true | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### `notifications`
> In-app / system notifications for admin staff.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| user_id | INT | FK → users | null = broadcast to all |
| type | VARCHAR(30) | NOT NULL | low_stock, new_order, delivery_update, payment, ai_escalation, system |
| title | VARCHAR(200) | NOT NULL | |
| body | TEXT | | |
| reference_type | VARCHAR(50) | | orders, deliveries, products, etc. |
| reference_id | BIGINT | | polymorphic FK |
| is_read | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

## 16. MODULE 13 — CUSTOMER APP

### `customer_auth`
> Login credentials for customer app (separate from admin `users`).  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers UNIQUE NOT NULL | |
| password_hash | TEXT | | bcrypt — null if phone-only |
| otp_code | VARCHAR(10) | | SMS OTP |
| otp_expires_at | TIMESTAMP | | |
| last_login_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `customer_devices`
> FCM/APNs push notification tokens per customer device.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers NOT NULL | |
| device_token | VARCHAR(255) | NOT NULL | FCM or APNs token |
| platform | VARCHAR(10) | NOT NULL | android, ios, web |
| device_name | VARCHAR(100) | | e.g. iPhone 14 |
| is_active | BOOLEAN | DEFAULT true | set false on logout |
| last_seen_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `customer_addresses`
> Saved delivery addresses in the customer app.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers NOT NULL | |
| label | VARCHAR(50) | | Home, Office, Mum's Place |
| full_address | TEXT | NOT NULL | |
| area | VARCHAR(100) | | neighbourhood |
| zone_id | VARCHAR(50) | FK → delivery_zones | auto-detected from area |
| latitude | DECIMAL(10,8) | | |
| longitude | DECIMAL(11,8) | | |
| is_default | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `customer_wallets`
> In-app wallet balance per customer.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers UNIQUE NOT NULL | one wallet per customer |
| balance | DECIMAL(12,2) | DEFAULT 0 | current balance |
| total_topped_up | DECIMAL(12,2) | DEFAULT 0 | lifetime top-ups |
| total_spent | DECIMAL(12,2) | DEFAULT 0 | lifetime debits |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### `wallet_transactions`
> Every debit and credit on a customer wallet.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers NOT NULL | |
| wallet_id | INT | FK → customer_wallets NOT NULL | |
| type | VARCHAR(30) | NOT NULL | top_up, order_payment, refund_credit, loyalty_redemption |
| amount | DECIMAL(12,2) | NOT NULL | positive = credit, negative = debit |
| balance_after | DECIMAL(12,2) | NOT NULL | balance snapshot |
| reference | VARCHAR(50) | | order ref / payment ref |
| payment_method | VARCHAR(50) | | for top-ups: monnify, bank_transfer |
| description | VARCHAR(255) | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `customer_saved_items`
> Products bookmarked / wishlisted by a customer.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers NOT NULL | |
| product_id | INT | FK → products NOT NULL | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `customer_carts`
> Active shopping cart — one per customer.  
> **Status: MISSING** (the existing `cart_state` is n8n's, keep separately)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers UNIQUE NOT NULL | |
| coupon_id | INT | FK → coupons | nullable |
| delivery_address_id | INT | FK → customer_addresses | nullable |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### `customer_cart_items`
> Line items in a customer's active cart.  
> **Status: MISSING** (the existing `cart_items` is a basic legacy table)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| cart_id | INT | FK → customer_carts NOT NULL | |
| product_id | INT | FK → products NOT NULL | |
| quantity | INT | NOT NULL DEFAULT 1 | |
| unit_price | DECIMAL(12,2) | NOT NULL | snapshot at time of add |
| added_at | TIMESTAMP | DEFAULT NOW() | |

---

### `customer_notifications`
> Push/in-app notifications sent to customers.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | INT | FK → customers NOT NULL | |
| type | VARCHAR(30) | NOT NULL | order_confirmed, order_preparing, order_packed, driver_assigned, order_enroute, order_delivered, delivery_attempted, refund_processed, promo, loyalty_update |
| title | VARCHAR(200) | NOT NULL | |
| body | TEXT | | |
| order_id | VARCHAR(30) | FK → orders | nullable |
| delivery_id | INT | FK → deliveries | nullable |
| is_read | BOOLEAN | DEFAULT false | |
| sent_at | TIMESTAMP | DEFAULT NOW() | |

---

## 17. MODULE 14 — DRIVER APP

### `driver_auth`
> Login credentials for driver app (separate from admin `users`).  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| driver_id | INT | FK → drivers UNIQUE NOT NULL | |
| password_hash | TEXT | | |
| otp_code | VARCHAR(10) | | SMS OTP |
| otp_expires_at | TIMESTAMP | | |
| last_login_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `driver_devices`
> FCM/APNs push notification tokens per driver device.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| driver_id | INT | FK → drivers NOT NULL | |
| device_token | VARCHAR(255) | NOT NULL | |
| platform | VARCHAR(10) | NOT NULL | android, ios |
| is_active | BOOLEAN | DEFAULT true | |
| last_seen_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `driver_availability`
> Real-time online/offline status per driver — one row per driver.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| driver_id | INT | FK → drivers UNIQUE NOT NULL | |
| is_online | BOOLEAN | DEFAULT false | driver toggled on in app |
| is_available | BOOLEAN | DEFAULT false | online AND not on a delivery |
| current_delivery_id | INT | FK → deliveries | null when free |
| last_updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### `driver_locations`
> Real-time GPS pings from the driver app.  
> **Status: MISSING**  
> ⚠️ Only keep last ~30 minutes of pings to avoid table bloat. Archive or delete older rows.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| driver_id | INT | FK → drivers NOT NULL | |
| delivery_id | INT | FK → deliveries | links ping to active delivery |
| latitude | DECIMAL(10,8) | NOT NULL | |
| longitude | DECIMAL(11,8) | NOT NULL | |
| speed_kmh | DECIMAL(5,2) | | |
| heading | DECIMAL(6,2) | | degrees 0–360 |
| recorded_at | TIMESTAMP | DEFAULT NOW() | |

---

### `driver_notifications`
> Push/in-app notifications sent to drivers.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| driver_id | INT | FK → drivers NOT NULL | |
| type | VARCHAR(30) | NOT NULL | new_delivery_assigned, delivery_reassigned, delivery_cancelled, schedule_reminder, payment_received, system |
| title | VARCHAR(200) | NOT NULL | |
| body | TEXT | | |
| order_id | VARCHAR(30) | FK → orders | nullable |
| delivery_id | INT | FK → deliveries | nullable |
| is_read | BOOLEAN | DEFAULT false | |
| requires_action | BOOLEAN | DEFAULT false | e.g. accept/reject prompt |
| sent_at | TIMESTAMP | DEFAULT NOW() | |

---

### `delivery_assignments`
> Log of every auto-assignment and manual reassignment attempt.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| delivery_id | INT | FK → deliveries NOT NULL | |
| driver_id | INT | FK → drivers NOT NULL | |
| assignment_type | VARCHAR(10) | NOT NULL | auto, manual |
| assigned_by | INT | FK → users | null if auto-assigned |
| driver_response | VARCHAR(20) | DEFAULT 'pending' | pending, accepted, rejected, timed_out |
| response_at | TIMESTAMP | | |
| rejection_reason | VARCHAR(200) | | nullable |
| created_at | TIMESTAMP | DEFAULT NOW() | |

> **Auto-assign logic:** System finds nearest available driver in the delivery zone → sends push notification → driver has 60 seconds to accept → if no response, tries the next available driver.

---

## 18. MODULE 15 — ORDER NOTIFICATION PIPELINE

### `order_tracking_events`
> Granular event log — powers the "Track My Order" timeline in the customer app.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| order_id | VARCHAR(30) | FK → orders NOT NULL | |
| delivery_id | INT | FK → deliveries | nullable |
| event_type | VARCHAR(30) | NOT NULL | order_placed, payment_confirmed, order_confirmed, kitchen_preparing, packed_ready, driver_assigned, driver_en_route, arrived_at_pickup, order_picked_up, out_for_delivery, delivery_attempted, delivered, cancelled, refund_initiated, refund_processed |
| description | VARCHAR(255) | | human-readable e.g. "Your order is being prepared" |
| triggered_by | VARCHAR(20) | | customer, admin, driver, system, payment_gateway |
| triggered_by_id | BIGINT | | FK to user_id / driver_id |
| latitude | DECIMAL(10,8) | | driver location at event time |
| longitude | DECIMAL(11,8) | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### `notification_templates`
> Reusable message templates for all notification types across all 3 apps.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| key | VARCHAR(100) | UNIQUE NOT NULL | e.g. customer.order_confirmed |
| audience | VARCHAR(10) | NOT NULL | customer, driver, admin |
| channel | VARCHAR(10) | NOT NULL | push, sms, email, in_app |
| title_template | VARCHAR(200) | NOT NULL | supports {{order_ref}}, {{customer_name}} |
| body_template | TEXT | NOT NULL | |
| is_active | BOOLEAN | DEFAULT true | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### `notification_logs`
> Audit trail of every notification dispatched across the entire system.  
> **Status: MISSING**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| template_id | INT | FK → notification_templates | null for ad-hoc |
| audience | VARCHAR(10) | NOT NULL | customer, driver, admin |
| recipient_id | BIGINT | NOT NULL | customer_id / driver_id / user_id |
| channel | VARCHAR(10) | NOT NULL | push, sms, email, in_app |
| device_token | VARCHAR(255) | | for push notifications |
| title | VARCHAR(200) | NOT NULL | rendered title |
| body | TEXT | | rendered body |
| order_id | VARCHAR(30) | FK → orders | nullable |
| delivery_id | INT | FK → deliveries | nullable |
| status | VARCHAR(20) | DEFAULT 'pending' | pending, sent, delivered, failed |
| failure_reason | VARCHAR(255) | | nullable |
| sent_at | TIMESTAMP | DEFAULT NOW() | |

---

### Full Notification Flow

```
EVENT                          → WHO IS NOTIFIED                → TABLE
─────────────────────────────────────────────────────────────────────────
1. Customer places order       → Admin (new_order)              → notifications
                               → Customer (order_placed)        → customer_notifications
2. Payment confirmed           → Admin                          → notifications
   (Monnify webhook)           → Customer (payment_confirmed)   → customer_notifications
3. Admin confirms order        → Kitchen staff                  → notifications
                               → Customer (order_confirmed)     → customer_notifications
4. Kitchen preparing           → Customer (preparing)           → customer_notifications
5. Order packed & ready        → Auto-assign triggered          → delivery_assignments
                               → Driver (new_delivery push)     → driver_notifications
6. Driver accepts              → Customer (driver_assigned)     → customer_notifications
                               → Admin (dispatched)             → notifications
                               → Tracking event logged          → order_tracking_events
7. Driver picks up order       → Customer (en_route + GPS)      → customer_notifications
                               → GPS streaming ON               → driver_locations
8. Driver marks delivered      → Customer (delivered 🎉)        → customer_notifications
                               → Admin (complete)               → notifications
                               → Loyalty points awarded         → loyalty_transactions
                               → Commission logged              → driver_commissions
9. Delivery attempted (fail)   → Admin (escalation)             → notifications
                               → Customer (attempt notice)      → customer_notifications
                               → Retry logic                    → delivery_assignments
10. Refund approved            → Customer (refund processed)    → customer_notifications
                               → Wallet credited                → wallet_transactions
```

---

## 19. N8N-OWNED TABLES

> **DO NOT drop, rename, or restructure these tables.** Chef Bems AI reads from and writes to them directly via Supabase. Changes to their schema will break the AI workflows.

### `ingredients` (105 rows)

| Column | Type | Notes |
|---|---|---|
| ingredient_id | TEXT PK | |
| ingredient_name | TEXT | |
| ingredient_category | TEXT | |
| aliases | TEXT | |
| allergen_tag | TEXT | DEFAULT 'None' |
| dietary_tag | TEXT | |
| recipe_base_unit | TEXT | |
| qty_per_person_base | NUMERIC | |
| usage_frequency | TEXT | |
| requires_hard_filter | BOOLEAN | DEFAULT false |

---

### `meals` (180 rows)

| Column | Type | Notes |
|---|---|---|
| meal_id | TEXT PK | |
| meal_name | TEXT | |
| meal_category | TEXT | |
| cuisine_origin | TEXT | |
| regional_context | TEXT | |
| description | TEXT | |
| default_serving_size | INT | |
| complexity | TEXT | |
| supports_budget_mode | BOOLEAN | DEFAULT false |
| best_for | TEXT | |
| meal_time | TEXT | |

---

### `meal_ingredients` (1,510 rows)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| meal_id | TEXT FK → meals | |
| meal_name | TEXT | |
| ingredient_id | TEXT FK → ingredients | |
| ingredient_name | TEXT | |
| requirement_type | TEXT | |
| qty_per_person | NUMERIC | |
| recipe_unit | TEXT | |
| role_in_meal | TEXT | |
| importance_score | INT | |
| budget_adjustment_rule | TEXT | |

---

### `dietary_rules` (7 rows)

| Column | Type | Notes |
|---|---|---|
| diet_rule_id | TEXT PK | |
| diet_name | TEXT | |
| excluded_ingredients | TEXT | |
| allowed_substitutes | TEXT | |
| notes | TEXT | |

> ⚠️ The n8n query for `dietary_rules` uses column names: `diet_name`, `excluded_ingredients`, `allowed_substitutes`, `notes` — these match the actual schema.

---

### `allergy_rules` (28 rows)

| Column | Type | Notes |
|---|---|---|
| allergy_id | TEXT (PK part) | |
| allergy_name | TEXT | |
| excluded_item | TEXT (PK part) | |
| action_type | TEXT | |
| substitution_guidance | TEXT | |
| safety_note | TEXT | |

> ⚠️ **Column mismatch:** The n8n Chef Bems query reads `ingredient`, `allergen`, `safe_substitute`, `notes` — but these columns don't exist. The actual columns are `allergy_name`, `excluded_item`, `substitution_guidance`, `safety_note`. The n8n query needs to be updated to use the correct column names before going live.

---

### `substitutions` (567 rows)

| Column | Type | Notes |
|---|---|---|
| substitution_id | TEXT PK | |
| original_ingredient_id | TEXT | |
| original_ingredient | TEXT | |
| substitute_ingredient_id | TEXT | |
| substitute_ingredient | TEXT | |
| substitution_reason | TEXT | |
| taste_impact | TEXT | |
| estimated_price_impact | NUMERIC | |
| safety_status | TEXT | |
| ai_action | TEXT | |

---

### `unit_conversions` (315 rows)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| ingredient_id | TEXT | |
| ingredient_name | TEXT | |
| recipe_quantity_type | TEXT | |
| selling_unit | TEXT | |
| base_unit_factor | NUMERIC | |
| rounding_rule | TEXT | |
| display_rule | TEXT | |

---

### `customer_preferences` (500 rows)

| Column | Type | Notes |
|---|---|---|
| customer_id | TEXT PK | |
| customer_type | TEXT | |
| typical_serving_size | INT | |
| typical_budget_ngn | NUMERIC | |
| declared_allergy | TEXT | |
| favorite_meal | TEXT | |
| price_sensitivity | TEXT | |
| preferred_fulfilment | TEXT | |
| allow_personalization | TEXT | |
| purchase_frequency | TEXT | |

> Sync note: When admin updates a customer's dietary preferences, also update this table with matching `customer_id`.

---

### `nancy_conversations` (189 rows)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| session_id | TEXT | |
| chat_input | TEXT | user message |
| nancy_response | TEXT | AI response |
| tools_called | TEXT[] | array of tool names used |
| journey_type | TEXT | meal_plan, product_search, etc. |
| products_shown | INT | DEFAULT 0 |
| cart_confirmed | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

---

### `nancy_cart_sessions` (0 rows)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| session_id | TEXT UNIQUE | |
| conversation_id | INT FK → nancy_conversations | |
| items | JSONB | DEFAULT '[]' |
| subtotal_ngn | NUMERIC | |
| status | TEXT | DEFAULT 'pending' |
| ecommerce_cart_id | TEXT | |
| created_at | TIMESTAMPTZ | |
| confirmed_at | TIMESTAMPTZ | |

---

### `chef_bems_memory` (630 rows)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| session_id | VARCHAR | |
| message | JSONB | LangChain message format |

---

### `product_associations` (842 rows)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| product_a | TEXT | |
| product_b | TEXT | |
| association_strength | INT | DEFAULT 1 |
| association_type | TEXT | DEFAULT 'meal_co_occurrence' |
| created_at | TIMESTAMPTZ | |

---

### `catalogue` (1,500 rows)

> This is the **master product table for the AI**. The admin `products` table and this `catalogue` table must be kept in sync by the backend API.

| Column | Type | Notes |
|---|---|---|
| sku | TEXT PK | |
| product_name | TEXT | |
| ingredient_id | TEXT FK → ingredients | |
| linked_ingredient | TEXT | |
| brand | TEXT | |
| product_category | TEXT | |
| selling_unit | TEXT | |
| unit_price | NUMERIC | |
| currency | TEXT | DEFAULT 'NGN' |
| stock_qty | INT | |
| availability_status | TEXT | |
| location | TEXT | |
| sales_channel | TEXT | |
| eligible_for_ai | BOOLEAN | DEFAULT true |
| product_allergen_tag | TEXT | DEFAULT 'None' |

---

### `promotions_bundles` (150 rows)

| Column | Type | Notes |
|---|---|---|
| promo_id | TEXT PK | |
| promo_name | TEXT | |
| promo_type | TEXT | |
| trigger_condition | TEXT | |
| discount_value | NUMERIC | |
| discount_type | TEXT | |
| eligible_skus | TEXT | |
| eligible_meals | TEXT | |
| valid_from | DATE | |
| valid_to | DATE | |
| active | BOOLEAN | DEFAULT true |

---

## 20. MIGRATION STRATEGY

Build the database in this order to avoid FK constraint failures.

### Phase 1 — Foundation (do this first)
```sql
-- 1. Create stores (many tables FK to this)
CREATE TABLE stores (...);

-- 2. Add missing columns to users
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active', ...;

-- 3. Add missing columns to categories
ALTER TABLE categories ADD COLUMN icon VARCHAR(50), ...;

-- 4. Add missing columns to products
ALTER TABLE products ADD COLUMN sku VARCHAR(50) UNIQUE, ...;

-- 5. Create sub_categories, brands, units_of_measure
CREATE TABLE sub_categories (...);
CREATE TABLE brands (...);
CREATE TABLE units_of_measure (...);
```

### Phase 2 — Customers & Drivers
```sql
-- Required before orders can reference them
CREATE TABLE customers (...);
CREATE TABLE drivers (...);
ALTER TABLE delivery_zones ADD COLUMN coverage_areas JSONB, ...;
CREATE TABLE zone_drivers (...);
```

### Phase 3 — Orders & Deliveries
```sql
ALTER TABLE orders ADD COLUMN customer_id INTEGER, ...;
ALTER TABLE order_items ADD COLUMN product_name VARCHAR(200), ...;
CREATE TABLE order_status_history (...);
CREATE TABLE invoices (...);
ALTER TABLE returns ADD COLUMN refund_ref VARCHAR(30), ...; -- extends to refunds
CREATE TABLE deliveries (...);
CREATE TABLE delivery_assignments (...);
```

### Phase 4 — Inventory
```sql
CREATE TABLE warehouses (...);
CREATE TABLE stock_in (...);
CREATE TABLE stock_in_items (...);
CREATE TABLE stock_out (...);
CREATE TABLE stock_out_items (...);
CREATE TABLE stock_adjustments (...);
CREATE TABLE stock_adjustment_items (...);
CREATE TABLE stock_transfers (...);
CREATE TABLE stock_transfer_items (...);
CREATE TABLE batch_management (...);
CREATE TABLE lost_items (...);
CREATE TABLE stock_alerts (...);
```

### Phase 5 — Finance
```sql
CREATE TABLE bank_accounts (...);
CREATE TABLE income (...);
CREATE TABLE expenses (...);
CREATE TABLE money_transfers (...);
CREATE TABLE transactions (...);
CREATE TABLE driver_commissions (...);
CREATE TABLE commission_payments (...);
```

### Phase 6 — Customers & Loyalty
```sql
CREATE TABLE customer_auth (...);
CREATE TABLE customer_addresses (...);
CREATE TABLE customer_wallets (...);
CREATE TABLE wallet_transactions (...);
CREATE TABLE customer_devices (...);
CREATE TABLE customer_saved_items (...);
CREATE TABLE customer_carts (...);
CREATE TABLE customer_cart_items (...);
CREATE TABLE customer_dietary_profiles (...);
CREATE TABLE loyalty_tiers (...);
CREATE TABLE customer_loyalty (...);
CREATE TABLE loyalty_transactions (...);
CREATE TABLE customer_activity_log (...);
```

### Phase 7 — Staff & HR
```sql
CREATE TABLE staff (...);
CREATE TABLE staff_attendance (...);
CREATE TABLE staff_schedules (...);
CREATE TABLE staff_holidays (...);
CREATE TABLE payroll (...);
```

### Phase 8 — Settings, Config & POS
```sql
CREATE TABLE system_settings (...);
CREATE TABLE tax_settings (...);
CREATE TABLE coupons (...);
CREATE TABLE coupon_usages (...);
CREATE TABLE payment_gateways (...);
CREATE TABLE currencies (...);
CREATE TABLE notifications (...);
CREATE TABLE pos_sessions (...);
CREATE TABLE pos_held_orders (...);
```

### Phase 9 — AI Admin Layer
```sql
CREATE TABLE meal_associations (...);
CREATE TABLE meal_dietary_flags (...);
CREATE TABLE meal_ai_pairings (...);
CREATE TABLE ai_conversations (...);
CREATE TABLE product_images (...);
CREATE TABLE product_variants (...);
CREATE TABLE product_reviews (...);
```

### Phase 10 — Notification Pipeline
```sql
CREATE TABLE order_tracking_events (...);
CREATE TABLE notification_templates (...);
CREATE TABLE notification_logs (...);
CREATE TABLE customer_notifications (...);
CREATE TABLE driver_auth (...);
CREATE TABLE driver_devices (...);
CREATE TABLE driver_availability (...);
CREATE TABLE driver_locations (...);
CREATE TABLE driver_notifications (...);
```

---

## 21. RLS SECURITY POLICY

### Current Security State
22 of 28 existing tables have RLS **disabled** — any client with the Supabase anon key can read or write every row. This must be fixed before going live.

### Recommended Architecture

Since all frontend access goes through the Node.js/Express API (not direct Supabase client), use the simplest and most secure policy:

```sql
-- Step 1: Enable RLS on every table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Step 2: Allow the service role (your Node backend) full access
-- The service role key bypasses RLS by default in Supabase — no policy needed.
-- Just never expose the service key to any frontend.

-- Step 3: Deny all anon/authenticated direct access
-- With RLS enabled and no policies for anon/authenticated roles,
-- all direct client access is blocked automatically.
```

### If You Need Direct Supabase Access From Any Frontend
For example, if the customer app uses the Supabase JS client for realtime:

```sql
-- Allow customers to read their own orders
CREATE POLICY "customers_read_own_orders" ON orders
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid()::INT);

-- Allow customers to read their own notifications
CREATE POLICY "customers_read_own_notifications" ON customer_notifications
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid()::INT);

-- n8n service reads (n8n uses its own Supabase credentials)
-- These are handled by the service role — no extra policies needed.
```

### Tables That Must Never Be Exposed to Anon
- `users` (passwords, tokens)
- `bank_accounts` (account numbers)
- `payment_gateways` (secret keys)
- `driver_auth`, `customer_auth` (password hashes)

---

## 22. API SYNC POINTS

These are places where a single admin action must write to **more than one table**. The backend service layer handles these — never the frontend.

### 1. Product Create / Update
When admin saves a product:
```
POST /api/products → writes to:
  ├── products (admin product table)
  └── catalogue (n8n AI product catalogue)
       ├── sku, product_name, product_category
       ├── unit_price, selling_unit, currency
       ├── stock_qty (from products.stock_quantity)
       └── availability_status (derived from stock level)
```

### 2. Stock Level Change
When stock changes (sale, restock, adjustment):
```
Any stock mutation → updates:
  ├── products.stock_quantity
  └── inventory.available_qty (matched by SKU)
       └── catalogue.stock_qty (matched by SKU)
```

### 3. AI Cart Confirmed (n8n → Backend)
When a customer confirms a cart via Chef Bems AI:
```
n8n POSTs to POST /api/cart/notify → backend creates:
  ├── orders (new order record)
  ├── order_items (from cart items JSON)
  └── nancy_cart_sessions.status = 'confirmed' (update)
```

### 4. Order Delivered
When driver marks order as delivered:
```
PUT /api/deliveries/:id/delivered → updates:
  ├── deliveries.status = 'delivered'
  ├── orders.status = 'delivered'
  ├── order_tracking_events (INSERT delivered event)
  ├── loyalty_transactions (INSERT earn event)
  ├── customer_loyalty.points_balance += earned
  └── driver_commissions (INSERT or UPDATE weekly record)
```

### 5. Refund Approved
When admin approves a refund:
```
PUT /api/refunds/:id/approve → updates:
  ├── returns/refunds.status = 'processed'
  ├── wallet_transactions (INSERT refund_credit if wallet method)
  ├── customer_wallets.balance += refund_amount (if wallet)
  └── customer_notifications (INSERT refund_processed notification)
```

### 6. Customer Dietary Preference Update
When a customer updates preferences (in app) or admin edits them:
```
PUT /api/customers/:id/dietary → updates:
  ├── customer_dietary_profiles (admin join table)
  └── customer_preferences (n8n reads this — same customer_id)
```

---

## SUMMARY

| Metric | Value |
|---|---|
| Total target tables | ~86 |
| Currently exist | 28 |
| n8n-owned (keep as-is) | 14 |
| Need ALTER (column additions) | 8 |
| Need CREATE (new tables) | 52 |
| Tables with RLS disabled | 22 (fix before go-live) |
| Active n8n workflow | AI Food Store Chatbot — Original Replica |
| AI tables n8n reads | 12 |
| AI tables n8n writes | 3 (nancy_conversations, nancy_cart_sessions, chef_bems_memory) |
| Critical backend sync points | 6 |

---

*Bems Farms Database Documentation v1.0 — June 28, 2026*  
*Generated from: Supabase inspection + n8n workflow audit + admin system walkthrough*
