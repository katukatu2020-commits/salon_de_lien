  function orderPageProductsV686() {
    const products = salonFilteredProducts(salonOrderProducts()).filter(function (product) {
      return (salon.orderDealer === 'all' || product.dealerId === salon.orderDealer) &&
        (!salon.selectedOnly || (salon.quantities.get(product.id) || 0) > 0)
    })
    const pages = Math.max(1, Math.ceil(products.length / salon.orderPageSize))
    salon.orderPage = Math.max(1, Math.min(pages, salon.orderPage))
    const offset = (salon.orderPage - 1) * salon.orderPageSize
    return { products:products.slice(offset, offset + salon.orderPageSize), total:products.length, pages:pages, offset:offset }
  }

  function orderPagerV686(result, position) {
    const count = result.total ? (result.offset + 1) + '-' + (result.offset + result.products.length) : '0'
    return '<nav class="wo-order-pager-v686" aria-label="発注商品のページ切替（' + position + '）"><span>' + count + ' / ' + result.total.toLocaleString('ja-JP') + '商品</span><div>' +
      '<button type="button" data-action="order-page" data-page="' + (salon.orderPage - 1) + '" aria-label="前のページ" title="前のページ" ' + (salon.orderPage <= 1 ? 'disabled' : '') + '>' + icon('chevron', 'wo-page-prev-v686') + '</button>' +
      '<span>' + salon.orderPage + ' / ' + result.pages + '</span>' +
      '<button type="button" data-action="order-page" data-page="' + (salon.orderPage + 1) + '" aria-label="次のページ" title="次のページ" ' + (salon.orderPage >= result.pages ? 'disabled' : '') + '>' + icon('chevron') + '</button></div></nav>'
  }

  function orderQuickSummaryV686() {
    const selected = selectedOrder()
    const total = selected.reduce(function (sum, item) { return sum + Number(item.product.unitPrice || 0) * item.quantity }, 0)
    return '<div class="wo-order-quick-v686"><span><strong>' + selected.length + '商品選択中</strong><small>税抜小計 ' + yen(total) + '</small></span><button class="wo-button wo-button-primary" type="button" data-action="confirm-order" ' + (!selected.length ? 'disabled' : '') + '>' + icon('clipboard') + '発注内容を確認</button></div>'
  }

  function updateOrderQuantityV686(stepper, value) {
    const id = stepper.dataset.productId
    salon.quantities.set(id, value)
    const row = stepper.closest('.wo-contract-product-row')
    const product = salonOrderProducts().find(function (item) { return item.id === id })
    if (row && product) {
      row.classList.toggle('is-selected', value > 0)
      stepper.querySelector('[data-action="quantity-minus"]').disabled = value <= 0
      const subtotal = row.querySelector('.wo-line-subtotal')
      subtotal.classList.toggle('is-empty', value <= 0)
      subtotal.textContent = value > 0 ? '小計 ' + yen(Number(product.unitPrice || 0) * value) : '未選択'
    }
    const summary = root.querySelector('.wo-order-summary')
    if (summary) summary.outerHTML = orderSummary()
    const quick = root.querySelector('.wo-order-quick-v686')
    if (quick) quick.outerHTML = orderQuickSummaryV686()
  }

  function orderView() {
    const sourceProducts = salonOrderProducts()
    const result = orderPageProductsV686()
    const activeContracts = salon.data.contracts.filter(function (contract) { return contract.status === 'ACTIVE' })
    return '<section class="wo-workspace wo-order-workspace-v686"><header class="wo-workspace-head"><div><p class="wo-section-label">PURCHASE ORDER</p><h2>契約商品を発注</h2></div>' +
      (activeContracts.length > 1 ? '<label class="wo-dealer-select"><span>発注先</span><select id="dealer-select"><option value="all" ' + (salon.orderDealer === 'all' ? 'selected' : '') + '>すべての発注先</option>' + activeContracts.map(function (contract) { return '<option value="' + esc(contract.dealerId) + '" ' + (contract.dealerId === salon.orderDealer ? 'selected' : '') + '>' + esc(contract.dealerName) + '</option>' }).join('') + '</select></label>' : '') + '</header>' +
      (!activeContracts.length ? emptyState('truck', '連携中のディーラーはありません', '') : productFilters(sourceProducts) +
      '<div class="wo-order-tools-v686"><label class="wo-check"><input id="selected-products-filter" type="checkbox" ' + (salon.selectedOnly ? 'checked' : '') + '><span>選択中のみ</span></label><label class="wo-order-size-v686"><span>表示件数</span><select id="order-page-size">' + [10,20,50].map(function (n) { return '<option value="' + n + '" ' + (salon.orderPageSize === n ? 'selected' : '') + '>' + n + '件</option>' }).join('') + '</select></label>' + orderQuickSummaryV686() + '</div>' +
      '<div class="wo-order-layout"><div class="wo-product-list">' + orderPagerV686(result, '上部') + (sourceProducts.length ? orderProductRows(result.products) : emptyState('package', '取扱商品はまだ設定されていません', '')) + orderPagerV686(result, '下部') + '</div>' + orderSummary() + '</div>') + '</section>'
  }
