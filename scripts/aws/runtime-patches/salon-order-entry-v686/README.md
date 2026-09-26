# Salon Order Entry v686

Parent: campaign-booking-menu-v685, using the protected canonical workflow.

- New dealer/salon links can only be registered through the existing dealer
  contracts screen. Both salon code-link and legacy invitation service operations
  now reject with 403; hiding the salon form alone is not the authorization rule.
- Existing contracts, pending approvals, dealer registration, pricing, partner
  chat and orders remain intact. Salon staff can copy their public salon code.
- Render 10 order products per page, with 20/50 options and top/bottom navigation.
  Search, manufacturer/category/dealer filters and selected-only filtering reset
  the current page. Search respects IME and normalizes width/kana for comparison.
- Fetch the existing authorized all-dealer catalog, then filter locally. Keep
  cart quantities across pages, search, filters and dealer changes; totals and
  split-order submission use the full selected cart, never just the visible page.
- Quantity edits update only the row and summaries, retaining focus and scroll.
  Page clicks scroll to the list once only when necessary, not on later updates.
- Retain existing server-side contract/product/quantity/price validation and
  transactional split orders. Inventory filters do not hide the order catalog.
- A separately versioned salon client and scoped CSS preserve the dealer UI and
  old immutable assets. Keep the existing hydration-aware common salon shell.

No schema migration or production data edits. The API still returns the complete
authorized catalog; pagination bounds DOM rendering, not server catalog retrieval.

## Verification

- Runtime syntax, authorization guards, hydration and order invariants.
- Disposable PostgreSQL schema: blocked salon admin/staff registration and legacy
  invites, unchanged contracts, dealer registration, authorized catalogs, split
  totals and suspended contract rejection. Existing ERP integration also runs.
- Browser fixture: 3,947 products at 1360/390/320px, pagination, IME, width/kana
  search, filters, stable focus/scroll, complete split-order payload and amounts.
- Isolated full salon app: loading the new shell/client, mobile/desktop layout,
  link removal and existing dealer chats. Production checks are read-only.
