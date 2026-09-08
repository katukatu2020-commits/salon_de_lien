import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const marker = 'receipt-pos-height-calibration-v583'
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Receipt-Pos-Direct', 'v582') /* receipt-pos-direct-v582 */`

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)
const matches = server.split(previousReady).length - 1
if (matches !== 1) throw new Error(`${marker}: readiness anchor expected once, found ${matches}`)

server = server.replace(
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Receipt-Height-Calibrated', 'v583') /* ${marker} */`,
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release:marker, readiness:true, browserIntegration:'v582' }))
