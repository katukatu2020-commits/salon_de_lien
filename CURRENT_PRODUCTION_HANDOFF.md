# Salon de Lien AWS本番・完全引き継ぎ情報

更新日: 2026-08-23 (JST)

## 本番環境の基準

- GitHub branch: `aws-production-source-complete-20260819`
- AWS account: `009293460979`
- AWS region: `ap-northeast-1`
- ECS cluster: `salon-de-lien-staging-cluster`
- ECS service: `salon-de-lien-staging-web`
- ECS task definition: `salon-de-lien-staging-web:400`
- ECR repository: `salon-de-lien-staging-app`
- ECR tag: `customer-store-session-isolation-v400`
- immutable digest: `sha256:c3862bee5b29d8e5bf015e617c8511b9907c7b612f996cb329b32a8fe6767286`
- production URL: `https://salon-de-lien.com`
- local recovery tag: `aws-production-v400-20260823-recovered`

このdigestを本番コードの正とします。可変タグではなく、必ず上記digestで照合してください。

## 別PCでの最短復元

```powershell
git clone https://github.com/katukatu2020-commits/salon_de_lien.git
cd salon_de_lien
git switch aws-production-source-complete-20260819
git fetch --tags
npm run local:aws-pull
npm run local:aws-up
npm run local:aws-verify
```

ローカルURLは `http://localhost:3000` です。ローカルDBはDocker ComposeのPostgreSQLを使用します。

## GitHubに保存した復旧用スナップショット

`aws-runtime-recovery/2026-08-23/runtime-root/` はECS revision 394のportable baselineです。revision 395〜400は `scripts/aws/runtime-patches/` の連続パッチで再現し、v400のECR immutable digestをローカル照合の正本とします。

含むもの:

- Next.js `.next` ビルド成果物（`next-build.tar.gz`、552ファイル）
- `src`, `public`, `prisma`, `scripts`
- Prisma schemaと全migration
- 本番runtime patch群
- package情報と実行用トップレベルファイル
- ファイル単位のSHA-256チェックサム

含まないもの:

- AWS Secrets Managerの値
- `.env` / `.env.local`
- 本番DBの顧客データ
- Docker OS層と `node_modules`

これらをGitHubへ保存しないのは意図したセキュリティ対策です。依存レイヤーを含む実行イメージ本体はECRのimmutable digestから取得してください。

## 必要な秘密情報

秘密値はAWS Secrets Manager/ECSから安全に注入します。GitHubへコピーしません。環境変数名とSecret名だけは `aws-runtime-recovery/2026-08-23/manifest.json` に記録しています。

## リリース時の原則

1. 変更を必ずGitへcommitし、同じbranchへpushする。
2. ECRへ一意のtagでbuild/pushする。
3. ECS task definitionのrevisionとECR digestを記録する。
4. `/api/health/live` と `/api/health/ready` を確認する。
5. CloudFront配信中の主要chunkまで照合する。
6. 可変タグやローカルの未commitファイルだけを本番へ投入しない。
