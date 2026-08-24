# Customer photo resilience v433

This immutable child patch is based on the protected v432 production image.

It prevents a stale or malformed private customer-photo reference from taking down an entire customer record. A failed private URL resolution is logged without the customer ID or object key, and that one image falls back to an unavailable state.

It also converts a tenant-inaccessible or deleted customer detail request from an unhandled server exception into the existing Next.js not-found response. Organization isolation remains enforced; no cross-store record is disclosed.

The patch does not replace the application, database schema, customer navigation, appointment logic, chat, campaigns, or other existing runtime features.
