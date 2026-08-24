# Notification target integrity v434

This immutable child patch is based on the protected v433 production image.

It keeps the shared staff notification panel from publishing links to customer records that the current store can no longer open. Deleted, merged, or store-hidden customers are excluded consistently from customer-registration notifications, duplicate-customer notifications, appointment notifications, and chat notification counts.

Existing authorization remains unchanged. The patch does not expose inaccessible records, delete notification history, alter customer data, or replace any unrelated runtime feature.
