import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3117').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-daily-sales-v541')
fs.mkdirSync(artifactRoot, { recursive:true })

const browser = await chromium.launch({ executablePath, headless:true })
const context = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
await context.addInitScript(() => {
  window.print = () => {
    const root = document.documentElement
    root.dataset.nativeDailyPrintCalls = String(Number(root.dataset.nativeDailyPrintCalls || 0) + 1)
  }
})

const login = await context.request.post(`${baseUrl}/api/auth/login`, {
  form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/owner-analytics?salesLedger=1' },
})
assert.ok(login.ok(), `login failed with ${login.status()}`)

const page = await context.newPage()
const knownHydrationNoise = /Minified React error #(418|423)/
const errors = []
page.on('pageerror', error => {
  if (!knownHydrationNoise.test(error.message)) errors.push(`page:${error.message}`)
})
page.on('console', message => {
  if (message.type() === 'error' && !knownHydrationNoise.test(message.text())) errors.push(`console:${message.text()}`)
})

async function openAugust() {
  await page.goto(`${baseUrl}/admin/owner-analytics?salesLedger=1`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('.sl-page').waitFor({ state:'visible', timeout:15_000 })
  await page.waitForFunction(() => Boolean(window.__orimiaDailySalesPrintV541), null, { timeout:15_000 })
  await page.locator('[data-sl-month]').evaluate(input => {
    input.value = '2026-08'
    input.dispatchEvent(new Event('change', { bubbles:true }))
  })
  await page.waitForFunction(() => {
    const caption = document.querySelector('[data-sl-summary-period]')?.textContent || ''
    const button = document.querySelector('[data-sl-print]')
    return caption.includes('2026年8月') && document.querySelectorAll('[data-summary-date]').length > 0 && !button?.disabled
  }, null, { timeout:15_000 })
  const loader = page.locator('#orimia-ui-loader-v536')
  if (await loader.count()) await loader.waitFor({ state:'hidden', timeout:15_000 })
}

async function sourceMetrics() {
  return page.evaluate(() => {
    const table = document.querySelector('[data-sl-summary-table]')
    return {
      rows:table?.querySelectorAll('tbody tr').length || 0,
      columns:table?.querySelectorAll('thead th').length || 0,
      staffColumns:table?.querySelectorAll('thead .sl-staff-col').length || 0,
      firstRow:table?.querySelector('tbody tr')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      lastRow:table?.querySelector('tbody tr:last-child')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      caption:document.querySelector('[data-sl-summary-period]')?.textContent?.trim() || '',
    }
  })
}

async function prepareThroughButton() {
  const before = Number(await page.locator('html').getAttribute('data-native-daily-print-calls') || 0)
  await page.locator('[data-sl-print]').click()
  await page.waitForFunction(value => Number(document.documentElement.dataset.nativeDailyPrintCalls || 0) > value, before)
  await page.locator('#orimia-daily-sales-print-host-v541').waitFor({ state:'attached' })
  return page.evaluate(() => window.__orimiaDailySalesPrintV541.metrics())
}

async function printLayout() {
  return page.evaluate(() => {
    const host = document.getElementById('orimia-daily-sales-print-host-v541')
    const table = host?.querySelector('[data-sl-summary-table]')
    const wrap = host?.querySelector('.sl-summary-wrap')
    const rows = [...(table?.querySelectorAll('tbody tr') || [])]
    const cells = [...(table?.querySelectorAll('thead th,tbody td,tfoot th,tfoot td') || [])]
    const hostRect = host?.getBoundingClientRect()
    const tableRect = table?.getBoundingClientRect()
    const totalRect = table?.querySelector('tfoot tr')?.getBoundingClientRect()
    const lastRect = rows.at(-1)?.getBoundingClientRect()
    const visibleBodyChildren = [...document.body.children].filter(element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }).map(element => element.id || element.className || element.tagName)
    return {
      hostDisplay:host ? getComputedStyle(host).display : 'absent',
      sourceDisplay:getComputedStyle(document.querySelector('.sl-ledger-portal')).display,
      tableDisplay:table ? getComputedStyle(table).display : 'absent',
      tbodyDisplay:table ? getComputedStyle(table.tBodies[0]).display : 'absent',
      rowCount:rows.length,
      columnCount:table?.querySelectorAll('thead th').length || 0,
      staffCells:[...(table?.querySelectorAll('.sl-staff-col') || [])].map(cell => getComputedStyle(cell).display),
      allRowsVisible:rows.every(row => getComputedStyle(row).display === 'table-row' && row.getBoundingClientRect().height > 0),
      allCellsVisible:cells.every(cell => getComputedStyle(cell).display === 'table-cell'),
      tableWidth:tableRect?.width || 0,
      hostWidth:hostRect?.width || 0,
      wrapClientWidth:wrap?.clientWidth || 0,
      wrapScrollWidth:wrap?.scrollWidth || 0,
      wrapOverflow:wrap ? getComputedStyle(wrap).overflow : '',
      totalAfterLast:Boolean(totalRect && lastRect && totalRect.top >= lastRect.bottom - 1),
      printControlCount:host?.querySelectorAll('[data-sl-print],.sl-summary-head-actions').length || 0,
      firstRow:rows[0]?.textContent?.replace(/\s+/g, ' ').trim() || '',
      lastRow:rows.at(-1)?.textContent?.replace(/\s+/g, ' ').trim() || '',
      caption:host?.querySelector('[data-sl-summary-period]')?.textContent?.trim() || '',
      visibleBodyChildren,
    }
  })
}

