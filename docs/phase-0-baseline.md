# Phase 0 Baseline

記録日: 2026-08-01

## Repository

- branch: `rebuild-from-good-front`
- HEAD: `ac61b92`
- working tree: 監査開始前から多数の未コミット/未追跡変更あり
- 方針: 既存変更を破棄・reset・checkoutしない
- package-lock SHA-256: `6F907FF45A39BA93B836AF457F5531A4B8F4780806078ED21D7D00BDF5B7EA43`
- Prisma schema SHA-256: `8EBC49034B3F02A85E5E0C4A4B1FF5A9CE0393AE1164764F236725793B9DA298`

## Versions

- Node.js: 24.16.0
- Next.js: 14.2.x
- React: 18.3.x
- TypeScript: 5.6.x
- Prisma: 5.22.x
- PostgreSQL: 16 (local Docker Compose)
- Tailwind CSS: 3.4.x

Node 24は現在のローカル環境。production DockerではNext.js 14とnative dependencyの互換性を検証したLTS versionへ固定する。

## Migration

```text
npx prisma migrate status
18 migrations found
Database schema is up to date
```

productionでは`prisma migrate deploy`だけを使用する。

## Data snapshot

| Model | Count |
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

Demo markers:

- owner simulation customers: 120
- Milbon seeded product proposals: 715

Point reconciliation:

- accounts checked: 121
- cache vs ledger vs unexpired lots mismatch: 0

## Quality commands

### Typecheck

```text
npm run typecheck
PASS
```

### Lint

```text
npm run lint
PASS with 1 warning
src/app/customers/[id]/coupons/[couponId]/print/page.tsx: no-img-element
```

### Test

```text
npm test
NOT AVAILABLE: package.json has no test script
```

### Build

```text
npm run build
PASS in 38.7s
23 static pages generated
lint warning 1件は上記と同一
```

最初の試行は、稼働中の`next start`と同じ`.next`を使用したまま実行したため、Next.js header後に180秒でtimeoutした。該当serverだけを停止して再実行すると成功したため、compile errorではない。build後にproduction serverを再起動し、`/admin/login`がHTTP 200、Next.jsが443msでreadyになることを確認した。

## Baseline risks

- current local DBはproduction sourceではない。
- current `.next`はrunning serverが利用している可能性がある。build後は同じimage/artifactで再起動確認する。
- READMEは古いVercel/local記述と現在実装が混在する。現状判断はこの監査と実コードを優先する。
- source出力の一部に文字化けして見える箇所があるため、UTF-8としてbuild/renderを確認する。エンコードを一括変換しない。

## Phase 0 exit criteria

- [x] repository/route/schema/auth/storage/job/seedを監査
- [x] A〜Dを文書化
- [x] migration status記録
- [x] data/demo mixing記録
- [x] point ledger reconciliation
- [x] typecheck
- [x] lint
- [x] build
- [x] Phase 1 change set承認可能な粒度への分解
