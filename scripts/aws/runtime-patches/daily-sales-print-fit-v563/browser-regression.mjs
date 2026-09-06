import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3126').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-daily-sales-print-v563')
fs.mkdirSync(artifactRoot, { recursive:true })

const browser = await chromium.launch({ executablePath, headless:true })
const context = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
await context.addInitScript(() => {
  window.print = () => {
    document.documentElement.dataset.nativeDailyPrintCalls = String(Number(document.documentElement.dataset.nativeDailyPrintCalls || 0) + 1)
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

await page.goto(`${baseUrl}/admin/owner-analytics?salesLedger=1`, { waitUntil:'domcontentloaded', timeout:30_000 })
await page.locator('.sl-page').waitFor({ state:'visible', timeout:15_000 })
await page.waitForFunction(() => window.__orimiaDailySalesPrintV563?.version === 'v563', null, { timeout:15_000 })
await page.locator('[data-sl-month]').evaluate(input => {
  input.value = '2026-08'
  input.dispatchEvent(new Event('change', { bubbles:true }))
})
await page.waitForFunction(() => {
  const button = document.querySelector('[data-sl-print]')
  return document.querySelectorAll('[data-sl-summary-table] tbody tr').length > 0 && !button?.disabled
}, null, { timeout:15_000 })
const loader = page.locator('#orimia-ui-loader-v536')
if (await loader.count()) await loader.waitFor({ state:'hidden', timeout:15_000 })

const source = await page.evaluate(() => {
  const table = document.querySelector('[data-sl-summary-table]')
  return {
    rows:table.tBodies[0].rows.length,
    columns:table.tHead.rows[0].cells.length,
    headers:[...table.tHead.rows[0].cells].map(cell => cell.textContent.replace(/\s+/g, ' ').trim()),
    firstRow:[...table.tBodies[0].rows[0].cells].map(cell => cell.textContent.replace(/\s+/g, ' ').trim()),
    total:[...table.tFoot.rows[0].cells].map(cell => cell.textContent.replace(/\s+/g, ' ').trim()),
    sourceMinWidth:getComputedStyle(table).minWidth,
    sourceScrollWidth:table.closest('.sl-summary-wrap').scrollWidth,
    sourceClientWidth:table.closest('.sl-summary-wrap').clientWidth,
  }
})
assert.ok(source.rows > 0)
assert.ok(source.columns >= 19)
assert.ok(source.sourceScrollWidth > source.sourceClientWidth, 'screen fixture must exercise the horizontal table')

const beforePrintCalls = Number(await page.locator('html').getAttribute('data-native-daily-print-calls') || 0)
await page.locator('[data-sl-print]').click()
await page.waitForFunction(before => Number(document.documentElement.dataset.nativeDailyPrintCalls || 0) > before, beforePrintCalls)
await page.locator('#orimia-daily-sales-print-host-v563').waitFor({ state:'attached' })

await page.setViewportSize({ width:1085, height:756 })
await page.emulateMedia({ media:'print' })

async function printLayout() {
  return page.evaluate(() => {
    const host = document.getElementById('orimia-daily-sales-print-host-v563')
    const report = host?.querySelector('.orimia-dsp563-report')
    const table = host?.querySelector('[data-orimia-dsp563-table]')
    const hostRect = host?.getBoundingClientRect()
    const reportRect = report?.getBoundingClientRect()
    const tableRect = table?.getBoundingClientRect()
    const headerCells = [...(table?.tHead?.rows[0]?.cells || [])]
    const allRows = [...(table?.rows || [])]
    const allCells = allRows.flatMap(row => [...row.cells])
    const cellRects = allCells.map(cell => cell.getBoundingClientRect())
    const visibleBodyChildren = [...document.body.children].filter(element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }).map(element => element.id || element.tagName)
    return {
      innerWidth,
      documentClientWidth:document.documentElement.clientWidth,
      documentScrollWidth:document.documentElement.scrollWidth,
      bodyClientWidth:document.body.clientWidth,
      bodyScrollWidth:document.body.scrollWidth,
      backgrounds:{
        html:getComputedStyle(document.documentElement).backgroundColor,
        body:getComputedStyle(document.body).backgroundColor,
        host:host ? getComputedStyle(host).backgroundColor : '',
        report:report ? getComputedStyle(report).backgroundColor : '',
        htmlBefore:getComputedStyle(document.documentElement, '::before').backgroundColor,
        bodyBefore:getComputedStyle(document.body, '::before').backgroundColor,
      },
      heights:{
        body:document.body.getBoundingClientRect().height,
        host:hostRect?.height || 0,
        report:reportRect?.height || 0,
        table:tableRect?.height || 0,
      },
      hostDisplay:host ? getComputedStyle(host).display : 'absent',
      hostWidth:hostRect?.width || 0,
      hostScrollWidth:host?.scrollWidth || 0,
      hostClientWidth:host?.clientWidth || 0,
      reportWidth:reportRect?.width || 0,
      reportScrollWidth:report?.scrollWidth || 0,
      reportClientWidth:report?.clientWidth || 0,
      tableWidth:tableRect?.width || 0,
      tableScrollWidth:table?.scrollWidth || 0,
      tableClientWidth:table?.clientWidth || 0,
      columnCount:headerCells.length,
      rowCount:table?.tBodies[0]?.rows.length || 0,
      headers:headerCells.map(cell => cell.textContent.replace(/\s+/g, ' ').trim()),
      firstRow:[...(table?.tBodies[0]?.rows[0]?.cells || [])].map(cell => cell.textContent.replace(/\s+/g, ' ').trim()),
      total:[...(table?.tFoot?.rows[0]?.cells || [])].map(cell => cell.textContent.replace(/\s+/g, ' ').trim()),
      leftmostCell:Math.min(...cellRects.map(rect => rect.left)),
      rightmostCell:Math.max(...cellRects.map(rect => rect.right)),
      hostLeft:hostRect?.left || 0,
      hostRight:hostRect?.right || 0,
      lastHeaderRight:headerCells.at(-1)?.getBoundingClientRect().right || 0,
      lastHeaderText:headerCells.at(-1)?.textContent.replace(/\s+/g, ' ').trim() || '',
      everyRowComplete:allRows.every(row => row.cells.length === headerCells.length),
      oldHostCount:document.querySelectorAll('#orimia-daily-sales-print-host-v541').length,
      scrollWrapperCount:host?.querySelectorAll('.sl-summary-wrap').length || 0,
      visibleBodyChildren,
    }
  })
}

function assertFits(label, layout, expectedColumns, expectedRows) {
  assert.equal(layout.hostDisplay, 'block')
  assert.equal(layout.columnCount, expectedColumns)
  assert.equal(layout.rowCount, expectedRows)
  assert.equal(layout.everyRowComplete, true)
  assert.equal(layout.oldHostCount, 0)
  assert.equal(layout.scrollWrapperCount, 0)
  assert.deepEqual(layout.visibleBodyChildren, ['orimia-daily-sales-print-host-v563'])
  assert.equal(layout.backgrounds.html, 'rgb(255, 255, 255)')
  assert.equal(layout.backgrounds.body, 'rgb(255, 255, 255)')
  assert.ok(layout.hostWidth <= 1085.5, `${label}: host exceeds A4 content width (${layout.hostWidth}px)`)
  assert.ok(layout.reportWidth <= layout.hostWidth + 0.5, `${label}: report exceeds host`)
  assert.ok(layout.tableWidth <= layout.hostWidth + 0.5, `${label}: table exceeds host`)
  assert.ok(layout.hostScrollWidth <= layout.hostClientWidth + 1, `${label}: host scrolls horizontally`)
  assert.ok(layout.reportScrollWidth <= layout.reportClientWidth + 1, `${label}: report scrolls horizontally`)
  assert.ok(layout.tableScrollWidth <= layout.tableClientWidth + 1, `${label}: table scrolls horizontally`)
  assert.ok(layout.leftmostCell >= layout.hostLeft - 0.5, `${label}: left edge is clipped`)
  assert.ok(layout.rightmostCell <= layout.hostRight + 0.5, `${label}: right edge is clipped`)
  assert.ok(layout.lastHeaderRight <= layout.hostRight + 0.5, `${label}: rightmost header is clipped`)
  assert.ok(layout.lastHeaderText.length > 0)
}

const allLayout = await printLayout()
assertFits('all staff', allLayout, source.columns, source.rows)
assert.deepEqual(allLayout.headers, source.headers)
assert.deepEqual(allLayout.firstRow.map(value => value.replace(/\s/g, '')), source.firstRow.map(value => value.replace(/\s/g, '')))
assert.deepEqual(allLayout.total, source.total)
await page.screenshot({ path:path.join(artifactRoot, 'daily-sales-print-v563-all-staff.png'), fullPage:true })

const pdfPath = path.join(artifactRoot, 'daily-sales-print-v563-all-staff.pdf')
await page.pdf({ path:pdfPath, printBackground:true, preferCSSPageSize:true })
const pdfSource = fs.readFileSync(pdfPath).toString('latin1')
const mediaBox = pdfSource.match(/\/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]/)
assert.ok(mediaBox)
assert.ok(Math.abs(Number(mediaBox[1]) - 841.92) < 2)
assert.ok(Math.abs(Number(mediaBox[2]) - 595.92) < 2)
assert.ok((pdfSource.match(/\/Type\s*\/Page\b/g) || []).length >= 1)

await page.emulateMedia({ media:'screen' })
await page.setViewportSize({ width:1440, height:1000 })
await page.evaluate(() => {
  window.__orimiaDailySalesPrintV563.cleanup()
  const table = document.querySelector('[data-sl-summary-table]')
  const headRow = table.tHead.rows[0]
  const footRow = table.tFoot.rows[0]
  for (let index = 1; index <= 8; index += 1) {
    const th = document.createElement('th')
    th.className = 'sl-staff-col'
    th.textContent = `EXTRA-${index}`
    headRow.appendChild(th)
    for (const row of table.tBodies[0].rows) {
      const td = document.createElement('td')
      td.className = 'sl-staff-col'
      td.textContent = String(index * 1000)
      row.appendChild(td)
    }
    const td = document.createElement('td')
    td.className = 'sl-staff-col'
    td.textContent = String(index * 10000)
    footRow.appendChild(td)
  }
  window.__orimiaDailySalesPrintV563.prepare()
})
await page.setViewportSize({ width:1085, height:756 })
await page.emulateMedia({ media:'print' })
const wideLayout = await printLayout()
assertFits('wide staff', wideLayout, source.columns + 8, source.rows)
assert.equal(wideLayout.lastHeaderText, 'EXTRA-8')
await page.screenshot({ path:path.join(artifactRoot, 'daily-sales-print-v563-wide.png'), fullPage:true })

assert.equal(errors.length, 0, errors.join('\n'))
await context.close()
await browser.close()

console.log(JSON.stringify({
  release:'daily-sales-print-fit-v563',
  source,
  allLayout,
  wideLayout,
  pdf:pdfPath,
  artifacts:artifactRoot,
}))
