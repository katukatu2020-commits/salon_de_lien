import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-mypage-navigation-v604'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, before, after, count:expected })
}

const client = 'public/customer-journey-v601.js'
replaceExact(
  client,
  'data-cj-edit',
  'data-cj-profile-edit-action',
  4,
  'profile edit action attributes',
)
replaceExact(
  client,
  'main.dataset.cjEdit=String(edit)',
  'main.dataset.cjProfileEdit=String(edit)',
  1,
  'profile edit state attribute',
)

const server = 'server.js'
replaceExact(
  server,
  '<script id="customer-journey-v601" src="/customer-journey-v601.js" defer></script>',
  '<script id="customer-journey-v601" src="/customer-journey-v601.js?v=604-mypage-navigation1" defer></script>',
  1,
  'customer journey cache key',
)

const readinessAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Stamp-Program', 'v603') /* stamp-program-v603-ready */`
replaceExact(
  server,
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Mypage-Navigation', 'v604') /* ${marker}-ready */`,
  1,
  'mypage navigation readiness header',
)

fs.writeFileSync('/tmp/customer-mypage-navigation-v604-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release:marker, modified:[...new Set(changes.map(change => change.file))] }))
