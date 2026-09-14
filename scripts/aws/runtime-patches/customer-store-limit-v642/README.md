# Customer store limit v642

Protected runtime child for customer salon registrations.

- Limits each customer account to five registered salons.
- Enforces the limit in a serialized server transaction, including concurrent requests.
- Adds an unlink action without deleting salon-owned customer records or visit history.
- Prevents explicitly removed salons from being silently restored by old registration invitations.
- Moves the active session and canonical account to another linked salon when the current salon is removed.
- Shows the current count, disables adding at the limit, and explains that one salon must be removed first.

Verification covers real PostgreSQL transactions, concurrent additions, unlink/relink behavior, invite suppression, current-session replacement, last-store protection, and responsive browser behavior.
