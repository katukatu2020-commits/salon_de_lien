# Coupon email delivery v613

Fixes the store distribution page when a coupon is sent by registered email.

## Root cause

The broadcast action selected provisional store customer records as well as customer app accounts. It then threw a server-action exception whenever any selected record had no active customer account email. Next.js rendered that expected eligibility condition as a generic application error with a Digest.

## Behavior

- Registered-email delivery automatically excludes customers without an active customer account email.
- Coupon issues and broadcast recipients use that same eligible customer set.
- The page shows email-eligible and unregistered counts.
- The individual-recipient modal exposes email eligibility and disables ineligible rows in email mode.
- Zero eligible recipients and email provider partial failures return an in-page result instead of a server exception.
- App delivery behavior and the receipt-print runtime are unchanged.

## Verification

- Runtime isolation and exact parent reversal checks
- Compiled action/page structural integration checks
- Real local database server-action regression with a mixed recipient set and coupon issuance
- Desktop and mobile Playwright checks without submitting a production broadcast
