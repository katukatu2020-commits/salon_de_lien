# Appointment Datetime Recovery v684

Parent: platform-console-v683, pinned to the reviewed running ECR digest.

## Cause

The previous appointment editor waited for `window.load`, so an unfinished image
request prevented its initialization. It also used a resettable mutation debounce
and parsed the displayed page for schedule data. The regression fixture reproduces
the missing control while an image request stays pending.

## Changes

- Hydration-gated initialization independent of `window.load`.
- Visible action and keyboard-accessible date in the appointment datetime card.
- Tenant-scoped GET on the existing schedule endpoint supplies current metadata.
- Native dialog with date/time fields, mobile layout, retry and conflict feedback.
- Date-only PATCH uses saved staff/duration under the existing serializable lock;
  only scheduledAt changes, preserving menu, price, notes and legacy null fields.
- UpdatedAt token protects against concurrent overwrites; availability checks stay.
- Fresh calendar navigation includes the changed month and bypasses prefetched data.
- Compatible legacy script route retained; new loader references versioned asset.

## Verification

- `verify-runtime.mjs`: syntax, shared helper preservation, existing validation.
- `integration.mjs`: live service with PostgreSQL in a random disposable schema.
  Auth/tenant isolation, invalid dates, unavailable slots, concurrency, closed
  bookings, unchanged fields and old calendar API contract.
- `browser-regression.mjs`: pending image reproduction, hydration, keyboard, save,
  duplicate submits, retry, conflict, rerender and desktop/390px/320px layouts.
- Real isolated app: salon datetime edit, calendar and customer appointment view.
- `production-smoke.mjs`: read-only deployment checks, no customer booking changes.

Deployment uses the protected GitHub OIDC workflow and retains v683/v682/v679/
v677/v676/v671/v680 regression checks. No production schema migration is needed.
