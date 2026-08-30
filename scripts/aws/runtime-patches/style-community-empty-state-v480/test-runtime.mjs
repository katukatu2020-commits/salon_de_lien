import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const client = fs.readFileSync(`${root}/public/content-edit-delete-client-v480.js`, 'utf8')
const chunkSources = fs.readdirSync(`${root}/.next/server/chunks`)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(`${root}/.next/server/chunks/${name}`, 'utf8'))
const shell = chunkSources.find(source => source.includes('"data-lien-community-bootstrap": "v480"'))

assert.ok(shell)
assert.equal((shell.match(/content-edit-delete-client-v480\.js/g) || []).length, 1)
assert.ok(!shell.includes('content-edit-delete-client-v479.js'))
assert.match(client, /const posts = Array\.isArray\(payload\.posts\) \? payload\.posts : \[\]/)
assert.match(client, /grid\.replaceChildren\(\.\.\.posts\.map\(post => buildManagedCard\(post, hiddenMedia\(post\)\)\)\)/)
assert.match(client, /resultSection\.replaceChildren\(summary, grid\)/)
assert.match(client, /emptyState\?\.isConnected && !resultSection\.contains\(emptyState\)/)
assert.match(client, /data-lien-style-grid-managed-v480/)
assert.doesNotMatch(client, /if \(document\.querySelector\('\[data-lien-style-grid-managed-v471\]'\)\) return/)

console.log('style community empty-state runtime tests passed')
