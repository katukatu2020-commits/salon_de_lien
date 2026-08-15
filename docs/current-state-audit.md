# Salon de Lien 現状監査

監査日: 2026-08-01  
対象ブランチ: `rebuild-from-good-front`  
基準コミット: `ac61b92`  
Prisma schema SHA-256: `8EBC49034B3F02A85E5E0C4A4B1FF5A9CE0393AE1164764F236725793B9DA298`

## 1. 結論

現在のアプリは、ローカルの単一店舗デモとしては主要業務を確認できる。一方、AWSへそのまま公開できる状態ではない。

外部公開を止めるP0課題は次のとおり。

1. `/u/[token]` の `token` が実際には `Customer.id` であり、顧客認証・期限・失効がない。
2. 管理認証は単一の `owner` セッションだけで、ADMIN / STAFF / CUSTOMER / MANUFACTURER と組織境界がない。
3. 顧客写真とAI参照写真が Vercel Blob の public URL で保存される。
4. 商品レビュー回答とポイント付与が別トランザクションである。
5. メーカー集計が顧客名・管理画面への顧客リンクを返し、匿名共有同意と少数抑制を適用していない。
6. development DB にデモデータが混在し、seedをproductionで止めるガードがない。
7. 本番用Dockerfile、AWS IaC、CI、health check、自動テスト、環境分離がない。

P0を解消するまで、インターネット向けproduction公開を行わない。

## 2. 技術構成

| 項目 | 現在 |
| --- | --- |
| Web | Next.js 14.2 / App Router / React 18.3 |
| 言語 | TypeScript 5.6、`strict: true` |
| UI | Tailwind CSS 3.4 |
| DB | PostgreSQL 16 / Prisma 5.22 |
| ローカルDB | Docker Compose。アプリコンテナは未定義 |
| 画像 | `@vercel/blob`、public access |
| 管理認証 | HMAC署名Cookie、単一owner |
| 顧客認証 | 未実装。生のcustomerIdをURLで使用 |
| メーカー認証 | 未実装 |
| メール | Gmail OAuth / Chrome bridge。SES未実装 |
| 定期処理 | Next.jsプロセス内の`setInterval` |
| CI/CD | 未実装 |
| 自動テスト | 未実装。`test` scriptなし |
| AWS | 未実装 |

`Dockerfile`、`.github/workflows`、`infrastructure`、health endpoint、PWA manifest/service workerは存在しない。

## 3. 機能監査

### 3.1 正常に使用可能

| 機能 | 根拠 | 制約 |
| --- | --- | --- |
| 顧客カルテ | `Customer`、`HairProfile`、`Preference`、顧客詳細画面 | 組織境界なし |
| 来店履歴 | `Visit` と顧客詳細 | 写真との構造化関連なし |
| 予約一覧・会計表示 | `Appointment`、`ServiceSale`、管理画面 | POS決済との連携なし |
| 商品マスタ・商品提案 | `Product`、`ProductProposal` | `staffId`はUser relationではない |
| レビュー依頼token | 32 byte random token、SHA-256 hash、期限・回答済み状態 | 回答後のポイント処理は別transaction |
| ポイント台帳 | Account / Transaction / Lot / Allocation | 高並行時の行ロックなし |
| Prisma migration | development DBへ18件適用済み | production deploy手順未整備 |
| 管理ログイン | HttpOnly / SameSite=Lax Cookie | owner 1種類、分散rate limitなし |

### 3.2 一部実装

| 機能 | 現状 | 不足 |
| --- | --- | --- |
| お客様ポータル | `/u/[token]` と `/app/[id]` | token化・顧客認証・顧客単位認可 |
| 来店後フィードバック | 最新来店/会計ごとに重複確認 | 生のcustomerId URL、回答とポイントが非原子的 |
| 顧客写真 | MIMEと5MB制限あり | public保存、署名URL、S3削除整合、EXIF除去 |
| Before/After写真 | 顧客/AI参照画像URLを表示 | Visitに紐づく専用Photoモデルがない |
| Gmail予約取込 | OAuth/Chrome bridgeと重複判定 | Fargate向けscheduler、SESとは別責務化 |
| メーカー集計 | 商品別評価・年代・性別・レビュー表示 | 匿名化、同意、n抑制、メーカーrole |
| DBバックアップ | ローカルDocker用PowerShell script | RDS PITR、保持、復元試験、S3復元 |
| レスポンシブUI | 管理画面と一部公開画面に対応 | 360/375/390/412/430の継続E2Eなし |

### 3.3 画面のみ、APIのみ、未実装

- 画面のみ: 管理ダッシュボード、ポイント、レポートの一部は顧客画面へのredirectまたはalias。
- APIのみ: `/api/public/customer-portal/[token]` はあるが、安全なPortalSessionモデルがない。
- 未実装: CUSTOMER/MANUFACTURERログイン、組織、S3 private storage、SES、PWA、CloudWatch alarm、WAF、IaC、CI/CD、E2E。

### 3.4 重複実装

