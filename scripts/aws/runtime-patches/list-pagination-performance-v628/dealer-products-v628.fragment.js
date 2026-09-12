  function syncDealerProductUrl() {
    if (dealer.view !== 'products') return
    const url = new URL(location.href)
    url.searchParams.delete('productPage')
    url.searchParams.delete('productSearch')
    if (dealer.productPage > 1) url.searchParams.set('productPage', String(dealer.productPage))
    if (dealer.productQuery) url.searchParams.set('productSearch', dealer.productQuery)
    history.replaceState(null, '', url)
  }
  function dealerProducts() {
    const pagination = dealer.data.productPagination || {
      page: 1,
      pageSize: Math.max(1, dealer.data.products.length),
      totalCount: dealer.data.products.length,
      totalPages: 1,
      query: dealer.productQuery,
    }
    const products = dealer.data.products.filter(function (product) { return product.active })
    const page = Number(pagination.page || 1)
    const totalPages = Math.max(1, Number(pagination.totalPages || 1))
    const totalCount = Number(pagination.totalCount || 0)
    const pageSize = Number(pagination.pageSize || products.length || 1)
    const first = totalCount ? (page - 1) * pageSize + 1 : 0
    const last = Math.min(page * pageSize, totalCount)
    const resultSummary = totalCount
      ? first.toLocaleString('ja-JP') + '〜' + last.toLocaleString('ja-JP') + '件 / 全' + totalCount.toLocaleString('ja-JP') + '件'
      : '0件'
    const pager = totalPages > 1
      ? '<nav class="wo-list-pager-v628" aria-label="商品一覧のページ"><span>' + resultSummary + '</span><div>' +
          '<button type="button" data-action="dealer-product-page" data-page="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + '>前へ</button>' +
          '<strong><span class="sr-only">現在のページ</span>' + page + ' / ' + totalPages + '</strong>' +
          '<button type="button" data-action="dealer-product-page" data-page="' + (page + 1) + '" ' + (page >= totalPages ? 'disabled' : '') + '>次へ</button>' +
        '</div></nav>'
      : '<div class="wo-list-pager-v628 is-single-v628"><span>' + resultSummary + '</span></div>'

    return '<section class="wo-workspace wo-product-management"><header class="wo-workspace-head"><div><p class="wo-section-label">DEALER CATALOG</p><h2>商品を登録</h2><p>登録後、「契約価格」で美容室ごとの取扱と割引率を設定すると発注画面へ公開されます。</p></div><span class="wo-count-chip">' + totalCount.toLocaleString('ja-JP') + '商品</span></header><form id="dealer-product-form" class="wo-dealer-product-form">' + dealerProductFields() + '<div class="wo-form-actions"><button class="wo-button wo-button-primary" type="submit">' + icon('plus') + '商品を登録</button></div></form>' +
      '<div class="wo-product-toolbar"><label class="wo-search">' + icon('search') + '<input id="dealer-product-search" value="' + esc(dealer.productQuery) + '" placeholder="商品名・メーカー・商品コードで検索" autocomplete="off"></label><span class="wo-product-result-v628" role="status">' + resultSummary + '</span></div>' +
      (products.length ? '<div class="wo-catalog-table"><div class="wo-catalog-table-head"><span>商品</span><span>商品コード / JAN</span><span>定価（税抜）</span><span>発注単位</span><span>操作</span></div>' + products.map(function (product) {
        return '<article><div><small>' + esc(product.manufacturerName) + '</small><strong>' + esc(product.name) + '</strong><span>' + esc(product.category || 'カテゴリ未設定') + '</span></div><div><code>' + esc(product.productCode) + '</code><small>' + esc(product.janCode || 'JAN未登録') + '</small></div><strong>' + yen(product.listPrice) + '</strong><span>' + Number(product.orderUnit) + '点</span><div class="wo-row-actions"><button class="wo-icon-link" type="button" data-action="edit-product" data-id="' + esc(product.id) + '" title="商品を編集" aria-label="' + esc(product.name) + 'を編集">' + icon('edit') + '</button><button class="wo-icon-link wo-icon-danger" type="button" data-action="remove-product" data-id="' + esc(product.id) + '" data-label="' + esc(product.name) + '" title="商品を削除" aria-label="' + esc(product.name) + 'を削除">' + icon('trash') + '</button></div></article>'
      }).join('') + '</div>' : emptyState('package', dealer.productQuery ? '条件に一致する商品はありません' : '登録商品はありません', dealer.productQuery ? '検索語を変更して確認してください。' : '上のフォームから、最初の商品を登録してください。')) + pager + '</section>'
  }
