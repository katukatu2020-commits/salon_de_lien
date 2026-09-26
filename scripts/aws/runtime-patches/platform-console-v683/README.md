# Operator Console Consolidation v683

Immutable child of the approved v682 runtime. No schema migration or production data mutation is performed by deployment.

## Information Architecture

- `/platform`: existing six KPI values, monthly sales history, plan/contract distribution, business access totals. No duplicate business tables.
- `/platform/businesses`: single combined salon/dealer registry. Type tabs, normalized Japanese search, access-state filter, 30 rows per page. Removes the old silent 200-account cap.
- `/platform/businesses/{salon|dealer}/{id}`: registration/owner/contact/login/issuance details, initial-password-change and mail status; salon customer/staff/booking counts, revenue, plan, onboarding and trial details; current usage fee; existing payment records; existing salon impersonation; confirmed suspend/resume actions.
- Existing application approval/rejection/reissue, customer registry/account disabling, monthly billing records and audits remain on their original routes.

The overview distinguishes billing-active salons from login-enabled accounts. No authentication or fee calculation is replaced. Existing account-control transactions, audit logging, same-origin protection and operator-session validation are retained. Status changes redirect only to allowlisted console paths.

The console shell provides one navigation area with active states and an existing ORIMIA image. Desktop uses a comparison table, mobile uses vertically labelled business records. Search is an explicit native GET form; it does not rerender or navigate during IME composition.

## Verification

- `verify-runtime.mjs`: syntax, all legacy detail data, HTML escaping, duplication, normalized search, pagination past 200, safe redirects.
- Existing v679 PostgreSQL payment suite plus `integration-cases.mjs`: authorization, GET/HEAD/method handling, CSRF, single rows, filters, >200 entities, both account-type suspend/resume paths, retained audit/payment flows.
- `browser-regression.mjs`: real browser navigation, Japanese input focus/composition, payment drill-down, confirm/suspend/resume, responsive screenshots and no page overflow at 320/390/768/1440/1920 px.
- Existing ERP, sales/team, branch approvals, style and hydration regression suites run in the protected workflow.
- `production-smoke.mjs`: read-only release markers, unauthenticated route protection, shared styling and logo availability.

Local synthetic fixture: port 3191. Full isolated application: http://127.0.0.1:3188. Do not use production accounts for browser mutation tests.
