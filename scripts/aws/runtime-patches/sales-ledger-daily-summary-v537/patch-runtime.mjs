import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const clientPath = path.join(root, 'sales-ledger-client-v318.js')
const servicePath = path.join(root, 'sales-ledger-accounts-v318.js')
const serverPath = path.join(root, 'server.js')
const marker = 'sales-ledger-daily-summary-v537'

let client = fs.readFileSync(clientPath, 'utf8')
let service = fs.readFileSync(servicePath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')
const sections = fs.readFileSync(path.join(patchRoot, 'client-sections-v537.js'), 'utf8')
const serviceSections = fs.readFileSync(path.join(patchRoot, 'service-list-v537.js'), 'utf8')
const styles = fs.readFileSync(path.join(patchRoot, 'sales-ledger-daily-summary-v537.css'), 'utf8')

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

client = replaceOnce(client, `  const VERSION = 'sales-ledger-month-filter-v534'`, `  const VERSION = '${marker}'`, 'client release version')
client = replaceOnce(
  client,
  `  let state = { rows: [], staff: [], selected: new Set() }`,
  `  let state = { rows: [], staff: [], paymentMethods: [], summary: { days: [], totals: {}, staff: [] }, selected: new Set(), detailDate: '' }`,
  'sales ledger report state',
)
client = replaceOnce(
  client,
  `      chevronRight:'<path d="m9 18 6-6-6-6"/>',`,
  `      chevronRight:'<path d="m9 18 6-6-6-6"/>',
      chevronDown:'<path d="m6 9 6 6 6-6"/>',
      chart:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
      list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
      sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>',`,
  'report icons',
)
client = replaceOnce(
  client,
  `      state.selected.clear()\n      void load(root)`,
  `      state.selected.clear()\n      state.detailDate = ''\n      void load(root)`,
  'month switch report reset',
)
client = replaceRegion(client, '  function renderRows(root) {', '  function dialogMarkup(row, bulk) {', section(sections, 'render-block'), 'report render functions')
client = replaceRegion(client, '  async function load(root) {', '  function ledgerMarkup() {', section(sections, 'load-block'), 'report loading')
client = replaceRegion(client, '  function ledgerMarkup() {', '  function cleanupLedgerPortal() {', section(sections, 'markup-block'), 'report markup')
client = replaceRegion(client, `    const root = portal.querySelector('.sl-page')`, '    try { await load(root) }', section(sections, 'wire-block'), 'report event wiring')

const styleTail = `        .sl-table th:nth-child(10),.sl-table td:nth-child(10){width:7%}\n      }\n    \`\n    document.head.appendChild(style)`
client = replaceOnce(
  client,
  styleTail,
  `        .sl-table th:nth-child(10),.sl-table td:nth-child(10){width:7%}\n      }\n${styles}\n    \`\n    document.head.appendChild(style)`,
  'daily summary styles',
)

service = replaceOnce(
  service,
  `'use strict'\n\nconst MAX_BULK = 100`,
  `'use strict'\n\nconst salesSummary = require('./sales-ledger-summary-v537')\n\nconst MAX_BULK = 100`,
  'sales summary service helper',
)
service = replaceRegion(service, '  async function listSales(req, res, url, session) {', '  function normalizeChanges(input, bulk) {', section(serviceSections, 'service-list'), 'sales summary API')

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Navigation-Loading-Experience', 'v536') /* navigation-loading-experience-v536 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Daily-Summary', 'v537') /* ${marker} */`,
  'daily summary readiness marker',
)

fs.copyFileSync(path.join(patchRoot, 'sales-ledger-summary-v537.js'), path.join(root, 'sales-ledger-summary-v537.js'))
fs.writeFileSync(clientPath, client)
fs.writeFileSync(servicePath, service)
fs.writeFileSync(serverPath, server)
console.log(JSON.stringify({ release: marker, patched: true }))
