      if (target.dataset.action === 'dealer-pricing-page') {
        const nextPage = Number.parseInt(target.dataset.page || '1', 10)
        if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage === dealer.pricingPage) return
        const previousPage = dealer.pricingPage
        dealer.pricingPage = nextPage
        syncDealerPricingUrl()
        target.disabled = true
        root.querySelector('.wo-pricing-management')?.classList.add('is-page-loading-v631')
        try {
          const rendered = await reloadDealer()
          if (rendered !== false) root.querySelector('.wo-pricing-toolbar')?.scrollIntoView({ block: 'start', behavior: 'auto' })
        } catch (error) {
          dealer.pricingPage = previousPage
          syncDealerPricingUrl()
          root.querySelector('.wo-pricing-management')?.classList.remove('is-page-loading-v631')
          notify(error.message, 'error')
          target.disabled = false
        }
      }
      else if (target.dataset.action === 'dealer-product-page') {
        const nextPage = Number.parseInt(target.dataset.page || '1', 10)
        if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage === dealer.productPage) return
        const previousPage = dealer.productPage
        dealer.productPage = nextPage
        syncDealerProductUrl()
        target.disabled = true
        root.querySelector('.wo-product-management')?.classList.add('is-page-loading-v628')
        try {
          const rendered = await reloadDealer()
          if (rendered !== false) root.querySelector('.wo-product-toolbar')?.scrollIntoView({ block: 'start', behavior: 'auto' })
        } catch (error) {
          dealer.productPage = previousPage
          syncDealerProductUrl()
          root.querySelector('.wo-product-management')?.classList.remove('is-page-loading-v628')
          notify(error.message, 'error')
          target.disabled = false
        }
      }
