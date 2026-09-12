  async function reloadDealer(refreshBilling) {
    if (dealer.view === 'company') {
      const result = await api('/api/dealer/profile')
      dealer.profile = result.profile
      renderDealer()
      return true
    }
    if (dealer.view === 'billing') {
      const params = new URLSearchParams()
      if (refreshBilling) params.set('refresh', '1')
      const sessionId = new URLSearchParams(location.search).get('session_id')
      if (sessionId) params.set('session_id', sessionId)
      const query = params.toString()
      const result = await api('/api/dealer/billing/status' + (query ? '?' + query : ''))
      dealer.billing = result.billing
      renderDealer()
      return true
    }
    const bootstrapParams = new URLSearchParams()
    let productRequestId = 0
    let pricingRequestId = 0
    if (dealer.view === 'products') {
      bootstrapParams.set('view', 'products')
      bootstrapParams.set('productPage', String(dealer.productPage))
      if (dealer.productQuery) bootstrapParams.set('productSearch', dealer.productQuery)
      productRequestId = ++dealer.productLoadId
    } else if (dealer.view === 'pricing') {
      bootstrapParams.set('view', 'pricing')
      bootstrapParams.set('pricingPage', String(dealer.pricingPage))
      if (dealer.pricingQuery) bootstrapParams.set('pricingSearch', dealer.pricingQuery)
      if (dealer.pricingContractId) bootstrapParams.set('contractId', dealer.pricingContractId)
      pricingRequestId = ++dealer.pricingLoadId
    }
    const bootstrapQuery = bootstrapParams.toString()
    const nextData = await api('/api/dealer/bootstrap' + (bootstrapQuery ? '?' + bootstrapQuery : ''))
    if (productRequestId && productRequestId !== dealer.productLoadId) return false
    if (pricingRequestId && pricingRequestId !== dealer.pricingLoadId) return false
    dealer.data = nextData
    if (dealer.view === 'products' && dealer.data.productPagination) {
      dealer.productPage = Number(dealer.data.productPagination.page || 1)
      dealer.productQuery = String(dealer.data.productPagination.query || '')
      syncDealerProductUrl()
    }
    const contracts = activeDealerContracts()
    if (dealer.view === 'pricing' && dealer.data.pricingPagination) {
      dealer.pricingPage = Number(dealer.data.pricingPagination.page || 1)
      dealer.pricingQuery = String(dealer.data.pricingPagination.query || '')
      dealer.pricingContractId = String(dealer.data.pricingPagination.contractId || contracts[0]?.id || '')
      syncDealerPricingUrl()
    } else if (!contracts.some(function (contract) { return contract.id === dealer.pricingContractId })) {
      dealer.pricingContractId = contracts[0]?.id || ''
    }
    renderDealer()
    return true
  }
