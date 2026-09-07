# Admin shared page format v572

Moves the inventory ordering workspace and the sales ledger into the same native Next.js admin content root used by standard salon pages.

- Uses the existing `.admin-app-shell`, `.admin-main-content`, and `max-w-7xl` content container.
- Preserves the native product and analytics segmented navigation instead of rendering look-alike copies.
- Removes the fixed sales-ledger overlay and the separate inventory sibling layout.
- Keeps inventory, filtering, dialogs, and print behavior within their existing feature modules.
