import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const manifest = '/tmp/hotpepper-menu-import-v612-parent.json'
const changesPath = '/tmp/hotpepper-menu-import-v612-changes.json'
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
  const expectedAdded = [
    path.join(root, 'hotpepper-menu-import-v612.js'),
    path.join(root, 'hotpepper-menu-parser-v612.js'),
    path.join(root, 'public', 'hotpepper-menu-import-v612.js'),
    path.join(root, 'public', 'hotpepper-menu-import-v612.css'),
  ].sort()

  assert.deepEqual(modified, [path.join(root, 'server.js')])
  assert.deepEqual(added, expectedAdded)

  for (const [file, digest] of Object.entries(parent)) {
    let value = fs.readFileSync(file)
    for (const change of changes.filter(item => item.kind === 'replace' && path.join(root, item.file) === file).reverse()) {
      const source = value.toString('utf8')
      assert.equal(source.split(change.after).length - 1, change.count, `${file}: replacement count changed`)
      value = Buffer.from(source.split(change.after).join(change.before))
    }
    assert.equal(hash(value), digest, `Unexpected parent change: ${file}`)
  }

  for (const [sourceName, targetName] of [
    ['hotpepper-menu-parser-v612.js', 'hotpepper-menu-parser-v612.js'],
    ['hotpepper-menu-import-v612.js', 'hotpepper-menu-import-v612.js'],
    ['hotpepper-menu-import-v612-client.js', 'public/hotpepper-menu-import-v612.js'],
    ['hotpepper-menu-import-v612.css', 'public/hotpepper-menu-import-v612.css'],
  ]) {
    assert.equal(
      hash(fs.readFileSync(path.join(root, targetName))),
      hash(fs.readFileSync(path.join(here, sourceName))),
      `${targetName}: installed file changed`,
    )
  }

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const service = fs.readFileSync(path.join(root, 'hotpepper-menu-import-v612.js'), 'utf8')
  const client = fs.readFileSync(path.join(root, 'public', 'hotpepper-menu-import-v612.js'), 'utf8')
  assert.match(server, /createHotpepperMenuImportService/)
  assert.match(server, /hotpepperMenuImportV612\.handle/)
  assert.match(server, /orimia-hotpepper-menu-import-v612/)
  assert.match(server, /X-Lien-Hotpepper-Menu-Import', 'v612'/)
  assert.match(service, /INSERT INTO "SalonMenu"/)
  assert.match(service, /ON CONFLICT \("organizationId","name"\) DO NOTHING/)
  assert.match(client, /ホットペッパーから一括取り込み/)
  assert.match(client, /openConfirmation/)
  assert.match(client, /orimia-menu-import-progress-v612/)

  for (const [header, version] of [
    ['X-Lien-Style-Community-Rerender', 'v611'],
    ['X-Lien-Style-Community-Controls', 'v610'],
    ['X-Lien-Customer-Style-Gallery-Grid', 'v609'],
    ['X-Lien-Customer-Booking-Menu-Clearance', 'v607'],
    ['X-Lien-Stamp-Program', 'v603'],
    ['X-Lien-Style-System-Integration', 'v602'],
    ['X-Lien-Hotpepper-Style-Import', 'v600'],
    ['X-Lien-Daily-Sales-Print', 'v590'],
    ['X-Lien-Receipt-Pos-Direct', 'v582'],
  ]) assert.match(server, new RegExp(`${header}', '${version}`))

  console.log(JSON.stringify({
    protectedFiles: Object.keys(parent).length,
    modified,
    added,
    menuImportApi: true,
    confirmationAndProgress: true,
    receiptRuntimePreserved: true,
  }))
}
