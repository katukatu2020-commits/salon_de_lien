# Public audience sites v588

Separate the public ORIMIA introduction by audience, without changing the authenticated applications.

| Route | Audience | Entry points |
| --- | --- | --- |
| `/` | Customers | `/u/register`, `/u/login` |
| `/business` | Business service directory | Dedicated salon and dealer introductions |
| `/business/salon` | Beauty salons | `/admin/register`, `/admin/login` |
| `/business/dealer` | Dealers | `/dealer/register`, `/dealer/login` |

The customer page contains no business introductions or business authentication links. The business pages are separate public routes under the existing hostname. No additional domain or DNS change is assumed. Existing application routes and bookmarks remain valid.

## Runtime boundary

- `audience-sites.js` owns shared marketing layout and audience-specific content.
- `orimia-public-v588.css` is served as a versioned, immutable asset. HTML must revalidate.
- Existing brand assets are reused. Small legacy thumbnails are not enlarged for feature images.
- `audience-icons.js` is generated from the installed Lucide library; runtime React is not required.
- `patch-runtime.mjs` updates only the public request handler and the readiness marker on the reviewed v587 parent. Unexpected anchors fail the build.
- Private routes, POST requests, registration handlers, authorization, sessions, mail delivery and billing are untouched.
- Salon registration respects the existing `BILLING_ONBOARDING_ENABLED` flag.
- Privacy/terms content is preserved; their navigation uses the shared customer header/footer.
- Native disclosure elements provide the FAQ interaction. Public pages retain a script-free CSP.
- Canonical metadata, a sitemap, and crawler directives cover the new public routes. Robots directives are not authorization controls.
- Dealer trade prices shown on the introduction page are explicitly labeled samples, not subscription fees.

## Verification

`test-runtime.mjs` exercises the actual patched public request handler: audience separation, assets, GET/HEAD, method and private-route isolation, registration flag, redirects, legal content, CSP and sitemap.

`browser-regression.mjs` checks all four pages in Chromium: image loading, visible navigation, anchors, FAQs, business navigation, page width, hero framing, canonical URLs and legacy legal page layout. `FULL_BROWSER_AUDIT=1` covers eight desktop/mobile viewports, including 320 x 568 and 2560 x 1080. No forms are submitted and no customer data is used.

Local preview requires `LIEN_RUNTIME_ROOT` to point to a patched copy of the runtime. Run `node preview.mjs` from the repository root. It serves on `http://127.0.0.1:3588`. It does not run authenticated applications; login/register links redirect to their existing production endpoints.

## Release

The protected GitHub workflow verifies the live parent digest, builds and tests the child image, runs a built-image browser preflight, then uses the existing approval/deployment and rollback scripts. Production browser verification checks all four public routes before recording the release lock. Browser screenshots are retained as workflow artifacts. No database migration is required.
