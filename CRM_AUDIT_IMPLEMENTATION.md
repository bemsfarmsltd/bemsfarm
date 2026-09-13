# Customer intelligence, support and system audit

## Production facts

Hostinger serves the combined storefront and admin application, linked to
`bemsfarmsltd/bemsfarm` on `main`, root `./`, Vite, Node 22. This was verified
in hPanel for deployment cc7744a5. Vercel integrations also run on pushes but
are not evidence of production deployment. The Express API is separately
hosted; verify its deployment independently before enabling new frontend features.

## Implemented

- Customer profile: most ordered products (historical order-line spend), most
  viewed products, saved wishlist and demand events. Stock uses `products.stock`,
  matching checkout. Cancelled/refunded orders are excluded from ordered ranking.
- Out-of-stock demand: product availability checked on the server, identity
  taken from authentication, per-user repeat-click suppression, throttled admin
  notifications and 30-day procurement ranking. Guest clicks are not unique people.
- Support: customer widget and admin inbox/profile chat; four-second polling
  while open, unread acknowledgements, transactional message/conversation writes.
  Latest 200 messages shown. This is polling, not a WebSocket delivery guarantee.
- Announcements: one/all-customer targeting, preview then publish, safe storefront
  links, persistent acknowledgements, archive instead of destructive removal.
- Account removal: password re-verification, customer-only targeting, atomic
  account anonymization/access revocation, preserved orders and financial history.
  This removes the account; it is not an erasure of every historical personal record.
- Customer activity: concise customer actions, excludes staff/system events.
  Reading the page no longer silently manufactures historical audit entries.
- System audit: admin/superadmin only, filters, pagination, event details and
  explicit capture coverage. No public audit read or client-supplied actor identity.

## Coverage and limitations

API middleware records requests reaching Express, status, duration, actor when
known and server-derived IP. It does not store request bodies, headers, query
values, passwords or tokens. Route templates may lack an owning router prefix.
Individual database writes use triggers on existing public business tables;
changed field names plus operational before/after values are retained. Personal
values and credentials are excluded. Database actor attribution is the database
role unless the transaction sets app.actor_id; customer removal also sets a
request ID. Do not infer that every database event is attributed to a person.

Audit rows reject UPDATE, DELETE and TRUNCATE. A database owner/superuser can
still disable triggers or change schema. This is not cryptographic immutability.
Use a restricted runtime database role and independent log export/retention for
stronger protection. API event persistence is asynchronous; a crash or database
outage can lose events. Failures are surfaced in server logs and the audit UI.
Transactional database events cover successful committed changes, not rolled-back
attempts. API failures provide complementary attempted-action records.

DDL changes, filesystem edits, local unpushed changes, shell commands, hosting
control-panel operations and events before installation are NOT automatically
observed. New tables require rerunning the trigger migration. Developer events
are signed reports of pushes to main; they do not prove deployment success.
Hostinger/other deployment jobs must independently report their actual outcome.

## Installation and verification

1. Review and back up the target database. Run `npm run migrate:crm-audit` inside
   server with the intended DATABASE_URL. It applies CRM schema and audit triggers
   transactionally. Do not run exploratory scripts against production.
2. Deploy API, confirm protected `/api/audit`, `/api/support/messages` and
   `/api/admin/customers/:id/goods-intelligence` behavior, then deploy Hostinger.
3. Set AUDIT_INGEST_SECRET and AUDIT_REPOSITORY=bemsfarmsltd/bemsfarm on the API.
   Configure the matching GitHub Actions secret and AUDIT_EVENT_URL repository
   variable pointing to `https://<api-host>/api/audit/events`. Workflow skips until
   configured. Five-minute signature freshness and unique event IDs prevent replay.
4. A deployment job can use scripts/report-audit-event.js with
   AUDIT_EVENT_SOURCE=deployment, AUDIT_EVENT_ACTION=deploy,
   AUDIT_EVENT_OUTCOME=success|failure and a unique AUDIT_EVENT_ID. Use actual
   post-deployment status. Never run it as a fabricated success signal.
5. Verify with designated test accounts: customer isolation, staff permissions,
   replies/read state, one/all announcements and login dismissal persistence.
   No real messages, broadcasts or customer deletions were sent during development.

## Related request

Cost-price/selling-price/profit analytics was requested earlier. This CRM/audit
continuation does not change financial calculations or historical cost accounting.
That request remains separate pending work; do not label catalogue margin as
historical realized profit when order-time costs are unavailable.
