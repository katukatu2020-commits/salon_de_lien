# Hotpepper Menu Rows v711

## Fix

The v612 parser treated each `table.menuTbl` as one menu. Hotpepper uses one table per set menu but one multi-row table per single-menu category. Only the first single menu in each category was read.

The parser now iterates menu titles and scopes price, description and reservation IDs to the enclosing row. Single-menu categories come from the preceding `singleMenuHead`. Both `SN` set-menu and `MN` single-menu IDs are supported. Existing set IDs and name/price fallback IDs retain their format. The existing name match prevents duplicates of single menus previously imported under fallback IDs.

- No new tables, dependencies, UI changes or production data edits.
- Existing staff authorization, same-origin checks, URL/DNS restrictions, transactions, confirmation and duplicate detection are unchanged.
- The 200-menu limit applies to individual menus, without silent truncation.
- A displayed menu count greater than the parsed candidate count fails before any preview is persisted. Unsupported prices retain the existing explicit warning behavior.
- Saved previews are not automatically replaced: cancel an old unfinished preview and fetch the same URL again.

## Verification

- Downloaded the provided H000307612 CT00 page: old parser 28 menus, fixed parser 49 menus, zero warnings.
- Live retrieval through the application's existing HTTP fetcher: 49 menus.
- Seven focused parser tests: grouped rows, per-row fields, categories, IDs/deduplication, legacy identities, missing prices, limits and incomplete pages.
- Browser/real isolated DB: 49-row preview, 48 new menus imported, one legacy menu retained unchanged, repeat preview marks all 49 as duplicates. Desktop/mobile screenshots and last-row controls checked; fixtures cleaned up.
- Source typecheck, lint, 77 tests and build passed (two existing img warnings).
- Prior runtime regressions and QA hydration checks retained.

Deploy only through the protected GitHub OIDC workflow, pinned to the approved v710 image. `production-smoke.mjs` is read-only.
