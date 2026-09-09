# Admin Chat Search v589

Reviewed parent: public-audience-sites-v588,
`sha256:34b2d4b19d130af3b77f6691879caf6f2de87a4511356a9a75ef57a74384699c`.

This narrowly patches the canonical recovered Next server page and custom Node
server. It does not rebuild the older source-tree application or replace the
shared admin shell, broadcast page, authentication, or message mutation APIs.

## Behavior

- Search every visible customer conversation by registered name, actual name,
  or phone number, with whitespace/full-width normalization and literal matching.
- Filter all/unread and staff, with matching counts and 25-thread pagination.
- Keep a compact independent scrolling inbox with customer/staff identity,
  preview, last-message date, unread badge, and selection state.
- Preserve the selected conversation and unsent composer while searching.
- Preserve filters/page through the existing chat route redirect and mobile back.
- Keep existing message editing/deletion, sender ownership, and left-side read
  receipts. Only opening an authorized conversation marks it read.
- Scope all layout changes to the chat workspace, including the legacy minimum
  width reset. Use list/detail switching at narrow widths and leave room for the
  existing mobile navigation.

## Access and Queries

`GET /api/admin/chat/inbox` uses the existing validated ADMIN/STAFF session and
the session's organization only, matching the previous page's visibility.
Deleted/hidden customers and other organizations are excluded. SQL values are
bound parameters; rendered values are HTML escaped. Responses are private and
non-cacheable. Search does not update read timestamps.

Two idempotent concurrent indexes support thread ordering and message previews.
Only the current 25 threads fetch previews/counts. The selected conversation is
queried independently, so filtering it out does not discard the composer.

## Verification

- `integration.mjs`: isolated temporary schema, 1,000 fixtures, paging, Unicode,
  literal wildcard/injection strings, actual names, phone formatting, staff,
  unread counts, tenant/hidden/deleted isolation, session/method guards, XSS,
  unchanged read state, and repeatable concurrent index creation.
- `seed-local.mjs`: optional 60 browser-test fixtures, refuses any database other
  than the disposable `orimia_chat_v589` copy. Never run against production.
- `smoke-production.mjs`: demo tenant only; desktop, tablet, mobile, filters,
  pagination when available, preserved drafts, rapid input, IME, error/retry,
  route lifecycle, and screenshots. All message mutation requests are blocked.
- Docker build rejects ambiguous patch anchors and checks JavaScript syntax.
- `compare-runtime.mjs` confirms the recovered shell's existing React 418/423
  hydration warnings are unchanged on the parent and child, on both customer
  management and chat pages. Fixing the unrelated shared-shell hydration is not
  part of this release; other browser errors fail the smoke test.
- Protected CI pins the reviewed parent, runs PostgreSQL tests before deploy,
  verifies the running release, and records the deployment lock.

Local preview: `http://localhost:3589/admin/customers/messages/chat`.
