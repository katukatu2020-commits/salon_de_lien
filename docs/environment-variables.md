# Environment Variables

更新日: 2026-08-01

値はこの文書、Git、Docker image、task definitionの平文へ保存しない。developmentはuntracked `.env`、AWSはSecrets ManagerまたはSSM Parameter Storeを使う。

## 1. 共通原則

- `APP_ENV`は`development | staging | production`のいずれか。
- `NODE_ENV`だけでデモ投入可否を判断しない。
- productionで`ALLOW_DEMO_DATA=true`を許可しない。
- public変数へsecretや内部URLを入れない。
- secret rotation後にECS serviceを再deployする。
- `.env.example`は名前と安全なplaceholderだけを持つ。

## 2. Application

| 変数 | secret | dev | staging/prod保存先 | 用途 |
| --- | --- | --- | --- | --- |
| `APP_ENV` | no | development | task env | 環境境界 |
| `APP_URL` | no | localhost URL | task env | server-side canonical URL |
| `NEXT_PUBLIC_APP_URL` | no | localhost URL | build/task env | browser URL |
| `PORT` | no | 3000 | task env | container listen port |
| `LOG_LEVEL` | no | debug | task env | JSON logging level |
| `ALLOW_DEMO_DATA` | no | true可 | productionはfalse固定 | seed guard |

## 3. Database

| 変数 | secret | 保存先 | 備考 |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | Secrets Manager | Prisma runtime connection |
| `DIRECT_URL` | yes | Secrets Manager | migration専用を導入する場合 |
| `DB_CONNECTION_LIMIT` | no | task env | task数とRDS上限から算出 |
| `DB_POOL_TIMEOUT_SECONDS` | no | task env | Prisma URLへ反映予定 |

production起動時に`prisma migrate dev`を使わない。one-off taskの`prisma migrate deploy`だけがmigrationを実行する。

## 4. Authentication

現在:

| 変数 | secret | 状態 |
| --- | --- | --- |
| `ADMIN_EMAIL` | sensitive | 単一owner login |
| `ADMIN_PASSWORD_HASH` | yes | scrypt hash |
| `ADMIN_AUTH_SECRET` | yes | HMAC session secret、32 byte以上 |
| `INTEGRATION_SECRET_ENCRYPTION_KEY` | yes | 店舗別LINE連携資格情報のAES-256-GCM暗号化キー、32文字以上 |
| `ADMIN_SESSION_HOURS` | no | 1〜24 |
| `DEFAULT_ORGANIZATION_ID` | no | 単一店舗互換用の既定組織 |
| `ALLOW_LEGACY_CUSTOMER_ID_PORTAL` | no | development限定。staging/productionはfalse |

`AppUser`にADMIN / STAFF / MANUFACTURERを保存し、DBユーザーを優先してログインする。環境変数の管理者は初期復旧用の後方互換として残す。production cookieはHTTPS経由でSecure/HttpOnly/SameSiteを確認する。

## 5. AWS and storage

| 変数 | secret | 保存先 | 用途 |
| --- | --- | --- | --- |
| `AWS_REGION` | no | task env | SDK region |
| `S3_PRIVATE_ASSETS_BUCKET` | no | task env | 顧客写真/商品画像 |
| `S3_SIGNED_URL_TTL_SECONDS` | no | task env | 60〜900秒、既定300秒 |
| `S3_CUSTOMER_PHOTO_MAX_BYTES` | no | task env | upload limit |
| `STORAGE_PROVIDER` | no | task env | `vercel-blob` / `s3` migration切替 |

`AWS_ACCESS_KEY_ID`と`AWS_SECRET_ACCESS_KEY`はECSへ設定しない。ECS Task Roleを使う。

移行完了後、`BLOB_READ_WRITE_TOKEN`はproductionから削除する。移行期間だけSecrets Managerに保存する。

## 6. Mail

