# Enterprise Applications v691

Parent: treatment-reviews-v690, digest
`sha256:763f76fb1faef69a4c210f47d160f37dfc6a5da9413190ee589a9aecfb83f6de`.

- All three public business forms offer an optional 50-or-more-store enterprise checkbox.
- `BusinessInquiry.isEnterprise` is an additive, non-null boolean with a false default for existing inquiries and branch registrations. The selected classification survives status changes, approval and rejection.
- Enterprise applications are labeled in the operator inbox, with combinable contract-type, audience, status and text filters. Pagination preserves filters.
- Ordinary requests keep the existing deduplication key. Enterprise requests have a distinct key. Duplicate or invalid checkbox values are rejected.
- Operator display numbers and click-to-call links become `070-8490-9876` across business, customer landing, privacy and terms pages. No salon/dealer contact records are changed.
- Existing plan prices, billing, account creation, required phone validation, consent, spam protection and authorization are unchanged. Negotiated enterprise pricing remains an operator decision.

Verification:

1. Image build runs `verify-runtime.mjs` against patched runtime syntax, parsing, form defaults and contact links.
2. `integration.mjs` uses a random temporary PostgreSQL schema, including migration of legacy rows, HTTP submission, deduplication, filtering, pagination, authentication and CSRF checks. It never drops the public schema.
3. `browser-regression.mjs` is restricted to the isolated v680 local QA database on port 3188. It submits salon/dealer enterprise and standard requests, checks operator filtering and 320/390/850/1024/1200/1440px layouts, saves screenshots and deletes only its own test applications.
4. `production-smoke.mjs` is read-only. It checks all public forms, phone links, protected operator access and health headers.

Deploy only through `.github/workflows/deploy-enterprise-inquiries-v691.yml`, pinned to the reviewed parent digest, with protected ECS deployment, rollback protection and release lock recording.
