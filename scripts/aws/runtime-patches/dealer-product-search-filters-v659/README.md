# Dealer product search and filters v659

Runtime child patch for the dealer product-management and contract-pricing pages.

## Changes

- Searches full-width, half-width, Katakana, and Hiragana variants together.
- Adds manufacturer and category filters to both catalog views.
- Separates contract-pricing bulk selection from the salon publication toggle.
- Preserves selected products while paging and applies a bulk rate to that selection.
- Adds mobile scroll clearance so the sticky save bar does not cover pagination.

## Verification

```powershell
$env:LIEN_RUNTIME_ROOT = '<runtime-root>'
node verify-runtime.mjs
node service-regression.mjs
node browser-regression.mjs
```

The protected workflow builds this patch only on the reviewed v658 production digest,
runs runtime, service, and browser checks, deploys with automatic rollback, and records
the resulting immutable release lock.
