# Dealer contact v693

Immutable child of v692. Salon ordering exposes a contact dialog from each active contracted dealer name, using a fresh authenticated lookup. Assigned active member name/phone and company phone are separate; no other staff or authentication data is returned. Telephone links retain the existing chat entry. Missing contact and retry states are explicit.

Dealer administrators can set optional staff telephone numbers in staff management. Additive `DealerSalesMember.phone` migration is idempotent. Old clients omitting the field preserve it; an explicit blank clears it. Japanese full-width digits/hyphens normalize; invalid telephone strings reject transactionally. No real contacts are seeded or inferred.

Checks: runtime syntax and v692 compatibility, random-schema integration (all schema cleanup on exit), Playwright desktop/390/320 dialog and staff editing, tenant isolation, assignment changes, disabled members/dealers/contracts, CSRF, empty phones, retry/close races and cart/focus preservation. Production smoke is read-only.

Deployment: protected GitHub OIDC workflow only, digest-locked v692 parent. Rollback to the previous task leaves the nullable unused phone column intact. Existing orders, contracts and company contacts are unchanged.
