# Style community routed navigation v477

Protected child-image patch for the staff style-management list.

- Re-runs the managed-card enhancement when Next.js replaces the route DOM.
- Makes public/private and delete controls appear on the first sidebar navigation.
- Keeps the existing API, visibility, deletion, image, detail, and chat behavior unchanged.
- Preserves idempotency so repeated DOM mutations cannot duplicate controls.

Parent image: customer public code parity v476 (`sha256:4470a477c5ed5cb969d26a4d182e401c36b13117bd71fa4b5589bb2a0f57f5ef`).
