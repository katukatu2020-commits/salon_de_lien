import assert from 'node:assert/strict'
import fs from 'node:fs'

const patch = fs.readFileSync(new URL('./patch-runtime.mjs', import.meta.url), 'utf8')

assert.match(patch, /activeKey = params\.get\('section'\) === 'billing'/)
assert.match(patch, /linkKey === activeKey/)
assert.match(patch, /link\.setAttribute\('aria-current', 'page'\)/)
assert.match(patch, /link\.removeAttribute\('aria-current'\)/)
assert.match(patch, /ownerTabActiveClasses/)
assert.match(patch, /ownerTabInactiveClasses/)
assert.match(patch, /addEventListener\('pageshow', enhance\)/)

console.log(JSON.stringify({ release:'owner-billing-tab-v577', selectionRules:true, restoredPageSync:true }))
