;(() => {
  'use strict'

  if (window.__orimiaSalonOnboardingGuideRemovalV632) return
  window.__orimiaSalonOnboardingGuideRemovalV632 = true
  window.__lienFirstStoreProductTourV405 = true
  window.__lienProductTourActive = false

  function clearStoredGuideState() {
    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index)
        if (key === 'lien-product-tour-pending' || String(key || '').startsWith('lien-product-tour:')) {
          localStorage.removeItem(key)
        }
      }
    } catch {}
  }

  function removeLegacyGuideUi() {
    document.querySelectorAll('.lpt-welcome,.lpt-coach,.lpt-resume,.ts-launcher').forEach(node => node.remove())
    document.querySelectorAll('.lpt-highlight').forEach(node => node.classList.remove('lpt-highlight'))
  }

  function cleanRegistrationUrl() {
    if (location.pathname !== '/admin/settings') return
    const url = new URL(location.href)
    const changed = url.searchParams.has('registered') || url.searchParams.has('setup')
    url.searchParams.delete('registered')
    url.searchParams.delete('setup')
    if (changed) history.replaceState(history.state, '', url.pathname + url.search + url.hash)
  }

  function cleanup() {
    clearStoredGuideState()
    removeLegacyGuideUi()
    cleanRegistrationUrl()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cleanup, { once: true })
  else cleanup()
  window.setTimeout(cleanup, 250)
})() /* salon-onboarding-guide-removal-v632 */
