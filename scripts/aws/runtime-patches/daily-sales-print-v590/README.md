# Daily Sales Printing v590

Parent: protected v589, digest `sha256:3ad5b2a8a341f0a58fc6af9b7e502e952106a5c5862bf34e69de845e1e76c586`.

## Root Cause

The v563 report assets were injected only into full owner-analytics HTML responses.
Next client navigation from appointments did not load those assets. The ledger's
legacy print CSS hid every direct body child except `.sl-ledger-portal`, but the
shared-layout integration now nests that portal inside the app. Printing therefore
hid the entire application without creating a visible report.

## Fix

- Load the versioned report module on staff documents before client navigation.
- Build the current filtered table synchronously in the native `beforeprint` event.
- Keep the existing A4 landscape report formatting, all columns, KPIs and totals.
- Scope the named page and visibility rules to this report only; clean up after
  printing, cancellation and navigation away.
- Do not replace `window.print` or change any receipt/POS asset, route, paper size,
  printer bridge, accounting data or schema. Receipt routes return before the new
  asset injection. The image build verifies all receipt assets and the compiled
  receipt page plus its injection branch remain byte-identical to the parent.

## Verification

`preflight.mjs` tests built assets in Chromium against the nested-portal regression
fixture, native PDF lifecycle, 26 columns / 31 days, and route cleanup.

`browser-regression.mjs` logs into the demo account for read-only checks on the
actual application: client navigation, direct entry, repeated printing, source
table/totals equality, full-width A4 PDFs, stress fixture and receipt asset exclusion.
Only the disposable browser DOM is modified by stress tests. No physical printing
or accounting writes occur. Existing parent React hydration warnings #418/#423 are
excluded; other page errors fail verification.

Local preview: `http://localhost:3590/admin/owner-analytics?salesLedger=1`.
Artifacts are under `artifacts/daily-sales-print-v590/`.
