# Business Logout v599

Salon and dealer logout now return HTTP 303 to `/business`. Customer logout
continues to return to `/`. The salon TypeScript route is also synchronized.

The reviewed v597 runtime still contained the v94 salon destination `/` and
the dealer service destination `/dealer/login`. Change only these two targets
and add a release health header. Preserve origin checks, session cookie expiry,
cache policy, customer authentication, receipts, and sales report printing.

The Docker build tests the actual compiled salon/customer handlers and the dealer
handler with a database stub (11 assertions groups). Reverse-patch SHA-256 checks
protect all 851 existing runtime assets from unrelated changes.

Run `browser-regression.mjs` with `SMOKE_BASE_URL` and
`SMOKE_DEPENDENCIES_PACKAGE` pointing to a package with `playwright-core`.
It checks both business redirects, customer redirect preservation, cookie expiry,
invalid-origin rejection, protected-route redirects, and the salon logout button
on desktop/mobile using the seeded demo account. It never creates dealer accounts,
sends mail, or changes business data. `SMOKE_BROWSER=webkit` tests WebKit.

The deployment workflow pins the v597 parent digest and uses the existing protected
release process. No receipt, billing, membership, or notification implementation is
modified.
