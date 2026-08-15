# AWS source repository

Salon de Lien のソースを別PCから扱うための安全な保管・取得手順です。

## 保管方針

- AWS上の保管先は非公開とし、IAM認証なしでは取得できないようにする。
- `.env`、`.env.local`、OAuth token、DB、ログ、バックアップ、顧客アップロード画像は含めない。
- 秘密値はSecrets ManagerまたはSSM Parameter Storeで管理し、ソースへ保存しない。
- アップロード前に `scripts/aws/prepare-source-snapshot.ps1` で安全な複製と秘密情報検査を行う。

## 安全なソース複製

```powershell
powershell -ExecutionPolicy Bypass -File scripts/aws/prepare-source-snapshot.ps1
```

出力はユーザーのTEMP配下に作られ、元の作業ツリーは変更されません。検査で秘密情報の候補が見つかった場合は処理を停止します。

## 別PCで扱う際の原則

1. 個人用のAWS IAM Identity Centerまたは最小権限IAMユーザーでサインインする。
2. 共有アクセスキーや管理者キーをソースに保存しない。
3. 編集前に最新版を取得し、変更は履歴が残る形で保存する。
4. `.env.local` は各PCで個別に作り、GitやS3へアップロードしない。
5. 本番DBへ開発PCから直接接続しない。

具体的な取得コマンドと保管先は、AWS側の作成結果に合わせて追記します。
