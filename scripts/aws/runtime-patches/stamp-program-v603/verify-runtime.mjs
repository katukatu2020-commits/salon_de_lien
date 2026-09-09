import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifest = '/tmp/stamp-program-v603-parent.json'
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

  assert.deepEqual(modified, [path.join(root, 'server.js')])
  assert.deepEqual(added, [
    path.join(root, 'public', 'stamp-program-v603.css'),
    path.join(root, 'public', 'stamp-program-v603.js'),
    path.join(root, 'stamp-program-v603.js'),
  ].sort())

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const service = fs.readFileSync(path.join(root, 'stamp-program-v603.js'), 'utf8')
  const client = fs.readFileSync(path.join(root, 'public', 'stamp-program-v603.js'), 'utf8')
  const css = fs.readFileSync(path.join(root, 'public', 'stamp-program-v603.css'), 'utf8')

  assert.match(server, /X-Lien-Stamp-Program', 'v603'/)
  assert.match(server, /stampProgramV603\.ensureSchema\(\)/)
  assert.match(server, /await stampProgramV603\.handle\(req,res,url\)/)
  assert.match(server, /data-stamp-card-v603/)
  assert.match(server, /stamp-program-v603\.css\?v=603/)
  assert.match(server, /stamp-program-v603\.js\?v=603/)
  assert.doesNotMatch(server.slice(server.indexOf('async function customerStampsPage'), server.indexOf('async function customerNotificationItems')), /facial|type=facial|フェイシャル/)
  assert.match(service, /OrganizationStampProgram/)
  assert.match(service, /requiredVisits/)
  assert.match(service, /PRODUCT_FREE/)
  assert.match(service, /MENU_FREE/)
  assert.match(client, /data-stamp-settings-v603/)
  assert.match(client, /商品1点無料/)
  assert.match(client, /メニュー無料/)
  assert.match(css, /\.sp-customer-card-v603/)
  assert.match(css, /\.sp-settings-v603/)
  assert.match(server, /X-Lien-Receipt-Pos-Direct', 'v582'/)
  assert.match(server, /X-Lien-Daily-Sales-Print', 'v590'/)
  assert.match(server, /X-Lien-Hotpepper-Style-Import', 'v600'/)
  assert.match(server, /X-Lien-Customer-Journey', 'v601'/)
  assert.match(server, /X-Lien-Style-System-Integration', 'v602'/)
  assert.equal((server.match(/\/\* stamp-program-v603 \*\//g) || []).length, 2)

  console.log(JSON.stringify({
    protectedFiles:Object.keys(parent).length,
    modified,
    added,
    unifiedCustomerCard:true,
    storeScopedRewards:true,
    receiptAndDailySalesPrintPreserved:true,
  }))
}
