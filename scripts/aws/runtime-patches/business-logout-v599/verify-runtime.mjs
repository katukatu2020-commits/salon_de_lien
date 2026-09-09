import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'

const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const manifest = '/tmp/business-logout-v599-parent.json'
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)])
}
const targets = [...files('/app/.next'), ...files('/app/public'), ...fs.readdirSync('/app').filter(f => /\.(js|css)$/.test(f)).map(f => '/app/' + f)]
if (process.argv[2] === 'snapshot') {
  fs.writeFileSync(manifest, JSON.stringify(Object.fromEntries(targets.map(f => [f, hash(fs.readFileSync(f))]))))
} else {
  const parent = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  const changes = JSON.parse(fs.readFileSync('/tmp/business-logout-v599-changes.json', 'utf8'))
  assert.deepEqual(changes.map(c => c.file).sort(), ['.next/server/app/api/auth/logout/route.js', 'server.js', 'wholesale-ordering-v543.js'])
  assert.deepEqual(targets.sort(), Object.keys(parent).sort(), 'No extra runtime files')
  for (const [file, digest] of Object.entries(parent)) {
    let value = fs.readFileSync(file)
    for (const c of changes.filter(c => '/app/' + c.file === file).reverse()) {
      const source = value.toString('utf8')
      assert.equal(source.split(c.after).length, 2, file)
      value = Buffer.from(source.replace(c.after, c.before))
    }
    assert.equal(hash(value), digest, 'Unexpected change: ' + file)
  }
  console.log(JSON.stringify({ protectedFiles: targets.length, customerLogoutAndReceiptsUnchanged: true }))
}
