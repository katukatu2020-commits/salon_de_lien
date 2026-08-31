# Customer experience v506

This release layers a hydration-safe loader onto the reviewed v505 production image.

- Refreshes the customer login layout and keeps `Powered by ORIMIA` consistent.
- Replaces the long booking menu dropdown with a searchable, categorized dialog.
- Forces a visible check mark for selected and confirmed appointment slots.
- Prevents the optional nickname helper from blocking profile submission.
- Loads the customer assets after page load without adding nodes to React's server HTML.
- Waits for an idle DOM before enhancing React output.
- Adds immutable customer assets and the `X-Lien-Customer-Experience: v506` readiness header.

The Docker build fails if the expected v505 server markers are missing. The protected workflow also aborts if the running ECR digest differs from the pinned parent digest.
