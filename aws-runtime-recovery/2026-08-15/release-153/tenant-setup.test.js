'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const zlib = require('node:zlib')
const crypto = require('node:crypto')
const fs = require('node:fs')
const { createTenantSetupService, parseReservationMail, normalizePhone, legacyStaffRowsForSchedule } = require('./tenant-setup')

test('Hot Pepper reservation keeps staff, menu, coupon and amount', () => {
  const result = parseReservationMail({
    subject: 'HOT PEPPER Beauty ご予約',
    messageId: 'hp-1',
    body: `◇ご予約内容
■予約番号
 BF48093294
■氏名
 藤田 美里（フジタ ミサト）
■来店日時
 2026年08月13日（木）10:00
■スタイリスト
 渡邊 浩明
■メニュー
 カット＋ヘッドスパ
 （メニュー金額：7,700円）
 （施術時間目安：1時間30分）
■ご利用クーポン
 [全員] [スタイリスト指定]
 女性におすすめ！カット+リフトアップスパ 9000→7700
■合計金額
 お支払い予定金額 7,600円`,
  })
  assert.equal(result.ok, true)
  assert.equal(result.value.customerName, '藤田 美里')
  assert.equal(result.value.staffName, '渡邊 浩明')
  assert.match(result.value.menu, /クーポン: 女性におすすめ!/) 
  assert.equal(result.value.estimatedPrice, 7600)
  assert.equal(result.value.durationMinutes, 90)
})

test('Kanzashi reservation parses menu and coupon independently', () => {
  const result = parseReservationMail({
    subject: '「かんざし」新規予約',
    sender: 'noreply@kanzashi.com',
    messageId: 'kanzashi-1',
    body: `■予約詳細ページ
 https://kanzashi.com/reservation/316480108
■来店日時
 2026/08/23 10:00
■担当スタッフ
 谷崎 太二
■予約時メニュー
 52.眉カット
■予約時クーポン
 1.頭皮環境改善！カット+SCALPスパ¥10,000→¥8800
■合計施術時間
 100 分
■予約時合計金額
 9,900 円
■お客様名（カナ）
 河田 治希（カワタ ハルキ）
■電話番号
 08056293309`,
  })
  assert.equal(result.ok, true)
  assert.equal(result.value.bookingReference, '316480108')
  assert.equal(result.value.durationMinutes, 100)
  assert.equal(result.value.estimatedPrice, 9900)
  assert.equal(result.value.provider, 'kanzashi')
})

test('Cancellation is marked and invalid mail is ignored safely', () => {
  const cancelled = parseReservationMail({ subject: '予約がキャンセルされました', body: '■氏名\n 石井 ひなた\n■来店日時\n 2026/08/15 13:00' })
  assert.equal(cancelled.ok, true)
  assert.equal(cancelled.value.status, 'キャンセル')
  assert.equal(parseReservationMail({ subject: 'newsletter', body: 'hello' }).ok, false)
})

test('Phone normalization handles domestic and E.164 Japanese numbers', () => {
  assert.equal(normalizePhone('090-1234-5678'), '09012345678')
  assert.equal(normalizePhone('+81 90 1234 5678'), '09012345678')
})

test('legacy Salon staff fallback follows the configured business hours', () => {
  const rows = legacyStaffRowsForSchedule({ openMinutes: 570, closeMinutes: 1110 })
  assert.equal(rows.length, 5)
  assert.deepEqual(rows.map(row => row.staffKey), ['tanizaki', 'watanabe', 'asano', 'kobayashi', 'kaori'])
  assert.ok(rows.every(row => row.workStartMinutes === 570 && row.workEndMinutes === 1110))
  assert.equal(rows[0].maxConcurrentAppointments, 2)
})

