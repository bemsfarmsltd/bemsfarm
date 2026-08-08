# Bems Farms — Table Usage Reference
> For every table: **what it does**, **which frontend uses it**, **which API operations touch it**, and **what NOT to use it for**.  
> Companion to `BEMS_FARMS_DATABASE.md` (schema) and `DATABASE_TABLES.md` (target list).  
> Version: 1.0 | Date: June 28, 2026

---

## How to Read This Document

Each table entry has four sections:

| Section | What it answers |
|---|---|
| **Purpose** | What this table stores and why it exists |
| **Used By** | Which frontends read or write it (Admin / Customer App / Driver App / Web / n8n) |
| **API Operations** | Which backend routes touch it and what they do |
| **❌ Do NOT use for** | Common mistakes, what belongs elsewhere |

**Frontend key:**
- `ADMIN` = Admin React app (staff-facing)
- `CUSTOMER` = Customer React Native app + Web Next.js
- `DRIVER` = Driver React Native app
- `N8N` = Chef Bems AI / Nancy workflow
- `BACKEND` = Internal/server-side only (no direct frontend call)

---

## MODULE 1 — AUTH & USERS

---

### `users`

**Purpose:** Admin staff accounts. Every person who logs into the admin panel has a row here. Stores credentials, role, login state, and optional store assignment.

**Used By:** `ADMIN` (login, profile, all protected routes)

**API Operations:**
- `POST /auth/login` — reads email + password, returns JWT
- `POST /auth/refresh` — validates `refresh_token`, issues new access token
- `GET /auth/me` — reads by `id` from JWT payload
- `POST /auth/logout` — clears `refresh_token`
- `POST /auth/forgot-password` — writes `reset_token` + `reset_expires`
- `POST /auth/reset-password` — validates token, updates `password_hash`, clears token
- `GET /users` — admin list (superadmin/manager only)
- `POST /users` — create staff (superadmin only)
- `PATCH /users/:id` — update role/status/store_id
- `DELETE /users/:id` — soft-delete via `status = 'inactive'`
- Every protected route reads JWT → queries `users` to confirm role + status

**❌ Do NOT use for:**
- Storing customer accounts — use `customers` + `customer_auth`
- Storing driver accounts — use `drivers` + `driver_auth`
- Public-facing data — this table should never be exposed to customer or driver APIs
- Storing order or delivery data against a user — orders belong to `customers`

---

## MODULE 2 — PRODUCTS

---

### `categories`

**Purpose:** Top-level product groupings visible in the admin and customer app (e.g. Meals, Seafood, Meat, Vegetables).

**Used By:** `ADMIN` (Products → Categories page), `CUSTOMER` (browse menu), `N8N` (catalogue browsing)

**API Operations:**
- `GET /categories` — public; returns active categories with product counts
- `POST /categories` — admin create (manager/superadmin)
- `PATCH /categories/:id` — update name/icon/status
- `DELETE /categories/:id` — soft-delete via `status = 'inactive'`; check no active products first

**❌ Do NOT use for:**
- Storing the second level of grouping — use `sub_categories`
- Storing product attributes like dietary flags — those go on `products` or `meal_dietary_flags`
- Grouping customers or orders — unrelated

---

### `sub_categories`

**Purpose:** Second-level grouping nested under a category (e.g. category = Meat → sub = Beef, Chicken, Goat).

**Used By:** `ADMIN` (Products → Sub-Categories page), `CUSTOMER` (filtered browsing)

**API Operations:**
- `GET /categories/:id/sub-categories` — list subs for a category
- `POST /sub-categories` — admin create
- `PATCH /sub-categories/:id` — update
- `DELETE /sub-categories/:id` — soft-delete

**❌ Do NOT use for:**
- Replacing categories — a sub-category must always have a parent `category_id`
- Storing product details — link a product via `products.sub_category_id`

---

### `brands`

**Purpose:** Manufacturer or brand names attached to products (e.g. for packaged goods, farm labels).

**Used By:** `ADMIN` (Products → Brands page, product form)

**API Operations:**
- `GET /brands` — list all active brands
- `POST /brands` — create (manager/superadmin)
- `PATCH /brands/:id` — update
- `DELETE /brands/:id` — soft-delete; warn if products still linked

**❌ Do NOT use for:**
- Store-level branding — that's in `stores`
- Customer or driver metadata

---

### `units_of_measure`

**Purpose:** Measurement units used on products and inventory (kg, g, litre, piece, crate, tuber, bag, bunch, bottle, pack). Referenced by `products`, `stock_in`, `stock_out`, and n8n `unit_conversions`.

**Used By:** `ADMIN` (product form dropdown, inventory forms), `N8N` (quantity math)

**API Operations:**
- `GET /units` — list all units (used to populate dropdowns)
- `POST /units` — admin create (rare — seeded at migration)
- `PATCH /units/:id` — update abbreviation

**❌ Do NOT use for:**
- Currency — currency lives in `currencies`
- Storing actual quantities — quantities belong on `products.stock_quantity`, `stock_in.quantity`, etc.

---

### `products`

**Purpose:** The master product/SKU catalogue for the **admin system**. Every item Bems Farms sells originates here — price, stock threshold, category, images, status. This is the **admin source of truth**.

**Used By:** `ADMIN` (Products pages — list, add, edit, variants, stock), `BACKEND` (order creation, invoice generation)

**API Operations:**
- `GET /products` — paginated list with filters (category, status, search)
- `GET /products/:id` — single product with category, brand, images
- `POST /products` — create product; backend MUST also INSERT into `catalogue` for n8n sync
- `PATCH /products/:id` — update product; backend MUST also UPDATE `catalogue` where `sku` matches
- `DELETE /products/:id` — soft-delete (`status = 'archived'`); also set `catalogue.available = false`
- `GET /products/low-stock` — filters where `stock_quantity <= low_stock_threshold`

**❌ Do NOT use for:**
- AI browsing — n8n reads `catalogue`, not `products`. Changes must be synced to both.
- Customer-facing product display on the web/app — the customer API should serve from `catalogue` or a sanitised product view
- Storing stock movement history — that's in `stock_in`, `stock_out`, `stock_adjustments`

---

### `product_images`

**Purpose:** Additional images per product (beyond the primary `products.image_url`). Supports up to 4 images with sort order.

**Used By:** `ADMIN` (product edit page, image gallery), `CUSTOMER` (product detail image carousel)

**API Operations:**
- `GET /products/:id/images` — list images sorted by `sort_order`
- `POST /products/:id/images` — upload + attach (max 4 check server-side)
- `DELETE /product-images/:id` — remove; if `is_primary=true`, promote next image
- `PATCH /product-images/:id` — update `is_primary`, `sort_order`, `alt_text`

**❌ Do NOT use for:**
- Storing the primary product thumbnail — that's `products.image_url`
- Customer avatars — use `customers.avatar_url`
- Staff profile photos — use `users.avatar_url`

---

### `product_variants`

**Purpose:** Size/weight/pack variations of a single product (e.g. Chicken — 500g, 1kg, 2kg). Each variant has its own SKU, stock count, and optional price adjustment.

**Used By:** `ADMIN` (product edit → Variants tab), `CUSTOMER` (variant selector on product page)

**API Operations:**
- `GET /products/:id/variants` — list active variants
- `POST /products/:id/variants` — add variant
- `PATCH /product-variants/:id` — update price adjustment, stock, status
- `DELETE /product-variants/:id` — deactivate (`is_active = false`)

