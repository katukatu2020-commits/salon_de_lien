import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const marker = 'customer-chart-attachments-v564'
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')
const servicePath = path.join(root, 'customer-chart-attachments-v564.js')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

fs.copyFileSync(path.join(patchRoot, 'customer-chart-attachments-service-v564.js'), servicePath)

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)
server = replaceOnce(
  server,
  `const { createSalonOperationsService } = require('./salon-operations-v561') /* salon-records-controls-v561 */`,
  `const { createSalonOperationsService } = require('./salon-operations-v561') /* salon-records-controls-v561 */\nconst { createCustomerChartAttachmentsService } = require('./customer-chart-attachments-v564') /* ${marker} */`,
  'service import',
)
server = replaceOnce(
  server,
  `const salonOperations = createSalonOperationsService({\n  prisma,\n  crypto,\n  sessionProvider: req => chatSession(req, 'staff'),\n}) /* salon-records-controls-v561-service */`,
  `const salonOperations = createSalonOperationsService({\n  prisma,\n  crypto,\n  sessionProvider: req => chatSession(req, 'staff'),\n}) /* salon-records-controls-v561-service */\nconst customerChartAttachments = createCustomerChartAttachmentsService({\n  prisma,\n  crypto,\n  sessionProvider: req => chatSession(req, 'staff'),\n}) /* ${marker}-service */`,
  'service construction',
)
server = replaceOnce(
  server,
  `  await salonOperations.ensureSchema() /* salon-records-controls-v561-schema */`,
  `  await salonOperations.ensureSchema() /* salon-records-controls-v561-schema */\n  await customerChartAttachments.ensureSchema() /* ${marker}-schema */`,
  'schema initialization',
)
server = replaceOnce(
  server,
  `      if (await salonOperations.handle(req, res, url)) return /* salon-records-controls-v561-route */`,
  `      if (await customerChartAttachments.handle(req, res, url)) return /* ${marker}-route */\n      if (await salonOperations.handle(req, res, url)) return /* salon-records-controls-v561-route */`,
  'route precedence',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Daily-Sales-Print-Fit', 'v563') /* daily-sales-print-fit-v563 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chart-Attachments', 'v564') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

let commercial = fs.readFileSync(commercialPath, 'utf8')
commercial = replaceOnce(
  commercial,
  `      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files?.[0]) return\n      if (location.pathname.includes('/community')) return`,
  `      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files?.[0]) return\n      if (input.matches('[data-chart-file]') || input.closest('[data-chart-latest-card-v561],[data-chart-history-page-v561]')) { input.setCustomValidity(''); return }\n      if (location.pathname.includes('/community')) return`,
  'square image guard exemption',
)

const oldChartMarker = '/* salon-records-controls-v561-customer-chart */'
const markerIndex = commercial.indexOf(oldChartMarker)
if (markerIndex < 0 || commercial.indexOf(oldChartMarker, markerIndex + oldChartMarker.length) >= 0) {
  throw new Error('customer chart marker was not unique')
}
const chartStart = commercial.lastIndexOf(';(() => {', markerIndex)
if (chartStart < 0 || !commercial.slice(chartStart, markerIndex).includes('window.__lienCustomerChartPhotosV561')) {
  throw new Error('customer chart client boundary was not found')
}
const client = fs.readFileSync(path.join(patchRoot, 'customer-chart-attachments-client-v564.js'), 'utf8').trim()
commercial = `${commercial.slice(0, chartStart)}${client}\n\n${commercial.slice(markerIndex)}`
commercial += `\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(commercialPath, commercial)

console.log(JSON.stringify({ release:marker, server:true, commercial:true, service:true }))
