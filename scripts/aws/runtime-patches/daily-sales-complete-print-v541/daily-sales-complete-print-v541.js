;(() => {
  'use strict'

  if (window.__orimiaDailySalesPrintV541) return

  const HOST_ID = 'orimia-daily-sales-print-host-v541'
  const ROOT_ATTRIBUTE = 'data-orimia-daily-sales-print-v541'
  const CARD_SELECTOR = '.sl-daily-card:has([data-sl-summary-table])'
  const nativePrint = window.print.bind(window)
  let lastMetrics = null

  function isSalesLedgerRoute() {
    return location.pathname === '/admin/owner-analytics'
      && new URLSearchParams(location.search).get('salesLedger') === '1'
  }

  function sourceCard() {
    return isSalesLedgerRoute() ? document.querySelector(CARD_SELECTOR) : null
  }

  function cleanup() {
    document.getElementById(HOST_ID)?.remove()
    document.documentElement.removeAttribute(ROOT_ATTRIBUTE)
  }

  function prepare() {
    cleanup()
    const source = sourceCard()
    if (!source) return null

    const host = document.createElement('section')
    host.id = HOST_ID
    host.setAttribute('aria-label', '日別売上集計 印刷用帳票')
    const copy = source.cloneNode(true)
    copy.setAttribute('data-orimia-daily-sales-copy-v541', '1')
    copy.querySelector('.sl-summary-head-actions')?.remove()
    copy.querySelector('[data-sl-print]')?.remove()
    copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'))
    const wrap = copy.querySelector('.sl-summary-wrap')
    if (wrap) wrap.scrollLeft = 0
    host.appendChild(copy)

    const table = copy.querySelector('[data-sl-summary-table]')
    const columnCount = table?.querySelectorAll('thead th').length || 0
    const rowCount = table?.querySelectorAll('tbody tr').length || 0
    const fontSizePt = columnCount <= 19 ? 5.2 : columnCount <= 23 ? 4.6 : 4
    const horizontalPaddingMm = columnCount <= 19 ? 0.65 : columnCount <= 23 ? 0.45 : 0.3
    host.style.setProperty('--orimia-sales-print-font', `${fontSizePt}pt`)
    host.style.setProperty('--orimia-sales-print-cell-x', `${horizontalPaddingMm}mm`)
    host.dataset.columns = String(columnCount)
    host.dataset.rows = String(rowCount)
    document.body.appendChild(host)
    document.documentElement.setAttribute(ROOT_ATTRIBUTE, '1')

    lastMetrics = Object.freeze({ columnCount, rowCount, fontSizePt })
    return lastMetrics
  }

  function print() {
    if (!prepare()) {
      nativePrint()
      return
    }
    nativePrint()
  }

  window.__orimiaDailySalesPrintV541 = Object.freeze({
    version:'v541',
    prepare,
    cleanup,
    print,
    metrics:() => lastMetrics,
  })
  window.print = print

  window.addEventListener('beforeprint', () => {
    if (sourceCard() && !document.getElementById(HOST_ID)) prepare()
  })
  window.addEventListener('afterprint', cleanup)
  window.addEventListener('popstate', cleanup)
})()
