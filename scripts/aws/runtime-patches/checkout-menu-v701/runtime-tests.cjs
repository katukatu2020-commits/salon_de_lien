'use strict'
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs'), Module = require('node:module'), crypto = require('node:crypto')
const { parseReservationMail } = require('/app/tenant-setup.js')
const { parseReservationMenu } = require('/app/reservation-menu-v701.cjs')
const body = menu => '■氏名\nテスト 太郎\n■電話番号\n09011112222\n■予約日時\n2026年10月20日 11:00\n■予約番号\n701\n' + menu
const message = menu => ({ subject: 'HOT PEPPER Beauty 予約変更', body: body(menu), sender: 'test@beauty.hotpepper.jp', messageId: 'qa701' })
function privateModule(file, before, after) {
  const source = fs.readFileSync(file, 'utf8')
  assert.equal(source.split(before).length, 2)
  const module = new Module(file, moduleRoot)
  module.filename = file; module.paths = Module._nodeModulePaths('/app')
  module._compile(source.replace(before, after), file)
  return module.exports
}
const moduleRoot = module
const tenant = privateModule('/app/tenant-setup.js', 'return { ensureSchema, handle, renderNext, startPolling, syncOrganization, businessSchedule }', 'return { ingestMessage }')
const inbound = privateModule('/app/inbound-email.js', 'return { ensureSchema, statusForOrganization, issueAddressForOrganization, handle }', 'return { importParsedReservation, existingAppointmentForBooking }')
function mocks(existing = null, candidates = []) {
  const writes = [], customer = { id: 'qa701-customer', name: 'テスト 太郎', phone: '090-1111-2222' }
  const prisma = {
    $transaction: cb => cb(prisma), $executeRawUnsafe: async () => 1,
    customer: { findMany: async () => [customer] }, contactLog: { upsert: async () => ({}) },
    appointment: { findUnique: async () => existing, findMany: async () => candidates, upsert: async input => { writes.push(input); return { id: input.where.id, ...input.update } } },
  }
  return { writes, prisma, deps: { prisma, crypto, parseReservationMail, customerNameAutoMerge: { resolveOrCreate: async () => customer } } }
}
function gmailInput(menu) { return { id: 'qa701', payload: { mimeType: 'text/plain', headers: [{ name: 'Subject', value: 'HOT PEPPER Beauty 予約変更' }], body: { data: Buffer.from(body(menu)).toString('base64url') } } } }
function manualImporter(prisma) {
  const factories = require('/app/.next/server/chunks/3447.js').modules, cache = {}
  const webpack = id => {
    if (id === 6005) return crypto
    if (id === 13538) return { _: prisma }
    if (!cache[id]) { const m = { exports: {} }; cache[id] = m; factories[id](m, m.exports, webpack) }
    return cache[id].exports
  }
  webpack.d = (target, getters) => { for (const [name, get] of Object.entries(getters)) Object.defineProperty(target, name, { get }) }
  return webpack(83447).v
}
test('runtime parser keeps all service lines without coupon or old menu', () => {
  const parsed = parseReservationMail(message('■変更前\n■メニュー\n古いスパ\n■料金\n4400円\n■変更後\n■メニュー\nカット\nカラー\n■予約時クーポン\n初回特典20%OFF\n■合計金額\n9000円'))
  assert.equal(parsed.ok, true)
  assert.equal(parsed.value.menu, 'カット + カラー'); assert.equal(parsed.value.estimatedPrice, 9000)
})
test('runtime parser never guesses a service or amount from coupon-only mail', () => {
  const parsed = parseReservationMail(message('■予約時クーポン\n頭皮スパ4400円→2200円'))
  assert.equal(parsed.ok, true); assert.equal(parsed.value.menu, null); assert.equal(parsed.value.estimatedPrice, null); assert.ok(parsed.value.reviewReason)
})
for (const route of ['gmail', 'ses', 'manual']) {
  async function run(mock, text) {
    if (route === 'gmail') return tenant.createTenantSetupService(mock.deps).ingestMessage('qa701-org', gmailInput(text))
    if (route === 'ses') return inbound.createInboundEmailService(mock.deps).importParsedReservation('qa701-org', parseReservationMail(message(text)).value, { internetMessageId: 'qa701', body: body(text) })
    return manualImporter(mock.prisma)({ content: body(text), subject: 'HOT PEPPER Beauty 予約変更', messageId: 'qa701' }, 'qa701-org')
  }
  test(route + ': changed menu clears previous price and payment note; guarded write', async () => {
    const mock = mocks({ id: 'old', menu: '古いスパ', estimatedPrice: 4400, note: '支払予定額: 4400円', bookingProvider: 'hotpepper', serviceSales: [] })
    await run(mock, '■メニュー\nカット')
    assert.equal(mock.writes.length, 1)
    const { update, where } = mock.writes[0]
    assert.equal(update.menu, 'カット'); assert.equal(update.estimatedPrice, null)
    assert.match(update.note, /取込内容要確認/); assert.doesNotMatch(update.note, /支払予定額: 4400/)
    assert.deepEqual(where.serviceSales, { none: {} })
  })
  test(route + ': confirmed paid appointment cannot be overwritten', async () => {
    const mock = mocks({ menu: '確定カット', estimatedPrice: 5500, bookingProvider: 'hotpepper', serviceSales: [{ id: 'sale' }] })
    try { await run(mock, '■メニュー\n別メニュー\n■料金\n1000円') } catch (error) { assert.match(error.message, /会計済み/) }
    assert.equal(mock.writes.length, 0)
  })
  test(route + ': missing menu field preserves known service, no fallback catalog', async () => {
    const mock = mocks({ menu: '確定カット', estimatedPrice: 5500, bookingProvider: 'hotpepper', serviceSales: [] })
    await run(mock, '■備考\n時間のみ変更')
    assert.equal(mock.writes[0].update.menu, '確定カット'); assert.equal(mock.writes[0].update.estimatedPrice, 5500)
  })
}
test('SES exact reference and provider matching cannot pick a prefix collision', async () => {
  const mock = mocks(null, [{ id: 'wrong', note: '予約番号: 7012', bookingProvider: 'hotpepper' }, { id: 'other', note: '予約番号: 701', bookingProvider: 'kanzashi' }, { id: 'right', note: '予約番号: 701\n担当: テスト', bookingProvider: 'hotpepper' }])
  const result = await inbound.createInboundEmailService(mock.deps).existingAppointmentForBooking('qa701-org', '701', 'hotpepper')
  assert.equal(result.id, 'right')
})
test('conflicting menu fields require review instead of selecting the first', () => {
  const parsed = parseReservationMenu('メニュー: カット\nメニュー: スパ\n料金: 5500円')
  assert.equal(parsed.menu, null); assert.equal(parsed.menuNeedsReview, true)
})
