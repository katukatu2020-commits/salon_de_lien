# Style community data rendering v479

Renders the staff style-management grid directly from the organization-scoped management API.

- Existing posts and signed image references remain in the database and object store.
- Initial client navigation no longer depends on public cards already existing in the SSR DOM.
- Public and private posts receive the same visibility and delete controls.
- An SSR empty state is replaced whenever the management API contains posts.
- The cache-busted v479 client is loaded by both the authenticated shell and direct page routes.

Parent image: style community bootstrap v478 (`sha256:b09a5195d82ffa450cf53b245191cd072f03a7276b5ae8ea5bea3f9d7e6f507f`).
