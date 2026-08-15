# AWS runtime recovery snapshot

This directory preserves the AWS implementation that was running on 2026-08-15
before Git became authoritative again. It contains no secret values.

## Runtime identity

- AWS account: `009293460979`
- Region: `ap-northeast-1`
- Stack: `SalonDeLien-staging`
- ECS cluster/service: `salon-de-lien-staging-cluster` / `salon-de-lien-staging-web`
- Task definition observed: revision `248`
- ECR image tag: `admin-theme-modal-20260815-153`
- ECR digest: `sha256:2a1fe98b4422c0005b404d0d96df2bbd12e684eac18e4cdd8b42864f8bc5f72e`
- CloudFront distribution: `E23LI5IQDBD82Z`
- Canonical URL: `https://salon-de-lien.com`

## Contents

- `runtime-root/`: JavaScript and SQL recovered from the running ECS container.
- `release-153/`: the final runtime patch package used for image tag 153.
- `aws-state/`: CloudFormation, ECS, CloudFront, and RDS configuration snapshots.
- `checksums.sha256`: integrity hashes for this recovery set.

The runtime files are an audit/fallback artifact, not the preferred place for new
development. The source-controlled Next.js app, Prisma schema, migrations, and
CDK under the repository root are the canonical implementation.

No `.env`, database password, OAuth token, Stripe key, session secret, or secret
payload is stored here. ECS snapshots contain only Secrets Manager references.
