import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const manifest = '/tmp/customer-current-appointment-v614-parent.json'
const changesPath = '/tmp/customer-current-appointment-v614-changes.json'
const hash = value => crypto.createHash('sha256').update(value).digest('hex')

const appointmentsPage = '.next/server/app/u/(account)/appointments/page.js'
const homePage = '.next/server/app/u/(account)/home/page.js'
const checkoutPage = '.next/server/app/admin/appointments/[appointmentId]/page.js'
const prettyActions = '.next/server/chunks/1608.js'
const minifiedActions = '.next/server/chunks/2241.js'

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

  const expectedModified = [
    path.join(root, 'server.js'),
    path.join(root, appointmentsPage),
    path.join(root, homePage),
    path.join(root, checkoutPage),
    path.join(root, prettyActions),
    path.join(root, minifiedActions),
  ].sort()
  const expectedAdded = [path.join(root, 'customer-summary-v614.js')]

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
    hash(fs.readFileSync(path.join(root, 'customer-summary-v614.js'))),
    hash(fs.readFileSync(path.join(here, 'customer-summary-v614.js'))),
    'customer-summary-v614.js: installed file changed',
  )

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const appointments = fs.readFileSync(path.join(root, appointmentsPage), 'utf8')
  const home = fs.readFileSync(path.join(root, homePage), 'utf8')
  const checkout = fs.readFileSync(path.join(root, checkoutPage), 'utf8')
  const readableAction = fs.readFileSync(path.join(root, prettyActions), 'utf8')
  const minifiedAction = fs.readFileSync(path.join(root, minifiedActions), 'utf8')
  const summary = fs.readFileSync(path.join(root, 'customer-summary-v614.js'), 'utf8')

  for (const page of [appointments, home]) {
    assert.match(page, /serviceSales:\{none:\{\}\}/)
    for (const status of ['キャンセル済み', '来店済み', '来店完了', '会計済み', '会計完了', 'completed']) {
      assert.ok(page.includes(`"${status}"`), `Missing terminal status: ${status}`)
    }
  }

  for (const output of [checkout, readableAction, minifiedAction]) {
    for (const route of ['/u/home', '/u/appointments', '/u/mypage']) {
      assert.ok(output.includes(`revalidatePath)("${route}")`), `Missing customer revalidation: ${route}`)
    }
  }

  assert.match(summary, /NOT EXISTS/)
  assert.match(summary, /"ServiceSale"/)
  assert.match(summary, /LOWER\(BTRIM\(COALESCE/)
  assert.match(server, /customerSummaryV614/)
  assert.doesNotMatch(server, /customerSummaryV601/)
  assert.match(server, /X-Lien-Customer-Current-Appointment', 'v614'/)

  for (const [header, version] of [
    ['X-Lien-Coupon-Email-Delivery', 'v613'],
    ['X-Lien-Hotpepper-Menu-Import', 'v612'],
    ['X-Lien-Style-Community-Rerender', 'v611'],
    ['X-Lien-Customer-Style-Detail', 'v605'],
    ['X-Lien-Stamp-Program', 'v603'],
    ['X-Lien-Customer-Journey', 'v601'],
    ['X-Lien-Daily-Sales-Print', 'v590'],
    ['X-Lien-Receipt-Pos-Direct', 'v582'],
  ]) assert.match(server, new RegExp(`${header}', '${version}`))

  console.log(JSON.stringify({
    release: 'v614',
    protectedFiles: Object.keys(parent).length,
    modified,
    added,
    terminalStatusesExcluded: true,
    linkedSalesExcluded: true,
    customerCachesInvalidated: true,
    receiptRuntimePreserved: true,
  }))
}
