# AWS runtime recovery snapshot - 2026-08-23

ECS task definition `salon-de-lien-staging-web:394` が使用するECRイメージから、`/app` 配下のコード・静的資産・ビルド成果物を抽出した復旧用スナップショットです。

- Runtime source root: `runtime-root/`
- Next.js build archive: `next-build.tar.gz`
- Identity and allowed configuration names: `manifest.json`
- Per-file hashes: `checksums.sha256`
- Immutable image digest: `sha256:4315f38197acbc6bdab7e38eda70028ff640f0e8d7b8d492f16f6e10d65a542e`

秘密値、本番DBデータ、`node_modules`、Docker OS層は含みません。完全な依存レイヤーはAWS ECRからimmutable digestで取得します。

`next-build.tar.gz` はWindowsの長いパスによるcheckout失敗を防ぐためのものです。展開後の552ファイルは `checksums.sha256` で検証できます。アーカイブ自体のSHA-256は `7725b28ca7fff3978c9520a5ccf3245859ad1011fc0915150f7ad380bbbf1f15` です。
