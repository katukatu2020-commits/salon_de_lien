import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifest = '/tmp/style-admin-rerender-v619-parent.json'
const changesPath = '/tmp/style-admin-rerender-v619-changes.json'
const hash = value => crypto.createHash('sha256').update(value).digest('hex')

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => (
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
    path.join(root, 'public', 'style-admin-controls-v618.js'),
    path.join(root, 'server.js'),
  ].sort())
  assert.deepEqual(added, [])

  for (const [file, digest] of Object.entries(parent)) {
    let value = fs.readFileSync(file)
    for (const change of changes.filter(item => path.join(root, item.file) === file).reverse()) {
      const source = value.toString('utf8')
      assert.equal(source.split(change.after).length - 1, change.count, file + ': replacement count changed')
      value = Buffer.from(source.split(change.after).join(change.before))
    }
    assert.equal(hash(value), digest, 'Unexpected parent change: ' + file)
  }

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const client = fs.readFileSync(path.join(root, 'public', 'style-admin-controls-v618.js'), 'utf8')
  const service = fs.readFileSync(path.join(root, 'style-admin-controls-v618.js'), 'utf8')
  assert.match(server, /style-admin-controls-v618\.js\?v=619-rerender1/)
  assert.match(server, /X-Lien-Style-Admin-Rerender', 'v619'/)
  assert.match(server, /X-Lien-Style-Admin-Controls', 'v618'/)
  assert.match(client, /let listSnapshot = null/)
  assert.match(client, /let listHydrationReady = false/)
  assert.match(client, /function listContentIsCurrent\(\)/)
  assert.match(client, /function restoreListContent\(\)/)
  assert.match(client, /data-orimia-style-content-v619/)
  assert.match(client, /if \(listSnapshot\) \{/)
  assert.match(client, /setTimeout\(activateList, 3000\)/)
  assert.match(client, /selectMarkup\('staff'/)
  assert.doesNotMatch(client, /selectMarkup\('age'/)
  assert.doesNotMatch(client, /input name="stylist(?:Name|Kana|Role)"/)
  assert.match(service, /"styleStaffKey"=\$2/)
  assert.match(service, /-'stylistName'-'stylistKana'-'stylistRole'/)

  console.log(JSON.stringify({
    protectedFiles: Object.keys(parent).length,
    modified,
    added,
    rerenderRecovery: true,
    v618FeaturesPreserved: true,
  }))
}
