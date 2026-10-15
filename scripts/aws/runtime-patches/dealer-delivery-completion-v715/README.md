# Dealer Delivery Completion v715

## Fix

The legacy order-detail dialog disabled shipped line inputs but submitted those
inputs on every status action. The immutable-line guard correctly rejected the
SHIPPED -> DELIVERED request with HTTP 409.

The new versioned order client uses one editability predicate for rendering and
submission. Only ORDERED/ACCEPTED orders before cutoff submit editable lines.
Delivery completion submits the status and existing dealer note, without lines.
ERP-tracked orders still redirect to fulfillment and use the ERP delivery flow.

No database schema, order transition rules, stock/billing transactions or access
controls change. The existing server guard continues to reject line submissions
after shipment. The old client asset remains available for compatibility; a page
reload loads the new versioned client. No production orders are altered by this
release or its smoke check.

## Verification

- `verify-runtime.mjs`: 10 status/cutoff combinations; editable payload preservation;
  immutable payload omission; duplicate-click lock; network-error recovery; ERP
  routing; existing server guards.
- `browser-regression.mjs --expect-bug`: reproduces the original HTTP 409 on v714.
- `browser-regression.mjs`: desktop and mobile completion through the real button,
  status persistence after reload, unchanged lines/stock/product prices/totals,
  delivery/invoice/CSV endpoints, retries, invalid transitions, ERP bypass refusal,
  staff scope, authentication and CSRF. Guarded isolated fixtures are removed in
  `finally`; no existing business records are changed.
- Existing v684/v688/v689/v690/v696/v698/v700-v714 and QA680 runtime checks.
- Source typecheck, lint, test and build through the existing source-check image.
- `production-smoke.mjs`: read-only release/assets/authentication checks.

## Deployment

Immutable child of the pinned v714 image. Use only the protected GitHub OIDC
workflow `deploy-dealer-delivery-completion-v715.yml`; it checks the current
parent digest, runs regressions and rolls back failed production verification.
