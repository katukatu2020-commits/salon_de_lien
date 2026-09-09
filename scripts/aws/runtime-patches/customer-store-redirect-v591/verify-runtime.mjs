import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
const root = '/app'
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? files(file) : [file]
  })
}
const manifestPath = '/tmp/customer-session-v591-parent.json'
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')
if (process.argv[2] === 'snapshot') {
  const protectedFiles = [...files(root + '/public'), ...files(root + '/.next/server'), ...fs.readdirSync(root).filter(file => file.endsWith('.js')).map(file => root + '/' + file)]
  fs.writeFileSync(manifestPath, JSON.stringify(Object.fromEntries(protectedFiles.map(file => [path.relative(root, file), hash(path.relative(root, file))]))))
} else {
  const changed = JSON.parse(fs.readFileSync('/tmp/customer-session-v591-changed.json', 'utf8'))
  assert.equal(changed.length, 16)
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  let unchanged = 0
  for (const [file, digest] of Object.entries(manifest)) {
    if (changed.includes(file)) {
      assert.notEqual(hash(file), digest)
      execFileSync(process.execPath, ['--check', path.join(root, file)])
    } else { assert.equal(hash(file), digest, 'unrelated runtime changed: ' + file); unchanged++ }
  }
  assert(!changed.some(file => /receipt|print|public\//i.test(file)))
  assert.equal(changed.filter(file => file.startsWith('.next/')).length, 14)
  const server = fs.readFileSync(root + '/server.js', 'utf8')
  assert(server.includes("return require('./customer-session-v591.js').resolveCustomerSession(prisma, value)"))
  for (const file of changed.filter(file => file.startsWith('.next/'))) {
    assert(fs.readFileSync(path.join(root, file), 'utf8').includes('require("/app/customer-session-v591.js").resolveCustomerSession(a._,e)'))
  }
  console.log(JSON.stringify({ release: 'customer-store-redirect-v591', unchangedFiles: unchanged, receiptAndReportUntouched: true, sharedSessionPolicy: true }))
}
