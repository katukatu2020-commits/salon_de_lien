# Customer login visual v593

Removes the two white layers that washed out the `/u/login` photograph and
removes the decorative sparkle icon from the server-rendered page. The original
photo is retained. A bottom-only dark gradient supports white text.

## Scope

- Initial release used protected store-registration-layout v592 as its parent.
- Follow-up pins the deployed v593 image and replaces its stylesheet link with
  an inline, route-scoped style element. This prevents a transient unstyled photo
  on RSC navigation from password reset, detected by production Chromium tests.
- The original figure class, copy styling, and server-rendered icon removal are
  retained. No form, session, validation, redirect, or server change in follow-up.
- Shared BrandVisual, customer experience scripts, registration, receipts, and
  all unrelated runtime files are unchanged. The verifier reverses the scoped
  replacements and checks the complete parent files byte-for-byte.

## Verification

`browser-regression.mjs` covers six viewport sizes (320 through 1920 pixels),
image decoding and pixel contrast, icon absence, field attributes and validation,
error messages, and route-specific styling. It also checks the
JavaScript-disabled first render and navigation from password reset with the
old external stylesheet blocked. Hydration errors fail the test. Credentials
are never submitted by this test.

Run with `SMOKE_BASE_URL` pointing at a running runtime; the default local preview
is `http://localhost:3593`. Production uses the same read-only browser checks.

The existing populated local runtime was used for browser verification. The
legacy Prisma schema alone does not bootstrap all runtime extension tables;
this visual-only release does not attempt database initialization changes.
