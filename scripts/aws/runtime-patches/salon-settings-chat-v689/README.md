# Salon Settings and Chat v689

Parent: dealer-workspace-v688, protected ECS task 699,
`sha256:a7c389ae7ac5a6062f3aee56e954b0a51e35b938bfbf1be05a2c0c7d3846a685`.

## Findings

- A server guard redirected all non-owner `/admin/settings` visits to
  `/admin/account`. The two menu entries therefore displayed the same page for
  shared-store logins. Non-owners now receive a distinct, read-only store page;
  owner editing and all server-side update permissions are retained.
- New salon chats did not provide a staff choice. If the login display name did
  not match a staff name, the sender silently picked `organizationStaff[0]`.
  Shared-store logins typically hit this fallback. This explains a first-entry
  bias such as the reported kaori assignment; production historical recipient
  data was not changed or relabeled.
- The inbox displayed conversations that individual staff could not send to,
  and denied form submissions redirected without a visible error. Both inbox
  and sender now use the same account-linked staff scope (exact normalized names
  only for legacy unlinked staff).

## Changes

New chat composition explicitly selects a staff member; personal staff logins
default to their own associated staff only. Explicit thread replies retain their
recipient and never fall back to another customer or staff member. The async form
shows failures and preserves the draft; it tolerates late hydration clearing the
old hidden input. CSRF, tenant, hidden-customer and staff checks run on the server.
The customer HTML fallback no longer picks the first staff member and its
malformed post-send redirect is corrected. No messages or existing thread
assignments are migrated.

## Verification

- Runtime syntax/anchor checks, database integration in a temporary schema.
- Browser fixture at 1440/390/320 px: multiple recipients/staff, hidden-field
  hydration, failed-send draft preservation.
- Full isolated Next application: owner, shared and personal staff; separate
  settings/account pages and denied non-owner writes; real customer round trips.
- Read-only production asset, readiness and anonymous route smoke.

Deployment uses the existing protected GitHub OIDC workflow. The full-app test
is restricted to the local v680 mail-sink/database container, never production.
