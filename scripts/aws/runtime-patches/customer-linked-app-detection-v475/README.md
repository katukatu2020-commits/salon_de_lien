# Customer linked app detection v475

Protected child-image patch for customer records added from another registered store.

- Treats an active customer account connected through `CustomerStoreLink` as app-registered.
- Keeps the lookup scoped to the current customer record and organization.
- Reuses the existing registered-account result for QR visibility and registered email display.
- Prevents an already registered cross-store customer from receiving a second registration QR.

Parent image: customer code link v474 (`sha256:b97d2974090c61cfdbef3578cc646fb178821b118ffe7a3ebc239d3babca6f16`).
