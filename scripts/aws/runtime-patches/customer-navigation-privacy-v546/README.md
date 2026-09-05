# Customer navigation and community privacy v546

This runtime release makes customer back navigation page-aware and removes the
publication-state badge from customer-facing style posts while preserving it in
the staff view.

## Behaviour

- Query-string and hash changes on the current customer page replace the current
  stack entry instead of becoming extra back destinations.
- Mobile and desktop customer headers share the same deterministic back action.
- Existing polluted session stacks are compacted on the next customer render.
- `公開中` remains visible to staff and is omitted from customer SSR and hydration.

## Verification

`verify-runtime.mjs` validates the patched image. `local-integration.mjs` and
`browser-regression.mjs` exercise authenticated customer routes, and
`smoke-production.mjs` checks the deployed assets and customer HTML.
