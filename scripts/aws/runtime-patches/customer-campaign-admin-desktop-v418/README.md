# Customer campaign and admin desktop v418

This immutable child-image patch is based on the exact ECS task 417 image.

- Replaces the customer home announcement card with an always-visible event and campaign entry.
- Keeps the existing tenant-scoped broadcast and coupon recipient ledger as the delivery backend.
- Clarifies the staff distribution page as event and campaign distribution.
- Uses the desktop admin shell at every viewport width and removes the admin-only mobile shell.
- Does not change Prisma schema, reservations, checkout, chat, customer authentication, or customer mobile navigation.
