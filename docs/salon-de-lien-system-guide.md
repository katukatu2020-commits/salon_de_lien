# Salon de Lien 現行システムガイド

更新日: 2026-07-23  
対象: `salon_de_lien_good_front_abb9a84` の現在の実装

## 1. システムの目的

Salon de Lien は、美容室の顧客カルテを起点に、接客、再来店、商品提案、レビュー、ポイント、紹介、個別クーポン、売上分析までを一つにつなぐCRMです。

```text
顧客登録
  ↓
カルテ・髪質・好み・写真・来店履歴
  ↓
メニュー提案 / AIスタイル提案 / 商品提案
  ↓
予約・施術・会計
  ↓
クーポン / ホームケア / レビュー依頼
  ↓
レビュー・フィードバック回答
  ↓
ポイント付与 / 紹介 / 再来店
  ↓
店舗状況 / 販促レポート / メーカー商品レビュー
```

単に顧客情報を保存するのではなく、スタッフが「このお客様へ次に何をするか」を見つけ、実行し、その結果を店舗全体の数字へつなげるシステムです。

## 2. 利用者と画面の分離

### オーナー・スタッフ

`/admin/*` を中心とした管理画面を利用します。

- 顧客検索・登録・編集
- 来店、予約、会計、提案、追客の記録
- 商品レビュー依頼URLの発行
- ポイント付与・利用
- 個別クーポン作成・印刷
- 売上・客数・販促状況の確認
- 商品マスタとメーカー商品レビューの管理

### お客様

`/u/*` を中心としたお客様向け画面を利用します。管理画面のサイドバーは表示されません。

- お客様トップ
- 保有ポイント・有効クーポン確認
- ホームケア確認
- 提案内容確認
- 来店後フィードバック
- 商品レビュー回答
- 予約確認
- 紹介コードからの登録

### メーカー向け情報

現在のメーカー商品レビュー画面は `/admin/reports/manufacturer-products` にある管理画面機能です。独立したメーカー用ログイン画面ではありません。

商品ごとの星評価、回答数、年代・性別構成、レビュー内容を確認できます。顧客名は顧客台帳への確認用に表示しますが、電話番号や内部顧客IDは表示しません。

## 3. 現時点の権限上の注意

- 管理画面とお客様画面はUI上で分離されています。
- アプリ全体を守る本格的なログイン・役割別権限は未完成です。
- `/u/[token]` の `token` は、現在は互換実装として実質的に顧客IDを使用しています。
- 商品レビュー依頼は十分に長いランダムtokenを使い、DBにはtokenのハッシュのみを保存します。
- メーカー向け専用権限は未実装です。

本番で外部公開する前に、管理画面認証、お客様ポータルtokenの完全ランダム化、メーカー専用権限が必要です。

## 4. 技術構成

| 項目 | 構成 |
|---|---|
| フレームワーク | Next.js 14 App Router |
| 言語 | TypeScript / React |
| UI | Tailwind CSS、Radix UI Tabs、Lucide Icons |
| DB | PostgreSQL |
| ORM | Prisma |
| 画像保存 | Vercel Blob |
| AI | OpenAI、fal.ai |
| 画像処理 | sharp |
| 実行 | Next.js production server、ポート3000 |
| 遠隔接続 | Tailscale経由でWindows PCへ接続 |

### 主要ディレクトリ

| パス | 役割 |
|---|---|
| `src/app` | 画面とAPIルート |
| `src/components` | 共通UI、顧客、商品、クーポン部品 |
| `src/lib/actions` | Server Actions |
| `src/lib/points` | ポイント台帳・失効・紹介ロジック |
| `src/lib/products` | 商品レビュー・メーカー集計 |
| `src/lib/coupons` | クーポン座標・検証・画像レンダリング |
| `src/lib/reports` | オーナーダッシュボード集計 |
| `src/lib/ai` | AI提案・画像生成関連 |
| `prisma/schema.prisma` | DBモデル定義 |
| `prisma/migrations` | DB変更履歴 |
| `public/coupon-template` | 固定クーポン素材 |
| `scripts` | seed、バックアップ、起動、資料生成 |

## 5. 管理画面の階層

