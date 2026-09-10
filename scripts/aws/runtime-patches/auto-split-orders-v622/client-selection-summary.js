  function selectedOrderGroups() {
    const groups = new Map()
    selectedOrder().forEach(function (item) {
      const dealerId = item.product.dealerId
      if (!groups.has(dealerId)) {
        const contract = salon.data.contracts.find(function (entry) { return entry.dealerId === dealerId })
        groups.set(dealerId, {
          dealerId: dealerId,
          dealerName: contract ? contract.dealerName : item.product.dealerName || '発注先',
          items: [],
        })
      }
      groups.get(dealerId).items.push(item)
    })
    return Array.from(groups.values())
  }

  function orderSummary() {
    const selected = selectedOrder()
    const groups = selectedOrderGroups()
    const totalQuantity = selected.reduce(function (sum, item) { return sum + item.quantity }, 0)
    const subtotal = selected.reduce(function (sum, item) { return sum + Number(item.product.unitPrice || 0) * item.quantity }, 0)
    const splitNotice = groups.length > 1 ? '<div class="wo-summary-split"><strong>' + groups.length + '件の注文に自動分割</strong><span>発注先ごとに個別の発注番号を発行します。</span></div>' : ''
    return '<aside class="wo-order-summary"><div class="wo-summary-head">' + icon('clipboard') + '<div><span>発注内容</span><strong>' + selected.length + '商品 / ' + totalQuantity + '点</strong></div></div>' +
      (selected.length ? '<ul>' + selected.map(function (item) { return '<li><span><small>' + esc(item.product.manufacturerName) + ' / ' + esc(item.product.dealerName) + '</small>' + esc(item.product.name) + '</span><strong>' + item.quantity + '点<small>' + yen(Number(item.product.unitPrice) * item.quantity) + '</small></strong></li>' }).join('') + '</ul>' + splitNotice + '<div class="wo-summary-subtotal"><span>税抜小計</span><strong>' + yen(subtotal) + '</strong></div>' : '<p class="wo-summary-empty">商品の発注数を入力してください。</p>') +
      '<label><span>希望納品日（任意）</span><input id="requested-delivery-date" type="date" value="' + esc(salon.requestedDeliveryDate) + '"></label><label><span>発注メモ（任意）</span><textarea id="salon-note" rows="3" maxlength="1200" placeholder="納品時の連絡事項など">' + esc(salon.salonNote) + '</textarea></label>' +
      '<button class="wo-button wo-button-primary wo-submit-order" type="button" data-action="confirm-order" ' + (!selected.length ? 'disabled' : '') + '>' + icon('truck') + '発注内容を確認</button><p class="wo-summary-foot">表示価格は税抜です。選択商品は発注先ごとに自動で注文を分けます。</p></aside>'
  }
