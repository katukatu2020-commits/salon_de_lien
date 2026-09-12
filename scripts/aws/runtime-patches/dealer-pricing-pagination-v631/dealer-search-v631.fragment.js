      if (event.target.id === 'dealer-product-search') {
        dealer.productQuery = event.target.value
        dealer.productPage = 1
        dealer.productLoadId += 1
        syncDealerProductUrl()
        const requestedQuery = dealer.productQuery
        const cursor = event.target.selectionStart
        clearTimeout(dealer.productSearchTimer)
        dealer.productSearchTimer = setTimeout(async function () {
          if (requestedQuery !== dealer.productQuery) return
          root.querySelector('.wo-product-management')?.classList.add('is-page-loading-v628')
          try {
            await reloadDealer()
            const input = document.getElementById('dealer-product-search')
            if (input && requestedQuery === dealer.productQuery) {
              input.focus({ preventScroll: true })
              input.setSelectionRange(cursor, cursor)
            }
          } catch (error) {
            root.querySelector('.wo-product-management')?.classList.remove('is-page-loading-v628')
            notify(error.message, 'error')
          }
        }, 260)
        return
      }
      if (event.target.id === 'dealer-pricing-search') {
        dealer.pricingQuery = event.target.value
        dealer.pricingPage = 1
        dealer.pricingLoadId += 1
        syncDealerPricingUrl()
        const requestedQuery = dealer.pricingQuery
        const cursor = event.target.selectionStart
        clearTimeout(dealer.pricingSearchTimer)
        dealer.pricingSearchTimer = setTimeout(async function () {
          if (requestedQuery !== dealer.pricingQuery) return
          root.querySelector('.wo-pricing-management')?.classList.add('is-page-loading-v631')
          try {
            await reloadDealer()
            const input = document.getElementById('dealer-pricing-search')
            if (input && requestedQuery === dealer.pricingQuery) {
              input.focus({ preventScroll: true })
              input.setSelectionRange(cursor, cursor)
            }
          } catch (error) {
            root.querySelector('.wo-pricing-management')?.classList.remove('is-page-loading-v631')
            notify(error.message, 'error')
          }
        }, 260)
        return
      }
      const searchState = event.target.id === 'dealer-order-search'
        ? ['query', 'dealer-order-search']
        : event.target.id === 'dealer-contract-search'
          ? ['contractQuery', 'dealer-contract-search']
          : null
      if (searchState) {
        dealer[searchState[0]] = event.target.value
        const cursor = event.target.selectionStart
        renderDealer()
        const input = document.getElementById(searchState[1])
        if (input) { input.focus(); input.setSelectionRange(cursor, cursor) }
      }
