import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const client = fs.readFileSync(`${root}/public/content-edit-delete-client-v481.js`, 'utf8')
const staffRuntime = fs.readFileSync(`${root}/admin-staff-experience-v276.js`, 'utf8')
const chunkSources = fs.readdirSync(`${root}/.next/server/chunks`)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(`${root}/.next/server/chunks/${name}`, 'utf8'))
const shell = chunkSources.find(source => source.includes('"data-lien-community-bootstrap": "v481"'))

assert.ok(shell)
assert.equal((shell.match(/content-edit-delete-client-v481\.js/g) || []).length, 1)
assert.ok(!shell.includes('content-edit-delete-client-v480.js'))
assert.match(staffRuntime, /__lienStyleCommunityLoaderV481/)
assert.match(staffRuntime, /content-edit-delete-client-v481\.js/)
assert.match(client, /const postById = new Map/)
assert.match(client, /const publicCards = \[\]/)
assert.match(client, /const supplementalPosts = posts\.filter/)
assert.match(client, /grid\.replaceChildren\(\.\.\.publicCards, \.\.\.supplementalCards\)/)
assert.match(client, /const renderedCount = publicCards\.length \+ supplementalCards\.length/)
assert.match(client, /document\.addEventListener\('click', useStableCommunityNavigation, true\)/)
assert.match(client, /location\.assign\(url\.href\)/)
assert.match(client, /emptyState\?\.isConnected && !resultSection\.contains\(emptyState\)/)
assert.match(client, /data-lien-style-grid-managed-v481/)

console.log('style community route and merge runtime tests passed')
