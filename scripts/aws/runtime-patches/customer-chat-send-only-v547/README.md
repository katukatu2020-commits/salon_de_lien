# Customer chat send-only v547

- Removes the legacy `v466` edit/delete control loader from the customer chat route.
- Renders customer chat messages as read-only and removes stale action controls defensively.
- Keeps the staff chat management runtime unchanged.
- Refreshes the customer account layout asset so existing browser caches receive the fix.
- Includes HTTP integration and mobile browser regression coverage for the customer chat route.
