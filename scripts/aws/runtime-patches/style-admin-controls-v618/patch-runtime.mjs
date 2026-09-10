import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'style-admin-controls-v618'
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

addFile('style-admin-controls-v618.js', 'style-admin-controls-v618.js')
addFile('style-admin-controls-v618-client.js', 'public/style-admin-controls-v618.js')
addFile('style-admin-controls-v618.css', 'public/style-admin-controls-v618.css')

replaceExact(
  'style-community-controls-v610.js',
  "const STYLE_GENDERS = new Set(['', '女性', '男性', 'ユニセックス'])",
  "const STYLE_GENDERS = new Set(['', '女性', '男性', 'その他', 'ユニセックス'])",
  1,
  'customer style gender compatibility',
)
replaceExact(
  'style-community-controls-v610.js',
  "if (['ユニセックス', '男女兼用', 'その他'].includes(normalized)) return 'ユニセックス'",
  "if (['ユニセックス', '男女兼用', 'その他'].includes(normalized)) return 'その他'",
  1,
  'customer style gender normalization',
)
replaceExact(
  'style-community-controls-v610.js',
  "WHEN \"rawGender\" IN ('ユニセックス','男女兼用','その他') THEN 'ユニセックス'",
  "WHEN \"rawGender\" IN ('ユニセックス','男女兼用','その他') THEN 'その他'",
  1,
  'customer style gender query',
)
replaceExact(
  'public/style-community-controls-v610.js',
  "    ['ユニセックス', 'ユニセックス'],",
  "    ['その他', 'その他'],",
  1,
  'customer style gender option',
)

const serviceAnchor = [
  "const styleCommunityControlsV610 = require('./style-community-controls-v610').createStyleCommunityControlsService({",
  '  prisma,',
  "  staffSessionProvider: req => chatSession(req, 'staff'),",
  "  customerSessionProvider: req => chatSession(req, 'customer'),",
  '}) /* style-community-controls-v610-service */',
].join('\n')
const serviceReplacement = [
  serviceAnchor,
  "const styleAdminControlsV618 = require('./style-admin-controls-v618').createStyleAdminControlsService({",
  '  prisma,',
  "  staffSessionProvider: req => chatSession(req, 'staff'),",
  '}) /* ' + marker + '-service */',
].join('\n')
replaceExact('server.js', serviceAnchor, serviceReplacement, 1, 'style admin controls service')

const assetAnchor = '<link id="orimia-style-community-controls-v610-style" rel="stylesheet" href="/style-community-controls-v610.css?v=610-controls1"><script id="orimia-style-community-controls-v610" src="/style-community-controls-v610.js?v=611-rerender1" defer></script></head>'
const assetReplacement = '<link id="orimia-style-community-controls-v610-style" rel="stylesheet" href="/style-community-controls-v610.css?v=610-controls1"><script id="orimia-style-community-controls-v610" src="/style-community-controls-v610.js?v=618-gender1" defer></script><link id="orimia-style-admin-controls-v618-style" rel="stylesheet" href="/style-admin-controls-v618.css?v=618-release1"><script id="orimia-style-admin-controls-v618" src="/style-admin-controls-v618.js?v=618-release1" defer></script></head>'
replaceExact('server.js', assetAnchor, assetReplacement, 1, 'style admin controls assets')

const routeAnchor = '      if (await styleCommunityControlsV610.handle(req,res,url)) return /* style-community-controls-v610-route */'
const routeReplacement = [
  '      if (await styleAdminControlsV618.handle(req,res,url)) return /* ' + marker + '-route */',
  routeAnchor,
].join('\n')
replaceExact('server.js', routeAnchor, routeReplacement, 1, 'style admin controls routes')

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Stamp-Card-Commercial', 'v617') /* stamp-card-commercial-v617-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Controls', 'v618') /* ${marker}-ready */`,
  1,
  'style admin controls readiness header',
)

fs.writeFileSync('/tmp/style-admin-controls-v618-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release: marker,
  modified: [...new Set(changes.filter(change => change.kind === 'replace').map(change => change.file))],
  added: changes.filter(change => change.kind === 'add').map(change => change.file),
}))
