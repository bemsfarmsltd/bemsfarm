# Bems Farms Implementation Plan

Date: 2026-09-04

This plan addresses the customer storefront, admin dashboard, API, database, payments, inventory, and operational workflows in dependency order.

## Phase 0: Restore the Development Baseline

1. Install dependencies from the committed lockfiles in the root project, `client/`, `Bems-Farms-Admin-Front-end/`, and `server/`; do not run dependency upgrades as part of this phase.
2. Keep production configuration in Render/Vercel environment variables. Never replace deployed URLs or production secrets with local defaults.
3. Point both frontends to the local API at `http://localhost:5000/api` only when `VITE_API_URL` is unset.
4. Maintain `.env.example` files with placeholders only; use ignored `.env.local`/`.env` files for local values.
5. Confirm CORS works for customer and admin Vite ports.
6. Run server syntax and smoke tests, both frontend builds, and admin lint.

**Done when:** all projects install, build, and boot locally.

## Phase 1: Authentication and RBAC

1. Create one canonical role definition for backend authorization, admin route guards, sidebar visibility, and storefront staff routes.
2. Resolve the `user` versus `customer` inconsistency and document the final account model.
3. Reconcile `admin` and `storekeeper` with the frontend role constants.
4. Add authorization tests for products, inventory, orders, finance, POS, customers, staff, settings, and reports.
5. Move refresh tokens to HttpOnly, Secure cookies and keep short-lived access tokens in memory where practical.
6. Exclude login and refresh requests from automatic 401 refresh handling.
7. Test suspended users, inactive users, expired tokens, revoked tokens, and cross-role access.

**Done when:** every protected route and frontend module has a tested permission contract.

## Phase 2: Checkout and Payment Recovery

1. **Complete:** Add a server-side checkout intent containing product IDs, quantities, authoritative prices, stock validation, coupon calculations, delivery fees, and the final payable amount.
2. **Complete:** Refresh prices, stock, and coupon status immediately before opening Monnify.
3. **Complete:** Create a pending checkout record before payment so a browser crash cannot lose the order payload.
4. **Complete:** Associate Monnify transaction references with the pending checkout and persist the intent/reference pair in the browser for recovery tooling.
5. **Complete:** Make payment finalization idempotent using the transaction reference; the client ignores duplicate callbacks and the server serializes concurrent callbacks.
6. **Partial:** Webhook-before-order is handled by the existing orphan-payment backfill, and authenticated customers can now retry a pending intent after browser interruption; failed/reversed payment recovery and automatic webhook-to-intent reconciliation still need coverage.
7. **Partial:** Admin payment reconciliation already supports search and manual linking; an admin retry action and complete audit workflow remain.
8. **Complete:** The customer cart is cleared only after order creation succeeds.
9. **In progress:** Add integration tests for success, failure, duplicate callbacks, stale price, out-of-stock items, browser interruption, early webhooks, and refunds.

**Done when:** every valid payment either produces an order or has a recoverable admin state.

## Phase 3: Inventory and Warehouse Integrity

1. Define the source of truth for product-level, warehouse-level, and batch-level stock.
2. Add or complete warehouse stock records.
3. Rewrite transfers to validate warehouses, lock source rows, reject insufficient stock, update both warehouses, and commit atomically.
4. Prevent negative stock with database constraints and transactional checks.
5. Store signed adjustment deltas, before/after quantities, reasons, actors, and warehouse IDs.
6. Complete batch and lot tracking for batch number, expiry, manufacture date, supplier, quantity, recalls, and expiry alerts.
7. Add stock ledger views for receipts, sales, adjustments, transfers, wastage, and returns.
8. Test concurrent sales, transfers, adjustments, and returns.

**Done when:** inventory remains consistent under concurrent operations.

## Phase 4: Core Admin Workflow Repairs

### Customers

1. Route and complete `AddCustomer`.
2. Correct its delivery-zone API path.
3. Verify that new customers use the canonical account model.
4. Fix customer reports to use the canonical customer role/table.
5. Validate customer status updates and duplicate phone/email handling.

### POS

