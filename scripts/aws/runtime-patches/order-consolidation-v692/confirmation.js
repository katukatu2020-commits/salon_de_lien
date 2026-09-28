  function shippingConditionV692(p) {
    if (!p || !Number(p.feeYen)) return '送料無料'
    return '割引後の商品合計（税抜）' + yen(p.freeThresholdYen) + '以上で送料無料 / 未満は送料' + yen(p.feeYen) + '（税抜）'
  }
  async function showOrderDialog() {
    if (salon.busy || salon.quotingV692) return
    const groups = selectedOrderGroups()
    if (!groups.length) return
    const dialog = document.getElementById('wo-dialog')
    const payload = { requestedDeliveryDate: salon.requestedDeliveryDate, salonNote: salon.salonNote, orders: groups.map(group => ({ dealerId: group.dealerId, lines: group.items.map(item => ({ dealerProductId: item.product.dealerProductId, quantity: item.quantity })) })) }
    const intent = JSON.stringify(payload)
    if (salon.orderIntentV692 !== intent) { salon.orderIntentV692 = intent; salon.orderKeyV692 = crypto.randomUUID() }
    salon.orderConfirmationV692 = null
    salon.quotingV692 = true
    dialog.innerHTML = '<form method="dialog" class="wo-dialog-shell"><header><h2>発注内容を確認</h2><button aria-label="閉じる">' + icon('close') + '</button></header><div class="wo-dialog-content" role="status">合算する注文と送料を確認しています</div></form>'
    dialog.showModal()
    try {
      const quote = await post('/api/admin/wholesale/order-quote', payload)
      if (!dialog.open) return
      salon.orderConfirmationV692 = { ...payload, key: salon.orderKeyV692, quoteToken: quote.quoteToken }
      const stamp = value => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
      const markup = quote.orders.map(order => {
        const group = groups.find(g => g.dealerId === order.dealerId)
        return '<section class="wo-confirm-group"><div class="wo-confirm-destination"><strong>' + esc(order.dealerName) + '</strong></div><p>' + (order.orderId ? '既存の注文 ' + esc(order.orderNo) + ' に追加' : '新規注文') + '<br>発注日 ' + esc(order.businessDate) + ' / 締切 ' + esc(stamp(order.closesAt)) + '（日本時間）</p><ul class="wo-confirm-list">' + group.items.map(item => '<li><span>' + esc(item.product.name) + '</span><strong>' + item.quantity + '点</strong></li>').join('') + '</ul><dl class="oc-breakdown"><div><dt>今回追加の商品（税抜）</dt><dd>' + yen(order.addedSubtotalYen) + '</dd></div>' + (order.orderId ? '<div><dt>受付済みの商品（税抜）</dt><dd>' + yen(order.existingSubtotalYen) + '</dd></div>' : '') + '<div><dt>送料（税抜・注文ごと）</dt><dd>' + yen(order.shippingFeeYen) + '</dd></div><div><dt>消費税</dt><dd>' + yen(order.taxYen) + '</dd></div><div><dt>合算後の合計（税込）</dt><dd>' + yen(order.totalYen) + '</dd></div></dl><p class="oc-condition">' + esc(shippingConditionV692({ feeYen: order.shippingPolicyFeeYen, freeThresholdYen: order.shippingFreeThresholdYen })) + (order.shippingFeeYen ? '<br>あと' + yen(order.remainingForFreeYen) + '（税抜）の商品追加で送料無料' : '') + '</p></section>'
      }).join('')
      dialog.innerHTML = '<form method="dialog" class="wo-dialog-shell"><header><h2>発注内容を確認</h2><button aria-label="閉じる">' + icon('close') + '</button></header><div class="wo-dialog-content"><div class="wo-confirm-groups">' + markup + '</div><p>同じ締切の発注は、ディーラーごとに一つの注文・納品書にまとまります。出荷は締切後です。</p><p class="oc-error" role="alert"></p></div><footer><button class="wo-button wo-button-secondary">戻る</button><button class="wo-button wo-button-primary" type="button" data-action="submit-order">この内容で発注</button></footer></form>'
    } catch (error) {
      if (dialog.open) dialog.innerHTML = '<form method="dialog" class="wo-dialog-shell"><div class="wo-dialog-content"><p role="alert">' + esc(error.message) + '</p><button class="wo-button wo-button-secondary">戻る</button></div></form>'
    } finally { salon.quotingV692 = false }
  }

  async function submitOrder(button) {
    if (salon.busy || !salon.orderConfirmationV692) return
    salon.busy = true
    button.disabled = true
    const dialog = document.getElementById('wo-dialog')
    try {
      const result = await post('/api/admin/wholesale/orders', salon.orderConfirmationV692)
      const orders = result.orders || [result.order]
      dialog.close()
      salon.quantities.clear(); salon.selectedOnly = false; salon.orderPage = 1
      salon.requestedDeliveryDate = ''; salon.salonNote = ''
      salon.orderIntentV692 = null; salon.orderConfirmationV692 = null
      notify(orders.some(o => o.merged) ? '受付済みの注文に追加しました。送料も再計算しました。' : '発注を受け付けました。')
      await reloadSalon(salon.data.selectedDealerId)
      salon.view = 'history'; updateSalonUrl(); renderSalon()
    } catch (error) {
      const status = dialog.querySelector('.oc-error')
      if (status) status.textContent = error.message
      else notify(error.message, 'error')
      button.disabled = false
      if (error.message.includes('もう一度発注内容を確認')) {
        button.dataset.action = 'confirm-order'; button.textContent = '最新の内容を確認'
        button.onclick = () => dialog.close()
      }
    } finally { salon.busy = false }
  }
