# Shift customer search v662

Adds an IME-safe, partial-match customer combobox to the manual reservation dialog opened from the salon shift schedule.

- Matches normalized customer names and phone numbers without requiring spaces.
- Treats hiragana, full-width katakana, and half-width katakana consistently.
- Keeps the existing `customerId` form contract and manual reservation API unchanged.
- Supports pointer, keyboard, composition input, mobile layout, and existing/new/code/break modes.
