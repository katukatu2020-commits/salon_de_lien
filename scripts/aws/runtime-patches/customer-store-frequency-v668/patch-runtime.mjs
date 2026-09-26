import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const releaseRoot = path.dirname(fileURLToPath(import.meta.url))
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }
function fragment(file) { return fs.readFileSync(path.join(releaseRoot, file), 'utf8') }

function replaceExact(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) throw new Error(`Unexpected v667 parent anchor: ${file} / ${before.slice(0, 160)}`)
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push(file)
}

function replaceRange(file, start, end, replacement, maxSpan) {
  const source = read(file)
  const startIndex = source.indexOf(start)
  if (startIndex < 0 || source.indexOf(start, startIndex + start.length) >= 0) throw new Error(`Unexpected start anchor: ${file} / ${start}`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`Missing end anchor: ${file} / ${end}`)
  if (endIndex - startIndex > maxSpan) throw new Error(`Replacement span too large: ${file} / ${endIndex - startIndex}`)
  fs.writeFileSync(target(file), source.slice(0, startIndex) + replacement + source.slice(endIndex))
  changes.push(file)
}

const membershipSource = fragment('customer-store-frequency-v668.js')
fs.writeFileSync(target('customer-store-frequency-v668.js'), membershipSource)
changes.push('customer-store-frequency-v668.js')

const links = 'customer-links-v293.js'
replaceExact(
  links,
  "const customerStoreMembershipV654 = require('./customer-store-unlink-v654.js') /* customer-store-unlink-v654 */",
  "const customerStoreMembershipV668 = require('./customer-store-frequency-v668.js') /* customer-store-frequency-v668 */",
)
{
  const source = read(links)
  if (!source.includes('customerStoreMembershipV654')) throw new Error('Missing v654 membership references')
  fs.writeFileSync(target(links), source.replaceAll('customerStoreMembershipV654', 'customerStoreMembershipV668'))
  changes.push(links)
}

replaceExact(
  links,
  `        storeCount: registered.length,
        maxStores: customerStoreMembershipV668.MAX_STORES,
        canLink: linked || registered.length < customerStoreMembershipV668.MAX_STORES,`,
  `        storeCount: registered.length,
        canLink: true,`,
)
replaceExact(
  links,
  `      return json(res, 200, { stores: rows, storeCount: rows.length, maxStores: customerStoreMembershipV668.MAX_STORES })`,
  `      return json(res, 200, { stores: rows, storeCount: rows.length, storeLimit: null })`,
)
replaceExact(
  links,
  `      return json(res, result.alreadyLinked ? 200 : 201, { ok: true, alreadyLinked: result.alreadyLinked, redirect, maxStores: customerStoreMembershipV668.MAX_STORES })`,
  `      return json(res, result.alreadyLinked ? 200 : 201, { ok: true, alreadyLinked: result.alreadyLinked, redirect, storeLimit: null })`,
)
replaceExact(
  links,
  `        storeCount: result.remainingCount,
        maxStores: customerStoreMembershipV668.MAX_STORES,`,
  `        storeCount: result.remainingCount,
        storeLimit: null,`,
)
replaceRange(
  links,
  '  async function storesPage(req, res, url) {',
  '  function storeCodeFromQuery(value) {',
  fragment('stores-page-v668.fragment.js'),
  18000,
)
replaceExact(
  links,
  `        json(res, status, { error: message, code: error?.code, maxStores: customerStoreMembershipV668.MAX_STORES })`,
  `        json(res, status, { error: message, code: error?.code })`,
)

replaceRange(
  'customer-link-ui-v293.js',
  '  function initStorePage() {',
  '  function initStoreSettingsQr() {',
  fragment('store-client-v668.fragment.js'),
  10000,
)
replaceExact('customer-runtime-v267.js', '/customer-link-ui-v293.js?v=654-store-unlink1', '/customer-link-ui-v293.js?v=668-store-frequency1')
replaceExact('commercial-admin-v101.js', '/customer-link-ui-v293.js?v=654-store-unlink1', '/customer-link-ui-v293.js?v=668-store-frequency1')

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Order-Focus-Stability', 'v667') /* style-order-focus-stability-v667-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Store-Frequency', 'v668') /* customer-store-frequency-v668-ready */",
)

fs.writeFileSync('/tmp/customer-store-frequency-v668-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: 'customer-store-frequency-v668', changedFiles: [...new Set(changes)], changes: changes.length }))
