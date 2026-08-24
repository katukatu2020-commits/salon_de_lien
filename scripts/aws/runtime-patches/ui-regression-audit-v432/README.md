# UI regression audit v432

This immutable child release is intentionally narrow.

- Brings the standalone campaign management route into visual parity with the current admin shell.
- Removes the obsolete header search from that route.
- Adds the standard sidebar collapse control, notification entry, store identity, account and settings actions.
- Preserves campaign create, edit and delete behavior.
- Applies the selected admin dark theme on the standalone campaign route.
- Stops the setup helper from silently attempting a privileged inbound-email POST on every admin page; issuance remains available through the explicit setup action.
- Keeps large KPI values on one line and uses a compact number size until wide desktop viewports.
- Gives the sales ledger, store settings and account forms explicit accessible names without changing their values or submission behavior.
- Associates the customer search and recovery-email fields with clear accessible names in both source and the deployed runtime.
- Does not alter the customer mobile bottom navigation, appointment logic, data models or existing APIs.
