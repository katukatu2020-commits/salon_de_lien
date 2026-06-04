# Salon de Lien

散髪屋向けの顧客カルテ・髪型提案システムMVPです。顧客ごとの髪質、好み、NG条件、来店履歴、髪型提案を保存し、次回来店時に見返せることを目的にしています。

## 技術スタック

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- Docker Compose

## Windows 11 動作検証環境

このアプリはネイティブアプリではなく、ブラウザベースのWebアプリとしてWindows 11で検証します。

想定環境:

- Windows 11
- Google Chrome 最新版
- Microsoft Edge 最新版
- Node.js LTS
- Docker Desktop
- PostgreSQL は Docker Compose で起動
- VS Code

## Windows 向けセットアップ手順

PowerShell、Windows Terminal、または VS Code のターミナルで、このプロジェクトのルートディレクトリを開いて実行します。

### 1. 依存関係のインストール

```bash
npm install
```

### 2. `.env` の作成

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Git Bash などを使う場合:

```bash
cp .env.example .env
```

`.env` には以下の接続文字列を設定します。

```env
DATABASE_URL="postgresql://salon:salon_password@localhost:5432/salon_de_lien?schema=public"
BLOB_READ_WRITE_TOKEN=""
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
OPENAI_IMAGE_MODEL="gpt-image-1.5"
ENABLE_STYLE_IMAGE_GENERATION="false"
STYLE_SIMULATION_PROVIDER="openai"
FAL_KEY=""
FAL_STYLE_MODEL="photomaker"
ENABLE_IDENTITY_MASTER_GENERATION="true"
```

### 3. Docker Compose による PostgreSQL 起動

Docker Desktop を起動してから実行します。

```bash
docker compose up -d
```

### 4. Prisma migration の実行

```bash
npx prisma migrate dev
```

必要に応じて Prisma Client を生成します。

```bash
npx prisma generate
```

Prisma Studio でデータを確認する場合:

```bash
npx prisma studio
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

### 6. Chrome / Edge での確認URL

開発サーバー起動後、以下を開きます。

- Google Chrome: `http://localhost:3000/customers`
- Microsoft Edge: `http://localhost:3000/customers`

## Windows 向け最短セットアップ例

```bash
npm install

docker compose up -d

npx prisma migrate dev

npm run dev
```

ブラウザで `http://localhost:3000/customers` を開いて確認します。

## npm scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run prisma:generate
npm run prisma:deploy
npm run prisma:migrate
npm run prisma:studio
```

## クラウドデプロイ手順（Vercel + Neon PostgreSQL）

Vercel とクラウド PostgreSQL に公開する場合は、ローカルの Docker PostgreSQL ではなく、Neon などで作成した PostgreSQL の接続文字列を使います。

### 1. GitHub に push

変更内容を GitHub リポジトリへ push します。

```bash
git add .
git commit -m "Prepare Vercel deployment"
git push
```

### 2. Neon で PostgreSQL を作成

Neon で新しい PostgreSQL プロジェクトを作成し、接続文字列を取得します。

接続文字列は以下のような形式です。

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require"
```

### 3. Vercel に GitHub リポジトリを Import

Vercel の New Project から GitHub リポジトリを Import します。

Framework Preset は Next.js を選択します。

### 4. Vercel Environment Variables を設定

Vercel の Project Settings で Environment Variables に以下を追加します。

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
BLOB_READ_WRITE_TOKEN=Vercel Blob の Read Write Token
OPENAI_API_KEY=OpenAI API Key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-1.5
ENABLE_STYLE_IMAGE_GENERATION=false
STYLE_SIMULATION_PROVIDER=openai
FAL_KEY=
FAL_STYLE_MODEL=photomaker
ENABLE_IDENTITY_MASTER_GENERATION=true
```

Production / Preview / Development のどこで使うかは運用に合わせて選択します。まずは Production に設定してください。

### 5. 本番DBへ migration を適用

Vercel に設定したものと同じ `DATABASE_URL` をローカル環境に一時的に設定して、本番DBへ migration を適用します。

Windows PowerShell の例:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require"
npm.cmd run prisma:deploy
```

