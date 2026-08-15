# Salon de Lien handoff install guide

このZIPはNext.jsアプリのソース一式です。ZIP自体を直接インストールするのではなく、展開してから依存関係をインストールしてください。

## 1. 展開

Windows PowerShell:

```powershell
Expand-Archive .\Salon_de_Lien_system_handoff_20260702.zip -DestinationPath .\Salon_de_Lien
cd .\Salon_de_Lien\salon_de_lien
```

macOS / Linux:

```bash
unzip Salon_de_Lien_system_handoff_20260702.zip -d Salon_de_Lien
cd Salon_de_Lien/salon_de_lien
```

## 2. 環境変数

`.env` は機密情報を含むためZIPに入れていません。`.env.example` をもとに作成してください。

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## 3. インストール

```bash
npm install
```

`postinstall` で `prisma generate` が実行されます。失敗した場合は手動で実行してください。

```bash
npx prisma generate
```

## 4. DB準備

ローカルDBまたは接続先DBを `.env` に設定してから実行してください。

```bash
npx prisma migrate deploy
npx prisma db seed
```

開発用DBで新規に作る場合:

```bash
npx prisma migrate dev
npx prisma db seed
```

## 5. 起動

```bash
npm run dev
```

標準URL:

```text
http://localhost:3000/admin/customers
```

## ZIPから除外しているもの

- `.env`
- `.git`
- `node_modules`
- `.next`
- `.vercel`
- `tmp`
- `identity-results-preview`
- `tsconfig.tsbuildinfo`

## 補足

クーポンチラシ用の本番フォントは `public/coupon-template/fonts` に含めています。
