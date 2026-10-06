# Staff Work Calendar v704

## Existing System

- StaffAttendancePolicy stored default attendance times, separate from booking.
- StaffBookingSetting stored booking hours and recurring weekdays off.
- OrganizationDailySchedule stored store hours; StaffScheduleBreak stored breaks.
- None represented a staff-specific dated shift. No duplicate attendance records
  are created: planned work remains separate from actual clock-in/out records.

## Changes

- Standard-time tab opens a month calendar, with day links to the existing
  attendance page and per-person default/work/day-off controls (5-minute input).
- Editable window is today through the same date three calendar months ahead,
  clamped to the end of short months. Existing customer 90-day booking limit stays.
- Staff can read; ADMIN owners can save. Server checks tenant membership, origin,
  dates, input, revision, and newly invalidated existing bookings.
- Additive StaffDailySchedule migration only; no backfill or destructive changes.
  Runtime boot applies the same idempotent SQL before serving requests.
- Resolve dated override, then attendance policy, then existing booking hours.
  Recurring staff days off are inherited unless explicitly overridden for a day.
  Store opening/closure and booking capacity rules still apply separately.
- Share resolver across customer availability AND booking transaction, LINE
  booking, salon manual/rescheduled reservations, SSR shift data and break bounds.
- Calendar writes and booking writes take the same tenant/date transaction lock.
  Optimistic revision includes both dated shifts and base attendance policies.
- Existing reservations are never deleted or moved by scheduling.

## Verification

- runtime-tests.cjs: date validation, month-end/leap/year boundaries, default/day
  overrides, holidays, cross-tenant input, roles/origin, existing booking conflicts.
- browser-regression.mjs: guarded isolated QA database, desktop/mobile, day save,
  customer named/free availability, server booking rejection, shift SSR data,
  break bounds, stale-write protection, existing-reservation protection, reset.
- QA fixtures are removed and prior default settings restored in finally blocks.
- Existing runtime verifications and source typecheck/lint/test/build.
- Protected release pins v703. Production smoke only reads health/assets/auth.

External reservation-mail imports remain factual records, not newly created
online booking requests, so their contents are not silently discarded for being
outside a planned shift. Review such existing conflicts on the reservation page.
