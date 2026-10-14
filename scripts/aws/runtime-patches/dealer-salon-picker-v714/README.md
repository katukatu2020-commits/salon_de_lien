# Dealer Salon Picker v714

Replaces dealer-side salon dropdowns with one searchable modal picker. Uses the
authorized native option list and preserves values, form submission, input/change
events, defaults and disabled state. Does not create a second salon datasource.

## Coverage

- Contract pricing (`dealer-pricing-salon`, contract ID).
- Operations, fulfillment and receivables filters (organization ID).
- Monthly sales and targets filters (organization ID).
- Invoice creation, payment entry and activity forms (organization ID).
- The retained ERP salon-message helper also receives the marker. The current
  partner-chat screen already has a searchable list and is not changed.
- Salon list/detail links remain links. Manufacturer, supplier, staff, warehouse,
  branch and salon-side dealer dropdowns are not changed.

The 19 dealer routes and the above modal forms were audited. The picker supports
name/code search, NFKC/case/kana normalization, 50-row result pages, current choice,
existing empty choices, keyboard selection, Escape, focus return, nested dialogs,
IME input, validation, resets and dynamic rerenders. Labels are inserted as text.

## Data and Authorization

No schema or migration changes. The existing dealer-scoped team/options projection
adds the existing Organization.publicCode and WholesaleDealerContract.customerCode
fields so the sales picker can also search codes. WHERE clauses, sessions and
authorization are unchanged. Picker code makes no network requests.

## Release

Child of reviewed v713 image:
`sha256:586a872804542e26bb7f5709e31d789db66e78b1b78785b23ac9d3f5f6cd193d`.

`patch-runtime.cjs` uses checked anchors to generate versioned assets and the
shared shell. Existing assets remain available for cached pages. Deploy through
`.github/workflows/deploy-dealer-salon-picker-v714.yml` only. The protected workflow
checks the currently deployed digest, performs source checks and runtime regressions,
deploys with rollback protection, checks health/assets/auth, and records the lock.

## Verification

```text
node scripts/aws/runtime-patches/dealer-salon-picker-v714/browser-regression.mjs
node scripts/aws/runtime-patches/dealer-simple-workspace-v713/browser-regression.mjs
docker build -f scripts/aws/runtime-patches/dealer-order-flow-v698/Dockerfile.source-check -t dealer-salon-picker-source-check .
```

Browser tests use only isolated local QA. Real existing options exercise filtering,
pricing and form dependencies without saving business records. A browser-only
152-option fixture covers larger lists, escaping, native form events, defaults,
disabled states and stale sources. The existing guarded v713 staff fixture is
created and removed for authorization regression checks. Screenshots and reports
are under `artifacts/dealer-salon-picker-v714/` (not committed).
