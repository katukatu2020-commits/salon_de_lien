# Platform Usage Payments v679

Reviewed production parent: v678 (`sha256:2198247905a8cdfd3436f5594dd0e8e634714b70361ef1fce05b24894b67fc53`).

## Scope

- Platform-only `/platform/payments`, linked from the operator navigation and each salon/dealer row on the dashboard.
- Calendar-month/type/status/name filters, 20-account pagination, recorded billed/paid/outstanding totals and missing-record/failure counts.
- Independent profile per account ID, including branches sharing contacts: operator-confirmed first billing month, tax-inclusive monthly fee, optional due day/end month and debit setup completion.
- First billing month is bank transfer; later months are direct debit. Month-end/29th-31st days clamp to the actual calendar month. Exact per-month deadlines can be overridden without assuming banking holidays.
- Monthly manual confirmation of unpaid/partial/paid/debit-failed/exempt statuses, cumulative received amount, receipt date, actual receipt method and notes. Overdue is derived from the recorded deadline using Japan time. Transfer settlement after a failed debit is supported without rewriting the original planned payment method.
- Monthly amount/deadline snapshots never follow subsequent profile changes. Saved records have optimistic versions and full before/after operator audit history. Corrections require reasons. A recorded first billing month is locked once monthly history exists.
- Explicit preview/creation of a month's pending records for configured active accounts. Existing records are never overwritten and repeated/concurrent creation is idempotent. No implicit creation on GET or deployment.

## Boundaries

- This is manual fee tracking, not a bank API, debit execution, invoice sending, tax calculation or automatic payment reconciliation.
- Existing plan amounts are suggested tax-inclusive values, not evidence of payment. Operators confirm billing starts/amounts; unconfigured or unrecorded history is never presented as paid or confirmed unpaid.
- Per-month amounts can include adjustments, with audit reasons. Automatic SMS usage charges and historical balance migration are excluded.
- Payment statuses do not change account access, existing subscription states, dealer merchandise invoices, or bank details. Suspension remains the existing explicit operator action.
- No actual account numbers or payment credentials are stored here.

## Verification

`integration.mjs` creates and drops only its own random PostgreSQL schema. It tests real platform operator session verification, CSRF/role barriers, initial and subsequent months, partial/full/failed/recovered payments, revisions, repeated/concurrent creation, stale writes, immutable monthly amounts, stopped accounts, ended periods, leap years, escaping and dashboard integration.

`browser-regression.mjs` uses that synthetic fixture with desktop, 390px and 360px viewports. `production-smoke.mjs` is unauthenticated/read-only and never changes production billing records.
