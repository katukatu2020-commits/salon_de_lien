# Campaign Discount v697

Fixes the menu-only campaign booking integration: the campaign rate was absent
from customer pricing and was never persisted with the appointment.

- Fetch the actual published campaign rate in the tenant-scoped context.
- Show campaign discount before points in booking confirmation.
- A selected ordinary coupon replaces the campaign discount; points apply to
  the resulting amount. Stamp-free benefits remain supported.
- Validate the campaign and save its snapshot, discounted appointment price,
  coupon allocation and point ledger inside the booking transaction.
- Reject expired, wrong-menu and changed-rate campaign bookings. Retain existing
  coupon eligibility, point caps, idempotency, cancellation refunds and settlement.
- Show the campaign breakdown on salon appointment checkout without applying it twice.
- Historical appointments without a campaign snapshot are not rewritten.

Validation: runtime assertions, isolated PostgreSQL integration, browser fixture
at 1360/390/320px, plus real isolated customer booking and salon checkout display.
Example: JPY 5,500 at 20% off = JPY 4,400; 120 points = JPY 4,280.
Release through the protected GitHub OIDC workflow only. No production test bookings.
