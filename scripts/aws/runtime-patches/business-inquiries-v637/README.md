# Business inquiries v637

Adds an in-page consultation flow for the public business pages and a dedicated operator inbox.

## Behavior

- Salon and dealer consultation CTAs scroll to `#contact`.
- The contact section keeps the support email and telephone number and adds a validated inquiry form.
- Anonymous submissions are rate limited, honeypot protected, de-duplicated in ten-minute windows, and stored in `BusinessInquiry`.
- `/platform/inquiries` lets an authenticated platform operator search inquiries and manage response status and notes.
- A new immutable stylesheet URL prevents stale cached contact layouts.

## Verification

```powershell
node scripts/aws/runtime-patches/business-inquiries-v637/unit-test.mjs
docker build --build-arg BASE_IMAGE=salon-de-lien:customer-profile-name-fields-v636-local -t salon-de-lien:business-inquiries-v637-local scripts/aws/runtime-patches/business-inquiries-v637
docker run --rm --entrypoint node salon-de-lien:business-inquiries-v637-local /tmp/lien-v637/verify-runtime.mjs
```