function inspectPdf(pdfPath) {
  const source = fs.readFileSync(pdfPath).toString('latin1')
  const box = source.match(/\/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]/)
  assert.ok(box, 'PDF has no readable MediaBox')
  return {
    pages:(source.match(/\/Type\s*\/Page\b/g) || []).length,
    widthPt:Number(box[1]),
    heightPt:Number(box[2]),
  }
}

async function assertCompletePrint(label, source, expectedRows = source.rows, expectedColumns = source.columns) {
  await page.emulateMedia({ media:'print' })
  const layout = await printLayout()
  assert.equal(layout.hostDisplay, 'block')
  assert.equal(layout.sourceDisplay, 'none')
  assert.equal(layout.tableDisplay, 'table')
  assert.equal(layout.tbodyDisplay, 'table-row-group')
  assert.equal(layout.rowCount, expectedRows)
  assert.equal(layout.columnCount, expectedColumns)
  assert.equal(layout.allRowsVisible, true, `${label}: one or more daily rows are hidden`)
  assert.equal(layout.allCellsVisible, true, `${label}: one or more columns are hidden`)
  assert.ok(layout.staffCells.length > 0 && layout.staffCells.every(value => value === 'table-cell'), `${label}: staff columns are hidden`)
  assert.ok(layout.tableWidth <= layout.hostWidth + 1, `${label}: table exceeds paper by ${layout.tableWidth - layout.hostWidth}px`)
  assert.ok(layout.wrapScrollWidth <= layout.wrapClientWidth + 1, `${label}: print table still scrolls horizontally`)
  assert.equal(layout.wrapOverflow, 'visible')
  assert.equal(layout.totalAfterLast, true)
  assert.equal(layout.printControlCount, 0)
  assert.deepEqual(layout.visibleBodyChildren, ['orimia-daily-sales-print-host-v541'])
  if (expectedRows === source.rows) {
    assert.equal(layout.firstRow, source.firstRow)
    assert.equal(layout.lastRow, source.lastRow)
  }

  await page.screenshot({ path:path.join(artifactRoot, `daily-sales-v541-${label}-print.png`), fullPage:true })
  const pdfPath = path.join(artifactRoot, `daily-sales-v541-${label}.pdf`)
  await page.pdf({ path:pdfPath, printBackground:true, preferCSSPageSize:true })
  const pdf = inspectPdf(pdfPath)
  assert.ok(pdf.pages >= 1 && pdf.pages <= 2, `${label}: unexpected page count ${pdf.pages}`)
  assert.ok(pdf.widthPt > pdf.heightPt, `${label}: PDF is not landscape`)
  assert.ok(Math.abs(pdf.widthPt - 841.92) < 2, `${label}: PDF is not A4 width`)
  assert.ok(Math.abs(pdf.heightPt - 595.92) < 2, `${label}: PDF is not A4 height`)
  return { layout, pdf }
}

