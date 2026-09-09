;(() => {
  'use strict'

  if (window.__orimiaDailySalesPrintV590) return

  const VERSION = 'v590'
  const HOST_ID = 'orimia-daily-sales-print-host-v590'
  const ROOT_ATTRIBUTE = 'data-orimia-daily-sales-print-v590'
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

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim()
  }

  function cellText(cell) {
    const dateButton = cell.querySelector('[data-summary-day]')
    if (!dateButton) return cleanText(cell.textContent)
    return cleanText([
      dateButton.querySelector('strong')?.textContent,
      dateButton.querySelector('span')?.textContent,
    ].filter(Boolean).join(' '))
  }

  function cellClass(cell) {
    const classes = ['orimia-dsp590-cell']
    if (cell.classList.contains('sl-summary-gross')) classes.push('orimia-dsp590-cell--accent')
    if (cell.classList.contains('sl-negative')) classes.push('orimia-dsp590-cell--negative')
    if (cell.classList.contains('sl-staff-col')) classes.push('orimia-dsp590-cell--staff')
    if (cell.classList.contains('sl-summary-date')) classes.push('orimia-dsp590-cell--date')
    if (cell.classList.contains('sl-summary-count')) classes.push('orimia-dsp590-cell--count')
    return classes.join(' ')
  }

  function copySection(sourceSection, tagName) {
    if (!sourceSection) return null
    const section = document.createElement(tagName)
    for (const sourceRow of sourceSection.rows) {
      const row = document.createElement('tr')
      for (const sourceCell of sourceRow.cells) {
        const cell = document.createElement(sourceCell.tagName.toLowerCase())
        cell.className = cellClass(sourceCell)
        cell.textContent = cellText(sourceCell)
        if (sourceCell.colSpan > 1) cell.colSpan = sourceCell.colSpan
        if (sourceCell.rowSpan > 1) cell.rowSpan = sourceCell.rowSpan
        row.appendChild(cell)
      }
      section.appendChild(row)
    }
    return section
  }

  function buildTable(sourceTable, columnCount) {
    const table = document.createElement('table')
    table.className = 'orimia-dsp590-table'
    table.setAttribute('data-orimia-dsp590-table', '')

    const dateWidth = columnCount > 23 ? 6 : 7.2
    const countWidth = columnCount > 23 ? 3.8 : 4.8
    const remainingWidth = Math.max(0, 100 - dateWidth - countWidth)
    const flexibleColumns = Math.max(1, columnCount - 2)
    const colgroup = document.createElement('colgroup')
    for (let index = 0; index < columnCount; index += 1) {
      const col = document.createElement('col')
      const width = index === 0 ? dateWidth : index === 1 ? countWidth : remainingWidth / flexibleColumns
      col.style.width = `${width}%`
      colgroup.appendChild(col)
    }
    table.appendChild(colgroup)

    const head = copySection(sourceTable.tHead, 'thead')
    if (head) table.appendChild(head)
    for (const sourceBody of sourceTable.tBodies) {
      const body = copySection(sourceBody, 'tbody')
      if (body) table.appendChild(body)
    }
    const foot = copySection(sourceTable.tFoot, 'tfoot')
    if (foot) table.appendChild(foot)
    return table
  }

  function buildHeader(source) {
    const header = document.createElement('header')
    header.className = 'orimia-dsp590-header'
    const mark = document.createElement('span')
    mark.className = 'orimia-dsp590-title-mark'
    mark.setAttribute('aria-hidden', 'true')
    mark.append(document.createElement('i'), document.createElement('i'), document.createElement('i'))
    const copy = document.createElement('div')
    const title = document.createElement('h1')
    title.textContent = cleanText(source.querySelector('.sl-section-title h2')?.textContent)
    const status = document.createElement('p')
    status.textContent = cleanText(source.querySelector('[data-sl-summary-period]')?.textContent)
    copy.append(title, status)
    header.append(mark, copy)
    return header
  }

  function buildKpis(source) {
    const strip = document.createElement('section')
    strip.className = 'orimia-dsp590-kpis'
    for (const sourceKpi of source.querySelectorAll('.sl-kpi')) {
      const kpi = document.createElement('div')
      const label = document.createElement('span')
      const value = document.createElement('strong')
      label.textContent = cleanText(sourceKpi.querySelector('span')?.textContent)
      value.textContent = cleanText(sourceKpi.querySelector('strong')?.textContent)
      kpi.append(label, value)
      strip.appendChild(kpi)
    }
    return strip
  }

  function cleanup() {
    document.getElementById(HOST_ID)?.remove()
    document.getElementById('orimia-daily-sales-print-host-v541')?.remove()
    document.documentElement.removeAttribute(ROOT_ATTRIBUTE)
  }

  function prepare() {
    cleanup()
    const source = sourceCard()
    const sourceTable = source?.querySelector('[data-sl-summary-table]')
    if (!source || !sourceTable) return null

    const columnCount = sourceTable.querySelectorAll('thead th').length
    const rowCount = sourceTable.querySelectorAll('tbody tr').length
    if (!columnCount) return null

    const fontSizePt = columnCount <= 19 ? 5.4 : columnCount <= 23 ? 4.8 : columnCount <= 28 ? 4.2 : 3.8
    const cellPaddingMm = columnCount <= 19 ? 0.55 : columnCount <= 23 ? 0.4 : 0.28
    const rowPaddingMm = rowCount <= 16 ? 1.25 : rowCount <= 24 ? 0.9 : 0.55

    const host = document.createElement('section')
    host.id = HOST_ID
    host.setAttribute('aria-label', 'Daily sales print report')
    host.style.setProperty('--orimia-dsp590-font', `${fontSizePt}pt`)
    host.style.setProperty('--orimia-dsp590-cell-x', `${cellPaddingMm}mm`)
    host.style.setProperty('--orimia-dsp590-cell-y', `${rowPaddingMm}mm`)
    host.dataset.columns = String(columnCount)
    host.dataset.rows = String(rowCount)

    const report = document.createElement('article')
    report.className = 'orimia-dsp590-report'
    report.append(buildHeader(source), buildKpis(source), buildTable(sourceTable, columnCount))
    host.appendChild(report)
    document.body.appendChild(host)
    document.documentElement.setAttribute(ROOT_ATTRIBUTE, '1')

    lastMetrics = Object.freeze({ columnCount, rowCount, fontSizePt, cellPaddingMm, rowPaddingMm })
    return lastMetrics
  }

  function print() {
    if (!prepare()) {
      nativePrint()
      return
    }
    nativePrint()
  }

  const api = Object.freeze({ version:VERSION, prepare, cleanup, print, metrics:() => lastMetrics })
  window.__orimiaDailySalesPrintV590 = api

  window.addEventListener('beforeprint', () => {
    if (sourceCard()) prepare()
  })
  window.addEventListener('afterprint', cleanup)
  window.addEventListener('popstate', cleanup)
  const observer = new MutationObserver(() => {
    if (!isSalesLedgerRoute() && document.documentElement.hasAttribute(ROOT_ATTRIBUTE)) cleanup()
  })
  const observe = () => observer.observe(document.body, { childList:true, subtree:true })
  if (document.body) observe()
  else document.addEventListener('DOMContentLoaded', observe, { once:true })
})()
