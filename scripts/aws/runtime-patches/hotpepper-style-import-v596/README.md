# Hotpepper Style Import v596

Protected child of production v595. No receipt, daily-sales print, membership,
authentication, or billing logic changes.

## Workflow

- The existing new-style modal has a Hotpepper import checkbox.
- Enter a salon's public style-list URL, confirm ownership/customer/staff consent
  and the source operator's permission for automated retrieval/republication.
- Scan every pagination link within that salon. Review 25 entries at a time,
  edit title/stylist/kana/role/comment/menu, select entries, then publish.
- Imported photos retain the source's FRONT/SIDE/BACK labels. Missing directions
  remain missing; unlabelled images are OTHER. Manual posts retain three slots.
- Style and stylist photos are validated/re-encoded and copied to the existing
  private S3 store, not hotlinked in published customer views. No existing staff
  profile is overwritten or automatically associated by matching a name.
- Metadata is available to staff and customers through the existing authorized
  content endpoint; only staff can edit a STORE post's metadata.

## Persistence and Limits

`StyleImportJobV596` stores one current job per organization as JSONB, including
confirmation actor/time, discovered pages, per-item results and publication IDs.
The browser advances one durable step per request, with a three-second cooldown.
Closing the modal pauses advancement after the current request. Reopening and
selecting import resumes it. This is resumable, not a detached background worker.
Cross-task DB row/advisory locks serialize updates. A partial unique index on
`VisitCommunityPost(organizationId,sourceUrl)` prevents duplicate imports,
including posts subsequently hidden or archived. Cancellation preserves posts
already published. Retry never republishes successful entries.

Maximum 1,000 styles, 100 discovered list pages, 3MB HTML, 5MB per downloaded
image and 20 seconds per remote request. Exceeding discovery limits stops the
job explicitly; no successful "all imported" status is returned. Jobs started
within one minute of the previous start are rejected. No infinite retries.

Only HTTPS `beauty.hotpepper.jp/slnH#########/style/` list/detail paths and
`imgbp.hotp.jp/CSP/IMG_SRC/...` image paths are allowed. DNS is pinned to a
validated public IPv4 answer. Redirects, login/challenge pages, unapproved
hosts, oversized content and non-image responses are rejected. HTTP 403/429
pauses the job; retry has a one-minute cooldown, with no access-control bypass.

Source observations on 2026-09-09:
- Public style pages were allowed by the site's robots.txt.
- The source terms restrict unapproved commercial use and republication.
  The confirmation is a prerequisite, not a claim that ORIMIA has permission.
- The supplied list had pagination and the inspected detail had FRONT/BACK,
  stylist comment/name/kana/role/profile image and menu. Coupons and unrelated
  carousel images are not imported.

No real salon collection is bulk imported/published as part of deployment.

## Verification

- `integration.mjs`: isolated PostgreSQL schema; parser fixtures, pagination,
  retry/resume, uniqueness, tenant/CSRF/permission boundaries, existing manual
  three-photo behavior, S3 failure cleanup and rate-limit pause.
- `browser-regression.mjs`: real staff login and modal; mock import/publication
  responses only, so production smoke does not fetch or publish real styles.
- `local-fixture.cjs` and `browser-detail.mjs`: guarded seeded local DB only;
  real metadata read/write and customer edit denial, desktop/mobile screenshots.
- Live parser/network inspection: supplied list, one detail and one style image;
  no real posts created. Full source HTML is not committed as a fixture.
- Reverse-patch hashing checks all parent public/Next/root JS/CSS files, allowing
  only recorded publishing/content metadata and client-cache loader changes.

The unchanged v595 parent emits React hydration 418/423 errors while loading
community pages. They were reproduced side by side on v595/v596. New modal
operations have zero additional page errors. This pre-existing issue is not
reported as fixed by this release.