- `Coupon` と `CouponIssue`
- `ProductSuggestion` と `ProductProposal`
- `/api/products` と `/api/admin/products` の再export
- `/api/product-proposals/...` と `/api/admin/product-proposals/...` の再export
- `/api/reports/manufacturer-products` と `/api/admin/reports/manufacturer-products` の再export
- `/customers` と `/admin/customers`。後者は前者を再exportする。
- `/app/[id]` と `/u/[token]`。後者は前者へ生のIDを渡す。

本番移行中は互換routeを急に削除しない。正式routeを決め、認可を共通化した後に段階的に廃止する。

## 4. ルートと公開境界

### 4.1 管理画面

主な正式候補routeは次のとおり。

- `/admin/login`
- `/admin/customers`
- `/admin/customers/[customerId]`
- `/admin/appointments`
- `/admin/appointments/[appointmentId]`
- `/admin/products`
- `/admin/reports/manufacturer-products`

`middleware.ts` は `/admin`、`/customers`、`/reports` と一部APIを保護する。ただし認証済みownerかどうかだけを見ており、対象customer/productへの認可は各route/actionに存在しない。

### 4.2 お客様向け

- `/u/[token]`
- `/u/[token]/care`
- `/u/[token]/feedback`
- `/u/[token]/proposals/[proposalId]`
- `/u/[token]/review/product/[reviewToken]`
- `/review/product/[token]`

レビューtokenだけは推測困難・ハッシュ保存・期限付き。Portalの`token`は`Customer.id`そのものであり、名称と実態が一致しない。

### 4.3 API

middlewareによるパス保護はあるが、Server Actionとroute内部の共通認可コンテキストはない。公開画面から呼ばれる顧客写真更新、フィードバック、提案回答は特に注意が必要。

## 5. DBとデータ整合性

### 5.1 モデル

主要モデルは存在する。

- Customer / HairProfile / Preference / Visit / Appointment / ServiceSale
- Product / ProductProposal / ProductReviewRequest / ProductReview / Consent
- CustomerPointAccount / PointTransaction / PointLot / PointRedemptionAllocation / PointRule
- Referral
- Coupon / CouponIssue

存在しない本番境界モデル:

- Organization
- User / Staff
- Role / Membership
- CustomerPortalSessionまたはCustomerAccessToken
- VisitPhotoまたはCustomerPhoto
- IdempotencyKey
- 監査ログ

### 5.2 ローカルDB基準値

2026-08-01時点:

| データ | 件数 |
| --- | ---: |
| Customer | 256 |
| Visit | 481 |
| Appointment | 64 |
| ServiceSale | 481 |
| Product | 43 |
| ProductProposal | 721 |
| ProductReviewRequest | 174 |
| ProductReview | 169 |
| Consent | 332 |
| CustomerPointAccount | 121 |
| PointTransaction | 15 |
| PointLot | 12 |
| Coupon / CouponIssue | 2 / 14 |

このうち、owner dashboard simulation顧客は120件、Milbon seed marker付きProductProposalは715件。実データとデモデータは同一DBに混在している。

ポイント121口座について、表示キャッシュ、台帳合計、有効ロット残高の不一致は0件だった。

### 5.3 原子性と冪等性

- `ProductReview.reviewRequestId` uniqueと`PointTransaction(sourceType, sourceId, type)` uniqueは二重登録防止に有効。
- 商品レビュー作成transactionのcommit後に、別transactionでポイントを付与する。この間の障害で不整合が発生する。
- フィードバックもContactLog作成後に別transactionでポイントを付与する。
- ポイント利用はロット順消費するが、同時利用時のrow lockまたはserializable transactionがない。
- `checkoutSourceId`を渡さない利用はランダムsourceIdとなり、同一会計再送の冪等性を保証しない。
- status/typeが多くの箇所で自由なStringであり、DB制約がない。

## 6. 写真・ファイル監査

`src/lib/actions/index.ts` はプロフィール画像、公開intake写真、AI参照写真を`access: "public"`でVercel Blobへ保存する。DBには公開URLを保存する。

良い点:

- JPG / PNG / WebPのMIME制限
- 5MB制限
- ファイル名の一部sanitize

本番阻害:

- 顧客写真が公開URL
- オブジェクトkeyにorganization境界がない
- DBにobject keyではなくprovider URLを保存
- 削除ActionがBlob自体を削除しない
- public intakeのアップロードとDB更新が一体化されていない
- EXIF位置情報の除去なし
- Content sniffingなし
- customerId差替えに対するAction内認可なし

## 7. 認証・認可監査

現在の管理CookieはHMAC署名、HttpOnly、SameSite=Laxであり、HTTPS時にSecureとなる。これは単一ownerのローカル管理には使える。

本番要件を満たさない点:

- roleは`owner`だけ
- User/Staff/Manufacturer/Customerのidentityがない
- session revocation/MFAがない
- login rate limitがプロセス内Mapで、複数task間共有されない
- organizationIdが存在しない
- route/action内で対象resourceの所有権を検証しない
- customer portal tokenのhash/expiry/revokeがない
- メーカー専用認証がない

