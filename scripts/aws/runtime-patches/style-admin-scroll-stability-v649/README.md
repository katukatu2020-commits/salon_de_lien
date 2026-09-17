# Style admin scroll stability v649

- Keeps staff style-list pagination inside the current document without triggering the application router.
- Preserves the existing router history state and captures the viewport before the asynchronous page request starts.
- Holds the rendered list height while per-post management controls are reattached after a page change.
- Restores the viewport once, synchronously after rendering, and removes the delayed double-scroll behavior.
- Disables browser scroll anchoring inside the replaced style-list region.
- Covers page 1 to 3 on desktop and mobile while emulating the delayed application-router scroll reset.
- Verifies the real production history wrapper and mobile layout after deployment.
