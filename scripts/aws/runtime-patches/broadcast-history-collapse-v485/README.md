# Broadcast history collapse v485

Protected child-image patch on top of the approved v484 production release.

- Converts the broadcast-history card on `/admin/customers/messages` into an accessible native disclosure.
- Keeps the history closed on every initial page load and client navigation.
- Makes the complete header clickable and shows the number of available history rows while closed.
- Changes the label and rotates a Lucide chevron while open.
- Preserves every existing broadcast row and does not change delivery data or actions.
- Verifies closed, open, closed-again, and reload states in a real headless browser without writing application data.
