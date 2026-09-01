# Customer registration profile v533

This release fixes customer account registration when the browser submits visually complete fields in a different representation.

- Japanese mobile numbers accept full-width digits and punctuation consistently in the SMS and final registration routes.
- Cached profile labels are canonicalized to current values.
- Optional hair and service-preference fields no longer block account creation when a browser omits them.
- Invalid phone numbers and birth dates show specific corrective messages instead of the generic profile error.
- The existing atomic customer, account, phone identity, points, and invitation transaction remains intact.
