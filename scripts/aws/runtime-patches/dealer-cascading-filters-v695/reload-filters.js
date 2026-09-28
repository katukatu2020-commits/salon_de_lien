    async function reloadDealerFilterV659(kind) {
      const products = kind === 'products', prefix = products ? 'product' : 'pricing'
      const section = root.querySelector(products ? '.wo-product-management' : '.wo-pricing-management')
      dealer[prefix + 'Page'] = 1
      dealer[prefix + 'LoadId'] += 1
      clearTimeout(dealer[prefix + 'SearchTimer'])
      syncDealerFiltersV695(kind)
      if (products) syncDealerProductUrl()
      else syncDealerPricingUrl()
      section?.setAttribute('aria-busy', 'true')
      const requestId = dealer[prefix + 'LoadId'] + 1
      try {
        await reloadDealer(false, products ? 'product-results' : 'pricing-results')
      } catch (error) {
        if (requestId !== dealer[prefix + 'LoadId']) return
        const previous = dealer.data[prefix + 'Pagination']
        if (previous) {
          dealer[prefix + 'Page'] = previous.page
          dealer[prefix + 'Manufacturer'] = previous.manufacturer || ''
          dealer[prefix + 'Category'] = previous.category || ''
          dealer[prefix + 'Query'] = previous.query || ''
          const search = root.querySelector('#dealer-' + prefix + '-search')
          if (search) search.value = dealer[prefix + 'Query']
          syncDealerFiltersV695(kind)
          if (products) syncDealerProductUrl()
          else syncDealerPricingUrl()
        }
        section?.removeAttribute('aria-busy')
        notify(error.message, 'error')
      }
    }
