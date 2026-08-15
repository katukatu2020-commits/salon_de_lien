# Salon de Lien AWS Architecture

状態: Phase 0 decision record  
更新日: 2026-08-01

## 1. 採用判断

実店舗MVPのtargetは、ユーザー指定どおり次を基本とする。

```text
iPhone / Android / 店舗PC
  -> Route 53 + ACM (HTTPS)
  -> AWS WAF
  -> Application Load Balancer
  -> ECS Fargate / Next.js
       -> RDS for PostgreSQL
       -> private S3
       -> Amazon SES
       -> CloudWatch Logs
       -> Secrets Manager
```

コンテナはECRへ保存する。管理画面とお客様画面は同じNext.js deploymentを使用するが、認証・認可境界はrouteとAPIで明確に分ける。

## 2. ECS Fargateと代替案

| 候補 | 利点 | 課題 | 判断 |
| --- | --- | --- | --- |
| ECS Fargate + ALB | Docker継続、private subnet、ALB/WAF、one-off migration task、rolling rollbackを制御しやすい | IaCと運用項目が多い | 採用 |
| App Runner | 初期deployが簡単 | 現要件のALB/WAF、migration task、network/rollback運用を別設計する必要 | 今回は不採用 |
| Amplify | Next.js公開が簡単な場合がある | 既存Docker、Prisma、private RDS、画像storage移行との乖離 | 不採用 |

AWSはECS rolling deploymentにdeployment circuit breakerとrollbackを提供する。production serviceではこれを有効化し、ALB health checkに失敗したreleaseを直前の正常deploymentへ戻す。

参考:

- https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeploymentCircuitBreaker.html
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html

## 3. 環境分離

development / staging / productionを分離する。

推奨は少なくともproduction用AWS accountを分離し、stagingとproductionで次を共有しないこと。

- RDS instance/database/user
- S3 bucket
- Secrets Manager secret
- ECS cluster/service/task definition environment
- domain
- SES sender configuration
- CloudWatch Log Group
- KMS key alias
- demo data

命名例:

```text
salon-de-lien-staging-app
salon-de-lien-staging-db
salon-de-lien-staging-private-assets
salon-de-lien-production-app
salon-de-lien-production-db
salon-de-lien-production-private-assets
```

## 4. Network

- ALBはpublic subnet。
- ECS taskとRDSはprivate subnet。
- RDS security groupはECS security groupから5432のみ許可。
- ECS security groupはALB security groupからapp portのみ許可。
- S3/ECR/CloudWatch/SecretsへのVPC endpointは費用とNAT利用量を見てstagingで選定。
- RDSをpublicly accessibleにしない。
- production DBへの開発端末からの常時直接接続を許可しない。

## 5. Computeとdeploy

### ECS service

- Fargate
- private subnet
- desired count: staging 1、productionはパイロット開始時1、無停止要件確定後2を検討
- rolling deployment
- deployment circuit breaker: enable + rollback
- ALB deregistration/drainingを設定
- read-only root filesystemを可能な範囲で有効化
- non-root user
- ephemeral diskを永続データ保存に使わない

### Health

- `/api/health/live`: processが応答するか。DBへ接続しない。
- `/api/health/ready`: 短いtimeoutでDB接続を確認。
- ALBはliveを使用する。
- deploy gateはreadyと主要smoke testを使用する。

### Migration

migrationをweb taskの起動処理へ含めない。

1. build済みimageをECRへpush。
2. 同じimageでone-off ECS taskを起動。
3. `npx prisma migrate deploy`を実行。
4. 成功した場合だけECS serviceを更新。
5. migration失敗時はserviceを更新しない。

破壊的migrationはexpand/migrate/contractへ分割する。

## 6. Database

- Amazon RDS for PostgreSQL
- encryption at rest
- private subnet
- deletion protection: production on
- automated backup retention: production 14日を初期値、staging 7日
- Point-in-Time Recoveryを有効にする
- deploy前manual snapshot
- Multi-AZはパイロットの許容停止時間と予算を確認してproductionで判断
- connection limitを計算し、Prismaのconnection pool上限をtask数に合わせる

