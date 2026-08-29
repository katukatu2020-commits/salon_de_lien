import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = fs.readFileSync(`${root}/ui-workflows-v294.js`, 'utf8')
const lifecycleStart = source.indexOf("  const boot = () => {\n    if (location.pathname !== '/u/chat') cleanupCustomerChatPortal()")
const lifecycleEnd = source.indexOf('\n})()', lifecycleStart)
assert.ok(lifecycleStart >= 0, 'customer chat boot block must exist')
assert.ok(lifecycleEnd > lifecycleStart, 'customer chat lifecycle boundary must exist')
const lifecycle = source.slice(lifecycleStart, lifecycleEnd)

assert.doesNotMatch(lifecycle, /MutationObserver/)
assert.doesNotMatch(lifecycle, /setInterval\(boot/)
assert.match(lifecycle, /history\[method\] = function/)
assert.match(lifecycle, /pageshow/)
assert.match(lifecycle, /popstate/)
assert.equal((source.match(/customer-chat-open-v468/g) || []).length, 1)

console.log('customer chat open v468 lifecycle tests passed')
