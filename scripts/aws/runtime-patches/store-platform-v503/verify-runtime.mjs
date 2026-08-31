import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const layoutName = 'layout-runtime-v503-final.js'
const oldLayoutName = 'layout-runtime-v502.js'
const customerLayoutName = 'layout-d1470003e928b0b1.customertabs-v503.js'
const oldCustomerLayoutName = 'layout-d1470003e928b0b1.customertabs.js'
const layout = read(path.join('.next', 'static', 'chunks', 'app', layoutName))
assert.match(layout, /store-platform-v503-inline/)
assert.match(layout, /window\.__orimiaBrandV503/)
assert.match(layout, /window\.__storeAppStabilityV501/)
assert.match(layout, /window\.__storePlatformV503/)
assert.match(layout, /ORIMIA for Salon/)
assert.match(layout, /Powered by ORIMIA/)
assert.doesNotMatch(layout, /store-app-stability-v502-inline/)

const customerLayout = read(path.join('.next', 'static', 'chunks', 'app', customerLayoutName))
assert.match(customerLayout, /store-platform-v503-customer-inline/)
assert.match(customerLayout, /window\.__orimiaBrandV503/)
assert.match(customerLayout, /window\.__storePlatformV503/)
assert.match(customerLayout, /Powered by ORIMIA/)

const customerExperience = read('customer-experience-v503.js')
assert.match(customerExperience, /store-platform-v503-customer-experience/)
assert.match(customerExperience, /window\.__orimiaBrandV503/)
assert.match(customerExperience, /window\.__storePlatformV503/)

const appManifest = read(path.join('.next', 'app-build-manifest.json'))
assert.ok(appManifest.includes(layoutName))
assert.ok(!appManifest.includes(oldLayoutName))

let layoutManifestCount = 0
let oldLayoutReferenceCount = 0
let customerLayoutManifestCount = 0
let oldCustomerLayoutReferenceCount = 0
let quantityReferenceCount = 0
let oldQuantityReferenceCount = 0
function inspectNextFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) inspectNextFiles(fullPath)
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
      const source = fs.readFileSync(fullPath, 'utf8')
      layoutManifestCount += (source.match(/layout-runtime-v503-final\.js/g) || []).length
      oldLayoutReferenceCount += (source.match(/layout-runtime-v502\.js/g) || []).length
      customerLayoutManifestCount += (source.match(/layout-d1470003e928b0b1\.customertabs-v503\.js/g) || []).length
      oldCustomerLayoutReferenceCount += (source.match(/layout-d1470003e928b0b1\.customertabs\.js/g) || []).length
      quantityReferenceCount += (source.match(/page-4198cf4ea5eaf395\.quantity-v503-final\.js/g) || []).length
      oldQuantityReferenceCount += (source.match(/page-4198cf4ea5eaf395\.js/g) || []).length
    }
  }
}
inspectNextFiles(nextRoot)
assert.ok(layoutManifestCount >= 20, `only ${layoutManifestCount} v503 layout references were found`)
assert.equal(oldLayoutReferenceCount, 0, 'a cached v502 layout URL is still referenced')
assert.ok(customerLayoutManifestCount >= 1, 'the customer v503 layout is not referenced')
assert.equal(oldCustomerLayoutReferenceCount, 0, 'a cached customer layout URL is still referenced')
assert.ok(quantityReferenceCount >= 1, 'the quantity editor cache-busted chunk is not referenced')
assert.equal(oldQuantityReferenceCount, 0, 'the old checkout quantity chunk is still referenced')

