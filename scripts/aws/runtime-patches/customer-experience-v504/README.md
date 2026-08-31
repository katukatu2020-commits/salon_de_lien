# Customer experience v504

This release layers the customer-facing fixes onto the reviewed v503 production image.

- Refreshes the customer login layout and keeps `Powered by ORIMIA` consistent.
- Replaces the long booking menu dropdown with a searchable, categorized dialog.
- Forces a visible check mark for selected and confirmed appointment slots.
- Prevents the optional nickname helper from blocking profile submission.
- Adds immutable customer assets and the `X-Lien-Customer-Experience: v504` readiness header.

The Docker build fails if the expected v503 server markers are missing. The protected workflow also aborts if the running ECR digest differs from the pinned parent digest.
