# Style community rerender v611

Follow-up release for the v610 customer style filters.

- Re-suppresses the legacy age/course filter and grid after React redraws them.
- Keeps the v610 liked-only, gender, stylist-union, and staff photo editing behavior unchanged.
- Busts the immutable customer script URL and adds a v611 readiness marker.
- Browser coverage deliberately reveals the legacy filter, triggers a DOM redraw, and verifies it is hidden again.
