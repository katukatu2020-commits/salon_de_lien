# Owner billing tab v577

Keeps the owner analytics workspace tab selection synchronized with the current URL.

The billing tab is selected for `section=billing`, the sales ledger tab for `salesLedger=1`, and the analytics tab only for the base analytics view. The synchronizer also runs after client navigation, browser history restoration, and delayed route transitions.
