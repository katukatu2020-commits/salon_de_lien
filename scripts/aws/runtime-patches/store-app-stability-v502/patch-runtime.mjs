import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const serverPath = path.join(root, 'server.js')
const oldName = 'layout-runtime-v450.js'
const newName = 'layout-runtime-v502.js'
const oldChunk = path.join(nextRoot, 'static', 'chunks', 'app', oldName)
const newChunk = path.join(nextRoot, 'static', 'chunks', 'app', newName)

if (!fs.existsSync(oldChunk)) throw new Error(`shared layout chunk is missing: ${oldChunk}`)
let layoutRuntime = fs.readFileSync(oldChunk, 'utf8')
if (!layoutRuntime.includes('store-app-stability-v501-loader')) {
  throw new Error('the reviewed v501 loader is missing from the shared layout chunk')
}
const loaderStart = layoutRuntime.lastIndexOf('\n;(() => { /* store-app-stability-v501-loader */')
if (loaderStart < 0) throw new Error('the v501 dynamic loader boundary was not found')
layoutRuntime = layoutRuntime.slice(0, loaderStart)

const inlineSources = []
for (const publicFile of ['orimia-brand-v501.js', 'store-app-stability-v501.js']) {
  const publicPath = path.join(root, 'public', publicFile)
  let source = fs.readFileSync(publicPath, 'utf8')
  const before = "  if (document.readyState === 'complete') startAfterHydration()\n  else window.addEventListener('load', startAfterHydration, { once: true })"
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${publicFile}: expected one load-gated startup, found ${count}`)
  source = source.replace(
    before,
    "  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startAfterHydration, { once: true })\n  else startAfterHydration()",
  )
  fs.writeFileSync(publicPath, source)
  inlineSources.push(source)
}
layoutRuntime += `\n/* store-app-stability-v502-inline */\n${inlineSources.join('\n')}\n`
fs.writeFileSync(newChunk, layoutRuntime)

const commercialPath = path.join(root, 'commercial-admin-v101.js')
let commercial = fs.readFileSync(commercialPath, 'utf8')
const commercialBefore = "  const start = () => window.setTimeout(boot, 500) /* store-app-stability-v501: hydrate first */\n  if (document.readyState === 'complete') start()\n  else window.addEventListener('load', start, { once: true })"
const commercialCount = commercial.split(commercialBefore).length - 1
if (commercialCount !== 1) throw new Error(`commercial startup expected once, found ${commercialCount}`)
commercial = commercial.replace(
  commercialBefore,
  "  const start = () => window.setTimeout(boot, 1800) /* store-app-stability-v502: hydrate without waiting for images */\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })\n  else start()",
)
fs.writeFileSync(commercialPath, commercial)

const candidateFiles = [path.join(nextRoot, 'app-build-manifest.json')]
const serverApp = path.join(nextRoot, 'server', 'app')
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collect(fullPath)
    else if (entry.name.endsWith('_client-reference-manifest.js')) candidateFiles.push(fullPath)
  }
}
collect(serverApp)

let changedFiles = 0
let replacements = 0
for (const file of candidateFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const count = source.split(oldName).length - 1
  if (!count) continue
  fs.writeFileSync(file, source.split(oldName).join(newName))
  changedFiles += 1
  replacements += count
}
if (changedFiles < 2 || replacements < 2) {
  throw new Error(`shared chunk manifest replacement was incomplete: ${changedFiles} files, ${replacements} references`)
}

let server = fs.readFileSync(serverPath, 'utf8')
const readyMarker = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-App-Stability', 'v501')"
const readyCount = server.split(readyMarker).length - 1
if (readyCount !== 1) throw new Error(`v501 readiness marker expected once, found ${readyCount}`)
server = server.replace(
  readyMarker,
  `${readyMarker}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-App-Cache-Activation', 'v502')`,
)
fs.writeFileSync(serverPath, server)

console.log(`store app cache activation v502 patched ${changedFiles} manifests (${replacements} references)`)