test('tenant Gmail OAuth uses the configured public HTTPS origin behind CloudFront', async () => {
  const previous = {
    appUrl: process.env.APP_URL,
    adminAuthSecret: process.env.ADMIN_AUTH_SECRET,
    tenantClientId: process.env.TENANT_GMAIL_OAUTH_CLIENT_ID,
  }
  process.env.APP_URL = 'https://salon-de-lien.com'
  process.env.ADMIN_AUTH_SECRET = 'test-admin-auth-secret-that-is-long-enough'
  process.env.TENANT_GMAIL_OAUTH_CLIENT_ID = 'tenant-oauth-client.apps.googleusercontent.com'
  try {
    const prisma = { $executeRawUnsafe: async () => 1 }
    const service = createTenantSetupService({
      prisma,
      sessionProvider: async () => ({ organizationId: 'org-test', userId: 'owner-test', role: 'ADMIN' }),
      customerSessionProvider: async () => null,
      crypto,
    })
    const headers = new Map()
    const response = {
      statusCode: 200,
      setHeader(name, value) { headers.set(String(name).toLowerCase(), value) },
      end() {},
    }
    const request = {
      method: 'GET',
      headers: { host: 'salon-de-lien.com', 'x-forwarded-proto': 'http' },
      socket: { encrypted: false },
    }
    const handled = await service.handle(request, response, new URL('http://salon-de-lien.com/api/lien-tenant-setup/gmail/start?email=owner%40example.com'))
    assert.equal(handled, true)
    assert.equal(response.statusCode, 302)
    const authorizationUrl = new URL(headers.get('location'))
    assert.equal(authorizationUrl.searchParams.get('redirect_uri'), 'https://salon-de-lien.com/api/lien-tenant-setup/gmail/callback')
    const [stateBody] = authorizationUrl.searchParams.get('state').split('.')
    const state = JSON.parse(Buffer.from(stateBody, 'base64url').toString('utf8'))
    assert.equal(state.redirectUri, 'https://salon-de-lien.com/api/lien-tenant-setup/gmail/callback')
  } finally {
    if (previous.appUrl === undefined) delete process.env.APP_URL
    else process.env.APP_URL = previous.appUrl
    if (previous.adminAuthSecret === undefined) delete process.env.ADMIN_AUTH_SECRET
    else process.env.ADMIN_AUTH_SECRET = previous.adminAuthSecret
    if (previous.tenantClientId === undefined) delete process.env.TENANT_GMAIL_OAUTH_CLIENT_ID
    else process.env.TENANT_GMAIL_OAUTH_CLIENT_ID = previous.tenantClientId
  }
})

test('Next.js HTML passes through unchanged so React can hydrate the exact server response', async () => {
  const service = createTenantSetupService({ prisma: {}, sessionProvider: async () => null, customerSessionProvider: async () => null, crypto })
  const headers = new Map()
  let responseBody = Buffer.alloc(0)
  const response = {
    statusCode: 200,
    setHeader(name, value) { headers.set(String(name).toLowerCase(), value) },
    getHeader(name) { return headers.get(String(name).toLowerCase()) },
    removeHeader(name) { headers.delete(String(name).toLowerCase()) },
    writeHead(statusCode, values) {
      this.statusCode = statusCode
      for (const [name, value] of Object.entries(values || {})) this.setHeader(name, value)
      return this
    },
    write(chunk) { responseBody = Buffer.concat([responseBody, Buffer.from(chunk)]); return true },
    end(chunk) { if (chunk) responseBody = Buffer.concat([responseBody, Buffer.from(chunk)]); return this },
  }
  const request = { headers: { 'accept-encoding': 'gzip, br' } }
  const html = '<!DOCTYPE html><html><head><title>Appointments</title></head><body><main>Appointments</main></body></html>'
  await service.renderNext(request, response, new URL('https://salon-de-lien.com/admin/appointments'), (_req, res) => {
    const compressed = zlib.gzipSync(Buffer.from(html))
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Encoding': 'gzip', 'Content-Length': compressed.length })
    res.end(compressed)
  })
  const rendered = zlib.gunzipSync(responseBody).toString('utf8')
  assert.doesNotMatch(rendered, /tenant-setup-client\.js/)
  assert.doesNotMatch(rendered, /commercial-admin-v101\.js/)
  assert.match(rendered, /<main>Appointments<\/main>/)
  assert.equal(headers.get('content-encoding'), 'gzip')
  assert.equal(Number(headers.get('content-length')), responseBody.length)
  assert.equal(request.headers['accept-encoding'], 'gzip, br')
})

