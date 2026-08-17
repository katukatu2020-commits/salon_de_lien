# AWS deployment protection

## Purpose

The live Salon de Lien ECS service is locked to the release recorded in
`infrastructure/deployment-protection/staging-lock.json`. A normal command from
a developer PC must not be able to replace the live application with a local
build.

This protection does not change the application, database, private assets, or
customer data.

## Active layers

1. All repository-owned application deployment and migration scripts reject a
   local process. They require GitHub Actions and the exact
   `SalonDeLienGitHubDeployRole` assumed-role identity.
2. The application CloudFormation stack has termination protection and a
   fail-closed stack policy that denies all updates.
3. ECR tags are immutable. Image lifecycle deletion is disabled, and repository
   policy denies image and repository deletion.
4. An independent Lambda guard checks the ECS service every minute and after
   ECS deployment events. Any unapproved task definition or desired-count drift
   is changed back to the approved task definition.
5. The protection stack itself has termination protection and a deny-update
   stack policy.

## Current approved release

- ECS task definition: `salon-de-lien-staging-web:302`
- ECR tag: `store-list-icon-first-paint-v302-c35e236b7d46`
- ECR digest:
  `sha256:ccfe8d5f7450a57cab630880076e31cd5f6c07593f699cad97821ddc5acb032a`
- Canonical Git commit: `c35e236b7d466dd08a62167499d24a4127b3f3fa`
- Audited runtime patch: `store-list-icon-first-paint-v302-c35e236b7d46`

## Verification

The verification command is read-only:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/verify-deployment-protection.ps1
```

The local deployment command must fail with `BLOCKED` before it builds, pushes,
migrates, or updates any AWS resource.

## Important root-account limit

The current CLI session is authenticated as the standalone AWS account root.
AWS IAM cannot deny the account root, and this account is not governed by an
AWS Organizations service control policy. Therefore no technical control can
prevent a person who deliberately uses root from first removing every guard.

The implemented controls prevent accidental local deployment and automatically
repair direct ECS drift. For a strict administrative boundary, stop using root
for daily work and retain root only as an offline break-glass identity. Future
releases should run only through a reviewed GitHub Actions environment using the
dedicated OIDC deployment role.

## Releasing a future version

Do not disable a single guard ad hoc. A future release needs a reviewed change
that updates the lock, deploys through the approved CI role, verifies health,
and re-locks both stacks. Take an RDS snapshot and preserve the previous task
definition and digest before that process.
