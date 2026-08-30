# Customer code link v474

Protected child-image patch for the staff-side customer membership-code flow.

- Removes request-time schema mutations that can block the first lookup.
- Resolves a membership code through the account's canonical or linked customer records.
- Verifies the persisted `CustomerStoreLink` before returning success.
- Bounds UI requests and restores the lookup control after success, error, or timeout.
- Verifies the same linked customer from both staff and customer registered-store APIs.

Parent image: customer login email v473 (`sha256:ba14cd231542ed3e7fa741a846f793d1f0c302de93953f1d0c3d2175611a7884`).
