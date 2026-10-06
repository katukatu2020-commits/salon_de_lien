# Dealer Product Master v709

## Existing System Audit

The accumulated v708 runtime owns dealer catalog/auth screens in `wholesale-ordering-v543.js`, the v688 workspace and v695 cascading catalog filters. `WholesaleDealerProduct` already isolates rows by dealer ID and uniquely constrains `(dealerId, productCode)`. v698 restricts product/price writes to dealer ADMIN. Dealer registrations are issued through the managed business-application flow; owners authenticate through the existing login endpoint. ERP suppliers, contracts/prices, stock and orders are separate tables.

The user-designated Makino catalog has the existing stable code `DLR-60EA86D040`, also recorded by the v630 price-list import and the supplied dealer-connection screenshot. Source selection is server-controlled, never a request parameter. `ORIMIA_PRODUCT_MASTER_DEALER_CODE` permits a future operator-configured source change. No new database table, column, Prisma migration or dependency is needed.

## Behavior

- Product management exposes **Master Catalog** to dealer admins. Owners with no active products land there after login; staff password-change and existing-account destinations are retained.
- The master reads active products from the designated dealer. Search by product/manufacturer/code/JAN, cascading manufacturer/category filters, unregistered filter and 25/50/100-row pages support a roughly 4,000-product catalog.
- Selection survives paging and filtering. Review up to 500 selected products per registration, remove unwanted selections and confirm each dealer's own tax-exclusive selling price. A published list price is the initial suggestion; missing prices require an explicit amount. Source wholesale/contract prices are never exposed or copied.
- Registration snapshots product name, manufacturer/category/codes/JAN/list price/unit/description into the existing dealer product table. No source inventory, supplier relation, customer contract or price is inherited. Existing contract-pricing assignment remains required before a salon can order.
- The batch is transactional, validates all source IDs, locks source rows and serializes imports per target dealer. Existing active products are skipped, retaining edited data/prices. Explicit re-registration of inactive items restores active status and the confirmed price while preserving the dealer's other custom fields. Source updates never silently overwrite dealer copies.
- All page/API access requires a current dealer ADMIN session; writes require the existing same-origin check. Session-derived target dealer and fixed source prevent forged tenant/source IDs. JSON projection excludes confidential source fields; responses are private/no-store.

## Verification and Release

`unit.test.cjs` covers role gates, input limits, atomic validation and onboarding. `browser-regression.mjs` seeds only the guarded isolated v680 database, exercises a 4,000-product catalog and real login/import/duplicate states, desktop/mobile, required prices, cross-origin/customer/staff denial, concurrent PostgreSQL registration, reactivation and dealer independence. Its finally block removes only prefixed QA fixtures.

Run source typecheck/lint/test/build and accumulated runtime verification. The protected GitHub OIDC workflow pins the reviewed v708 parent, builds/tests the incremental image, runs a read-only production source audit before switching the service, smoke-checks the release and records the approved lock. Do not deploy a plain source build or use local AWS mutations. Production audit performs no catalog imports or edits.
