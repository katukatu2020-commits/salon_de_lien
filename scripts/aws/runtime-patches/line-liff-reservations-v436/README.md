# LINE LIFF reservations v436

Immutable child runtime patch based on the reviewed production v435 digest.

Adds only:

- owner-only per-organization LINE connection settings;
- encrypted Messaging API secrets;
- raw-body webhook signature verification and event deduplication;
- a first-party LIFF booking page;
- LINE ID token verification;
- transactional booking into the existing appointment ledger;
- booking idempotency and LINE confirmation messages.

This patch does not modify the existing customer navigation, staff schedule UI, campaigns, chat, Gmail ingestion, or checkout flows.

Local verification:

```powershell
node --test scripts/aws/runtime-patches/line-liff-reservations-v436/line-reservations-v436.test.js
docker build --build-arg BASE_IMAGE=salon-de-lien-v435-envtest `
  -t salon-de-lien-v436-line-local `
  scripts/aws/runtime-patches/line-liff-reservations-v436
```

Production setup is documented in `docs/line-reservation-setup.md`.
