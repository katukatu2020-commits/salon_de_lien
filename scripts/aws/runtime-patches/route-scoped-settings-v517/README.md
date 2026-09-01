# Route-scoped settings v517

This protected runtime patch prevents the store settings external-integration panel from surviving a Next.js client-side navigation.

## Behavior

- Removes `#lien-external-integrations-v492` whenever the active route is not the full `/admin/settings` page.
- Restores source fields hidden by the external-integration composition before leaving the route.
- Removes the settings-only document class outside store settings.
- Recreates the LINE integration card from the existing route-aware runtime when returning to settings.
- Activates the fix with a new immutable layout and commercial runtime cache key.

## Verification

`browser-regression.mjs` covers desktop and mobile client transitions from external integrations to appointments/products, plus a desktop round trip back to settings.
