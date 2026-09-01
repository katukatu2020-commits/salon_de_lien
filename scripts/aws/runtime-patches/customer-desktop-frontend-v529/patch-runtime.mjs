import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.APP_ROOT || '/app'
const releaseDir = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const clientPaths = [
  path.join(root, 'customer-experience-v503.js'),
  path.join(root, 'customer-experience-v508.js'),
]
const marker = 'customer-desktop-frontend-v529'
const client = fs.readFileSync(path.join(releaseDir, 'customer-desktop-shell-v529.js'), 'utf8')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

for (const clientPath of clientPaths) {
  let source = fs.readFileSync(clientPath, 'utf8')
  if (source.includes(marker)) throw new Error(`${marker}: ${path.basename(clientPath)} already patched`)
  source += `\n\n;/* ${marker}-boundary */\n${client}\n/* ${marker} */\n`
  fs.writeFileSync(clientPath, source)
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(marker)) throw new Error(`${marker}: server already patched`)
server = replaceExact(
  server,
  '/customer-experience-v503.js?v=518-release1',
  '/customer-experience-v503.js?v=529-release1',
  2,
  'standalone customer desktop cache key',
)
server = replaceExact(
  server,
  '/customer-experience-v508.js?v=518-release1',
  '/customer-experience-v508.js?v=529-release1',
  1,
  'Next customer desktop cache key',
)
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Home-Branding', 'v528') /* shift-grid-synchronization-v526 */ /* coupon-broadcast-delivery-v525 */`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Home-Branding', 'v528') /* shift-grid-synchronization-v526 */ /* coupon-broadcast-delivery-v525 */
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Desktop-Frontend', 'v529') /* ${marker} */`,
  1,
  'customer desktop readiness header',
)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
