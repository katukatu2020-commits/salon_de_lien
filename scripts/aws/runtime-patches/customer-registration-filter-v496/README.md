# Customer registration filter v496

Protected child-image patch for the store-side customer list.

- Classifies a customer as app-registered only when an active `CUSTOMER`
  `AppUser` is connected directly or through the current store's
  `CustomerStoreLink`.
- Keeps booking-created records without an app account in the provisional
  chart group even when a name or phone number is present.
- Adds `All`, `App registered`, and `Provisional chart` segmented filters with
  counts and row badges.
- Applies filtering before the 50-row pagination and preserves the selection
  while searching or changing pages.
- Performs read-only, tenant-scoped lookups and does not mutate customer data.

Parent image: product catalog stability v495
(`sha256:de9d26acd86df58b777bd2adb48ead4f39ff978306892ba99e2c9654ad8019eb`).
