# Style community route and data merge v481

Keeps server-rendered public styles and management-only posts in one stable staff grid.

- Existing posts and signed image references remain in the database and object store.
- Public SSR cards are preserved and merged with organization-scoped management records by post ID.
- The shared admin runtime loads the enhancer before navigating from another admin page.
- Cross-page links use a full navigation so stale Next.js route data cannot leave an empty result.
- Public and private posts receive the same visibility and delete controls.
- Summary counts use the final de-duplicated card count.
- The cache-busted v481 client is loaded by shared and direct page routes.

Parent image: style community empty-state cleanup v480 (`sha256:117aba79c7daaf6f8dd86e6be979d3a4c483aa1e4860e8a662f7addef8588e9d`).
