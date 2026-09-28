# FLAM Sales Export v694

ORIMIA dealer monthly sales (`/dealer/sales`) gains an Excel export using the supplied
FLAM sales upload template: one Sheet1, 105 columns in the original order, including
every unused column. This is an export, not an import into ORIMIA or an automatic
upload to FLAM. No existing sales, invoices or order records are changed by export.

## Scope and Prerequisites

- Uses the applied month, salon, closing day, sales representative and branch filters.
- Uses delivered sales and return charges, including freight. Legacy delivered orders
  are included only when they are not already handled by the ERP charge ledger.
- Part deliveries are separate recognition events. Documents group by original order,
  Japanese sales date, normal/return status and invoice. Groups over 5,000 lines split.
- Server enforces dealer/staff scope. Source totals must match the monthly sales
  report under one repeatable-read snapshot; otherwise the export is refused.
- Dealers' administrators must assign the customer's **existing FLAM customer code**.
  ORIMIA public store codes are not FLAM master codes. Leading zeroes are retained.
- Product codes are excluded by default. Enable them only when matching FLAM product
  masters exist. Unsupported codes block export instead of being truncated.
- More than 20,000 lines requires narrower filters. Two exports per process may run
  concurrently. ExcelJS streams rows to reduce peak memory.
- A preview token prevents downloading a snapshot after source data or mapping changed.
- Saving codes is same-origin, administrator-only and restricted to the dealer's
  contracts. Existing code mappings may be deliberately cleared.

## Field Mapping

| Template field | Value |
| --- | --- |
| 伝票まとめ番号 | Eight-digit grouping sequence within this file |
| 売上日 | Sales recognition date in Asia/Tokyo |
| 取引区分コード | 212 sale, 312 return |
| 得意先コード | Administrator's FLAM mapping |
| 備考 / 件名 | Original ORIMIA order number |
| 社内メモ | Original order, recognition date, representative and branch names |
| 明細区分 | 0 normal, 3 return |
| 商品コード | Opt-in; original code only |
| 商品名 / 仕様・規格 | Name up to 100 characters; overflow up to 255 characters |
| 単価 / 数量 / 小計 | Snapshot unit price, signed quantity and net amount |
| 回収予定日 | Existing non-void invoice due date, if issued |
| 税率名 / 税法 | 8% or 10% external tax; exempt for the system's zero rate |
| 納品日 | Positive delivery recognition date only |
| 未使用 and unmapped optional fields | Blank |

FLAM's customer defaults control billing, tax calculation and rounding. ORIMIA IDs are
not substituted for FLAM order IDs, staff IDs, departments, warehouses or billing
masters. Normal lines do not misuse the tax-adjustment-only 明細消費税 field.
The export reconciles **net sales**; FLAM tax totals depend on its configured rules.

## Import into FLAM

Choose the sales voucher upload, select the exported XLSX and enable **先頭行をスキップする**.
Confirm customer masters and tax/billing settings beforehand. Uploading the same
file again may create duplicates: export is not an upload receipt or deduplication
record. Start with a small filtered period and check the FLAM result.

Reference: [FLAM sales voucher upload](https://support.flamsv.com/hc/ja/articles/360035081353)
(checked 2026-09-29). Actual import into an authenticated FLAM account is not tested.

## Verification and Release

- `verify-runtime.mjs`: immutable assets and preserved runtime patches.
- `integration.mjs`: isolated random-schema ERP fixture, XLSX round-trip, tenant and
  staff isolation, CSRF, leading zeros, unused columns, returns, legacy orders,
  stale tokens, period boundaries and line splitting.
- `browser-regression.mjs`: isolated fixture on port 3199, actual downloads,
  1440/390/320 layouts, filters, codes, error recovery and keyboard focus.
- `legacy-contact.mjs`: retains v693 tests with the new immutable team asset URL.
- `production-smoke.mjs`: read-only health/assets and anonymous access rejection.
- Deploy only via the protected GitHub OIDC workflow, retaining regression suites
  for the previous order, freight, contacts, chat and review releases.

Schema changes are additive and idempotent. Rollback to v693 can leave the unused
DealerFlamCustomer table without changing existing operational data.
