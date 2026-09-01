import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const publicSite = fs.readFileSync(`${root}/public-site.js`, 'utf8')
const server = fs.readFileSync(`${root}/server.js`, 'utf8')
const icon = fs.readFileSync(`${root}/public/brand/orimia-icon-192.png`)

assert.match(publicSite, /<a class="wordmark" href="\/" aria-label="ORIMIA トップ">/)
assert.match(publicSite, /<span class="mark" aria-hidden="true"><img src="\/brand\/orimia-icon-192\.png\?v=511" alt="" width="42" height="42" decoding="async"><\/span>/)
assert.match(publicSite, /\.mark img\{display:block;width:100%;height:100%;object-fit:contain\}/)
assert.match(publicSite, /\.mark\{display:block;width:42px;height:42px;flex:0 0 auto;background:transparent;line-height:0\}/)
assert.doesNotMatch(publicSite, /<span class="mark">L<\/span>/)
assert.doesNotMatch(publicSite, /\.mark\{[^}]*background:var\(--brown\)/)

assert.equal((server.match(/X-Lien-Public-Brand-Icon/g) || []).length, 1)
assert.match(server, /X-Lien-Public-Brand-Icon', 'v511'/)
assert.match(server, /X-Lien-Broadcast-Layout', 'v510'/)
assert.match(server, /X-Lien-Chat-Message-UX', 'v509'/)

assert.ok(icon.length > 10_000, 'ORIMIA icon asset is unexpectedly small')
assert.deepEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])

console.log('public-brand-icon-v511 runtime verified')
