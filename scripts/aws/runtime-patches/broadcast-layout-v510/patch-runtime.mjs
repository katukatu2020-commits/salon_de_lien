import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = `${root}/server.js`
const nextRoot = path.join(root, '.next')
const oldLayoutName = 'layout-runtime-v503-final.js'
const newLayoutName = 'layout-runtime-v510.js'
const oldLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', oldLayoutName)
const newLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', newLayoutName)
const clientSource = '/tmp/lien-v510/broadcast-layout-v510.js'
const clientTarget = `${root}/public/broadcast-layout-v510.js`

function replaceExact(source, before, after, expected, label) {
  const matches = source.split(before).length - 1
  if (matches !== expected) {
    throw new Error(`broadcast-layout-v510: expected ${expected} ${label} matches, found ${matches}`)
  }
  return source.replaceAll(before, after)
}

function collectFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, output)
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) output.push(fullPath)
  }
  return output
}

function replaceNextReferences(oldValue, newValue) {
  let files = 0
  let references = 0
  for (const file of collectFiles(nextRoot)) {
    const source = fs.readFileSync(file, 'utf8')
    const count = source.split(oldValue).length - 1
    if (!count) continue
    fs.writeFileSync(file, source.replaceAll(oldValue, newValue))
    files += 1
    references += count
  }
  if (!files || !references) throw new Error('broadcast-layout-v510: no shared layout references were updated')
  return { files, references }
}

fs.copyFileSync(clientSource, clientTarget)

let server = fs.readFileSync(serverPath, 'utf8')
const storeRuntime = '<script src="/store-platform-v503.js?v=503-final" defer></script>'
server = replaceExact(
  server,
  storeRuntime,
  `${storeRuntime}<script src="/broadcast-layout-v510.js?v=510-final" defer></script>`,
  1,
  'server browser runtime injection',
)

const readyMarker = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Chat-Message-UX', 'v509')"
server = replaceExact(
  server,
  readyMarker,
  `${readyMarker}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Broadcast-Layout', 'v510')`,
  1,
  'readiness marker',
)
fs.writeFileSync(serverPath, server)

const layoutLoader = `
;(() => { /* broadcast-layout-v510-loader */
  const load = () => {
    if (document.getElementById('broadcast-layout-v510-loader')) return
    const script = document.createElement('script')
    script.id = 'broadcast-layout-v510-loader'
    script.src = '/broadcast-layout-v510.js?v=510-final'
    script.async = true
    document.head.appendChild(script)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true })
  else load()
})()
`

let layoutRuntime = fs.readFileSync(oldLayoutPath, 'utf8')
if (layoutRuntime.includes('broadcast-layout-v510-loader')) {
  throw new Error('broadcast-layout-v510: reviewed layout already contains the v510 loader')
}
layoutRuntime += layoutLoader
fs.writeFileSync(newLayoutPath, layoutRuntime)
const layoutReferences = replaceNextReferences(oldLayoutName, newLayoutName)

console.log(`broadcast-layout-v510 runtime patched (${layoutReferences.references} layout references)`)
