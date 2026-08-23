# Salon de Lien 別PC引き継ぎガイド

現在のAWS本番環境を別PCへ再現する場合は、まず [CURRENT_PRODUCTION_HANDOFF.md](CURRENT_PRODUCTION_HANDOFF.md) を確認してください。

## 必要なもの

- Git
- Docker Desktop
- AWS CLI v2
- AWS account `009293460979` のECR読取権限
- 必要に応じてNode.js/npm（ソース開発用）

## 起動

```powershell
git clone https://github.com/katukatu2020-commits/salon_de_lien.git
cd salon_de_lien
git switch aws-production-source-complete-20260819
npm run local:aws-pull
npm run local:aws-up
npm run local:aws-verify
```

`npm run local:aws-verify` が `MATCH` を返せば、実行イメージと本番配信chunkが一致しています。

## ソースだけを変更する場合

通常の開発用セットアップは既存の `package.json`、Docker Compose、Prisma migrationを利用してください。本番反映時には、必ずGit commit、GitHub push、ECR digest、ECS revisionを一組として記録します。

Secretsや本番顧客データはGitHubに含まれません。別PCではAWSの認証経由で取得してください。
