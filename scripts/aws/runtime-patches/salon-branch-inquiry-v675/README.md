# Salon Branch Inquiry v675

Parent: v674, immutable ECR digest
`sha256:ff9e6c29c9dbaaaa8cba9b4609165cc08d4c5681d6cf3bbeba9d458057313e11`.

## Behavior

- The salon group master opens a new-store inquiry dialog even when its current billing plan is unset. The previous page disabled the button in that case.
- The authenticated `/api/admin/salon-master/stores` action now creates a pending `BusinessInquiry`, not an organization, billing subscription, or login. Older clients cannot bypass operator approval.
- The operator's existing dashboard inquiry list displays these as branch registration requests, with the source group, requesting salon, contact details, address, and message.
- Existing operator approval creates the account and attaches the approved store to the requesting group in the same transaction. The new store starts unpublished. Existing initial-password email and password-change requirements remain in effect.
- Existing rejection, rejection reasons, automatic email, status notes, and failed-mail recovery remain available. No mail is sent before a decision.
- Existing store linking, owner-only access, tenant isolation, and monthly reporting are unchanged.

## Data and Safety

`SalonBranchInquiry` is an additive metadata table keyed by inquiry ID. The request's group and owner are derived from the authenticated session, never from posted IDs. A per-owner request key plus payload hash makes retries idempotent; ownership is checked again on approval. Invalid ownership or suspended source accounts roll the entire approval back. Pending requests are limited to 20 per group. No existing accounts, inquiries, or billing plans are rewritten.

The existing master schema and inquiry service already initialize the referenced business tables. The metadata table deliberately has no foreign keys to group tables so the shared approvals service can initialize independently. Linking is validated transactionally using the existing group membership lock.

## Verification

- Real PostgreSQL integration: no-plan submission, no immediate account creation, retries and concurrent requests, operator inbox, approval and correct group attachment, unpublished profile, initial-password gate, rejection email, failed-mail recovery, CSRF, tenant isolation, authorization, transactional rollback, and existing master/link/report behavior.
- Integration also passes against isolated tables cloned from the local application's actual schema.
- Playwright at 1440, 390, and 360 pixels: modal, validation, successful submission, operator receipt, close/reopen/reset, existing link dialog, overflow, and JavaScript errors. Screenshots are workflow artifacts.
- Inherited v648, v656, v671, and v673 integration regressions.
- Production smoke is read-only: readiness markers, updated client asset, and authentication protection. It never submits production inquiries or sends test email.

Deployment uses `deploy-salon-branch-inquiry-v675.yml`, preserving the protected release lock and automatic rollback process. The local fixture uses only a random disposable schema in the test database; mail is captured in memory.

The inherited v648 regression resets its target database's `public` schema. Run it only in a dedicated disposable database, as the workflow does with its ephemeral PostgreSQL service. Never point it at application data or a shared UI-test database.
