import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function collectFiles(directory, predicate, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, predicate, output)
    else if (predicate(fullPath, entry.name)) output.push(fullPath)
  }
  return output
}

function replaceNextReferences(oldValue, newValue, label) {
  let files = 0
  let references = 0
  for (const file of collectFiles(nextRoot, (_fullPath, name) => name.endsWith('.js') || name.endsWith('.json'))) {
    const source = fs.readFileSync(file, 'utf8')
    const count = source.split(oldValue).length - 1
    if (!count) continue
    fs.writeFileSync(file, source.split(oldValue).join(newValue))
    files += 1
    references += count
  }
  if (!files || !references) throw new Error(`${label}: no manifest references were updated`)
  return { files, references }
}

let commercial = fs.readFileSync(commercialPath, 'utf8')
commercial = replaceExact(
  commercial,
  `  function organize() {
    frame = 0
    if (location.pathname !== '/admin/settings' || new URLSearchParams(location.search).get('embedded') === '1') return
    const main = document.querySelector('main')`,
  `  function cleanup() {
    document.getElementById(PANEL_ID)?.remove()
    document.querySelectorAll('[data-external-source-hidden-v492]').forEach(source => {
      source.hidden = false
      source.removeAttribute('aria-hidden')
      source.removeAttribute('data-external-source-hidden-v492')
      source.parentElement?.classList.remove('external-v492-source-grid')
    })
  }

  function organize() {
    frame = 0
    const settingsRoute = location.pathname === '/admin/settings'
      && new URLSearchParams(location.search).get('embedded') !== '1'
    if (!settingsRoute) {
      cleanup()
      if (location.pathname !== '/admin/settings') document.documentElement.classList.remove('lien-settings-v447')
      return
    }
    const main = document.querySelector('main')`,
  1,
  'route-scoped external integrations cleanup',
)
commercial += '\n/* route-scoped-settings-v517 */\n'
fs.writeFileSync(commercialPath, commercial)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Ui-Transition-Consistency', 'v516')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Ui-Transition-Consistency', 'v516')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Route-Scoped-Settings', 'v517')`,
  1,
  'route-scoped settings readiness marker',
)
server += '\n/* route-scoped-settings-v517 */\n'
fs.writeFileSync(serverPath, server)

const oldLayoutName = 'layout-runtime-v516-release5.js'
const newLayoutName = 'layout-runtime-v517-release1.js'
const oldLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', oldLayoutName)
const newLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', newLayoutName)
let layout = fs.readFileSync(oldLayoutPath, 'utf8')
layout = replaceExact(
  layout,
  '/commercial-admin-v136.js?v=20260901-516-release3',
  '/commercial-admin-v136.js?v=20260901-517-release1',
  1,
  'admin commercial route-cleanup cache key',
)
layout += '\n/* route-scoped-settings-v517 */\n'
fs.writeFileSync(newLayoutPath, layout)
const layoutReferences = replaceNextReferences(oldLayoutName, newLayoutName, 'route-scoped settings layout activation')

console.log(JSON.stringify({
  release: 'route-scoped-settings-v517',
  layoutReferences,
}))
