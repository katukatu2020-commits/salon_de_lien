import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifest = '/tmp/customer-mypage-navigation-v604-parent.json'
const changesPath = '/tmp/customer-mypage-navigation-v604-changes.json'
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
    path.join(root, 'public', 'customer-journey-v601.js'),
    path.join(root, 'server.js'),
  ].sort())
  assert.deepEqual(added, [])

  for (const [file, digest] of Object.entries(parent)) {
    let value = fs.readFileSync(file)
    for (const change of changes.filter(item => path.join(root, item.file) === file).reverse()) {
      const source = value.toString('utf8')
      assert.equal(source.split(change.after).length - 1, change.count, `${file}: replacement count changed`)
      value = Buffer.from(source.split(change.after).join(change.before))
    }
    assert.equal(hash(value), digest, `Unexpected parent change: ${file}`)
  }

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const client = fs.readFileSync(path.join(root, 'public', 'customer-journey-v601.js'), 'utf8')

  assert.match(server, /X-Lien-Customer-Mypage-Navigation', 'v604'/)
  assert.match(server, /customer-journey-v601\.js\?v=604-mypage-navigation1/)
  assert.equal((client.match(/data-cj-profile-edit-action/g) || []).length, 4)
  assert.equal((client.match(/data-cj-edit/g) || []).length, 0)
  assert.match(client, /main\.dataset\.cjProfileEdit=String\(edit\)/)
  assert.doesNotMatch(client, /main\.dataset\.cjEdit=/)
  assert.match(client, /\['\/u\/history','来店履歴'\]/)
  assert.match(client, /\['\/u\/reviews','購入商品・アンケート'\]/)
  assert.match(client, /\['\/u\/catalog\?category=favorites','お気に入りアイテム'\]/)
  assert.match(client, /\['\/u\/stores','登録済みの店舗'\]/)
  assert.match(client, /\['\/u\/sms-settings','通知設定'\]/)
  assert.match(client, /action="\/api\/customer-auth\/logout" method="post"/)

  for (const [header, version] of [
    ['X-Lien-Stamp-Program', 'v603'],
    ['X-Lien-Style-System-Integration', 'v602'],
    ['X-Lien-Customer-Journey', 'v601'],
    ['X-Lien-Hotpepper-Style-Import', 'v600'],
    ['X-Lien-Daily-Sales-Print', 'v590'],
    ['X-Lien-Receipt-Pos-Direct', 'v582'],
  ]) assert.match(server, new RegExp(`${header}', '${version}`))

  console.log(JSON.stringify({
    protectedFiles:Object.keys(parent).length,
    modified,
    added,
    isolatedEditAction:true,
    uniqueDestinationsPreserved:true,
    receiptAndDailySalesPrintPreserved:true,
  }))
}
