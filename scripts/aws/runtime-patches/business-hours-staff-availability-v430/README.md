# Business hours and staff availability v430

This protected child release fixes two scheduling regressions without replacing the AWS application bundle.

- Waits for the organization business schedule before showing the shift grid.
- Invalidates the cached daily schedule when base business hours change.
- Carries new base hours into future daily rows that were still inheriting the previous hours.
- Separates store-wide reception capacity from the selected stylist's own overlapping reservations.
- Uses one availability policy for calendar display and final booking submission.
- Keeps explicit daily hours, recurring staff days off, and manual reception stops intact.
