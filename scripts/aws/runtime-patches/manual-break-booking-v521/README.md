# Manual break booking v521

- Adds a dedicated `休憩として登録` checkbox to the phone/store booking modal.
- Shows only the staff, start-time, and end-time fields while break mode is selected.
- Persists the break through the existing serialized staff-break API, retaining appointment-overlap validation.
- Removes the retired break entry from the treatment-menu selector.
- Refreshes the shift table after a successful break registration.

Parent image: customer staff booking v520 (`sha256:2d0efb38045850171a85893d76b65e191ba98e739f6f6a17c44a83e84f5911`).
