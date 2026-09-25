export function customerRegistrationLinkRecoveryV660() {
  'use strict'

  if (!/^\/u\/register(?:\/|$)/.test(window.location.pathname)) return
  if (window.__orimiaCustomerRegistrationLinkRecoveryV660) return
  window.__orimiaCustomerRegistrationLinkRecoveryV660 = true

  const root = document.documentElement
  const loaderId = 'orimia-ui-loader-v536'
  let observer = null
  let released = false

  root.dataset.orimiaCustomerRegistrationRecovery = 'v660'

  function hasRegistrationContent() {
    return Boolean(document.querySelector([
      'main form[action="/api/customer-auth/registration-link/request"]',
      'main input[name="registrationInviteToken"]',
      'main a[href="/u/register"]',
      'main [data-orimia-registration-ready-v660]',
    ].join(',')))
  }

  function reveal(reason) {
    if (released) return
    released = true
    observer?.disconnect()
    root.dataset.orimiaUiReady = 'v516'
    root.dataset.orimiaCustomerRegistrationRecoveryState = reason
    delete root.dataset.orimiaUiTransition
    root.removeAttribute('aria-busy')
    const loader = document.getElementById(loaderId)
    loader?.setAttribute('aria-hidden', 'true')
  }

  function inspect() {
    if (hasRegistrationContent()) reveal('content-ready')
  }

  function observe() {
    if (!document.body || released) return
    observer = new MutationObserver(inspect)
    observer.observe(document.body, { childList: true, subtree: true })
    inspect()
  }

  if (document.body) observe()
  else document.addEventListener('DOMContentLoaded', observe, { once: true })

  window.addEventListener('pageshow', event => {
    if (event.persisted) reveal('pageshow')
    else inspect()
  })

  window.setTimeout(() => reveal('safety-timeout'), 5000)
}

export const customerRegistrationLinkRecoveryScriptV660 =
  `;(${customerRegistrationLinkRecoveryV660.toString()})()`
