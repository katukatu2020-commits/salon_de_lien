import fs from 'node:fs'
import path from 'node:path'

const workflowPath = '/app/ui-workflows-v294.js'
const layoutName = 'layout-customer-chat-v393.js'
const staleLayoutName = 'layout-community-aspect-v383.js'
const layoutPath = `/app/.next/static/chunks/app/u/(account)/${layoutName}`

const workflow = fs.readFileSync(workflowPath, 'utf8')
for (const marker of [
  'const state = {',
  'threads: [],',
  'activeThreadId: null,',
  'function syncCustomerNavigationState()',
  'syncCustomerNavigationState()\n    initCustomerChat()',
]) {
  if (!workflow.includes(marker)) throw new Error(`customer workflow marker missing: ${marker}`)
}
if ((workflow.match(/const state = \{/g) || []).length !== 1) {
  throw new Error('customer chat state must be initialized exactly once')
}
new Function(workflow)

const layout = fs.readFileSync(layoutPath, 'utf8')
if (!layout.includes('ui-workflows-v294.js?v=393')) throw new Error('v393 workflow cache key is missing')
if (layout.includes('ui-workflows-v294.js?v=366')) throw new Error('stale workflow cache key remains')
new Function(layout)

let manifestReferences = 0
function verifyManifests(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      verifyManifests(target)
      continue
    }
    if (!entry.isFile() || !/\.(?:json|js)$/.test(entry.name)) continue
    const source = fs.readFileSync(target, 'utf8')
    if (source.includes(layoutName)) manifestReferences += 1
    if (source.includes(staleLayoutName)) throw new Error(`${target}: stale customer layout reference remains`)
  }
}
verifyManifests('/app/.next')
if (manifestReferences === 0) throw new Error('no manifest references the v393 customer layout')

console.log(`customer chat state/navigation v393 verified (${manifestReferences} manifest references)`)
