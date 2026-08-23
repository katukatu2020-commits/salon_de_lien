# Automated coupon stylist selector v412

Keeps the production v411 image intact and fixes only the previous-stylist selector on the customer broadcast page.

- Builds candidates from active booking settings and active organization staff accounts.
- Excludes staff marked inactive or on leave.
- Uses the same tenant-scoped candidate query when saving a rule.
- Rebinds the conditional field UI safely after navigation or hydration.
