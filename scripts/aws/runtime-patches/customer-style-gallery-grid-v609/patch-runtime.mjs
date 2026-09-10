import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-style-gallery-grid-v609'
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

const client = 'public/style-system-integration-v602.js'
replaceExact(
  client,
  `      gallery.classList.add('orimia-style-gallery-stable-v605', 'orimia-style-gallery-mobile-v608')`,
  `      gallery.classList.add('orimia-style-gallery-stable-v605', 'orimia-style-gallery-mobile-v608', 'orimia-style-gallery-grid-v609')
      gallery.classList.toggle('is-single-v609', photos.length === 1)
      gallery.classList.toggle('is-multiple-v609', photos.length > 1)
      gallery.classList.toggle('is-odd-v609', photos.length > 1 && photos.length % 2 === 1)`,
  1,
  'gallery count layout classes',
)

const cssAddition = `\n\n${fs.readFileSync(path.join(here, 'customer-style-gallery-grid-v609.css'), 'utf8').trim()}\n`
appendExact('public/style-system-integration-v602.css', cssAddition, 'count-aware mobile gallery grid')

const server = 'server.js'
replaceExact(server, '/style-system-integration-v602.css?v=608-mobile-gallery1', '/style-system-integration-v602.css?v=609-gallery-grid1', 1, 'style CSS cache key')
replaceExact(server, '/style-system-integration-v602.js?v=608-mobile-gallery1', '/style-system-integration-v602.js?v=609-gallery-grid1', 1, 'style client cache key')

const readinessAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Style-Mobile-Gallery', 'v608') /* customer-style-mobile-gallery-v608-ready */`
replaceExact(
  server,
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Style-Gallery-Grid', 'v609') /* ${marker}-ready */`,
  1,
  'gallery grid readiness header',
)

fs.writeFileSync('/tmp/customer-style-gallery-grid-v609-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release:marker, modified:[...new Set(changes.map(change => change.file))] }))
