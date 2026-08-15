# AWS CDK

Phase 1のstaging基盤をAWS CDK TypeScriptで定義する。

## Prerequisites

1. AWS CLIで専用deploy roleへ認証する。
2. `ap-northeast-1`をbootstrapする。
3. app imageをECRへpushする。
4. application secretの`ADMIN_EMAIL`と`ADMIN_PASSWORD_HASH`を実値へ更新する。

## Synth

```powershell
npm run infra:synth
```

## First staging deployment

The first deployment must create the repository and runtime infrastructure before
ECS attempts to pull an application image. Deploy the foundation with zero tasks:

```powershell
npx cdk --app "npx tsx infrastructure/bin/app.ts" deploy SalonDeLien-staging `
  -c environment=staging `
  -c imageTag=<immutable-image-tag> `
  -c desiredCount=0 `
  --require-approval broadening
```

Push the image, run `npx prisma migrate deploy` as a one-off Fargate task, update
the application secret, and then deploy the same tag with `-c desiredCount=1`.
Do not start the service while the placeholder admin password hash remains set.

## Optional HTTPS context

```powershell
npx cdk --app "npx tsx infrastructure/bin/app.ts" synth `
  -c environment=staging `
  -c imageTag=<git-sha> `
  -c domainName=staging.example.com `
  -c hostedZoneId=<zone-id> `
  -c hostedZoneName=example.com
```

domain contextがないsynthはALB HTTP endpointを作る。実店舗向けstaging/production公開では、必ずdomain contextを指定してACM HTTPS listenerを使用する。

## Deploy guard

- `ALLOW_DEMO_DATA=false`を固定する。
- production stackはこのPhaseではdeployしない。
- migration task成功前にservice imageを更新しない。
- image tagにはGit SHAを使う。ECRはimmutableのため同じtagを再利用しない。
- destroyしてもRDS snapshot、S3 bucket、ECR repository、Log Groupはretainする。
