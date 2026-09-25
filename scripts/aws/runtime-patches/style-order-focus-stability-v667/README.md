# Style order focus stability v667

This protected runtime release tightens the v666 style-order interaction fix:

- Restores an in-progress `No.` value and focus in the same microtask as a list DOM replacement, before the next paint.
- Reattaches the style list and its management controls before paint instead of leaving a one-frame gap.
- Keeps the non-positional style-card hover treatment from v666.

The existing reorder API, page destination behavior, visibility controls, and delete controls remain unchanged.
