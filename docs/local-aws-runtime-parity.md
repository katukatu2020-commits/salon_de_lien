# Local AWS runtime parity

This repository can run the exact immutable application image approved for the
current AWS service while using the local PostgreSQL database.

## Source of truth

- ECS task definition revision: `266`
- ECR tag: `demo-polish-20260816-01`
- Immutable digest: `sha256:a0adf3c5d9cd82a6992e816df13654edde546ac9e7703ddd4057aa63f70766f7`
- Audited runtime patch: `scripts/aws/runtime-patches/demo-polish-20260816/`
- Recovery manifest: `aws-runtime-recovery/2026-08-15/manifest.json`

The final container contains compiled Next.js output and runtime patches. It
does not contain the complete original TypeScript source tree. Reconstructing
TypeScript from minified bundles would be lossy, so runtime parity is achieved
by running the same image digest locally instead of rebuilding an approximation.

## Start

The approved image must already be present in the local Docker image cache.
The parity Compose file uses `pull_policy: never` so a mutable tag or newer ECR
image cannot silently replace it. The Compose project name is fixed to
`salon_de_lien` so the existing local PostgreSQL volume is reused.

```powershell
npm run dev
npm run local:aws-verify
```

Open `http://localhost:3000`.

`npm run dev` intentionally starts the immutable AWS-parity runtime. This keeps
the normal local URL visually identical to the currently running ECS task and
prevents the editable TypeScript preview from being mistaken for production.

For source-only development, use the explicitly separate preview command:

```powershell
npm run dev:source
```

That preview runs on `http://localhost:3100`. It is useful for implementation
work, but it is not the AWS visual source of truth because the production image
also contains audited runtime UI patches. Only port `3000` is the byte-identical
AWS frontend.

Stop it with:

```powershell
npm run local:aws-down
```

## Code-level audit snapshot

To extract the compiled routes, static assets, Prisma schema, migrations, and
runtime patch files from the approved image and generate SHA-256 hashes:

```powershell
npm run local:aws-sync
```

Snapshots are written under `.artifacts/aws-runtime-parity/` and are excluded
from Git because they include hundreds of megabytes of compiled output.

## Intentional local substitutions

AWS-only integrations are disabled locally:

- private S3 photo reads/writes
- AWS SNS SMS delivery
- Gmail background synchronization
- external AI generation
- Stripe billing onboarding

The application code and UI are byte-identical to AWS. The database target and
external providers are local substitutions. Existing local database records are
preserved; this workflow does not copy production RDS customer data. No command
in this workflow writes to ECS, ECR, RDS, S3, CloudFormation, or any other AWS
service.