**❌ Do NOT use for:**
- Completely different products — create a separate `products` row instead
- Storing variant-specific images — not yet supported; attach to parent product
- Replacing the parent product row — the parent must always exist

---

### `product_reviews`

**Purpose:** Customer ratings and reviews on products, linked to a verified purchase. Moderated before display.

**Used By:** `CUSTOMER` (leave review after order delivered), `ADMIN` (Reviews moderation page)

**API Operations:**
- `GET /products/:id/reviews` — public; only `status = 'approved'`
- `POST /products/:id/reviews` — customer POST; `is_verified_purchase` set true if `order_id` found in customer's orders
- `PATCH /product-reviews/:id` — admin approve/reject
- `DELETE /product-reviews/:id` — admin hard delete (moderation)

**❌ Do NOT use for:**
- Staff ratings or feedback — no equivalent table yet; use a separate flow
- Storing order complaints/issues — use `issues` table
- Anonymous reviews — must have a `customer_id`

---

## MODULE 3 — INVENTORY

---

### `warehouses`

**Purpose:** Physical storage locations (main store, cold room, secondary depot). Inventory is tracked per warehouse.

**Used By:** `ADMIN` (Inventory → Warehouses page)

**API Operations:**
- `GET /warehouses` — list all warehouses
- `POST /warehouses` — create (manager/superadmin)
- `PATCH /warehouses/:id` — update name/address/status
- `DELETE /warehouses/:id` — deactivate only if no active stock

**❌ Do NOT use for:**
- Customer delivery addresses — use `customer_addresses`
- Store locations for multi-store — use `stores`

---

### `stock_in` + `stock_in_items`

**Purpose:** Records every goods receipt — when stock arrives at a warehouse from a supplier or farm. `stock_in` is the receipt header; `stock_in_items` is the line items per product.

**Used By:** `ADMIN` (Inventory → Stock In page)

**API Operations:**
- `GET /stock-in` — paginated receipts with filters
- `POST /stock-in` — create receipt + items; backend auto-increments `products.stock_quantity` for each item
- `GET /stock-in/:id` — receipt detail with all items
- No update/delete — stock records are append-only for audit trail

**❌ Do NOT use for:**
- Recording sales/outflows — use `stock_out` or `order_items`
- Adjusting incorrect quantities — use `stock_adjustments`
- Transfers between warehouses — use `stock_transfers`

---

### `stock_out` + `stock_out_items`

**Purpose:** Records manual stock removal that isn't a customer sale (spoilage write-offs, internal use, wastage). `stock_out` is the header; `stock_out_items` is line items.

**Used By:** `ADMIN` (Inventory → Stock Out page)

**API Operations:**
- `GET /stock-out` — paginated list with filters
- `POST /stock-out` — create + items; backend decrements `products.stock_quantity`
- `GET /stock-out/:id` — detail view

**❌ Do NOT use for:**
- Customer order fulfillment — that reduces stock via `order_items` processing
- Receiving returns from customers — use `returns`
- Warehouse-to-warehouse transfers — use `stock_transfers`

---

### `stock_adjustments` + `stock_adjustment_items`

**Purpose:** Correction entries when a physical count doesn't match the system (e.g. after a stocktake). Can be positive (found more) or negative (shortage). All adjustments require a reason.

**Used By:** `ADMIN` (Inventory → Adjustments page)

**API Operations:**
- `GET /stock-adjustments` — list with date/status filters
- `POST /stock-adjustments` — create + items; backend applies delta to `products.stock_quantity`
- `PATCH /stock-adjustments/:id` — approve/reject (manager only)

**❌ Do NOT use for:**
- Routine stock receipts — use `stock_in`
- Routine write-offs — use `stock_out`
- Corrections mid-order — cancel and re-create the order instead

---

### `stock_transfers` + `stock_transfer_items`

**Purpose:** Records movement of stock from one warehouse to another. Reduces qty at source, increases at destination.

**Used By:** `ADMIN` (Inventory → Transfers page)

**API Operations:**
- `GET /stock-transfers` — list transfers
- `POST /stock-transfers` — create + items; backend processes warehouse qty changes on `status = 'completed'`
- `PATCH /stock-transfers/:id` — update status (pending → in_transit → completed / cancelled)

**❌ Do NOT use for:**
- Customer deliveries — those are in `deliveries` + `delivery_assignments`
- Supplier receipts — use `stock_in`

---

### `batch_management`

**Purpose:** Tracks expiry dates and lot/batch numbers for perishable stock. Linked to a `stock_in` receipt and product. Drives expiry alerts and FIFO picking.

**Used By:** `ADMIN` (Inventory → Batch Tracking page)

**API Operations:**
- `GET /batches` — list by product or expiry range
- `POST /batches` — created alongside a `stock_in` record
- `PATCH /batches/:id` — update status (active → depleted / expired / recalled)

**❌ Do NOT use for:**
- Products that don't expire (non-perishables) — leave `expiry_date` null and skip
- Customer order fulfillment tracking — that's in `order_status_history`

---

### `lost_items`

**Purpose:** Records stock that has been physically lost, stolen, or damaged beyond use. Separate from `stock_out` write-offs because lost items trigger an investigation flag.

**Used By:** `ADMIN` (Inventory → Lost Items page)

**API Operations:**
- `GET /lost-items` — list with filters
- `POST /lost-items` — create report; backend decrements `products.stock_quantity`
- `PATCH /lost-items/:id` — mark resolved/investigated

**❌ Do NOT use for:**
- Planned write-offs (spoilage, sampling) — use `stock_out`
- Returns from customers — use `returns`

---

### `stock_alerts`

**Purpose:** System-generated alerts when a product's stock falls to or below `low_stock_threshold`. Drives the low-stock notification sent to kitchen/manager.

**Used By:** `ADMIN` (Dashboard alerts widget, Inventory → Alerts page), `BACKEND` (auto-generated after every order or stock-out)

**API Operations:**
- `GET /stock-alerts` — list unresolved alerts
- `PATCH /stock-alerts/:id` — mark resolved (after restocking)
- `POST /stock-alerts` — created by backend automatically; not created by frontend directly

**❌ Do NOT use for:**
- General system notifications to staff — use `notifications`
- Manually setting reorder points — that's `products.low_stock_threshold`

---

### `inventory`

**Purpose:** n8n-owned. A flattened view of product availability keyed by SKU. The AI queries this JOIN with `catalogue` to check if an item is in stock before adding it to a cart.

**Used By:** `N8N` (stock checks during ordering flow), `BACKEND` (sync after every stock change)

**API Operations:**
- **Admin must update** `inventory.available_qty` whenever `products.stock_quantity` changes (after stock_in, stock_out, order fulfillment)
- n8n reads: `SELECT available_qty, unit FROM inventory WHERE sku = $1`

**❌ Do NOT use for:**
- Full inventory management — use `stock_in`, `stock_out`, `stock_adjustments`
- Storing product details beyond what n8n needs — keep it lean (sku, available_qty, unit)
- Admin UI inventory pages — those read from `products`

---

## MODULE 4 — ORDERS

---

### `orders`

**Purpose:** The central order record. Every sale — whether from the admin POS, customer app, web, or AI cart confirmation — creates one row here. The single source of truth for all sales.

