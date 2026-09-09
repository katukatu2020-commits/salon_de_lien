# Customer Style First Paint v606

Prevents the legacy community-post detail from flashing before the structured customer style UI is ready.

- Enters a customer-detail preflight state synchronously in the document head.
- Routes customer style-detail links through a full document navigation so the structured client initializes reliably after list-to-detail transitions.
- Keeps the legacy article visually hidden while structured style data is loading.
- Reveals the completed v605 layout in one paint after title, menu, gallery, stylist, and detail sections are mounted.
- Falls back to the original detail after an API failure or a ten-second safety timeout.

The release is layered only on the locked v605 image. Staff editing, source retention, style data, comments, favorites, receipt printing, and daily sales printing are unchanged.
