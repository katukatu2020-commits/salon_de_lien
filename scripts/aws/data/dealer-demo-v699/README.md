# Dealer Demo Dataset v699

## Status

Prepared and tested in the isolated local QA database only. Production seeding
has NOT been performed. The production read-only audit task started successfully,
but the GitHub deployment role cannot retrieve CloudWatch logs. The local AWS
login has expired. Do not change IAM policy or bypass the missing access.

Before any production write, obtain a valid authorized connection, confirm the
actual salon ID/name (the user said "ハレノヤ"), and confirm the dealer destination.
The local `org_showcase_yohaku` fixture is NOT proof of the production salon name.

`run.mjs` runs ONLY `audit.cjs`. The GitHub workflow is manual-only and does not
deploy or seed data. `seed.cjs` is intentionally not connected to the workflow.

## Dataset

- Dedicated account: `ORIMIA デモディーラー`, login `orimia.demo.dealer`.
- Twelve fictional products, four fictional manufacturers, two suppliers.
- Two branches, administrator, sales and warehouse staff records.
- Secondary staff logins disabled until an administrator activates/resets them.
- One warehouse, two shelves, minimum stock and a low-stock example.
- One link to an explicitly verified existing salon, no customer/CRM edits.
- Contract prices at 20% discount; salon-facing discount rate is hidden.
- 11:00 daily cutoff; shipping 600 yen below 10,000 yen (before tax).
- Seven staged orders: previous-month paid, current-month paid, partly paid,
  shipped, supplier-ordered, accepted/unprocured, new/editable.
- Supplier CSV snapshots, receipts, allocations, shipments and delivery charges.
- Three invoices and manual example payments; one outstanding balance.
- Sales/acquisition goals, a demo visit schedule, monthly manufacturer reports.
- Company name, products, order numbers and notes explicitly identify demos.
- No external manufacturer transmission, email, bank operation or real shipment.
- Demo platform usage fee is zero. Its ledger still contributes to aggregate
  reports, so a dedicated dealer and explicit confirmation are mandatory.

## Safety

The script verifies the exact existing salon ID, name and public code. It only
creates a fixed dedicated dealer and refuses to overwrite another account. All
work is in one database transaction, reusing the existing v698 business services.
An existing `DealerErpCommand` record stores a completion manifest. A second run
returns that manifest without adding data or resetting passwords. A default dry
run executes the full flow and rolls back. No schema or application changes.

Run only inside the authorized v698 runtime with these environment variables:

- `DEMO_PLAN_JSON`: object with `salonId`, `expectedSalonName`, and
  `confirmDedicatedDemo: true` after the user confirms the target.
- `DEMO_PASSWORD`: new strong password (at least 16 characters); never commit it,
  print it in CI logs, or reuse an existing account password.
- `DEMO_APPLY=YES`: commit; omitted means rollback.

## Local Verification

`verify-local.cjs` is fail-closed to `ORIMIA_ISOLATED_QA=v680` and the local QA
database name. It checks identity mismatch rejection, full dry-run rollback,
idempotency, unchanged pre-existing orders, seven order statuses, three invoice
balances, zero platform usage fee, and hidden discount rates.

Browser checks: login, dashboard, procurement, fulfillment, salon detail, invoice.
September fixture: current sales 51,840 yen before tax; previous sales 25,920 yen;
outstanding invoice balance 13,904 yen. Invoice shows selling prices, not rates.

Screenshots are local under `artifacts/demo-v699-*.png`, not committed.

## Demo Walkthrough

1. Open the dealer dashboard to show sales, stock alerts and outstanding balance.
2. Open the linked salon to see all seven orders and its three invoices.
3. Order `DEMO-07-*` is the new order. Review/edit before its displayed cutoff.
4. Order `DEMO-06-*` demonstrates accepted orders awaiting supplier procurement.
5. Order `DEMO-05-*` has supplier CSVs and waits for receipt.
6. Order `DEMO-04-*` waits for delivery confirmation.
7. Order `DEMO-03-*` has an invoice with a partial-payment balance.
8. Orders `DEMO-01-*` and `DEMO-02-*` show completed delivery and payment.

Do not click real-send actions or reuse demo invoices outside demonstrations.