**Used By:** `ADMIN` (Orders list, order detail, invoice gen), `CUSTOMER` (order history, tracking), `BACKEND` (order processing pipeline), `N8N` (cart confirm → POST to backend → creates order)

**API Operations:**
- `GET /orders` — admin list with filters (status, date, customer, store)
- `GET /orders/:id` — full order with items, customer, driver
- `POST /orders` — create order (from POS or from n8n cart notify endpoint)
- `PATCH /orders/:id/status` — advance status (pending → confirmed → preparing → ready → dispatched → delivered)
- `POST /orders/:id/cancel` — cancel with reason; triggers stock reversal
- `GET /customers/:id/orders` — customer-facing order history

**❌ Do NOT use for:**
- Cart/in-progress sessions before checkout — use `customer_carts` (customer app) or `nancy_cart_sessions` (AI)
- POS holds — use `pos_held_orders`
- Returns processing — once an order is delivered, refunds/returns go to `returns`

---

### `order_items`

**Purpose:** Line items inside an order — product, quantity, unit price at time of purchase, and any variant. Immutable after order is confirmed.

**Used By:** `ADMIN` (order detail, invoice), `CUSTOMER` (order detail screen), `BACKEND` (stock deduction, invoice calc)

**API Operations:**
- Created alongside the parent `orders` row in a single transaction
- `GET /orders/:id/items` — fetch items for an order
- Never updated individually after creation — cancel/recreate the order instead

**❌ Do NOT use for:**
- Active cart items being browsed — use `customer_cart_items`
- Loyalty point calculations — derive from `order_items.total_price` per order, write result to `loyalty_transactions`

---

### `order_status_history`

**Purpose:** Append-only log of every status change on an order, with timestamp and actor. Enables full audit trail and customer-facing tracking timeline.

**Used By:** `ADMIN` (order detail → timeline tab), `CUSTOMER` (order tracking screen), `BACKEND` (auto-written on every status change)

**API Operations:**
- `GET /orders/:id/history` — return timeline for an order
- `POST /order-status-history` — created by backend only (never by frontend directly); fires on every `PATCH /orders/:id/status`

**❌ Do NOT use for:**
- General activity logs — use `customer_activity_log` for customer-facing events
- Driver location tracking — use `driver_locations`
- Modifying past entries — this is append-only; never UPDATE or DELETE

---

### `invoices`

**Purpose:** Auto-generated tax invoices for completed orders. One invoice per order. Also supports manually created invoices for B2B clients.

**Used By:** `ADMIN` (Finance → Invoices, order detail → Download Invoice), `CUSTOMER` (order receipt download)

**API Operations:**
- `POST /invoices/generate/:order_id` — backend auto-generates after order status = 'delivered'
- `GET /invoices` — admin list (accountant/manager/superadmin)
- `GET /invoices/:id` — single invoice with line items and tax breakdown
- `GET /invoices/:id/pdf` — generates and streams PDF
- `POST /invoices` — manual invoice creation (accountant)
- `PATCH /invoices/:id` — mark paid/void (manual invoices only)

**❌ Do NOT use for:**
- Receipts from POS — POS generates a simpler receipt; invoices are for order fulfilment
- Storing payment records — payments go in `transactions`
- Tracking who owes money — invoices describe what was sold; `wallet_transactions` or `transactions` track cash movement

---

### `returns`

**Purpose:** Records customer return requests for delivered orders. Captures reason, items being returned, and outcome (refund/replacement).

**Used By:** `ADMIN` (Orders → Returns page, approve/reject), `CUSTOMER` (raise return request)

**API Operations:**
- `POST /returns` — customer raises request (only for delivered orders)
- `GET /returns` — admin list with filters
- `PATCH /returns/:id` — admin updates status (pending → approved/rejected); on approved, triggers `wallet_transactions` refund credit
- `GET /orders/:id/return` — fetch return for a specific order

**❌ Do NOT use for:**
- Cancellations before delivery — those go through `orders.status = 'cancelled'`
- Inventory adjustments for returned goods — create a `stock_in` record separately when items are physically received back

---

## MODULE 5 — DELIVERIES

---

### `drivers`

**Purpose:** Driver profiles — personal info, vehicle details, account status, earnings summary. The identity record for every delivery driver.

**Used By:** `ADMIN` (Drivers page), `DRIVER` (own profile), `BACKEND` (assignment logic)

**API Operations:**
- `GET /drivers` — admin list with filters (status, zone, availability)
- `GET /drivers/:id` — driver profile
- `POST /drivers` — onboard new driver (admin)
- `PATCH /drivers/:id` — update vehicle, phone, zone, status
- `GET /drivers/available` — backend only; finds nearest available driver for auto-assign

**❌ Do NOT use for:**
- Driver login credentials — those are in `driver_auth`
- Real-time location — that's in `driver_locations`
- Availability state — that's in `driver_availability` (toggled in real-time by the driver app)

---

### `delivery_zones`

**Purpose:** Geographic zones Bems Farms delivers to, each with a base delivery fee and estimated time. Drivers are assigned to zones via `zone_drivers`.

**Used By:** `ADMIN` (Delivery → Zones page), `N8N` (zone lookup by area name for fee calculation), `CUSTOMER` (checkout — zone fee display)

**API Operations:**
- `GET /delivery-zones` — public list of active zones with fees
- `POST /delivery-zones` — create zone (delivery_manager/manager)
- `PATCH /delivery-zones/:id` — update fee, ETA, status
- `DELETE /delivery-zones/:id` — deactivate

**❌ Do NOT use for:**
- Customer addresses — those are in `customer_addresses` with lat/lng
- Real-time driver GPS — use `driver_locations`
- Delivery distance calculations — compute from driver lat/lng vs order lat/lng at assignment time

---

### `zone_drivers`

**Purpose:** Junction table linking drivers to their assigned delivery zones. A driver can cover multiple zones; a zone can have multiple drivers.

**Used By:** `ADMIN` (Delivery → Zones → Assign Driver), `BACKEND` (driver search filtered by zone)

**API Operations:**
- `GET /zones/:id/drivers` — list drivers in a zone
- `POST /zone-drivers` — assign driver to zone
- `DELETE /zone-drivers/:id` — remove assignment

**❌ Do NOT use for:**
- Active delivery assignment on a specific order — use `delivery_assignments`

---

### `deliveries`

**Purpose:** One delivery record per order. Tracks the actual delivery state — start time, completion time, GPS proof, and final status.

**Used By:** `ADMIN` (Deliveries → Active, history), `DRIVER` (current delivery info), `CUSTOMER` (delivery tracking)

**API Operations:**
- `POST /deliveries` — created by backend when an order is dispatched to a driver
- `GET /deliveries/active` — admin live view
- `GET /deliveries/:id` — detail with driver + order
- `PATCH /deliveries/:id` — driver app updates status (picked_up → en_route → delivered / failed)
- `GET /orders/:id/delivery` — customer-facing delivery status

**❌ Do NOT use for:**
- Driver assignment decision — that's `delivery_assignments`
- Live GPS streaming — use `driver_locations` (high-frequency) then summarize final coords here on completion

---

### `delivery_assignments`

**Purpose:** Tracks the offer-and-accept flow for each delivery. When the system tries to assign a driver, it creates a row here. The driver has 60 seconds to accept. If rejected or timed out, system tries the next driver and creates another row.

**Used By:** `BACKEND` (auto-assign logic), `DRIVER` (incoming assignment notification)

