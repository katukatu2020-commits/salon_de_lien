# Customer Store Session Consistency v591

Parent: daily-sales-print-v590, digest
`sha256:7c0a48a2d52a76ba412c1b31fbb45101e856d37e5d9fa84848d77316cbca1f45`.

## Diagnosis

The Node customer shell followed CustomerMergeHistory, but the 14 compiled
Next customer-session modules authorized the original customer ID. The active
store-switch handler also signed a selected CustomerStoreLink without checking
that the destination could still be used. A stale link to a merged customer
could therefore pass Next login authentication but fail the Node home check:

`/u/home 302 -> /u/login 307 -> /u/home 302 -> ...`

This was reproduced against v590 with disposable local fixtures. Normal demo
store switching passed on v590, so this is state-dependent; the affected user's
production records have not been inspected or changed.

## Changes

- Share one database authorization policy between Node and all 14 Next modules.
- Resolve merges within the signed organization, with a bounded, cycle-safe
  chain; require a live final customer and current membership there.
- Validate switch destinations before issuing a cookie. An invalid target
  returns 409 without replacing the working session.
- Exclude hidden/deleted/cross-organization customers from the available store
  list and prevent old invitations from restoring hidden memberships.
- Do not mutate the account's canonical customer/store during switching.
- Mark customer responses and redirects private/no-store.

No data migration or production customer-data rewrite. Receipt and daily sales
printing are unchanged; the image verifier hashes all unrelated runtime files.

## Verification

- `integration.mjs`: disposable PostgreSQL schema, actual Node/Next resolver
  factories, valid switches, two independent sessions, valid/stale merges,
  invalid destinations, hidden invitations, cross-store access, subject and
  account validation, cycles, and bounded chains. Runs in protected CI.
- `http-regression.mjs`: local application with disposable customer fixtures;
  verifies the former loop terminates at login, authorized old merge cookies
  work across Next pages, and expired/tampered cookies cannot authenticate.
  Requires `ALLOW_LOCAL_SESSION_FIXTURES=true` and the local seeded database.
- `browser-regression.mjs`: desktop/mobile actual store-switch buttons, switch
  back, appointment/history/profile navigation, reload, and an independent
  browser session. Only demo session cookies change; no business data is edited.
- `verify-runtime.mjs`: fail-closed expected-module count, syntax checks, and
  unchanged hashes for unrelated assets including receipt/report files.

Deploy only through `deploy-customer-store-redirect-v591.yml`; the workflow pins
the parent, tests the built child, uses the protected release approval and
rollback path, runs production browser smoke, and records the release lock.
