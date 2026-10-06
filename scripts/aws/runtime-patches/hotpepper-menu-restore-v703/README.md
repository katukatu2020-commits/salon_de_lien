# Hot Pepper Menu Entry Restoration v703

## Root Cause

The v612 importer was injected only into full `/admin/products` HTML responses.
Next client navigation from appointments did not load the script, leaving the
existing menu dialog without import controls. Direct loading of the menu URL
worked; the server importer and parser were still present.

## Changes

- Load a versioned importer asset on all salon admin entry pages, retaining the
  menu-page check and waiting for hydration before modifying the DOM.
- Add a download-icon button above the menu table, opening the existing create
  dialog in import mode. Keep manual menu entry unchanged.
- Dispose closed dialogs and retain server-side import progress for resuming.
- Support Enter in the URL input without submitting the hidden manual form.
- Warn that durations are estimates; reuse preview editing and confirmation.
- Scope mobile table overrides so generic sticky-column/min-width rules do not
  hide selection or edit controls.

No DB/schema/API change. The existing v612 parser, import job table, same-origin
and tenant checks, transactions and duplicate prevention remain byte-identical.
The style importer is untouched. Existing menu data is never overwritten.

## Verification

- `verify-runtime.mjs`: bundle syntax, navigation loader, unchanged backend and
  original parser/service integration tests.
- `browser-regression.mjs`: authenticated isolated QA only. SPA and direct entry,
  manual mode, mobile preview, URL validation, saved edits, confirmation, import
  into the real QA database, duplicate prevention and network-error retry.
- `qa-fixture.cjs`: explicit isolated DB/environment guard. Uses the existing
  service's injected fetch dependency to seed preview because QA has no internet.
  Deletes only its two known QA menu keys and its own import job after testing.
- Live page retrieval/parser is verified separately in a no-credentials container
  on the ordinary bridge network; no real salon data is imported.
- Production smoke is read-only. Protected release pins v702 parent digest.
