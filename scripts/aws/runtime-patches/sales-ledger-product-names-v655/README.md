# Sales ledger product names v655

Shows the products purchased in each salon-side accounting record.

- Returns the immutable product and manufacturer snapshots stored on each `ProductSaleLine`.
- Displays product name, manufacturer, quantity, line subtotal, and accounting-level product totals.
- Keeps legacy totals visible when an older response has no structured product lines.
- Includes product and manufacturer names in the existing accounting keyword search.
- Preserves historical names even when the current product master is renamed or removed.

The release is an immutable child of production v654.
