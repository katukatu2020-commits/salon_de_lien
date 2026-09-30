# Dealer Order Flow Audit

Baseline: protected v697 release (169a236), ECS revision 708.

## Existing Implementation

| Area | Authoritative implementation | Decision |
| --- | --- | --- |
| Salon/customer identity | Organization, AppUser, existing signed admin sessions | Reuse; restrict order-only organizations at the server boundary |
| Dealer identity/roles | WholesaleDealer, DealerSalesMember, dealer-sales-team-v671 | Keep ADMIN/STAFF; add explicit procurement permission, default false |
| Products/prices | WholesaleDealerProduct, WholesaleContractProductPrice | Reuse manufacturer and contract prices; separate supplier relationship |
| Salon contracts | WholesaleDealerContract | ACTIVE means dealer relationship, not an ORIMIA subscription |
| Sales orders | WholesaleOrder, WholesaleOrderLine, WholesaleOrderEvent | Preserve status values and existing order history |
| Cutoff/amendments | order-amendments-v687, WholesaleOrderCutoffPolicy/Amendment | Reuse JST deadline snapshots and all edit/cancel guards |
| Order consolidation/freight | order-consolidation-v692 | Reuse daily batches, shipping policy and idempotent salon submissions |
| Supplier purchases | DealerErpPurchase/Line | Reuse; add order-line sources and explicit external submission timestamp |
| Inventory | DealerErpStock/StockEvent/Allocation | Reuse ledger, version checks, reservations and nonnegative balances |
| Fulfillment | DealerErpShipment/Line/Return | Reuse partial receipt/shipment/delivery and returns |
| Billing | DealerErpCharge/Invoice/Payment/Settlement | Reuse delivered facts, invoice snapshots and manual payments |
| CSV/Excel | order CSV, report CSV, FLAM v694 | Preserve; generic supplier CSV only, no invented vendor specification |
| UI | wholesale ordering, ERP v678, workspace v688 | Extend existing screens/classes; no replacement design system |

## Gaps

Supplier purchases have no link to salon order lines. Product manufacturer is
not a supplier assignment. Downloading an order CSV does not constitute a
supplier purchase. Salon document links currently require dealer authentication.
Salon API responses expose list prices/discount rates without a visibility policy.
Product mutations are dealer-scoped but not all are ADMIN-only.
Order-only salons are not distinguished from full ORIMIA salons.

Prisma's checked-in schema predates the runtime wholesale/ERP modules. Those
modules create their existing tables using idempotent SQL. This change must
retain that startup ordering and add a checked-in, additive Prisma migration
and models for new structures. Do not generate destructive schema reconciliation
against production and do not run migrate reset/db push.

## State Contract

- Cart: existing browser cart, not a submitted WholesaleOrder.
- ORDERED: salon confirmed, dealer not yet accepted.
- ACCEPTED: dealer accepted; procurement shown independently.
- Procurement NOT_ORDERED / PARTIAL / ORDERED: derived from submitted purchase
  sources, not from CSV download or receipt status.
- SHIPPED / DELIVERED / CANCELLED retain their existing meanings.
- Draft supplier purchases reserve source quantities but are not sent orders.
- Generate only after a configured cutoff; require explicit acceptance.
- CSV generation never sends orders externally. The operator confirms submission.

## Validation Plan

Random-schema migration replay and failure rollback; status transitions; cutoff
boundaries and edits; supplier/manufacturer grouping; duplicate batch prevention;
supplier switch snapshots; tenant/role isolation; hidden discount API/document
checks; order-only access allowlist. Browser E2E from salon order through invoice,
including desktop/mobile. Run repository typecheck/lint/test/build and record
baseline failures separately. Phase 2/3 follow the verified Phase 1 workflow.
