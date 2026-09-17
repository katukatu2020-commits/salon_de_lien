# Mobile workspaces v657

This runtime release adds a phone-specific workspace layer to the salon admin and dealer applications while leaving desktop rendering unchanged.

## Scope

- Compact salon page introductions and remove unused decorative media space on phones.
- Increase mobile input, button, navigation, pagination, and dialog touch targets.
- Standardize salon cards, tabs, tables, settings, and style-management controls.
- Recompose dealer orders, products, pricing, company, and password screens as readable mobile cards and sheets.
- Keep the dealer catalog immediately searchable by collapsing its long registration form behind an accessible mobile disclosure.
- Keep every CSS declaration inside `@media (max-width: 767.98px)`.

## Local verification

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:dealer-order-documents-v656-local -t salon-de-lien:mobile-workspaces-v657-local scripts/aws/runtime-patches/mobile-workspaces-v657
docker run --rm --entrypoint node salon-de-lien:mobile-workspaces-v657-local /tmp/lien-v657/verify-runtime.mjs
```

`browser-regression.mjs` checks the dealer interface with deterministic fixtures. `capture-baseline.mjs` and the production smoke script exercise the real salon routes with the read-only demo account.
