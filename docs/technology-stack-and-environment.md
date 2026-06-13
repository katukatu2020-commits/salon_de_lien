# Salon de Lien 技術構成と開発環境

更新日: 2026-06-13

このドキュメントは、Salon de Lien の実装に使っている主な技術、ローカル開発環境、本番環境、別PCで開発環境を再現するための手順をまとめたものです。APIキーやDBパスワードなどの秘密情報は記載しません。

## 全体構成

Salon de Lien は、美容室向けの顧客カルテ、来店履歴、AIスタイル提案、お客様アプリ、提案共有ページを扱うWebアプリです。

主な構成は以下です。

- フロントエンド: Next.js, React, TypeScript, Tailwind CSS
- バックエンド: Next.js App Router, Server Actions
- データベース: PostgreSQL
- ORM: Prisma
- 画像保存: Vercel Blob
- AI機能: OpenAI API, fal.ai PhotoMaker
- 本番ホスティング: Vercel
- ソース管理: GitHub

## フロントエンド

使用している主なライブラリは以下です。

- Next.js `14.2`
- React `18.3`
- TypeScript `5.6`
- Tailwind CSS `3.4`
- Radix UI Tabs
- lucide-react

Next.js の App Router を使っており、主要画面は `src/app` 配下にあります。

- 顧客一覧: `src/app/customers`
- 顧客詳細: `src/app/customers/[id]`
- お客様アプリ: `src/app/app/[id]`
- 提案共有ページ: `src/app/proposals/[id]`
- カウンセリング入力: `src/app/intake`
- 仕上がりフィードバック: `src/app/feedback/[id]`
- アフターケア: `src/app/care/[id]`

UIは Tailwind CSS を中心に実装しています。アイコンは lucide-react を使用しています。

## バックエンド

バックエンドは Next.js の Server Actions と Server Components を中心に実装しています。API Routes を大量に作る構成ではなく、フォーム送信や更新処理は主に `src/lib/actions.ts` に集約されています。

主な処理内容は以下です。

- 顧客情報の登録、更新、論理削除
- 来店履歴、施術履歴、売上記録の管理
- AI用写真のアップロード、削除、同意管理
- スタイル提案の作成、採用、画像生成
- 提案共有ページへの返信保存
- 口コミ案内、再来店案内、ケア提案

## データベース

データベースは PostgreSQL を使用しています。ローカル開発では Docker Compose で PostgreSQL 16 を起動します。

Prisma の設定は `prisma/schema.prisma` にあります。

主なモデルは以下です。

- `Customer`: 顧客情報
- `HairProfile`: 髪質、骨格、ライフスタイルなど
- `Preference`: 好み、NG条件、カラー希望など
- `Visit`: 来店履歴
- `StyleSuggestion`: スタイル提案
- `CourseRecommendation`: 追加メニュー提案
- `Appointment`: 予約
- `ServiceSale`: 売上記録
- `ProposalResponse`: 提案共有ページへの返信
- `ContactLog`: 連絡履歴

接続文字列は `.env` の `DATABASE_URL` で管理します。

## 画像保存

写真や生成画像の保存には Vercel Blob を使用します。

必要な環境変数:

```env
BLOB_READ_WRITE_TOKEN=
```

主な用途は以下です。

- 顧客プロフィール画像
- AI登録用の正面、横、斜め後ろ写真
- 生成AIによるスタイル提案画像
- AI処理で使う参照画像

## AI機能

AI機能では OpenAI API と fal.ai を使用しています。

### OpenAI

主な用途:

- 顧客情報、髪質、好み、履歴からのスタイル提案
- 追加メニュー提案
- 顔まわり、髪型、似合わせ要素の文章生成
- 画像品質や本人らしさのチェック
- 画像生成または画像編集

標準設定:

```env
OPENAI_MODEL="gpt-4.1-mini"
OPENAI_IMAGE_MODEL="gpt-image-1.5"
```

必要な環境変数:

```env
OPENAI_API_KEY=
```

### fal.ai / PhotoMaker

主な用途:

- 本人写真を参照したスタイルシミュレーション
- 正面、横、斜め後ろの3方向画像生成
- identity master 方式の本人らしさ維持

