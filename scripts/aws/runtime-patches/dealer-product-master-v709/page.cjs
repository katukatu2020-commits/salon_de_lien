'use strict'
function page(){return `<section id="dealer-product-master" class="dpm">
  <header class="dpm-heading"><div><h2>共通商品マスタ</h2><p><span data-master-total>0</span>商品</p></div><a class="wo-button" href="/dealer/products">商品管理へ戻る</a></header>
  <form class="dpm-filters" id="dpm-search"><label>商品名・商品コード・JAN<input type="search" name="search" autocomplete="off" maxlength="180"></label><label>メーカー<select name="manufacturer"><option value="">すべてのメーカー</option></select></label><label>カテゴリ<select name="category"><option value="">すべてのカテゴリ</option></select></label><button class="wo-button wo-button-primary" type="submit">検索</button><label class="dpm-check"><input type="checkbox" name="unregistered">未登録のみ</label></form>
  <p class="dpm-status" role="status" aria-live="polite" data-status></p>
  <div class="dpm-tools"><label class="dpm-check"><input type="checkbox" data-select-page>このページを選択</label><span data-result-count></span><label>表示件数<select data-page-size><option>25</option><option selected>50</option><option>100</option></select></label></div>
  <div data-results aria-busy="true"><p>読み込み中</p></div>
  <nav class="dpm-pager" aria-label="商品マスタのページ"><button type="button" class="wo-button" data-prev aria-label="前のページ">前へ</button><span data-page-label></span><button type="button" class="wo-button" data-next aria-label="次のページ">次へ</button></nav>
  <footer class="dpm-selection"><strong data-selected-count>0件選択</strong><button type="button" class="wo-button" data-clear disabled>選択解除</button><button type="button" class="wo-button wo-button-primary" data-review disabled>選択商品を確認</button></footer>
  <dialog class="dpm-dialog" aria-labelledby="dpm-dialog-title"><form id="dpm-import"><header><h2 id="dpm-dialog-title">取扱商品の登録</h2><button type="button" class="wo-button" data-close aria-label="閉じる">閉じる</button></header><p>自社販売価格（税抜）</p><div class="dpm-review-list" data-review-list></div><p data-review-error role="alert"></p><footer><button type="button" class="wo-button" data-close>戻る</button><button type="submit" class="wo-button wo-button-primary">取扱商品に登録</button></footer></form></dialog>
</section>`}
module.exports={page}
