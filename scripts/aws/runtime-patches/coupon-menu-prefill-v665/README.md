# Coupon menu prefill v665

- Resolves a coupon's first applicable target against the salon's live booking menu options.
- Prefers the base menu for broad targets such as 'カット', avoiding student and add-on variants.
- Selects the native controlled menu and advances the existing customer booking journey to step 2.
- Keeps the coupon query parameter and existing booking discount calculation intact.
- Leaves all-menu coupons on step 1 because they do not identify one specific treatment.
