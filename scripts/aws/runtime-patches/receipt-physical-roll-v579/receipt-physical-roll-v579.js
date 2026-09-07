;(() => {
  'use strict'

  if (window.__orimiaReceiptPhysicalRollV579) return

  const ROOT_ATTRIBUTE = 'data-orimia-receipt-physical-roll-v579'
  const MEASURING_ATTRIBUTE = 'data-orimia-receipt-roll-measuring-v579'
  const READY_ATTRIBUTE = 'data-orimia-receipt-roll-ready-v579'
  const PRINTING_ATTRIBUTE = 'data-orimia-receipt-roll-printing-v579'
  const COPY_ATTRIBUTE = 'data-orimia-receipt-roll-copy-v579'
  const HOST_ID = 'orimia-receipt-roll-host-v579'
  const PAGE_STYLE_ID = 'orimia-receipt-roll-page-v579'
  const HEIGHT_PROPERTY = '--orimia-receipt-roll-height-v579'
  const RECEIPT_SELECTOR = '[data-receipt-print-root],article[class*="receipt_receipt__"]'
  const PAPER_WIDTH_MM = 80
  const PRINTABLE_WIDTH_MM = 72
  const DOTS_PER_MM = 8
  const FEED_SAFETY_DOTS = 8
  const MM_PER_CSS_PX = 25.4 / 96
  const nativePrint = window.print.bind(window)

  let lastMetrics = null
  let printPending = false
  let prepareTimer = 0
  let observedReceipt = null
  let resizeObserver = null
  let mutationObserver = null

  function isReceiptRoute() {
    return /^\/admin\/appointments\/[^/]+\/receipt\/?$/.test(location.pathname)
  }

  function sourceReceipt() {
    return document.querySelector(RECEIPT_SELECTOR)
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

  function marginBoxReset() {
    return [
      'top-left-corner', 'top-left', 'top-center', 'top-right', 'top-right-corner',
      'left-top', 'left-middle', 'left-bottom',
      'right-top', 'right-middle', 'right-bottom',
      'bottom-left-corner', 'bottom-left', 'bottom-center', 'bottom-right', 'bottom-right-corner',
    ].map(name => `@${name} { content: none; }`).join(' ')
  }

  function installPageRule(heightMm) {
    let pageStyle = document.getElementById(PAGE_STYLE_ID)
    if (!pageStyle) {
      pageStyle = document.createElement('style')
      pageStyle.id = PAGE_STYLE_ID
      document.head.appendChild(pageStyle)
    }
    pageStyle.textContent = `@page { size: ${PAPER_WIDTH_MM}mm ${heightMm}mm; margin: 0; ${marginBoxReset()} }`
  }

  function removePrintLayer() {
    document.getElementById(HOST_ID)?.remove()
    document.getElementById(PAGE_STYLE_ID)?.remove()
    const root = document.documentElement
    root.removeAttribute(MEASURING_ATTRIBUTE)
    root.removeAttribute(READY_ATTRIBUTE)
    root.removeAttribute(PRINTING_ATTRIBUTE)
    root.style.removeProperty(HEIGHT_PROPERTY)
  }

  function disconnectMutationObserver() {
    mutationObserver?.disconnect()
  }

  function connectMutationObserver() {
    if (!document.body) return
    if (!mutationObserver) {
      mutationObserver = new MutationObserver(() => {
        if (isReceiptRoute()) schedulePrepare(40)
        else cleanup()
      })
    }
    mutationObserver.observe(document.body, {
      subtree:true,
      childList:true,
      characterData:true,
      attributes:true,
      attributeFilter:['src'],
    })
  }

  function bindResizeObserver(source) {
    if (observedReceipt === source) return
    resizeObserver?.disconnect()
    observedReceipt = source
    if (!source || typeof ResizeObserver !== 'function') return
    resizeObserver = new ResizeObserver(() => schedulePrepare(40))
    resizeObserver.observe(source)
  }

  function measureReceipt(copy) {
    const rect = copy.getBoundingClientRect()
    return Math.ceil(Math.max(copy.scrollHeight, copy.offsetHeight, rect.height))
  }

  function prepare() {
    if (!isReceiptRoute() || !document.body) return null
    markReceiptReady()

    const source = sourceReceipt()
    if (!source) return null
    bindResizeObserver(source)
    disconnectMutationObserver()

    try {
      document.getElementById(HOST_ID)?.remove()

      const host = document.createElement('div')
      host.id = HOST_ID
      host.setAttribute('aria-hidden', 'true')

      const copy = source.cloneNode(true)
      copy.removeAttribute('id')
      copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'))
      copy.setAttribute(COPY_ATTRIBUTE, '1')
      host.appendChild(copy)
      document.body.appendChild(host)

      const root = document.documentElement
      root.setAttribute(MEASURING_ATTRIBUTE, '1')
      const contentHeightPx = measureReceipt(copy)
      root.removeAttribute(MEASURING_ATTRIBUTE)

      if (!Number.isFinite(contentHeightPx) || contentHeightPx <= 0) {
        removePrintLayer()
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
      installPageRule(heightMm)

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
    } finally {
      connectMutationObserver()
    }
  }

  function schedulePrepare(delay = 0) {
    window.clearTimeout(prepareTimer)
    prepareTimer = window.setTimeout(() => {
      prepareTimer = 0
      if (isReceiptRoute()) prepare()
    }, delay)
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
    if (!isReceiptRoute()) {
      nativePrint()
      return
    }
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
      nativePrint()
    } finally {
      window.setTimeout(() => {
        printPending = false
      }, 500)
    }
  }

  function cleanup() {
    window.clearTimeout(prepareTimer)
    prepareTimer = 0
    resizeObserver?.disconnect()
    observedReceipt = null
    removePrintLayer()
    document.documentElement.removeAttribute(ROOT_ATTRIBUTE)
  }

  window.__orimiaReceiptPhysicalRollV579 = Object.freeze({
    version:'v579',
    prepare,
    schedulePrepare,
    print:printReceipt,
    cleanup,
    metrics:() => lastMetrics,
  })
  window.print = () => {
    void printReceipt()
  }

  window.addEventListener('beforeprint', () => {
    if (!isReceiptRoute()) return
    if (!document.getElementById(HOST_ID)) prepare()
    document.documentElement.setAttribute(PRINTING_ATTRIBUTE, '1')
  })
  window.addEventListener('afterprint', () => {
    printPending = false
    document.documentElement.removeAttribute(PRINTING_ATTRIBUTE)
    schedulePrepare(0)
  })
  window.addEventListener('load', () => schedulePrepare(0), { once:true })
  window.addEventListener('orimia:ui-transition-started', () => {
    if (isReceiptRoute()) {
      queueMicrotask(() => {
        markReceiptReady()
        schedulePrepare(0)
      })
    } else {
      cleanup()
    }
  })

  const activate = () => {
    if (!isReceiptRoute()) return
    markReceiptReady()
    connectMutationObserver()
    prepare()
    void settleLayout().then(() => prepare())
    window.dispatchEvent(new CustomEvent('orimia:ui-runtime-ready', {
      detail:{ source:'admin-commercial-v516', receiptPrint:'v579' },
    }))
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, { once:true })
  else activate()
  window.setTimeout(activate, 0)
  window.setTimeout(activate, 250)
})()
