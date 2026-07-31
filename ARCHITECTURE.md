# Bems Farms — Architecture Map

Last verified: 2026-07-31, against `server/src/index.js` directly (the mount list below is
not a guess — it was read from the file that actually wires up Express). If a route file is
added, removed, or remounted, update this doc in the same commit.

## The three apps

| App | Path | Talks to | Notes |
|---|---|---|---|
| Customer storefront | `client/` (Vite + React) | `server` at `/api/*` | Public-facing shop. |
| Admin dashboard | `Bems-Farms-Admin-Front-end/` (Vite + React) | `server` at `/api/admin/*` (+ some shared `/api/*`) | Separate repo/deploy from `client`. `.env` points at the **production** API by default (`VITE_API_URL=https://api.bemsfarms.com/api`) — use `.env.local` to point it at a local server instead. |
| API | `server/` (Express, entry `server/src/index.js`) | Postgres (Supabase) | CommonJS, no build step. `npm start` / `npm run dev` (nodemon) from `server/`. `npm test` runs a syntax check + boot smoke test — no DB/secrets needed, see Cleanup Log. |

**Local dev has no separate database.** `server/.env`'s `DATABASE_URL` points at the live
Supabase instance. Running the server locally reads/writes real production data — there is
no local/staging DB to fall back on.

## Server route map

Order matters: Express matches top-down, so more specific prefixes (e.g. `/api/admin/products`)
must be mounted *before* less specific ones (`/api/admin`) or the specific router never gets a
chance to handle the request.

