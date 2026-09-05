import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const marker = 'dealer-auth-self-service-v548'

function replaceExactly(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(marker)) throw new Error(`${marker}: patch already applied`)

for (const file of ['wholesale-ordering-v543.js', 'wholesale-ordering-v543.css', 'wholesale-ordering-client-v543.js']) {
  const source = fs.readFileSync(path.join(patchRoot, file), 'utf8')
  if (!source.includes(marker)) throw new Error(`${file}: release marker is missing`)
  fs.writeFileSync(path.join(root, file), source)
}

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chat-Send-Only', 'v547') /* customer-chat-send-only-v547 */`
server = replaceExactly(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Auth-Self-Service', 'v548') /* ${marker} */`,
  'readiness marker',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
