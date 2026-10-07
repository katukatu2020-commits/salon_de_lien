# Staff Work Shading v710

- Reuses v704's tenant-scoped daily schedule resolver and existing attendance policies.
- Fixes transparent non-working layers; clips before/after ranges to the displayed business day.
- Full-day holidays render one full-width gray layer. Virtual unassigned staff stays unshaded unless the store is closed.
- Keeps appointment/checkout colors, break drag/resize, grids and pointer interaction above the background.
- Cache-busts the active shift chunk and aligns server output; no polling or DOM mutation loop added.
- Source page now reads existing daily plans and attendance policies as well as base staff settings.
- No schema changes, no production data modifications, no new dependencies.

## Verification

- Source Docker check: typecheck, lint, 77 tests and Next build passed (two existing img warnings).
- Runtime checks v684-v710 plus isolated-QA hydration regression.
- `browser-regression.mjs`: isolated database only, save a daily plan through UI, check holiday/time ranges and adjacent day, desktop/mobile screenshots, reservation visibility and drag a break. Restores the test schedule and deletes only test records.
- Existing v704 schedule and v702 drag regression remain applicable.
- Protected release workflow pins v709 digest and deploys only using GitHub OIDC. Production smoke is read-only.
