# Checkout service rows and reservation email v701

## Changes
- The original reserved service is a normal editable/removable checkout line. No separate retained base service or charge remains. Removing a line updates the subtotal, payment, saved booking, and receipt. Empty checkout is rejected; product-only checkout is supported.
- A booking-specific React key and runtime form identity prevent draft state leaking between bookings. Only active menus belonging to the authenticated salon are offered. Manual service entry remains available.
- One shared parser reads dedicated menu/price fields, all service lines and explicit post-change sections. Coupons, quoted history and previous sections are not appended to service names. Catalog-price and coupon-number guesses are removed.
- Unknown/conflicting menu or price is marked for review; checkout requires acknowledgement on both client and server. A changed menu without a readable amount clears the previous amount instead of silently reusing it.
- Gmail, SES and manual import preserve omitted partial details but reject paid-booking overwrite and cross-provider ID collisions. SES reference matching is exact, not prefix-only.

## Compatibility
No schema migration or changes to historical paid records. Existing appointment/sale fields, authentication, stock, points, coupon and v700 print/shift behavior are retained. The production image contains older compiled/runtime extensions, so bounded patches for its actual served copies accompany source changes.

## Verification
- Existing source-check Dockerfile: typecheck, lint, 63 tests, production build.
- Runtime tests: parser, Gmail/SES/manual import, missing/changed/ambiguous fields, paid guard, exact reference, provider boundary.
- Isolated QA browser test: removal and zero total, catalog/manual selection, focus stability, desktop/mobile, server review enforcement, saved booking/sale/receipt, fresh booking state.
- v700 browser regression: pink/yellow shift and one-click print/return flows.
- Production smoke only reads health/static assets/authentication boundaries. No production customers, bookings, sales or mail were created for testing.

## Limits
Historical incorrect bookings are not bulk-guessed or rewritten. Staff can correct them through checkout. Combined menu names remain one line when no trustworthy per-service price breakdown exists. Unknown provider templates need an anonymized real email sample to extend the parser reliably. Native printer paper output still needs an on-site check as documented in v700.
