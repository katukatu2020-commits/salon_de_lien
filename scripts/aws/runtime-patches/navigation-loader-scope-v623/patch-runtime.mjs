import fs from 'node:fs'
import path from 'node:path'
import { scopeNavigationLoader } from './loader-scope-transform.mjs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const publicRoot = path.join(root, 'public')
const serverPath = path.join(root, 'server.js')
const marker = 'navigation-loader-scope-v623'

const oldPublicName = 'ui-transition-v536.js'
const newPublicName = 'ui-transition-v623.js'
const oldAdminLayoutName = 'layout-runtime-v518-release1.navigation-loading-v536-release1.admin-sidebar-labels-v578.js'
const newAdminLayoutName = `${oldAdminLayoutName.slice(0, -3)}.${marker}.js`
const oldCustomerLayoutName = 'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.js'
const newCustomerLayoutName = `${oldCustomerLayoutName.slice(0, -3)}.${marker}.js`

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function collectFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, output)
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) output.push(fullPath)
  }
  return output
}

function replaceNextReferences(before, after, label) {
  let files = 0
  let references = 0
  for (const filePath of collectFiles(nextRoot)) {
    const source = fs.readFileSync(filePath, 'utf8')
    const count = source.split(before).length - 1
    if (!count) continue
    fs.writeFileSync(filePath, source.split(before).join(after))
    files += 1
    references += count
  }
  if (!files || !references) throw new Error(`${label}: no active references were updated`)
  return { files, references }
}

const oldScript = fs.readFileSync(path.join(publicRoot, oldPublicName), 'utf8')
const newScript = scopeNavigationLoader(oldScript)
fs.writeFileSync(path.join(publicRoot, newPublicName), `${newScript}\n/* ${marker} */\n`)

function writeScopedLayout(oldName, newName, label) {
  const oldPath = path.join(nextRoot, 'static', 'chunks', 'app', oldName)
  const newPath = path.join(nextRoot, 'static', 'chunks', 'app', newName)
  const source = fs.readFileSync(oldPath, 'utf8')
  const patched = replaceExact(source, oldScript, newScript, 1, `${label} transition runtime`)
  fs.writeFileSync(newPath, `${patched}\n/* ${marker} */\n`)
  return replaceNextReferences(oldName, newName, `${label} asset activation`)
}

const adminLayoutReferences = writeScopedLayout(oldAdminLayoutName, newAdminLayoutName, 'admin layout')
const customerLayoutReferences = writeScopedLayout(oldCustomerLayoutName, newCustomerLayoutName, 'customer layout')

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  '/ui-transition-v536.js?v=536-release1',
  '/ui-transition-v623.js?v=623-release1',
  2,
  'standalone transition cache key',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Auto-Split-Orders', 'v622') /* auto-split-orders-v622-ready */`
server = replaceExact(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Navigation-Loader-Scope', 'v623') /* ${marker}-ready */`,
  1,
  'navigation loader readiness marker',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({
  release: marker,
  newPublicName,
  newAdminLayoutName,
  newCustomerLayoutName,
  adminLayoutReferences,
  customerLayoutReferences,
}))
