# Customer record merge scope v386

顧客カルテで表示する「重複した顧客カルテを統合」を、SPA遷移後に他ページへ残さないための本番パッチです。顧客詳細以外ではカードとモーダルを破棄し、キャッシュされた旧スクリプトを避けるため読み込みURLも更新します。

- Keeps the customer merge card exclusively on `/admin/customers/:customerId`.
- Removes the card and any open merge dialog immediately after SPA navigation to another page.
- Restores document scrolling when a route change closes the merge dialog.
