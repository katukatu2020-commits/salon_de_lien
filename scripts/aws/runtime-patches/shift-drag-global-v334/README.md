# Shift drag global v334

Dragging no longer relies on React pointer handlers attached only to the source
appointment card. Pointer move, up, and cancel events are tracked at the window
capture phase from pointer-down until cleanup.

This keeps movement continuous across distant staff rows, ignores transient
buttonless move events, and commits only on the explicit pointer-up event. Lost
pointer capture cannot prematurely cancel or commit the reservation.
