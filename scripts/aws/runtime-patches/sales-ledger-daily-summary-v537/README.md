# Sales ledger daily summary v537

This runtime release modernizes `会計データ管理` while preserving its correction and audit workflow.

- Adds a month-first report toolbar with staff and payment filters.
- Adds reconciled daily totals for services, retail products, discounts, tax, fees, points, payment methods, and staff.
- Keeps the existing transaction-level correction table below the report.
- Lets an owner select a day in the report and jump to the matching transaction details.
- Keeps wide accounting data inside a horizontally scrollable table with a sticky date column.
- Uses checkout notes and organization tax settings to backfill historical breakdowns without changing stored sales.

Local verification:

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:navigation-loading-experience-v536-local --tag salon-de-lien:sales-ledger-daily-summary-v537-local scripts/aws/runtime-patches/sales-ledger-daily-summary-v537
node scripts/aws/runtime-patches/sales-ledger-daily-summary-v537/local-integration.mjs
node scripts/aws/runtime-patches/sales-ledger-daily-summary-v537/browser-regression.mjs
```
