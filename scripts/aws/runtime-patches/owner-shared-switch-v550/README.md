# Owner to shared account switch v550

- Adds an owner-only header command beside the current user name.
- Replaces the signed owner session with the store shared-account session without asking for the shared password again.
- Keeps the current route while changing the effective account and permissions.
- Does not render the command for shared or other staff sessions, and rejects reverse switch requests server-side.
- Limits the new shared session to the remaining lifetime of the owner session.

Local build:

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:shared-account-contact-v549-local -t salon-de-lien:owner-shared-switch-v550-local scripts/aws/runtime-patches/owner-shared-switch-v550
```
