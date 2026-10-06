;(() => {
  'use strict'
  if (window.__orimiaCheckoutShiftV700) return
  window.__orimiaCheckoutShiftV700 = true
  const receiptPath = /^\/admin\/appointments\/[^/]+\/receipt\/?$/
  let running = false, returning = false, autoConsumed = false, navigating = false
  let automaticFlow = false

  function returnHref() {
    const raw = document.querySelector('[data-shift-return-href]')?.dataset.shiftReturnHref
    try {
      const url = new URL(raw || '', location.origin)
      if (url.origin !== location.origin || url.pathname !== '/admin/appointments') return null
      const day = url.searchParams.get('date')
      if (!/^20\d{2}-\d{2}-\d{2}$/.test(day || '') || url.searchParams.get('month') !== day.slice(0, 7)) return null
      return '/admin/appointments?month=' + day.slice(0, 7) + '&date=' + day + '#staff-schedule'
    } catch { return null }
  }
  function printButtons() {
    return [...document.querySelectorAll('button')].filter(button => /印刷/.test(button.textContent || ''))
  }
  function busy(value) {
    running = value
    for (const button of printButtons()) {
      button.disabled = value
      button.setAttribute('aria-busy', String(value))
    }
  }
  function showError() {
    let alert = document.getElementById('receipt-print-error-v700')
    if (!alert) {
      alert = document.createElement('p')
      alert.id = 'receipt-print-error-v700'
      alert.setAttribute('role', 'alert')
      alert.style.cssText = 'color:#a52d49;padding:12px;margin:12px 0;'
      document.querySelector('main')?.prepend(alert)
    }
    alert.textContent = '印刷を確認できませんでした。プリンターの出力を確認してから、再度印刷してください。'
  }
  function finished() {
    if (!automaticFlow || !running || returning) return
    const href = returnHref()
    if (!href) { busy(false); showError(); return }
    returning = true
    // Reload the server-rendered shift so its payment colours cannot be stale.
    location.replace(href)
  }
  async function print() {
    if (running || returning) return
    busy(true)
    document.getElementById('receipt-print-error-v700')?.remove()
    try {
      if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))])
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const api = window.__orimiaReceiptPosDirectV582
      if (api) await api.print()
      else window.print()
    } catch { busy(false); showError() }
  }
  function activate() {
    if (!receiptPath.test(location.pathname)) { navigating = false; return }
    if (autoConsumed || new URLSearchParams(location.search).get('autoPrint') !== '1') return
    if (!document.querySelector('[data-shift-return-href]')) return
    autoConsumed = true
    automaticFlow = true
    // Consume before printing: refresh/back must not print the same receipt again.
    const url = new URL(location.href)
    url.searchParams.delete('autoPrint')
    history.replaceState(history.state, '', url.pathname + url.search + url.hash)
    void print()
  }
  window.addEventListener('orimia:receipt-direct-printed', event => {
    if (event.detail?.printed === true) finished()
  })
  window.addEventListener('afterprint', finished)
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    const link = event.target.closest('a[href]')
    if (link && !receiptPath.test(location.pathname)) {
      const url = new URL(link.href, location.origin)
      if (url.origin !== location.origin || !receiptPath.test(url.pathname)) return
      event.preventDefault(); event.stopImmediatePropagation()
      if (navigating) return
      navigating = true
      url.searchParams.set('autoPrint', '1')
      location.assign(url.pathname + url.search)
    } else if (receiptPath.test(location.pathname) && automaticFlow && event.target.closest('button') && /印刷/.test(event.target.closest('button').textContent || '')) {
      event.preventDefault(); event.stopImmediatePropagation()
      void print()
    }
  }, true)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, { once: true })
  else activate()
  window.addEventListener('pageshow', () => { navigating = false; activate() })
  window.addEventListener('orimia:ui-runtime-ready', activate)
  const observer = new MutationObserver(activate)
  observer.observe(document.documentElement, { childList: true, subtree: true })
})()
