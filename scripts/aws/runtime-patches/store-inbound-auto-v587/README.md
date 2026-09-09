# Store inbound address auto provisioning v587

Store registration now issues the Hotpepper reservation address within the same database transaction as the store, owner, shared account, billing record, and verification-token consumption. An issuance or later registration failure rolls all of these changes back.

The existing inbound service accepts a transaction client, retaining its random address generation, uniqueness constraints, collision retry, and concurrent issuance handling. Startup fills missing addresses for existing stores without changing any issued address or its status. The existing settings view displays the address and copy control immediately.

The integration test exercises the actual registration handler and PostgreSQL in an isolated local schema, including transaction rollback, retries, token reuse prevention, concurrent issuance, address collisions, and idempotent startup repair. It never sends email or calls Stripe.
