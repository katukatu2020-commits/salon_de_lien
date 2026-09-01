import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const cropRuntimePath = path.join(root, 'customer-link-ui-v293.js')
const serverPath = path.join(root, 'server.js')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let cropRuntime = fs.readFileSync(cropRuntimePath, 'utf8')
const eligibilityAnchor = String.raw`    if (/\/community(?:\/|$)/.test(location.pathname)) return false
`
cropRuntime = replaceOnce(
  cropRuntime,
  eligibilityAnchor,
  `${eligibilityAnchor}    if (input.id === 'campaign-image') return true /* campaign-image-crop-v519 */\n`,
  'campaign crop eligibility',
)
cropRuntime += '\n/* campaign-image-crop-v519 */\n'
fs.writeFileSync(cropRuntimePath, cropRuntime)

let server = fs.readFileSync(serverPath, 'utf8')
const healthAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shell-Consistency', 'v518')"
server = replaceOnce(
  server,
  healthAnchor,
  `${healthAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Campaign-Image-Crop', 'v519')`,
  'campaign crop health header',
)
server += '\n/* campaign-image-crop-v519 */\n'
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: 'campaign-image-crop-v519', patched: true }))
