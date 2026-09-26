import assert from 'node:assert/strict'
const base = process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com'
const ready = await fetch(base + '/api/health/ready')
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-partner-chat'), 'v682')
assert.equal(ready.headers.get('x-lien-dealer-stock-note'), 'v681')
assert.equal(ready.headers.get('x-lien-three-app-qa'), 'v680')
for (const [path, marker] of [
  ['/dealer-erp-v678-partner-chat-client-v682.js?v=682-1', 'chat-send'],
  ['/dealer-erp-v678-partner-chat-v682.css?v=682-1', '.pc-shell'],
  ['/dealer-erp-v678-order-entry-v682.js?v=682-1', 'チャットを開く'],
  ['/inventory-orders-common-layout-v572.partner-chat-v682.js?v=682-1', 'orimia:hydrated-v680']
]) {
  const response = await fetch(base + path)
  assert.equal(response.status, 200, path)
  assert.ok((await response.text()).includes(marker), path)
}
assert.equal((await fetch(base + '/api/dealer/erp/chat-partners')).status, 401)
assert.equal((await fetch(base + '/api/admin/wholesale/erp/chat-partners?dealer=unknown')).status, 401)
assert.equal((await fetch(base + '/dealer/login')).status, 200)
console.log('PASS: production read-only chat assets, release markers, authentication and preserved prior fixes')
