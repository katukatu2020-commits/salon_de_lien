# Business hours and staff availability v431

This corrective child release preserves explicit per-day schedule overrides.

- Keeps the v430 business-hours hydration and cache invalidation fixes.
- Keeps the v430 store-wide and selected-stylist availability separation.
- Removes the overly broad propagation into `OrganizationDailySchedule` rows, because those rows are explicit day overrides rather than inherited cache records.
- Continues to update staff booking hours when the organization base hours are saved.
