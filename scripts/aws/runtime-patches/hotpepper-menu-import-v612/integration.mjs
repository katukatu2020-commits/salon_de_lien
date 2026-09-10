import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  menuPageUrl,
  parseMenuPage,
  retrieveMenuPage,
} = require('/app/hotpepper-menu-parser-v612.js')
const { createHotpepperMenuImportService } = require('/app/hotpepper-menu-import-v612.js')

const sourceUrl = 'https://beauty.hotpepper.jp/slnH000307612/coupon/CT00/'
const fixture = `<!doctype html><html><body>
  <h1 class="detailTitle">Salon de Lien</h1>
  <table class="menuTbl"><tr><td>
    <ul class="couponMenuIcons"><li class="couponMenuIcon">カット</li></ul>
    <div><p class="couponMenuName">似合わせカット</p><p><span class="fs16 fgGray">¥5,500</span></p></div>
    <p class="mT10 fgGray fs11 wbba">骨格に合わせたカットです。</p>
    <a href="https://beauty.hotpepper.jp/CSP/bt/reserve/?setmenuId=SN00000000000001">予約</a>
  </td></tr></table>
  <table class="menuTbl"><tr><td>
    <ul class="couponMenuIcons"><li class="couponMenuIcon">カット</li><li class="couponMenuIcon">カラー</li></ul>
    <div><p class="couponMenuName">カット＋透明感カラー</p><p><span class="fs16 fgGray">¥13,200～</span></p></div>
    <p class="mT10 fgGray fs11 wbba">ロング料金があります。</p>
    <a href="https://beauty.hotpepper.jp/CSP/bt/reserve/?setmenuId=SN00000000000002">予約</a>
  </td></tr></table>
  <table class="menuTbl"><tr><td>
    <ul class="couponMenuIcons"><li class="couponMenuIcon">ヘッドスパ</li></ul>
    <div><p class="couponMenuName">頭皮リセットスパ</p><p><span class="fs16 fgGray">¥4,400</span></p></div>
    <p class="mT10 fgGray fs11 wbba">頭皮を整えるケアです。</p>
    <a href="https://beauty.hotpepper.jp/CSP/bt/reserve/?setmenuId=SN00000000000003">予約</a>
  </td></tr></table>
</body></html>`

assert.deepEqual(menuPageUrl(sourceUrl), { url: sourceUrl, salonId: 'H000307612' })
assert.throws(() => menuPageUrl('https://example.com/slnH000307612/coupon/CT00/'), /メニュー/)
assert.throws(() => menuPageUrl('https://beauty.hotpepper.jp/slnH000307612/style/'), /メニュー/)

const parsed = parseMenuPage(fixture, sourceUrl)
assert.equal(parsed.salonName, 'Salon de Lien')
assert.equal(parsed.items.length, 3)
assert.equal(parsed.items[0].category, 'カット')
assert.equal(parsed.items[0].durationMinutes, 60)
assert.equal(parsed.items[1].category, 'カット・カラー')
assert.equal(parsed.items[1].durationMinutes, 150)
assert.equal(parsed.items[1].priceYen, 13200)
assert.equal(parsed.items[1].priceIsMinimum, true)
assert.equal(parsed.items[2].sourceKey, 'hotpepper:H000307612:SN00000000000003')

class FakePrisma {
  constructor() {
    this.job = undefined
    this.menus = [{
      id: 'existing-cut',
      organizationId: 'org-test-v612',
      name: '似合わせカット',
      category: 'カット',
      description: '',
      durationMinutes: 60,
      priceYen: 5500,
      source: 'manual',
      sourceKey: null,
    }]
  }

  async $transaction(callback) {
    return callback(this)
  }

  async $executeRawUnsafe(sql, ...parameters) {
    if (sql.includes('INSERT INTO "HotpepperMenuImportJobV612"')) {
      if (this.job === undefined) this.job = null
      return 1
    }
    if (sql.includes('UPDATE "HotpepperMenuImportJobV612"')) {
      this.job = JSON.parse(parameters[0])
      return 1
    }
    return 0
  }

