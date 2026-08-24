# Owner billing header first paint v423

Immutable child patch for the approved v422 production image.

- Removes the obsolete customer search control from the server-rendered admin header.
- Applies the same markup to the hydration chunk to avoid a mismatch.
- Moves the active layout to a new chunk URL so immutable browser caches cannot retain the old header.
- Refreshes the commercial admin runtime cache key without changing its behavior.

No reservation, customer, chat, billing, database, or API logic is changed.
