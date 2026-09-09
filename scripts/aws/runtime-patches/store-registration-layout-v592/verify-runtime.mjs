import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
const root = '/app'
const manifest = '/tmp/store-registration-v592-parent.json'
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? files(file) : [file]
  })
}
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const billing = fs.readFileSync(root + '/billing.js', 'utf8').replace(/\r\n/g, '\n')
if (process.argv[2] === 'snapshot') {
  const protectedFiles = [...files(root + '/public'), ...files(root + '/.next'), ...fs.readdirSync(root).filter(file => file.endsWith('.js') || file.endsWith('.css')).map(file => root + '/' + file)]
  fs.writeFileSync(manifest, JSON.stringify({ files: Object.fromEntries(protectedFiles.map(file => [file, hash(file)])), before: billing.slice(0, billing.indexOf('  async function registrationPage(')), after: billing.slice(billing.indexOf('  function registrationRateLimited(')) }))
} else {
  const parent = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  for (const [file, digest] of Object.entries(parent.files)) {
    if (!['/app/server.js', '/app/billing.js'].includes(file)) assert.equal(hash(file), digest, 'unrelated file changed: ' + file)
  }
  assert.equal(billing.slice(0, billing.indexOf('  async function registrationPage(')), parent.before)
  assert.equal(billing.slice(billing.indexOf('  function registrationRateLimited(')), parent.after, 'registration/payment handlers must be unchanged')
  assert(billing.includes("require('./store-registration-v592.js').renderEntry"))
  assert(billing.includes("require('./store-registration-v592.js').renderPage"))
  console.log(JSON.stringify({ release: 'store-registration-layout-v592', registrationPostUnchanged: true, stripeAndEmailUnchanged: true, dealerAndReceiptUnchanged: true, protectedFiles: Object.keys(parent.files).length - 2 }))
}
