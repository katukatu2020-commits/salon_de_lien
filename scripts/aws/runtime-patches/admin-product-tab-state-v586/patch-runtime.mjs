import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'admin-product-tab-state-v586'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const workspacePath = path.join(root, 'public', 'admin-workspace-layout-v572.js')
const workspaceSourcePath = path.join(patchRoot, 'admin-workspace-layout-v572.js')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${marker}: ${label} expected one match, found ${count}`)
  return source.replace(before, after)
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`X-Lien-Admin-Product-Tab-State', 'v586'`) || server.includes(`/* ${marker} */`)) {
  throw new Error(`${marker}: server patch already applied`)
}
server = replaceOnce(
  server,
  '/admin-workspace-layout-v572.js?v=572-release1',
  '/admin-workspace-layout-v572.js?v=586-tab-state1',
  'workspace script cache key',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Order-Product-Ui', 'v585') /* dealer-order-product-ui-v585 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Product-Tab-State', 'v586') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

fs.copyFileSync(workspaceSourcePath, workspacePath)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release:marker, readiness:true, cacheKey:true, workspace:true }))
