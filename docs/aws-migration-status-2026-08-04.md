# AWS移行準備状況 2026-08-04

## 完了

- AWS CLIのブラウザログインを`salon-de-lien-deploy`プロファイルへ接続
- `ap-northeast-1`でSTS認証、Docker、CDK synthのpreflight成功
- staging CDKを`desiredCount=0`で安全に作成できる構成へ固定
- OneDriveのReparsePointを除去するDocker context生成処理を追加
- 本番Docker imageを実ビルド
- コンテナの`GET /api/health/live`がHTTP 200であることを確認
- コンテナ内`pg_restore`がPostgreSQL 16.14であることを確認
- ローカルDBのcustom-format dumpを作成し、`pg_restore --list`で検証
- 顧客写真S3移行dry-run: 251顧客、5画像候補、失敗0
- ポイント台帳監査: 129口座、不一致0

## 検証済みバックアップ

- ファイル: `backups/db/salon_de_lien-20260804-234139.dump`
- 形式: PostgreSQL custom format
- TOC: 258 entries
- SHA-256: `b37b913450535d597bfa5010615e4f9d118618e268b193e587b7b3c5689f7fbf`

`backups/`はGit管理対象外。本番移行までローカルの別媒体にも暗号化コピーを保持する。

## AWSへまだ作成していないもの

カード登録前のため、RDS、ECS、ALB、NAT Gateway、WAF、S3、ECRなどの課金リソースは作成していない。AWSアカウントへ予期しない月額費用は発生させていない。

## 再開に必要な入力

1. AWS支払い方法の登録とアカウント有効化
2. stagingで使う独自ドメインとRoute 53 Hosted Zone
3. staging管理者メールアドレス
4. staging管理者パスワードのbcrypt hash

準備後は`docs/deployment.md`の`deploy-staging.ps1`を実行する。最初はstagingだけを作り、スマホ・PC・認可・写真・レビューとポイントのE2Eを確認するまでproductionを開始しない。
