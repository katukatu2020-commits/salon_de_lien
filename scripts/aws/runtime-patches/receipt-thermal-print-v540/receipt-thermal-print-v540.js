;(() => {
  'use strict'

  if (window.__orimiaReceiptPrintV540) return

  const ROOT_ATTRIBUTE = 'data-orimia-receipt-print-v540'
  const MEASURING_ATTRIBUTE = 'data-orimia-receipt-measuring-v540'
  const HOST_ID = 'orimia-receipt-print-host-v540'
  const PAGE_STYLE_ID = 'orimia-receipt-page-size-v540'
  const RECEIPT_SELECTOR = '[aria-label="会計レシート"], article[class*="receipt_receipt__"]'
  const WIDTH_MM = 80
  const MM_PER_CSS_PX = 25.4 / 96
  const HEIGHT_SAFETY_MM = 1.5
  const nativePrint = window.print.bind(window)
  let lastMetrics = null

  function isReceiptRoute() {
    return /^\/admin\/appointments\/[^/]+\/receipt\/?$/.test(location.pathname)
  }

  function markReceiptReady() {
    if (!isReceiptRoute()) return
    const root = document.documentElement
    root.setAttribute(ROOT_ATTRIBUTE, '1')
    root.dataset.orimiaUiReady = 'v516'
    root.removeAttribute('aria-busy')
    const loader = document.getElementById('orimia-ui-loader-v536')
    if (loader) loader.setAttribute('aria-hidden', 'true')
  }

  function sourceReceipt() {
    return document.querySelector(RECEIPT_SELECTOR)
  }

  function cleanup() {
    document.getElementById(HOST_ID)?.remove()
    document.getElementById(PAGE_STYLE_ID)?.remove()
    document.documentElement.removeAttribute(MEASURING_ATTRIBUTE)
  }

  function prepare() {
    if (!isReceiptRoute() || !document.body) return null
    markReceiptReady()
    cleanup()

    const source = sourceReceipt()
    if (!source) return null

    const host = document.createElement('div')
    host.id = HOST_ID
    host.setAttribute('aria-hidden', 'true')
    const copy = source.cloneNode(true)
    copy.setAttribute('data-orimia-receipt-copy-v540', '1')
    host.appendChild(copy)
    document.body.appendChild(host)

    const root = document.documentElement
    root.setAttribute(MEASURING_ATTRIBUTE, '1')
    const heightPx = Math.max(copy.scrollHeight, copy.getBoundingClientRect().height)
    const heightMm = Math.ceil((heightPx * MM_PER_CSS_PX + HEIGHT_SAFETY_MM) * 10) / 10

    const pageStyle = document.createElement('style')
    pageStyle.id = PAGE_STYLE_ID
    pageStyle.textContent = `@page { size: ${WIDTH_MM}mm ${heightMm}mm; margin: 0; } @page receipt { size: ${WIDTH_MM}mm ${heightMm}mm; margin: 0; }`
    document.head.appendChild(pageStyle)
    root.removeAttribute(MEASURING_ATTRIBUTE)

    lastMetrics = Object.freeze({ widthMm:WIDTH_MM, heightMm, heightPx })
    return lastMetrics
  }

  function printReceipt() {
    if (!prepare()) {
      nativePrint()
      return
    }
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => nativePrint()))
  }

  window.__orimiaReceiptPrintV540 = Object.freeze({
    version:'v540',
    prepare,
    cleanup,
    metrics:() => lastMetrics,
  })
  window.print = printReceipt

  window.addEventListener('beforeprint', () => {
    if (!document.getElementById(HOST_ID)) prepare()
  })
  window.addEventListener('afterprint', cleanup)
  window.addEventListener('orimia:ui-transition-started', () => {
    if (isReceiptRoute()) queueMicrotask(markReceiptReady)
  })

  const activate = () => {
    markReceiptReady()
    window.dispatchEvent(new CustomEvent('orimia:ui-runtime-ready', {
      detail:{ source:'admin-commercial-v516', receiptPrint:'v540' },
    }))
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, { once:true })
  else activate()
  window.setTimeout(activate, 0)
  window.setTimeout(activate, 250)
})()
