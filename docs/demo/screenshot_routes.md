# スクリーンショット撮影ルート一覧

BASE_URL: http://127.0.0.1:3000

| No | 画面 | URL | viewport | 目的 |
|---:|---|---|---|---|
| 1 | 管理画面 / 顧客一覧 | http://127.0.0.1:3000/admin/customers | 1022x888 | 朝、今日やるべき既存客を確認する |
| 2 | 管理画面 / 顧客一覧 mobile | http://127.0.0.1:3000/admin/customers | 1022x888 | スマホ幅で管理画面UIが崩れていないか確認する |
| 3 | 顧客検索 | http://127.0.0.1:3000/admin/customers?q=%E5%B1%B1%E7%94%B0 | 1022x888 | 顧客名で検索してカルテを開く |
| 4 | 顧客詳細 | http://127.0.0.1:3000/admin/customers/cmr31nbk500019b3ys10q7dvf | 1022x888 | 顧客情報と次アクションを確認する |
| 5 | 商品提案・レビュー依頼 | http://127.0.0.1:3000/admin/customers/cmr31nbk500019b3ys10q7dvf | 1022x888 | 商品提案、レビュー依頼、ポイント欄を確認する |
| 6 | 顧客詳細 mobile | http://127.0.0.1:3000/admin/customers/cmr31nbk500019b3ys10q7dvf | 1022x888 | スマホ幅で顧客詳細が読めるか確認する |
| 7 | 次回クーポン作成 | http://127.0.0.1:3000/admin/customers/cmr31nbk500019b3ys10q7dvf/coupons/new | 1022x888 | 限定クーポン作成と印刷プレビューを確認する |
| 8 | A4クーポン印刷 | http://127.0.0.1:3000/admin/coupon-issues/cmr31nbni00189b3yi435k1zj/print | 1022x888 | A4印刷用チラシを確認する |
| 9 | お客様ページ | http://127.0.0.1:3000/u/cmr31nbk500019b3ys10q7dvf | 1022x888 | 保有ポイント、限定クーポン、ホームケア導線を確認する |
| 10 | 商品レビュー回答 | http://127.0.0.1:3000/u/cmr31nbk500019b3ys10q7dvf/review/product/3KYr3bA5Mqgj1XQ3ZrFGILZyd63-bva-IND5NhQk-8M | 1022x888 | お客様が商品レビューを回答する |
| 11 | レビュー回答後トップ | http://127.0.0.1:3000/u/cmr31nbk500019b3ys10q7dvf?reviewPoints=50 | 1022x888 | レビュー回答後にポイント付与が表示される |
| 12 | 来店後フィードバック | http://127.0.0.1:3000/u/cmr31nbk500019b3ys10q7dvf/feedback | 1022x888 | 施術後アンケートと30pt付与導線を確認する |
| 13 | 紹介ページ | http://127.0.0.1:3000/referral/LIEN-A8K3X | 1022x888 | 紹介コードで新規相談を登録する |
| 14 | 販促CRMレポート | http://127.0.0.1:3000/admin/reports/offers | 1022x888 | 既存客施策の動きと未対応タスクを見る |
| 15 | メーカー向け商品集計 | http://127.0.0.1:3000/admin/reports/manufacturer-products?manufacturer=%E3%82%A2%E3%83%AA%E3%83%9F%E3%83%8E | 1022x888 | 匿名・商品別集計をメーカー向けに確認する |
