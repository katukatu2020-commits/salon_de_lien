import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const manifest = '/tmp/customer-booking-confirmation-v616-parent.json'
const changesPath = '/tmp/customer-booking-confirmation-v616-changes.json'
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
  const bookingClient = fs.readFileSync(path.join(root, 'public/customer-booking-confirmation-v616.js'), 'utf8')
  const couponService = fs.readFileSync(path.join(root, 'customer-booking-coupon-v616.js'), 'utf8')
  const cancellationService = fs.readFileSync(path.join(root, 'customer-appointment-cancellation-v616.js'), 'utf8')
  assert.match(server, /X-Lien-Customer-Booking-Confirmation', 'v616'/)
  assert.match(server, /require\('\.\/customer-booking-coupon-v616'\)/)
  assert.match(server, /require\('\.\/customer-appointment-cancellation-v616'\)/)
  assert.match(server, /customer-booking-confirmation-v616\.js\?v=616-release1/)
  assert.match(bookingClient, /利用するクーポン/)
  assert.match(bookingClient, /お支払い目安/)
  assert.match(bookingClient, /予約日の前日まで/)
  assert.match(bookingClient, /data-customer-appointment-at/)
  assert.match(couponService, /coupons/)
  assert.match(couponService, /c\."organizationId"=\$2/)
  assert.match(cancellationService, /CURRENT_TIMESTAMP<\$4::timestamptz/)
  assert.match(cancellationService, /customerCancellationDeadline/)

  const appointmentFiles = expectedModified.filter(file => /appointments[\\/]page|appointments[\\/].*current-cancel-v374/.test(file))
  assert.equal(appointmentFiles.length, 2)
  for (const file of appointmentFiles) {
    assert.match(fs.readFileSync(file, 'utf8'), /"data-customer-appointment-at":e\.scheduledAt/)
  }
  assert.equal(expectedModified.some(file => /receipt/i.test(file)), false, 'Receipt runtime must remain untouched')

  console.log(JSON.stringify({
    release: 'v616',
    protectedFiles: Object.keys(parent).length,
    modified,
    added,
    couponSelection: true,
    amountSummary: true,
    cancellationCutoff: true,
    receiptRuntimeUntouched: true,
  }))
}
