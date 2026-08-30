# Style community empty-state cleanup v480

Renders the staff style-management grid directly from the organization-scoped management API.

- Existing posts and signed image references remain in the database and object store.
- Initial client navigation no longer depends on public cards already existing in the SSR DOM.
- Public and private posts receive the same visibility and delete controls.
- An SSR empty state is removed whenever the management API contains posts.
- The cache-busted v480 client is loaded by both the authenticated shell and direct page routes.

Parent image: style community data rendering v479 (`sha256:b1b29488f451e680ac1221ca9e2041b81dbf7b9f98d0d7ac6d6cbde3f50e5f59`).
