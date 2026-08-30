# LINE booking customer recovery v493

This protected child release repairs LINE booking creation when a LINE identity still points to a hidden, deleted, or otherwise unavailable customer record.

- Retries customer resolution without the stale customer ID only when the merge service reports `404`.
- Resolves or creates the customer from the name and phone entered in the LINE booking form.
- Preserves name-based duplicate merging and all non-404 safety conflicts.
- Lets the existing identity upsert rebind the LINE user to the recovered customer.
- Does not mutate existing LINE channel, LIFF, webhook, menu, staff, or booking settings.
