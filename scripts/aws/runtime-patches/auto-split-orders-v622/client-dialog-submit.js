  function showOrderDialog() {
    const groups = selectedOrderGroups()
    if (!groups.length) return
    const dialog = document.getElementById('wo-dialog')
    const taxRate = Number(salon.data.organization.taxRate || 10)
    const prepared = groups.map(function (group) {
      const quantity = group.items.reduce(function (sum, item) { return sum + item.quantity }, 0)
      const subtotal = group.items.reduce(function (sum, item) { return sum + Number(item.product.unitPrice || 0) * item.quantity }, 0)
      const tax = Math.round(subtotal * taxRate / 100)
      return { ...group, quantity: quantity, subtotal: subtotal, total: subtotal + tax }
    })
    const totalProducts = prepared.reduce(function (sum, group) { return sum + group.items.length }, 0)
    const totalQuantity = prepared.reduce(function (sum, group) { return sum + group.quantity }, 0)
    const totalYen = prepared.reduce(function (sum, group) { return sum + group.total }, 0)
    const groupMarkup = prepared.map(function (group, index) {
      return '<section class="wo-confirm-group"><div class="wo-confirm-destination"><span>発注先 ' + (index + 1) + '</span><strong>' + esc(group.dealerName) + '</strong></div><ul class="wo-confirm-list">' + group.items.map(function (item) { return '<li><span><small>' + esc(item.product.manufacturerName) + ' / ' + rate(item.product.discountRate) + '割引</small>' + esc(item.product.name) + '</span><strong>' + item.quantity + '点<small>' + yen(Number(item.product.unitPrice) * item.quantity) + '</small></strong></li>' }).join('') + '</ul><div class="wo-confirm-group-total"><span>' + group.items.length + '商品 / ' + group.quantity + '点</span><strong>' + yen(group.total) + '<small>税込</small></strong></div></section>'
    }).join('')
    const splitMessage = prepared.length > 1 ? '<div class="wo-confirm-split-note"><strong>' + prepared.length + '件の注文として送信します</strong><span>発注番号と配送状況は発注先ごとに分かれます。</span></div>' : ''
    dialog.innerHTML = '<form method="dialog" class="wo-dialog-shell"><header><div>' + icon('clipboard') + '<div><p>ORDER CONFIRMATION</p><h2>発注内容を確認</h2></div></div><button value="cancel" aria-label="閉じる">' + icon('close') + '</button></header><div class="wo-dialog-content">' + splitMessage + '<div class="wo-confirm-groups">' + groupMarkup + '</div><div class="wo-confirm-total"><span>合計 ' + prepared.length + '件 / ' + totalProducts + '商品 / ' + totalQuantity + '点</span><strong>' + yen(totalYen) + '<small>税込</small></strong></div><p class="wo-confirm-note">すべての発注先への注文をまとめて確認し、一度に確定します。</p></div><footer><button class="wo-button wo-button-secondary" value="cancel">戻る</button><button class="wo-button wo-button-primary" type="button" data-action="submit-order">' + icon('truck') + (prepared.length > 1 ? prepared.length + '件に分けて注文を確定' : 'この内容で注文') + '</button></footer></form>'
    dialog.showModal()
  }

  async function submitOrder(button) {
    if (salon.busy) return
    const groups = selectedOrderGroups()
    if (!groups.length) {
      notify('発注する商品を選択してください。', 'error')
      return
    }
    salon.busy = true
    button.disabled = true
    button.classList.add('loading')
    try {
      const result = await post('/api/admin/wholesale/orders', {
        requestedDeliveryDate: salon.requestedDeliveryDate,
        salonNote: salon.salonNote,
        orders: groups.map(function (group) {
          return {
            dealerId: group.dealerId,
            lines: group.items.map(function (item) { return { dealerProductId: item.product.dealerProductId, quantity: item.quantity } }),
          }
        }),
      })
      const created = Array.isArray(result.orders) ? result.orders : result.order ? [result.order] : []
      document.getElementById('wo-dialog').close()
      salon.quantities.clear()
      salon.requestedDeliveryDate = ''
      salon.salonNote = ''
      notify(created.length > 1 ? created.length + '件の注文を発注先ごとに送信しました。' : '注文 ' + (created[0] ? created[0].orderNo : '') + ' を送信しました。')
      await reloadSalon(salon.data.selectedDealerId)
      salon.view = 'history'
      updateSalonUrl()
      renderSalon()
    } catch (error) {
      notify(error.message, 'error')
      button.disabled = false
      button.classList.remove('loading')
    } finally { salon.busy = false }
  }
