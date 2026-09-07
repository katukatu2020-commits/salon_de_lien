# Dealer contract pricing v581

This protected runtime release adds salon-specific dealer catalog pricing.

- Stores product availability and discount rates per dealer contract and product.
- Lets dealers select a salon, publish products, and apply a discount rate in bulk.
- Shows only configured products in the salon ordering workspace, with dealer, list price, discount rate, contract unit price, order unit, and quantity.
- Calculates contract prices on the server and rejects stale, unconfigured, or cross-dealer product submissions.
- Snapshots list price, discount rate, and unit price on every order line so historical orders do not change when a contract is updated.
- Preserves the shared salon application layout on desktop and mobile.
