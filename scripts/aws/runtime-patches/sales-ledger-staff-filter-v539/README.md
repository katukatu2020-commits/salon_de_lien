# Sales ledger staff filter v539

This runtime patch adds a staff filter directly to the daily sales summary.

- Changing the staff selection immediately reloads and recalculates all daily totals and KPIs.
- The existing server-side exact staff filter remains the single source of report data.
- The selected staff name is included in the report caption and therefore remains visible when printing.
- Interactive controls are hidden in print output while the filtered table and totals remain visible.
- The payment detail modal remains scoped to the selected staff and date.

The patch is applied on top of the protected `sales-ledger-detail-modal-v538` production image.