```text
/admin
├─ dashboard                         店舗全体の売上・客数
├─ customers                         顧客一覧・CRM操作卓
│  ├─ new                            新規顧客登録
│  └─ [customerId]                   顧客詳細
│     └─ coupons
│        ├─ new                      固定テンプレートクーポン作成
│        └─ [couponId]/print         旧Coupon印刷
├─ coupon-issues/[couponIssueId]/print
│                                     現行CouponIssue印刷
├─ products                          商品マスタ
└─ reports
   ├─ offers                         クーポン・販促レポート
   ├─ product-feedback               メーカー商品レビューの互換入口
   └─ manufacturer-products          メーカー商品レビュー
```

## 6. 管理画面ナビの役割

| 表示名 | URL | 役割 |
|---|---|---|
| 今日やること | `/admin/customers?view=calendar` | 今日の予約、次回提案、売上ブリーフ |
| 店舗状況 | `/admin/dashboard` | 売上高、客数、客単価、再来率の推移 |
| 顧客 | `/admin/customers` | 顧客検索、CRMサマリー、顧客詳細への入口 |
| 新規登録 | `/admin/customers/new` | 新規顧客カルテ作成 |
| クーポン | `/admin/reports/offers` | クーポン発行・利用状況 |
| 商品提案 | `/admin/products` | 商品マスタ管理 |
| ポイント | `/admin/customers?view=analytics` | CRM操作卓、売上化分析、週次レポート |
| メーカー集計 | `/admin/reports/manufacturer-products` | 商品別レビュー確認・編集 |
| 設定 | `/admin/customers?view=settings` | 商用運用・同意・素材不足監査 |

`Ctrl/Cmd + K` で主要画面を検索して移動できます。

## 7. ページ別の役割と接続先

### 7.1 店舗状況

**URL:** `/admin/dashboard`

オーナーが店舗全体の状況を見るページです。

表示内容:

- 今月の売上
- 会計客数
- 平均客単価
- 新規・再来客数、再来率
- 登録顧客数
- 今後30日の予約数
- 月別売上・会計客数推移
- メニュー別売上
- 担当者別来店記録
- 支払い方法別売上
- 最近の会計
- 6・12・24か月切替

データ元:

- 売上: `ServiceSale`
- 来店: `Visit`
- 顧客数: `Customer`
- 予約: `Appointment`

接続:

- 顧客詳細で会計を登録すると自動反映
- 最近の会計から顧客詳細へ移動
- 顧客一覧へ戻り、数字の原因となる顧客を確認

### 7.2 顧客一覧・CRM操作卓

**URL:** `/admin/customers`  
**互換URL:** `/customers`

管理業務の中心となる入口です。

- 顧客名、電話番号、メモ検索
- 顧客カード・テーブル
- 最終来店、予約、提案状況
- 再来店候補、レビュー未回答、追客候補
- 顧客詳細・新規登録への移動

同じページ内の表示モード:

| クエリ | 内容 |
|---|---|
| なし | CRMサマリーと顧客一覧 |
| `?view=calendar` | 今日の予約、次回提案カレンダー、売上ブリーフ |
| `?view=analytics` | 今日の操作卓、売上化分析、週次オーナーレポート |
| `?view=messages` | LINE・DM用追客メッセージキュー |
| `?view=visits` | 最近の来店 |
| `?view=styles` | 顧客写真とスタイル提案資産 |
| `?view=settings` | 写真同意、素材不足、追客未処理などの監査 |

### 7.3 新規顧客登録

**URL:** `/admin/customers/new`  
**互換URL:** `/customers/new`

保存内容:

- 氏名、性別、生年、電話番号、メモ
- 髪質情報
- 好み・NG条件
- 必要に応じた初回来店情報
- 初期ポイント口座

登録後は顧客詳細へ進み、写真、来店、予約、提案、会計を追加します。

### 7.4 顧客詳細

**URL:** `/admin/customers/[customerId]`  
**互換URL:** `/customers/[id]`

顧客情報を見るだけでなく、そのお客様へ次に何をするかを決め、実行する画面です。

