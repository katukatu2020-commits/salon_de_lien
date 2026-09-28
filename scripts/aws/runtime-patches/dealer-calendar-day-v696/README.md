# Dealer Calendar Day v696

Parent: protected v695 release, digest recorded in the workflow. No schema change.

- Calendar date buttons open a native, keyboard-accessible day dialog.
- Scheduled activities use actual JST intervals, including overnight visits. Orders use the existing cutoff business date, with the original JST order date as the legacy fallback.
- Schedules show time, rep, branch, salon, kind, status, notes and results. Orders show salon, assigned rep snapshot, branch, receipt time, number, status and gross forecast.
- Admins see their dealer. Staff see their assigned orders and their own / branch-shared / dealer-shared activities under the existing ERP visibility policy. The monthly forecast uses the same order scope.
- Cancelled orders are excluded. Cancelled activities remain labelled in history and are excluded from the activity summary.
- Both lists are independently paginated at 30 rows. Repeatable-read snapshots keep counts and rows consistent.
- Daily requests time out, offer retry, and ignore stale responses. Closing preserves calendar scroll, focus and target drafts. Mobile uses a full-screen dialog.
- The immutable calendar-only client leaves the v695 product/pricing client unchanged.

Verification: runtime compatibility, isolated PostgreSQL integration including JST/leap-day/cutoff/tenant/privacy boundaries, browser checks at 1440/390/320, keyboard, pagination, errors, races, XSS, and read-only production smoke. Deployment uses the protected OIDC workflow only.
