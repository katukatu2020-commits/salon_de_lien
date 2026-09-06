import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const marker = 'customer-appointment-history-memos-v565'
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')
const servicePath = path.join(root, 'customer-appointment-history-v565.js')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

fs.copyFileSync(path.join(patchRoot, 'customer-appointment-history-service-v565.js'), servicePath)

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)
server = replaceOnce(
  server,
  `const { createCustomerChartAttachmentsService } = require('./customer-chart-attachments-v564') /* customer-chart-attachments-v564 */`,
  `const { createCustomerChartAttachmentsService } = require('./customer-chart-attachments-v564') /* customer-chart-attachments-v564 */\nconst { createCustomerAppointmentHistoryService } = require('./customer-appointment-history-v565') /* ${marker} */`,
  'service import',
)
server = replaceOnce(
  server,
  `const customerChartAttachments = createCustomerChartAttachmentsService({\n  prisma,\n  crypto,\n  sessionProvider: req => chatSession(req, 'staff'),\n}) /* customer-chart-attachments-v564-service */`,
  `const customerChartAttachments = createCustomerChartAttachmentsService({\n  prisma,\n  crypto,\n  sessionProvider: req => chatSession(req, 'staff'),\n}) /* customer-chart-attachments-v564-service */\nconst customerAppointmentHistory = createCustomerAppointmentHistoryService({\n  prisma,\n  sessionProvider: req => chatSession(req, 'staff'),\n}) /* ${marker}-service */`,
  'service construction',
)
server = replaceOnce(
  server,
  `  await customerChartAttachments.ensureSchema() /* customer-chart-attachments-v564-schema */`,
  `  await customerChartAttachments.ensureSchema() /* customer-chart-attachments-v564-schema */\n  await customerAppointmentHistory.ensureSchema() /* ${marker}-schema */`,
  'schema initialization',
)
server = replaceOnce(
  server,
  `      if (await customerChartAttachments.handle(req, res, url)) return /* customer-chart-attachments-v564-route */`,
  `      if (await customerAppointmentHistory.handle(req, res, url)) return /* ${marker}-route */\n      if (await customerChartAttachments.handle(req, res, url)) return /* customer-chart-attachments-v564-route */`,
  'route precedence',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chart-Attachments', 'v564') /* customer-chart-attachments-v564 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Appointment-History', 'v565') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

let commercial = fs.readFileSync(commercialPath, 'utf8')
if (commercial.includes(`/* ${marker} */`)) throw new Error(`${marker}: client patch already applied`)
const client = fs.readFileSync(path.join(patchRoot, 'customer-appointment-history-client-v565.js'), 'utf8').trim()
commercial += `\n\n${client}\n\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(commercialPath, commercial)

console.log(JSON.stringify({ release:marker, server:true, commercial:true, service:true }))
