# Stable shift drag v341

The appointment drag interaction now uses one window-level pointer stream without
capturing the pointer on the source card. During an active drag, every appointment
card is pointer-transparent so crossing another reservation cannot terminate or
restart the interaction.

The landing time is calculated from the live schedule-lane rectangle and the
original grab offset. Staff selection is calculated from all visible staff rows.
Only the matching primary-button `pointerup` persists the final preview; move,
hover, pointer-cancel, lost capture and window blur never save a reservation.
