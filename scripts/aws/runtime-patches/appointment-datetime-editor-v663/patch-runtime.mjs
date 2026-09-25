import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const clientPath = path.join(root, 'staff-breaks-checkout-menu-client-v442.js')
const serverPath = path.join(root, 'server.js')
const addonPath = new URL('appointment-datetime-editor-v663.js', import.meta.url)
const marker = 'appointment-datetime-editor-v663'

function replaceOne(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

let client = fs.readFileSync(clientPath, 'utf8')
if (client.includes(marker)) throw new Error(`${marker}: editor is already installed`)
if (!client.includes('shift-customer-search-v662')) {
  throw new Error(`${marker}: reviewed parent client was not found`)
}
client += `\n\n${fs.readFileSync(addonPath, 'utf8')}\n`
fs.writeFileSync(clientPath, client)

let server = fs.readFileSync(serverPath, 'utf8')
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shift-Customer-Search', 'v662') /* shift-customer-search-v662-ready */`
server = replaceOne(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Appointment-Datetime-Editor', 'v663') /* ${marker}-ready */`,
  'release readiness marker',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: [clientPath, serverPath] }))
