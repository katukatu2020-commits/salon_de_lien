import assert from 'node:assert/strict'
const base = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'
const ready = await fetch(base + '/api/health/ready', { signal: AbortSignal.timeout(20000) })
assert.equal(ready.status, 200)
for (const [key, value] of [['X-Lien-Salon-Branch-Inquiry','v675'], ['X-Lien-Customer-Desktop-Quality','v674'], ['X-Lien-Salon-Group-Master','v672'], ['X-Lien-Dealer-Sales-Team','v671']]) assert.equal(ready.headers.get(key), value)
const client = await fetch(base + '/salon-group-master-v672-client.js?v=675-1', { signal: AbortSignal.timeout(20000) })
assert.equal(client.status, 200)
const js = await client.text()
assert.match(js, /新店舗登録の申請を受け付けました/)
assert.doesNotMatch(js, /result.initialPassword/)
for (const pathname of ['/admin/salon-master', '/platform/inquiries']) {
  const response = await fetch(base + pathname, { redirect: 'manual', signal: AbortSignal.timeout(20000) })
  assert.equal(response.status, 302)
  assert.match(response.headers.get('location'), /login/)
}
console.log('v675 production read-only smoke passed')
