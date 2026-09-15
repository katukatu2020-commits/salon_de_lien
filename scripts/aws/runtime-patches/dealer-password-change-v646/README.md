# Dealer password change v646

Fixes the dealer password-change route for active dealer accounts that predate the managed account issuance flow.

- Keeps the managed-account first-password-change behavior intact.
- Resolves an existing active dealer from the authenticated dealer session when no managed access row exists.
- Preserves current-password verification, password policy, audit logging, and `authVersion` session revocation.
- Covers the legacy and managed paths with database and responsive browser regressions.
