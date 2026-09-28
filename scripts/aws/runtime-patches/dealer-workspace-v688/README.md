# Dealer Workspace v688

Navigation-only dealer release on the approved v687 image. No schema migration,
order mutation, price change, or permission change is performed on deployment.

## Information Architecture

| Main menu | Contextual pages |
| --- | --- |
| Home | Operations dashboard |
| Orders and inventory | Orders, fulfillment, inventory |
| Partners and products | Contract salons, catalog, contract pricing |
| Sales and billing | Monthly sales, sales calendar, receivables |
| Sales activity and chat | Activities, salon chat, targets |
| Settings | Company, staff/branches (admin only), password |

All 16 existing routes remain. Desktop has six primary entries and at most three
contextual tabs. Mobile has five fixed entries and a searchable native menu
dialog. Chat unread badges are retained. Escape, focus restoration, back/forward,
safe-area spacing and reduced-motion preferences are handled.

The dealer catalog registration form and order cutoff settings use native
disclosures. The dealer code is retained on the company page; repeated code
bands and the obsolete salon-side registration instructions are removed.

Existing catalog/IME behavior, stock, ordering, invoice, team and chat clients
remain in use. Managed-owner and individual-staff password pages share the same
shell. Salon and customer layouts, assets and business APIs are unchanged.

## Verification

- `verify-runtime.mjs`: all routes, role filtering, managed password rendering,
  legacy ERP/team script swaps and versioned dealer clients.
- `browser-regression.mjs`: real disposable-schema APIs, 15 pages at 1440, 1024,
  390 and 320 pixels; role-specific password page; navigation, menu search,
  Japanese input stability, disclosure drafts, back and responsive overflow.
- `amendment-browser-regression.mjs`: existing v687 integration-driven browser
  tests with only the new cutoff disclosure opened before using its controls.
- Existing v678/v686/v687 database tests cover transaction, tenant, role, cutoff
  and stock invariants. CI also runs prior salon and operator regressions.
- Local isolated full-app QA verifies the managed-owner password route and the
  complete dealer route list on desktop/mobile, including asset loading.
- `production-smoke.mjs`: read-only release/asset/auth-boundary checks.

Deploy only through `deploy-dealer-workspace-v688.yml`, pinned to the reviewed
parent digest. It uses protected ECS rollout and rollback procedures and records
the approved release lock. Never deploy the synthetic fixture or QA image.