| タブ | 主な役割 | 主な接続先 |
|---|---|---|
| サマリー | 基本情報、最終来店、AI・コース提案 | 提案共有、お客様ページ |
| メニュー | 来店、予約、施術、会計、次回提案 | 店舗状況、紹介成立判定 |
| 個別オファー | オファー、Coupon、CouponIssue、他業種クーポン | クーポン作成・印刷、お客様ページ |
| 商品提案 | 商品、理由、悩み、状態、反応、レビュー依頼 | 商品レビュー、メーカー画面 |
| ポイント | 残高、台帳、失効予定、手動調整、会計利用、紹介 | ポイントAPI、紹介ページ |
| 写真 | 顧客写真、AI参照写真、写真同意、髪質、好み | AIスタイル提案 |
| 履歴 | 来店、予約、会計、追客、提案反応 | CRM分析・次アクション |
| 操作 | 顧客更新、運用操作、論理削除 | Customerと関連情報 |

会計登録は `ServiceSale` に保存されます。友達紹介を登録した顧客の初回会計では施術料金が20%OFFとなり、完了後に紹介者の次回会計15%OFFが利用可能になります。

## 8. クーポン

互換性維持のため2系統あります。

### 現行の固定テンプレートクーポン

主モデル: `CouponIssue`

作成:

- `/admin/customers/[customerId]/coupons/new`
- `/customers/[id]/coupon`

印刷:

- `/admin/coupon-issues/[couponIssueId]/print`
- `/customers/[id]/coupon/print/[couponIssueId]`

仕様:

- 顧客名、割引率、対象メニュー、発行日、有効期限、ご利用コードを入力
- 固定背景画像とJSON座標定義を使用
- AIでチラシ自体を編集しない
- 同じ発行履歴は同じコードで再印刷
- JAN形式のバーコード表示
- A4縦1枚
- 印刷日時と回数を保存
- お客様トップへ有効クーポンを表示

レンダリングAPI: `GET /api/coupon-issues/[couponIssueId]/render`

### 旧クーポン

主モデル: `Coupon`

- percentage / fixed_amount / service_bonus
- salon / manufacturer / partner
- issued / used / expired / cancelled / draft
- 識別コード、印刷回数、使用日時を保存

旧データと導線を壊さないため残されています。新規A4チラシは原則 `CouponIssue` を使います。

## 9. 商品提案とレビュー

### 商品マスタ

**URL:** `/admin/products`  
**Model:** `Product`

- メーカー名
- 商品名
- カテゴリ
- 悩みタグ
- 説明
- 有効・無効

商品提案フォームとメーカー商品レビューの基準です。

### 商品提案

**Model:** `ProductProposal`

顧客詳細から特定の顧客と商品を紐づけます。お客様に商品名を自由入力させません。

状態:

- `proposed`
- `sample_given`
- `purchased`
- `used_in_service`

反応:

- `interested`
- `not_interested`
- `consider_next`
- `purchased`

### レビュー依頼

**Model:** `ProductReviewRequest`

- ランダムtokenを発行
- DBにはSHA-256ハッシュだけを保存
- URLにcustomerIdやproposalIdを直接含めない
- 有効期限、回答済み、期限切れ、取消を管理
- 同一依頼への二重回答を禁止

### お客様の商品レビュー

入口:

- `/review/product/[token]`
- アプリ内: `/u/[portalIdentifier]/review/product/[reviewToken]`

回答:

- 使った / まだ使っていない / 覚えていない
- 星1〜5
- 良かった点、気になった点
- リピート意向
- コメント
- データ共有同意

回答後:

1. `ProductReview` を作成
2. `ProductReviewRequest` を回答済みに更新
3. `Consent` を保存
4. 30ptを付与
5. 使用済み回答なら追加20pt、合計50pt
6. お客様トップへ戻る

## 10. メーカー商品レビュー

**URL:** `/admin/reports/manufacturer-products`  
**互換URL:** `/admin/reports/product-feedback`

顧客台帳に紐づいた商品レビューを、商品ごとに確認・管理する画面です。

