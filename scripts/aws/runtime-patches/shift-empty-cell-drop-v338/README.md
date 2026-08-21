# Shift empty-cell drop v338

Fixes shift-board appointment movement so an empty schedule cell is a complete
drop target. Drag previews and final drops derive their destination from the
pointer coordinates and all staff lane rectangles instead of the element under
the cursor.

The pointer-up handler recalculates the landing position before persisting it,
so a missing final pointer-move event over an empty cell cannot leave the
appointment at an earlier card target. The appointments chunk is published
under a new name to bypass immutable browser caches.
