# List pagination performance v628

- Dealer product management now queries and renders 30 matching products per page instead of returning the complete catalog.
- Product-only requests omit order and contract-pricing payloads that the catalog does not use.
- Product search is debounced, runs on the server, preserves the current query in the URL, and updates without a page navigation.
- Store style management now returns 20 image cards per page, cancels superseded filter requests, and lazy-loads below-fold images.
- The legacy style list no longer remains visible for three seconds before the paginated list mounts.
