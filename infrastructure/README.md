# Salon de Lien AWS CDK

This directory is the Infrastructure as Code source for the current AWS staging
environment. The checked-in default context intentionally matches the live
environment recovered on 2026-08-15.

## Current staging topology

```text
Route 53 (salon-de-lien.com)
  -> CloudFront (TLS certificate in us-east-1)
  -> public ALB over HTTP
  -> ECS Fargate (ap-northeast-1)
  -> private RDS PostgreSQL
```

Customer photos and other private assets are stored in a non-public S3 bucket.
Application credentials remain in Secrets Manager and are referenced by name;
secret payloads are never stored in this repository.

## Prerequisites

1. Authenticate AWS CLI profile `salon-de-lien-deploy`.
2. Use Node.js and dependencies from the repository root.
3. Confirm the intended immutable ECR image tag in both `cdk.json` and the
   deployment command.
4. Never run `prisma migrate dev` against AWS.

## Verify the template

From the repository root:

```powershell
npm run infra:synth
npm run infra:diff:staging -- --profile salon-de-lien-deploy --no-change-set
```

From this directory:

```powershell
npx cdk synth SalonDeLien-staging --profile salon-de-lien-deploy
npx cdk diff SalonDeLien-staging --profile salon-de-lien-deploy --no-change-set
```

The first reconciled diff is expected to register a new ECS task definition and
bring CloudFormation back in sync with changes previously made outside the
stack. Do not deploy if the diff replaces or deletes the VPC, RDS instance, S3
bucket, ECS service, or CloudFront distribution.

## Existing Route 53 records

The live A and AAAA aliases for `salon-de-lien.com` predate the recovered CDK
source. They must be imported into `SalonDeLien-staging` before the first
reconciled deployment. Do not let CloudFormation create duplicate records.

```powershell
npx cdk import SalonDeLien-staging --profile salon-de-lien-deploy
```

Choose the existing A and AAAA alias records when prompted, then rerun `cdk
diff`. See `docs/aws-source-recovery-2026-08-15.md` for the complete release and
rollback procedure.

## Database migration

Before the first deployment from the recovered source:

1. Create a manual RDS snapshot.
2. Build and push an immutable candidate image.
3. Run `npx prisma migrate deploy` as a one-off ECS task using that image.
4. Stop if migration fails; do not update the ECS service.
5. Deploy the same image tag through CDK only after the migration succeeds.

## Guardrails

- `ALLOW_DEMO_DATA=false` remains fixed in staging.
- ECR tags are immutable; use a unique Git SHA or release tag.
- RDS, S3, ECR, Secrets Manager, and logs use retain/snapshot policies.
- Staging is currently the only deployed environment. Production requires a
  separate database, bucket, secrets, domain, and stack.
- The ALB currently remains publicly reachable. Origin restriction and WAF are
  tracked security work and must be tested separately before rollout.
