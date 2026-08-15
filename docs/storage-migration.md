# Customer Photo Storage Migration

顧客写真はproductionで`STORAGE_PROVIDER=s3`を必須とする。S3 bucketはBlock Public Access、versioning、HTTPS強制をCDKで設定し、DBには` s3-private://<object-key> `形式だけを保存する。閲覧時は認可後に最大15分の署名付きURLへ変換する。

## 対象

- `Customer.profileImageUrl`
- `Customer.aiFrontImageUrl / aiSideImageUrl / aiBackImageUrl`
- 各AI参照写真JSON配列

元URLは移行直後に削除しない。stagingで画像件数と表示を照合し、バックアップ保持期間を経てから旧providerを整理する。

## Dry-run

復元したstaging DBへ接続し、書き込みなしで候補件数を確認する。

```powershell
$env:APP_ENV="staging"
$env:STORAGE_PROVIDER="s3"
$env:S3_PRIVATE_ASSETS_BUCKET="<staging-bucket>"
npm run storage:migrate-customer-photos:dry-run
```

## Apply

```powershell
npm run storage:migrate-customer-photos:apply
```

処理は既に`s3-private://`の値をスキップするため冪等。画像をJPGへ正規化し、EXIFを除去し、5MB・40MP・静止画形式を検証する。S3 upload後にDB更新が失敗した場合は、その実行で作成したS3 objectを補償削除する。

production DBへ開発PCから直接実行しない。緊急時も`ALLOW_STORAGE_MIGRATION=true`を明示し、承認済みone-off ECS taskから実行する。
