# Customer store selection v340

- Removes implicit `CustomerStoreLink` creation during ordinary customer registration and page views.
- Keeps the customer's current technical store context visible for its icon and staff directory without claiming that the store is registered.
- Creates `store_inflow` only through the existing explicit store-code linking action.
- Removes deterministic legacy auto-links (`customer-store-link-{customerId}`) while preserving explicit/random store links.
