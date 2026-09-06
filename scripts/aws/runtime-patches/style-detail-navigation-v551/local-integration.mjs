import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3123').replace(/\/$/, '')
const detailPath = '/u/community/showcase-yohaku-community-post-001'

function sessionCookie(response) {
  const value = response.headers.get('set-cookie') || ''
  const cookie = value.split(';')[0]
  assert.match(cookie, /^[^=]+=/)
  return cookie
}

const ready = await fetch(`${baseUrl}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-style-detail-navigation'), 'v551')
assert.equal(ready.headers.get('x-lien-owner-shared-switch'), 'v550')

const customerLogin = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: detailPath }),
})
assert.equal(customerLogin.status, 303)
const customerCookie = sessionCookie(customerLogin)

const customerDetail = await fetch(`${baseUrl}${detailPath}`, {
  headers: { cookie: customerCookie, Accept: 'text/html', 'Cache-Control': 'no-cache' },
})
assert.equal(customerDetail.status, 200)
const customerHtml = await customerDetail.text()
assert.doesNotMatch(customerHtml, /スタイル一覧へ/)
assert.match(customerHtml, /shell-consistency-v518\.js\?v=551-release1/)

const shell = await fetch(`${baseUrl}/shell-consistency-v518.js?v=551-release1`, { cache: 'no-store' })
assert.equal(shell.status, 200)
const shellSource = await shell.text()
assert.match(shellSource, /routes\.splice\(existingIndex \+ 1\)/)
assert.match(shellSource, /style-detail-navigation-v551/)

const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community/showcase-yohaku-community-post-001' }),
})
assert.equal(adminLogin.status, 303)
const adminDetail = await fetch(`${baseUrl}/admin/community/showcase-yohaku-community-post-001`, {
  headers: { cookie: sessionCookie(adminLogin), Accept: 'text/html', 'Cache-Control': 'no-cache' },
})
assert.equal(adminDetail.status, 200)
assert.match(await adminDetail.text(), /スタイル一覧へ/)

console.log(JSON.stringify({
  release: 'style-detail-navigation-v551',
  customerDuplicateRemoved: true,
  customerHistoryReconciled: true,
  adminUnaffected: true,
}))