`prisma:deploy` は `prisma migrate deploy` を実行し、既存の migration をクラウドDBに適用します。

### 6. Vercel で再デプロイ

Vercel の Deployments から Redeploy を実行します。

このプロジェクトでは `postinstall` で `prisma generate` を実行するため、Vercel build 時にも Prisma Client が生成されます。

### 7. 公開URLを確認

デプロイ完了後、Vercel の公開URLで以下を確認します。

- `/customers`
- `/customers/new`
- `/customers/[id]`

初期データがない場合は、まず `/customers/new` から顧客を登録してください。

## 検証コマンド

Windows 11で依存関係のインストールとPrisma migrationが完了した後、以下を実行して確認します。

```bash
npm run build
npm run lint
npm run typecheck
```

## 実装済み機能

- 顧客一覧表示
- 顧客名検索
- 顧客登録
- 顧客基本情報編集
- 髪質プロフィール作成・更新
- 好み・NG条件作成・更新
- NG条件の強調表示
- 来店履歴追加
- 来店履歴の新しい順表示
- 髪型提案追加
- OpenAI APIを使ったAI髪型提案生成・保存
- AI髪型提案の3案生成（本命・安全・挑戦）
- 髪型提案カードへの参考画像URL追加
- 顧客本人写真を前提にした髪型シミュレーション提案の土台
- AIシミュレーション用写真の複数登録（正面2〜4枚、横顔2〜4枚、後ろ姿0〜2枚）
- 髪型提案の新しい順表示
- 髪型提案の採用フラグ更新
- Vercel Blobを使った顧客プロフィール画像アップロード
- 将来AI連携用の `buildStyleSuggestionContext(customerId)` と `generateStyleSuggestions(customerId)`
- Docker Compose によるローカルPostgreSQL起動

## 今後追加する機能

- AI APIを使った髪型提案生成
- 顧客基本情報以外の編集体験改善
- 入力エラー表示の改善
- 写真アップロード
- 提案と来店履歴の詳細編集
- 認証とスタッフ管理

## 今回実装していないこと

- 顔写真の画像解析
- AIによる絶対的な髪型判定
- 顔認識
- 決済機能
- 予約機能
- LINE連携
- 複数店舗管理
- 高度な権限管理

## AI髪型提案と画像利用の注意

AI髪型提案はスタッフ向けの参考情報です。最終判断はスタッフが行い、顧客本人の希望・NG条件を必ず優先してください。

顧客本人の写真をAI提案や髪型シミュレーションに使う場合は、必ず本人の同意を取ってください。生成画像は仕上がりを保証するものではなく、髪質・骨格・施術条件により実際の仕上がりは変わります。

本番利用では、認証とアクセス制御が必要です。また、実顧客写真をPublic Blobに保存しない構成も検討してください。デモでは許可済み画像のみを使ってください。

AIシミュレーション用写真は、正面写真2枚以上・横顔写真2枚以上が必要です。後ろ姿写真は任意で、襟足や後頭部のシルエット確認に使えます。

写真は同じ場所、同じ明るさ、同じ服装で、無加工・フィルターなしのものを推奨します。顔全体と髪の輪郭が見えるようにし、帽子、マスク、サングラスは外してください。

`ENABLE_STYLE_IMAGE_GENERATION` が `false` または未設定の場合、画像生成は行わず、AI文章提案のみ保存します。`true` にした場合は、登録済みの正面写真群・横顔写真群・任意の後ろ姿写真を参照して、相談用の3方向シミュレーション画像を生成します。

## FaceID基準 + 髪型編集方式

Salon de Lienでは、本人性を高めるために外部生成Providerを利用できます。Vercel Environment Variables に以下を追加してください。

