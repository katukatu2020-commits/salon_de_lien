# Admin chat read position v580

This protected runtime release places the read state and timestamp to the left of
each outgoing salon chat bubble.

- Keeps incoming customer message metadata on the right.
- Preserves the existing per-message `customerLastReadAt` read-state logic.
- Uses an explicit flex direction so the layout does not depend on a runtime-only
  Tailwind class being present in the prebuilt stylesheet.
- Verifies desktop and mobile geometry with browser screenshots.
