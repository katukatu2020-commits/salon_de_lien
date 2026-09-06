import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const marker = 'customer-chart-attachment-delete-v567'
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')
const servicePath = path.join(root, 'customer-chart-attachments-v567.js')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

fs.copyFileSync(path.join(patchRoot, 'customer-chart-attachments-service-v567.js'), servicePath)

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)
server = replaceOnce(
  server,
  `const { createCustomerChartAttachmentsService } = require('./customer-chart-attachments-v564') /* customer-chart-attachments-v564 */`,
  `const { createCustomerChartAttachmentsService } = require('./customer-chart-attachments-v567') /* ${marker} */`,
  'attachment service import',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Post-Directions', 'v566') /* style-post-directions-v566 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chart-Delete', 'v567') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

let commercial = fs.readFileSync(commercialPath, 'utf8')
const oldChartMarker = '/* salon-records-controls-v561-customer-chart */'
const markerIndex = commercial.indexOf(oldChartMarker)
if (markerIndex < 0 || commercial.indexOf(oldChartMarker, markerIndex + oldChartMarker.length) >= 0) {
  throw new Error('customer chart marker was not unique')
}
const chartStart = commercial.lastIndexOf(';(() => {', markerIndex)
if (chartStart < 0 || !commercial.slice(chartStart, markerIndex).includes('window.__lienCustomerChartAttachmentsV564')) {
  throw new Error('customer chart attachment client boundary was not found')
}
const client = fs.readFileSync(path.join(patchRoot, 'customer-chart-attachments-client-v567.js'), 'utf8').trim()
commercial = `${commercial.slice(0, chartStart)}${client}\n\n${commercial.slice(markerIndex)}`
commercial += `\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(commercialPath, commercial)

console.log(JSON.stringify({ release:marker, server:true, commercial:true, service:true }))
