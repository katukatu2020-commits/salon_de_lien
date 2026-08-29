# Customer withdrawal mail v452

Narrow production patch based on the exact ECR digest used by ECS task definition 451.

- Defines the HTML escaping helper required by the customer withdrawal email renderer.
- Preserves the existing Postmark provider, token expiry, cleanup-on-failure, and confirmation flow.
- Does not alter registration, reservations, checkout, LINE integration, customer data, or database schema.