- メーカー・商品名・カテゴリのドロップダウン
- 期間絞り込み
- 平均星評価、回答数、星分布
- 年代構成、性別構成
- 顧客名、年代、性別、星、コメント
- 顧客名から顧客詳細へ移動
- 商品追加・名称編集・削除
- レビュー追加・編集
- 操作完了通知

表示しない情報:

- 電話番号
- 顧客内部IDの文字列
- 住所
- 生の来店履歴

これは管理画面です。メーカーへ直接公開するには、メーカー専用認証と表示項目の再制限が必要です。

## 11. ポイント

### 基本ルール

- 1pt = 1円
- 現金交換不可、譲渡不可
- 店舗会計のみ利用
- 1ptから利用
- 1会計で会計金額の50%まで
- すべての付与ポイントは付与日から40日で失効

### モデル

| Model | 役割 |
|---|---|
| `CustomerPointAccount` | 高速表示用残高キャッシュ |
| `PointTransaction` | 付与、利用、失効、取消、調整の台帳 |
| `PointLot` | 付与単位の残高と期限 |
| `PointRedemptionAllocation` | 利用したロットの内訳 |
| `PointRule` | イベントごとの付与ルール |

### 自動付与

| 行動 | ポイント |
|---|---:|
| 商品アンケート回答 | 宝箱抽選で80pt / 200pt / 1,000pt |
| 来店後フィードバック | 30pt |
| お客様アプリ予約の会計完了 | 100pt |

`sourceType + sourceId + type` の一意制約で二重付与を防ぎます。

利用時はサーバー側で残高、1pt単位、会計の50%上限を検証し、有効期限が近いロットから消費します。

## 12. 紹介

**Model:** `Referral`  
**公開URL:** `/referral/[code]`

```text
既存顧客が紹介コード発行
  ↓
紹介された方が登録
  ↓
referredCustomerIdを紐づけ
  ↓
初回来店・会計完了
  ↓
紹介された方は施術料金20%OFF
  ↓
紹介元の次回施術料金が15%OFF
```

コード発行だけでは割引は確定しません。紹介された方の初回会計完了後、紹介元の15%OFFが利用可能になります。紹介割引に有効期限はありません。

## 13. お客様向けページ

```text
/u/[portalIdentifier]
├─ care
├─ feedback
├─ intake
├─ proposals/[proposalId]
├─ review/product/[reviewToken]
└─ appointments/confirm/[appointmentId]
```

### お客様トップ

**URL:** `/u/[portalIdentifier]`  
**互換URL:** `/app/[id]`

- お客様名
- 保有ポイント
- 有効クーポン
- ホームケア
- 商品レビュー依頼
- 提案共有
- フィードバック
- 紹介・予約関連導線

### ホームケア

**URL:** `/u/[portalIdentifier]/care`  
**互換URL:** `/care/[id]`

接客で説明したケア内容を自宅で見返すページです。

### 来店後フィードバック

**URL:** `/u/[portalIdentifier]/feedback`  
**互換URL:** `/feedback/[id]`

- 仕上がり・接客評価とコメント
- 1施術につき1回の回答制御
- 回答後30pt
- 完了後お客様トップへ戻る

### 提案共有

**URL:** `/u/[portalIdentifier]/proposals/[proposalId]`  
**互換URL:** `/proposals/[id]`

- スタイル提案画像と説明
- 興味、相談、予約意向
- 希望条件
- `ProposalResponse` へ保存
- 管理画面の未対応アクションへ反映

### 予約確認

**URL:** `/u/[portalIdentifier]/appointments/confirm/[appointmentId]`

- 予約日時・メニュー
- 来店可否・変更希望
- 予約・追客状況へ反映

### 新規相談

**URL:** `/intake`、`/u/[portalIdentifier]/intake`  
**完了:** `/intake/thanks`

髪の悩み、希望、連絡・予約候補を受け付けます。

## 14. AI・写真・提案

### AIスタイル提案

**Model:** `StyleSuggestion`

顧客基本情報、髪質、好み、NG条件、来店履歴、写真をもとに、スタイル名、理由、注意点、スタイリング、メニュー、所要時間、提案画像を保存します。

### コース提案

**Model:** `CourseRecommendation`

メニュー名、理由、注意点、価格、所要時間、優先度、採用状態を保存します。

