# Sales ledger detail modal v538

This runtime patch changes the sales ledger payment details from a permanent section below the daily summary into a date-scoped modal.

- A payment detail dialog opens only when a date in the daily sales summary is selected.
- The dialog keeps individual correction, multi-select, and bulk correction actions.
- Closing a correction dialog returns the user to the selected day's payment details.
- Desktop and mobile layouts keep table scrolling inside the dialog.

The patch is applied on top of the protected `sales-ledger-daily-summary-v537` production image.
