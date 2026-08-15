# AWS source recovery 2026-08-15

## Purpose

Return the running AWS application to a Git-authoritative, reproducible release.
The live service had accumulated container-level JavaScript/CSS patches and raw
SQL schema creation that were not represented by the repository.

## Recovered state

- The application baseline is preserved in commit `a1be8e5` on branch
  `recovery/aws-canonical-20260815`.
- The exact running runtime files and AWS configuration snapshots are stored in
  `aws-runtime-recovery/2026-08-15/`.
- The exact running image remains available by immutable digest:
  `sha256:2a1fe98b4422c0005b404d0d96df2bbd12e684eac18e4cdd8b42864f8bc5f72e`.

## Prisma reconciliation

The AWS database was introspected from the running ECS task without printing the
database credential. The resulting schema has 63 models and is now the root
`prisma/schema.prisma`.

Recovered applied migrations:

- `20260812173000_add_product_sales_controls`
- `20260812230000_add_staff_customer_chat`

Recovered pending/idempotent migrations:

- `20260808190000_add_booking_capacity_overrides`
- `20260813093000_add_sms_compliance`
- `20260815190000_reconcile_aws_runtime_schema`

The booking-capacity Prisma field names use `@map` so the source API can keep
`dateKey`, `slotStartMinutes`, and `capacity` while using the existing AWS columns
`date`, `slotStart`, and `remaining` without a destructive rename.

The complete 50-migration history was applied to a temporary PostgreSQL 16
database on 2026-08-15. A Prisma migration diff between that clean history and
`prisma/schema.prisma` reported `No difference detected`. No AWS database
migration was executed during this verification.

Do not use `prisma migrate dev` against AWS. Before updating the ECS service:

```powershell
npx prisma validate
npm run typecheck
npm test
npm run build
# Run as a one-off ECS task using the candidate image:
npx prisma migrate deploy
```

Take an RDS manual snapshot before the first reconciled `migrate deploy`. The
reconciliation SQL is idempotent because the live runtime already created those
objects.

## CDK reconciliation

The live entry path is CloudFront -> public HTTP ALB -> ECS. The custom domain
and ACM certificate belong to CloudFront; the certificate is in `us-east-1`.
CDK now models that topology instead of trying to put the certificate on the ALB.

The existing Route 53 A and AAAA records were created outside CloudFormation.
Import them before the first reconciled CDK deployment so CDK does not attempt to
create duplicate records:

```powershell
$env:CDK_DEFAULT_ACCOUNT = "009293460979"
$env:CDK_DEFAULT_REGION = "ap-northeast-1"
npx cdk --app "npx tsx infrastructure/bin/app.ts" import SalonDeLien-staging `
  --profile salon-de-lien-deploy
```

Select the existing Route 53 records for `salon-de-lien.com` (A and AAAA) when
prompted. Always inspect `npm run infra:diff:staging` after import. A diff that
replaces the VPC, RDS instance, S3 bucket, CloudFront distribution, or ECS service
must not be deployed.

The reconciled CDK diff contains no deletion or replacement of those stateful
resources. Expected differences are a new ECS task-definition revision,
restoring the live desired count, recording the existing runtime environment and
secret references, recording the existing CloudFront alias/certificate, and
adding the two Route 53 records that must first be imported.

The checked-in staging defaults are pinned to the currently running immutable
image tag `admin-theme-modal-20260815-153`. Future releases must use a new
immutable Git-SHA tag and must not overwrite an existing ECR tag.

## Reproducibility verification

The repository is stored under OneDrive, where source files may be represented
as Windows reparse points. A direct `docker build .` is therefore not the
supported Windows build path. Materialize the controlled 42 MB build context
first:

```powershell
npm run aws:docker-context
docker build -t salon-de-lien:<git-sha> $env:TEMP\salon-de-lien-docker-context
```

On 2026-08-15 that path produced a non-root production image successfully. The
image then applied all 50 migrations to a clean PostgreSQL 16 container and
returned HTTP 200 from both `/api/health/live` and `/api/health/ready`. The live
AWS endpoints also returned HTTP 200 after recovery; the live service itself was
not changed.

## Release procedure

1. Create an RDS manual snapshot and confirm the previous ECS image digest.
2. Build the root Dockerfile from a clean checkout.
3. Tag the image with the Git commit SHA and push once to ECR.
4. Run `prisma migrate deploy` as a one-off task using that image.
5. Deploy CDK with `desiredCount=1` and the immutable image tag.
6. Verify `/api/health/live`, `/api/health/ready`, admin login, customer login,
   review submission, point idempotency, Gmail sync status, and private photos.
7. Roll back by restoring the previous task definition/image. Restore RDS only
   when application rollback is insufficient.

## Known infrastructure debt

- CloudFormation still reports the old task definition and desired count because
  task revisions were registered manually. Do not update the stack until the
  CDK diff and Route 53 import are reviewed.
- The ALB is public and can be reached without CloudFront. Restricting the origin
  is a separate security change and must be tested before deployment.
- No WAF or CloudWatch alarms are currently attached to the live distribution.
- `staging` is the only deployed environment; production is not yet separated.
