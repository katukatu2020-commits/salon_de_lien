# Current-day business hours v491

This protected child release makes global operating-hour changes effective on the current day's shift table.

- Detects actual changes to opening time, closing time, or recurring closed weekdays.
- Synchronizes an existing current-day override with the newly saved global schedule.
- Preserves explicit future daily overrides and preserves the current day's reception capacity.
- Leaves unrelated store-profile saves from changing daily scheduling overrides.
- Repairs the known 2026-08-30 stale override through the existing reset-to-default API during the one-time production smoke.
