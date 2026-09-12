  async function saveContractPricing(button) {
    if (dealer.busy || !dealer.pricingContractId) return
    const items = Array.from(dealer.pricingDraft.entries()).map(function (entry) {
      const value = entry[1]
      return { dealerProductId:entry[0], enabled:value.enabled, discountRate:Number(value.discountRate || 0) }
    })
    if (!items.length) {
      notify('変更する商品を選択してください。')
      return
    }
    dealer.busy = true
    button.disabled = true
    try {
      const result = await post('/api/dealer/contracts/' + encodeURIComponent(dealer.pricingContractId) + '/product-pricing', { items:items })
      dealer.pricingDraft.clear()
      notify(result.configuredCount + '商品の取扱・割引設定を保存しました。')
      await reloadDealer()
    } catch (error) { notify(error.message, 'error'); button.disabled = false } finally { dealer.busy = false }
  }
