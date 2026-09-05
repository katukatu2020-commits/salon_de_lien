# Sales ledger month filter v534

Adds a first-class monthly filter to the store-side sales ledger while preserving the existing custom date and detail filters.

- Defaults to the current month in Japan Standard Time.
- Converts a selected month into inclusive month-start and month-end API bounds.
- Provides previous month, next month, and current month controls.
- Keeps manual date ranges synchronized with the month selector.
- Prevents stale responses from rapid month changes from replacing the latest results.
- Keeps the existing organization-scoped sales API and audit/edit behavior unchanged.
