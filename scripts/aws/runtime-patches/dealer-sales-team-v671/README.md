# Dealer Sales and Team v671

Immutable child of the approved ORIMIA directory v670 image. Existing company
accounts remain the representative administrator; no passwords are migrated or
changed by deployment.

## Pages

- `/dealer/sales`: category and billed-salon sales, month, salon, closing-day,
  salesperson, and branch filters.
- `/dealer/targets`: per-person sales/acquisition goals and progress. Admins see
  the team and set goals; staff see their own progress.
- `/dealer/team`: admin-only member accounts, branches, salon assignments, and
  billing closing days. Member login IDs are immutable. Admins can edit roles,
  deactivate/reactivate staff, and reset initial passwords.
- `/dealer/password-change`: individual staff password change in the common
  dealer shell; representative admins retain their existing password flow.

## Accounting Rules

- All new reports/targets use tax-exclusive amounts after contract discounts.
- Actual revenue is DELIVERED orders, dated by deliveredAt in Asia/Tokyo.
- Forecast is all non-cancelled orders, including delivered orders, dated by
  orderedAt in Asia/Tokyo. Actual and forecast are separate measures and must not
  be added together. Existing tax-inclusive calendar behavior is unchanged.
- Closing-day filters select the snapshotted billing closing day (31 = month
  end). Reports are calendar months, not rolling invoice closing periods.
- Category amounts use persisted order-line totals, never current list prices.
- Order insert triggers snapshot salesperson, branch and closing day. Assignment
  changes do not rewrite previously attributed orders. The first assignment also
  attributes previously unassigned historical orders for that salon.
- New acquisition counts use first contract approval date and the initially
  assigned salesperson/branch. Reactivating the same contract is not a new win.
  Contracts newly added/approved in the dealer app default to the logged-in member.
- Existing contracts are initially unassigned and can be attributed on the team
  page. Unassigned revenue remains in company totals and is flagged there.
- Branch membership on employee profiles applies to new default assignments;
  existing salon assignment and historical sales snapshots remain unchanged.

## Security and Compatibility

- Authentication checks both the dealer and member's active/authVersion fields.
  Deactivation/password reset invalidates previous member sessions. The existing
  operator account suspension gate still runs before all dealer functionality.
- Staff must change initial/reset passwords before other business actions.
- Company-level password changes, staff management, assignments, goals and
  company settings cannot be changed through a STAFF session.
- New staff login IDs share a database-enforced namespace with company login IDs.
- Every new write requires same-origin validation and dealer-scoped authorization;
  management actions are audited without storing plaintext passwords.
- APIs and HTML containing member information use private no-store responses.
- Read APIs for progress restrict STAFF to their own attribution even if another
  member ID is supplied. Existing product/order/pricing operations remain shared.
- Schema additions are non-destructive and applied transactionally. Image rollback
  retains additions; no customer, order or product record is removed.

## Verification

`integration.mjs` creates a disposable PostgreSQL schema and exercises real HTTP
auth, role/tenant isolation, CSRF, initial password change, token revocation,
category sums, filters, targets, acquisition credit and JST month boundaries.
`KEEP_TEST_SERVER=1` keeps the fixture HTTP server on port 3171 for the Playwright
`browser-regression.mjs` suite. SIGTERM cleans up the test schema.

`production-smoke.mjs` performs read-only health, asset and unauthenticated route
checks. Deployment uses the existing protected release approval/rollback scripts.
