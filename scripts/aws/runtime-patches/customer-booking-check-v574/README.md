# Customer booking check v574

This protected child release corrects the selected time-slot indicator in the customer booking table.

- Keeps the existing availability table and booking behavior unchanged.
- Suppresses the original availability symbol while a slot is selected or confirmed.
- Positions the generated check mark over the full cell so it remains centered on desktop and mobile.
- Covers both the temporary selected state and the green confirmed state.
- Cache-busts the existing customer experience stylesheet so returning customers receive the fix immediately.
