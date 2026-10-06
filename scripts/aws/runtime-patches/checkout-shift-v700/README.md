# Checkout and shift timetable v700

## Scope

- Paid appointments use pink; unpaid appointments use yellow. Payment is the existence of a related ServiceSale, including zero-total receipts. Reservation status and interaction locks are unchanged.
- Receipt links open in the same tab with a consumed-once autoPrint flag. The existing local receipt bridge prints one job; otherwise the native browser print dialog opens.
- Successful bridge acknowledgement or native afterprint returns to the appointment's JST date on the shift timetable, with a fresh server render.
- An ambiguous print failure never triggers a second native print job. Errors remain on the receipt with an explicit retry. Refresh does not reprint.
- Native afterprint only confirms that the dialog closed, not that paper printed; browsers cannot distinguish cancellation. Physical printer hardware requires an on-site check.

## Compatibility

No database migration, authentication change, checkout write, or external notification.
Production is an existing runtime-patched image: the bounded runtime patch and matching source changes are both committed. Existing v583 printer calibration is retained. Assets are renamed for cache invalidation.

## Verification

- Source typecheck, lint, test and production build using the existing source-check Dockerfile. Two pre-existing next/image lint warnings remain.
- tests/checkout-display.test.ts covers colours and JST date boundaries.
- verify-runtime.mjs checks the deployed query, manifest, styles, receipt context and no-duplicate-print failure path.
- browser-regression.mjs uses only the isolated v680 QA database and mocked printer responses; no business records are written. It covers desktop/mobile, one-click/double-click, correct return date, unavailable bridge, printer error and reload.
- production-smoke.mjs is read-only and checks health, assets and receipt authentication.

The protected GitHub OIDC workflow pins the reviewed v698 parent digest and refuses deployment if the running release changed. Standard ECS rollback protection remains in place, with an additional rollback if the read-only production smoke fails.
