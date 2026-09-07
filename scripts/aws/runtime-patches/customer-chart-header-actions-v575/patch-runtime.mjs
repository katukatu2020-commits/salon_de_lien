import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')
const marker = 'customer-chart-header-actions-v575'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let commercial = fs.readFileSync(commercialPath, 'utf8')
if (commercial.includes(marker)) throw new Error(`${marker}: styles already applied`)

const actionRule = '.lien-chart-actions{display:flex;flex:0 0 auto;flex-wrap:wrap;align-items:center;gap:9px}'
const actionFix = fs.readFileSync(path.join(patchRoot, `${marker}.css`), 'utf8').trim()
commercial = replaceOnce(
  commercial,
  actionRule,
  `${actionRule}\n${actionFix}`,
  'customer chart action styles',
)
fs.writeFileSync(commercialPath, commercial)

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: server patch already applied`)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Check', 'v574') /* customer-booking-check-v574 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chart-Header-Actions', 'v575') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({
  release:marker,
  headerActionsAligned:true,
  actionMarginReset:true,
  historyUploadAligned:true,
}))
