;(() => {
  'use strict'

  if (window.__orimiaCustomerBookingGateV524) return
  window.__orimiaCustomerBookingGateV524 = true
  const root = document.documentElement
  const attribute = 'data-orimia-customer-booking-gate-v524'
  const maintain = () => {
    if (!root.hasAttribute(attribute)) root.setAttribute(attribute, '')
  }
  new MutationObserver(maintain).observe(root, { attributes: true, attributeFilter: [attribute] })
  window.addEventListener('pageshow', maintain)
  maintain()
})()
