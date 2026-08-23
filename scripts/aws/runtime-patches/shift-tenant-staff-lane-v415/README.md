# Shift tenant staff lane v415

The schedule previously rendered the appointment card's assignee text independently from its lane assignment. The final server-side lane check used exact name equality, so spacing and kanji variants such as `渡邊` / `渡辺` / `渡邉` could display as a named booking while being placed in the free lane.

This immutable child image:

- resolves the lane against the active staff roster already loaded for the signed-in organization;
- normalizes Unicode, whitespace, and the supported Watanabe character variants;
- passes the matched stable staff key to the existing client schedule;
- preserves the task 414 customer-store session fix and every other runtime artifact.

Unknown names still fall back to the free lane instead of being assigned to a different staff member.