  async $queryRawUnsafe(sql, ...parameters) {
    if (sql.includes('SELECT "data" FROM "HotpepperMenuImportJobV612"')) return [{ data: this.job }]
    if (sql.includes('pg_try_advisory_xact_lock')) return [{ locked: true }]
    if (sql.includes('INSERT INTO "SalonMenu"')) {
      const [id, organizationId, name, category, description, durationMinutes, priceYen, sourceKey] = parameters
      if (this.menus.some(menu => menu.organizationId === organizationId && menu.name === name)) return []
      this.menus.push({ id, organizationId, name, category, description, durationMinutes, priceYen, source: 'hotpepper', sourceKey })
      return [{ id }]
    }
    if (sql.includes('SELECT "id","name","sourceKey" FROM "SalonMenu"')) {
      return this.menus.filter(menu => menu.organizationId === parameters[0])
    }
    if (sql.includes('SELECT "id" FROM "SalonMenu"') && sql.includes('"sourceKey"=$2')) {
      const [organizationId, sourceKey, name] = parameters
      return this.menus
        .filter(menu => menu.organizationId === organizationId && (menu.sourceKey === sourceKey || menu.name.trim().toLowerCase() === String(name).trim().toLowerCase()))
        .slice(0, 1)
        .map(menu => ({ id: menu.id }))
    }
    if (sql.includes('SELECT "id" FROM "SalonMenu"') && sql.includes('"name"=$2')) {
      return this.menus
        .filter(menu => menu.organizationId === parameters[0] && menu.name === parameters[1])
        .slice(0, 1)
        .map(menu => ({ id: menu.id }))
    }
    return []
  }
}

const prisma = new FakePrisma()
const session = { organizationId: 'org-test-v612', userId: 'user-test-v612', role: 'ADMIN' }
const service = createHotpepperMenuImportService({
  prisma,
  sessionProvider: async () => session,
  fetchRemote: async () => fixture,
})
await service.ensureSchema()

let job = await service.operate({ action: 'start', url: sourceUrl, rightsConfirmed: true }, session)
assert.equal(job.status, 'PREVIEW')
assert.equal(job.total, 3)
assert.equal(job.duplicate, 1)
assert.equal(job.available, 2)

const editableIndex = job.items.find(item => item.name === 'カット＋透明感カラー').index
job = await service.operate({
  action: 'edit',
  jobId: job.id,
  index: editableIndex,
  menu: {
    name: 'カット＋透明感カラー',
    category: 'セット',
    description: 'ロング料金があります。',
    durationMinutes: 140,
    priceYen: 13200,
    priceIsMinimum: true,
  },
}, session)
assert.equal(job.items[editableIndex].durationMinutes, 140)
assert.equal(job.items[editableIndex].durationEstimated, false)

const selected = job.items.filter(item => item.status === 'READY').map(item => item.index)
job = await service.operate({ action: 'confirm', jobId: job.id, total: job.total, indices: selected, rightsConfirmed: true }, session)
assert.equal(job.status, 'IMPORTING')
assert.equal(job.selected, 2)

job = await service.operate({ action: 'tick', jobId: job.id }, session)
assert.equal(job.processed, 1)
job = await service.operate({ action: 'tick', jobId: job.id }, session)
assert.equal(job.status, 'DONE')
assert.equal(job.processed, 2)
assert.equal(job.imported, 2)
assert.equal(prisma.menus.length, 3)
assert.equal(prisma.menus.find(menu => menu.name === 'カット＋透明感カラー').durationMinutes, 140)
assert.equal(prisma.menus.filter(menu => menu.source === 'hotpepper').length, 2)

if (process.env.HOTPEPPER_MENU_LIVE_SMOKE === '1') {
  const live = parseMenuPage(await retrieveMenuPage(sourceUrl), sourceUrl)
  assert.ok(live.items.length > 0)
  console.log(JSON.stringify({ liveSalon: live.salonName, liveMenus: live.items.length }))
}

console.log(JSON.stringify({
  release: 'v612',
  parsedMenus: parsed.items.length,
  duplicateMenus: 1,
  importedMenus: job.imported,
  progressSteps: 2,
}))
