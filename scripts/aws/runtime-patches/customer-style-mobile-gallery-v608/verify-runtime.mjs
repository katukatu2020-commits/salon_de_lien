import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifest = '/tmp/customer-style-mobile-gallery-v608-parent.json'
const changesPath = '/tmp/customer-style-mobile-gallery-v608-changes.json'
const hash = value => crypto.createHash('sha256').update(value).digest('hex')

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes:true }).flatMap(entry => (
    entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]
  ))
}

function targets() {
  return [
    ...files(path.join(root, '.next')),
    ...files(path.join(root, 'public')),
    ...fs.readdirSync(root).filter(file => /\.(?:js|css)$/.test(file)).map(file => path.join(root, file)),
  ]
}

if (process.argv[2] === 'snapshot') {
  fs.writeFileSync(manifest, JSON.stringify(Object.fromEntries(targets().map(file => [file, hash(fs.readFileSync(file))]))))
} else {
  const parent = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  const changes = JSON.parse(fs.readFileSync(changesPath, 'utf8'))
  const currentTargets = targets()
  const current = Object.fromEntries(currentTargets.map(file => [file, hash(fs.readFileSync(file))]))
  const modified = Object.keys(parent).filter(file => current[file] !== parent[file]).sort()
  const added = currentTargets.filter(file => !parent[file]).sort()

  assert.deepEqual(modified, [
    path.join(root, 'public', 'style-system-integration-v602.css'),
    path.join(root, 'public', 'style-system-integration-v602.js'),
    path.join(root, 'server.js'),
  ].sort())
  assert.deepEqual(added, [])

  for (const [file, digest] of Object.entries(parent)) {
    let value = fs.readFileSync(file)
    for (const change of changes.filter(item => path.join(root, item.file) === file).reverse()) {
      const source = value.toString('utf8')
      if (change.kind === 'append') {
        assert.ok(source.endsWith(change.addition), `${file}: appended patch is missing`)
        value = Buffer.from(source.slice(0, -change.addition.length))
      } else {
        assert.equal(source.split(change.after).length - 1, change.count, `${file}: replacement count changed`)
        value = Buffer.from(source.split(change.after).join(change.before))
      }
    }
    assert.equal(hash(value), digest, `Unexpected parent change: ${file}`)
  }

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const client = fs.readFileSync(path.join(root, 'public', 'style-system-integration-v602.js'), 'utf8')
  const css = fs.readFileSync(path.join(root, 'public', 'style-system-integration-v602.css'), 'utf8')

  assert.equal((css.match(/customer-style-mobile-gallery-v608/g) || []).length, 1)
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) !important/)
  assert.match(css, /aspect-ratio:\s*var\(--orimia-style-photo-aspect-v608, 3 \/ 4\) !important/)
  assert.match(css, /background-size:\s*contain !important/)
  assert.match(css, /object-fit:\s*contain !important/)
  assert.match(client, /orimia-style-gallery-mobile-v608/)
  assert.match(client, /const probe = new Image\(\)/)
  assert.match(client, /--orimia-style-photo-aspect-v608/)
  assert.match(client, /photo\.dataset\.orimiaStyleImageRatioV608 = 'ready'/)
  assert.match(client, /audience === 'staff' \? `<section class="orimia-style-menus-v602">/)
  assert.match(client, /if \(audience === 'customer'\) meta\?\.remove\(\)/)
  assert.match(client, /\(!meta && !existingDetails\)/)
  assert.match(client, /else content\.insertAdjacentHTML\('afterbegin', detailsMarkup\(style\)\)/)
  assert.match(server, /style-system-integration-v602\.css\?v=608-mobile-gallery1/)
  assert.match(server, /style-system-integration-v602\.js\?v=608-mobile-gallery1/)
  assert.match(server, /X-Lien-Customer-Style-Mobile-Gallery', 'v608'/)

  for (const [header, version] of [
    ['X-Lien-Customer-Booking-Menu-Clearance', 'v607'],
    ['X-Lien-Customer-Style-First-Paint', 'v606'],
    ['X-Lien-Customer-Style-Detail', 'v605'],
    ['X-Lien-Customer-Mypage-Navigation', 'v604'],
    ['X-Lien-Stamp-Program', 'v603'],
    ['X-Lien-Style-System-Integration', 'v602'],
    ['X-Lien-Customer-Journey', 'v601'],
    ['X-Lien-Hotpepper-Style-Import', 'v600'],
    ['X-Lien-Daily-Sales-Print', 'v590'],
    ['X-Lien-Receipt-Pos-Direct', 'v582'],
  ]) assert.match(server, new RegExp(`${header}', '${version}`))

  console.log(JSON.stringify({
    protectedFiles:Object.keys(parent).length,
    modified,
    added,
    completeMobilePhotos:true,
    customerLegacyMetadataRemoved:true,
    customerDuplicateMenuRemoved:true,
    staffStyleDataPreserved:true,
  }))
}
