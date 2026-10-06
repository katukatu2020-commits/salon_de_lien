# Bulk booking capacity v705

Extends the existing salon business-days calendar and its existing API. No new
tables, columns, dependencies or duplicate booking limits are introduced.

- The owner can select an inclusive date range, weekdays and a capacity of 1-99.
- The UI defaults to the displayed month (today onward for the current month).
- At most 366 days per operation; invalid dates and empty selections are rejected.
- Capacity-only updates preserve date-specific opening hours and closed days.
  A previously unconfigured day snapshots its current default hours/holiday,
  consistent with the existing OrganizationDailySchedule override semantics.
- Owner authorization, tenant isolation and same-origin validation are enforced
  server-side. Input organization IDs are never used.
- All selected days are locked in chronological order using the v704 booking lock.
  Existing manual day writes use that lock too. Preflight and updates run in one
  transaction. Reductions below existing peak simultaneous reservations reject
  the complete operation; reservations themselves are never changed.
- Existing staff availability and time-slot limits still apply. Increasing the
  store limit does not extend staff working hours or override staff capacity.
- The shift summary previously discarded the daily capacity from its fetched
  schedule. Both server and browser renderers now clamp the staff total by that
  limit, and recalculate on schedule changes. An immutable versioned chunk retains
  the v700 checkout colors and existing interactions.
- Unsaved day edits prevent a bulk save. Saving does not reload the page or discard
  pending default opening-hours edits. Normal day editing/reset remains available.

## Verification

`node runtime-tests.cjs` covers date ranges, leap/month/year boundaries, weekday
selection, invalid input, role/origin, tenant-scoped writes, reservation overlap,
capacity-only SQL and all-or-nothing preflight.

`browser-regression.mjs` uses only the guarded isolated QA database and restores
all modified schedules and test reservations in `finally`. It verifies real API
and browser saves, desktop/mobile, customer slots and rejection on submission.

Deploy only through `deploy-bulk-booking-capacity-v705.yml`, pinned to the approved
v704 digest. Retain all runtime regression checks, source typecheck/lint/test/build,
production read-only smoke and automatic rollback. No local AWS mutations.
