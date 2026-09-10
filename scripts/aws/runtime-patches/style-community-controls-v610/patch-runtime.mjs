import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'style-community-controls-v610'
const tick = String.fromCharCode(96)
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, match => match.slice(1)))
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(label + ': expected ' + expected + ' matches, found ' + count)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind: 'replace', file, before, after, count: expected })
}

function addFile(sourceName, targetName) {
  const target = path.join(root, targetName)
  if (fs.existsSync(target)) throw new Error(targetName + ': target already exists')
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(path.join(here, sourceName), target)
  changes.push({ kind: 'add', file: targetName })
}

addFile('style-community-controls-v610.js', 'style-community-controls-v610.js')
addFile('style-community-controls-v610-client.js', 'public/style-community-controls-v610.js')
addFile('style-community-controls-v610.css', 'public/style-community-controls-v610.css')

const serviceAnchor = [
  "const styleSystemV602 = require('./style-system-integration-v602').createStyleSystemIntegrationService({",
  '  prisma,',
  "  staffSessionProvider: req => chatSession(req, 'staff'),",
  "  customerSessionProvider: req => chatSession(req, 'customer'),",
  '}) /* style-system-integration-v602 */',
].join('\n')
const serviceReplacement = [
  serviceAnchor,
  "const styleCommunityControlsV610 = require('./style-community-controls-v610').createStyleCommunityControlsService({",
  '  prisma,',
  "  staffSessionProvider: req => chatSession(req, 'staff'),",
  "  customerSessionProvider: req => chatSession(req, 'customer'),",
  '}) /* ' + marker + '-service */',
].join('\n')
replaceExact('server.js', serviceAnchor, serviceReplacement, 1, 'style community controls service')

const assetAnchor = '<link id="orimia-style-system-v602-style" rel="stylesheet" href="/style-system-integration-v602.css?v=609-gallery-grid1"><script id="orimia-style-system-v602" src="/style-system-integration-v602.js?v=609-gallery-grid1" defer></script></head>'
const assetReplacement = '<link id="orimia-style-system-v602-style" rel="stylesheet" href="/style-system-integration-v602.css?v=610-controls1"><script id="orimia-style-system-v602" src="/style-system-integration-v602.js?v=610-controls1" defer></script><link id="orimia-style-community-controls-v610-style" rel="stylesheet" href="/style-community-controls-v610.css?v=610-controls1"><script id="orimia-style-community-controls-v610" src="/style-community-controls-v610.js?v=610-controls1" defer></script></head>'
replaceExact('server.js', assetAnchor, assetReplacement, 1, 'style community controls assets')

const routeAnchor = "      if (await styleSystemV602.handle(req,res,url)) return /* style-system-integration-v602-route */"
const routeReplacement = [
  '      if (await styleCommunityControlsV610.handle(req,res,url)) return /* ' + marker + '-route */',
  routeAnchor,
].join('\n')
replaceExact('server.js', routeAnchor, routeReplacement, 1, 'style community controls routes')

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Style-Gallery-Grid', 'v609') /* customer-style-gallery-grid-v609-ready */"
const readinessReplacement = [
  readinessAnchor,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Community-Controls', 'v610') /* " + marker + '-ready */',
].join('\n')
replaceExact('server.js', readinessAnchor, readinessReplacement, 1, 'style community controls readiness header')

const interpolation = '$' + '{encodeURIComponent(staff.key)}&audience=$' + '{audience}'
const avatarBefore = [
  '      avatarUrl: staff?.profileImageKey',
  '        ? ' + tick + '/api/lien-staff-avatar?staffKey=' + interpolation + tick,
  '        : importedPortrait,',
  '      active: staff ? staff.active !== false && staff.onLeave !== true : null,',
].join('\n')
const avatarAfter = [
  '      avatarUrl: importedPortrait || (staff?.profileImageKey',
  '        ? ' + tick + '/api/lien-staff-avatar?staffKey=' + interpolation + tick,
  '        : null),',
  '      photoOverride: Boolean(importedPortrait),',
  '      active: staff ? staff.active !== false && staff.onLeave !== true : null,',
].join('\n')
replaceExact('style-system-integration-v602.js', avatarBefore, avatarAfter, 1, 'post-specific stylist photo priority')

fs.writeFileSync('/tmp/style-community-controls-v610-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release: marker,
  modified: [...new Set(changes.filter(change => change.kind === 'replace').map(change => change.file))],
  added: changes.filter(change => change.kind === 'add').map(change => change.file),
}))
