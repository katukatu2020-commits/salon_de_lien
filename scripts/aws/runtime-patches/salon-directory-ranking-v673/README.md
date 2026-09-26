# Customer Salon Directory Ranking v673

Immutable child of approved v672:
`sha256:9c0525d1e30f79b655e7f03a95cd20a6cc6087ef2a5d4315ab60d48e574c2163`.

## Behavior

- `/u/stores` and `/api/lien-customer-stores` return public, active salons in descending order of the signed-in customer's past `Visit` count. Equal counts use salon name and organization ID for a stable order. The currently selected salon does not override ranking.
- Counts use canonical customer ownership, account/store links, historical unlinked ownership, and completed registration invites for the account email, matching the established v668 identity model. Ownership records are deduplicated before counting. No name/phone matching, future visits, deleted customers, or other account visits are counted.
- Never-visited salons remain available with zero visits. The v670 publication/staff-availability boundary and unlimited store selection remain unchanged. No registration/unregistration controls are reintroduced.
- A labeled native select contains all 47 prefectures and an all-prefectures option. Unknown prefectures are included only if present. Filtering preserves the global visit order, operates locally without network requests or replacing inputs/cards, and updates the URL without document navigation.
- Existing store-switch handlers and session cookies remain unchanged. Private directory/API responses remain `no-store`.

## Verification

`integration.mjs` uses a random, isolated PostgreSQL schema and deletes only that schema. It tests real customer directory routes, account isolation, multiple ownership records, used/unused invites, historical unlinking, past/future visits, hidden/inactive salons, stable ranking after a store switch, more than five salons, publication protection, CSRF and the unchanged switch API.

`KEEP_TEST_SERVER=1` keeps a fixture server on port 3173 until SIGTERM. Browser tests use the actual runtime customer shell, shared CSS, transition loader, customer scripts and new directory assets at desktop (1440px) and mobile (390/320px) widths. They check prefecture/all/empty results, counts, deep links, preserved card identity, no filter requests/navigation, scrolling, images, overflow and store switching.

The workflow additionally runs v672 salon-group, v671 dealer-sales/team and v656 order-document regressions before protected ECS deployment. Production smoke checks readiness, inherited feature markers, unauthenticated directory protection and new static assets. No customer/order data migrations are included.
