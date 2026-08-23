# AWS本番runtimeのローカル照合

2026-08-23時点の照合対象は、ECS task definition `salon-de-lien-staging-web:394`、ECR digest `sha256:4315f38197acbc6bdab7e38eda70028ff640f0e8d7b8d492f16f6e10d65a542e` です。

```powershell
npm run local:aws-pull
npm run local:aws-up
npm run local:aws-verify
```

停止:

```powershell
npm run local:aws-down
```

実行イメージから監査用スナップショットを新規抽出する場合:

```powershell
npm run local:aws-sync
```

照合スクリプトはDocker image digest、health endpoint、管理画面の主要Next.js chunkを本番配信物と比較します。DBや秘密値は本番から複製しません。
