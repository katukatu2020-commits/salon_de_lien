import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const client = fs.readFileSync(`${root}/public/content-edit-delete-client-v482.js`, 'utf8')
const service = fs.readFileSync(process.env.LIEN_CONTENT_SERVICE || `${root}/content-management-v465.js`, 'utf8')
const staffRuntime = fs.readFileSync(`${root}/admin-staff-experience-v276.js`, 'utf8')
const chunkSources = fs.readdirSync(`${root}/.next/server/chunks`)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(`${root}/.next/server/chunks/${name}`, 'utf8'))
const shell = chunkSources.find(source => source.includes('"data-lien-community-bootstrap": "v482"'))

assert.ok(shell)
assert.equal((shell.match(/content-edit-delete-client-v482\.js/g) || []).length, 1)
assert.ok(!shell.includes('content-edit-delete-client-v481.js'))
assert.match(staffRuntime, /__lienStyleCommunityLoaderV482/)
assert.match(staffRuntime, /content-edit-delete-client-v482\.js/)
assert.doesNotMatch(staffRuntime, /content-edit-delete-client-v481\.js/)
assert.match(client, /const postById = new Map/)
assert.match(client, /const publicCards = \[\]/)
assert.match(client, /const supplementalPosts = posts\.filter/)
assert.match(client, /grid\.replaceChildren\(\.\.\.publicCards, \.\.\.supplementalCards\)/)
assert.match(client, /const renderedCount = publicCards\.length \+ supplementalCards\.length/)
assert.match(client, /document\.addEventListener\('click', useStableCommunityNavigation, true\)/)
assert.match(client, /location\.assign\(url\.href\)/)
assert.match(client, /emptyState\?\.isConnected && !resultSection\.contains\(emptyState\)/)
assert.match(client, /data-lien-style-grid-managed-v482/)
assert.match(service, /ADD COLUMN IF NOT EXISTS "deletedAt"/)
assert.match(service, /ADD COLUMN IF NOT EXISTS "deletedByUserId"/)
assert.match(service, /p\."deletedAt" IS NULL/)
assert.match(service, /SET "published"=FALSE,"deletedAt"=CURRENT_TIMESTAMP,"deletedByUserId"=\$1/)
assert.doesNotMatch(service, /DELETE FROM "VisitCommunityPost"/)

console.log('style community recovery runtime tests passed')
