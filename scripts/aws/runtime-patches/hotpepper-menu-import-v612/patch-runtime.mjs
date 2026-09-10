import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'hotpepper-menu-import-v612'
const here = path.dirname(fileURLToPath(import.meta.url))
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind: 'replace', file, before, after, count })
}

function addFile(sourceName, targetName) {
  const target = path.join(root, targetName)
  if (fs.existsSync(target)) throw new Error(`${targetName}: target already exists`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(path.join(here, sourceName), target)
  changes.push({ kind: 'add', file: targetName })
}

addFile('hotpepper-menu-parser-v612.js', 'hotpepper-menu-parser-v612.js')
addFile('hotpepper-menu-import-v612.js', 'hotpepper-menu-import-v612.js')
addFile('hotpepper-menu-import-v612-client.js', 'public/hotpepper-menu-import-v612.js')
addFile('hotpepper-menu-import-v612.css', 'public/hotpepper-menu-import-v612.css')

const serviceAnchor = [
  "const styleCommunityControlsV610 = require('./style-community-controls-v610').createStyleCommunityControlsService({",
  '  prisma,',
  "  staffSessionProvider: req => chatSession(req, 'staff'),",
  "  customerSessionProvider: req => chatSession(req, 'customer'),",
  '}) /* style-community-controls-v610-service */',
].join('\n')
const serviceReplacement = [
  serviceAnchor,
  "const hotpepperMenuImportV612 = require('./hotpepper-menu-import-v612').createHotpepperMenuImportService({",
  '  prisma,',
  "  sessionProvider: req => chatSession(req, 'staff'),",
  `}) /* ${marker}-service */`,
].join('\n')
replaceExact('server.js', serviceAnchor, serviceReplacement, 1, 'menu import service')

const transformAnchor = "  const styleCommunityRouteV602 = /^\\/(?:admin|u)\\/community(?:\\/[^/]+)?\\/?$/.test(pathname)"
replaceExact(
  'server.js',
  transformAnchor,
  `${transformAnchor}\n  const hotpepperMenuRouteV612 = pathname === '/admin/products' /* ${marker}-asset-route */`,
  1,
  'menu import asset route',
)

const assetAnchor = "  if (styleCommunityRouteV602 && !output.includes('orimia-style-system-v602')) {"
const assetBlock = [
  `  if (hotpepperMenuRouteV612 && !output.includes('orimia-hotpepper-menu-import-v612')) {`,
  `    output = output.replace('</head>', '<link id="orimia-hotpepper-menu-import-v612-style" rel="stylesheet" href="/hotpepper-menu-import-v612.css?v=612-release1"><script id="orimia-hotpepper-menu-import-v612" src="/hotpepper-menu-import-v612.js?v=612-release1" defer></script></head>')`,
  '  }',
  assetAnchor,
].join('\n')
replaceExact('server.js', assetAnchor, assetBlock, 1, 'menu import assets')

const routeAnchor = '      if (await hotpepperStyles.handle(req, res, url)) return'
replaceExact(
  'server.js',
  routeAnchor,
  `      if (await hotpepperMenuImportV612.handle(req, res, url)) return /* ${marker}-route */\n${routeAnchor}`,
  1,
  'menu import route',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Community-Rerender', 'v611') /* style-community-rerender-v611-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Hotpepper-Menu-Import', 'v612') /* ${marker}-ready */`,
  1,
  'menu import readiness header',
)

fs.writeFileSync('/tmp/hotpepper-menu-import-v612-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release: marker,
  modified: [...new Set(changes.filter(change => change.kind === 'replace').map(change => change.file))],
  added: changes.filter(change => change.kind === 'add').map(change => change.file),
}))
