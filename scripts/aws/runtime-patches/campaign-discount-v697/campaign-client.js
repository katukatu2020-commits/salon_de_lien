  window.OrimiaCampaignBookingV685.quote = (menuKey, price, coupon) => {
    const current = read()
    const campaign = current?.status === 'ready' && current.menuIds.includes(menuKey) ? current.campaign : null
    const rate = Math.max(0, Math.min(100, Number(campaign?.discountRate || 0)))
    return { id:campaign?.id || '', rate, discount:coupon ? 0 : Math.floor(Math.max(0, price) * rate / 100) }
  }
