# Customer experience v508

This release layers the final customer experience fixes onto the reviewed v507 production image.

- Refreshes the customer login layout and keeps `Powered by ORIMIA` consistent.
- Replaces the long booking menu dropdown with a searchable, categorized dialog.
- Forces a visible check mark for selected and confirmed appointment slots.
- Prevents the optional nickname helper from blocking profile submission.
- Loads the customer assets after page load without adding nodes to React's server HTML.
- Waits for an idle DOM before enhancing React output.
- Publishes the current customer layout under a new immutable URL so browsers cannot reuse the stale `Salon de Lien` layout during hydration.
- Removes the temporary React hydration diagnostic used in v507.
- Adds immutable customer assets and the `X-Lien-Customer-Experience: v508` readiness header.

The Docker build fails if the expected v507 server markers are missing. The protected workflow also aborts if the running ECR digest differs from the pinned parent digest.
