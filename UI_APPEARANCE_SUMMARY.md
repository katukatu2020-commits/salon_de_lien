# Salon de Lien UI appearance handoff

このファイルは、Salon de Lien のHTML/UIの見た目だけを別AIへ渡すための要約です。DB、API、Prisma、AI生成ロジック、サーバー処理の仕様は対象外です。

## 全体トーン

- 美容室向けの管理画面として、白と薄いストーン系背景を中心にした落ち着いたUI。
- ベース背景色は `#f7f5ef` または `stone-50`。
- 管理画面のカードは白背景、薄い `stone-200` の枠線、軽い影。
- 主要アクションは濃いティール系 `teal-800`、hover は `teal-900`。
- 情報の区切りはカード、表、淡い背景帯で整理する。
- 丸みは強すぎず、基本は `rounded-md` または `rounded-lg`。

## 共通レイアウト

- `src/components/layout/app-shell.tsx`
  - 管理画面の共通シェル。
  - PCは左サイドバー固定、メインは `lg:pl-56`。
  - スマホは上部ヘッダー、ハンバーガーメニューでサイドバーを開閉。
  - 検索フォームと新規追加ボタンをヘッダーに配置。
- `src/app/globals.css`
  - 横はみ出し防止のため、`html/body` に `overflow-x: hidden`。
  - `grid/flex` 子要素に `min-width: 0`。
  - 長いテキストは `overflow-wrap: anywhere`。
  - 画像、動画、SVG、canvas は `max-width: 100%`。

## 共通UI部品

- `src/components/ui.tsx`
  - `TextField`: 高さ `h-11`、白背景、薄い枠線、focus時にティールのリング。
  - `TextAreaField`: 白背景、`min-h-24`、focus時にティール。
  - `SelectField`: `h-11`、白背景、薄い枠線。
  - `Section`: 白カード、`rounded-lg`、`border-stone-200`、`p-5`。
  - `SubmitButton`: `teal-800` 背景、白文字。
  - `EmptyState`: 点線枠、淡いグレー背景、中央寄せ。

## 管理画面の主要ページ

- `src/app/admin/customers/page.tsx`
  - 顧客一覧。
  - 検索、カード/表、ステータス表示を管理画面トーンに統一。
- `src/app/admin/customers/new/page.tsx`
  - 顧客登録フォーム。
  - 共通フォーム部品を中心に構成。
- `src/app/admin/customers/[customerId]/page.tsx`
  - 顧客詳細。
  - サマリー、メニュー、個別オファー、商品提案、写真、履歴、操作をセクション化。
  - クーポン、商品提案、ポイントなどは顧客詳細内のカードとして表示。
- `src/app/admin/products/page.tsx`
  - 商品管理。
- `src/app/admin/reports/*/page.tsx`
  - レポート系。
  - カードと表を中心に、数値とランキングを見やすく表示。

## お客様向けページ

- `src/app/u/[token]/page.tsx`
  - お客様向けポータル。
  - 管理画面より柔らかい余白と文言。
  - ホームケア、限定クーポン、提案共有、フィードバック導線。
- `src/app/app/[id]/page.tsx`
  - 既存のお客様ページ互換。
- `src/app/review/product/[token]/page.tsx`
  - 商品レビュー回答画面。
  - 選択肢は大きめのタップ領域でスマホ優先。
- `src/app/feedback/[id]/page.tsx`
  - 来店後フィードバック画面。
- `src/app/referral/[code]/page.tsx`
  - 紹介コード用ページ。

## クーポンチラシUI

対象ファイル:

- `public/coupon-template/coupon_template_clean_v2.png`
- `public/coupon-template/base-coupon-v2.png`
- `public/coupon-template/fonts/*`
- `src/components/coupons/CouponFlyerPreview.tsx`
- `src/components/coupons/CouponFlyerPrint.tsx`
- `src/components/coupons/CouponEditorForm.tsx`
- `src/lib/coupons/coupon_red_fields_layout_v2.json`
- `src/lib/coupons/coupon-template.config.ts`
- `src/lib/coupons/coupon-render-utils.ts`

見た目の方針:

- 固定背景画像の上に、動的テキストだけをSVG/HTMLで重ねる。
- 背景画像自体は編集しない。
- 動的テキストはJSONのbboxに従い、領域外には描画しない。
- 顧客名、割引率、対象メニュー、有効期限、クーポンコードのみを動的表示。
- サロンからの一言や店舗情報は固定テンプレート側に寄せ、フォーム入力で変えない。
- 印刷時はA4縦、余白8mm、横幅190mm、中央配置。

印刷CSS:

- `@media print` で `.no-print` を非表示。
- `.print-page` は `width: 190mm`、`aspect-ratio` 固定。
- `print-color-adjust: exact` を使用。

## スマホ対応の基本ルール

- 画面横幅を超える固定幅を避ける。
- `max-width: 100%` と `min-width: 0` を基本にする。
- テーブルや横長情報は `overflow-x-auto` で横スクロール許容。
- ボタンや入力欄はスマホで押しやすい高さ `h-10` から `h-11`。
- PCサイドバーはスマホではドロワー化。

## UIだけを移植する時に必要なファイル

- `src/app/**/*.tsx` のうち `page.tsx` と `layout.tsx`
- `src/app/globals.css`
- `src/components/**/*.tsx`
- `src/lib/coupons/**`
- `public/**`
- `tailwind.config.ts`
- `postcss.config.js`
- `next.config.mjs`
- `package.json`

## 注意

- `src/app/api/**`、`src/lib/actions/**`、`src/lib/prisma.ts`、`prisma/**` は見た目だけの移植には不要。
- ただし、実際にNext.jsとして起動するにはサーバー側の依存も必要。
- UIだけを見る目的なら、ページとコンポーネントのTSX、CSS、public assets を優先する。