### 画像生成

- OpenAI / fal.ai Providerを使用
- 写真利用同意を保存
- 正面・横・後ろ写真を管理
- 生成画像はVercel Blobへ保存
- 固定クーポン描画とは別系統

## 15. 販促・クーポンレポート

**URL:** `/admin/reports/offers`  
**互換URL:** `/reports/offers`

- 公開中・利用済み・興味ありオファー
- 提案見込み金額、利用率
- クーポン発行、使用済み、期限切れ
- 印刷回数
- 対象メニュー・割引タイプ別件数
- 最近の発行履歴

顧客詳細の個別オファー・クーポン操作を集計します。

## 16. 主要DBモデル

```text
Customer
├─ HairProfile / Preference
├─ Visit / Appointment / ServiceSale / ContactLog
├─ StyleSuggestion / CourseRecommendation / ProposalResponse
├─ CustomerOffer / Coupon / CouponIssue / PartnerCoupon
├─ ProductProposal
│  ├─ Product
│  ├─ ProductReviewRequest
│  └─ ProductReview
├─ Consent
├─ CustomerPointAccount
│  ├─ PointTransaction
│  ├─ PointLot
│  └─ PointRedemptionAllocation
└─ Referral
```

| Model | 役割 |
|---|---|
| `Customer` | 顧客基本情報と全機能の起点 |
| `HairProfile` | 髪質・頭皮・顔型・生活習慣 |
| `Preference` | 好み、NG条件、カラー、メンテナンス志向 |
| `Visit` | 来店・施術履歴 |
| `Appointment` | 予約 |
| `ServiceSale` | 会計・売上 |
| `ContactLog` | 追客・連絡履歴 |
| `StyleSuggestion` | スタイル提案 |
| `CourseRecommendation` | メニュー・コース提案 |
| `ProposalResponse` | お客様の提案反応 |
| `CustomerOffer` | 顧客別販促オファー |
| `Coupon` | 旧クーポン |
| `CouponIssue` | 現行固定クーポン |
| `PartnerCoupon` | 他業種クーポン |
| `Product` | 商品マスタ |
| `ProductSuggestion` | 旧商品提案 |
| `ProductProposal` | 現行商品提案 |
| `ProductReviewRequest` | token付きレビュー依頼 |
| `ProductReview` | 商品レビュー |
| `Consent` | データ利用同意 |
| `CustomerPointAccount` | ポイント口座キャッシュ |
| `PointTransaction` | ポイント台帳 |
| `PointLot` | 有効期限付き残高 |
| `PointRedemptionAllocation` | ポイント利用配賦 |
| `PointRule` | ポイントルール |
| `Referral` | 紹介管理 |

## 17. 機能間の自動連携

| 起点 | 自動的につながる先 |
|---|---|
| 会計登録 | 店舗状況の売上・客数・客単価 |
| 初回来店・会計 | 紹介成立判定、紹介元300pt |
| 商品提案 | 商品レビュー依頼を発行可能 |
| 商品レビュー回答 | レビュー保存、依頼回答済み、同意、30/50pt、メーカー画面 |
| 来店後フィードバック | 回答保存、30pt、お客様トップへ戻る |
| ポイント利用 | 期限の近いロットから消費、台帳記録 |
| クーポン発行 | 顧客詳細、印刷履歴、お客様トップ |
| クーポン印刷 | 印刷日時・回数を更新 |
| 提案共有への回答 | 未対応アクション・追客候補 |

## 18. API概要

### 商品・レビュー

| Method | URL | 役割 |
|---|---|---|
| GET | `/api/products` | 商品一覧 |
| GET | `/api/admin/products` | 管理用商品一覧 |
| POST | `/api/customers/[customerId]/product-proposals` | 商品提案作成 |
| POST | `/api/product-proposals/[proposalId]/review-request` | レビュー依頼発行 |
| GET/POST | `/api/review/product/[token]` | レビュー取得・送信 |
| GET | `/api/reports/manufacturer-products` | 商品レビュー集計 |

### ポイント・紹介

