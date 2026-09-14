# Search input stability v641

- Keeps the dealer product-management search field mounted while paged results refresh.
- Waits for Japanese IME composition to finish before requesting product results.
- Keeps dealer order, salon-contract, and salon wholesale search fields mounted while filtering.
- Preserves the existing IME-safe contract-pricing search behavior.
- Rejects stale product responses so an older query cannot replace newer results.
