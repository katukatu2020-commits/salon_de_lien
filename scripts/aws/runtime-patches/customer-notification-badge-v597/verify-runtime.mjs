import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
const hash = v => crypto.createHash('sha256').update(v).digest('hex')
const manifest = '/tmp/notification-v597-parent.json'
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]) }
if (process.argv[2] === 'snapshot') {
  const targets = [...files('/app/.next'), ...files('/app/public'), ...fs.readdirSync('/app').filter(f => /\.(js|css)$/.test(f)).map(f => '/app/' + f)]
  fs.writeFileSync(manifest, JSON.stringify(Object.fromEntries(targets.map(f => [f, hash(fs.readFileSync(f))]))))
} else {
  const parent = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  const changes = JSON.parse(fs.readFileSync('/tmp/notification-v597-changes.json', 'utf8'))
  for (const c of changes) {
    assert.ok(['customer-experience-v508.js', 'customer-experience-v503.js', 'public/shell-consistency-v518.css', 'server.js'].includes(c.file))
  }
  const dir = '/app/.next/static/chunks/app/u/(account)/'
  const oldChunk = fs.readFileSync(dir + 'layout-customer-mobile-nav-v425.chat-send-only-v547.js', 'utf8')
  const newChunk = fs.readFileSync(dir + 'layout-customer-mobile-nav-v425.notification-badge-v597.js', 'utf8')
  assert.equal(newChunk, oldChunk.replace('/customer-experience-v503.js?v=546-navigation-privacy1', '/customer-experience-v503.js?v=597-notification-badge1'))
  for (const [file, digest] of Object.entries(parent)) {
    let value = fs.readFileSync(file)
    const scoped = changes.filter(c => '/app/' + c.file === file).reverse()
    if (scoped.length) {
      let source = value.toString('utf8')
      for (const c of scoped) { assert.equal(source.split(c.after).length, c.count + 1, file); source = source.split(c.after).join(c.before) }
      value = Buffer.from(source)
    }
    assert.equal(hash(value), digest, 'Unexpected change: ' + file)
  }
  console.log(JSON.stringify({ protectedFiles: Object.keys(parent).length, notificationDataAndReceiptsUnchanged: true }))
}
