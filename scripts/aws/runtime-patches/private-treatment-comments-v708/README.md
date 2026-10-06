# Private Treatment Comments v708

Restores the existing v565 staff-only history memo feature. The v571 route-scoping change introduced a customerId parameter to historySection, but its caller did not supply it, so the editor never rendered.

- Passes the verified customer ID without relaxing the route/DOM identity checks.
- Uses stable history record IDs in source and runtime cards instead of matching dates. Separate visits on the same day keep separate comments.
- Labels the editor Staff Comment / Customer Private, including mobile. Existing save/edit/clear, author and timestamp behavior is preserved.
- Reuses CustomerHistoryMemo and the authenticated visit-history endpoints. No new table, column, migration, dependency or customer-visible field. Existing private comments remain separate from VisitPhoto captions, customer reactions, public posts and AI input.
- Keeps the existing subject key when displaying a legacy memo, so editing/clearing does not write a different alias and resurrect older content.
- Validates input types and the allowed subject types, requires staff authentication before schema access, and retains customer ownership, hidden/deleted guards, origin checks and private/no-store responses.
- Preserves current appointment cards and photo controls. Cache-busts the shared admin client.

## Verification

- Nine runtime security tests: admin/staff CRUD, customer/dealer/manufacturer/anonymous denial, tenant/hidden guards, invalid subject and origin, input length/types, split UTF-8 chunks, no visit/photo mutation and legacy alias behavior.
- Guarded isolated browser regression: save/edit/reload/clear, separate same-day visits, sale-only history, photos, desktop/mobile, no JavaScript execution from text, customer HTML/RSC privacy and forbidden direct API access. Prefixed QA data is removed in finally.
- Existing v565 regression and source typecheck/lint/72 tests/build. Prior accumulated runtime checks remain required.
- Production smoke only reads health/assets and sends unauthenticated requests that must return 401; no production comment is written.

Only the protected GitHub OIDC release workflow may deploy this patch, pinned to the reviewed v707 parent. Never replace the accumulated runtime with a plain source rebuild.
