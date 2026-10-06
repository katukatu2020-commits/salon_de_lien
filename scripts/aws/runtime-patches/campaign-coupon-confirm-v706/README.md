# Campaign Images And Coupon Confirmation v706

Extends the reviewed v705 runtime. No schema changes or new dependencies.

## Changes

- Campaign-specific 4:3 canvas editor with drag, zoom, horizontal/vertical positioning, fit/fill, keyboard focus and cancel handling. Profile images retain the existing square cropper.
- Campaign upload normalizes to 1600x1200 with contain instead of attention-based 16:9 cropping. Admin preview/history, customer campaign cards and home thumbnails preserve the entire image. Previously cropped originals cannot be recovered; upload the original image again.
- Final broadcast confirmation lists every eligible recipient, count, masked contact details, channel and coupon/message details. Email accounts without an active email address are excluded consistently with delivery.
- Recipient selector no longer submits the broadcast form accidentally.
- Preview and actual delivery share tenant-scoped recipient resolution. A ten-minute HMAC confirmation binds sender, organization, content, coupon and actual recipients. The existing transactional broadcast/coupon writer rejects unconfirmed or changed deliveries. Its unique broadcast ID prevents duplicate issuance on retries.
- Existing delivery quotas, email transport, coupon creation and automated coupon rules are preserved.

## Verification

- `node --test audience.test.cjs`: nine tests covering filters, manual recipients, email eligibility, tenant/auth/origin, signatures, expiry and changed data.
- `node image.test.cjs` inside the runtime: actual upload handler with Sharp; three aspect ratios and corner-pixel assertions. Only S3 transport is mocked; no external assets are uploaded by tests.
- `node browser-regression.mjs`: guarded isolated QA only; desktop/mobile crop, fit, zoom, drag, cancel, confirmation lists, cancel without writes, two-recipient coupon issuance, unconfirmed POST rejection and replay protection. Test-created broadcasts/coupons are removed in `finally`.
- Existing source typecheck, lint, 68 tests and build; runtime regression checks v684, v688-v690, v696, v698, v700-v706 and v680 hydration.
- Production smoke is read-only apart from an unauthenticated preview request, which must return 401. No production broadcasts or campaign posts are created during verification.

## Release

Only `.github/workflows/deploy-campaign-coupon-confirm-v706.yml` may deploy via protected GitHub OIDC. It pins the approved v705 digest, verifies runtime compatibility, uses automatic rollback and updates the release lock. Do not deploy a plain source rebuild over the accumulated runtime features.
