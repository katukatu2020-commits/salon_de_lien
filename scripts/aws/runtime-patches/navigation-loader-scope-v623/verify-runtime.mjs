import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { navigationLoaderFragments } from './loader-scope-transform.mjs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const marker = 'navigation-loader-scope-v623'
const oldAdminLayoutName = 'layout-runtime-v518-release1.navigation-loading-v536-release1.admin-sidebar-labels-v578.js'
const newAdminLayoutName = `${oldAdminLayoutName.slice(0, -3)}.${marker}.js`
const oldCustomerLayoutName = 'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.js'
const newCustomerLayoutName = `${oldCustomerLayoutName.slice(0, -3)}.${marker}.js`

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
const adminLayout = read(`.next/static/chunks/app/${newAdminLayoutName}`)
const customerLayout = read(`.next/static/chunks/app/${newCustomerLayoutName}`)

for (const [label, source] of [
  ['public transition', publicScript],
  ['admin transition', adminLayout],
  ['customer transition', customerLayout],
]) {
  assert.match(source, /__orimiaUiTransitionV623/, `${label}: v623 guard is missing`)
  assert.match(source, /orimiaNavigationLoaderScope = 'v623'/, `${label}: scope marker is missing`)
  assert.match(source, /window\.addEventListener\('click', event => \{/, `${label}: post-handler click listener is missing`)
  assert.equal(source.includes(navigationLoaderFragments.oldClickListener), false, `${label}: capture click listener remains`)
  assert.equal(source.includes(navigationLoaderFragments.newClickListener), true, `${label}: scoped click listener is missing`)
  assert.match(source, /if \(event\.defaultPrevented/, `${label}: cancelled events are not ignored`)
  assert.match(source, /history\[method\] = function/, `${label}: route navigation tracking was lost`)
}

assert.equal(count(server, '/ui-transition-v623.js?v=623-release1'), 2)
assert.equal(count(server, '/ui-transition-v536.js?v=536-release1'), 0)
assert.equal(count(server, 'X-Lien-Navigation-Loader-Scope'), 1)
assert.match(server, /X-Lien-Navigation-Loader-Scope', 'v623'/)
assert.match(server, /X-Lien-Auto-Split-Orders', 'v622'/)
assert.match(adminLayout, /admin-sidebar-labels-v578/)

let oldAdminReferences = 0
let newAdminReferences = 0
let oldCustomerReferences = 0
let newCustomerReferences = 0
for (const filePath of collectFiles(nextRoot)) {
  const source = fs.readFileSync(filePath, 'utf8')
  oldAdminReferences += count(source, oldAdminLayoutName)
  newAdminReferences += count(source, newAdminLayoutName)
  oldCustomerReferences += count(source, oldCustomerLayoutName)
  newCustomerReferences += count(source, newCustomerLayoutName)
}
assert.equal(oldAdminReferences, 0, 'stale admin layout references remain')
assert.equal(oldCustomerReferences, 0, 'stale customer layout references remain')
assert.ok(newAdminReferences > 0, 'scoped admin layout is not active')
assert.ok(newCustomerReferences > 0, 'scoped customer layout is not active')

for (const relativePath of [
  'server.js',
  'public/ui-transition-v623.js',
  `.next/static/chunks/app/${newAdminLayoutName}`,
  `.next/static/chunks/app/${newCustomerLayoutName}`,
]) {
  const filePath = path.join(root, relativePath)
  const result = spawnSync(process.execPath, ['--check', filePath], { encoding: 'utf8' })
  assert.equal(result.status, 0, `${relativePath}: ${result.stderr || result.stdout}`)
}

console.log(JSON.stringify({
  release: marker,
  runtimeVerified: true,
  newAdminReferences,
  newCustomerReferences,
}))
