# Broadcast history external styles v487

Protected child-image correction on top of the v486 release.

- Moves the disclosure rules from an escaped inline style element to a same-origin stylesheet.
- Keeps the broadcast history closed by default and explicitly hides the history body while closed.
- Preserves all broadcast rows and the compact count, labels, and chevron from v485/v486.
- Smoke-tests the stylesheet response and the complete browser interaction without writing application data.
