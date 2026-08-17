# Runtime release 290

This is a protected derivative of ECS task 289 and its immutable ECR digest.
It does not copy the local Next.js application into AWS.

Scope:

- keep staff-facing profile copy only in Staff Management
- restore point/coupon settings on the distribution page only
- bind manual reservations to the tenant menu catalog and authoritative price
- suppress duplicate registration notifications for store inflows
- improve store-icon feedback without crossing organization boundaries
- show the tenant-specific immutable Hotpepper inbound address
- de-duplicate customer chat staff/rooms and show staff avatars or fallbacks

The Docker build applies `patch-runtime.mjs` to the current AWS image and runs
`verify-runtime.cjs` before producing the child image.
