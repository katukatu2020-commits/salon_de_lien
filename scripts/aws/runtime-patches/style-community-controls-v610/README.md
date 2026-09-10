# Style community controls v610

Protected runtime child for the customer style-sharing list and the store style editor.

- Adds a customer-only filter for posts liked by the signed-in customer.
- Keeps sort, stylist, and gender filters; removes age and course filters.
- Builds stylist options from active staff and every visible post so imported or legacy names are not omitted.
- Adds editable style gender and a per-post stylist photo to the store editor.
- Re-encodes uploaded JPG, PNG, or WebP files and stores them in the private encrypted asset bucket.

The release is pinned to the reviewed v609 production image. Runtime isolation verification permits only the server entrypoint and style resolver change plus the three v610 assets.
