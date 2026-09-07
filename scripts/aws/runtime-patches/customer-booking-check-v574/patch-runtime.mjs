import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const customerStylesPath = path.join(root, 'customer-experience-v508.css')
const marker = 'customer-booking-check-v574'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let customerStyles = fs.readFileSync(customerStylesPath, 'utf8')
if (customerStyles.includes(marker)) throw new Error(`${marker}: styles already applied`)
customerStyles += `\n${fs.readFileSync(path.join(patchRoot, `${marker}.css`), 'utf8').trim()}\n`
fs.writeFileSync(customerStylesPath, customerStyles)

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: server patch already applied`)

server = replaceOnce(
  server,
  '/customer-experience-v508.css?v=508',
  '/customer-experience-v508.css?v=574-booking-check1',
  'customer stylesheet cache key',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Home-Visual', 'v573') /* admin-home-visual-v573 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Check', 'v574') /* ${marker} */`,
  'readiness header',
)

server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({
  release:marker,
  centeredCheck:true,
  originalMarkSuppressed:true,
  bookingRouteOnly:true,
}))
