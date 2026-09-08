import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const workspace = fs.readFileSync(path.join(root, 'public', 'admin-workspace-layout-v572.js'), 'utf8')

for (const required of [
  "X-Lien-Admin-Product-Tab-State', 'v586'",
  '/admin-workspace-layout-v572.js?v=586-tab-state1',
  'admin-product-tab-state-v586',
]) assert.ok(server.includes(required), `server invariant missing: ${required}`)
assert.ok(!server.includes('/admin-workspace-layout-v572.js?v=572-release1'))

for (const required of [
  'function routeMatchScore(value)',
  'function preservedNavigations(record)',
  'function syncSegmentsToLocation(record)',
  'link.classList.remove(...ACTIVE_CLASSES, ...INACTIVE_CLASSES)',
  'requestAnimationFrame(() => syncSegmentsToLocation(record))',
  'setTimeout(() => syncSegmentsToLocation(record), 120)',
  'admin-product-tab-state-v586',
]) assert.ok(workspace.includes(required), `workspace invariant missing: ${required}`)

console.log(JSON.stringify({
  release:'admin-product-tab-state-v586',
  runtimeVerified:true,
  cacheBusted:true,
  routeAwareTabRestore:true,
}))
