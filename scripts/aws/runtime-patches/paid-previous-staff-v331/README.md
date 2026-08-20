# Paid previous staff v331

The customer list previously inferred the previous stylist from visits, past
appointments, or a manual assignment. That displayed a stylist even when the
customer had no completed checkout.

This patch:

- derives the customer-list previous stylist only from the newest `ServiceSale`;
- reads the stylist from the sale's linked appointment;
- displays `未登録` when no completed checkout (or linked stylist) exists;
- applies the same paid-sale-only rule to stylist-based automated coupons.
