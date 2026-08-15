# Security Checklist

状態: Phase 1-3 implementation audit  
更新日: 2026-08-01

記号:

- `[x]` 現在確認済み
- `[~]` 一部実装
- `[ ]` 未実装または外部公開を止める項目

## P0 Authentication and authorization

- [x] 管理CookieにHttpOnlyを設定
- [x] 管理CookieにSameSite=Laxを設定
- [~] HTTPS時にSecureを設定。proxy headerを含むproduction確認は未実施
- [x] session HMAC署名と期限検証
- [x] ADMIN / STAFF / CUSTOMER / MANUFACTURER role
- [x] AppUserによるUser / Staff identity
- [~] Organization境界。主要API/商品/紹介/顧客に実装、全Actionの網羅テストは未実施
- [~] 主要API/商品編集Actionのresource authorization。全Action監査は継続
- [ ] CUSTOMERの他顧客アクセス拒否テスト
- [ ] STAFFの他組織アクセス拒否テスト
- [ ] MANUFACTURERの顧客カルテ拒否テスト
- [ ] session revocation
- [ ] MFAまたは同等の管理者強化
- [ ] 複数ECS taskで共有されるlogin rate limit
- [x] staging CDKにWAF managed ruleとIP rate limit

## P0 Customer portal and tokens

- [x] ProductReviewRequest tokenは32 byte random
- [x] ProductReviewRequest tokenはSHA-256 hashだけをDB保存
- [x] review tokenに期限/status/answered checkあり
- [x] productionの`/u/[token]`からraw customerIdを排除
- [x] customer portal tokenのhash/expiry/revoke
- [~] 顧客向け主要URLからcustomerIdを排除。非production互換routeはflag制御
- [x] 期限切れ/取消済みportal token拒否
- [ ] tokenをログへ出さない構造化logger

## P0 Review and points

- [x] `ProductReview.reviewRequestId` unique
- [x] point source unique制約
- [x] 現ローカルDBで台帳/ロット/表示残高不一致0件
- [x] review/request/consent/pointsを同一DB transactionへ統合
- [x] feedback/pointsを同一DB transactionへ統合
- [ ] 同時POSTで1回答・1付与となるintegration test
- [ ] point redeemの同時利用保護
- [ ] checkout idempotency key必須化
- [ ] cancellationを追記transactionとして実装/検証
- [ ] 日次台帳reconciliation jobとalarm

## P0 Photos

- [x] MIME、magic bytes相当、5MB、40MP制限
- [x] production customer photoをprivate S3へ保存
- [x] staging CDKでS3 Block Public Access全設定
- [x] object keyにPIIを含めない
- [~] DBへprivate object referenceを保存。checksum/size/content typeの専用列は未追加
- [~] 認可後だけpresigned URLを発行。越境integration testは未実施
- [ ] CUSTOMER AからCUSTOMER Bの写真を拒否
- [ ] MANUFACTURERの写真閲覧を拒否
- [x] Sharp decodeによる画像実体検証
- [x] JPEG再エンコードによるEXIF位置情報除去
- [~] uploadのS3/DB補償処理。移行スクリプトは補償、全upload action監査は継続
- [ ] deleteのDB/S3整合
- [ ] 既存public Blob URLの棚卸しと失効計画

## P0 Manufacturer privacy

- [x] MANUFACTURER payloadからreviewerName/reviewerHrefを削除
- [x] phone/email/customerId/staffId/visitIdをメーカーpayloadへ含めない
- [x] `allowAnonymousShare=true`だけ集計
- [x] `allowAnonymousQuote=true`だけ引用
- [x] freeCommentからphone/emailを除外
- [x] n < 5で詳細属性・原文を抑制
- [x] thresholdを環境変数で変更可能
- [x] MANUFACTURER roleによるmanufacturer scope
- [ ] privacy response contract test

## P0 Environment and data

- [x] `.env`と`.env.local`はGit ignore
- [ ] development / staging / production DB分離
- [ ] production S3/Secrets/log分離
- [x] production seed/demo/legacy portal起動ガード
- [ ] productionにデモ顧客/売上/pointを投入しない検査
- [x] CDKでRDSをprivate isolated subnetへ配置
- [ ] production DBへの日常的な開発PC直接接続を禁止
- [ ] secret scanをCIへ追加

## P0 Infrastructure

- [x] production multi-stage Dockerfile
- [x] non-root container（`nextjs`で実起動確認）
- [x] `.env`をimageへ含めない`.dockerignore`
- [x] live/ready health endpoint
- [x] ECS Fargate private subnet
- [x] RDS private isolated subnet
- [~] domain context指定時のALB HTTPS + ACM。AWS deployは未実施
- [x] staging CDKにWAF
- [x] Secrets Manager
- [x] S3/SESに限定したTask Role
- [ ] CloudWatch JSON logs
- [ ] PII redaction
- [ ] 5xx/login/DB/S3/SES/review/point alarms
- [x] deployment circuit breaker + rollback

## P0 Backup and recovery

- [x] CDKでRDS automated backup（staging 7日 / production 14日）
- [x] production retention 14日
- [ ] PITR確認
- [ ] deploy前snapshot
- [x] CDKでS3 versioning
- [ ] staging restore rehearsal
- [ ] 復元後接続切替手順
- [ ] 旧運用へ戻す手順
- [ ] RTO/RPOをオーナーと合意

## P0 Tests

- [x] TypeScript strict check成功
- [x] lint成功。warning 1件
- [x] test runner/script
- [~] token/session authorization unit test。DB越境integration testは未実施
- [ ] review/point concurrency tests
- [ ] S3 authorization/upload tests
- [ ] manufacturer privacy contract tests
- [ ] mobile 360/375/390/412/430 visual/E2E
- [ ] required full E2E

## Release gate

production deployは次をすべて満たすまで禁止する。

1. 上記P0の未完了が0件。
2. stagingでmigration、E2E、backup restore rehearsalが成功。
3. production DB/S3/Secretsにデモデータがない。
4. rollbackが実演済み。
5. iPhone Safari、Android Chrome、PC管理画面の手動確認が完了。

## Dependency security blocker

- [ ] `npm audit --omit=dev`のhigh 4件を解消する。
- 現在の主因はNext.js 14.2.35、Sharp 0.34系、および推移依存のPostCSS/Undici。
- npmの提示修正はNext.js 16 / Sharp 0.35への更新を含むため、専用branchで互換性・E2E確認後に反映する。
- この項目が未完了の間はproduction公開しない。
