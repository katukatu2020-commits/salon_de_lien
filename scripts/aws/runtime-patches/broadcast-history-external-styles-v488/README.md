# Broadcast history external styles v488

Protected child-image release on top of v487.

- Keeps the working external disclosure stylesheet and moves the page to a cache-safe v488 URL.
- Keeps broadcast history closed by default while preserving all existing history rows.
- Waits for the reloaded DOM and stylesheet before asserting the default closed state.
- Performs browser-only read operations and does not modify broadcast data.