test('shift setup client keeps header, summary rows and staff lanes aligned', function () {
  const client = fs.readFileSync(require.resolve('./tenant-setup-client.js'), 'utf8')
  assert.match(client, /\.shift-top\{grid-template-rows:48px 72px!important\}/)
  assert.match(client, /\.shift-top>div:nth-child\(3\)>span,.shift-top>div:nth-child\(4\)>div\{height:36px!important/)
  assert.match(client, /function alignShiftTimeHeader\(\)/)
  assert.match(client, /\(index \* 2 \+ 1\) \/ slots\.length/)
  assert.match(client, /while \(labels\.length > expectedHourLabels\) labels\.pop\(\)\.remove\(\)/)
  assert.match(client, /\[data-ts-add-staff\]\{width:auto!important/)
  assert.match(client, /white-space:nowrap!important/)
  assert.match(client, /function normalizeShiftNowMarker\(\)/)
  assert.match(client, /\.ts-shift-now-global/)
  assert.match(client, /markers\.forEach\(marker =>/)
  assert.match(client, /background: '#c24842'/)
  assert.match(client, /window\.__lienShiftNowMarkerTimer/)
  assert.match(client, /function observeShiftLayout\(\)/)
  assert.match(client, /new ResizeObserver/)
  assert.match(client, /shiftLayoutObserver\.observe\(target\)/)
  assert.match(client, /function syncShiftLayoutDuringSidebarTransition\(\)/)
  assert.match(client, /button\[aria-label\*="サイドバー"\]/)
  assert.match(client, /function polishSidebarControl\(\)/)
  assert.match(client, /classList\.add\('ts-sidebar-toggle'\)/)
  assert.match(client, /salon-admin-sidebar-collapsed/)
  assert.match(client, /button\.ts-sidebar-toggle::before/)
  assert.match(client, /restoreRecentlyRequested/)
  assert.match(client, /tsSidebarRestoredAt/)
  assert.match(client, /delete button\.dataset\.tsSidebarRestoring \}, 1200/)
  assert.match(client, /function applyBusinessSchedule\(\)/)
  assert.match(client, /--ts-shift-hours/)
  assert.match(client, /lien:business-schedule-updated/)
})

test('admin setup client follows Next.js route transitions instead of initial script metadata', function () {
  const client = fs.readFileSync(require.resolve('./tenant-setup-client.js'), 'utf8')
  assert.doesNotMatch(client, /document\.currentScript\?\.dataset\.page/)
  assert.match(client, /function currentPage\(\)/)
  assert.match(client, /location\.pathname === '\/admin\/appointments'/)
  assert.match(client, /function enhanceCurrentRoute\(\)/)
  assert.match(client, /new MutationObserver\(scheduleRouteEnhancement\)/)
  assert.match(client, /window\.addEventListener\('popstate', scheduleRouteEnhancement\)/)
  assert.match(client, /form\.dataset\.tsMenusEnhanced/)
  assert.doesNotMatch(client, /document\.documentElement\.dataset\.tsMenusEnhanced/)
})

test('tenant runtime is injected into every full admin document but not RSC requests', function () {
  const patchPath = fs.existsSync('/tmp/patch-tenant-setup.js') ? '/tmp/patch-tenant-setup.js' : require.resolve('./patch-tenant-setup.js')
  const patchSource = fs.readFileSync(patchPath, 'utf8')
  assert.match(patchSource, /acceptsAdminHtml/)
  assert.match(patchSource, /includes\('text\/html'\)/)
  assert.match(patchSource, /url\.pathname\.startsWith\('\/admin\/'\)/)
  assert.match(patchSource, /tenant-bootstrap-v93-ui-lifecycle/)
  assert.doesNotMatch(patchSource, /url\.pathname === '\/admin\/appointments' \|\| \(url\.pathname === '\/admin\/products'/)
})
