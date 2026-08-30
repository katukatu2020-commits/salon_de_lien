# Style community recovery v482

Keeps server-rendered public styles and management-only posts in one stable staff grid.

- Existing posts and signed image references remain in the database and object store.
- Public SSR cards are preserved and merged with organization-scoped management records by post ID.
- The shared admin runtime loads the enhancer before navigating from another admin page.
- Cross-page links use a full navigation so stale Next.js route data cannot leave an empty result.
- Public and private posts receive the same visibility and delete controls.
- Summary counts use the final de-duplicated card count.
- Delete keeps a recoverable database record while removing the post from every list.
- Existing comments, likes, visits, and image originals are retained when a post is deleted.
- The cache-busted v482 client is loaded by shared and direct page routes.

Parent image: style community route merge v481 (`sha256:c03d89f96bd0ed8a33af9c6d0b8c568a4d8fba4be9ce9138d937f10e5fb88df1`).
