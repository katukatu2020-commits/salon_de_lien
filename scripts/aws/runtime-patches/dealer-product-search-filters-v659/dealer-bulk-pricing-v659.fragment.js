  function applyBulkPricing() {
    const discountRate = Number(dealer.pricingBulkRate)
    if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100) {
      notify('一括割引率は0〜100%で入力してください。', 'error')
      return
    }
    const selectedProductIds = [...dealer.pricingSelection]
    if (!selectedProductIds.length) {
      notify('一括操作する商品を選択してください。', 'error')
      return
    }
    selectedProductIds.forEach(function (productId) {
      setPricingDraft(productId, { enabled:true, discountRate:discountRate })
    })
    renderDealer()
    notify(selectedProductIds.length.toLocaleString('ja-JP') + '商品へ割引率を反映しました。保存すると確定します。')
  }
