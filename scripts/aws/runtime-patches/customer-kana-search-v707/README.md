# Customer Kana Search v707

Uses the nullable Customer.lastNameKana / firstNameKana columns already saved during registration and profile editing. No schema changes, customer-data rewrites, inferred readings or new dependencies.

- Decorates customer-list names only, on desktop and mobile, without changing the canonical name used in messages or accounting.
- Matches full and partial saved kana across the family/given-name boundary. NFKC, whitespace removal and hiragana-to-katakana normalization accept common input variations.
- Adds matched IDs to the existing name/phone/memo query before registration filters and 50-row pagination. Existing ordering, filters and links remain intact.
- One lightweight, parameterized tenant-scoped kana lookup per page. Withdrawn and hidden rows are excluded. Missing tenant yields no kana records.
- Missing kana retains the original name. Long display names wrap on mobile.
- Source and accumulated production runtime have equivalent helpers, checked by a parity test.

## Verification

Run the project typecheck, lint, test and build via the existing source-check Dockerfile. The isolated browser regression creates only prefixed fixtures after checking the QA environment and database; removes them in finally. It covers kana variants, partial names, phone search, absent kana, tenant/hidden/withdrawn exclusion, 52-row pagination, registration filters, desktop/mobile and authentication.

Production smoke is read-only. Release only via the protected GitHub OIDC workflow, pinned to the reviewed v706 parent digest, preserving all accumulated runtime features.
