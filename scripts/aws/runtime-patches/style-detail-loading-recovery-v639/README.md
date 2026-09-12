# Style detail loading recovery v639

- Reveals a rendered style-detail shell without waiting for an unrelated admin or customer enhancement event.
- Makes the loader safety timeout independent of animation-frame completion.
- Invalidates stale reveal callbacks across rapid route changes.
- Announces structured style readiness to the global navigation loader.
- Falls back from an unresponsive style-detail API request after seven seconds.
- Preserves style data, publishing controls, comments, ordering, and all v638 behavior.