await openAugust()
const allSource = await sourceMetrics()
assert.ok(allSource.rows > 0)
assert.ok(allSource.columns >= 16)
assert.ok(allSource.staffColumns > 0)
const allMetrics = await prepareThroughButton()
assert.equal(allMetrics.rowCount, allSource.rows)
assert.equal(allMetrics.columnCount, allSource.columns)
const allPrint = await assertCompletePrint('all-staff', allSource)

await page.emulateMedia({ media:'screen' })
await page.evaluate(() => {
  window.__orimiaDailySalesPrintV541.cleanup()
  const table = document.querySelector('[data-sl-summary-table]')
  const body = table.tBodies[0]
  const originalRows = [...body.rows]
  while (body.rows.length < 31) {
    const template = originalRows[body.rows.length % originalRows.length]
    const row = template.cloneNode(true)
    row.dataset.summaryDate = `2026-08-${String(body.rows.length + 1).padStart(2, '0')}`
    body.appendChild(row)
  }
  const headRow = table.tHead.rows[0]
  const footRow = table.tFoot.rows[0]
  for (let index = 1; index <= 6; index += 1) {
    const th = document.createElement('th')
    th.className = 'sl-staff-col sl-th-staff'
    th.textContent = `追加担当${index}`
    headRow.appendChild(th)
    for (const row of body.rows) {
      const td = document.createElement('td')
      td.className = 'sl-staff-col sl-summary-number'
      td.textContent = (index * 1100).toLocaleString('ja-JP')
      row.appendChild(td)
    }
    const total = document.createElement('td')
    total.className = 'sl-staff-col sl-summary-number'
    total.textContent = (index * 34100).toLocaleString('ja-JP')
    footRow.appendChild(total)
  }
  window.__orimiaDailySalesPrintV541.prepare()
})
const extendedSource = await sourceMetrics()
const extendedPrint = await assertCompletePrint('31-days-wide', extendedSource, 31, allSource.columns + 6)

await page.emulateMedia({ media:'screen' })
await openAugust()
const staff = (await page.locator('[data-sl-summary-table] thead .sl-staff-col').first().textContent())?.trim()
assert.ok(staff)
await page.locator('[data-sl-summary-staff]').selectOption(staff)
await page.waitForFunction(name => {
  const selected = document.querySelector('[data-sl-summary-staff]')?.value || ''
  const button = document.querySelector('[data-sl-print]')
  return selected === name && document.querySelectorAll('[data-summary-date]').length > 0 && !button?.disabled
}, staff, { timeout:15_000 })
await page.waitForTimeout(800)
const filteredSource = await sourceMetrics()
assert.ok(filteredSource.caption.includes(staff), `staff caption was not updated: ${JSON.stringify({ staff, filteredSource })}`)
const filteredMetrics = await prepareThroughButton()
assert.equal(filteredMetrics.rowCount, filteredSource.rows)
const filteredPrint = await assertCompletePrint('staff-filtered', filteredSource)

assert.equal(errors.length, 0, errors.join('\n'))
await context.close()
await browser.close()

console.log(JSON.stringify({
  release:'daily-sales-complete-print-v541',
  allSource,
  allMetrics,
  allPrint,
  extended:{ rows:31, columns:allSource.columns + 6, ...extendedPrint },
  filteredStaff:staff,
  filteredSource,
  filteredPrint,
  artifacts:artifactRoot,
}))
