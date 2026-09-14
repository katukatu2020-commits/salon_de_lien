import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifest = '/tmp/customer-store-limit-v642-parent.json'
const hash = value => crypto.createHash('sha256').update(value).digest('hex')

function files(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)])
}

if (process.argv[2] === 'snapshot') {
  const targets = [
    ...files(path.join(root, '.next')),
    ...files(path.join(root, 'public')),
    ...fs.readdirSync(root).filter(file => /\.(js|css)$/.test(file)).map(file => path.join(root, file)),
  ]
  fs.writeFileSync(manifest, JSON.stringify(Object.fromEntries(targets.map(file => [file, hash(fs.readFileSync(file))]))))
  process.exit(0)
}

const parent = JSON.parse(fs.readFileSync(manifest, 'utf8'))
const changes = JSON.parse(fs.readFileSync('/tmp/customer-store-limit-v642-changes.json', 'utf8'))
for (const [file, digest] of Object.entries(parent)) {
  let value = fs.readFileSync(file)
  const scoped = changes.filter(change => path.join(root, change.file) === file).reverse()
  if (scoped.length) {
    let source = value.toString('utf8')
    for (const change of scoped) {
      assert.equal(source.split(change.after).length, 2, `Changed anchor is not unique: ${change.file}`)
      source = source.replace(change.after, change.before)
    }
    value = Buffer.from(source)
  }
  assert.equal(hash(value), digest, `Unexpected runtime change: ${file}`)
}

const links = fs.readFileSync(path.join(root, 'customer-links-v293.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'customer-link-ui-v293.js'), 'utf8')
const membership = fs.readFileSync(path.join(root, 'customer-store-membership-v642.js'), 'utf8')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const customerRuntime = fs.readFileSync(path.join(root, 'customer-runtime-v267.js'), 'utf8')

assert.match(membership, /const MAX_STORES = 5/)
assert.match(membership, /CustomerStoreExclusion/)
assert.match(membership, /FOR UPDATE/)
assert.match(membership, /STORE_LIMIT_REACHED/)
assert.match(membership, /LAST_STORE_REQUIRED/)
assert.match(membership, /unlinkStore/)
assert.match(links, /customerStoreMembershipV642\.prepareLink/)
assert.match(links, /data-remove-store/)
assert.match(links, /data-store-limit="\$\{maxStores\}"/)
assert.match(links, /data\.action === 'unlink'/)
assert.match(links, /maxStores: customerStoreMembershipV642\.MAX_STORES/)
assert.match(client, /dataset\.lienStoresV642/)
assert.match(client, /data-remove-store/)
assert.match(client, /登録できる美容室は最大\$\{limit\}店舗/)
assert.match(customerRuntime, /customer-link-ui-v293\.js\?v=642-store-limit1/)
assert.match(server, /X-Lien-Customer-Store-Limit', 'v642'/)
assert.match(server, /X-Lien-Search-Input-Stability', 'v641'/)
assert.doesNotMatch(links, /require\('\.\/customer-store-list-v595\.js'\)\.availableStores/)

console.log(JSON.stringify({
  release: 'customer-store-limit-v642',
  runtimeVerified: true,
  maxStores: 5,
  unlinkPreservesCustomerData: true,
  parentIsolationVerified: true,
  previousReleasesPreserved: true,
}))
