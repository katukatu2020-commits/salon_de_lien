# Customer experience v505

This release layers a hydration-safe startup onto the reviewed v504 production image.

- Refreshes the customer login layout and keeps `Powered by ORIMIA` consistent.
- Replaces the long booking menu dropdown with a searchable, categorized dialog.
- Forces a visible check mark for selected and confirmed appointment slots.
- Prevents the optional nickname helper from blocking profile submission.
- Waits for the production page load and an idle DOM before enhancing React output.
- Adds immutable customer assets and the `X-Lien-Customer-Experience: v505` readiness header.

The Docker build fails if the expected v504 server markers are missing. The protected workflow also aborts if the running ECR digest differs from the pinned parent digest.