**API Operations:**
- `POST /delivery-assignments` — backend creates when offering to a driver
- `PATCH /delivery-assignments/:id/accept` — driver accepts → triggers delivery creation
- `PATCH /delivery-assignments/:id/reject` — driver rejects → backend tries next driver
- `GET /delivery-assignments/pending/:driver_id` — driver app polls for incoming requests

**❌ Do NOT use for:**
- Storing final delivery outcome — that's in `deliveries`
- Manual admin assignment — admin should still go through this flow via backend

---

## MODULE 6 — CUSTOMERS & LOYALTY

---

### `customers`

**Purpose:** Customer identity records for people who order via the customer app or website. The anchor table — all customer-related data links here.

**Used By:** `ADMIN` (Customers pages), `CUSTOMER` (own profile), `BACKEND` (order creation, loyalty), `N8N` (reads `customer_preferences` via customer_id)

**API Operations:**
- `GET /customers` — admin list with search/filter
- `GET /customers/:id` — profile with order count, loyalty tier, wallet balance
- `POST /customers` — admin-created customer OR customer self-registration
- `PATCH /customers/:id` — update profile, contact, status
- `GET /customers/:id/orders` — order history
- `DELETE /customers/:id` — GDPR delete (anonymise, do not hard-delete — nullify PII)

**❌ Do NOT use for:**
- Admin staff — use `users`
- Drivers — use `drivers`
- Storing customer passwords — use `customer_auth`
- Customer wallet balances — use `customer_wallets`

---

### `customer_auth`

**Purpose:** Login credentials for the customer app / website. Separate from `customers` so PII and auth data are decoupled.

**Used By:** `CUSTOMER` (login, register, forgot password), `BACKEND` (auth middleware)

**API Operations:**
- `POST /customer/auth/register` — creates `customers` + `customer_auth` in transaction
- `POST /customer/auth/login` — validates `password_hash`, returns JWT
- `POST /customer/auth/forgot-password` — writes `reset_token`
- `POST /customer/auth/reset-password` — validates token, updates hash
- `POST /customer/auth/refresh` — validates `refresh_token`

**❌ Do NOT use for:**
- Storing admin staff credentials — use `users`
- Storing driver credentials — use `driver_auth`
- Google/social login tokens — store in `customers.google_id` / social columns

---

### `customer_devices`

**Purpose:** Push notification tokens for customer devices. A customer may have multiple devices (iOS + Android, multiple phones).

**Used By:** `BACKEND` (push notification sender), `CUSTOMER` (device registration on app launch)

**API Operations:**
- `POST /customer/devices` — register or refresh device token on login
- `DELETE /customer/devices/:token` — deregister on logout
- `GET /customer/devices/:customer_id` — backend only; used before sending push notifications

**❌ Do NOT use for:**
- Storing driver device tokens — use `driver_devices`
- Sending the actual notifications — use `notification_logs` to track what was sent

---

### `customer_addresses`

**Purpose:** Saved delivery addresses per customer. Customers can have multiple addresses (home, office, etc.) with one marked as default.

**Used By:** `CUSTOMER` (address book, checkout), `BACKEND` (delivery zone lookup at checkout)

**API Operations:**
- `GET /customer/addresses` — list customer's saved addresses
- `POST /customer/addresses` — add new address
- `PATCH /customer/addresses/:id` — update, set as default
- `DELETE /customer/addresses/:id` — remove

**❌ Do NOT use for:**
- Warehouse addresses — use `warehouses`
- Store addresses — use `stores`
- One-off delivery address typed at checkout without saving — pass as order payload, don't force save

---

### `customer_wallets`

**Purpose:** Each customer has exactly one wallet. Stores the current balance used for paying orders or receiving refunds.

**Used By:** `CUSTOMER` (wallet screen, checkout — "pay with wallet"), `ADMIN` (customer profile → wallet tab)

**API Operations:**
- `GET /customer/wallet` — return wallet balance for authenticated customer
- `POST /customer/wallet/topup` — admin or payment gateway callback adds credit
- `POST /customer/wallet/pay` — deduct balance when paying for an order
- `POST /customer/wallet/refund` — credit balance on order refund approval

**❌ Do NOT use for:**
- Storing transaction history — every change to the wallet creates a `wallet_transactions` row
- Driver earnings/commissions — those are in `driver_commissions`
- Storing business bank accounts — use `bank_accounts`

---

### `wallet_transactions`

**Purpose:** Immutable ledger of every wallet credit and debit. Append-only. The source of truth for reconstructing wallet balance.

**Used By:** `CUSTOMER` (wallet history screen), `ADMIN` (customer profile → wallet history)

**API Operations:**
- `GET /customer/wallet/transactions` — paginated history for a customer
- Created by backend on every wallet topup, payment, refund — never by frontend directly
- Never UPDATE or DELETE a wallet transaction

**❌ Do NOT use for:**
- Business income/expenses — use `income`, `expenses`, `transactions`
- Loyalty point transactions — use `loyalty_transactions`

---

### `customer_saved_items`

**Purpose:** Customer wishlist / saved products. A customer can save items to come back to later.

**Used By:** `CUSTOMER` (Saved Items screen, product page → save button)

**API Operations:**
- `GET /customer/saved-items` — list saved items with product details
- `POST /customer/saved-items` — save a product
- `DELETE /customer/saved-items/:id` — unsave

**❌ Do NOT use for:**
- Active cart items — use `customer_cart_items`
- Product reviews — use `product_reviews`

---

### `customer_carts` + `customer_cart_items`

**Purpose:** Persistent cart for the customer app / website. A customer has at most one active cart at a time. Items survive app restarts and device switches.

**Used By:** `CUSTOMER` (cart screen, checkout), `BACKEND` (order creation from cart)

**API Operations:**
- `GET /customer/cart` — get active cart with items
- `POST /customer/cart/items` — add item to cart
- `PATCH /customer/cart/items/:id` — change quantity
- `DELETE /customer/cart/items/:id` — remove item
- `POST /customer/cart/checkout` — convert cart → `orders` + `order_items`; then `status = 'checked_out'`
- `DELETE /customer/cart` — clear cart (after checkout or abandonment)

**❌ Do NOT use for:**
- AI/Nancy cart sessions — those are in `nancy_cart_sessions` (n8n owns)
- POS holds — use `pos_held_orders`
- Order history — once checked out, the cart is done; history lives in `orders`

---

### `customer_dietary_profiles`

**Purpose:** Per-customer dietary restrictions and preferences stored by the admin system (e.g. allergies declared during onboarding). Used to warn staff and filter product suggestions.

**Used By:** `ADMIN` (customer profile → dietary tab), `BACKEND` (sync to `customer_preferences` for n8n)

**API Operations:**
- `GET /customers/:id/dietary` — fetch dietary profile
- `POST /customers/:id/dietary` — set dietary preferences
- On save: backend also writes/updates `customer_preferences` so n8n can see it

**❌ Do NOT use for:**
- n8n AI dietary decisions — n8n reads `customer_preferences`, not this table
- Order-level dietary notes — those go on `orders.notes`

---

### `loyalty_tiers`

**Purpose:** Defines Bronze / Silver / Gold / Platinum tiers with point thresholds and perks. Reference data seeded at migration.

