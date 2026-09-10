import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifest = '/tmp/style-community-rerender-v611-parent.json'
const changesPath = '/tmp/style-community-rerender-v611-changes.json'
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
    path.join(root, 'public', 'style-community-controls-v610.js'),
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
  const client = fs.readFileSync(path.join(root, 'public', 'style-community-controls-v610.js'), 'utf8')
  assert.match(server, /style-community-controls-v610\.js\?v=611-rerender1/)
  assert.match(server, /X-Lien-Style-Community-Rerender', 'v611'/)
  assert.match(server, /X-Lien-Style-Community-Controls', 'v610'/)
  assert.match(client, /function suppressLegacyLists\(\)/)
  assert.match(client, /const legacyFilter = suppressLegacyLists\(\)/)
  assert.match(client, /if \(listRoot && listRoot\.isConnected\) return/)
  assert.doesNotMatch(client, /normalizedPath\(\) !== LIST_PATH \|\| \(listRoot && listRoot\.isConnected\)/)

  for (const [header, version] of [
    ['X-Lien-Customer-Style-Gallery-Grid', 'v609'],
    ['X-Lien-Customer-Style-Mobile-Gallery', 'v608'],
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
  ]) assert.match(server, new RegExp(header + "', '" + version))

  console.log(JSON.stringify({
    protectedFiles: Object.keys(parent).length,
    modified,
    added,
    rerenderSuppression: true,
    v610FeaturesPreserved: true,
  }))
}
