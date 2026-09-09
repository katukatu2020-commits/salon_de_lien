# Customer Store Memberships v595

Parent: protected task 594, customer-login-visual-v593-491651f1b37e.

## Diagnosis

The active `customer-merge-v385.js` only transferred CustomerStoreLink when it
also transferred an AppUser canonical customer. An account registered at another
salon has only a link at this salon, so merging its local customer deleted the
membership. Reproduced with real PostgreSQL and the unchanged parent merge
function: two registered stores became one.

The store list also silently excluded existing links pointing to store-hidden
customers. A lookup could therefore say already registered while the list omitted
the same store. Stale merge pointers were not resolved by the list.

The affected customer/store has been requested but not yet supplied. A read-only
production audit task completed, but the deployment role cannot read CloudWatch
log events. No production audit findings are claimed and permissions were not
expanded. Its workflow is now manual-only and fails on unreadable results.

## Changes

- Transfer linked-only membership to the retained customer during a merge.
- Reject conflicting linked-only account ownership instead of deleting the link.
- Keep an audit record of membership ownership in new merge results.
- Repair a persisted stale link only via a bounded, same-store merge chain to a
  live customer with no conflicting link or canonical account owner.
- Keep registered but unavailable stores visible with a status, without a switch
  button. Withdrawn/deleted customers remain excluded; store-hidden invitations
  cannot recreate memberships. Store-hidden customer flags are never cleared.
- Keep the v591 session resolver and switch validation unchanged.

No names/phone matching, no blanket data migration, no login/receipt changes.
Fully deleted historical links without ownership evidence are not reconstructed.
Those require identifying and verifying the affected account and salon.

## Verification

- `integration.mjs`: isolated PostgreSQL schema, actual merge function and store
  handlers; merge preservation, idempotent stale repair, ownership conflicts,
  hidden/deleted states, cycles/depth/cross-store rejection, switching and cookie
  safety, and canonical account preservation. Schema removed after tests.
- `browser-local.mjs`: disposable local account; hidden-store status, repaired
  membership, desktop/mobile switching and Next session continuity. Existing
  parent hydration errors in unrelated Next appointment/profile views were
  separately reproduced; the changed store/home pages have strict error checks.
- `browser-regression.mjs`: existing demo account, two independent sessions,
  switch/back/reload on desktop and mobile; no bookings or payments are created.
- Image verifier reverses scoped changes and hashes all other runtime files.

Local preview: http://localhost:3595/u/stores
