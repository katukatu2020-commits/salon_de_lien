'use strict'

;(() => {
  if (window.__orimiaManualBreakCleanupV522) return
  window.__orimiaManualBreakCleanupV522 = true
  document.documentElement.dataset.orimiaManualBreakCleanup = 'v522'

  function installStyle() {
    if (document.getElementById('orimia-manual-break-v522-styles')) return
    const style = document.createElement('style')
    style.id = 'orimia-manual-break-v522-styles'
    style.textContent = 'body .lien-break-action-v442{display:none!important;visibility:hidden!important;pointer-events:none!important}'
    document.head.appendChild(style)
  }

  function suppressLegacyAction() {
    installStyle()
    for (const action of document.querySelectorAll('.lien-break-action-v442')) {
      action.hidden = true
      action.setAttribute('aria-hidden', 'true')
      action.inert = true
    }
  }

  installStyle()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', suppressLegacyAction, { once: true })
  else suppressLegacyAction()
  new MutationObserver(suppressLegacyAction).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', suppressLegacyAction)
})()
