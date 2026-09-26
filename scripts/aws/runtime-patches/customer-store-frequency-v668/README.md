# Customer store frequency v668

Protected runtime child for customer store membership.

- Removes the five-store registration cap from the customer API and UI.
- Restores every eligible store membership that an older capped account could not display.
- Keeps explicitly unlinked stores excluded until the customer registers them again.
- Orders stores only by the customer's completed visit count, highest first.
- Shows the visit count on every store card so the ordering is transparent.

Verification covers PostgreSQL membership backfill, unlimited concurrent additions,
frequency ordering, exclusions, responsive browser behavior, and production route
protection.