**Used By:** `ADMIN` (Loyalty → Tiers config page), `BACKEND` (tier upgrade check after every order), `CUSTOMER` (loyalty screen — "You are Gold tier")

**API Operations:**
- `GET /loyalty-tiers` — list all tiers
- `PATCH /loyalty-tiers/:id` — update thresholds/perks (superadmin only)

**❌ Do NOT use for:**
- Storing per-customer points — use `customer_loyalty`
- Storing point transactions — use `loyalty_transactions`

---

### `customer_loyalty`

**Purpose:** Each customer's current points balance and tier. Updated after every qualifying order. One row per customer.

**Used By:** `ADMIN` (customer profile → loyalty tab), `CUSTOMER` (loyalty screen), `BACKEND` (calculate tier on order delivery)

**API Operations:**
- `GET /customers/:id/loyalty` — points + tier
- `PATCH /customer/loyalty/:id` — backend only; updates `points_balance` + `tier_id` after order
- `POST /admin/loyalty/award` — admin manually awards/deducts points

**❌ Do NOT use for:**
- Transaction history — use `loyalty_transactions`
- Tier configuration — use `loyalty_tiers`

---

### `loyalty_transactions`

**Purpose:** Append-only ledger of every loyalty point earn or spend. Audit trail for customer loyalty history.

**Used By:** `ADMIN` (customer profile → points history), `CUSTOMER` (loyalty points history screen)

**API Operations:**
- `GET /customers/:id/loyalty/transactions` — paginated history
- Created by backend on: order delivered (earn), redeem points at checkout (spend), admin manual award
- Never UPDATE or DELETE

**❌ Do NOT use for:**
- Wallet money — use `wallet_transactions`
- Current balance — use `customer_loyalty.points_balance`

---

### `customer_activity_log`

**Purpose:** Timestamped feed of significant customer events (order placed, login, review posted, address added, profile updated). Used for admin "Activity" tab and anomaly detection.

**Used By:** `ADMIN` (customer profile → activity tab)

**API Operations:**
- `GET /customers/:id/activity` — paginated activity feed
- Written by backend middleware automatically — never by frontend directly

**❌ Do NOT use for:**
- Order status tracking — use `order_status_history`
- Driver activity — no equivalent driver log yet

---

## MODULE 7 — STAFF & HR

---

### `staff`

**Purpose:** HR profile for every employee — separate from `users` which is for system access. A staff member may or may not have a `users` account. Stores employment details, shift, department, join date.

**Used By:** `ADMIN` (Staff & HR → Staff List page)

**API Operations:**
- `GET /staff` — list with filters (department, shift, status)
- `POST /staff` — add new staff member (manager/superadmin)
- `PATCH /staff/:id` — update employment details
- `DELETE /staff/:id` — set `status = 'inactive'`
- Optionally link to `users.id` if this staff member also has a system login

**❌ Do NOT use for:**
- System login — use `users` for that
- Drivers — use `drivers`
- Delivery tracking — unrelated

---

### `staff_attendance`

**Purpose:** Daily clock-in/clock-out records per staff member. One row per staff per day.

**Used By:** `ADMIN` (Staff → Attendance page), `BACKEND` (auto-mark absent if no clock-in by shift start)

**API Operations:**
- `GET /staff-attendance` — filter by date range, staff, shift
- `POST /staff-attendance` — record clock-in (or admin manual entry)
- `PATCH /staff-attendance/:id` — record clock-out, update status

**❌ Do NOT use for:**
- Leave/holiday requests — use `staff_holidays`
- Shift planning ahead of time — use `staff_schedules`

---

### `staff_schedules`

**Purpose:** Planned shift roster — which staff is assigned to which shift on which date. Set in advance by manager.

**Used By:** `ADMIN` (Staff → Schedule / Rota page)

**API Operations:**
- `GET /staff-schedules` — weekly/monthly view
- `POST /staff-schedules` — bulk schedule creation for a week
- `PATCH /staff-schedules/:id` — update or mark as day-off

**❌ Do NOT use for:**
- Actual attendance — use `staff_attendance`
- Holiday requests — use `staff_holidays`

---

### `staff_holidays`

**Purpose:** Leave requests per staff member with type (annual, sick, maternity, etc.) and approval status.

**Used By:** `ADMIN` (Staff → Holidays/Leave page)

**API Operations:**
- `POST /staff-holidays` — staff or manager submits request
- `GET /staff-holidays` — list with filters (pending, approved, staff_id)
- `PATCH /staff-holidays/:id` — manager approves or rejects; `approved_by` is set

**❌ Do NOT use for:**
- Clock-in records — use `staff_attendance`
- Public bank holidays — seed those separately as `type = 'public'` or handle in schedule logic

---

### `payroll`

**Purpose:** Monthly/bi-weekly pay run records. Each row represents one payment to one staff member for one period.

**Used By:** `ADMIN` (Finance → Payroll page — accountant/manager)

**API Operations:**
- `GET /payroll` — list with filters (period, department, status)
- `POST /payroll` — create payroll record for a pay period
- `PATCH /payroll/:id` — mark as paid once bank transfer is done
- `GET /payroll/summary` — total payroll cost for a period

**❌ Do NOT use for:**
- Driver commissions — use `driver_commissions`
- One-off cash payments — use `expenses` with category = 'staff_bonus'
- Storing bank account details — use `bank_accounts`

---

## MODULE 8 — ACCOUNTS & FINANCE

---

### `bank_accounts`

**Purpose:** Business bank accounts Bems Farms uses to send/receive money. Referenced by income, expenses, money transfers, and payroll.

**Used By:** `ADMIN` (Finance → Bank Accounts page)

**API Operations:**
- `GET /bank-accounts` — list active accounts
- `POST /bank-accounts` — add account (accountant/superadmin)
- `PATCH /bank-accounts/:id` — update balance (after reconciliation), status

**❌ Do NOT use for:**
- Customer wallet — use `customer_wallets`
- Driver payout bank details — store on `drivers.bank_account_number` etc.

---

### `income`

**Purpose:** Records all money received by the business — order payments, investments, grants, other income. Each row is one income event.

**Used By:** `ADMIN` (Finance → Income page)

**API Operations:**
- `GET /income` — paginated list with filters (date, category, bank account)
- `POST /income` — record income (accountant/manager)
- `PATCH /income/:id` — update, mark verified
- `GET /income/summary` — totals by category / period

**❌ Do NOT use for:**
- Customer wallet credits — use `wallet_transactions`
- Order-level revenue reporting — derive from `orders` + `order_items`

---

### `expenses`

**Purpose:** Records all money spent — supplies, utilities, salaries (summary), logistics, etc.

**Used By:** `ADMIN` (Finance → Expenses page)

**API Operations:**
- `GET /expenses` — paginated list with filters
- `POST /expenses` — create (accountant/manager); attach receipt URL
- `PATCH /expenses/:id` — update status (pending → approved → paid)
- `GET /expenses/summary` — totals by category / period

**❌ Do NOT use for:**
- Payroll detail — use `payroll`; expenses can store a summary entry for total payroll cost
- Driver commission payments — use `commission_payments`

---

### `money_transfers`

**Purpose:** Internal transfers between the business's own bank accounts (e.g. moving cash from operations account to savings).

**Used By:** `ADMIN` (Finance → Money Transfer page)

**API Operations:**
- `GET /money-transfers` — list transfers
- `POST /money-transfers` — create transfer; backend debits `from_account` balance, credits `to_account`
- `PATCH /money-transfers/:id` — mark completed/failed

