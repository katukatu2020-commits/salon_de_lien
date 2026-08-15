# AWS Staging Deployment

更新日: 2026-08-04

## 1. 前提

- AWS CLIは個人の管理者キーではなく、staging deploy roleで認証する。
- CDK bootstrap済みの`ap-northeast-1`を使う。
- Docker imageタグはGit SHAを使い、`latest`を使わない。
- staging用domain、Route 53 hosted zone、ACM検証権限を準備する。
- productionへdemo seedを適用しない。

## 2. Buildとpush

OneDrive上のクラウドプレースホルダーをDocker build contextへ直接渡さない。最初に内容を実体化した一時contextを作る。

```powershell
npm run aws:docker-context
docker build --pull -t salon-de-lien:aws-staging-preflight "$env:TEMP\salon-de-lien-docker-context"
```

通常のstaging移行では、後述の`deploy-staging.ps1`がこの処理を自動実行する。

```powershell
$Sha = git rev-parse --short=12 HEAD
docker build -t salon-de-lien:$Sha .
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.ap-northeast-1.amazonaws.com
docker tag salon-de-lien:$Sha <repository-uri>:$Sha
docker push <repository-uri>:$Sha
```

ECRはimmutable tagを使用する。同じタグへの上書きpushは行わない。

## 3. CDK確認とdeploy

課金リソースを作成しない事前診断は次で実行する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/preflight.ps1 `
  -Profile salon-de-lien-deploy -Region ap-northeast-1
```

初回だけは、ECRへイメージを投入する前にECSが起動しないよう、
`desiredCount=0`で基盤を作成する。

```powershell
npx cdk --app "npx tsx infrastructure/bin/app.ts" deploy SalonDeLien-staging `
  -c environment=staging -c imageTag=$Sha -c desiredCount=0 `
  --require-approval broadening
```

イメージpush、Application Secret更新、one-off migrationがすべて成功した後、
同じimmutable image tagを指定して`desiredCount=1`へ切り替える。

```powershell
npx cdk --app "npx tsx infrastructure/bin/app.ts" deploy SalonDeLien-staging `
  -c environment=staging -c imageTag=$Sha -c desiredCount=1 `
  --require-approval broadening
```

```powershell
npx cdk --app "npx tsx infrastructure/bin/app.ts" synth -c environment=staging -c imageTag=$Sha
npx cdk --app "npx tsx infrastructure/bin/app.ts" diff SalonDeLien-staging -c environment=staging -c imageTag=$Sha
npx cdk --app "npx tsx infrastructure/bin/app.ts" deploy SalonDeLien-staging -c environment=staging -c imageTag=$Sha --require-approval broadening
```

外部公開するstagingは`domainName / hostedZoneId / hostedZoneName`もcontextで渡し、HTTPS listenerを必須にする。

カード登録、独自ドメイン、staging管理者資格情報の準備後は、検証済みDB dumpを指定して次を実行する。

```powershell
$env:LIEN_STAGING_ADMIN_EMAIL="<staging-admin-email>"
$env:LIEN_STAGING_ADMIN_PASSWORD_HASH="<bcrypt-hash>"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/deploy-staging.ps1 `
  -Profile salon-de-lien-deploy `
  -Region ap-northeast-1 `
  -DatabaseDumpPath "backups\db\<verified-dump>.dump" `
  -DomainName "staging.example.com" `
  -HostedZoneId "<route53-hosted-zone-id>" `
  -HostedZoneName "example.com" `
  -StartService
```

このスクリプトはCDK bootstrap、`desiredCount=0`での基盤作成、immutable ECR push、DB restore、`prisma migrate deploy`、Secrets Manager更新、`desiredCount=1`への切替を順番に行う。途中で失敗した場合はサービスを起動しない。

## 4. Migration

web container起動時にmigrationは実行しない。新しいimageでone-off Fargate taskを起動し、commandを次へ上書きする。

```text
npx prisma migrate deploy
```

taskはweb serviceと同じprivate subnet、security group、Secrets Managerを使用する。終了コード0とCloudWatch logを確認してからserviceを更新する。失敗した場合はserviceを更新しない。

## 5. Smoke test

```text
GET /api/health/live  -> 200
GET /api/health/ready -> 200
```

加えて未ログインの`/admin`がloginへ遷移し、期限付き`/u/{token}`だけがお客様情報を表示することを確認する。

## 6. Rollback

- アプリ: ECS serviceを直前のtask definition revisionへ戻す。
- DB: 後方互換migrationを原則とし、コードrollbackで旧schemaを読める状態を保つ。
- 破壊的変更が必要な場合はexpand / migrate / contractの3回に分割する。
- DB復元が必要な障害は`docs/backup-restore.md`に従う。
