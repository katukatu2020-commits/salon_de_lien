;(() => {
  'use strict'

  if (window.__orimiaUiTransitionV536) return
  window.__orimiaUiTransitionV536 = true
  window.__orimiaUiTransitionV516 = true

  const root = document.documentElement
  const standaloneCustomer = root.dataset.orimiaCustomerStandalone === 'v516'
  const runtimeEvent = 'orimia:ui-runtime-ready'
  const finishedEvent = 'orimia:ui-transition-finished'
  const loaderId = 'orimia-ui-loader-v536'
  const namespaceFor = pathname => pathname === '/admin' || pathname.startsWith('/admin/')
    ? 'admin'
    : pathname === '/u' || pathname.startsWith('/u/')
      ? 'customer'
      : ''
  const normalizePathname = pathname => pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const protectedUrl = value => {
    try {
      const url = new URL(value, location.href)
      return url.origin === location.origin && Boolean(namespaceFor(url.pathname))
    } catch {
      return false
    }
  }
  const changesPage = (beforeValue, afterValue) => {
    try {
      const before = new URL(beforeValue, location.href)
      const after = new URL(afterValue, before)
      return after.origin === location.origin
        && Boolean(namespaceFor(after.pathname))
        && (before.origin !== after.origin || normalizePathname(before.pathname) !== normalizePathname(after.pathname))
    } catch {
      return false
    }
  }

  const state = {
    cycle: 0,
    mode: 'initial',
    namespace: namespaceFor(location.pathname),
    startUrl: location.href,
    currentUrl: location.href,
    startedAt: performance.now(),
    committed: false,
    revealing: false,
    readySources: new Set(),
    settleTimer: 0,
    maxSettleTimer: 0,
    hardTimer: 0,
    clickTimer: 0,
  }

  function ensureLoader() {
    if (!document.body) return null
    let loader = document.getElementById(loaderId)
    if (!loader) {
      loader = document.createElement('div')
      loader.id = loaderId
      loader.setAttribute('role', 'status')
      loader.setAttribute('aria-live', 'polite')
      loader.setAttribute('aria-atomic', 'true')
      loader.innerHTML = `
        <div class="orimia-ui-loader-v536__mark" aria-hidden="true">
          <img src="/brand/orimia-icon-192.png?v=536" alt="" width="72" height="72" decoding="async">
        </div>
        <p class="orimia-ui-loader-v536__brand">ORIMIA <span>for Salon</span></p>
        <p class="orimia-ui-loader-v536__copy" data-orimia-loader-copy>画面を準備しています</p>
        <span class="orimia-ui-loader-v536__rail" aria-hidden="true"><span></span></span>`
      document.body.appendChild(loader)
    }
    root.dataset.orimiaLoadingExperience = 'v536'
    return loader
  }

  function updateLoaderCopy() {
    const loader = ensureLoader()
    const copy = loader?.querySelector('[data-orimia-loader-copy]')
    const message = state.mode === 'navigation' ? 'ページを移動しています' : '画面を準備しています'
    if (copy) copy.textContent = message
    if (loader) loader.setAttribute('aria-label', message)
  }

  function clearTimers() {
    window.clearTimeout(state.settleTimer)
    window.clearTimeout(state.maxSettleTimer)
    window.clearTimeout(state.hardTimer)
    window.clearTimeout(state.clickTimer)
    state.settleTimer = 0
    state.maxSettleTimer = 0
    state.hardTimer = 0
    state.clickTimer = 0
  }

  function setBusy(reason) {
    state.cycle += 1
    state.revealing = false
    updateLoaderCopy()
    delete root.dataset.orimiaUiReady
    root.dataset.orimiaUiTransition = state.mode
    root.setAttribute('aria-busy', 'true')
    window.dispatchEvent(new CustomEvent('orimia:ui-transition-started', {
      detail: { mode: state.mode, reason, cycle: state.cycle },
    }))
  }

  function reveal(reason) {
    if (root.dataset.orimiaUiReady === 'v516' || state.revealing) return
    state.revealing = true
    const expectedCycle = state.cycle
    const completedMode = state.mode
    clearTimers()
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      if (expectedCycle !== state.cycle) return
      delete root.dataset.orimiaUiTransition
      root.dataset.orimiaUiReady = 'v516'
      root.removeAttribute('aria-busy')
      state.currentUrl = location.href
      state.mode = 'idle'
      state.committed = false
      state.readySources.clear()
      state.revealing = false
      window.dispatchEvent(new CustomEvent(finishedEvent, {
        detail: { mode: completedMode, reason, cycle: state.cycle },
      }))
    }))
  }

  function armHardFallback(delay) {
    window.clearTimeout(state.hardTimer)
    state.hardTimer = window.setTimeout(() => reveal('safety-timeout'), delay)
  }

  function beginNavigation(reason) {
    clearTimers()
    state.mode = 'navigation'
    state.namespace = namespaceFor(location.pathname)
    state.startUrl = location.href
    state.startedAt = performance.now()
    state.committed = false
    state.readySources.clear()
    setBusy(reason)
    armHardFallback(6000)
  }

  function scheduleNavigationReveal() {
    if (state.mode !== 'navigation' || !state.committed) return
    if (state.namespace) return
    window.clearTimeout(state.settleTimer)
    const elapsed = performance.now() - state.startedAt
    const delay = Math.max(220, 360 - elapsed)
    state.settleTimer = window.setTimeout(() => reveal('route-settled'), delay)
  }

  function commitNavigation(reason) {
    if (state.mode !== 'navigation') beginNavigation(reason)
    state.namespace = namespaceFor(location.pathname)
    state.currentUrl = location.href
    state.committed = true
    state.startedAt = performance.now()
    armHardFallback(5000)
    window.clearTimeout(state.maxSettleTimer)
    const maxSettle = location.pathname === '/admin/products'
      && new URLSearchParams(location.search).get('section') === 'feedback'
      ? 4200
      : 2800
    state.maxSettleTimer = window.setTimeout(() => reveal('route-max-settle'), maxSettle)
    scheduleNavigationReveal()
  }

  function requiredRuntimeSources() {
    if (state.namespace === 'customer') {
      return [standaloneCustomer ? 'customer-standalone-v516' : 'customer-experience-v516']
    }
    if (state.namespace !== 'admin') return []
    if (location.pathname === '/admin/products'
      && new URLSearchParams(location.search).get('section') === 'feedback') {
      return ['admin-commercial-v516', 'admin-product-insights-v516']
    }
    return ['admin-commercial-v516']
  }

  if (document.body) ensureLoader()
  else document.addEventListener('DOMContentLoaded', ensureLoader, { once: true })

  if (!state.namespace) {
    const markPublicReady = () => reveal('public-document')
    if (document.readyState === 'complete') markPublicReady()
    else window.addEventListener('load', markPublicReady, { once: true })
  } else {
    state.mode = 'initial'
    updateLoaderCopy()
    armHardFallback(4800)
  }

  window.addEventListener(runtimeEvent, event => {
    const source = String(event.detail?.source || '')
    const required = requiredRuntimeSources()
    if (!state.namespace || !required.includes(source)) return
    if (state.mode === 'navigation' && !state.committed) return
    state.readySources.add(source)
    if (!required.every(item => state.readySources.has(item))) return
    if (state.mode === 'initial') {
      reveal('runtime-ready')
      return
    }
    if (state.mode !== 'navigation') return
    if (state.settleTimer) return
    const minimum = required.length === 1 && required[0] === 'admin-commercial-v516' ? 520 : 80
    const elapsed = performance.now() - state.startedAt
    state.settleTimer = window.setTimeout(
      () => reveal('runtime-ready'),
      Math.max(80, minimum - elapsed),
    )
  })

  for (const method of ['pushState', 'replaceState']) {
    const original = history[method]
    history[method] = function (...args) {
      const before = location.href
      const candidate = args[2] == null ? before : new URL(args[2], before).href
      const changingPage = candidate !== before && protectedUrl(candidate) && changesPage(before, candidate)
      if (changingPage) beginNavigation(`history-${method}`)
      const result = original.apply(this, args)
      state.currentUrl = location.href
      if (changingPage && changesPage(before, location.href)) commitNavigation(`history-${method}`)
      else if (changingPage) reveal('history-unchanged')
      return result
    }
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
    const target = new URL(link.href, location.href)
    const current = new URL(location.href)
    if (!protectedUrl(target.href) || !changesPage(current.href, target.href)) return
    beginNavigation('internal-link')
    state.clickTimer = window.setTimeout(() => {
      if (!state.committed && location.href === state.startUrl) reveal('link-not-committed')
    }, 1200)
  }, true)

  window.addEventListener('popstate', () => {
    const before = state.currentUrl
    const after = location.href
    state.currentUrl = after
    if (!changesPage(before, after)) return
    beginNavigation('popstate')
    commitNavigation('popstate')
  })

  window.addEventListener('pageshow', event => {
    state.currentUrl = location.href
    if (!event.persisted || !protectedUrl(location.href)) return
    beginNavigation('bfcache')
    commitNavigation('bfcache')
  })

  const observer = new MutationObserver(() => {
    // React can reconcile away body children added before hydration completes.
    // Keep the enhanced loader mounted until the current page is ready.
    if (root.dataset.orimiaUiReady !== 'v516') ensureLoader()
    scheduleNavigationReveal()
  })
  const observe = () => observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
  if (document.body) observe()
  else document.addEventListener('DOMContentLoaded', observe, { once: true })
})()
