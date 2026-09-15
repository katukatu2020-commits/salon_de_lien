import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const { createBusinessAccountApprovalService } = createRequire(import.meta.url)(path.join(runtimeRoot, 'business-account-approvals-v643.js'))
const crypto = createRequire(import.meta.url)('node:crypto')
const output = process.env.SCREENSHOT_DIR || 'artifacts/business-application-rejection-v648/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const pending = {
  id: 'inq-pending', audience: 'salon', organizationName: 'Salon de Lien 表参道', contactName: '山田 花子',
  email: 'owner@example.jp', phone: '090-0000-0000', preferredContact: 'email', message: '新規利用を希望します。',
  status: 'new', operatorNote: null, createdAt: new Date('2026-09-15T01:00:00Z'), accessId: null,
  rejectionReason: null,
}
const rejected = {
  id: 'inq-rejected', audience: 'dealer', organizationName: '検証ディーラー', contactName: '佐藤 太郎',
  email: 'dealer@example.jp', phone: null, preferredContact: 'email', message: 'ディーラー利用を希望します。',
  status: 'closed', operatorNote: '却下理由: 必要な取引情報を確認できませんでした。', createdAt: new Date('2026-09-14T01:00:00Z'), accessId: null,
  rejectionReason: '必要な取引情報を確認できませんでした。\n不足項目をご確認ください。', rejectionEmail: 'dealer@example.jp',
  rejectionMailStatus: 'FAILED', rejectionMailError: 'transport error', rejectedAt: new Date('2026-09-15T02:00:00Z'), rejectedBy: 'operations@example.jp',
}

const prisma = {
  async $executeRawUnsafe() { return 1 },
  async $queryRawUnsafe(query) {
    const sql = String(query)
    if (sql.includes('COUNT(*)::int AS "count" FROM "BusinessInquiry"')) return [{ count: 2 }]
    if (sql.includes('SELECT i.*,m."id" AS "accessId"')) return [pending, rejected]
    if (sql.includes('COUNT(*)::int AS "total"') && sql.includes('FROM "BusinessInquiry"')) return [{ total: 2, newCount: 1, inProgressCount: 0, closedCount: 1 }]
    if (sql.includes('FROM "Organization" o') || sql.includes('FROM "WholesaleDealer" d')) return []
    return []
  },
}

const commonStyle = '<style>:root{--ink:#28211d;--muted:#756a62;--line:#e9ddd4;--paper:#fffdf9;--canvas:#f6f0e9;--brand:#8f4f42;--green:#2f6b50;--greenBg:#e8f4ec;--red:#a33c3c;--redBg:#fdebea}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font-family:system-ui,sans-serif}.main{width:min(1180px,calc(100% - 24px));margin:auto;padding:24px 0 60px}.hero,.card{border:1px solid var(--line);border-radius:16px;background:var(--paper);padding:22px}.hero{display:flex;justify-content:space-between;gap:20px}.hero h1{margin:6px 0;font-family:serif}.eyebrow{color:var(--brand);font-size:11px;font-weight:800}.updated{color:var(--muted)}.field{display:grid;gap:6px}.field input{min-height:48px;border:1px solid var(--line);border-radius:10px;padding:0 12px}.empty{padding:20px;text-align:center}@media(max-width:560px){.hero{display:grid}.main{padding-top:12px}}</style>'
const renderPlatformPage = (title, body) => '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title>' + commonStyle + '</head><body>' + body + '</body></html>'

const service = createBusinessAccountApprovalService({
  prisma,
  crypto,
  operatorSession: () => ({ subject: 'operations@example.jp' }),
  adminSessionProvider: async () => null,
  dealerSessionProvider: async () => null,
  renderPlatformPage,
  baseDashboardProvider: async () => ({}),
  renderBaseDashboard: () => renderPlatformPage('運営', '<main></main>'),
  mailSender: async () => 'mail-demo',
})

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    if (await service.handle(req, res, url)) return
    res.writeHead(404); res.end('not found')
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain' }); res.end(String(error.stack || error))
  }
})
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ executablePath, headless: true })

try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    await page.goto(base + '/platform/inquiries', { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: '導入申請・アカウント発行' }).waitFor()

    const rejectSummary = page.locator('details.baaReject > summary')
    assert.equal(await rejectSummary.count(), 1)
    await rejectSummary.click()
    const reason = page.locator('textarea[name=reason]')
    assert.equal(await reason.isVisible(), true)
    assert.equal(await reason.getAttribute('required'), '')
    assert.equal(await reason.getAttribute('maxlength'), '1000')
    assert.match(await page.locator('details.baaReject').innerText(), /owner@example\.jp/)
    assert.equal(await page.getByRole('button', { name: '却下してメール送信' }).count(), 1)

    assert.equal(await page.getByText('却下メール送信失敗', { exact: true }).count(), 1)
    assert.equal(await page.getByRole('button', { name: '却下メールを再送' }).count(), 1)
    assert.match(await page.locator('.baaRejectionReason').innerText(), /必要な取引情報を確認できませんでした/)
    assert.equal(await page.getByText('対応状況: 却下済み', { exact: true }).count(), 1)
    await page.locator('details.baaApprove > summary').click()
    assert.equal(await page.getByRole('button', { name: '承認・発行する' }).count(), 1)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))

    await page.screenshot({ path: path.join(output, `applications-${width}.png`), fullPage: true })
    await context.close()
  }
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}

console.log(JSON.stringify({ release: 'business-application-rejection-v648', viewports: [390, 1440], rejectForm: true, rejectionStatus: true, mailRetry: true, responsive: true }))
