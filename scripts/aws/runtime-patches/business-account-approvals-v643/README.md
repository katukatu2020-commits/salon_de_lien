# Business account approvals v643

This runtime child release connects public business inquiries to platform approval, managed account issuance, Postmark credential delivery, mandatory first-login password changes, and operator suspension/resumption controls.

## Verification

- `verify-runtime.mjs`: parent/final runtime anchors
- `integration.mjs`: PostgreSQL approval, credentials, password change, audit, suspend/resume, and mail-failure recovery
- `browser-regression.mjs`: responsive application inbox, account dashboard, and password-change UI
- `production-smoke.mjs`: immutable marker and unauthenticated route smoke checks
