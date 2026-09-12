  function activeDealerContracts() {
    return dealer.data.contracts.filter(function (contract) { return contract.status === 'ACTIVE' })
  }
  function currentPricingContract() {
    const contracts = activeDealerContracts()
    return contracts.find(function (contract) { return contract.id === dealer.pricingContractId }) || contracts[0] || null
  }

  function storedPricing(productId) {
    const agreement = dealer.data.contractProductPrices.find(function (price) {
      return price.contractId === dealer.pricingContractId && price.dealerProductId === productId
    })
    return agreement ? { enabled:true, discountRate:Number(agreement.discountRate) } : { enabled:false, discountRate:0 }
  }

  function pricingValue(productId) {
    return dealer.pricingDraft.has(productId) ? dealer.pricingDraft.get(productId) : storedPricing(productId)
  }

  function contractUnitPrice(product, discountRate) {
    return Math.round(Number(product.listPrice || 0) * (100 - Number(discountRate || 0)) / 100)
  }

  function syncDealerPricingUrl() {
    if (dealer.view !== 'pricing') return
    const url = new URL(location.href)
    url.searchParams.delete('pricingPage')
    url.searchParams.delete('pricingSearch')
    if (dealer.pricingContractId) url.searchParams.set('contractId', dealer.pricingContractId)
    else url.searchParams.delete('contractId')
    if (dealer.pricingPage > 1) url.searchParams.set('pricingPage', String(dealer.pricingPage))
    if (dealer.pricingQuery) url.searchParams.set('pricingSearch', dealer.pricingQuery)
    history.replaceState(null, '', url)
  }

  function dealerPricing() {
    const contracts = activeDealerContracts()
    if (!contracts.length) return '<section class="wo-workspace">' + emptyState('users', '契約中の美容室がありません', '先に「契約美容室」で取引先を登録・承認してください。') + '</section>'
    const contract = currentPricingContract()
    const pagination = dealer.data.pricingPagination || {
      page: 1,
      pageSize: Math.max(1, dealer.data.products.length),
      totalCount: dealer.data.products.length,
      totalPages: 1,
      totalProductCount: dealer.data.products.length,
      configuredCount: dealer.data.contractProductPrices.length,
      query: dealer.pricingQuery,
    }
    const products = dealer.data.products.filter(function (product) { return product.active })
    const page = Number(pagination.page || 1)
    const totalPages = Math.max(1, Number(pagination.totalPages || 1))
    const totalCount = Number(pagination.totalCount || 0)
    const totalProductCount = Number(pagination.totalProductCount || 0)
    const configuredCount = Number(pagination.configuredCount || 0)
    const pageSize = Number(pagination.pageSize || products.length || 1)
    const first = totalCount ? (page - 1) * pageSize + 1 : 0
    const last = Math.min(page * pageSize, totalCount)
    const resultSummary = totalCount
      ? first.toLocaleString('ja-JP') + '〜' + last.toLocaleString('ja-JP') + '件 / 全' + totalCount.toLocaleString('ja-JP') + '件'
      : '0件'
    const pager = totalPages > 1
      ? '<nav class="wo-list-pager-v628 wo-pricing-pager-v631" aria-label="契約価格商品のページ"><span>' + resultSummary + '</span><div>' +
          '<button type="button" data-action="dealer-pricing-page" data-page="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + '>前へ</button>' +
          '<strong><span class="sr-only">現在のページ</span>' + page + ' / ' + totalPages + '</strong>' +
          '<button type="button" data-action="dealer-pricing-page" data-page="' + (page + 1) + '" ' + (page >= totalPages ? 'disabled' : '') + '>次へ</button>' +
        '</div></nav>'
      : '<div class="wo-list-pager-v628 wo-pricing-pager-v631 is-single-v628"><span>' + resultSummary + '</span></div>'
    const rows = products.map(function (product) {
      const value = pricingValue(product.id)
      return '<article class="wo-pricing-row" data-pricing-row data-product-id="' + esc(product.id) + '">' +
        '<label class="wo-pricing-enabled"><input type="checkbox" data-pricing-enabled ' + (value.enabled ? 'checked' : '') + ' aria-label="' + esc(product.name) + 'を取扱商品に設定"><span></span></label>' +
        '<div class="wo-pricing-product"><small>' + esc(product.manufacturerName) + '</small><strong>' + esc(product.name) + '</strong><span>' + esc([product.category, product.productCode].filter(Boolean).join(' ・ ')) + '</span></div>' +
        '<strong><small class="wo-mobile-label">定価（税抜）</small>' + yen(product.listPrice) + '</strong>' +
        '<label class="wo-rate-input"><span class="wo-mobile-label">割引率</span><input type="number" min="0" max="100" step="0.01" inputmode="decimal" data-pricing-rate value="' + esc(value.discountRate) + '" ' + (!value.enabled ? 'disabled' : '') + '><span>%</span></label>' +
        '<strong class="wo-pricing-unit"><small class="wo-mobile-label">契約単価（税抜）</small>' + yen(contractUnitPrice(product, value.discountRate)) + '</strong>' +
        '<span class="wo-pricing-visibility ' + (value.enabled ? 'active' : '') + '">' + (value.enabled ? '美容室に公開' : '非公開') + '</span></article>'
    }).join('')
    const saveStatus = dealer.pricingDraft.size
      ? '未保存の変更が' + dealer.pricingDraft.size.toLocaleString('ja-JP') + '件あります。'
      : esc(contract.organizationName) + ' の保存済み設定を表示しています。'

    return '<section class="wo-workspace wo-pricing-management"><header class="wo-workspace-head"><div><p class="wo-section-label">SALON-SPECIFIC PRICING</p><h2>美容室別の取扱・割引設定</h2><p>同じ商品でも、美容室との取り決めに合わせて個別の割引率を設定できます。</p></div><label class="wo-pricing-salon"><span>設定する美容室</span><select id="dealer-pricing-salon">' + contracts.map(function (item) { return '<option value="' + esc(item.id) + '" ' + (item.id === contract.id ? 'selected' : '') + '>' + esc(item.organizationName) + '</option>' }).join('') + '</select><small>' + configuredCount.toLocaleString('ja-JP') + ' / ' + totalProductCount.toLocaleString('ja-JP') + '商品を公開中</small></label></header>' +
      (totalProductCount ? '<div class="wo-pricing-toolbar"><label class="wo-search">' + icon('search') + '<input id="dealer-pricing-search" value="' + esc(dealer.pricingQuery) + '" placeholder="商品名・メーカー・商品コードで検索" autocomplete="off"></label><span class="wo-product-result-v628" role="status">' + resultSummary + '</span><div class="wo-pricing-bulk"><label><span>一括割引率</span><span><input id="dealer-pricing-bulk-rate" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="' + esc(dealer.pricingBulkRate) + '"><b>%</b></span></label><button class="wo-button wo-button-secondary" type="button" data-action="apply-bulk-rate">選択商品へ適用</button></div></div><form id="dealer-pricing-form"><div class="wo-pricing-table"><div class="wo-pricing-head"><label><input type="checkbox" id="dealer-pricing-select-all" aria-label="表示中の商品をすべて選択"><span></span></label><span>商品</span><span>定価（税抜）</span><span>割引率</span><span>契約単価（税抜）</span><span>公開状態</span></div>' + (rows || '<div class="wo-table-empty">条件に一致する商品はありません。</div>') + '</div>' + pager + '<footer class="wo-pricing-save"><p>' + saveStatus + '</p><button class="wo-button wo-button-primary" type="button" data-action="save-contract-pricing">' + icon('check') + '変更を保存</button></footer></form>' : emptyState('package', '商品がまだ登録されていません', '先に「商品管理」で商品と定価を登録してください。')) + '</section>'
  }
