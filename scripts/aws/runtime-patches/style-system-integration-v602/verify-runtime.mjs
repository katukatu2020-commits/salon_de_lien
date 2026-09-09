import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifest = '/tmp/style-system-integration-v602-parent.json'
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
  const currentTargets = targets()
  const current = Object.fromEntries(currentTargets.map(file => [file, hash(fs.readFileSync(file))]))
  const modified = Object.keys(parent).filter(file => current[file] !== parent[file]).sort()
  const added = currentTargets.filter(file => !parent[file]).sort()

  assert.deepEqual(modified, [
    path.join(root, 'commercial-admin-v101.js'),
    path.join(root, 'community-publishing-client-v566.js'),
    path.join(root, 'community-publishing-v566.js'),
    path.join(root, 'public', 'customer-community-mobile-v383.js'),
    path.join(root, 'server.js'),
  ].sort())
  assert.deepEqual(added, [
    path.join(root, 'public', 'style-system-integration-v602.css'),
    path.join(root, 'public', 'style-system-integration-v602.js'),
    path.join(root, 'style-system-integration-v602.js'),
  ].sort())

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const publishing = fs.readFileSync(path.join(root, 'community-publishing-v566.js'), 'utf8')
  const publisher = fs.readFileSync(path.join(root, 'community-publishing-client-v566.js'), 'utf8')
  const commercial = fs.readFileSync(path.join(root, 'commercial-admin-v101.js'), 'utf8')
  const customerCommunityMobile = fs.readFileSync(path.join(root, 'public', 'customer-community-mobile-v383.js'), 'utf8')
  assert.match(server, /X-Lien-Style-System-Integration', 'v602'/)
  assert.match(server, /styleSystemV602\.ensureSchema\(\)/)
  assert.match(server, /await styleSystemV602\.handle\(req,res,url\)/)
  assert.match(server, /style-system-integration-v602\.css\?v=602/)
  assert.match(server, /style-system-integration-v602\.js\?v=602/)
  assert.match(publishing, /syncPostStyle\([\s\S]+links:input\.styleLinks/)
  assert.match(publisher, /configureStyleLinksV602\(modal\)/)
  assert.match(publisher, /styleLinks:modal\.__styleLinks\?\.\(\)/)
  assert.match(publisher, /legacyField\.hidden = true/)
  assert.match(commercial, /admin-community-publishing-v600\.js\?v=602/)
  assert.match(customerCommunityMobile, /!mediaBlock\.classList\.contains\('orimia-style-gallery-v602'\)/)
  assert.match(customerCommunityMobile, /!article\.classList\.contains\('orimia-style-detail-v602'\)/)
  assert.equal((server.match(/\/\* style-system-integration-v602 \*\//g) || []).length, 2)

  console.log(JSON.stringify({
    protectedFiles:Object.keys(parent).length,
    modified,
    added,
    receiptAndDailySalesPrintUnchanged:true,
    customerBookingAndFavoritesUnchanged:true,
  }))
}
