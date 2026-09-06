import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const detailPath = '/u/community/showcase-yohaku-community-post-001'

const ready = await fetch(`${baseUrl}/api/health/ready`, {
  headers: { 'Cache-Control': 'no-cache' },
})
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-style-detail-navigation'), 'v551')
assert.equal(ready.headers.get('x-lien-owner-shared-switch'), 'v550')

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: detailPath }),
})
assert.equal(login.status, 303)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const detail = await fetch(`${baseUrl}${detailPath}?smoke=v551`, {
  headers: { cookie, Accept: 'text/html', 'Cache-Control': 'no-cache' },
})
assert.equal(detail.status, 200)
const html = await detail.text()
assert.doesNotMatch(html, /スタイル一覧へ/)
assert.match(html, /shell-consistency-v518\.js\?v=551-release1/)

const shell = await fetch(`${baseUrl}/shell-consistency-v518.js?v=551-release1`, {
  headers: { 'Cache-Control': 'no-cache' },
})
assert.equal(shell.status, 200)
const shellSource = await shell.text()
assert.match(shellSource, /routes\.splice\(existingIndex \+ 1\)/)
assert.match(shellSource, /style-detail-navigation-v551/)

console.log(JSON.stringify({
  release: 'style-detail-navigation-v551',
  productionReady: true,
  duplicateRemoved: true,
  historyReconciled: true,
}))
