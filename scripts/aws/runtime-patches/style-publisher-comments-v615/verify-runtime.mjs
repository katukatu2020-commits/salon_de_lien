import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const manifest = '/tmp/style-publisher-comments-v615-parent.json'
const changesPath = '/tmp/style-publisher-comments-v615-changes.json'
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
  const expectedModified = [...new Set(changes.filter(change => change.kind === 'replace').map(change => path.join(root, change.file)))].sort()
  const expectedAdded = [path.join(root, 'public/content-edit-delete-client-v615.js')]

  assert.deepEqual(modified, expectedModified)
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

  assert.equal(
    hash(fs.readFileSync(path.join(root, 'public/content-edit-delete-client-v615.js'))),
    hash(fs.readFileSync(path.join(here, 'content-edit-delete-client-v615.js'))),
    'installed community client changed',
  )

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const client = fs.readFileSync(path.join(root, 'public/content-edit-delete-client-v615.js'), 'utf8')
  const changedChunks = expectedModified.filter(file => file.includes(`${path.sep}chunks${path.sep}`))
  const publisherChunks = changedChunks
    .map(file => fs.readFileSync(file, 'utf8'))
    .filter(source => source.includes('customerName:s.organization?.name?.trim()||"店舗"'))

  assert.equal(publisherChunks.length, 2)
  for (const source of publisherChunks) {
    assert.match(source, /organization:\{select:\{name:!0\}\}/)
    assert.doesNotMatch(source, /customerName:"STORE"===s\.postKind\?"ORIMIA"/)
  }
  assert.match(client, /window\.__lienStyleCommunityControlsV615 = true/)
  assert.match(client, /DOMContentLoaded/)
  assert.doesNotMatch(client, /window\.addEventListener\("load", afterLoad/)
  assert.match(client, /lienOwnedCommentMenuCountV615/)
  assert.match(client, /data-lien-customer-comment-menu="v615"/)
  assert.match(client, /aria-haspopup/)
  assert.match(client, /コメントの操作/)
  assert.match(client, /コメントを編集/)
  assert.match(client, /コメントを削除/)
  assert.match(server, /X-Lien-Style-Publisher-Comments', 'v615'/)
  for (const [header, version] of [
    ['X-Lien-Customer-Current-Appointment', 'v614'],
    ['X-Lien-Coupon-Email-Delivery', 'v613'],
    ['X-Lien-Style-Community-Rerender', 'v611'],
    ['X-Lien-Style-System-Integration', 'v602'],
    ['X-Lien-Receipt-Pos-Direct', 'v582'],
  ]) assert.match(server, new RegExp(`${header}', '${version}`))

  console.log(JSON.stringify({
    release:'v615',
    protectedFiles:Object.keys(parent).length,
    modified,
    added,
    organizationPublisher:true,
    domReadyActivation:true,
    ownedCommentMenuRecovery:true,
  }))
}
