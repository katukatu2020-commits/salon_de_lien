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
- AIによる自動髪型判定
- 顔認識
- 決済機能
- 予約機能
- LINE連携
- 複数店舗管理
- 高度な権限管理
