# Salon Group Master v672

Parent: v671 production digest `sha256:d4ee9b4d5e72d0e0bba834d65fe6758022afcbc5cef5631d9e90c9aedebb46b3`.

## Entry Points

- Salon administrator: Store operation settings -> 系列店マスタ.
- Dashboard: `/admin/salon-master`.
- Read APIs: `/api/admin/salon-master/access`, `/data?month=YYYY-MM&store=...`.
- Mutations: `POST /api/admin/salon-master/stores`, `/link`.

## Behavior

- An ungrouped administrator sees their current store without creating records on GET.
- The first successful create/link transaction establishes that administrator as the group owner. Shared STAFF accounts and other store administrators cannot read the group's dashboard. Existing tenant suspension and initial-password-change gates remain in effect.
- Existing stores are linked only after verifying an active ADMIN login ID and password. Public store codes and shared contact information do not grant access. A store already belonging to another group cannot be taken over; operator assistance is required.
- Stores are registered atomically with a generated ADMIN account, billing profile, nonpublic ORIMIA listing, group membership, managed first-login password gate, and auditable business inquiry/issue/action records.
- Branches inherit the root store's active bank-debit plan, with explicit confirmation of the current plan and monthly price. No card checkout is introduced. A separate unused branch email is required by the existing global AppUser email constraint.
- Initial credentials are mailed through the existing Postmark sender and displayed once in the authenticated response. Only the password hash is stored. Mail failure does not undo an already-created branch. Operator credential reissue remains available through the existing account inquiry screen.
- Request keys, transactional membership locking and unique database constraints prevent duplicate registrations. External-origin mutations and repeated credential guesses are rejected.
- Revenue uses finalized ServiceSale.amount, matching the sales ledger's nondeleted-customer scope. UTC Prisma timestamps are bucketed once into JST. Current month, previous month, per-store revenue, checkout count/average, noncancelled reservations, current customer/staff counts, publication and suspension states are available.
- Responsive standalone server-rendered dashboard avoids the legacy admin enhancement/loader stack; settings receive only an idempotent link insertion. Existing desktop pages are unchanged.

## Verification

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:dealer-sales-team-v671-local --tag salon-de-lien:salon-group-master-v672-local scripts/aws/runtime-patches/salon-group-master-v672
docker run --rm --entrypoint node -e TEST_DATABASE_URL=$env:TEST_DATABASE_URL salon-de-lien:salon-group-master-v672-local /tmp/lien-v672/integration.mjs
```

`integration.mjs` creates a random isolated schema and drops only that schema. `TEST_USE_PUBLIC_SCHEMA=1` additionally tests against copies of the existing local table structures, with no copying of customer data. `KEEP_TEST_SERVER=1` keeps the fixture HTTP server on port 3172 for Playwright; SIGTERM cleans up.

`browser-regression.mjs` covers desktop 1440px, mobile 390px/360px, navigation from settings, stable form input, filters, branch linking, initial credential display and new-store registration. Screenshots are saved under `artifacts/salon-group-master-v672/browser`.

The deployment workflow verifies the pinned parent, runs v672 and v671/v656 regressions, checks desktop/mobile flows, publishes an immutable image, uses the protected ECS release workflow, checks production health/assets/auth boundaries, and records the release lock. Additive schema changes are compatible with rolling back to v671.