## 8. メーカー集計の個人情報監査

`src/lib/products/manufacturer-report.ts` は、各レビューに次を返す。

- `reviewerName`
- `reviewerGender`
- `reviewerAgeGroup`
- 管理画面利用時の`reviewerHref`

さらに`allowAnonymousShare`と`allowAnonymousQuote`をquery/select/filterに使用せず、n < 5の詳細抑制もない。APIの禁止key検査は`reviewerName`を検知しない。

現状のメーカー画面はオーナー内部レビュー確認画面としてのみ扱い、メーカーへ公開しない。

## 9. 運用・デプロイ監査

- ComposeはPostgreSQLだけ。DB passwordがローカル固定値。
- Next.jsアプリ用Dockerfileなし。
- `next.config.mjs`に`output: "standalone"`なし。
- `/api/health`なし。
- migrationは手動scriptとして`prisma migrate deploy`があるが、deploy pipelineがない。
- `.env`をGitへ含めない設定はある。
- `.env.example`はAWS、S3、SES、environment markerを網羅していない。
- Gmail syncはNext.jsプロセス内timer。ECS task数だけ実行され得る。
- ログはconsole中心で、PII redactionと構造化がない。
- RDS/S3のbackup、restore、retention、restore rehearsalはない。

## 10. 現在の品質基準

| コマンド | 結果 |
| --- | --- |
| `npx prisma migrate status` | 成功、18 migrations、up to date |
| `npm run typecheck` | 成功 |
| `npm run lint` | 成功、`<img>` warning 1件 |
| `npm test` | scriptなし |
| `npm run build` | 成功、38.7秒。既存production server停止後に実行 |

## 11. AWS移行を妨げるファイル

| ファイル | 理由 | Phase |
| --- | --- | --- |
| `src/app/u/[token]/page.tsx` | raw customerId | 3 |
| `src/app/api/public/customer-portal/[token]/route.ts` | raw customerIdで個人情報取得 | 3 |
| `src/app/app/[id]/page.tsx` | ID直指定の公開ポータル | 3/5 |
| `src/middleware.ts` | 単一owner、パス保護のみ | 3 |
| `src/lib/auth/admin-session.ts` | roleがownerのみ | 3 |
| `src/lib/actions/index.ts` | public Blob、Action内resource認可なし | 2/3 |
| `src/app/api/review/product/[token]/route.ts` | 回答とポイントが別transaction | 4 |
| `src/lib/actions/index.ts`のfeedback | 回答とポイントが別transaction | 4 |
| `src/lib/points/point-service.ts` | 同時利用と会計冪等性 | 4 |
| `src/lib/products/manufacturer-report.ts` | PII、同意未適用、n抑制なし | 3 |
| `src/instrumentation.ts` | in-process cron | 1 |
| `scripts/seed-*.js` | production guardなし | 1 |
| `docker-compose.yml` | DBのみ、local credential固定 | 1 |
| `.env.example` | AWS production設定不足 | 1 |

## 12. 変更範囲

### Phase 0で変更する

- 現状監査文書
- AWS target architectureの判断
- 環境変数とsecret配置方針
- P0 security checklist
- migration、schema hash、DB件数、lint/typecheck/build基準値

### Phase 0で変更しない

- Prisma schema/migration
- route/API/Server Action
- 認証方式
- 写真storage
- レビュー/ポイント処理
- AWS resource
- デモデータ

既存の大きな未コミット変更は破棄・巻き戻ししない。

## 13. 実装計画

### Phase 1: 本番基盤

1. production multi-stage Dockerfile、non-root、standalone、health endpoint。
2. CDKでVPC/ALB/ECS/ECR/RDS/S3/Secrets/CloudWatchをstagingに構築。
3. seed production guard、migration one-off task、CI build/deploy/rollback。

### Phase 2: Storage

1. StorageProvider抽象化とprivate S3 adapter。
2. object key保存と認可後presigned URL。
3. 既存Blob移行のdry-run/照合/rollback script。

### Phase 3: Security

1. Organization/User/Membership/Roleと共通authorization context。
2. customer portal token化、hash/expiry/revoke。
3. メーカーPII除去、同意適用、n抑制、分散rate limit。

### Phase 4: Data integrity

1. review + request + consent + pointsを同一transactionへ統合。
2. feedback + pointsを同一transactionへ統合。
3. point redeemのrow lock/serializable化とcheckout idempotency key。

### Phase 5: Mobile Web

1. `/u`を安全なportal identityへ接続。
2. 360〜430pxの主要導線E2E。
3. 静的assetだけを対象にPWA補助対応。

### Phase 6: Pilot

1. E2Eとセキュリティ試験。
2. staging RDS/S3復元訓練。
3. 5〜10名限定公開とKPI/incident runbook確認。

## 14. Go / No-Go

現時点: **No-Go**

P0 checklistがすべて完了し、stagingでE2Eと復元試験が通るまではproductionへ顧客データを投入しない。