RDSの自動backupは保持期間内のPITRに利用できる。復元は既存instanceの上書きではなく、新しいDB instanceを作成して接続先を切り替える。

参考:

- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html

## 7. Private image storage

顧客写真用S3 bucketは次を必須とする。

- Block Public Accessの4設定をすべて有効
- ACL無効化
- server-side encryption
- versioning
- HTTPSのみ許可
- CORSを必要最小限に限定
- lifecycleは法務・運用上の保持期間決定後に設定
- ECS Task Roleだけが必要prefixをread/writeできる

AWSはS3 presigned URLでbucket policyを公開せず、期限付きアクセスを提供できる。アプリは先にresource認可を行い、その後に短時間URLを発行する。

参考:

- https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html

### Object key

```text
private/customer-photos/{organizationId}/{customerId}/{visitId}/{uuid}.jpg
private/product-images/{organizationId}/{productId}/{uuid}.jpg
```

氏名、電話、メール、元ファイル名をkeyへ含めない。

### DB

provider URLではなく次を保存する。

- bucket用途またはstorage provider
- object key
- content type
- byte size
- checksum
- uploadedAt
- deletedAt
- owner organization/customer/visit relation

## 8. IAMとSecrets

固定AWS access keyをアプリへ渡さない。

- Task execution role: ECR pull、CloudWatch logs、task definition secret injection。
- Task role: S3の対象prefix、SES送信などアプリ実行時の最小権限。
- migration task role: 通常appと同等以下。DB credentialはSecrets Managerから注入。

AWSではECS task roleをアプリケーションからS3等へアクセスするために使用できる。

参考:

- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html

## 9. Authentication and authorization target

最低role:

- ADMIN
- STAFF
- CUSTOMER
- MANUFACTURER

必要なresource境界:

- organizationId
- customerId
- manufacturerIdまたは許可product集合

共通authorizationは、middlewareだけではなくroute handlerとServer Actionの先頭で実行する。

customer portalはraw customerIdを廃止し、hash保存、期限、失効、rotationを持つopaque tokenまたは認証済みsessionへ置き換える。

## 10. Email and scheduled jobs

- 本番review request mailはSES provider。
- developmentは実送信しないprovider。
- Gmail予約取込を継続する場合、Next.js process内timerを廃止し、EventBridge Schedulerから認証付きendpointまたはone-off ECS taskを起動する。
- point expiryもEventBridge Scheduler + one-off taskとする。
- 同じjobの再実行を前提にDBで冪等化する。

## 11. Logs and alarms

JSON logをstdoutへ出し、CloudWatch Logsへ送る。

ログへ出さない:

- password / cookie / session / token
- DATABASE_URL
- presigned URL query
- phone/email全文
- review freeComment全文
- image URLと顧客識別子の組合せ

Alarm候補:

- ALB 5xx
- target unhealthy
- ECS task stopped/deployment failed
- RDS connection/storage/CPU
- app DB/S3/SES/review/point error count
- login failures/rate-limit events

## 12. CI/CD target

PR:

```text
lint -> typecheck -> unit -> integration -> build -> container scan
```

main:

```text
build immutable image
-> ECR push
-> staging migration task
-> staging deploy
-> health/smoke/E2E
-> manual approval
-> production migration task
-> production deploy
-> health/smoke
```

image tagはGit SHAを使用し、直前の正常task definitionへ戻せるようにする。

## 13. Phase 1 IaC scope

`infrastructure/`にAWS CDK TypeScriptを追加する予定。

- VPC/subnet/NATまたはendpoint
- security groups
- ECR
- ECS cluster/task/service
- ALB/listener/target group
- ACM/Route 53 binding
- WAF
- RDS PostgreSQL
- private S3
- Secrets Manager
- IAM roles
- CloudWatch logs/alarms
- EventBridge Scheduler

Phase 0ではAWS resourceを作成しない。
