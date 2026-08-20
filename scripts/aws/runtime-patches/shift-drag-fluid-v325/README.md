# Shift drag fluid v325

Production runtime patch based on `shared-account-settings-v324`.

- commits drag changes only from the explicit `pointerup` path
- treats lost pointer capture and a transient `buttons=0` as cancellation
- keeps the appointment list immutable during pointer movement
- renders a `requestAnimationFrame` mouse-following preview and landing line
- hides the original appointment range while dragging
- resolves the destination from every visible staff lane, without nearby-row restrictions
