import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const client = fs.readFileSync(`${root}/public/content-edit-delete-client-v477.js`, 'utf8')

assert.match(client, /new MutationObserver\(mutations =>/)
assert.match(client, /mutation\.addedNodes\.length \|\| mutation\.removedNodes\.length/)
assert.match(client, /schedule\(\)/)
assert.match(client, /if \(document\.querySelector\('\[data-lien-style-grid-managed-v471\]'\)\) return/)
assert.match(client, /if \(window\.__lienStyleGridLoadingV471\) return/)
assert.equal((client.match(/communityRouteObserver\.observe/g) || []).length, 1)

console.log('style community route runtime tests passed')
