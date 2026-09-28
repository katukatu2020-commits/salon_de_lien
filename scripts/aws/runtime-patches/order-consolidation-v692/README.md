# Order Consolidation v692

Additive runtime patch on protected v691. Does not merge or rewrite pre-release orders.

## Rules

- New orders merge per salon, dealer and closing window. Japan time; exactly at cutoff starts the next window. No configured cutoff uses midnight/calendar days.
- Existing open orders retain their cutoff, tax and freight-policy snapshots. A cancelled order is never reopened.
- Discounted merchandise subtotal, excluding tax, at or above the threshold qualifies for free shipping. Below it, the configured ex-tax fee is charged once. Default fee is zero. Existing application tax calculation is used on merchandise plus freight.
- Quote and confirmation expose existing/new merchandise amounts, freight, tax, business date and cutoff. Stale quotes require reconfirmation. Submission keys prevent retry duplication; dealer locks serialize stock, edits and additional orders.
- Dispatch is allowed after closing. Partial deliveries create one freight charge per order. Delivery-note links for those shipments resolve to the same consolidated order note with list prices only. Freight appears separately on invoices. Goods-only returns do not refund freight.
- Cancelling/editing an order recalculates freight and totals. Same-product price changes during an open window require dealer review instead of silently repricing previous quantities.
- Calendar order forecasts use the business date while original receipt timestamps remain preserved.

## Verification

- `verify-runtime.mjs`: syntax, immutable assets, retained route/security checks and exact JST boundary cases.
- `integration.mjs`: random PostgreSQL schema, existing ERP flow plus merge, retry/concurrency, quote conflicts, policies, partial delivery/freight, invoices/returns, permissions and cancellation.
- `legacy-regression.mjs`: existing amendment regression in independent fixture windows, including lock-wait expiry. Does not modify runtime rules to satisfy old tests.
- `browser-regression.mjs`: localhost-only isolated fixture, desktop/mobile settings, confirmation, stale reconfirmation, lost-response retries, detail totals and screenshots at 1440/1024/390/320px.
- `production-smoke.mjs`: read-only readiness, immutable assets and authentication check; no production orders or settings are created.

Deployment is only through the protected GitHub OIDC workflow. No local AWS deployment. Database changes are additive and old images ignore new columns; emergency rollback should pause new order intake to avoid older code splitting consolidated orders or ignoring freight.