必要な環境変数:

```env
FAL_KEY=
FAL_STYLE_MODEL="photomaker"
ENABLE_IDENTITY_MASTER_GENERATION="true"
```

画像生成プロバイダは以下で切り替えます。

```env
STYLE_SIMULATION_PROVIDER="openai"
```

実験的な選択肢:

```env
STYLE_SIMULATION_PROVIDER="fal-identity-master"
STYLE_SIMULATION_PROVIDER="fal-identity-master-openai-edit"
```

画像生成機能を有効にするには以下を設定します。

```env
ENABLE_STYLE_IMAGE_GENERATION="true"
```

## フロントエンド側の髪色プレビュー

提案画像の3方向シミュレーション後に、フロントエンドだけで髪色を試せる機能があります。

実装方針:

- 生成画像そのものは保存し直さない
- 元画像の上に色レイヤーを重ねる
- `mix-blend-mode` で明暗、ハイライト、髪の質感を残す
- 3方向ごとに初期マスクを用意
- ブラシと消しゴムで髪色範囲を微調整できる

実装ファイル:

```text
src/components/customers/hair-color-adjustment-panel.tsx
```

この機能はプレビュー用途です。DB上の生成画像URLや元画像データは変更しません。

## 本番環境

本番環境は Vercel です。

本番URL:

```text
https://salon-de-lien.vercel.app
```

GitHub の `main` ブランチに push すると、Vercel の本番デプロイが実行されます。

開発作業用のブランチ:

```text
rebuild-from-good-front
```

本番反映時は、開発ブランチの内容を `main` に取り込んで push します。

## ローカル開発に必要なもの

Windows環境では以下を想定しています。

- Windows 11
- Node.js LTS
- npm
- Docker Desktop
- Git
- VS Code
- PowerShell または Windows Terminal

## ローカルセットアップ手順

リポジトリを取得します。

```powershell
git clone https://github.com/katukatu2020-commits/salon_de_lien.git
cd salon_de_lien
```

依存関係をインストールします。

```powershell
npm install
```

環境変数ファイルを作成します。

```powershell
Copy-Item .env.example .env
```

`.env` に必要な値を入れます。秘密情報はGitにコミットしません。

最低限必要なローカルDB設定:

```env
DATABASE_URL="postgresql://salon:salon_password@localhost:5432/salon_de_lien?schema=public"
```

PostgreSQLを起動します。

```powershell
docker compose up -d
```

Prisma migration を実行します。

```powershell
npx prisma migrate dev
```

必要に応じて Prisma Client を生成します。

```powershell
npx prisma generate
```

開発サーバーを起動します。

```powershell
npm run dev
```

ブラウザで開きます。

```text
http://localhost:3000/customers
```

## npm scripts

主なコマンドは以下です。

```powershell
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

## 環境変数一覧

`.env.example` にある主な環境変数です。

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
ALLOW_UNMASKED_HAIR_EDIT_FALLBACK="false"
```

アプリURLや口コミURLを使う場合は、以下も設定します。

```env
NEXT_PUBLIC_APP_URL=
APP_URL=
NEXT_PUBLIC_GOOGLE_REVIEW_URL=
NEXT_PUBLIC_REVIEW_URL=
GOOGLE_REVIEW_URL=
```

## Git運用

通常の開発作業は以下のブランチで行います。

```text
rebuild-from-good-front
```

本番へ反映する場合は、動作確認後に `main` に取り込んで push します。

確認でよく使うコマンド:

```powershell
npm run typecheck
npm run lint
npm run build
git status
git diff --check
```

## 注意点

- `.env` は秘密情報を含むためGitにコミットしません。
- Vercel Blob、OpenAI、fal.ai を使う機能は、それぞれのAPIキーが必要です。
- ローカルでDB関連ページを見るには Docker Desktop と PostgreSQL コンテナが起動している必要があります。
- 画像生成を使うには `ENABLE_STYLE_IMAGE_GENERATION="true"` が必要です。
- 本番デプロイは Vercel 側の環境変数が正しく設定されていることが前提です。
