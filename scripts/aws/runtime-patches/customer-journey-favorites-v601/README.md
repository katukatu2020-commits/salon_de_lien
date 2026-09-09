# Customer journey and favorites v601

This protected child release updates only the customer-facing presentation and adds account-backed product favorites.

- `/u/appointments`: compact four-step booking presentation over the existing controlled booking form, availability, coupon, conflict, and submission behavior.
- `/u/profile`: customer summary and next appointment view while retaining the existing profile, photo, login, and withdrawal forms.
- `/u/catalog`: `お気に入り` replaces `お悩み別`; product details can add or remove a favorite.
- Favorites are scoped by organization and customer, reject cross-origin writes, and remain available beyond the ranking query's first 40 products.

The receipt, daily-sales print, Hotpepper import, booking engine, and native profile forms are protected by the runtime verifier and are not modified.

## Verification

```powershell
node --check scripts/aws/runtime-patches/customer-journey-favorites-v601/patch-runtime.mjs
docker run --rm --network salon_de_lien_default --entrypoint node `
  -e 'TEST_DATABASE_URL=postgresql://salon:salon_password@postgres:5432/orimia_chat_v589?schema=public&connection_limit=2' `
  salon-de-lien:customer-journey-favorites-v601-local /tmp/lien-v601/integration.mjs
```

`browser-regression.mjs` intercepts booking and favorite writes, so it can verify the deployed UI without creating a reservation or changing customer favorites. `local-persistence.mjs` performs and restores one favorite operation and refuses any non-local base URL.
