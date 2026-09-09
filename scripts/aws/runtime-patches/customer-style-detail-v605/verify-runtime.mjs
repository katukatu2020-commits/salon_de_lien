import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifest = '/tmp/customer-style-detail-v605-parent.json'
const changesPath = '/tmp/customer-style-detail-v605-changes.json'
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
  const lead = client.slice(client.indexOf('function leadMarkup'), client.indexOf('function menuMarkup'))
  const details = client.slice(client.indexOf('function detailsMarkup'), client.indexOf('function suppressLegacy'))

  assert.match(server, /X-Lien-Customer-Style-Detail', 'v605'/)
  assert.match(server, /style-system-integration-v602\.css\?v=605-customer-detail1/)
  assert.match(server, /style-system-integration-v602\.js\?v=605-customer-detail1/)
  assert.doesNotMatch(lead, /style-stylist-compact/)
  assert.match(lead, /is-menu-only-v605/)
  assert.match(details, /audience === 'customer' \? '担当スタイリスト'/)
  assert.match(details, /audience === 'staff' && style\.source/)
  assert.match(client, /orimia-style-gallery-stable-v605/)
  assert.match(client, /orimia-style-photo-v605/)
  assert.match(client, /'position', 'right', 'top', 'width'/)
  assert.match(client, /orimia-style-photo-secondary-bottom-v605/)
  assert.match(css, /customer-style-detail-v605/)
  assert.match(css, /contain: layout paint/)
  assert.match(css, /orimia-style-gallery-stable-v605 ~ \.community-feed-content/)

  for (const [header, version] of [
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
    oneCustomerStylistProfile:true,
    customerSourceRemoved:true,
    stableGalleryBoundary:true,
    staffEditorPreserved:true,
    receiptAndDailySalesPrintPreserved:true,
  }))
}
