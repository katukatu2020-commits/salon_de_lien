# Release 292: provisional customer claim

This runtime-only release preserves the approved AWS application image and changes only the customer registration server action.

- A QR-origin registration is linked to the older provisional customer only when organization, customer source, normalized phone, and normalized name all match.
- A verified SMS registration may use a unique normalized-phone match as a fallback.
- The new login account and profile are moved onto the provisional customer inside the same database transaction.
- Existing appointments, visits, sales, and point ledger rows remain attached to the original customer ID.
- Ambiguous candidates are not merged.
