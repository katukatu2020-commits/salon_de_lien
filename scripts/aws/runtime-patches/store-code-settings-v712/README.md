# Store code settings v712

Narrow child of the reviewed v711 production image:
`sha256:ca56712713ff2dfb8240b014682559cbe6b1e3b2aec49f0e4b51ecffa3c08247`.

## Cause and Fix

The v670 directory release replaced `ensureStoreCode()` with unconditional removal of the old code and QR controls. The current settings tabs consequently had no code to display, although `Organization.publicCode` was still returned as `profile.storeCode` by the existing authenticated store-profile API.

- Restore the existing enhancer inside the store-profile panel, directly below its header. Staff/shared read-only settings use the same display without gaining any edit controls.
- Read the saved code from the existing session-scoped profile API. No new API, table, migration, code generation or organization update.
- Reuse the current icons/buttons. Keep the field read-only with copy success and clipboard-denied feedback, explicit missing-code state and manual retry after network failure.
- Render once per panel, retain normal tab visibility, and exclude embedded settings and account settings. Render code using `textContent`.
- The existing JavaScript endpoint is `private, no-store`; no immutable Next assets are overwritten.

## Verification

- `node scripts/aws/runtime-patches/store-code-settings-v712/browser-regression.mjs`: isolated local application only. Owner/staff/shared on desktop/mobile, saved code/copy, tabs, no duplicate elements, account-page exclusion, tenant scoping, anonymous denial, existing staff write denial, unchanged store data. Simulated empty/error/retry/clipboard denial/HTML-like values.
- `verify-runtime.mjs`: syntax and integration guards, run with inherited v684-v711 and v680 hydration checks.
- Existing source verification Dockerfile runs typecheck, lint, 77 tests and build. This check image is never the deployment image.
- `production-smoke.mjs`: read-only release header, uncached script and unauthenticated API denial. No production account or business data is modified.

Release through the protected GitHub OIDC workflow only. The parent digest must still match the live release; deployment verification failure rolls back automatically.
