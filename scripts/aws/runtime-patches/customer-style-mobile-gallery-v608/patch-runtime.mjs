import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-style-mobile-gallery-v608'
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
  `      <section class="orimia-style-menus-v602"><h3>メニュー内容</h3>\${menuMarkup(style)}</section>`,
  `      \${audience === 'staff' ? \`<section class="orimia-style-menus-v602"><h3>メニュー内容</h3>\${menuMarkup(style)}</section>\` : ''}`,
  1,
  'customer duplicate menu removal',
)

replaceExact(
  client,
  `    if (audience === 'customer') {
      gallery.classList.add('orimia-style-gallery-stable-v605')`,
  `    if (audience === 'customer') {
      gallery.classList.add('orimia-style-gallery-stable-v605', 'orimia-style-gallery-mobile-v608')`,
  1,
  'mobile gallery marker',
)

replaceExact(
  client,
  `        photo.classList.add('orimia-style-photo-v605')
        if (positions[index]) photo.classList.add(positions[index])`,
  `        photo.classList.add('orimia-style-photo-v605')
        if (positions[index]) photo.classList.add(positions[index])
        const source = photo.getAttribute('href')
        if (source && photo.dataset.orimiaStyleImageRatioV608 !== 'loading' && photo.dataset.orimiaStyleImageRatioV608 !== 'ready') {
          photo.dataset.orimiaStyleImageRatioV608 = 'loading'
          const probe = new Image()
          probe.decoding = 'async'
          probe.addEventListener('load', () => {
            if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
              photo.style.setProperty('--orimia-style-photo-aspect-v608', \`\${probe.naturalWidth} / \${probe.naturalHeight}\`)
              photo.dataset.orimiaStyleImageRatioV608 = 'ready'
            }
          }, { once:true })
          probe.addEventListener('error', () => {
            photo.dataset.orimiaStyleImageRatioV608 = 'fallback'
          }, { once:true })
          probe.src = source
        }`,
  1,
  'natural photo ratio probe',
)

replaceExact(
  client,
  `    const gallery = markGallery(article)
    const content = article.querySelector('.community-feed-content') || article.querySelector(':scope > div:last-of-type')
    const meta = content?.querySelector('.community-feed-meta,.orimia-style-legacy-meta-v602') || content?.querySelector(':scope > div:first-child')
    if (!gallery || !content || !meta) return false
    meta.classList.add('orimia-style-legacy-meta-v602')
    meta.hidden = true
    meta.setAttribute('aria-hidden', 'true')
    meta.style.setProperty('display', 'none', 'important')`,
  `    const gallery = markGallery(article)
    const content = article.querySelector('.community-feed-content') || article.querySelector(':scope > div:last-of-type')
    const existingDetails = content?.querySelector('.orimia-style-details-v602')
    const meta = content?.querySelector('.community-feed-meta,.orimia-style-legacy-meta-v602')
      || content?.querySelector(':scope > div:first-child')
    if (!gallery || !content || (!meta && !existingDetails)) return false
    if (meta) {
      meta.classList.add('orimia-style-legacy-meta-v602')
      meta.hidden = true
      meta.setAttribute('aria-hidden', 'true')
      meta.style.setProperty('display', 'none', 'important')
    }`,
  1,
  'customer legacy metadata lifecycle',
)

replaceExact(
  client,
  `    const existingDetails = content.querySelector('.orimia-style-details-v602')
    if (existingDetails?.dataset.styleSignatureV602 !== signature) {
      existingDetails?.remove()
      meta.insertAdjacentHTML('afterend', detailsMarkup(style))`,
  `    if (existingDetails?.dataset.styleSignatureV602 !== signature) {
      existingDetails?.remove()
      if (meta) meta.insertAdjacentHTML('afterend', detailsMarkup(style))
      else content.insertAdjacentHTML('afterbegin', detailsMarkup(style))`,
  1,
  'metadata-independent detail insertion',
)

replaceExact(
  client,
  `    }
    suppressLegacy(article)
    revealStyleV606('ready')`,
  `    }
    if (audience === 'customer') meta?.remove()
    suppressLegacy(article)
    revealStyleV606('ready')`,
  1,
  'remove customer legacy metadata node',
)

const cssAddition = `\n\n${fs.readFileSync(path.join(here, 'customer-style-mobile-gallery-v608.css'), 'utf8').trim()}\n`
appendExact('public/style-system-integration-v602.css', cssAddition, 'mobile complete-image layout')

const server = 'server.js'
replaceExact(server, '/style-system-integration-v602.css?v=606-first-paint1', '/style-system-integration-v602.css?v=608-mobile-gallery1', 1, 'style CSS cache key')
replaceExact(server, '/style-system-integration-v602.js?v=606-first-paint1', '/style-system-integration-v602.js?v=608-mobile-gallery1', 1, 'style client cache key')

const readinessAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Menu-Clearance', 'v607') /* customer-booking-menu-clearance-v607-ready */`
replaceExact(
  server,
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Style-Mobile-Gallery', 'v608') /* ${marker}-ready */`,
  1,
  'mobile gallery readiness header',
)

fs.writeFileSync('/tmp/customer-style-mobile-gallery-v608-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release:marker, modified:[...new Set(changes.map(change => change.file))] }))