```env
STYLE_SIMULATION_PROVIDER="fal-photomaker-openai-edit"
FAL_KEY="..."
FAL_STYLE_MODEL="photomaker"
ENABLE_IDENTITY_MASTER_GENERATION="true"
```

この方式では、fal.ai PhotoMakerで本人性基準画像を生成し、その後OpenAI画像編集APIで髪型だけを変更します。

注意:

- 生成画像は相談用の参考です。
- 本人性や仕上がりを完全に保証するものではありません。
- API利用料が発生します。

`STYLE_SIMULATION_PROVIDER="openai"` または未設定の場合は、既存のOpenAI画像生成fallbackを使います。`fal-photomaker-openai-edit` で `FAL_KEY` が未設定、PhotoMaker APIが失敗、またはOpenAI編集で失敗した場合は、可能な範囲でOpenAI fallbackに切り替えます。
## 顧客削除機能

顧客削除は論理削除です。削除操作では `Customer.deletedAt` に削除日時を保存し、来店履歴・髪質・好み・髪型提案・おすすめコースの関連データは物理削除しません。

- 顧客一覧と検索には、削除済み顧客を表示しません。
- 削除済み顧客の詳細URLへ直接アクセスした場合は404相当として扱います。
- 本番利用では復元機能、監査ログ、削除権限の追加を検討してください。

## AIおすすめコース提案機能

顧客詳細の「おすすめコース」タブで、髪質・好み・NG条件・来店履歴・髪型提案履歴をもとに、スタッフ向けの施術コース候補を3件生成して保存できます。

- 提案は「本命」「低負担」「挑戦」の3件です。
- 価格と所要時間は目安です。正式な施術内容・料金は店舗で確認してください。
- AI提案は参考情報です。最終判断はスタッフが行い、顧客本人の希望・NG条件を必ず優先してください。
- `OPENAI_API_KEY` が未設定の場合でも画面は落ちず、カルテ情報ベースのフォールバック提案を作成します。
- フォールバックでは、髪量が多い場合は毛量調整、頭皮状態が気になる場合は炭酸スパ、セット時間が短い場合は扱いやすいショートやニュアンスパーマ候補を優先します。
## Demo Stable Style Simulation Provider

For demo stability, use the OpenAI-only simulation provider.

```env
STYLE_SIMULATION_PROVIDER="openai"
OPENAI_IMAGE_MODEL="gpt-image-1.5"
```

`fal-photomaker` and `fal-photomaker-openai-edit` remain in the codebase for experiments only. They are not recommended for production demos because they can produce broken images, unstable identity results, or OpenAI hair edit authorization errors.

The OpenAI-only provider uses the registered front and side reference photos, optional rear photos, and the hairstyle prompt to create three consultation images: three-quarter front, side, and rear three-quarter. The identity score display, generated image delete button, progress UI, and proposal selector are still available.

If `gpt-image-1.5` is not available in the deployment environment, the code retries image generation once with `gpt-image-1`.

## Experimental Identity Master Providers

For stable demos, keep:

```env
STYLE_SIMULATION_PROVIDER="openai"
```

The following providers are for identity-preservation experiments only:

```env
STYLE_SIMULATION_PROVIDER="fal-identity-master"
STYLE_SIMULATION_PROVIDER="fal-identity-master-openai-edit"
FAL_KEY=""
FAL_STYLE_MODEL="photomaker"
```

`fal-identity-master` uses fal PhotoMaker to generate identity master reference images only. These images are not treated as final hairstyle simulation images and are not mixed into `StyleSuggestion.imageUrlsJson`.

`fal-identity-master-openai-edit` sends only identity master images that pass quality and identity checks to OpenAI hair edit. If OpenAI hair edit fails, identity master images are not automatically saved as final outputs.

The legacy values `fal-photomaker` and `fal-photomaker-openai-edit` are kept for backward compatibility and are normalized internally to the new identity master providers.
