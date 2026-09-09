import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifest = '/tmp/customer-booking-menu-clearance-v607-parent.json'
const changesPath = '/tmp/customer-booking-menu-clearance-v607-changes.json'
const hash = value => crypto.createHash('sha256').update(value).digest('hex')

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes:true }).flatMap(entry => (
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

  assert.deepEqual(modified, [
    path.join(root, 'public', 'customer-journey-v601.css'),
    path.join(root, 'server.js'),
  ].sort())
  assert.deepEqual(added, [])

  for (const [file, digest] of Object.entries(parent)) {
    let value = fs.readFileSync(file)
    for (const change of changes.filter(item => path.join(root, item.file) === file).reverse()) {
      const source = value.toString('utf8')
      if (change.kind === 'append') {
        assert.ok(source.endsWith(change.addition), `${file}: appended patch is missing`)
        value = Buffer.from(source.slice(0, -change.addition.length))
      } else {
        assert.equal(source.split(change.after).length - 1, change.count, `${file}: replacement count changed`)
        value = Buffer.from(source.split(change.after).join(change.before))
      }
    }
    assert.equal(hash(value), digest, `Unexpected parent change: ${file}`)
  }

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const css = fs.readFileSync(path.join(root, 'public', 'customer-journey-v601.css'), 'utf8')

  assert.equal((css.match(/customer-booking-menu-clearance-v607/g) || []).length, 1)
  assert.match(css, /--cj-booking-bottom-nav-height:\s*calc\(64px \+ env\(safe-area-inset-bottom\)\)/)
  assert.match(css, /--cj-booking-action-height:\s*67px/)
  assert.match(css, /--cj-booking-action-gap:\s*24px/)
  assert.match(css, /padding-bottom:\s*var\(--cj-booking-bottom-clearance\) !important/)
  assert.match(css, /body:has\(\.customer-premium-topbar\):not\(#customer-premium-shell\)/)
  assert.match(css, /body#customer-premium-shell main\.cj-main/)
  assert.match(server, /customer-journey-v601\.css\?v=607-booking-clearance1/)
  assert.match(server, /X-Lien-Customer-Booking-Menu-Clearance', 'v607'/)

  for (const [header, version] of [
    ['X-Lien-Customer-Style-First-Paint', 'v606'],
    ['X-Lien-Customer-Style-Detail', 'v605'],
    ['X-Lien-Customer-Mypage-Navigation', 'v604'],
    ['X-Lien-Stamp-Program', 'v603'],
    ['X-Lien-Style-System-Integration', 'v602'],
    ['X-Lien-Customer-Journey', 'v601'],
    ['X-Lien-Daily-Sales-Print', 'v590'],
    ['X-Lien-Receipt-Pos-Direct', 'v582'],
    ['X-Lien-Customer-Booking-Check', 'v574'],
    ['X-Lien-Customer-Booking-Transition', 'v524'],
  ]) assert.match(server, new RegExp(`${header}', '${version}`))

  console.log(JSON.stringify({
    protectedFiles:Object.keys(parent).length,
    modified,
    added,
    mobileMenuClearance:true,
    safeAreaIncluded:true,
    bookingLogicPreserved:true,
    customerStyleV606Preserved:true,
  }))
}
