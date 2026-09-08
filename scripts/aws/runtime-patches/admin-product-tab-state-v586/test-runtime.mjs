import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const currentWorkspace = fs.readFileSync(path.join(root, 'public', 'admin-workspace-layout-v572.js'), 'utf8')
const nextWorkspace = fs.readFileSync(path.join(patchRoot, 'admin-workspace-layout-v572.js'), 'utf8')

assert.ok(server.includes("X-Lien-Dealer-Order-Product-Ui', 'v585'"))
assert.ok(server.includes('/admin-workspace-layout-v572.js?v=572-release1'))
assert.ok(!server.includes('admin-product-tab-state-v586'))
assert.ok(!currentWorkspace.includes('admin-product-tab-state-v586'))

for (const required of [
  'function routeMatchScore(value)',
  'function preservedNavigations(record)',
  'function syncSegmentsToLocation(record)',
  'syncSegmentsToLocation(record)',
  'requestAnimationFrame(() => syncSegmentsToLocation(record))',
  'setTimeout(() => syncSegmentsToLocation(record), 120)',
  'admin-product-tab-state-v586',
]) assert.ok(nextWorkspace.includes(required), `next workspace invariant missing: ${required}`)

console.log(JSON.stringify({ release:'admin-product-tab-state-v586', parentVerified:true, sourceVerified:true }))
