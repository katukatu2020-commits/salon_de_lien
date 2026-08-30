# Customer name auto merge v489

This immutable child-image patch resolves booking customers through one shared service.

- Matching is limited to one organization.
- Names are normalized with NFKC, case folding, whitespace removal, and common hyphen removal.
- LINE, customer-app, manual, customer-code, Gmail, and inbound-mail bookings use the same resolver.
- Duplicate charts move booking, visit, checkout, point, chat, campaign, style, account-link, and LINE identity data into one canonical chart.
- PostgreSQL advisory locks serialize concurrent bookings for the same normalized name.
- Active customer-app access is preserved when selecting the canonical chart.

`integration-test.mjs` exercises the merge against PostgreSQL and verifies that a second organization with the same normalized name remains untouched.
