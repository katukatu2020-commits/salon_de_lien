# Staff Break Drag v702

Extends the deployed v461 break controller inside both the root client and the
currently served v684 appointment bundle. Keeps the existing ORIMIA timetable,
manual-break form, v701 checkout editor, and appointment interactions.

- Move a break by dragging its body, or resize its start/end with separate grips.
- Live pointer preview; 15-minute snapping and staff/business-hour bounds.
- Mouse and touch support, keyboard arrows, Escape/cancel rollback.
- Save once through the existing PATCH endpoint without reloading the page.
- Preserve the previous values and display the server error if saving fails.
- Refresh the break renderer after saving and bind new grips without debounced
  observer starvation. Reject stale date responses and preserve keyboard focus.
- Hide the existing empty-slot hover marker while hovering over a break.

No database migration or permission change. StaffScheduleBreak and the existing
organization-scoped, same-origin, serializable update transaction are reused.
The server still rejects booking/break overlap and times outside staff hours.

## Verification

`npm test` includes five pure drag-boundary tests (68 source tests total).
`verify-runtime.mjs` checks both deployed bundles and eleven API regression cases.
`browser-regression.mjs` uses authenticated, isolated QA only, guards the database,
creates temporary breaks through the API, and removes only those fixtures.
It exercises mouse/touch movement, both edges, rejection rollback and persistence.
Screenshots are written to `artifacts/staff-break-drag-v702/`.

The protected v702 workflow pins the reviewed v701 parent digest and runs source
typecheck/lint/tests/build and prior runtime regressions before deployment.
Production smoke is read-only; no real reservations or breaks are modified.