| 変数 | secret | 保存先 | 用途 |
| --- | --- | --- | --- |
| `MAIL_PROVIDER` | no | task env | `log` / `ses` |
| `MAIL_FROM` | no | task env | 検証済み送信元 |
| `MAIL_REPLY_TO` | no | task env | 店舗問い合わせ先 |
| `SES_REGION` | no | task env | SES region |

SES API権限はTask Roleへ付与し、SMTP passwordやAWS keyをアプリへ埋め込まない。

## 7. Existing AI providers

今回のAWS MVPでは機能追加しない。既存値は環境ごとに分離する。

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_IMAGE_MODEL`
- `FAL_KEY`
- `FAL_STYLE_MODEL`
- `STYLE_SIMULATION_PROVIDER`
- `ENABLE_STYLE_IMAGE_GENERATION`
- `ENABLE_IDENTITY_MASTER_GENERATION`
- `ALLOW_UNMASKED_HAIR_EDIT_FALLBACK`
- `FAL_IDENTITY_MASTER_*`
- `OPENAI_HAIR_EDIT_*`

API keyはSecrets Manager、feature flag/model名はtask envを基本とする。

## 8. Gmail reservation integration

現在存在する変数:

- `GMAIL_RESERVATION_EMAIL`
- `GMAIL_RESERVATION_SUBJECT`
- `GMAIL_OAUTH_CLIENT_ID`
- `GMAIL_OAUTH_CLIENT_SECRET`
- `GMAIL_OAUTH_REFRESH_TOKEN`
- `GMAIL_AUTO_SYNC_ENABLED`
- `GMAIL_SYNC_INTERVAL_SECONDS`
- `GMAIL_SYNC_LOOKBACK_DAYS`
- `GMAIL_SYNC_CRON_SECRET`
- `GMAIL_SYNC_ORGANIZATION_ID`
- `GMAIL_BROWSER_INGEST_SECRET`
- `GMAIL_BROWSER_INGEST_ORGANIZATION_ID`
- `GMAIL_SYNC_INTERNAL_URL`

AWSではprocess内timerを使用しない。継続する場合はEventBridgeから`GMAIL_SYNC_CRON_SECRET`で認証された処理を呼ぶ。Chrome bridgeは店舗PC依存の暫定integrationとして扱い、production backendの可用性要件に含めない。

## 9. LINE reservation integration

店舗ごとのMessaging APIチャネルシークレットとチャネルアクセストークンはDBへ暗号化保存する。平文を環境変数やtask definitionへ店舗ごとに追加しない。

| 変数 | secret | 保存先 | 用途 |
| --- | --- | --- | --- |
| `INTEGRATION_SECRET_ENCRYPTION_KEY` | yes | Secrets Manager | 店舗別LINE資格情報の暗号化 |
| `APP_URL` | no | task env / application secret | Webhook URLとLIFF Endpoint URLの生成 |

既存環境への段階導入中は`INTEGRATION_SECRET_ENCRYPTION_KEY`未設定時に`ADMIN_AUTH_SECRET`から暗号化キーを導出する。正式運用では独立した値をSecrets Managerへ追加し、既存データを再暗号化してから切り替える。

Messaging APIチャネルID、LINE LoginチャネルID、LIFF IDは店舗運用設定から保存する。チャネルシークレットとチャネルアクセストークンは保存後に画面・APIへ返さない。

## 10. Environment validation target

Phase 1で起動時validationを追加する。

productionで即時停止する条件:

- `APP_ENV !== production`
- production URLがHTTPSでない
- session secretが短い
- DB URLがlocalhost
- private assets bucket未設定
- `ALLOW_DEMO_DATA=true`
- `MAIL_PROVIDER=ses`で送信元未設定
- `STORAGE_PROVIDER`が`s3`でない
- `ALLOW_LEGACY_CUSTOMER_ID_PORTAL=true`

secretの値そのものはvalidation error/logへ出さない。