**❌ Do NOT use for:**
- Customer wallet operations — use `wallet_transactions`
- Payments to suppliers — use `expenses`

---

### `transactions`

**Purpose:** Unified financial ledger — a record of every financial movement (income, expense, transfer, commission payout, refund). Not the primary storage of those events — rather, a normalised view for reporting.

**Used By:** `ADMIN` (Finance → Transactions page — accountant)

**API Operations:**
- `GET /transactions` — filtered ledger view
- Created by backend automatically when income/expense/transfer records are created
- Never created directly by frontend

**❌ Do NOT use for:**
- Replacing `income`, `expenses`, or `money_transfers` tables — those remain the primary records
- Customer wallet history — use `wallet_transactions`

---

### `driver_commissions`

**Purpose:** Tracks the commission earned by each driver per delivery — percentage of order value or flat rate.

**Used By:** `ADMIN` (Finance → Driver Commissions page, delivery detail)

**API Operations:**
- `GET /driver-commissions` — list with filters (driver, date, status)
- Created by backend automatically when a delivery is marked completed
- `POST /commission-payments` — when admin pays out a batch of commissions

**❌ Do NOT use for:**
- Driver salary — drivers are independent; commissions are per delivery
- Staff payroll — use `payroll`

---

### `commission_payments`

**Purpose:** Records a batch payout to a driver — grouping multiple `driver_commissions` rows into one bank transfer.

**Used By:** `ADMIN` (Finance → Commission Payouts page)

**API Operations:**
- `GET /commission-payments` — list payouts
- `POST /commission-payments` — create payout batch; marks linked `driver_commissions` as paid
- `PATCH /commission-payments/:id` — mark transferred

**❌ Do NOT use for:**
- Individual commission records — use `driver_commissions`

---

## MODULE 9 — POINT OF SALE

---

### `pos_sessions`

**Purpose:** A POS session represents one cashier's shift at the till — from opening float to closing float. All POS orders made during a session are linked to it.

**Used By:** `ADMIN` (POS → Open Session, Close Session, Session Summary)

**API Operations:**
- `POST /pos/sessions` — cashier opens session with opening float
- `GET /pos/sessions/active` — get active session for current cashier
- `PATCH /pos/sessions/:id/close` — close session with closing float; compute totals
- `GET /pos/sessions/:id` — session summary with all orders made

**❌ Do NOT use for:**
- Storing the actual POS transactions — those are regular `orders` with `channel = 'pos'`
- Storing product prices — those are in `products`

---

### `pos_held_orders`

**Purpose:** Orders that a cashier has "held" mid-transaction (e.g. customer needs to get money, cashier switches to next customer). Not committed orders — just a saved state.

**Used By:** `ADMIN` (POS → Held Orders panel)

**API Operations:**
- `POST /pos/holds` — cashier saves current cart as a hold
- `GET /pos/holds` — list active holds for current session
- `POST /pos/holds/:id/resume` — restore a held order to active cart
- `DELETE /pos/holds/:id` — discard a hold

**❌ Do NOT use for:**
- Committed orders — use `orders`
- Customer app carts — use `customer_carts`

---

## MODULE 10 — CHEF BEMS AI (ADMIN LAYER)

---

### `meal_associations`

**Purpose:** Admin-curated pairing relationships between products (e.g. Rice pairs well with Stew). Feeds the "You might also like" suggestions in the admin product view and can be exported to n8n.

**Used By:** `ADMIN` (Chef Bems AI → Meal Associations page)

**API Operations:**
- `GET /meal-associations/:product_id` — get pairings for a product
- `POST /meal-associations` — add pairing
- `DELETE /meal-associations/:id` — remove pairing

**❌ Do NOT use for:**
- AI-generated pairings — use `meal_ai_pairings` for machine-generated suggestions
- n8n `product_associations` — that is n8n's own table; keep separate

---

### `meal_dietary_flags`

**Purpose:** Tags a product/meal with dietary properties (vegan, halal, gluten-free, etc.). Used by admin to certify flags; also drives customer dietary filtering.

**Used By:** `ADMIN` (Products → Dietary Flags), `CUSTOMER` (filter products by dietary need)

**API Operations:**
- `GET /products/:id/dietary-flags` — list flags for a product
- `POST /products/:id/dietary-flags` — add flag (manager/superadmin)
- `DELETE /meal-dietary-flags/:id` — remove flag

**❌ Do NOT use for:**
- Customer dietary preferences — use `customer_dietary_profiles`
- Allergen rules for the AI — use `allergy_rules` (n8n-owned)

---

### `meal_ai_pairings`

**Purpose:** Machine-generated pairing suggestions (higher volume than admin-curated). Scored by AI model. Refreshed periodically.

**Used By:** `ADMIN` (Chef Bems AI → AI Pairings review page), `BACKEND` (if serving AI recommendations to customer app)

**API Operations:**
- `GET /products/:id/ai-pairings` — top pairings by score
- `POST /meal-ai-pairings/sync` — backend batch-inserts from AI inference results
- `DELETE /meal-ai-pairings` — purge old pairings before re-syncing

**❌ Do NOT use for:**
- Admin-curated pairings — use `meal_associations`
- Storing the AI model itself — model lives in n8n / external

---

### `ai_conversations`

**Purpose:** Admin-level view of all Chef Bems / Nancy AI chat sessions. Mirrors what's in n8n's `nancy_conversations` but with escalation tracking and outcome state.

**Used By:** `ADMIN` (Chef Bems AI → Conversations monitoring page)

**API Operations:**
- `GET /ai-conversations` — admin list with filters (status, channel, date)
- `GET /ai-conversations/:id` — full conversation with message history (JSONB)
- `PATCH /ai-conversations/:id/escalate` — admin takes over; sets `status = 'escalated'`, `escalated_to`
- `GET /ai-conversations/open` — unresolved escalations

**❌ Do NOT use for:**
- The raw n8n turn-by-turn conversation log — that's in `nancy_conversations` (n8n writes it)
- Cart sessions — use `nancy_cart_sessions`

---

## MODULE 11 — MULTI-STORE

---

### `stores`

**Purpose:** Physical Bems Farms store/branch locations. Referenced by users (staff assigned to a store), products (store-specific pricing), and POS sessions. If there is only one store, there is still one row here.

**Used By:** `ADMIN` (Settings → Stores page, top-right store switcher)

**API Operations:**
- `GET /stores` — list active stores (used for dropdowns/switcher)
- `POST /stores` — create branch (superadmin)
- `PATCH /stores/:id` — update address, hours, status
- `GET /stores/:id/staff` — list staff at this store

**❌ Do NOT use for:**
- Warehouses — use `warehouses`
- Delivery zone config — use `delivery_zones`

---

## MODULE 12 — SETTINGS & CONFIG

---

### `system_settings`

**Purpose:** Key-value store for global application settings (store name, currency, min order value, etc.). Seeded at migration; rarely changes.

**Used By:** `ADMIN` (Settings → General Settings page — superadmin only), `BACKEND` (reads config at startup and per-request where needed)

**API Operations:**
- `GET /settings` — return all settings (grouped by `setting_group`)
- `PATCH /settings/:key` — update a setting value (superadmin only)

**❌ Do NOT use for:**
- Per-store settings — add a `store_id` column if needed for multi-store overrides
- User preferences — those belong on the `users` row
- Feature flags — use a dedicated feature-flags pattern if needed

