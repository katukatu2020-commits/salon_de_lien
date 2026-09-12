# Dealer pricing pagination v631

- Contract pricing now queries and renders 30 matching products per page.
- Pricing-only requests omit order rows and load contract prices only for the visible products.
- Search runs on the server after a short debounce and keeps its state in the URL without navigating away.
- Unsaved edits survive page and search changes; saving sends only changed products.
- The configured-product count remains accurate across the complete dealer catalog.
