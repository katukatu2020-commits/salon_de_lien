# Customer login visual v593

Removes the two white layers that washed out the `/u/login` photograph and
removes the decorative sparkle icon from the server-rendered page. The original
photo is retained. A bottom-only dark gradient supports white text.

## Scope

- Pinned parent: protected store-registration-layout v592.
- Four exact replacements in the compiled login page: its stylesheet, scoped
  figure class, copy styling, and icon removal. No form, session, validation,
  or redirect change. The stylesheet travels with the page on RSC navigation.
- `server.js` adds only a readiness header.
- Shared BrandVisual, customer experience scripts, registration, receipts, and
  all unrelated runtime files are unchanged. The verifier reverses the scoped
  replacements and checks the complete parent files byte-for-byte.

## Verification

`browser-regression.mjs` covers six viewport sizes (320 through 1920 pixels),
image decoding and pixel contrast, icon absence, field attributes and validation,
error messages, and route-specific stylesheet loading. It also checks the
JavaScript-disabled first render. Credentials are never submitted by this test.

Run with `SMOKE_BASE_URL` pointing at a running runtime; the default local preview
is `http://localhost:3593`. Production uses the same read-only browser checks.

The existing populated local runtime was used for browser verification. The
legacy Prisma schema alone does not bootstrap all runtime extension tables;
this visual-only release does not attempt database initialization changes.
