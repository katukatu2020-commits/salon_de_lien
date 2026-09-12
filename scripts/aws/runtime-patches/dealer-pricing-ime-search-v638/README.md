# Dealer pricing IME search v638

- Keeps the contract-pricing search field mounted while results refresh.
- Defers server-side searching until Japanese IME composition is complete.
- Preserves focus, selection, and Katakana conversion candidates.
- Replaces only the result count, pricing rows, pager, and save state.
- Keeps the existing pricing pagination and stale-request protection.
