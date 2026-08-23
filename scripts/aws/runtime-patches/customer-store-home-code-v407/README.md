# Customer store home code v407

Fixes the customer home failure after registering or switching to another
store. The signed customer session correctly points at the store-specific
`Customer` record, but the membership barcode is owned by the stable
`AppUser`. The previous lookup incorrectly required both IDs to match.

This patch is based on the immutable AWS v406 image and changes only
`/app/customer-links-v293.js`. It does not modify store links, customer data,
chat messages, reservations, or database schema.
