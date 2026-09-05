# Wholesale ordering v543

Moves inventory operations out of store settings and adds a complete salon-to-dealer ordering workflow.

## Salon workflow

- The product shelf gains a prominent `在庫管理・発注` entry beside product registration.
- The legacy inventory table is removed from store settings.
- `発注`, `棚卸し`, and `発注履歴` share one operational page.
- Product image, maker, category, current stock, previous order, order unit, quantity, desired delivery date, and note are visible before submission.
- Inventory adjustments are organization-scoped and audit logged.

## Dealer workflow

- Salon owners create a dealer connection request.
- A new dealer receives a one-time setup URL valid for 72 hours and registers company/contact details and a password.
- An existing dealer approves a new salon contract from the dealer portal.
- Dealer sessions use a separate signed, HttpOnly, SameSite cookie.
- Orders move through `ORDERED`, `ACCEPTED`, `SHIPPED`, and `DELIVERED`; cancellation is permitted before shipment.
- Dealer staff can confirm product/JAN codes, delivered quantity, and wholesale unit price.

## Delivery note

- Each order has a printable A4 delivery note.
- The note contains salon/dealer identity, order and delivery numbers, quantities, prices, tax, total, and notes.
- This release does not create or process payments.

The runtime image is pinned to the approved v542 production digest. Tables are created idempotently at startup and all reads/writes remain tenant scoped.
