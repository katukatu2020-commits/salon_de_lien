import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const marker = 'style-detail-three-photo-layout-v568'
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chart-Delete', 'v567') /* customer-chart-attachment-delete-v567 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Detail-Three-Photo-Layout', 'v568') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

let commercial = fs.readFileSync(commercialPath, 'utf8')
if (commercial.includes(`/* ${marker} */`)) throw new Error(`${marker}: commercial patch already applied`)
const client = fs.readFileSync(
  path.join(patchRoot, 'style-detail-three-photo-layout-client-v568.js'),
  'utf8',
).trim()
commercial += `\n${client}\n\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(commercialPath, commercial)

console.log(JSON.stringify({ release:marker, server:true, commercial:true }))
