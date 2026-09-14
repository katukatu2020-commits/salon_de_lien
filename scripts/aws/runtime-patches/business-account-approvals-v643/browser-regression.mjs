import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const requirePlaywright = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = requirePlaywright('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const { createBusinessAccountApprovalService } = createRequire(import.meta.url)(path.join(runtimeRoot, 'business-account-approvals-v643.js'))
const crypto = createRequire(import.meta.url)('node:crypto')
const output = process.env.SCREENSHOT_DIR || 'artifacts/business-account-approvals-v643/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })
process.env.APP_URL = ''

const inquiry = {
  id: 'inq-demo', audience: 'salon', organizationName: 'Salon de Lien 表参道', contactName: '山田 花子', email: 'owner@example.jp', phone: '090-0000-0000', preferredContact: 'email', message: '店舗アカウントの導入を希望します。料金と利用開始時期について相談したいです。', status: 'new', operatorNote: null, createdAt: new Date('2026-09-15T01:00:00Z'), accessId: null,
}
const salon = { id: 'org-demo', name: 'Salon de Lien', contactName: '山田 花子', email: 'owner@example.jp', loginId: 'salon-demo', createdAt: new Date(), active: true, controlStatus: null, approvedAt: new Date(), mustChangePassword: false, approvalMailStatus: 'SENT' }
const dealer = { id: 'dealer-demo', name: 'スーパーヤマモト', contactName: '山本 太郎', email: 'dealer@example.jp', loginId: 'dealer-demo', createdAt: new Date(), active: false, controlStatus: 'SUSPENDED', approvedAt: new Date(), mustChangePassword: false, approvalMailStatus: 'SENT' }
const access = { id: 'mba-demo', accountType: 'SALON', targetId: 'org-demo', principalId: 'user-demo', accountName: 'Salon de Lien', loginId: 'salon-demo', mustChangePassword: true, approvalMailStatus: 'SENT' }

const prisma = {
  async $executeRawUnsafe() { return 1 },
  async $queryRawUnsafe(query) {
    const sql = String(query)
    if (sql.includes('COUNT(*)::int AS "count" FROM "BusinessInquiry"')) return [{ count: 1 }]
    if (sql.includes('SELECT i.*,m."id" AS "accessId"')) return [inquiry]
    if (sql.includes('COUNT(*)::int AS "total"') && sql.includes('FROM "BusinessInquiry"')) return [{ total: 1, newCount: 1, inProgressCount: 0, closedCount: 0 }]
    if (sql.includes('FROM "Organization" o') && sql.includes('ManagedBusinessAccess')) return [salon]
    if (sql.includes('FROM "WholesaleDealer" d') && sql.includes('ManagedBusinessAccess')) return [dealer]
    if (sql.includes('FROM "ManagedBusinessAccess"') && sql.includes('"principalId"=$2')) return [access]
    return []
  },
}

const commonStyle = '<style>:root{--ink:#28211d;--muted:#756a62;--line:#e9ddd4;--paper:#fffdf9;--canvas:#f6f0e9;--brand:#8f4f42;--green:#2f6b50;--greenBg:#e8f4ec;--red:#a33c3c;--redBg:#fdebea}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font-family:system-ui,sans-serif}.main{width:min(1180px,calc(100% - 24px));margin:auto;padding:24px 0 60px}.hero,.card{border:1px solid var(--line);border-radius:16px;background:var(--paper);padding:22px}.hero h1{margin:6px 0;font-family:serif}.eyebrow{color:var(--brand);font-size:11px;font-weight:800}.updated{color:var(--muted)}.field{display:grid;gap:6px}.field input{min-height:48px;border:1px solid var(--line);border-radius:10px;padding:0 12px}.primary{min-height:44px;border:0;border-radius:10px;background:var(--brand);color:#fff;padding:0 18px}.slug{color:var(--muted);font-size:10px;margin-top:4px}.empty{padding:20px;text-align:center}</style>'
const renderPlatformPage = (title, body) => '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title>' + commonStyle + '</head><body>' + body + '</body></html>'
const renderBaseDashboard = () => renderPlatformPage('運営ダッシュボード', '<main class="main"><section class="hero"><p class="eyebrow">ORIMIA PLATFORM</p><h1>運営ダッシュボード</h1><p>既存の売上・契約集計</p></section></main>')

const service = createBusinessAccountApprovalService({
  prisma,
  crypto,
  operatorSession: () => ({ subject: 'operations@example.jp' }),
  adminSessionProvider: async req => String(req.url).startsWith('/admin/') ? { userId: 'user-demo', subject: 'owner@example.jp' } : null,
  dealerSessionProvider: async () => null,
  renderPlatformPage,
  baseDashboardProvider: async () => ({}),
  renderBaseDashboard,
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
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
    const applications = await context.newPage()
    await applications.goto(base + '/platform/inquiries', { waitUntil: 'networkidle' })
    await applications.getByRole('heading', { name: '導入申請・アカウント発行' }).waitFor()
    assert.equal(await applications.getByText('申請を承認してアカウントを発行').count(), 1)
    await applications.getByText('申請を承認してアカウントを発行').click()
    assert.equal(await applications.getByRole('button', { name: '承認・発行する' }).isVisible(), true)
    assert.ok(await applications.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    await applications.screenshot({ path: path.join(output, `applications-${width}.png`), fullPage: true })

    const dashboard = await context.newPage()
    await dashboard.goto(base + '/platform', { waitUntil: 'networkidle' })
    await dashboard.getByRole('heading', { name: '利用中の事業者' }).waitFor()
    assert.equal(await dashboard.getByText('Salon de Lien', { exact: true }).count(), 1)
    assert.equal(await dashboard.getByText('スーパーヤマモト', { exact: true }).count(), 1)
    assert.equal(await dashboard.getByRole('button', { name: '利用停止' }).count(), 1)
    assert.equal(await dashboard.getByRole('button', { name: '利用再開' }).count(), 1)
    assert.ok(await dashboard.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    await dashboard.screenshot({ path: path.join(output, `dashboard-${width}.png`), fullPage: true })

    const password = await context.newPage()
    await password.goto(base + '/admin/password-change', { waitUntil: 'networkidle' })
    await password.getByRole('heading', { name: 'パスワード変更' }).waitFor()
    assert.match(await password.locator('body').innerText(), /初回パスワード変更が必要/)
    const current = password.locator('input[name=currentPassword]')
    await current.fill('temporary-password')
    await current.locator('xpath=..').getByRole('button', { name: '表示' }).click()
    assert.equal(await current.getAttribute('type'), 'text')
    assert.ok(await password.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    await password.screenshot({ path: path.join(output, `password-${width}.png`), fullPage: true })
    await context.close()
  }
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}

console.log(JSON.stringify({ release: 'business-account-approvals-v643', viewports: [390, 1440], applications: true, dashboard: true, forcedPassword: true }))
