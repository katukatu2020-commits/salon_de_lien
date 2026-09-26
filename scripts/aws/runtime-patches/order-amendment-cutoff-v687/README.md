# Order Amendments and Dealer Cutoff v687

Child of the reviewed v686 production image. Adds an authenticated shared order
editor to salon purchase history and dealer order history. Existing fulfillment,
documents, pagination, cart, IME handling, and dealer-only partner linking remain.

## Business Rules

- Dealer ADMIN sets a daily cutoff in Orders. STAFF can view but cannot change it.
- The cutoff uses Asia/Tokyo. Orders strictly before the time close the same day;
  orders exactly at or after it close the next calendar day. No holiday calendar.
- No cutoff is silently enabled for existing dealers. The first explicit setting
  applies to existing orders. Later changes apply only to newly submitted orders.
- A per-order snapshot prevents later configuration changes reopening an order.
- Both editing and cancellation are blocked at `now >= cutoffAt`. This does not
  auto-change fulfillment status: acceptance, shipment and delivery still proceed.
- The shared editor changes products, quantities, requested date and salon memo.
  Existing line prices are preserved; newly added products use current contracts.
- Shipment, delivery, invoicing and already-cancelled orders are not editable in
  the shared editor. Existing ERP partial cancellation also enforces the cutoff.
- Quantity changes release affected inventory reservations. All writes, totals,
  cancelled quantities and before/after audit events share one DB transaction.
- Existing dealer-wide locks and command idempotency serialize amendments against
  stock, shipment and policy writes. Optimistic versions reject stale editors.
- Deadline checks use `clock_timestamp()` after lock acquisition, not transaction
  start time. Legacy status/line-edit/cancellation routes enforce the same rule.

## Verification

`verify-runtime.mjs` checks installed syntax, hooks, original ordering features,
JST boundaries, exact cutoff, month/year/leap-day transitions and midnight.

`integration.mjs` creates and drops an isolated PostgreSQL schema. It runs existing
ERP and v686 tests, then exercises amendment authorization, CSRF, prices, totals,
audit, retries, concurrency, inventory release, cutoff immutability, every cancel
route and a transaction waiting past its deadline. `KEEP_FIXTURE=1` exposes the
same service with synthetic accounts for browser regression, never production.

`browser-regression.mjs` uses built assets and real fixture APIs at desktop and
390/320px widths. Covers both histories, settings role controls, form input/IME,
add/remove/save/cancel, retry draft preservation and readonly closed orders.

Deployment is through the digest-pinned protected GitHub OIDC workflow, including
existing app regressions and automatic ECS rollback. Production smoke is readonly;
it does not set any dealer cutoff or modify any real order.
