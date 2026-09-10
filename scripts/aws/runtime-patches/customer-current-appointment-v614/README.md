# Customer current appointment v614

This protected runtime release removes completed appointments from customer-facing current reservation views.

It applies the same rule to `/u/appointments`, `/u/home`, and `/api/customer/mypage-summary`:

- terminal appointment statuses are excluded;
- an appointment linked to any `ServiceSale` is excluded even if its status is stale;
- checkout actions invalidate the customer appointment, home, and mypage caches immediately.

The integration test creates future-dated completed and active appointments in an isolated PostgreSQL schema. It verifies that only the unpaid active appointment is returned, and that removing a linked sale makes a stale active-status appointment eligible again.

The runtime verifier proves that only the two customer query bundles, the two checkout action bundles, `server.js`, and the new summary helper differ from the locked parent image. Existing receipt/POS runtime files are not modified.
