# Coupon broadcast delivery v525

Fixes the customer coupon distribution failure reported with Next.js digest `474550698`.

- Removes the unsupported bulk SMS option from the customer message and coupon form.
- Keeps app inbox and registered email as the supported broadcast methods.
- Converts stale forms that still submit `deliveryMethod=sms` to app delivery before validation, so an open pre-release tab cannot trigger the server exception.
- Preserves SMS usage for customer-requested authentication and consented transactional appointment notifications only.
- Production smoke checks are read-only and never distribute a coupon or message.
