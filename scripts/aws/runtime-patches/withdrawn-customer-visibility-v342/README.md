# Withdrawn customer visibility v342

- Excludes withdrawn customers from store chat in addition to the existing customer list/detail filters.
- Deactivates every customer login and revokes every portal link when a customer withdraws.
- Repairs legacy withdrawn customers that still have an active login.
- Adds a read-only platform-operator customer registry and customer record page.
- Retains `Customer.deletedAt` and historical appointments, visits and sales; no customer rows are hard-deleted.
