# Dealer order documents v656

Adds dealer-side documents and export tools to each received order.

- Delivery notes show only the list-price snapshot captured when the salon ordered.
- Invoices show list-price lines, one aggregate negative discount row, tax, and the final billed amount. Per-product discount rates are omitted.
- Each order can be exported as an Excel-friendly UTF-8 BOM CSV with manufacturer, product code, JAN, ordered quantity, delivered quantity, and list price.
- Delivery note, invoice, and CSV actions are available from both the order list and order-detail dialog.
- All document routes require a dealer session and enforce dealer ownership of the order.

The release includes deterministic document calculations, real PostgreSQL route tests, responsive browser checks, and production authentication smoke tests.
