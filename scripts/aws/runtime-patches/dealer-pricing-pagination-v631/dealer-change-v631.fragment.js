    root.addEventListener('change', async function (event) {
      if (event.target.id === 'dealer-billing-agreement') {
        const button = root.querySelector('[data-action="start-billing-checkout"]')
        if (button) button.disabled = !event.target.checked || !dealer.billing || !dealer.billing.configured
        return
      }
      if (event.target.matches('[data-remove-confirm]')) {
        const button = event.target.closest('form').querySelector('[data-action="confirm-remove"]')
        if (button) button.disabled = !event.target.checked
        return
      }
      if (event.target.id === 'dealer-pricing-salon') {
        const previousContractId = dealer.pricingContractId
        const previousPage = dealer.pricingPage
        const previousDraft = new Map(dealer.pricingDraft)
        dealer.pricingContractId = event.target.value
        dealer.pricingPage = 1
        dealer.pricingLoadId += 1
        dealer.pricingDraft.clear()
        syncDealerPricingUrl()
        event.target.disabled = true
        root.querySelector('.wo-pricing-management')?.classList.add('is-page-loading-v631')
        try {
          await reloadDealer()
        } catch (error) {
          dealer.pricingContractId = previousContractId
          dealer.pricingPage = previousPage
          dealer.pricingDraft = previousDraft
          syncDealerPricingUrl()
          renderDealer()
          notify(error.message, 'error')
        }
        return
      }
      if (event.target.id === 'dealer-pricing-select-all') {
        root.querySelectorAll('[data-pricing-row]').forEach(function (row) {
          setPricingDraft(row.dataset.productId, { enabled:event.target.checked })
        })
        renderDealer()
        return
      }
      if (event.target.matches('[data-pricing-enabled]')) {
        const row = event.target.closest('[data-pricing-row]')
        setPricingDraft(row.dataset.productId, { enabled:event.target.checked })
        renderDealer()
      }
    })
