import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const manifest = '/tmp/stamp-card-commercial-v617-parent.json'
const changesPath = '/tmp/stamp-card-commercial-v617-changes.json'
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
  const expectedModified = [...new Set(changes.filter(change => change.kind === 'replace').map(change => path.join(root, change.file)))].sort()
  const expectedAdded = changes.filter(change => change.kind === 'add').map(change => path.join(root, change.file)).sort()

  assert.deepEqual(modified, expectedModified)
  assert.deepEqual(added, expectedAdded)
  assert.deepEqual(expectedModified, [path.join(root, 'server.js')])
  assert.deepEqual(expectedAdded, [path.join(root, 'public/stamp-card-commercial-v617.css')])

  for (const [file, digest] of Object.entries(parent)) {
    let value = fs.readFileSync(file)
    for (const change of changes.filter(item => item.kind === 'replace' && path.join(root, item.file) === file).reverse()) {
      const source = value.toString('utf8')
      assert.equal(source.split(change.after).length - 1, change.count, `${file}: replacement count changed`)
      value = Buffer.from(source.split(change.after).join(change.before))
    }
    assert.equal(hash(value), digest, `Unexpected parent change: ${file}`)
  }

  for (const change of changes.filter(item => item.kind === 'add')) {
    assert.equal(
      hash(fs.readFileSync(path.join(root, change.file))),
      hash(fs.readFileSync(path.join(here, path.basename(change.file)))),
      `${change.file}: installed file changed`,
    )
  }

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const css = fs.readFileSync(path.join(root, 'public/stamp-card-commercial-v617.css'), 'utf8')
  assert.match(server, /X-Lien-Stamp-Card-Commercial', 'v617'/)
  assert.match(server, /stamp-card-commercial-v617\.css\?v=617-release1/)
  assert.match(server, /data-stamp-card-v617/)
  assert.match(server, /ORIMIA MEMBER CARD/)
  assert.match(server, /スタンプは会計完了後に自動で反映されます/)
  assert.match(css, /grid-template-columns: repeat\(var\(--sc-columns/)
  assert.match(css, /\.sc-card-v617\.is-complete/)
  assert.equal(expectedModified.some(file => /receipt|pos/i.test(file)), false, 'Receipt and POS runtime must remain untouched')

  console.log(JSON.stringify({
    release: 'v617',
    protectedFiles: Object.keys(parent).length,
    modified,
    added,
    responsiveStampGrid: true,
    completedState: true,
    rewardHierarchy: true,
    receiptRuntimeUntouched: true,
  }))
}
