import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const adminLayoutName = 'layout-runtime-v518-release1.navigation-loading-v536-release1.admin-sidebar-labels-v578.navigation-loader-scope-v623.js'
const customerLayoutName = 'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.navigation-loader-scope-v623.js'
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')
const count = (source, value) => source.split(value).length - 1

function collectFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, output)
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) output.push(fullPath)
  }
  return output
}

const server = read('server.js')
const publicScript = read('public/ui-transition-v623.js')
const adminLayout = read(`.next/static/chunks/app/${adminLayoutName}`)
const customerLayout = read(`.next/static/chunks/app/${customerLayoutName}`)

assert.equal(count(server, 'X-Lien-Navigation-Loader-Verified'), 1)
assert.match(server, /X-Lien-Navigation-Loader-Verified', 'v624'/)
assert.match(server, /X-Lien-Navigation-Loader-Scope', 'v623'/)
assert.match(server, /X-Lien-Auto-Split-Orders', 'v622'/)
assert.equal(count(server, '/ui-transition-v623.js?v=623-release1'), 2)

for (const [label, source] of [
  ['public transition', publicScript],
  ['admin transition', adminLayout],
  ['customer transition', customerLayout],
]) {
  assert.match(source, /__orimiaUiTransitionV623/, `${label}: v623 runtime is missing`)
  assert.match(source, /window\.addEventListener\('click', event => \{/, `${label}: post-handler link scope is missing`)
  assert.match(source, /if \(event\.defaultPrevented/, `${label}: cancelled actions are not excluded`)
}

let adminReferences = 0
let customerReferences = 0
for (const filePath of collectFiles(nextRoot)) {
  const source = fs.readFileSync(filePath, 'utf8')
  adminReferences += count(source, adminLayoutName)
  customerReferences += count(source, customerLayoutName)
}
assert.ok(adminReferences > 0, 'v623 admin layout is not active')
assert.ok(customerReferences > 0, 'v623 customer layout is not active')

for (const relativePath of [
  'server.js',
  'public/ui-transition-v623.js',
  `.next/static/chunks/app/${adminLayoutName}`,
  `.next/static/chunks/app/${customerLayoutName}`,
]) {
  const filePath = path.join(root, relativePath)
  const result = spawnSync(process.execPath, ['--check', filePath], { encoding: 'utf8' })
  assert.equal(result.status, 0, `${relativePath}: ${result.stderr || result.stdout}`)
}

console.log(JSON.stringify({
  release: 'navigation-loader-verification-v624',
  runtimeVerified: true,
  adminReferences,
  customerReferences,
}))
