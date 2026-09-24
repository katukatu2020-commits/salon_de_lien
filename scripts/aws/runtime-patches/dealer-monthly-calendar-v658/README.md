# Dealer monthly calendar v658

Adds a monthly sales forecast calendar to the dealer portal.

## Behavior

- Adds `/dealer/calendar` to desktop and mobile dealer navigation.
- Groups non-cancelled wholesale orders by their order date in `Asia/Tokyo`.
- Shows daily invoice count and tax-inclusive forecast revenue.
- Shows monthly forecast revenue and invoice count.
- Persists manually entered monthly sales targets and new acquisition counts per dealer.
- Changes months without a document navigation or full-screen loading state.

## Local verification

```powershell
docker build -t salon-de-lien:dealer-monthly-calendar-v658-local scripts/aws/runtime-patches/dealer-monthly-calendar-v658
docker run --rm --entrypoint node salon-de-lien:dealer-monthly-calendar-v658-local /tmp/lien-v658/verify-runtime.mjs
```

`service-regression.mjs` verifies month boundaries, cancelled-order exclusion, aggregation, persistence, and validation. `browser-regression.mjs` verifies desktop, 390 px, and 360 px layouts and captures screenshots.