1. Restrict ordinary cashiers to their own sessions.
2. Require manager-level authorization for cross-session closure.
3. Scope sessions by store and terminal.
4. Prevent duplicate open sessions per terminal.
5. Reconcile opening cash, payment-method totals, closing cash, and variance.
6. Test concurrent session operations.

### Orders and Returns

1. Validate legal order status transitions.
2. Record status history for every transition.
3. Ensure stock restoration happens exactly once.
4. Make refunds idempotent and link them to Monnify status.
5. Replace `updated_at` return-window logic with explicit `delivered_at`.
6. Prevent duplicate return submissions.

### Deliveries

1. Validate driver assignment and reassignment.
2. Remove misleading fallback map coordinates.
3. Add delivery status history.
4. Complete failed-delivery and rescheduling workflows.
5. Validate delivery zones and fee calculations consistently.

**Done when:** high-volume operational workflows are transactional and auditable.

## Phase 5: Staff and Administrative Features

Replace the current placeholder pages with working workflows:

1. Attendance: clock in/out, corrections, approvals, and history.
2. Schedules: shifts, assignments, edits, and conflict detection.
3. Holidays and leave: submission, approval/rejection, and calendar visibility.
4. Payroll: pay periods, salary, bonuses, deductions, approval, and export.
5. Roles and permissions: actual backend permissions, privileged changes, and audit events.
6. Add audit logging for staff, permission, refund, inventory, finance, and settings changes.

**Done when:** no advertised admin module opens a placeholder page.

## Phase 6: Customer Experience and Accessibility

1. Make the actual storefront available at `/` instead of showing only the coming-soon page.
2. Persist onboarding preferences through the API.
3. Namespace favorites by user ID or persist them server-side.
4. Add consistent loading, empty, error, retry, offline, and submission states.
5. Replace clickable `div` elements with semantic buttons and links.
6. Associate labels and inputs with `htmlFor`, IDs, and `aria-describedby`.
7. Improve focus states, keyboard navigation, modal behavior, chatbot labels, and selection announcements.
8. Disable duplicate checkout submissions and preserve payment references after failures.
9. Show clear return eligibility, status, and item-level outcomes.

**Done when:** customers can complete and recover from every major storefront action using keyboard, mouse, or assistive technology.

## Phase 7: Catalogue and Chef Bems AI

1. Complete product variants with variant pricing, stock, SKU, and checkout selection.
2. Verify image upload limits, primary image promotion, alt text, and failed-upload recovery.
3. Ensure product and stock changes synchronize reliably to the AI catalogue.
4. Repair or replace the unavailable Chef Bems n8n webhook.
5. Add AI input limits, request limits, product-availability checks, and customer-data protections.
6. Persist AI preferences and conversations according to the final data model.

**Done when:** AI recommendations reflect the real catalogue and customer context.

## Phase 8: Database and Deployment Hygiene

1. Remove or clearly deprecate the stale `server/src/schema.sql`.
2. Make migrations the only production schema-change mechanism.
3. Add migration tracking and deployment checks.
4. Create a separate local database with a low-privilege development role and seed data.
5. Ensure local tests never use production credentials or production data.
6. Validate required environment variables during startup.
7. Add health checks and API version checks.

**Done when:** local development and deployment no longer depend on live production data or undocumented schema state.

## Phase 9: Automated Regression Coverage

Add tests in this order:

1. Backend boot and route registration.
2. Authentication and RBAC.
3. Checkout and payment reconciliation.
4. Order state transitions.
5. Inventory transfers and concurrent stock changes.
6. POS ownership and reconciliation.
7. Refunds and returns.
8. Admin/customer API contract parity.
9. Customer frontend critical flows.
10. Admin frontend critical workflows.
11. Accessibility smoke tests.
12. End-to-end tests against a seeded non-production database.

## Recommended Delivery Sequence

1. Development and dependency baseline
2. Authentication and RBAC
3. Checkout and payment recovery
4. Inventory integrity
5. POS and order operations
6. Customer/admin contract repairs
7. Staff workflows
8. Customer UX and accessibility
9. Catalogue and AI reliability
10. Database and deployment hygiene
11. Full regression suite

The sequence protects money and data first, completes core operational workflows next, and then addresses usability, breadth, and long-term maintainability.
