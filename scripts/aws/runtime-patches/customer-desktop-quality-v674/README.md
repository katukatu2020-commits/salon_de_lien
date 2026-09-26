# Customer Desktop Quality v674

## Scope

Upgrade the customer portal at widths of 1024px and above. The existing mobile
layout, forms, reservation handlers, chat handlers and customer APIs are retained.
No database migration or production data mutation is part of this release.
Salon and dealer portals, authentication pages and print documents are excluded.

- Compact fixed sidebar and header, consistent current-page navigation, direct
  booking action, readable Japanese sans-serif typography and keyboard focus.
- Home actions, membership details, booking steps, profile, catalog, coupons,
  stamps, salon directory and notifications share desktop spacing and controls.
- Chat uses a bounded workspace with independently scrolling conversations.
- Desktop booking shows the original seven-day availability grid, keeping its
  original slot handlers; mobile retains the existing single-day selector.
- All new CSS is scoped to a desktop-only root attribute and min-width:1024px.
  The attribute and styles are removed when returning to a mobile viewport.

## Runtime

The canonical source is the protected AWS runtime image. Parent v673 is pinned:

`sha256:d9608f01e5465e6730cfa6a36ecc1002233da1ef38a18683060e3fd0d46a58b7`

`patch-runtime.mjs` changes only the v529 desktop-shell section in the v503 and
v508 customer clients. It preserves the existing shell lifecycle and events.
The desktop week grid delegates the clicked slot's date to the existing wizard
date selector before its normal slot handler runs; this listener is inactive on
mobile and never changes the booking API or directly manipulates React state.
A named CSS layer lets its important desktop rules override legacy unlayered
important rules without globally changing other applications.

Both client URLs and the immutable native layout loader chunk are versioned.
The latter is essential: the native layout also loads v503, whose cached older
desktop shell would otherwise claim the shared initialization flag before v508.
The old immutable chunk is left intact. Server changes are limited to these asset
references and the `X-Lien-Customer-Desktop-Quality: v674` readiness marker.

## Verification

- Docker build: strict parent anchors, JavaScript syntax, `verify-runtime.mjs`.
- `browser-regression.mjs`: extracts the actual patched shell and serves isolated
  server/native layout fixtures. Pixel-identical mobile rendering at 320, 390,
  768 and 1023px; desktop layout at 1024, 1280, 1440 and 1920px; route changes,
  input stability, resize cleanup and portal exclusions.
- `real-app-regression.mjs`: separately runs against two real local application
  containers with a copied local fixture database. Compares mobile screenshots,
  captures desktop pages and checks booking, profile and chat interactions.
  It deliberately does not submit reservations, profile updates or chat messages.
- `audit-local.mjs`: captures all 15 main customer routes for visual inspection.
- CI also reruns isolated-schema integration tests for v673 salon discovery,
  v672 salon masters, v671 dealer staff/sales and v656 order documents.
- `production-smoke.mjs`: read-only readiness and versioned client/chunk checks.

Browser scripts use `SMOKE_DEPENDENCIES_PACKAGE` to resolve Playwright and
`CHROME_PATH` to select Chrome. Real-app screenshot comparisons also need Sharp.
For CI shell tests, set `RUNTIME_CLIENT` to the v503 client extracted from the
built image. Real-app tests require local fixture servers at `BASELINE_URL`
(default port 3174) and `SMOKE_BASE_URL` (default port 3175), with fixture customer
credentials in `TEST_LOGIN_ID` and `TEST_PASSWORD`. Non-local URLs are rejected.
Screenshots and copied local customer data are not committed or uploaded to CI.

The real local native renderer already emits React hydration errors 418/423 on
the baseline image; this desktop-only release does not change React rendering.

## Deployment

`.github/workflows/deploy-customer-desktop-quality-v674.yml` uses the existing
protected release workflow and AWS OIDC role. It locks the current parent digest,
tests the immutable child image, supports automatic rollback, verifies the live
release and records the protected deployment lock on the canonical branch.
