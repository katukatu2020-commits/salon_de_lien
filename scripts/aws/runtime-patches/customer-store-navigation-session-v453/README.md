# Customer store navigation session v453

Narrow production patch based on the exact ECR digest used by ECS task definition 452.

- Replaces every bundled copy of customer-session module `65051`, not only shared chunks.
- Authorizes either the account's canonical customer or a matching `CustomerStoreLink`.
- Keeps the selected store scoped to the signed browser session and does not mutate `AppUser`.
- Verifies store switching followed by home, appointments, history, and profile navigation in production.
- Does not alter customer data, reservations, points, UI, database schema, or unrelated routes.
