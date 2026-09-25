import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const clientPath = path.join(root, 'staff-breaks-checkout-menu-client-v442.js')
const serverPath = path.join(root, 'server.js')
const addonPath = new URL('customer-search-v662.js', import.meta.url)
const marker = 'shift-customer-search-v662'

function replaceOne(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

let client = fs.readFileSync(clientPath, 'utf8')
if (client.includes(marker)) throw new Error(`${marker}: customer search is already installed`)
if (!client.includes('manual-booking-break-interaction-v535')) {
  throw new Error(`${marker}: reviewed manual booking parent was not found`)
}
client += `\n\n${fs.readFileSync(addonPath, 'utf8')}\n`
fs.writeFileSync(clientPath, client)

let server = fs.readFileSync(serverPath, 'utf8')
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Order-Loading-Recovery', 'v661') /* style-order-loading-recovery-v661-ready */`
server = replaceOne(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shift-Customer-Search', 'v662') /* ${marker}-ready */`,
  'release readiness marker',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: [clientPath, serverPath] }))
