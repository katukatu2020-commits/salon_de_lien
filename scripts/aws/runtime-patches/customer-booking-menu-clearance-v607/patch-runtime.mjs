import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-booking-menu-clearance-v607'
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, match => match.slice(1)))
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind:'replace', file, before, after, count:expected })
}

function appendExact(file, addition, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  if (source.includes(addition.trim())) throw new Error(`${label}: patch already exists`)
  fs.writeFileSync(target, source + addition)
  changes.push({ kind:'append', file, addition })
}

const cssAddition = `\n\n${fs.readFileSync(path.join(here, 'customer-booking-menu-clearance-v607.css'), 'utf8').trim()}\n`
appendExact('public/customer-journey-v601.css', cssAddition, 'booking bottom clearance')

const server = 'server.js'
replaceExact(
  server,
  '<link rel="stylesheet" href="/customer-journey-v601.css"><script id="customer-journey-v601" src="/customer-journey-v601.js?v=604-mypage-navigation1" defer></script>',
  '<link rel="stylesheet" href="/customer-journey-v601.css?v=607-booking-clearance1"><script id="customer-journey-v601" src="/customer-journey-v601.js?v=604-mypage-navigation1" defer></script>',
  1,
  'customer journey stylesheet cache key',
)

const readinessAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Style-First-Paint', 'v606') /* customer-style-first-paint-v606-ready */`
replaceExact(
  server,
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Menu-Clearance', 'v607') /* ${marker}-ready */`,
  1,
  'booking clearance readiness header',
)

fs.writeFileSync('/tmp/customer-booking-menu-clearance-v607-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release:marker, modified:[...new Set(changes.map(change => change.file))] }))
