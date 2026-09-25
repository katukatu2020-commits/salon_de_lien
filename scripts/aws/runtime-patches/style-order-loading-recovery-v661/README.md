# Style order and loading recovery v661

- Keeps the style list on the page containing the newly assigned `No.` after a reorder.
- Persists local pagination state without triggering a document navigation or full-screen loader.
- Bounds style mutation requests so controls cannot remain disabled forever.
- Adds a root-layout watchdog that releases the full-screen loader when its runtime is missing or stalled.
- Releases public/dealer shells after DOM readiness instead of waiting indefinitely for every asset.
- Adds standalone-shell network fallbacks for the loading runtime.
