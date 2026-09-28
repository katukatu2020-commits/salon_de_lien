# Dealer Cascading Filters v695

Fixes product management and contract pricing filters. The API previously flattened
all manufacturer/category pairs into unrelated lists; incremental client rendering
also left dropdown options and reset-button states unchanged after filtering.

- Category choices come from all active products for the selected manufacturer,
  within the authenticated dealer. Search text and pagination do not truncate them.
- The API retains the manufacturer/category pairs for instant client-side changes.
- A category shared by the new manufacturer remains selected. An incompatible
  category resets to all categories, including when opening an old bookmarked URL.
- With all manufacturers selected, all active categories are available.
- Existing search/IME input nodes and product form drafts remain mounted.
- Existing pricing selections/drafts and server pagination remain in place.
- Current failed requests restore the prior successful filter scope. Superseded
  responses cannot replace the latest selection or options.
- No product, price or schema changes; no new dependencies.

The new immutable catalog asset is limited to the dealer catalog workspace. Salon
ordering and historical immutable assets remain unchanged.

Verification: runtime checks, isolated PostgreSQL integration, and Playwright on
both pages at 1440, 390 and 320px. Production smoke is read-only. Deployment uses
the existing protected GitHub OIDC workflow, with previous regressions retained.
