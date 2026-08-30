# Store-wide campaigns v498

Makes advertising campaigns tenant-wide content instead of a fixed recipient delivery.

- Active campaigns are visible to every signed-in customer linked to the campaign's store.
- Customers linked after publication see existing active campaigns immediately.
- Customer campaign images use the same store and publication-window authorization.
- Stale demographic payloads are ignored by the API, and existing demographic fields no longer gate reads.
- The admin campaign form removes gender and age targeting and labels the audience as all registered customers.
- Campaign creation remains valid even when the store currently has no customer records.
- Coupons and ordinary targeted broadcasts are unchanged.

`local-integration.mjs` verifies against a disposable local campaign that a customer with no recipient row can see the campaign on both home and campaign pages. It removes its test row in `finally`.
