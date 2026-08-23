# AWS本番runtimeのローカル照合

2026-08-23時点の照合対象は、ECS task definition `salon-de-lien-staging-web:400`、ECR digest `sha256:c3862bee5b29d8e5bf015e617c8511b9907c7b612f996cb329b32a8fe6767286` です。

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
