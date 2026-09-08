;(() => {
  'use strict'

  if (window.__orimiaReceiptPosDirectV582) return

  const ROOT_ATTRIBUTE = 'data-orimia-receipt-physical-roll-v579'
  const MEASURING_ATTRIBUTE = 'data-orimia-receipt-roll-measuring-v579'
  const READY_ATTRIBUTE = 'data-orimia-receipt-roll-ready-v579'
  const PRINTING_ATTRIBUTE = 'data-orimia-receipt-roll-printing-v579'
  const COPY_ATTRIBUTE = 'data-orimia-receipt-roll-copy-v579'
  const HOST_ID = 'orimia-receipt-roll-host-v579'
  const PAGE_STYLE_ID = 'orimia-receipt-roll-page-v579'
  const HEIGHT_PROPERTY = '--orimia-receipt-roll-height-v579'
  const RECEIPT_SELECTOR = '[data-receipt-print-root],article[class*="receipt_receipt__"]'
  const BRIDGE_URL = 'http://127.0.0.1:17615'
  const PAPER_WIDTH_MM = 80
  const PRINTABLE_WIDTH_MM = 72
  const DOTS_PER_MM = 8
  const FEED_SAFETY_DOTS = 8
  const MM_PER_CSS_PX = 25.4 / 96
  const nativePrint = window.print.bind(window)

  let lastMetrics = null
  let bridgeStatus = null
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
      let host = document.getElementById(HOST_ID)
      if (!host) {
        host = document.createElement('div')
        host.id = HOST_ID
        host.setAttribute('aria-hidden', 'true')
        document.body.appendChild(host)
      }

      const copy = source.cloneNode(true)
      copy.removeAttribute('id')
      copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'))
      copy.setAttribute(COPY_ATTRIBUTE, '1')
      host.replaceChildren(copy)

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
        bridgeConnected:Boolean(bridgeStatus?.available),
      })
      return lastMetrics
    } finally {
      connectMutationObserver()
    }
  }

  function schedulePrepare(delay = 0) {
    if (printPending || document.documentElement.hasAttribute(PRINTING_ATTRIBUTE)) return
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

  function normalizedText(element) {
    return String(element?.innerText || element?.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim()
  }

  function textLines(element) {
    return normalizedText(element).split('\n').map(line => line.trim()).filter(Boolean)
  }

  function pairFromRow(row) {
    const cells = Array.from(row?.children || []).filter(element => element.matches('span, strong'))
    if (cells.length < 2) return null
    const labelCopy = cells[0].cloneNode(true)
    const detail = normalizedText(labelCopy.querySelector('small'))
    labelCopy.querySelectorAll('small').forEach(element => element.remove())
    return {
      label:normalizedText(labelCopy),
      value:normalizedText(cells[cells.length - 1]),
      detail,
    }
  }

  function collectReceipt() {
    const receipt = sourceReceipt()
    if (!receipt) throw new Error('receipt is not available')

    const brand = Array.from(receipt.querySelectorAll(':scope > header p')).map(normalizedText).filter(Boolean)
    const title = normalizedText(receipt.querySelector(':scope > h1')) || '領収書'
    const purchaseSection = receipt.querySelector('section[aria-label="購入明細"]')
    const summarySection = receipt.querySelector('section[aria-label="会計合計"]')
    const metaContainer = receipt.querySelector(':scope > div')
    const meta = Array.from(metaContainer?.querySelectorAll(':scope > p') || []).map(pairFromRow).filter(Boolean)
    const items = Array.from(purchaseSection?.querySelectorAll(':scope > p') || []).map(pairFromRow).filter(Boolean)
    const summary = []
    let tax = ''
    let payment = null

    Array.from(summarySection?.querySelectorAll(':scope > p') || []).forEach(row => {
      const pair = pairFromRow(row)
      if (!pair) {
        tax = normalizedText(row)
        return
      }
      if (pair.label === 'お支払い') {
        payment = pair
        return
      }
      summary.push({
        ...pair,
        emphasis:Boolean(row.querySelector('strong')) || pair.label === '合計',
      })
    })

    return {
      version:1,
      receipt:{
        brand,
        title,
        meta,
        items,
        summary,
        tax,
        payment,
        message:textLines(summarySection?.nextElementSibling),
        store:textLines(receipt.querySelector(':scope > footer')),
      },
    }
  }

  function printButton() {
    return Array.from(document.querySelectorAll('button')).find(button => /印刷/.test(button.textContent || '')) || null
  }

  function setButtonLabel(label, state = '') {
    const button = printButton()
    if (!button) return
    const textNode = Array.from(button.childNodes).find(node => node.nodeType === Node.TEXT_NODE)
    if (textNode) textNode.nodeValue = ` ${label}`
    else button.append(document.createTextNode(` ${label}`))
    if (state) button.dataset.posPrintState = state
    else delete button.dataset.posPrintState
  }

  async function fetchBridge(pathname, options = {}, timeoutMs = 900) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(`${BRIDGE_URL}${pathname}`, {
        mode:'cors',
        cache:'no-store',
        credentials:'omit',
        ...options,
        signal:controller.signal,
      })
      if (!response.ok) throw new Error(`bridge returned ${response.status}`)
      return await response.json()
    } finally {
      window.clearTimeout(timeout)
    }
  }

  async function checkBridge() {
    if (!isReceiptRoute()) return null
    try {
      const status = await fetchBridge('/status', {}, 700)
      bridgeStatus = status?.available ? status : null
      if (bridgeStatus) setButtonLabel(`${bridgeStatus.printerName || 'POSプリンター'}で印刷`, 'ready')
      return bridgeStatus
    } catch {
      bridgeStatus = null
      return null
    }
  }

  async function printThroughBridge() {
    try {
      const payload = collectReceipt()
      const result = await fetchBridge('/print', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify(payload),
      }, 12_000)
      if (!result?.printed) return false
      bridgeStatus = { available:true, printerName:result.printerName || bridgeStatus?.printerName || 'POSプリンター' }
      setButtonLabel('印刷しました', 'success')
      window.setTimeout(() => {
        if (isReceiptRoute()) setButtonLabel(`${bridgeStatus.printerName}で印刷`, 'ready')
      }, 1800)
      window.dispatchEvent(new CustomEvent('orimia:receipt-direct-printed', { detail:result }))
      return true
    } catch {
      bridgeStatus = null
      return false
    }
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
      prepare()
      if ((bridgeStatus || await checkBridge()) && await printThroughBridge()) return

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

  const api = Object.freeze({
    version:'v582',
    prepare,
    schedulePrepare,
    print:printReceipt,
    cleanup,
    metrics:() => lastMetrics,
    bridge:() => bridgeStatus,
    collectReceipt,
    checkBridge,
  })
  window.__orimiaReceiptPosDirectV582 = api
  window.__orimiaReceiptPhysicalRollV579 = api
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
        void checkBridge()
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
    void checkBridge()
    window.dispatchEvent(new CustomEvent('orimia:ui-runtime-ready', {
      detail:{ source:'admin-commercial-v516', receiptPrint:'v582' },
    }))
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, { once:true })
  else activate()
  window.setTimeout(activate, 0)
  window.setTimeout(activate, 250)
})()
