# Salon de Lien WBS analysis — 2026-07-23

Source: `Salon_de_Lien_WBS_2026-07-23.xlsx`

## Executive conclusion

The workbook defines 124 tasks across 11 workstreams (616.5 estimated SE hours). All rows are marked `未着手`, so workbook status is a plan baseline rather than an accurate implementation ledger. The repository already contains substantial CRM, coupon, product review, point, referral, reporting, and customer portal functionality. The largest gap is not feature breadth; it is production safety and operational consistency.

The next move is therefore the WBS `Phase 1: 止血` sequence:

1. Freeze a reproducible baseline and take a DB snapshot (`PG-01`, `G0`).
2. Require authentication for management pages and management APIs (`SEC-03`, first slice of `SEC-06`).
3. Replace customer-ID URLs with revocable, hashed portal tokens (`SEC-08`, `SEC-09`).
4. Reconcile checkout, points, referrals, coupon use, and cancellation under idempotent transactions (`DATA-04` through `DATA-07`).

Adding more customer or manufacturer features before these items would increase the amount of sensitive and monetary data exposed to the same structural risks.

## Workbook structure

| Sheet | Role | Key finding |
| --- | --- | --- |
| `00_方針` | Management summary | P0 protects public exposure, money, PII, and recovery. |
| `01_優先順位` | Scored backlog | Top score 54 is shared by auth, authorization, idempotency, point reconciliation, and automated tests. |
| `02_WBS` | Detailed execution plan | 124 tasks; all marked `未着手`; status must be reconciled with code. |
| `03_ロードマップ` | Gate schedule | G0 baseline, G1 safety, G2 money/data, G3 workflow, then pilots and external beta. |
| `04_RACI` | Decision ownership | Owner is accountable for data use; SE is accountable for technical security. |
| `05_ゲート_KPI` | Release gates and KPIs | External access is prohibited until G1; real-data migration is prohibited until G2. |
| `06_リスク` | Risk register | Highest risk is management/customer URL leakage (25), followed by money inconsistency and untrusted reviews (20). |

## Workstream size

| Workstream | Tasks | P0 | Estimated SE hours |
| --- | ---: | ---: | ---: |
| QA・リリース | 13 | 11 | 87.0 |
| データ整合性 | 15 | 12 | 82.0 |
| 認証・権限 | 15 | 12 | 74.5 |
| パイロット・定着 | 10 | 7 | 73.5 |
| 美容室現場 | 14 | 2 | 64.0 |
| インフラ・運用 | 12 | 9 | 46.5 |
| 顧客ポータル | 11 | 5 | 44.0 |
| KPI・レポート | 10 | 4 | 43.5 |
| メーカー連携 | 10 | 4 | 43.0 |
| 他業種連携 | 7 | 0 | 30.0 |
| プログラム統制 | 7 | 5 | 28.5 |

## Repository gap analysis

| Capability | Current repository | WBS interpretation |
| --- | --- | --- |
| CRM/customer detail | Implemented and feature-rich | Preserve; simplify into the G3 three-minute workflow later. |
| Coupons/print | Implemented, with two coupon models | `DATA-10` and `DATA-14` remain open; new writes must eventually converge. |
| Product proposals/reviews | Implemented | Original-review immutability and provenance remain open (`DATA-11`). |
| Points/referrals | Ledger and lots implemented | Recalculation, cancellation compensation, idempotency, and integration tests remain open. |
| Owner/manufacturer reports | Implemented | External manufacturer authorization and stricter anonymization remain open. |
| Customer portal | Implemented with compatibility ID routes | Critical `SEC-08/09` gap: the portal URL is not yet a revocable random token. |
| Management authentication | Not implemented before this change | Critical `SEC-03/06` gap. |
| Environment/backups | Local/Tailscale scripts and daily dumps exist | Restore drill, environment separation, monitoring, and evidence remain open. |
| Automated tests/CI | Typecheck/lint/build scripts exist | No complete money/security/E2E gate; `QA-01` through `QA-12` remain mostly open. |

## Implemented in this increment

- Took a PostgreSQL snapshot before code changes: `backups/db/salon_de_lien-20260723-204134.dump`.
- Added signed, expiring, HttpOnly management sessions.
- Added a dedicated management login and logout flow.
- Protected management pages, management APIs, and management Server Action entry paths in middleware.
- Added login attempt throttling, origin checks, and baseline security headers.
- Added a repeatable initial-admin credential setup script.

This is intentionally a **partial G1 increment**, not a claim that G1 is complete.

## Next three increments

### 1. Customer portal token cutover (`SEC-08`, `SEC-09`, `QA-05`)

Add a hashed portal-token model with expiry, revocation, reissue, and audit. Generate customer-facing links only from the server. Convert `/u/[token]` to resolve the token and stop serving `/app/[customerId]`, `/feedback/[customerId]`, and other ID-based compatibility routes externally.

### 2. Money and point integrity (`DATA-01` through `DATA-07`, `QA-02/03/06`)

Define lifecycle enums, add idempotency keys, create a single checkout transaction boundary, support reversal transactions, and provide point-ledger reconciliation with a zero-difference report.

### 3. Production gates (`OPS-03` through `OPS-08`, `QA-12`)

Separate dev/demo/staging/prod data, test restore into a different database, add structured audit/error logs, and make migration validation, tests, typecheck, lint, and build mandatory in CI.

## Gate status after this increment

| Gate | Status | Reason |
| --- | --- | --- |
| G0 | Partial | DB snapshot and repository baseline captured; owner RACI/KPI approval still required. |
| G1 | Partial | Management authentication added; portal tokenization, object-level authorization, restore drill, and security tests remain. |
| G2+ | Not ready | Monetary lifecycle, idempotency, cancellation compensation, and migration reconciliation remain. |

