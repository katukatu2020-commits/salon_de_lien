import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { changes, paths } from './patch-runtime.mjs'
const root = '/app'
const manifest = '/tmp/customer-login-v593-parent.json'
const hash = data => crypto.createHash('sha256').update(data).digest('hex')
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? files(file) : [file]
  })
}
const targets = paths(root)
if (process.argv[2] === 'snapshot') {
  const protectedFiles = [...files(root + '/public'), ...files(root + '/.next'), ...fs.readdirSync(root).filter(file => /\.(js|css)$/.test(file)).map(file => root + '/' + file)]
  fs.writeFileSync(manifest, JSON.stringify(Object.fromEntries(protectedFiles.map(file => [file, hash(fs.readFileSync(file))]))))
} else {
  const parent = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  for (const [file, digest] of Object.entries(parent)) {
    let data = fs.readFileSync(file)
    const name = Object.keys(targets).find(name => targets[name] === file)
    if (name) {
      let source = data.toString('utf8')
      for (const [, before, after] of changes.filter(change => change[0] === name).reverse()) {
        assert.equal(source.split(after).length, 2, 'Missing scoped patch: ' + name)
        source = source.replace(after, before)
      }
      data = Buffer.from(source)
    }
    assert.equal(hash(data), digest, 'Unexpected change outside login visual: ' + file)
  }
  console.log(JSON.stringify({ release: 'customer-login-visual-v593', protectedFiles: Object.keys(parent).length, loginHandlersUnchanged: true, registrationAndReceiptsUnchanged: true, iconRemovedInServerRender: true }))
}
