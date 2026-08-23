# Customer withdrawal re-registration v410

This immutable runtime patch is based on the exact production v409 image.

- A withdrawal still soft-deletes the customer record and preserves business history.
- Customer login email, login ID, password hash, and phone identity are released inside the withdrawal transaction.
- Startup repairs earlier withdrawn accounts that retained those unique credentials.
- Active customer accounts remain protected from duplicate registration.

The patch changes only the dedicated customer-withdrawal runtime service.
