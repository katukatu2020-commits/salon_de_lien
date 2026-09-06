import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const marker = 'style-post-directions-v566'
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

fs.copyFileSync(path.join(patchRoot, 'community-publishing-v566.js'), path.join(root, 'community-publishing-v566.js'))
fs.copyFileSync(path.join(patchRoot, 'community-publishing-client-v566.js'), path.join(root, 'community-publishing-client-v566.js'))

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)
server = replaceOnce(
  server,
  `const { createCommunityPublishingService } = require('./community-publishing-v348') /* community-publishing-v337 */`,
  `const { createCommunityPublishingService } = require('./community-publishing-v566') /* community-publishing-v337 ${marker} */`,
  'community publishing service import',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Appointment-History', 'v565') /* customer-appointment-history-memos-v565 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Post-Directions', 'v566') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

let commercial = fs.readFileSync(commercialPath, 'utf8')
const previousLoader = `;(() => {
  if (document.querySelector('script[data-community-publishing-v348]')) return
  const script = document.createElement('script')
  script.src = '/admin-community-publishing-v348.js?v=348'
  script.defer = true
  script.dataset.communityPublishingV348 = '1'
  document.head.appendChild(script)
})()`
const nextLoader = `;(() => {
  if (document.querySelector('script[data-style-post-directions-v566]')) return
  const script = document.createElement('script')
  script.src = '/admin-community-publishing-v566.js?v=566'
  script.defer = true
  script.dataset.stylePostDirectionsV566 = '1'
  document.head.appendChild(script)
})()`
commercial = replaceOnce(commercial, previousLoader, nextLoader, 'community publishing client loader')
commercial += `\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(commercialPath, commercial)

console.log(JSON.stringify({ release:marker, server:true, commercial:true, service:true, client:true }))
