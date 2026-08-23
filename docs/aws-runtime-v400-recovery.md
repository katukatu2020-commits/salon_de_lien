# AWS runtime v400 recovery

Verified on 2026-08-23 against the active AWS production service.

## Runtime identity

- AWS account: `009293460979`
- Region: `ap-northeast-1`
- ECS cluster: `salon-de-lien-staging-cluster`
- ECS service: `salon-de-lien-staging-web`
- ECS task definition: `salon-de-lien-staging-web:400`
- Running tasks: `1`
- Rollout state: `COMPLETED`
- ECR tag: `customer-store-session-isolation-v400`
- Immutable digest: `sha256:c3862bee5b29d8e5bf015e617c8511b9907c7b612f996cb329b32a8fe6767286`
- Base v399 digest: `sha256:3a6b6394379bd29c56795e11f280b146a3b966825eeeab8216a35ffe8bff59f1`

## GitHub comparison

The newest GitHub commit at recovery time was `3e0769cf943d9050ed610a999efa478be4e33fa0`
on `aws-production-source-complete-20260819`. It contains runtime patches through
v399. The running v400 patch was not present in any fetched GitHub branch or tag.

The v400 patch and verifier were copied directly from the immutable ECR image.
Their SHA-256 values are:

- `patch-runtime.mjs`: `aa7e8ddefab17d771ee4a173bfa98cfe9f847144920c7dca66f9415bc4a487bf`
- `verify-runtime.mjs`: `0e93f9905f49d703b20b042422f480e611db2e60422bb0d4beca34e1ccaade66`

## Code-level diff

A full `/app` checksum comparison between v399 and v400, excluding only
`node_modules`, found exactly two changed runtime files:

- `server.js`
- `customer-links-v293.js`

The patch validates customer sessions for registered secondary stores through
`CustomerStoreLink`. Switching stores no longer mutates the canonical
`AppUser.organizationId` and `AppUser.customerId`, preventing concurrent devices
from overwriting each other's selected store.