| Method | URL | 役割 |
|---|---|---|
| GET | `/api/customers/[customerId]/points` | 残高 |
| GET | `/api/customers/[customerId]/points/transactions` | 台帳 |
| POST | `/api/customers/[customerId]/points/adjust` | 手動調整 |
| POST | `/api/customers/[customerId]/points/redeem` | 会計時利用 |
| POST | `/api/admin/points/expire` | 一括失効 |
| POST | `/api/customers/[customerId]/referrals` | 紹介コード発行 |
| POST | `/api/referrals/[code]/register` | 紹介登録 |
| POST | `/api/referrals/[code]/complete-first-visit` | 初回来店完了 |

### クーポン・ポータル

| Method | URL | 役割 |
|---|---|---|
| GET | `/api/coupon-issues/[couponIssueId]/render` | 固定チラシPNG |
| GET | `/api/public/customer-portal/[token]` | お客様トップ用データ |
| GET | `/api/admin/reports/offers` | オファー集計 |

顧客更新、来店、予約、会計、フィードバック、AI提案、クーポン操作の多くはServer Actionsです。

## 19. 代表的な業務フロー

### 朝から会計まで

```text
今日やること → 顧客検索 → 顧客詳細 → 写真・履歴確認
→ メニュー提案 → 来店・施術 → 商品提案
→ ポイント利用 → 会計 → 次回クーポン・ホームケア
```

### 商品レビュー

```text
ProductProposal作成 → レビュー依頼token発行
→ お客様が回答 → ProductReview保存
→ 30/50pt → メーカー商品レビューへ反映
```

### 紹介

```text
紹介コード発行 → 紹介された方が登録
→ 初回来店・会計 → 紹介元へ300pt
```

### オーナー確認

```text
店舗状況: 売上・客数・客単価・再来率
販促レポート: クーポン・オファー
メーカー商品レビュー: 商品別の星・コメント・年代構成
```

## 20. 保存・バックアップ・接続

- 業務データの正本はPostgreSQLです。
- Prisma migrationでDB構造を管理します。
- 顧客削除は基本的に `deletedAt` による論理削除です。
- 写真・生成画像はVercel Blobへ保存します。
- `scripts/backup-db.ps1` でDBバックアップを作成します。
- `scripts/restore-db.ps1` で復元します。
- Tailscaleは接続経路であり、DB保存先ではありません。

アクセス例:

```text
ローカル:   http://localhost:3000
Tailscale: http://100.82.182.81:3000
```

## 21. 現在の強み

- 顧客カルテから販促までが分断されていない
- 商品レビュー対象がサロン側の商品提案で確定する
- ポイントを残高だけでなく台帳・ロットで管理する
- クーポンの発行・印刷・使用履歴が残る
- 会計が店舗売上ダッシュボードへ直接つながる
- レビューが商品改善データへつながる
- 管理画面とお客様画面のUIが分離されている
- 既存互換ルートを残しながら `/admin` と `/u` へ整理している

## 22. 本番運用前の重要課題

1. 管理画面ログインとスタッフ・オーナー権限
2. お客様ポータルtokenを顧客IDからランダムtokenへ変更
3. メーカー専用ログインと表示範囲制限
4. Staff/Userモデルの追加
5. Appointmentなどの状態値のenum化
6. 旧Coupon / ProductSuggestionと現行モデルの整理
7. 自動テスト、監査ログ、バックアップ復元訓練
8. 本番データとデモデータの明確な分離

## 23. 初見の人が見る順番

1. `/admin/customers?view=calendar` で今日やることを見る
2. `/admin/customers` で顧客を検索する
3. `/admin/customers/[customerId]` の各タブを見る
4. 商品提案からレビュー依頼を発行する
5. `/u/[portalIdentifier]` でお客様側を見る
6. `/admin/customers/[customerId]/coupons/new` でクーポンを作る
7. `/admin/dashboard` で売上と客数を見る
8. `/admin/reports/offers` で販促状況を見る
9. `/admin/reports/manufacturer-products` で商品レビューを見る

この順番で見ると、Salon de Lienが「顧客情報を保存するアプリ」ではなく、「接客・再来店・店販・レビュー・紹介・売上を循環させるCRM」であることを理解できます。
