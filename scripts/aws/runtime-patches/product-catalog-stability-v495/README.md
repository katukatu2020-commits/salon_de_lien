# Product catalog stability v495

This protected child release removes the remaining request loop on the staff product catalog.

- Fetches product image metadata once per product-page visit and reuses the result for DOM reconciliation.
- Coalesces repeated mutation callbacks into one animation-frame update.
- Caches notification data between the intended 30-second refreshes instead of refetching on every DOM change.
- Shares in-flight store and staff profile requests instead of starting duplicates during first render.
- Retains the v494 product submission recovery, browser validation, busy state, and API error feedback.
- Does not change existing products, prices, stock, images, menus, or store settings.