| Mounted path | File | Auth | Notes |
|---|---|---|---|
| `/api/auth` | `routes/auth.js` | mixed (public register/login, `protect` on `/me`, `/logout`) | Inline implementation, no controller. Owns JWT issuance (`JWT_SECRET`/`REFRESH_SECRET`, both fail-closed if unset). |
| `/api/orders` | `routes/orders.js` | `protect` (+ `requireRole` on `/status`) | Inline implementation, no controller. Customer-facing order creation/lookup/cancel. |
| `/api/issues` | `routes/issues.js` | `protect` (+ `requireRole` on `/admin`, `/:id/status`, `/:id/note`) | Customer issue reporting + admin resolution (refund/replacement/no-action), activity timeline, SMS notifications, Paystack refund trigger. Rebuilt 2026-07-30; see Cleanup Log. |
| `/api/products` | `routes/products.js` | public reads | Uses `controllers/productsController.js`. |
| `/api/categories` | `routes/categories.js` | public reads | Uses `controllers/categoriesController.js`. |
| `/api/ai` | `routes/ai.js` | optional auth (guest-friendly) | Customer-facing AI: chat, recipe helper, recommendations, visual scan, co-purchase. Gemini-backed with fallbacks. |
| `/api/dashboard` | `routes/dashboard.js` | `protect` + `requireRole` | Admin dashboard tabs (overview/sales/finance/inventory/operations/customers/ai). |
| `/api/admin/products` | `routes/products_admin.js` | `protect` + `requireRole` | Full product CRUD incl. SKU generation, image handling, n8n catalogue sync. Soft-delete only (archives, doesn't drop rows). |
| `/api/admin/orders` | `routes/orders_admin.js` | `protect` + `requireRole` | Admin order management, invoices, returns, driver assignment, dispute resolution. |
| `/api/admin/customers` | `routes/customers_admin.js` | `protect` + `requireRole` | |
| `/api/admin/deliveries` | `routes/deliveries_admin.js` | `protect` + `requireRole` | Driver notifications, live location tracking. |
| `/api/admin/inventory` | `routes/inventory_admin.js` | `protect` + `requireRole` | Low-stock alerts, lost-item reports. |
| `/api/admin/config` | `routes/config_admin.js` | `protect`, GET open to all staff, writes gated | Categories/subcategories/units/warranties + CSV export. |
| `/api/admin/staff` | `routes/staff_admin.js` | `protect` + `requireRole` | Employee records, attendance. |
| `/api/admin/accounts` | `routes/accounts_admin.js` | `protect` + `requireRole` | Bank accounts, income/expenses. |
| `/api/admin/suppliers` | `routes/suppliers_admin.js` | `protect` + `requireRole` | |
| `/api/admin/purchases` | `routes/purchases_admin.js` | `protect` + `requireRole` | Purchase orders. |
| `/api/admin/reports` | `routes/reports_admin.js` | `protect` + `requireRole` | Reads across orders/products/finance tables; no new tables. |
| `/api/admin/stores` | `routes/stores_admin.js` | `protect` + `requireRole` | Physical store locations. |
| `/api/admin/settings` | `routes/settings_admin.js` | `protect` + `requireRole` | Backs all 9 admin settings pages (general, notifications, payment, coupons, POS, tax, currencies, invoices, user management). |
| `/api/admin/coupons` | `routes/coupons_admin.js` | `protect` + `requireRole` | |
| `/api/admin/pos` | `routes/pos_admin.js` | `protect` + `requireRole` | POS session open/close, sales, held orders. |
| `/api/admin/chef-bems` | `routes/chef_bems_admin.js` | `protect` + `requireRole` | Admin-side config for the Chef Bems chatbot (dietary rules, etc). |
| `/api/admin/payments` | `routes/payments_admin.js` | `protect` + `requireRole` | |
| `/api/admin` (fallback) | `routes/admin.js` | `protect` + `adminOnly` | **Only** handles `/stats`, `/subscribers`, `/returns` (GET+PATCH) — nothing else. Trimmed 2026-07-30; see Cleanup Log. |
| `/api/ai/context` | `routes/ai_context.js` | `protect` (+ `requireRole` on admin-only sub-routes) | User-facing AI memory/preferences. |
| `/api/cart` | `routes/cart.js` | public | Includes the AI Chef "Add to Cart" webhook. |
| `/api` (misc) | `routes/misc.js` | mixed | Newsletter subscriptions, referrals. Catch-most for anything not otherwise namespaced. |
| `/api/advanced-ai` | `routes/advanced-ai.js` | `/semantic-search` public; the other 4 routes `protect` + `requireRole` | Semantic search, dynamic pricing, fraud check, demand forecast, inventory alerts. |
| `/api/zoho` | `routes/zoho.js` | webhook: signature-verified, no JWT; `/sync`, `/reconcile`, `/status`: `protect` + `requireRole` | Physical-store IMS integration. |

## Auth & roles model

- **`protect`** (`middleware/authMiddleware.js`) — verifies the JWT, loads the user, attaches `req.user`. Required by everything except public storefront reads and the Zoho webhook (which uses HMAC signature verification instead of a JWT).
- **`requireRole(...roles)`** — explicit allow-list, e.g. `requireRole("superadmin", "manager")`. This is the current standard; use it for anything new.
- **`adminOnly`** — legacy fixed alias for `superadmin`/`admin`/`manager`. Only used by `routes/admin.js` now. Don't add new usages; use `requireRole` instead so the allowed set is visible at the call site.
- **`superadminOnly`** — fixed alias for `superadmin` only.
- **Roles in use** (as of this audit): `user` (default customer role), `superadmin`, `admin`, `manager`, `delivery_manager`, `storekeeper`, `accountant`, `cashier`, `kitchen_staff`. There's no central enum — this list was compiled by grepping every `requireRole(...)` call. If you add a new role, it only exists in the `requireRole()` calls that reference it; there's no schema-level constraint.
- **`users.token_version`** (INT, default 0) — embedded in every access token as `tokenVersion`. `protect` rejects a token if its `tokenVersion` doesn't match the live DB value. `routes/auth.js`'s `/reset-password` increments it (and clears `refresh_token`), so a stolen access *and* refresh token pair both die the moment a user resets their password, instead of surviving up to the JWT's natural 7-day/30-day expiry. Tokens issued before this existed carry no claim, treated as version 0 — doesn't break already-logged-in sessions on rollout.

## Cleanup log (2026-07-30 audit)

So this doesn't get rediscovered from scratch:

- Deleted `controllers/authController.js` and `controllers/ordersController.js` — both orphaned, never `require()`'d anywhere. The live implementations are the inline route files (`routes/auth.js`, `routes/orders.js`).
- Trimmed `routes/admin.js` from a mix of controller calls + duplicate inline routes down to just the 3 paths not covered by a dedicated `_admin.js` router (`/stats`, `/subscribers`, `/returns`). Removed a stray-but-live `PUT /products/:id` that used stale update logic (no catalogue sync, no image handling) inconsistent with the real product editor at `PATCH /api/admin/products/:id`.
- Trimmed `controllers/adminController.js` to just `getStats`/`getSubscribers` (its other five exports were only ever called from the code just removed).
- Removed `POST /reset-admin` (shared-secret password reset backdoor) and `GET /test-google-fetch` (debug/diagnostic route leaking DNS info) from `routes/auth.js`.
- Locked down previously-unauthenticated internal endpoints: `zoho.js`'s `/sync`, `/reconcile`, `/status`, and `advanced-ai.js`'s `/dynamic-pricing`, `/fraud-check`, `/demand-forecast`, `/inventory-alerts` now require `protect` + `requireRole`.
- Fixed `routes/orders.js`'s `PATCH /:id/status`: it hardcoded `req.user.role !== "admin"`, which silently blocked `superadmin`/`manager`/`delivery_manager` — valid admin-tier roles everywhere else. Now uses `requireRole("superadmin", "admin", "manager", "delivery_manager")`, matching the equivalent route in `orders_admin.js`.
- Fixed `errorHandler` registration order in `index.js` — it was registered before the `/api`, `/health`, `/test` routes, so it never caught errors thrown inside them.
- Fixed two pre-existing syntax errors (missing closing `);` on a route handler) in `routes/deliveries_admin.js` and `routes/inventory_admin.js` — both already committed to `HEAD` before this audit, meaning the server could not boot locally until these were fixed.
- Confirmed `check_admins.js` and `fix-password.js` (credential-bearing utility scripts) were already deleted in an earlier commit (`39ccc88`).
- Fixed `routes/dashboard.js`: it only required `protect`, no role check, so any authenticated customer could hit `/api/dashboard/*` and see revenue/finance/customer data. Now requires `protect` + `requireRole("superadmin", "admin", "manager")`.
- Rebuilt `routes/issues.js` and mounted it at `/api/issues` (previously written but never wired into `index.js`). The original version was incompatible with this codebase: it imported a nonexistent `../middleware/auth` (would have crashed the server on boot, same failure class as the two syntax bugs above), used `orders.total_amount`/`orders.payment_reference` (real columns: `total`/`payment_ref`), read `PAYSTACK_SECRET_KEY` (real env var: `PAYSTACK_SECRET`), and had the same hardcoded `role !== "admin"` bug fixed elsewhere in this audit. Rewrote it against `pool` (this codebase's actual DB access pattern) instead of the parallel, otherwise-unused `config/supabaseClient.js` client, which falls back to a hardcoded anon key when `SUPABASE_SERVICE_KEY` is unset (it is). Verified end-to-end against the live DB: registered a throwaway user, created an issue, confirmed customer/admin access control (401/403 as expected), added an admin note, ran a full status-update cycle including the SMS notification path (fires in Termii test-mode logging since `TERMII_API_KEY` isn't set — same fail-safe pattern as `GEMINI_API_KEY=MOCK` elsewhere), then deleted all test rows. Discovered along the way: the `issues`/`issue_activities` tables already existed in the live DB (provisioned outside this file, before it was ever mounted) with a schema matching what the code expects, plus an `issues.updated_at` column kept fresh by an existing DB trigger.
- `config/supabaseClient.js` and `services/smsService.js` were, before this fix, only referenced by the broken `issues.js`. `smsService.js` is now genuinely used (issues.js calls `SMS.refundProcessed`/`replacementScheduled`/`issueResolved`) and is safe as-is — it fails closed into console-logged test mode when `TERMII_API_KEY` is unset.
- Deleted `server/test_reset.js` (hardcoded a real account email + a weak plaintext password, silently resetting it if ever run — confirmed the account isn't currently using that password), `server/test_login.js` (dumped every user's id/email/role/password hash to console), and `config/supabaseClient.js` (orphaned after the `issues.js` rewrite above, carried a hardcoded Supabase anon-key fallback).
- Centralized the Naira price-conversion factor: `parseFloat(price) / 1500` / `Math.round(price * 1500)` was duplicated as a hardcoded literal across 5 server files (`controllers/adminController.js`, `routes/advanced-ai.js`, `routes/ai.js`, `routes/cart.js`, `routes/zoho.js` — 10 call sites total). Added `utils/currency.js` exporting `NAIRA_PER_UNIT = 1500` as the single source of truth; every call site now references it (including one inside a raw SQL template literal via `${NAIRA_PER_UNIT}` interpolation). Behavior-preserving only — each call site's own rounding/fallback logic was left untouched, just the literal `1500` was swapped for the import. Verified end-to-end (JS and SQL-interpolation paths both produce identical output to before).
- Added a server test suite where there was none: `npm test` in `server/` runs `scripts/syntax-check.js` (recursively `node --check`s every file under `src/` — pure Node, no shell globbing, so it works the same via `npm` on Windows/macOS/Linux/CI) followed by `scripts/smoke-test.js` (boots the real server with placeholder env vars — safe because `pg.Pool` never connects at module load, only on first query — and checks `/health`, `/api`, `/test` return 200 and two representative protected routes return 401 without auth). Verified it actually catches breakage: introduced a deliberately malformed route file, confirmed `npm test` failed and named the file, then removed it and confirmed green again. This is exactly what would have caught the two syntax-error bugs above the moment they were committed.
- Added `.github/workflows/ci.yml`: on push/PR to `main`, runs the new server test suite, plus `npm run build` for both `client/` and `Bems-Farms-Admin-Front-end/` (each as its own job, `ubuntu-latest`, Node LTS). No secrets required — the server job's smoke test is fully self-contained with placeholder env vars. Verified both frontend builds succeed locally before adding the workflow.
- Added JWT access-token revocation on password reset (see Auth & roles model above for the mechanism). Along the way, found and fixed a second, previously-undiscovered bug this was blocked on: `users.reset_token` was `VARCHAR(100)`, too short to hold a signed JWT (~180+ chars) — meaning **the forgot-password flow has likely never worked**; every real attempt would have hit `value too long for type character varying(100)`. Widened it to `TEXT`, matching `refresh_token`'s (correct) sizing. Verified the full flow end-to-end live: register → old token works → forgot-password → reset-password → old access token now 401s with `TOKEN_REVOKED` → old refresh-token cookie now rejected → fresh login with the new password works normally. Test user deleted afterward.

## Known gaps (found, not yet fixed)

- **Chef Bems' n8n webhook (`https://bems003.app.n8n.cloud/webhook/chef-bems`) returns 404 on every call.** Confirmed via direct request — n8n's own error is explicit: `"The requested webhook \"POST chef-bems\" is not registered... The workflow must be active for a production URL to run successfully."` This is entirely external to this repo: someone with access to that n8n instance needs to open the workflow and toggle it to Active. Until then, every Chef Bems chat request silently falls through to the local Gemini fallback (see Cleanup Log entry above for the related cart-add bug already fixed in that fallback path).
- **The same hardcoded `1500` price-conversion factor exists client-side too**, spread across at least 9 files in `client/src` (`components/layout/Navbar.jsx`, `components/ui/ProductCard.jsx`, `context/CartContext.jsx`, `pages/AdminPage.jsx`, `pages/CartPage.jsx`, `pages/HomePage.jsx`, `pages/ProductDetail.jsx`, `pages/ProductsPage.jsx`, `pages/SemanticSearchPage.jsx`). Only the 5 server-side files were in scope for the fix above; the client-side duplication is unresolved.
- **`schema.sql` is a stale early snapshot, not a source of truth.** It defines 7 tables (`users`, `products`, `orders`, `order_items`, `categories`, `returns`, `email_subscriptions`). The live production database has **136 tables**, and this codebase's route handlers actively query roughly 80 of them (deliveries, staff, POS, purchasing, loyalty, wallets, AI/Nancy tables, etc.) — none of which are defined anywhere in this repo. The real schema has evidently been built directly against the live Supabase database over time (dashboard/SQL editor), not through anything checked in here. A full read-only `pg_dump --schema-only` of the live DB was taken (2026-07-31) as an accurate baseline — not yet committed anywhere, pending a decision on how it should be used (replace `schema.sql` wholesale vs. something else). This also means: **local dev has no separate database** (`server/.env`'s `DATABASE_URL` is the live Supabase instance — every test in this file's Cleanup Log touched real prod data and was manually cleaned up afterward), and a local PostgreSQL 18 server *is* already installed and running on this machine, but its superuser password is unknown, so it hasn't been used yet as a dev-DB alternative.
