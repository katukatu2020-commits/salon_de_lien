import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const clientPath = path.join(root, 'sales-ledger-client-v318.js')
const serverPath = path.join(root, 'server.js')
const marker = 'sales-ledger-detail-modal-v538'

let client = fs.readFileSync(clientPath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')
const sections = fs.readFileSync(path.join(patchRoot, 'client-sections-v538.js'), 'utf8')
const styles = fs.readFileSync(path.join(patchRoot, 'sales-ledger-detail-modal-v538.css'), 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

function replaceRegion(source, start, end, replacement, label) {
  const first = source.indexOf(start)
  if (first < 0) throw new Error(`${label}: start target was not found`)
  if (source.indexOf(start, first + start.length) >= 0) throw new Error(`${label}: start target was not unique`)
  const last = source.indexOf(end, first + start.length)
  if (last < 0) throw new Error(`${label}: end target was not found`)
  return source.slice(0, first) + replacement.trimEnd() + '\n\n' + source.slice(last)
}

function section(source, name) {
  const startMarker = `/* ${name}:start */`
  const endMarker = `/* ${name}:end */`
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker)
  if (start < 0 || end <= start) throw new Error(`${name}: section boundaries were not found`)
  return source.slice(start + startMarker.length, end).trim()
}

function appendStyles(source, anchor, addition) {
  const start = source.indexOf(anchor)
  if (start < 0) throw new Error('daily summary style anchor was not found')
  if (source.indexOf(anchor, start + anchor.length) >= 0) throw new Error('daily summary style anchor was not unique')
  const end = source.indexOf('\n\n    `', start)
  if (end < 0) throw new Error('sales ledger style template end was not found')
  return source.slice(0, end) + '\n' + addition.trimEnd() + source.slice(end)
}

client = replaceOnce(client, `  const VERSION = 'sales-ledger-daily-summary-v537'`, `  const VERSION = '${marker}'`, 'client release version')
client = replaceOnce(
  client,
  `  let state = { rows: [], staff: [], paymentMethods: [], summary: { days: [], totals: {}, staff: [] }, selected: new Set(), detailDate: '' }`,
  `  let state = { rows: [], staff: [], paymentMethods: [], summary: { days: [], totals: {}, staff: [] }, selected: new Set(), detailDate: '', reopenDetailAfterEdit: false }`,
  'sales ledger modal state',
)
client = replaceRegion(client, 'const summaryDateLabel = value => {', '  function dialogMarkup(row, bulk) {', section(sections, 'render-block'), 'report render functions')
client = replaceRegion(client, 'async function load(root) {', 'function ledgerMarkup() {', section(sections, 'load-block'), 'report loading')
client = replaceRegion(client, 'function ledgerMarkup() {', '  function cleanupLedgerPortal() {', section(sections, 'markup-block'), 'report markup')
client = replaceRegion(client, `const root = portal.querySelector('.sl-page')`, '    try { await load(root) }', section(sections, 'wire-block'), 'report event wiring')
client = appendStyles(client, '      /* sales-ledger-daily-summary-v537 */', styles)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Daily-Summary', 'v537') /* sales-ledger-daily-summary-v537 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Detail-Modal', 'v538') /* ${marker} */`,
  'sales ledger detail modal readiness marker',
)

fs.writeFileSync(clientPath, client)
fs.writeFileSync(serverPath, server)
console.log(JSON.stringify({ release: marker, patched: true }))