---

### `tax_settings`

**Purpose:** Configures tax rates (e.g. VAT 7.5%). Can have multiple tax rules for different product categories.

**Used By:** `ADMIN` (Settings → Tax page), `BACKEND` (applied during invoice generation)

**API Operations:**
- `GET /tax-settings` — list tax rules
- `POST /tax-settings` — create rule
- `PATCH /tax-settings/:id` — update rate, status
- `GET /tax-settings/default` — backend uses this to apply tax at checkout

**❌ Do NOT use for:**
- Coupon/discount logic — use `coupons`

---

### `coupons` + `coupon_usages`

**Purpose:** `coupons` defines discount codes (% off or fixed amount). `coupon_usages` records each time a coupon is redeemed against an order.

**Used By:** `ADMIN` (Marketing → Coupons page), `CUSTOMER` (apply coupon at checkout), `BACKEND` (validate coupon, track usage)

**API Operations:**
- `GET /coupons` — admin list
- `POST /coupons` — create coupon
- `POST /coupons/validate` — customer validates a code at checkout (check dates, max_uses, min_order)
- `POST /coupon-usages` — created by backend when order is placed with coupon; increments `coupons.used_count`
- `PATCH /coupons/:id` — deactivate, update expiry

**❌ Do NOT use for:**
- Loyalty point redemptions — that's handled via `customer_loyalty`
- Promotions bundles for the AI — use `promotions_bundles` (n8n-owned)

---

### `payment_gateways`

**Purpose:** Stores Monnify (and future gateway) API credentials and mode (test/live). Backend reads this to initialise payment processing.

**Used By:** `ADMIN` (Settings → Payment Gateways page — superadmin only), `BACKEND` (payment initialisation)

**API Operations:**
- `GET /payment-gateways` — list gateways (keys redacted in response)
- `PATCH /payment-gateways/:id` — update keys, switch test/live mode

**❌ Do NOT use for:**
- Transaction records — use `transactions`
- Wallet operations — those are internal, no gateway needed

---

### `currencies`

**Purpose:** Supported currencies with exchange rates relative to NGN. One row is marked `is_default = true` (NGN).

**Used By:** `ADMIN` (Settings → Currencies page), `BACKEND` (multi-currency pricing if needed)

**API Operations:**
- `GET /currencies` — list active currencies
- `PATCH /currencies/:id` — update exchange rate, active status

**❌ Do NOT use for:**
- Actual financial transactions — amounts are stored in NGN and converted at display time

---

### `notifications`

**Purpose:** In-app notification inbox for admin staff (low stock alerts, new orders, AI escalations). Separate from push notifications sent to customers or drivers.

**Used By:** `ADMIN` (notification bell in topbar)

**API Operations:**
- `GET /notifications` — unread notifications for authenticated user
- `PATCH /notifications/:id/read` — mark as read
- `POST /notifications` — backend creates notifications automatically
- `DELETE /notifications/read` — clear read notifications

**❌ Do NOT use for:**
- Customer push notifications — use `customer_notifications`
- Driver notifications — use `driver_notifications`
- Notification delivery history/logs — use `notification_logs`

---

## MODULE 13 — CUSTOMER APP

*(Customer-facing tables already covered above in Module 6. Additional tables below.)*

---

### `customer_notifications`

**Purpose:** In-app notification inbox for customers on the mobile app / website (order updates, promotions, loyalty milestones).

**Used By:** `CUSTOMER` (notification bell in app)

**API Operations:**
- `GET /customer/notifications` — customer's notification list
- `PATCH /customer/notifications/:id/read` — mark read
- Created by backend on: order status change, loyalty tier upgrade, promotional events

**❌ Do NOT use for:**
- Admin staff notifications — use `notifications`
- Driver notifications — use `driver_notifications`

---

## MODULE 14 — DRIVER APP

---

### `driver_auth`

**Purpose:** Login credentials for the driver mobile app. Separate from `drivers` (which is profile/vehicle data).

**Used By:** `DRIVER` (login), `BACKEND` (driver auth middleware)

**API Operations:**
- `POST /driver/auth/login` — validates password, returns JWT
- `POST /driver/auth/forgot-password` — writes reset token
- `POST /driver/auth/reset-password` — validates token, updates hash

**❌ Do NOT use for:**
- Admin login — use `users`
- Customer login — use `customer_auth`

---

### `driver_devices`

**Purpose:** Push notification tokens for driver devices. Used to send delivery assignments and earnings updates.

**Used By:** `BACKEND` (push notification sender), `DRIVER` (register on login)

**API Operations:**
- `POST /driver/devices` — register device token
- `DELETE /driver/devices/:token` — deregister on logout

**❌ Do NOT use for:**
- Customer devices — use `customer_devices`

---

### `driver_availability`

**Purpose:** Real-time toggle — is this driver online and available to accept deliveries? One row per driver, updated in real-time by the driver app.

**Used By:** `DRIVER` (toggle button in app), `BACKEND` (driver search for auto-assign)

**API Operations:**
- `PATCH /driver/availability` — driver toggles `is_available`
- `PATCH /driver/availability/on-delivery` — backend sets `is_on_delivery = true` when delivery starts; false on completion
- `GET /drivers/available` — backend queries for assignment logic

**❌ Do NOT use for:**
- Historical availability — no history kept; only current state
- Leave/schedule — use `staff_schedules` equivalent for drivers if needed

---

### `driver_locations`

**Purpose:** High-frequency GPS pings from the driver app while on a delivery. Used for live tracking by the customer and admin. Rows accumulate during delivery; indexed by `(driver_id, recorded_at DESC)` for fast latest-position queries.

**Used By:** `DRIVER` (app sends GPS every ~10s during delivery), `ADMIN` (live delivery map), `CUSTOMER` (track my order map)

**API Operations:**
- `POST /driver/location` — driver app pings location (authenticated)
- `GET /drivers/:id/location/latest` — returns single most recent row for live map
- `GET /drivers/:id/location/history/:delivery_id` — returns route replay for a completed delivery

**❌ Do NOT use for:**
- Storing final delivery destination — that's on `orders`
- Driver's home/base address — store on `drivers` profile

---

### `driver_notifications`

**Purpose:** In-app notification inbox for drivers (new assignment offers, payment received, system messages).

**Used By:** `DRIVER` (notification bell in app)

**API Operations:**
- `GET /driver/notifications` — driver's notification list
- `PATCH /driver/notifications/:id/read` — mark read
- Created by backend on: new delivery assignment, commission payout, order cancellation

**❌ Do NOT use for:**
- Admin notifications — use `notifications`
- Customer notifications — use `customer_notifications`

---

## MODULE 15 — NOTIFICATION PIPELINE

---

### `order_tracking_events`

**Purpose:** Rich event log for an order's physical journey — kitchen started, packed, picked up, arrived. More granular than `order_status_history`. Used for the customer tracking timeline.

**Used By:** `CUSTOMER` (order tracking screen), `ADMIN` (order detail → tracking tab)

**API Operations:**
- `GET /orders/:id/tracking` — full event list for customer
- Created by backend on kitchen, driver, and delivery status updates
- Never updated or deleted

**❌ Do NOT use for:**
- System-level order status changes — use `order_status_history`
- Driver GPS streaming — use `driver_locations`

---

### `notification_templates`

