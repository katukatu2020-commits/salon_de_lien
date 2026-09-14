import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const server = read('server.js')
const customerService = read('style-community-controls-v610.js')
const adminService = read('style-admin-controls-v618.js')
const customerClient = read('public/style-community-controls-v610.js')
const adminClient = read('public/style-admin-controls-v618.js')
const thumbnailService = read('style-list-thumbnail-v640.js')
const loader = read('public/ui-transition-v640.js')
const adminPage = read('.next/server/app/admin/community/page.js')
const customerPage = read('.next/server/app/u/(account)/community/page.js')
const changes = JSON.parse(fs.readFileSync('/tmp/style-list-performance-v640-changes.json', 'utf8'))
const manifest = JSON.parse(read('style-list-thumbnails-v640.json'))

assert.match(server, /createStyleListThumbnailService\(\{ prisma \}\)/)
assert.match(server, /styleListThumbnailsV640\.handle\(req,res,url\)/)
assert.match(server, /style-community-controls-v610\.js\?v=640-performance1/)
assert.match(server, /style-admin-controls-v618\.js\?v=640-performance1/)
assert.equal((server.match(/ui-transition-v640\.js\?v=640-style-list-performance1/g) || []).length, 2)
assert.match(server, /X-Lien-Style-List-Performance', 'v640'/)

assert.match(customerService, /const PAGE_SIZE = 12 \/\* style-list-performance-v640 \*\//)
assert.match(customerService, /cachedStylistOptionsV640/)
assert.match(customerService, /createStyleListThumbnailUrl/)
assert.doesNotMatch(customerService, /normalizeStylePostOrder/)
assert.match(customerService, /"updatedAt","title"/)

assert.match(adminService, /const PAGE_SIZE = 12 \/\* style-list-performance-v640 \*\//)
assert.match(adminService, /cachedAdminListOptionsV640/)
assert.match(adminService, /createStyleListThumbnailUrl/)
const adminReadHandler = adminService.slice(adminService.indexOf('async function handleList'), adminService.indexOf('async function handleOrder'))
assert.doesNotMatch(adminReadHandler, /normalizeStylePostOrder/)
assert.match(adminService, /"updatedAt","postKind"/)

for (const [client, audience] of [[customerClient, 'customer'], [adminClient, 'staff']]) {
  assert.match(client, /orimia:style-list-state-v640/)
  assert.match(client, new RegExp(`audience: '${audience}'`))
  assert.match(client, /timedOut = true/)
  assert.match(client, /window\.clearTimeout\(timeoutId\)/)
  assert.match(client, /announceListStateV640\('ready'\)/)
  assert.match(client, /announceListStateV640\('error'\)/)
}
assert.match(customerClient, /orimiaStyleListMountedV640/)
assert.match(customerClient, /listHydrationReadyV640/)
assert.match(customerClient, /index > 1/)
assert.match(adminClient, /index > 3/)

assert.match(adminPage, /data-orimia-style-list-shell-v640/)
assert.match(adminPage, /className:"orimia-style-admin-v618"/)
assert.doesNotMatch(adminPage, /content-edit-delete-client-v615\.js\?v=596/)
assert.doesNotMatch(adminPage, /organizationId:r\.organizationId,filters:t/)
assert.match(customerPage, /data-orimia-style-list-shell-v640/)
assert.match(customerPage, /className:"orimia-style-community-v610"/)
assert.doesNotMatch(customerPage, /organizationId:t\.organizationId,filters:r/)

assert.match(loader, /window\.__orimiaUiTransitionV640/)
assert.match(loader, /orimia:style-list-state-v640/)
assert.match(loader, /isStyleListPath/)
assert.match(loader, /style-list-ready/)
assert.match(loader, /orimiaNavigationLoaderScope = 'v640'/)

assert.match(thumbnailService, /THUMBNAIL_WIDTH = 560/)
assert.match(thumbnailService, /THUMBNAIL_HEIGHT = 700/)
assert.match(thumbnailService, /private\/style-list-thumbnails-v640\//)
assert.match(thumbnailService, /timingSafeEqual/)
assert.match(thumbnailService, /X-Lien-Style-Thumbnail', 'v640'/)

const manifestEntries = Object.entries(manifest)
assert.ok(manifestEntries.length >= 10, 'Expected the demo style thumbnails to be generated')
let totalThumbnailBytes = 0
for (const [source, output] of manifestEntries) {
  assert.match(source, /^\/demo\/showcase\/styles\//)
  assert.match(output, /^\/generated\/style-thumbnails-v640\/[a-f0-9]{24}\.webp$/)
  const target = path.join(root, 'public', output.slice(1))
  const stat = fs.statSync(target)
  assert.ok(stat.size > 0 && stat.size < 250_000, `${output}: thumbnail size is unexpected`)
  totalThumbnailBytes += stat.size
}
assert.ok(totalThumbnailBytes < 2_000_000, 'Generated style thumbnails are too large in aggregate')

for (const name of [
  'admin layout asset activation',
  'customer layout asset activation',
  'lightweight admin style page shell',
  'lightweight customer style page shell',
  'remove customer order normalization from reads',
  'remove admin order normalization from reads',
]) assert.ok(changes.some(change => change.label === name), `Missing verified change: ${name}`)

for (const [header, version] of [
  ['X-Lien-Style-Detail-Loading-Recovery', 'v639'],
  ['X-Lien-Dealer-Pricing-Ime-Search', 'v638'],
  ['X-Lien-Business-Inquiries', 'v637'],
  ['X-Lien-Customer-Profile-Name-Fields', 'v636'],
  ['X-Lien-Booking-Confirmation-Name', 'v635'],
  ['X-Lien-Style-Demo-Ordering', 'v634'],
  ['X-Lien-Customer-Registration-Name-Fields', 'v633'],
  ['X-Lien-Dealer-Pricing-Pagination', 'v631'],
  ['X-Lien-Managed-Bank-Accounts', 'v629'],
  ['X-Lien-List-Pagination', 'v628'],
  ['X-Lien-Password-Visibility', 'v627'],
]) assert.match(server, new RegExp(`${header}', '${version}`))

console.log(JSON.stringify({
  release: 'style-list-performance-v640',
  pageSize: 12,
  generatedThumbnails: manifestEntries.length,
  generatedThumbnailBytes: totalThumbnailBytes,
  lightweightServerShells: ['staff', 'customer'],
  loaderReadinessEvent: true,
  changes: changes.length,
}))
