# Dealer Order Flow v698

## Scope

Incremental child of protected v697. Extends the existing wholesale order, ERP
purchase, stock, shipment, charge, invoice and manual-payment implementations.
See `AUDIT.md` for the pre-implementation model/API audit.

### Business Flow

1. Configure the existing dealer cutoff (JST) and product contract prices.
2. In Manufacturer / Supplier Purchases, add suppliers and assign product
   primary suppliers, manufacturer codes and supplier codes.
3. Salon confirms its cart. Quantity changes, additions and deletions remain
   available until the snapshotted cutoff; existing daily consolidation and
   freight rules remain in force.
4. Dealer accepts the order. After cutoff, preview and generate demand grouped
   by supplier AND manufacturer. Missing assignments block generation.
5. Download UTF-8 BOM generic CSV. Send it using the supplier's agreed channel,
   then explicitly confirm submission. Download alone never means sent.
6. Record receipt in the existing warehouse, reserve inventory, ship and confirm
   delivery. Partial operations reuse the existing ledger.
7. Generate the salon's invoice from delivered charges. Salon detail exposes
   orders, deliveries and invoices; salons can open their own documents.

GenericCsvExporter is registered by key in `exporters.cjs`. No manufacturer
format or external transmission API is invented. Supplier identity does not
require an ORIMIA dealer account. Existing FLAM output is unchanged.

### Status Contract

Cart is client-side; it is not a submitted order. Existing database statuses:
`ORDERED` (confirmed), `ACCEPTED` (dealer accepted), `SHIPPED`, `DELIVERED`,
`CANCELLED`. Procurement is independently derived as `NOT_ORDERED`, `PARTIAL`,
or `ORDERED` from submitted purchase-source quantities. Draft purchases prevent
duplicate procurement but do not count as submitted. No enum rewrite.

### Authorization

- ADMIN: product/price master, supplier assignment, limited-salon issuance,
  cutoff/rate visibility, target stock and procurement delegation.
- STAFF: assigned salon/order/financial scope; optional `canProcure` permits
  cross-salon procurement/fulfillment, not finance or master changes.
- ORDER_ONLY salon: normal hashed login, forced initial password change;
  catalog, quote/order, cutoff amendments and own documents only. Server-wide
  deny-by-default gate blocks CRM, tenant switching, other APIs and Server Actions.
- Discount visibility is contract-specific. Hidden rates/list prices are removed
  from salon API data and documents, not merely hidden with CSS. Actual selling
  prices, quantity, tax and totals remain available. Internal data is retained.

### Inventory and Sales

Manufacturer stock view reuses location stock and optimistic versions. Only
ADMIN can change target stock. Monthly product/salon quantities and net sales
use the existing delivered/return charge facts, with legacy delivered-order
compatibility. Monthly CSV includes manufacturer/product/salon/quantity/amount.
The operations dashboard emphasizes selected-month actual sales, prior month
and percentage change. Period analysis supports month/quarter/year and branch/
member filters. STAFF cannot override its server-enforced member scope.

## Database

Canonical additive migration:
`prisma/migrations/202609300001_dealer_order_flow/migration.sql`.
BuildKit copies that exact file using the `migrations` context; no second SQL copy.

New tables: `DealerSupplier`, `DealerProductSupplier`, `DealerErpPurchaseSource`.
New defaulted/nullable fields: organization service mode, first-password-change
flag, procurement permission, rate visibility, manufacturer product code and
purchase supplier/submission/export metadata. Existing records keep FULL access,
their existing visibility and statuses. Cutoffs are backfilled only when missing.
One primary supplier per product is enforced by a partial unique index.

The canonical AWS application creates its legacy wholesale/ERP tables through
ordered runtime migrations. This migration depends on that v697 baseline and
runs after the legacy table initializers in the same existing startup mechanism.
Do not run `db push`, destructive schema diff, reset, or this migration against
an empty database before initializing the legacy runtime schema. Checked-in
Prisma models describe new structures; legacy model consolidation is separate
technical debt, not part of this scoped release.

Commands run in the existing transaction/advisory-lock/idempotency boundary.
CSV snapshots and source rows are committed atomically with purchase creation.

## Verification

```powershell
docker build --build-context migrations=./prisma/migrations/202609300001_dealer_order_flow --build-arg BASE_IMAGE=salon-de-lien:campaign-discount-v697-local -t salon-de-lien:dealer-order-flow-v698-local scripts/aws/runtime-patches/dealer-order-flow-v698
docker run --rm --entrypoint node salon-de-lien:dealer-order-flow-v698-local /tmp/lien-v698/verify-runtime.mjs
node --test scripts/aws/runtime-patches/dealer-order-flow-v698/unit.test.cjs
docker build -f scripts/aws/runtime-patches/dealer-order-flow-v698/Dockerfile.source-check -t salon-de-lien:dealer-flow-source-check-v698 .
```

`integration.mjs` requires TEST_DATABASE_URL and creates a random disposable
schema. Covers existing ERP, v686 ordering, v692 consolidation/freight, cutoff
edits, supplier switching/grouping, idempotency, permissions, warehouse operations,
invoice/rate redaction, limited account issuance/password/access isolation,
stock versions, sales scopes and actual migration replay.

`browser-regression.mjs` uses the retained integration fixture on localhost:3203;
checks desktop/mobile procurement, inventory/reporting, period filters, salon
drilldown and hidden-rate documents. It refuses a non-local fixture URL.

Actual isolated-QA browser walkthrough on 2026-09-30 completed: issued limited
salon, changed initial password, ordered 2 units, edited to 3, accepted, crossed
the cutoff using a QA-only clock fixture, downloaded supplier CSV, confirmed
submission, received/reserved/shipped/delivered 3, issued invoice, and opened
salon delivery note/invoice. Unit price 1,600, quantity 3, tax 480, total 5,280;
no hidden rate/list-price disclosure. Screenshots are under `artifacts/v698`.

Repository typecheck, lint, 54 tests and production Next build passed in a clean
container with regenerated Prisma. Local Windows generation encountered a locked
shared query-engine DLL; no unrelated running processes were terminated.
Lint retains 2 existing img warnings. Dependency audit reports 13 existing
vulnerabilities (including 1 critical); upgrades need separate compatibility work.

Deployment uses `.github/workflows/deploy-dealer-order-flow-v698.yml` only, with
pinned reviewed parent, OIDC, pre-release tests and protected rollback. Never
deploy from the stale parent workspace or manually bypass the release guard.

## Deliberately Deferred

Manufacturer-specific formats/transmission integrations pending vendor specs;
optional linked-dealer notes and demo-Makino expansion; CRM/scheduling/full UI
redesign. Manual payments stay in place. Automated bank integration is not added.
Large reports stop with a filter request rather than silently truncate exports.