**Purpose:** Pre-defined message templates for each notification event (order confirmed, out for delivery, low stock, etc.). Templates use `{{variable}}` placeholders.

**Used By:** `ADMIN` (Settings → Notification Templates page — superadmin), `BACKEND` (reads template before sending any notification)

**API Operations:**
- `GET /notification-templates` — list all templates
- `PATCH /notification-templates/:id` — edit template body/subject
- `POST /notification-templates` — add new template

**❌ Do NOT use for:**
- Storing sent notifications — use `notification_logs`
- Email marketing campaigns — out of scope; use an email marketing platform

---

### `notification_logs`

**Purpose:** Append-only record of every notification sent — channel, recipient, delivery status. Audit trail and troubleshooting.

**Used By:** `ADMIN` (Settings → Notification Logs — superadmin/manager)

**API Operations:**
- `GET /notification-logs` — admin view with filters (channel, status, date)
- Created by backend on every notification send; never by frontend directly

**❌ Do NOT use for:**
- In-app inboxes — use `notifications`, `customer_notifications`, `driver_notifications`
- Notification templates — use `notification_templates`
- Modifying sent logs — append-only; never UPDATE

---

## N8N-OWNED TABLES (DO NOT MODIFY)

These tables are created and owned by the n8n Chef Bems AI workflow. The admin backend may **read** them for display purposes and **must sync** some of them, but should **never alter their structure**.

---

### `catalogue`

**Purpose:** n8n's product index. Used by Nancy to search, filter, and price products during customer conversations. Must be kept in sync with `products`.

**Sync rule:** Every `POST /products` and `PATCH /products/:id` in the admin backend must also INSERT/UPDATE a matching row in `catalogue`.

**❌ Do NOT:** Add columns, rename columns, or change data types. Break sync by updating `products` without updating `catalogue`.

---

### `ingredients`

**Purpose:** n8n's master list of raw ingredients referenced in meal compositions.

**Sync rule:** Read-only for admin; if ingredient names change, update via n8n.

**❌ Do NOT:** Use as a substitute for `products` — ingredients are AI knowledge, not saleable items.

---

### `meals`

**Purpose:** n8n's meal knowledge base — what meals exist, descriptions, base pricing.

**Sync rule:** Admin `meals` management page (if built) should write to this table — it is a shared table.

**❌ Do NOT:** Create a second meals table. This is the single meals reference.

---

### `meal_ingredients`

**Purpose:** Many-to-many between `meals` and `ingredients`. n8n uses this to build ingredient lists and check allergens.

**❌ Do NOT:** Modify column names — n8n queries rely on exact column names.

---

### `allergy_rules`

**Purpose:** n8n allergy + safe-substitute rules. n8n queries columns `ingredient`, `allergen`, `safe_substitute`, `notes`. ⚠️ The current table was created with different column names — this is a known bug that must be fixed in n8n before the Latest Version workflow goes live.

**❌ Do NOT:** Add new columns with the old names as aliases — fix the n8n SQL query instead.

---

### `substitutions`

**Purpose:** Ingredient substitutions (e.g. "if out of X, suggest Y"). n8n reads this to suggest alternatives when an item is out of stock.

**❌ Do NOT:** Use this for product variant logic — variants live in `product_variants`.

---

### `dietary_rules`

**Purpose:** Named dietary restrictions (Vegan, Diabetic, etc.) with allowed/excluded food categories.

**❌ Do NOT:** Merge with `customer_dietary_profiles` — customer preferences are per-person; these are global rules.

---

### `customer_preferences`

**Purpose:** Per-customer dietary state maintained by n8n per conversation session. Admin backend must sync `customer_dietary_profiles` → here on profile save.

**❌ Do NOT:** Use this as the primary customer profile store — `customers` is the primary record.

---

### `promotions_bundles`

**Purpose:** Active promotions n8n can recommend during ordering (e.g. "Buy 2 get 1 free"). Admin must write here when creating promotions; n8n reads it.

**❌ Do NOT:** Use `coupons` table for AI promotions — n8n only reads `promotions_bundles`.

---

### `product_associations`

**Purpose:** n8n's trained "you might also need" pairings, derived from order co-occurrence analysis.

**❌ Do NOT:** Confuse with `meal_associations` (admin-curated) or `meal_ai_pairings` (admin AI layer) — these are n8n's own.

---

### `unit_conversions`

**Purpose:** All 315 unit conversion factors (kg → g, litre → ml, etc.). n8n uses this for quantity math. Rarely changes.

**❌ Do NOT:** Modify rows — any change breaks n8n quantity calculations across all workflows.

---

### `nancy_conversations`

**Purpose:** Turn-by-turn chat log written by n8n for every Nancy AI session.

**❌ Do NOT:** Use as the admin conversation view — admin reads `ai_conversations` which is the admin-curated mirror.

---

### `nancy_cart_sessions`

**Purpose:** Cart snapshots saved by n8n when a customer confirms an AI order. The backend `POST /api/cart/notify` endpoint must read this and convert it to an `orders` record. ⚠️ This endpoint is not yet built.

**❌ Do NOT:** Let this table accumulate unconverted carts — implement the notify endpoint.

---

### `chef_bems_memory`

**Purpose:** LangChain memory store per AI session. UPSERTed by n8n on every session. Enables Nancy to remember within a conversation.

**❌ Do NOT:** Read or modify this table from the admin backend — it is internal to n8n's LangChain agent.

---

## QUICK REFERENCE — WHO READS WHAT

| Frontend | Primary Tables It Reads |
|---|---|
| **Admin React** | users, products, categories, orders, order_items, invoices, inventory, stock_*, customers, drivers, deliveries, staff, payroll, bank_accounts, income, expenses, notifications, ai_conversations, stores, system_settings |
| **Customer App / Web** | customers, products (via catalogue-synced endpoint), customer_carts, customer_addresses, customer_wallets, orders, customer_loyalty, loyalty_tiers, customer_notifications, delivery_zones |
| **Driver App** | drivers, driver_auth, driver_availability, driver_locations, driver_notifications, delivery_assignments, deliveries, orders (delivery view) |
| **n8n (Chef Bems AI)** | catalogue, inventory, dietary_rules, allergy_rules, promotions_bundles, delivery_zones, customer_preferences, product_associations, meals, meal_ingredients, substitutions, unit_conversions |

---

## QUICK REFERENCE — TABLES BACKEND WRITES AUTOMATICALLY

These tables are written by the backend as side-effects — **never created or modified directly by any frontend**:

| Table | Triggered By |
|---|---|
| `order_status_history` | Every `PATCH /orders/:id/status` |
| `order_tracking_events` | Order status advances + driver updates |
| `loyalty_transactions` | Order delivered → earn points |
| `customer_loyalty` | After each loyalty_transactions insert |
| `wallet_transactions` | Topup, payment, refund |
| `driver_commissions` | Delivery completed |
| `transactions` | Income/expense/transfer recorded |
| `stock_alerts` | Stock falls ≤ `low_stock_threshold` |
| `customer_activity_log` | Significant customer actions |
| `notification_logs` | Every notification sent |
| `notifications` | Low stock, new order, escalation |
| `customer_notifications` | Order updates, loyalty events |
| `driver_notifications` | Assignment offer, payout |
| `catalogue` | Product create/update sync |
| `inventory` | Stock change sync |

---

*End of Table Usage Reference*
