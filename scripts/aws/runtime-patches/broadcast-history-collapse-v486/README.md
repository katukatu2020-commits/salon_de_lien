# Broadcast history collapse v486

Protected child-image correction on top of the v485 release.

- Explicitly hides the history body whenever the native disclosure does not have the `open` attribute.
- Explicitly restores the history body while open, preventing shared application CSS from overriding native disclosure behavior.
- Preserves the compact count, open/close labels, Lucide chevron, and all broadcast rows from v485.
- Verifies the computed display state through close, open, close-again, and page reload in a real browser without writing application data.
