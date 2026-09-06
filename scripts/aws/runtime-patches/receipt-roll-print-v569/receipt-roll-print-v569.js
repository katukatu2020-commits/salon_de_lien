;(() => {
  'use strict'

  if (window.__orimiaReceiptRollPrintV569) return

  const ROOT_ATTRIBUTE = 'data-orimia-receipt-roll-print-v569'
  const MEASURING_ATTRIBUTE = 'data-orimia-receipt-roll-measuring-v569'
  const READY_ATTRIBUTE = 'data-orimia-receipt-roll-ready-v569'
  const PRINTING_ATTRIBUTE = 'data-orimia-receipt-roll-printing-v569'
  const COPY_ATTRIBUTE = 'data-orimia-receipt-roll-copy-v569'
  const HOST_ID = 'orimia-receipt-roll-host-v569'
  const PAGE_STYLE_ID = 'orimia-receipt-roll-page-v569'
  const HEIGHT_PROPERTY = '--orimia-receipt-roll-height-v569'
  const RECEIPT_SELECTOR = 'article[class*="receipt_receipt__"]'
  const PAPER_WIDTH_MM = 80
  const PRINTABLE_WIDTH_MM = 72
  const DOTS_PER_MM = 8
  const FEED_SAFETY_DOTS = 8
  const MM_PER_CSS_PX = 25.4 / 96
  const nativePrint = window.print.bind(window)

  let lastMetrics = null
  let printPending = false

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
    const root = document.documentElement
    root.removeAttribute(MEASURING_ATTRIBUTE)
    root.removeAttribute(READY_ATTRIBUTE)
    root.removeAttribute(PRINTING_ATTRIBUTE)
    root.style.removeProperty(HEIGHT_PROPERTY)
  }

  function measureReceipt(copy) {
    const rect = copy.getBoundingClientRect()
    return Math.ceil(Math.max(copy.scrollHeight, copy.offsetHeight, rect.height))
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
    copy.removeAttribute('id')
    copy.setAttribute(COPY_ATTRIBUTE, '1')
    host.appendChild(copy)
    document.body.appendChild(host)

    const root = document.documentElement
    root.setAttribute(MEASURING_ATTRIBUTE, '1')
    const contentHeightPx = measureReceipt(copy)
    root.removeAttribute(MEASURING_ATTRIBUTE)

    if (!Number.isFinite(contentHeightPx) || contentHeightPx <= 0) {
      cleanup()
      return null
    }

    const contentHeightMm = contentHeightPx * MM_PER_CSS_PX
    const pageHeightDots = Math.ceil(contentHeightMm * DOTS_PER_MM) + FEED_SAFETY_DOTS
    const heightMm = pageHeightDots / DOTS_PER_MM
    const heightValue = `${heightMm}mm`

    root.style.setProperty(HEIGHT_PROPERTY, heightValue)
    root.setAttribute(READY_ATTRIBUTE, '1')
    host.style.setProperty(HEIGHT_PROPERTY, heightValue)
    host.dataset.pageHeightMm = String(heightMm)

    const pageStyle = document.createElement('style')
    pageStyle.id = PAGE_STYLE_ID
    pageStyle.textContent = `@page { size: ${PAPER_WIDTH_MM}mm ${heightMm}mm; margin: 0; } @page receipt { size: ${PAPER_WIDTH_MM}mm ${heightMm}mm; margin: 0; }`
    document.head.appendChild(pageStyle)

    lastMetrics = Object.freeze({
      widthMm:PAPER_WIDTH_MM,
      printableWidthMm:PRINTABLE_WIDTH_MM,
      heightMm,
      contentHeightPx,
      contentHeightMm:Math.round(contentHeightMm * 1000) / 1000,
      feedSafetyMm:FEED_SAFETY_DOTS / DOTS_PER_MM,
      pageHeightDots,
    })
    return lastMetrics
  }

  function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve))
  }

  async function settleLayout() {
    if (document.fonts?.ready) {
      await Promise.race([
        document.fonts.ready.catch(() => undefined),
        new Promise(resolve => window.setTimeout(resolve, 1500)),
      ])
    }
    await nextFrame()
    await nextFrame()
  }

  async function printReceipt() {
    if (printPending) return
    printPending = true

    try {
      await settleLayout()
      if (!prepare()) {
        nativePrint()
        return
      }
      document.documentElement.setAttribute(PRINTING_ATTRIBUTE, '1')
      await nextFrame()
      await nextFrame()
      nativePrint()
    } finally {
      window.setTimeout(() => {
        printPending = false
      }, 500)
    }
  }

  window.__orimiaReceiptRollPrintV569 = Object.freeze({
    version:'v569',
    prepare,
    print:printReceipt,
    cleanup,
    metrics:() => lastMetrics,
  })
  window.print = () => {
    void printReceipt()
  }

  window.addEventListener('beforeprint', () => {
    if (!document.getElementById(HOST_ID)) prepare()
    document.documentElement.setAttribute(PRINTING_ATTRIBUTE, '1')
  })
  window.addEventListener('afterprint', () => {
    printPending = false
    cleanup()
  })
  window.addEventListener('orimia:ui-transition-started', () => {
    if (isReceiptRoute()) queueMicrotask(markReceiptReady)
  })

  const activate = () => {
    markReceiptReady()
    window.dispatchEvent(new CustomEvent('orimia:ui-runtime-ready', {
      detail:{ source:'admin-commercial-v516', receiptPrint:'v569' },
    }))
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, { once:true })
  else activate()
  window.setTimeout(activate, 0)
  window.setTimeout(activate, 250)
})()
