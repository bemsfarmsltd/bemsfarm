# Session Handoff — Bems Farms admin "no mocked data" audit

Repo: `/Volumes/HENOVATE/Bems Farms project/bemsfarm` (git, remote `bemsfarmsltd/bemsfarm`, branch `main`, pushes auto-deploy to production via Hostinger/Vercel + Render backend).

## Standing mandate
User wants every admin page wired to real backend data — zero mock/fabricated data — across the whole `Bems-Farms-Admin-Front-end` app. This has been a large, multi-session sweep, module by module, each committed+pushed separately after lint/build/test verification.

## ✅ STATUS: Chef Bems AI module DONE — pushed as commit `b7ff28f`
This was the last module in this pass. Fully verified (lint clean, build clean, backend syntax+smoke tests clean) and pushed. Also fixed two real backend bugs found along the way (search referencing nonexistent columns on `ai_conversations`; status validation not matching the DB's real CHECK constraint; `product_associations` INSERT/UPDATE referencing entirely wrong column names). See commit message for full detail.

## What's already done and pushed this session (in order)
1. **Checkbox/switch text-wrapping CSS bug** on Add Product page — root-caused and verified (fix was already committed in an earlier turn before this session's compaction; just re-verified live).
2. **Global search (⌘K)** — was fully inert decoration, wired to new `GET /api/admin/search` endpoint. Commit `0ad77ab`.
3. **Customers module** (6 pages: List, Add, Detail, Activity Log, Loyalty, Wallet) — commit `fe1367d`.
4. **URGENT PRODUCTION HOTFIX** — commit `314fb27`. Two bugs from the concurrent session's work took prod fully down (`canAccess is not defined` crashed the whole frontend; `staffStatus is not defined` crashed the whole backend at boot). Both fixed, verified back up (`api.bemsfarms.com/health` → 200).
5. **Inventory module** (Warehouses, Stock Out, Stock Transfer, Batch Management, Lost Items) — commit `1f8871f`. Added new `POST /api/admin/inventory/stock-out` endpoint (didn't exist).
6. **Deliveries module** (Zones, Drivers, Live Map) — commit `a1acafa`. Map now uses real `driver_locations` GPS data (degrades gracefully — no fake markers — since no driver app is reporting locations yet in production).
7. **Multi-Store module** (Store List, Add/Edit Store) — commit `af2c8de`. Wired up real `store_type` DB column that existed but was never exposed by the API.
8. **Settings module, all 8 pages** — commit `e318135`. Every page was raw unmodified theme boilerplate (literally a fake "Lucas Ethan" project-management profile on the Notifications page, credit-card wallet UI on Payment, GSTIN fields on Tax). Manager Settings is now real admin/staff account management (list/create/edit-role/deactivate) — that's what `/settings/manager`'s backend was actually built for.
9. **Chef Bems AI module** — commit `b7ff28f`. DONE.

## What's left
Per the last full audit (`ab6d9b8ca36c216c3` agent report), everything in the original ~45-file mock-data list is now done **except**:
- **Staff module remainder** (Attendance, Holidays, Payroll, Schedule) — intentionally skipped all session because the concurrent session has been actively editing `AddStaff.jsx`/`StaffList.jsx`. Check `git log` for whether that session has since committed a Staff feature; if so, re-audit what's left before touching it.
- **Purchases and Suppliers modules** — explicitly deprioritized. The user confirmed these aren't in their current sidebar nav at all (screenshot showed the real nav: Dashboards, Products, Inventory, Orders, Deliveries, Customers, Staff, Finance, Chef Bems AI, Multi-Store, Settings — no Purchases/Suppliers). Backend routes exist (`purchases_admin.js`, `suppliers_admin.js`) but frontend pages are orphaned/unreachable. Don't build these out without asking the user first — may be genuinely unwanted, not just unfinished.
- **Reports module** — the user removed this from nav themselves (confirmed explicitly: "Notee that i removed the report section... this are the modules we have now"). Do not re-add or wire it up.
- **Apps module** (Calendar/Chat/Email) — flagged earlier as generic unused template boilerplate, likely dead code to delete rather than build out. Never got explicit user direction on this — ask before doing anything.

## Concurrent session — important context
Another Claude Code session has been working in this exact same repo/working directory throughout this session, with no coordination between us (shared filesystem, no worktrees). Evidence: commits `c25b3a4`, `d3efecf`, `a6ea0d9` appeared in `git log` that this session never made (Orders/Invoices/Refunds wiring, then Auth/Staff onboarding with email invites). When either session commits, it captures whatever the *other* session has sitting uncommitted in the working tree at that moment — this already caused two production outages (see hotfix above) when the other session's in-progress broken code got swept into a commit and pushed.

**Practical implications for whoever continues this:**
- Always `git status` before staging, and only ever `git add` the exact files you intend — never `git add -A`/`git add .`.
- If you see unfamiliar modified files (currently: `AddStaff.jsx`, `StaffList.jsx`), leave them alone — they're the other session's in-progress work.
- Before pushing, `git fetch origin main` and check `git log -1 origin/main` to catch new commits from the other session first.
- If something is broken in production and you didn't touch it, check whether the other session's latest commit introduced it (grep for obviously-wrong reference errors, mismatched DB columns, etc. — that's the pattern both prior bugs followed).
- The user was told: if running two sessions deliberately, use separate git worktrees per session to stop this cross-contamination. They have not yet acted on that suggestion as of this handoff.

## Working methodology established this session (keep using it)
1. Before wiring any frontend page, read the real backend route file in full to learn the actual endpoint shapes — do NOT assume the frontend's mock field names match reality.
2. **Verify against the live Supabase DB directly** (via the Supabase MCP tools, project_id `helhpaybcjrxljizblve`) rather than trusting route-file comments or `schema.sql` snapshots — this session found *multiple* real backend bugs this way (columns referenced in queries that don't exist in the actual table, status enums that don't match the DB's CHECK constraint). Always check `information_schema.columns` and `pg_get_constraintdef` for any table before trusting a route's assumed shape.
3. When the real data model is much simpler/different than the fictional mock (e.g. Meal Associations: fictional rich per-meal nutrition/allergen profile vs. real simple product-pair table), **simplify the frontend to match reality** — don't invent new backend schema/columns to support fictional richness, but DO feel free to add new *rows* to an already-generic key-value store (e.g. `settings` table) when it's a reasonable real feature.
4. After every file change: `npx oxlint <path>` (not eslint — this project uses oxlint), then `npm run build` in `Bems-Farms-Admin-Front-end/`, then (if backend touched) `node --check <file>` + `npm test` in `server/`.
5. Stage only the exact files for the current module (never a broad `git add`), commit with a descriptive message explaining *why* (not just what), `git push origin main`.
6. When a whole nav section/page is orphaned (imported nowhere, no route registered), that's itself a bug worth surfacing/fixing (e.g. `/customers/add` and `/customers/wallet` existed as files but had no route or nav link — fixed earlier this session).

## Known low-priority items not yet followed up
- `AddProduct.jsx` has a `BRANDS` constant that's never replaced by a real API fetch (flagged early in the session, never circled back).
- The other 13 files using `form-switch`+`.form-check-label` that might share the same CSS wrapping bug pattern as the Add Product page — identified but never systematically checked (list was: BulkExport.jsx, POSSettings.jsx, InvoiceSettings.jsx, ManagerSettings.jsx, TaxSettings.jsx, and others). Given the settings pages have since been fully rewritten this session, this list is now partially stale — worth a fresh grep (`grep -rl "form-switch" src/pages | xargs grep -l "form-check-label"`) rather than trusting the old list.
