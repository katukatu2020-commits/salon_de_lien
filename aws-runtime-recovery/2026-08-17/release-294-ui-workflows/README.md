# Release 294: focused UI workflow corrections

This is a runtime-only child image of the exact AWS release 293 image. It changes only:

- removal of the SMS-consent status panel from customer charts;
- 10-minute treatment-duration editing while preserving legacy 5-minute menu durations;
- removal of store identifiers from product-page settings dialogs;
- refined read/unread notification history with an unread-only filter;
- customer chat staff directory and empty-conversation workflow.

The build asserts hashes for every modified release-293 parent file and fails closed when the parent differs.
