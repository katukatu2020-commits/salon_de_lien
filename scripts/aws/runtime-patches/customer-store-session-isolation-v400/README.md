# Customer store session isolation v400

Recovered byte-for-byte from the running AWS image on 2026-08-23.

- ECS task definition: `salon-de-lien-staging-web:400`
- ECR tag: `customer-store-session-isolation-v400`
- ECR digest: `sha256:c3862bee5b29d8e5bf015e617c8511b9907c7b612f996cb329b32a8fe6767286`
- Base v399 digest: `sha256:3a6b6394379bd29c56795e11f280b146a3b966825eeeab8216a35ffe8bff59f1`

The patch keeps the customer's canonical store identity unchanged when another
registered store is selected. Access to a secondary store is instead validated
through `CustomerStoreLink` and scoped to the signed customer session.

AWS image comparison confirmed that only these `/app` files changed from v399:

- `server.js`
- `customer-links-v293.js`
