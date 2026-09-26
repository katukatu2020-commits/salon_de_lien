# Dealer ERP v678

Reviewed parent: v677, `sha256:c2568139dd89998311c9c8982e962c3af42989d0bc461b2d3755fa4e58cfcb5f`.

## Delivered Workflows

- `/dealer/operations`: monthly category, salon, salesperson, office and top-100 SKU sales, targets, remaining target amounts, receivables, shortages and audit history. Salon/member/office/closing-day filters and CSV reporting. Existing `/dealer/sales` and `/dealer/targets` use the same delivery/return facts.
- `/dealer/inventory`: multiple warehouses, office scope, storage bins, receipts, issues, transfers, per-item stocktaking with optimistic version checks, minimum-stock alerts and immutable movement history. Supplier purchase orders with multiple lines, partial receipts and outstanding cancellation.
- `/dealer/fulfillment`: paginated orders and assigned-staff scope. Amend unshipped quantities/prices, reserve stock, release reservations, ship reserved quantities, confirm partial deliveries, cancel undelivered shipments, cancel remaining quantities and return delivered items with optional restocking. Delivery notes show list prices only. Existing per-order CSV remains available.
- `/dealer/receivables`: salon terms/payment schedules, close unbilled deliveries/returns by a chosen date, immutable invoice snapshots, one aggregate discount row (no line discount rates), credit invoices, partial payments/refunds, allocation across invoices, allocation reversal, invoice/payment voiding and transactional UTF-8 CSV payment import. Duplicate bank references are skipped only when their accounting identity matches; ambiguous rows reject the entire import.
- `/dealer/activities`: staff/office/month-filtered visit, delivery, salon-support and internal schedules, private/office/company visibility, outcomes and optimistic edit versions. All input uses explicit Japan time.
- `/dealer/messages`: salon/order-linked conversations, internal member conversations, retained drafts, paginated history, read positions and unread navigation badges. Salon reply page linked from the existing ordering page's connected dealers.
- Existing staff authentication, office administration, salon assignments, contract pricing and individual goals remain in use.

## Rules And Boundaries

1. Stock is not invented from historical sales. An administrator creates warehouses and records opening physical stock before using reservations.
2. Legacy completed/shipped orders are preserved. Only unshipped orders enter the new stock ledger. Legacy sales remain in sales reports without double counting. Historical unpaid receivables are NOT guessed from historical orders: payment history must be reconciled before opening balances can be migrated. This release's receivables are invoices issued in the new ledger.
3. Shipping all currently reserved quantities creates one shipment. Reserve just the desired partial quantity first. Delivery confirmation creates billable facts, not shipment creation.
4. Returns create negative sales/billing facts on the return date. They do not silently create replacement orders. Damaged returns can be recorded without restocking.
5. Issued invoices are immutable. To correct an invoice, reverse allocations, void it, then reissue its released source charges. A paid return is a credit/refund transaction, not a rewrite of the original invoice.
6. Taxes follow the application's integer-yen policy and are rounded per tax-rate group at invoice issue. Different document periods/rounding bases should not be mixed as if totals were identical.
7. Manual entry and mapped CSV import are supported. No live bank API, bank-format auto-detection, supplier EDI, external accounting submission, SMS/email push notifications or automatic bank debit collection is claimed. Notifications are in-app unread counts. System usage-fee bank debit configuration is unchanged.
8. Admins own warehouse/configuration/financial mutations. Staff can fulfill and communicate for their assigned salons; office stock scope is enforced. Internal conversations are participant/admin scoped. All queries and mutations are dealer scoped; salon messaging requires a live active contract.
9. Database transaction + dealer advisory lock + actor/payload-bound idempotency key protects ledger mutations against overselling, retries and duplicate settlement. Failures roll back adoption, stock, document and payment changes together.
10. Business modules are a first integrated release, not a claim of certified accounting, audited legal compliance, or a complete replacement for every warehouse/banking product. Load acceptance and real opening-balance reconciliation still require the operator's real business data.

## Verification

`integration.mjs` creates and removes only its own random schema. Never reset the shared local database. It tests the 10/6/4 partial-delivery case, return/refund amounts, partial payments, reversals, immutable invoice display, cross-tenant and staff access, CSRF, NFKC search, transaction rollback, concurrent allocation, retry protection, CSV conflicts, old/new sales integration, timezone stability and two-way messages.

`browser-regression.mjs` uses the integration fixture (not production) at desktop 1440px, mobile 390px and 360px. It checks stock entry, IME draft stability, order detail, schedule edits without timezone drift, chat sends/draft retention, mobile overflow and salon-side replies. Screenshots are saved under `artifacts/dealer-erp-v678/browser`.

The inherited v671 sales/team integration, v677 branch-contact integration and v676 style runtime checks are part of the protected release. Production smoke is read-only/unauthenticated.
