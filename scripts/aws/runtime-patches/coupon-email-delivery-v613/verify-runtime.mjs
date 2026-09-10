import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const manifest = '/tmp/coupon-email-delivery-v613-parent.json'
const changesPath = '/tmp/coupon-email-delivery-v613-changes.json'
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
  const actionChange = changes.find(change => change.kind === 'replace' && change.file.includes('.next/server/chunks/'))
  assert.ok(actionChange, 'The customer broadcast action chunk was not recorded')

  const expectedModified = [
    path.join(root, 'server.js'),
    path.join(root, '.next/server/app/admin/customers/messages/page.js'),
    path.join(root, actionChange.file),
  ].sort()
  const expectedAdded = [
    path.join(root, 'public/coupon-email-delivery-v613.js'),
    path.join(root, 'public/coupon-email-delivery-v613.css'),
  ].sort()

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

  for (const [sourceName, targetName] of [
    ['coupon-email-delivery-v613.js', 'public/coupon-email-delivery-v613.js'],
    ['coupon-email-delivery-v613.css', 'public/coupon-email-delivery-v613.css'],
  ]) {
    assert.equal(
      hash(fs.readFileSync(path.join(root, targetName))),
      hash(fs.readFileSync(path.join(here, sourceName))),
      `${targetName}: installed file changed`,
    )
  }

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const action = fs.readFileSync(path.join(root, actionChange.file), 'utf8')
  const page = fs.readFileSync(path.join(root, '.next/server/app/admin/customers/messages/page.js'), 'utf8')
  const client = fs.readFileSync(path.join(root, 'public/coupon-email-delivery-v613.js'), 'utf8')

  assert.doesNotMatch(action, /対象者のうち\$\{e\}名に登録メールアドレスがありません/)
  assert.match(action, /matchedBeforeEmailFilter/)
  assert.match(action, /M = M\.filter\(\(e\) => String\(e\.appUsers\[0\]\?\.email/)
  assert.match(action, /error=no-email-recipients/)
  assert.match(action, /notice=email-partial/)
  assert.match(action, /deliveryFailureCount > 0/)
  assert.match(page, /data-recipient-email/)
  assert.match(page, /メール配信可能/)
  assert.match(page, /broadcast-email-eligibility-v613/)
  assert.match(page, /e\?\.notice === "email-partial"/)
  assert.match(client, /input\.disabled = disabled/)
  assert.match(client, /dataset\.recipientEmail !== '1'/)
  assert.match(server, /orimia-coupon-email-delivery-v613/)
  assert.match(server, /X-Lien-Coupon-Email-Delivery', 'v613'/)

  for (const [header, version] of [
    ['X-Lien-Hotpepper-Menu-Import', 'v612'],
    ['X-Lien-Style-Community-Rerender', 'v611'],
    ['X-Lien-Customer-Style-Detail', 'v605'],
    ['X-Lien-Stamp-Program', 'v603'],
    ['X-Lien-Daily-Sales-Print', 'v590'],
    ['X-Lien-Receipt-Pos-Direct', 'v582'],
  ]) assert.match(server, new RegExp(`${header}', '${version}`))

  console.log(JSON.stringify({
    release: 'v613',
    protectedFiles: Object.keys(parent).length,
    modified,
    added,
    emailEligibilityEnforced: true,
    partialFailuresReportedInPage: true,
    receiptRuntimePreserved: true,
  }))
}
