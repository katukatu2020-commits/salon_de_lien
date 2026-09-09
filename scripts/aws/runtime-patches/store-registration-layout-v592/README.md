# Store registration layout v592

Reuses the dealer registration `wo-auth` layout, card, controls, and responsive
breakpoints for `/admin/register`. The salon-specific photo and copy remain
separate. Email entry and verified setup use the same format, including sent,
already-registered, expired-token, validation-error, and unavailable states.

## Scope

- Pinned parent: customer-store-redirect v591, digest
  `sha256:05e509949d5fdb06ebe8269a497c25826117980d52bcb5b2f8569f39689ca17e`.
- Changes only registration rendering in `billing.js`, a route-specific exclusion
  from admin workspace decorators in `server.js`, and a readiness header.
- Keeps every form field, verification token, plan selection, agreement, POST
  action, email expiry, Stripe call, and account-creation operation unchanged.
- Does not change dealer registration, customer sessions, receipts, or daily
  sales printing. The runtime verifier checks 843 unrelated files byte-for-byte.

## Verification

- `service-tests.mjs`: renders seven states with injected test data; validates
  form and mail contracts without external email, Stripe, or account creation.
- `preflight.mjs`: serves the built image's fixtures and assets for Chromium
  tests at 1920, 1365, 1024, 768, 390, and 320 pixels. Also tests verified setup,
  required agreement, plan-radio selection, image loading, and horizontal fit.
- `browser-regression.mjs`: read-only production checks and screenshots. Compares
  the salon and dealer card width, padding, and radius. Never submits the form.
- The protected deployment workflow validates the running parent digest and
  runs built-image checks before changing the ECS service.

Local preview: `http://localhost:3592/admin/register`.
