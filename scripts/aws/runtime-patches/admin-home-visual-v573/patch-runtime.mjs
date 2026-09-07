import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const publicRoot = path.join(root, 'public')
const serverPath = path.join(root, 'server.js')
const marker = 'admin-home-visual-v573'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

for (const asset of ['admin-home-visual-v573.js', 'admin-home-visual-v573.css']) {
  fs.copyFileSync(path.join(patchRoot, asset), path.join(publicRoot, asset))
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)

const previousAssets = `  } /* admin-shared-page-format-v572-assets */`
server = replaceOnce(
  server,
  previousAssets,
  `${previousAssets}
  if (adminRoute && !output.includes('orimia-admin-home-visual-v573')) {
    output = output.replace('<head>', '<head>' + '<script id="orimia-admin-home-visual-first-paint-v573">document.documentElement.classList.add("orimia-admin-home-visual-pending-v573");window.setTimeout(function(){document.documentElement.classList.remove("orimia-admin-home-visual-pending-v573")},8000)</script><link id="orimia-admin-home-visual-style-v573" rel="stylesheet" href="/admin-home-visual-v573.css?v=573-release1"><script id="orimia-admin-home-visual-v573" src="/admin-home-visual-v573.js?v=573-release1" defer></script>')
  } /* ${marker}-assets */`,
  'admin home visual assets',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Shared-Page-Format', 'v572') /* admin-shared-page-format-v572 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Home-Visual', 'v573') /* ${marker} */`,
  'readiness header',
)

server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({
  release:marker,
  centralizedStoreVisual:true,
  tenantScopedBranding:true,
  customerUploadsExcluded:true,
}))