const server = read('server.js')
assert.equal((server.match(/X-Lien-Store-Platform/g) || []).length, 1)
assert.match(server, /X-Lien-Store-Platform', 'v503'/)
assert.match(server, /syncCustomerProfileV503/)
assert.match(server, /productDemographicsV503/)
assert.match(server, /CustomerStoreLink/)
assert.match(server, /ORIMIA for Salon/)
assert.match(server, /ADD COLUMN IF NOT EXISTS "purchaseQuantity"/)
assert.doesNotMatch(server, /orimia-brand-v501\.js\?v=501/)
assert.match(server, /customer-experience-v503\.js\?v=503/)
assert.doesNotMatch(server, /customer-experience-v425\.js/)

const profileImage = read('customer-profile-image-service-v424.js')
assert.match(profileImage, /customer-profile-image-v503/)
assert.match(profileImage, /CustomerStoreLink/)
assert.match(profileImage, /SELECT DISTINCT c\."id",c\."organizationId",c\."profileImageUrl"/)
assert.match(profileImage, /全ての登録済み店舗へ反映しました/)

const storeProfile = read('store-profile.js')
assert.match(storeProfile, /AND "updatedByUserId" IS NULL/)

const reward = read(path.join('.next', 'server', 'chunks', '7295.js'))
assert.match(reward, /drawCount:g,drawResults:b/)
assert.match(reward, /ProductProposal|productProposal/)
assert.match(reward, /SELECT p\."note",p\."purchaseQuantity"/)
assert.match(reward, /商品アンケート抽選/)
assert.match(reward, /JSON\.stringify\(\{drawCount:g,drawResults:b\}\)/)

let reviewPropagationCount = 0
let reviewApiPropagationCount = 0
function countReviewPropagation(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) countReviewPropagation(fullPath)
    else if (entry.name.endsWith('.js')) {
      const source = fs.readFileSync(fullPath, 'utf8')
      reviewPropagationCount += (source.match(/drawCount:o\.drawCount,drawResults:o\.drawResults/g) || []).length
      reviewApiPropagationCount += (source.match(/drawCount:e\.drawCount,drawResults:e\.drawResults/g) || []).length
    }
  }
}
countReviewPropagation(path.join(nextRoot, 'server', 'app'))
assert.equal(reviewPropagationCount, 3)
assert.equal(reviewApiPropagationCount, 2)

const quantity = read(path.join('.next', 'static', 'chunks', 'app', 'admin', 'appointments', '[appointmentId]', 'page-4198cf4ea5eaf395.quantity-v503-final.js'))
assert.match(quantity, /inputMode:"numeric"/)
assert.match(quantity, /onFocus:e=>e\.currentTarget\.select\(\)/)
assert.match(quantity, /""===s\.target\.value\?"":/)
assert.match(quantity, /quantity:1/)
assert.match(quantity, /onBlur:/)

const checkoutServer = read(path.join('.next', 'server', 'app', 'admin', 'appointments', '[appointmentId]', 'page.js'))
assert.match(checkoutServer, /SET "purchaseQuantity"=\$2 WHERE "id"=\$1/)
assert.equal((checkoutServer.match(/SET "purchaseQuantity"=\$2 WHERE "id"=\$1/g) || []).length, 1)

const brand = read(path.join('public', 'orimia-brand-v503.js'))
assert.match(brand, /const STORE_BRAND = 'ORIMIA for Salon'/)
assert.match(brand, /const CUSTOMER_BRAND = 'Powered by ORIMIA'/)
assert.match(brand, /border:0!important/)
assert.match(brand, /border-radius:0!important/)
assert.match(brand, /box-shadow:none!important/)
assert.doesNotMatch(brand, /replaceAll\(['"]Salon de Lien/)

const platform = read(path.join('public', 'store-platform-v503.js'))
assert.match(platform, /商品別 購入層/)
assert.match(platform, /通常の営業時間・定休日/)
assert.match(platform, /個別設定した日はそのまま保持されます/)
assert.match(platform, /購入数\$\{results\.length\}点分/)
assert.match(platform, /同じ商品のアンケートは1回で完了です/)

const storeManifest = JSON.parse(read(path.join('public', 'orimia-for-salon.webmanifest')))
const customerManifest = JSON.parse(read(path.join('public', 'powered-by-orimia.webmanifest')))
assert.equal(storeManifest.name, 'ORIMIA for Salon')
assert.equal(storeManifest.scope, '/admin/')
assert.equal(customerManifest.name, 'Powered by ORIMIA')
assert.equal(customerManifest.scope, '/u/')
assert.equal(storeManifest.icons[0].purpose, 'any')

console.log(JSON.stringify({
  release: 'v503',
  layoutManifestCount,
  customerLayoutManifestCount,
  quantityReferenceCount,
  reviewPropagationCount,
  reviewApiPropagationCount,
}))
