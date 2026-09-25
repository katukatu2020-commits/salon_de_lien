function globalLoadingRecoveryV661() {
  'use strict'

  if (window.__orimiaGlobalLoadingRecoveryV661) return

  const root = document.documentElement
  const loaderId = 'orimia-ui-loader-v536'
  const readyValue = 'v516'
  const fastDelay = 1800
  const hardDelay = 6500
  let fastTimer = 0
  let hardTimer = 0
  let shellObserver = null

  root.dataset.orimiaGlobalLoadingRecovery = 'v661'

  function hasShell() {
    return Boolean(document.body && document.querySelector([
      'body > .admin-app-shell',
      'body > .app',
      'body > main',
      'main[role="main"]',
    ].join(',')))
  }

  function clearTimers() {
    window.clearTimeout(fastTimer)
    window.clearTimeout(hardTimer)
    fastTimer = 0
    hardTimer = 0
  }

  function reveal(reason) {
    if (root.dataset.orimiaUiReady === readyValue) {
      clearTimers()
      return
    }
    clearTimers()
    root.dataset.orimiaUiReady = readyValue
    root.dataset.orimiaGlobalLoadingRecoveryState = reason
    delete root.dataset.orimiaUiTransition
    root.removeAttribute('aria-busy')
    document.getElementById(loaderId)?.setAttribute('aria-hidden', 'true')
    window.dispatchEvent(new CustomEvent('orimia:ui-transition-finished', {
      detail: { mode: 'recovery', reason, release: 'v661' },
    }))
  }

  function runtimeStarted() {
    return Boolean(
      window.__orimiaUiTransitionV661
      || window.__orimiaUiTransitionV640
      || window.__orimiaUiTransitionV639
      || window.__orimiaUiTransitionV623
      || window.__orimiaUiTransitionV536,
    )
  }

  function observeForShell() {
    if (shellObserver || !document.body) return
    shellObserver = new MutationObserver(() => {
      if (!hasShell()) return
      shellObserver.disconnect()
      shellObserver = null
      arm('shell-ready')
    })
    shellObserver.observe(document.body, { childList: true, subtree: true })
  }

  function arm(reason) {
    if (root.dataset.orimiaUiReady === readyValue) {
      clearTimers()
      return
    }
    if (!hasShell()) {
      observeForShell()
      return
    }
    if (!fastTimer) {
      fastTimer = window.setTimeout(() => {
        fastTimer = 0
        if (root.dataset.orimiaUiReady !== readyValue && !runtimeStarted()) {
          reveal('runtime-unavailable')
        }
      }, fastDelay)
    }
    if (!hardTimer) {
      hardTimer = window.setTimeout(() => {
        hardTimer = 0
        if (root.dataset.orimiaUiReady !== readyValue && hasShell()) {
          reveal('watchdog-timeout')
        }
      }, hardDelay)
    }
    root.dataset.orimiaGlobalLoadingRecoveryArmed = reason
  }

  const rootObserver = new MutationObserver(() => arm('readiness-change'))
  rootObserver.observe(root, {
    attributes: true,
    attributeFilter: ['data-orimia-ui-ready', 'data-orimia-ui-transition', 'aria-busy'],
  })

  const start = () => arm('document-ready')
  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start, { once: true })

  window.addEventListener('pageshow', event => {
    if (event.persisted && root.dataset.orimiaUiReady !== readyValue && hasShell()) {
      reveal('pageshow')
      return
    }
    arm('pageshow')
  })
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) arm('visible')
  })

  window.__orimiaGlobalLoadingRecoveryV661 = { arm, reveal }
}

export const globalLoadingRecoveryScriptV661 = `;(${globalLoadingRecoveryV661.toString()})()`
