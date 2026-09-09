import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const assets = process.env.PRINT_ASSET_ROOT || path.dirname(fileURLToPath(import.meta.url))
const output = process.env.SCREENSHOT_DIR || 'artifacts/daily-sales-print-v590/preflight'
fs.mkdirSync(output, { recursive:true })
const server = http.createServer((req, res) => {
  if (/^\/daily-sales-print-v590\.(js|css)$/.test(req.url)) {
    res.setHeader('Content-Type', req.url.endsWith('.js') ? 'application/javascript' : 'text/css')
    res.end(fs.readFileSync(path.join(assets, req.url.slice(1))))
  } else {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end('<!doctype html><html><head><link rel="stylesheet" href="/daily-sales-print-v590.css"><script src="/daily-sales-print-v590.js" defer></script></head><body><div id="app"><main></main></div></body></html>')
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true })
try {
  const page = await browser.newPage({ viewport:{ width:1200, height:900 } })
  await page.goto(`http://127.0.0.1:${server.address().port}/admin/appointments`)
  assert.equal(await page.evaluate(() => window.__orimiaDailySalesPrintV590?.version), 'v590')
  await page.evaluate(() => {
    const source = document.createElement('section')
    source.className = 'sl-ledger-portal'
    source.innerHTML = `<style>@media print { body>*:not(.sl-ledger-portal){display:none!important} }</style>
      <section class="sl-daily-card"><div class="sl-section-title"><h2>Daily sales</h2></div>
      <p data-sl-summary-period>September 2026 / All staff</p>
      ${['Sales', 'Services', 'Products', 'Payments'].map(label => `<div class="sl-kpi"><span>${label}</span><strong>100</strong></div>`).join('')}
      <table data-sl-summary-table><thead><tr>${Array.from({length:26}, (_, i) => `<th>COL-${i}</th>`).join('')}</tr></thead>
      <tbody>${Array.from({length:31}, (_, day) => `<tr>${Array.from({length:26}, (_, i) => `<td>${i === 0 ? day + 1 : '123,456'}</td>`).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr>${Array.from({length:26}, () => '<td>999,999</td>').join('')}</tr></tfoot></table></section>`
    document.querySelector('main').append(source)
    history.pushState({}, '', '/admin/owner-analytics?salesLedger=1')
  })
  const pdf = await page.pdf({ path:path.join(output, 'preflight.pdf'), preferCSSPageSize:true, printBackground:true })
  assert.ok(pdf.length > 10000)
  const box = pdf.toString('latin1').match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/)
  assert.ok(box && Math.abs(Number(box[1]) - 842) < 2 && Math.abs(Number(box[2]) - 595) < 2)
  assert.deepEqual(await page.evaluate(() => window.__orimiaDailySalesPrintV590.metrics()), { columnCount:26, rowCount:31, fontSizePt:4.2, cellPaddingMm:0.28, rowPaddingMm:0.55 })
  assert.equal(await page.locator('#orimia-daily-sales-print-host-v590').count(), 0)
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
  await page.emulateMedia({ media:'print' })
  const host = page.locator('#orimia-daily-sales-print-host-v590')
  assert.ok((await host.boundingBox())?.height > 300)
  assert.equal(await host.locator('tbody tr').count(), 31)
  assert.equal(await host.locator('thead th').count(), 26)
  await page.screenshot({ path:path.join(output, 'preflight.png'), fullPage:true })
  await page.evaluate(() => {
    history.pushState({}, '', '/admin/appointments')
    document.body.append(document.createElement('div'))
  })
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-orimia-daily-sales-print-v590'))
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
  assert.equal(await host.count(), 0)
  console.log(JSON.stringify({ release:'v590', preflight:true, navigation:true, nativePrintLifecycle:true, routeIsolation:true, columns:26, rows:31 }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
