# Automatic split orders v622

Allows salon staff to select products from multiple connected dealers in one pass.

- Groups the order summary and confirmation by dealer.
- Creates one order and one order number per dealer automatically.
- Persists every dealer order in one database transaction to prevent partial submission.
- Keeps the existing single-dealer request format compatible.
- Preserves the v621 cross-dealer catalog and manufacturer filters.
- Does not change receipt-printer assets.
