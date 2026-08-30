# Customer public code parity v476

Protected child-image patch that makes the staff-facing customer code match the customer app membership code.

- Resolves `AppUser.customerPublicCode` for direct and cross-store customer records.
- Uses the public code in both customer-list layouts and the customer detail page.
- Uses the same code for referral and default offer codes.
- Keeps the existing customer-record-derived code only for customers without an app account.
- Scopes bulk lookups to the current organization and visible customer IDs.

Parent image: customer linked app detection v475 (`sha256:4711535be1eb0f95184760e9cceab62e730dc634a94a1e10bd6020db0d1bc2e7`).
