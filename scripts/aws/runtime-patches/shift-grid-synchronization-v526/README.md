# Shift grid synchronization v526

Keeps the shift summary rows and staff lanes on one shared timeline.

- Measures the rendered `.shift-canvas` content width without border or integer-rounding drift.
- Attaches the width observer after the business-hours loading placeholder has been replaced by the timeline.
- Uses 60-minute compact slots only when they divide the business day exactly.
- Publishes the React-rendered summary slot count as the canonical CSS grid variable.
- Prevents the legacy tenant enhancement from restoring a separate fixed 30-minute lane grid.
- Cache-busts the appointments client chunk.

`smoke-production.mjs` verifies the release marker and tests alignment at desktop, sidebar-collapsed, mobile, and half-hour closing-time layouts.
