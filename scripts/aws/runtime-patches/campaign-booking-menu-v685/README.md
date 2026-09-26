# Campaign Booking Menu v685

Parent: appointment-datetime-v684, using the protected canonical release workflow.

The campaign CTA already carried `?campaign=...`, but booking did not consume it.
This release scopes the existing reservation flow to the selected campaign.

- Resolve the active campaign in the authenticated customer's current salon.
- Match the explicit target menu exactly after NFKC/whitespace normalization;
  a cut campaign does not match a cut-and-color combination.
- Restrict the menu list/search and validate each step. A single target is
  selected automatically and starts on the staff step. Going back keeps the filter.
- An empty target means all active, bookable menus. Missing/inactive target,
  deleted, future, expired, or foreign-salon campaigns cannot be booked.
- Send campaignId through the existing booking/coupon/points fetch chain.
- Revalidate the campaign and active menu under row locks inside the existing
  serializable booking transaction. Existing availability/auth/origin checks stay.
- Bundle the small campaign controller with the versioned journey asset, so soft
  navigation also has the constraint. Preserve the existing hydration gate.
- Ordinary bookings and coupon/point calculations are unchanged; this patch does
  not add new discount calculation or change existing campaign prices.

No schema migration or production campaign/customer data edits are performed.

## Verification

- `verify-runtime.mjs`: syntax, transaction guard and shared behavior preservation.
- `integration.mjs`: PostgreSQL disposable schema; targets, normalization, tenant
  isolation, unavailable campaigns, changed menus, authenticated context API.
- `browser-fixture.cjs` + `browser-regression.mjs`: real built journey asset;
  single/all targets, back/search, loading/error/retry, payload and normal booking,
  320px/390px/1360px viewports, plus client-route campaign transitions.
- Isolated full app: campaign list CTA, auto-selection, steps 1-4, successful
  reservation and direct target-mismatch rejection. Fixture records removed.
- `production-smoke.mjs`: read-only health/assets/unauthenticated endpoint checks.
