# Hotpepper Confirmed Auto Import v600

Protected child of business-logout-v599. The v596 importer compared the browser's
Origin with the internal proxy protocol/host. A CloudFront HTTPS viewer request
forwarded over HTTP was rejected. The new scoped validator handles the canonical
application origins, configured origins, CloudFront viewer protocol, and Safari
same-origin requests while rejecting explicit foreign/null origins.

## Flow

1. Confirm the salon owner's authorization and required photo/text permissions.
2. Discover all list pages without downloading style details or images.
3. Display total, previously imported, and new counts in a confirmation dialog.
4. Only after explicit confirmation, fetch details/photos and save each style to
   the existing PostgreSQL and encrypted private object storage pipeline.
5. Display processed/total, percentage, saved, duplicate, and failed counts.

The count-confirmed job ID and total are checked on the server. Owner consent and
confirmation actor/time are persisted. Existing per-item duplicate protection,
tenant scoping, source URL/DNS allowlists, payload limits, rate limits and 403/429
pause behavior remain. Old v596 jobs retain their review/publish workflow. Missing
photo directions remain missing; the manual three-photo form is unchanged.

The browser advances one durable job step at a time. Closing the modal stops
advancement after the active request; reopening resumes. This is not a detached
background worker. Failed items can be retried without re-saving completed items.

## Verification

- `test-origin.cjs`: reproduces the old proxy rejection and tests the corrected
  validator, foreign/null Origin rejection and Safari fallback.
- `integration.mjs`: isolated PostgreSQL schema, real parser/publisher, test object
  store; confirmation before image fetch, count mismatch, tenant isolation,
  automatic saving, progress, retry, durable job recreation, JPEG readback, duplicate
  suppression and CSRF handling. Test schema is removed afterward.
- `browser-regression.mjs`: live origin probe with no mutation; mocked job replies
  for popup, progress, retry, resumption and manual three-photo checks at widths
  1440/390/320. Chrome and WebKit supported. No real production bulk import.
  Windows WebKit blocks third-party fonts and uses
  `PW_TEST_SCREENSHOT_NO_FONTS_READY=1` for the screenshot-only font-wait workaround;
  interaction assertions remain unchanged. Chromium retains the web fonts.
- `live-local.mjs`: explicitly guarded localhost-only real-source import using the
  seeded local salon and a separate encrypted MinIO bucket. Saves evidence under
  `artifacts/hotpepper-import-confirm-v600/live-local` and opens a stored detail.
- `verify-local-storage.cjs`: guarded local-only database and storage readback;
  compares every imported record with parsed metadata and decrypts/decodes every
  stored style photo and stylist portrait, without relying on remote hotlinks.
- `browser-stored.mjs`: verifies actual saved metadata and private images in both
  staff and read-only customer detail views at desktop and mobile widths.
- Runtime SHA-256 reverse-patch verification protects the 851 parent assets,
  including receipts, daily sales reports, logout and customer application code.

The unchanged parent has React hydration errors 418/423 before the style modal
opens. These are recorded separately from feature interaction errors.

Local live verification on 2026-09-09 completed all 161 styles from
`https://beauty.hotpepper.jp/slnH000307612/style/` across three list pages, with
zero failed items. All metadata matched the parsed source. All 538 encrypted
style photos and stylist portraits were read back and decoded from the local
private bucket. Staff and customer detail views rendered the saved records.

No source access restrictions are bypassed. No production salon is selected by
guessing its name, and no real collection is published by the deployment smoke.
