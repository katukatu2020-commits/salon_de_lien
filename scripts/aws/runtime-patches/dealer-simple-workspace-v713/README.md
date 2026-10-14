# Dealer workspace simplification v713

Parent: v712, protected digest `sha256:c2c8408ae3732c71ecda3a15615f6159a255be47d488aa7c2684ee168b6222f6`.

## Scope

- One six-group sidebar; only the current group is expanded. All 19 destinations remain in the searchable mobile/desktop menu.
- Procurement, manufacturer reports and period sales now use their own active navigation keys. Remove the duplicate v698 link bars and v688 contextual tabs/shortcut strip.
- Orders use counts inside existing status filters instead of a second KPI block and repeated list heading. The erroneous shipped-count label "出荷待ち" no longer appears.
- Remove redundant catalog/company headings; keep salon selection, filters, row actions, save controls and source-master import. Salon names link directly to their orders/deliveries/invoices.
- Fold registration, bulk discount tools, monthly goal editing and dashboard detail tables. Selecting pricing rows reveals the existing bulk tools. Keep forms mounted and preserve IME search behavior.
- Compact tables and mobile widths; retain scoped styling, existing icons, colors, chat layout, dialog focus handling and five-item bottom navigation.
- Fix company page: use its loaded profile instead of reading an unavailable bootstrap object for a duplicate dealer-code panel. The code remains in account identification.
- Fix password-page navigation: permit same-origin scripts in that page's CSP only. Preserve inline eye buttons and all other CSP directives.

No schema, migration, pricing/order calculation, mutation API or stored business-data change. Server authorization remains in existing handlers. Navigation mirrors role/delegated procurement access; product controls stay read-only for staff.

## Implementation

`patch-runtime.cjs` derives versioned dealer clients and a new shell from the pinned running release, preserving historical assets and accumulated fixes. `navigation.cjs`, `workspace.css` and `readonly.js` contain the focused new UI. Do not deploy a standalone source rebuild in place of this runtime.

## Verification

- Source: `Dockerfile.source-check` runs typecheck, lint, 77 tests and Next production build. Passed; two pre-existing `next/image` lint warnings remain.
- Runtime: existing v684, v688-690, v696, v698, v700-712 checks and `verify-runtime.mjs` pass. New check covers 19 unique routes, role-aware menus, retained forms and updated clients.
- Browser: `node scripts/aws/runtime-patches/dealer-simple-workspace-v713/browser-regression.mjs`, isolated local QA at port 3188. 19 routes x 1440/1024/390/320px; search, IME focus, menu/Escape focus, status filters, order detail, cutoff/shipping forms, catalog draft preservation, pricing bulk tools, salon documents, calendar dialog, company load, chat composer and staff authorization. Screenshots/report under `artifacts/dealer-simple-workspace-v713/` (not committed).
- QA staff fixture is limited by both environment and database-name guards and removed in `finally`. No production mutation by browser tests.
- Protected GitHub OIDC workflow verifies parent digest, runs source/runtime checks, deploys with rollback and executes read-only production health/asset/authentication smoke checks.

Rollback uses the protected workflow and the previous v712 task/image. Local AWS mutations are prohibited.
