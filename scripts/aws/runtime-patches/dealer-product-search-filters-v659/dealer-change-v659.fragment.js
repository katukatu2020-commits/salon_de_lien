    async function reloadDealerFilterV659(kind) {
      const products = kind === 'products'
      const section = root.querySelector(products ? '.wo-product-management' : '.wo-pricing-management')
      if (products) {
        dealer.productPage = 1
        dealer.productLoadId += 1
        clearTimeout(dealer.productSearchTimer)
        syncDealerProductUrl()
      } else {
        dealer.pricingPage = 1
        dealer.pricingLoadId += 1
        clearTimeout(dealer.pricingSearchTimer)
        syncDealerPricingUrl()
      }
      section?.setAttribute('aria-busy', 'true')
      try {
        await reloadDealer(false, products ? 'product-results' : 'pricing-results')
      } catch (error) {
        section?.removeAttribute('aria-busy')
        notify(error.message, 'error')
      }
    }

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
        const previousSelection = new Set(dealer.pricingSelection)
        dealer.pricingContractId = event.target.value
        dealer.pricingPage = 1
        dealer.pricingLoadId += 1
        dealer.pricingDraft.clear()
        dealer.pricingSelection.clear()
        syncDealerPricingUrl()
        event.target.disabled = true
        root.querySelector('.wo-pricing-management')?.classList.add('is-page-loading-v631')
        try {
          await reloadDealer()
        } catch (error) {
          dealer.pricingContractId = previousContractId
          dealer.pricingPage = previousPage
          dealer.pricingDraft = previousDraft
          dealer.pricingSelection = previousSelection
          syncDealerPricingUrl()
          renderDealer()
          notify(error.message, 'error')
        }
        return
      }
      if (event.target.id === 'dealer-product-manufacturer-filter' || event.target.id === 'dealer-product-category-filter') {
        if (event.target.id === 'dealer-product-manufacturer-filter') dealer.productManufacturer = event.target.value
        else dealer.productCategory = event.target.value
        await reloadDealerFilterV659('products')
        return
      }
      if (event.target.id === 'dealer-pricing-manufacturer-filter' || event.target.id === 'dealer-pricing-category-filter') {
        if (event.target.id === 'dealer-pricing-manufacturer-filter') dealer.pricingManufacturer = event.target.value
        else dealer.pricingCategory = event.target.value
        await reloadDealerFilterV659('pricing')
        return
      }
      if (event.target.id === 'dealer-pricing-select-all') {
        root.querySelectorAll('[data-pricing-row]').forEach(function (row) {
          if (event.target.checked) dealer.pricingSelection.add(row.dataset.productId)
          else dealer.pricingSelection.delete(row.dataset.productId)
        })
        renderDealer()
        return
      }
      if (event.target.matches('[data-pricing-selected]')) {
        const row = event.target.closest('[data-pricing-row]')
        if (event.target.checked) dealer.pricingSelection.add(row.dataset.productId)
        else dealer.pricingSelection.delete(row.dataset.productId)
        renderDealer()
        return
      }
      if (event.target.matches('[data-pricing-enabled]')) {
        const row = event.target.closest('[data-pricing-row]')
        setPricingDraft(row.dataset.productId, { enabled:event.target.checked })
        renderDealer()
      }
    })
