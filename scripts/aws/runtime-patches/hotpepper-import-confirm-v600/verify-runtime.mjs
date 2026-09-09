import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const manifest = '/tmp/hotpepper-v600-parent.json'
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]) }
const targets = [...files('/app/.next'), ...files('/app/public'), ...fs.readdirSync('/app').filter(f => /\.(js|css)$/.test(f)).map(f => '/app/' + f)]
if (process.argv[2] === 'snapshot') fs.writeFileSync(manifest, JSON.stringify(Object.fromEntries(targets.map(f => [f, hash(fs.readFileSync(f))]))))
else {
  const parent = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  const changes = JSON.parse(fs.readFileSync('/tmp/hotpepper-v600-changes.json', 'utf8'))
  assert.deepEqual([...new Set(changes.map(c => c.file))].sort(), ['commercial-admin-v101.js', 'community-publishing-client-v566.js', 'community-publishing-v566.js', 'server.js'])
  assert.deepEqual(targets.filter(f => !parent[f]).sort(), ['/app/hotpepper-import-v600.js', '/app/hotpepper-origin-v600.js'])
  for (const [file, digest] of Object.entries(parent)) {
    let value = fs.readFileSync(file)
    for (const c of changes.filter(c => '/app/' + c.file === file).reverse()) {
      const source = value.toString('utf8'); assert.equal(source.split(c.after).length, 2, file)
      value = Buffer.from(source.replace(c.after, c.before))
    }
    assert.equal(hash(value), digest, 'Unexpected change: ' + file)
  }
  console.log(JSON.stringify({ protectedFiles: Object.keys(parent).length, receiptsLogoutAndCustomerAppUnchanged: true }))
}
