import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = {
  Accept: 'text/html',
  'Cache-Control': 'no-cache',
  'User-Agent': 'ORIMIA-customer-navigation-privacy-v546-smoke/1.0',
}

async function get(pathname, extraHeaders = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers: { ...headers, ...extraHeaders }, cache: 'no-store' })
  assert.equal(response.status, 200, `${pathname}: expected 200, received ${response.status}`)
  return response
}

const ready = await get('/api/health/ready?smoke=v546')
assert.equal(ready.headers.get('x-lien-customer-navigation-privacy'), 'v546')
assert.equal(ready.headers.get('x-lien-customer-profile-auto-upload'), 'v545')
assert.equal(ready.headers.get('x-lien-customer-registration-single-loader'), 'v544')
assert.equal(ready.headers.get('x-lien-wholesale-ordering'), 'v543')

const shell = await (await get('/shell-consistency-v518.js?v=546-navigation-privacy1&smoke=v546')).text()
assert.match(shell, /window\.__orimiaCustomerNavigateBackV546/)
assert.match(shell, /key === CUSTOMER_STACK_KEY && samePage/)

const experience = await (await get('/customer-experience-v503.js?v=546-navigation-privacy1&smoke=v546')).text()
assert.match(experience, /window\.__orimiaCustomerNavigateBackV546\(fallback\)/)
assert.doesNotMatch(experience, /if \(history\.length > 1\) history\.back\(\)/)

const clientChunk = await (await get('/_next/static/chunks/6012-community-customer-privacy-v546.js?smoke=v546')).text()
assert.match(clientChunk, /"staff"===s[^]*?公開中[^]*?:null/)

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': headers['User-Agent'] },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/community' }),
})
assert.ok([302, 303].includes(login.status), `unexpected login redirect: ${login.status}`)
const cookie = login.headers.get('set-cookie')?.split(';')[0]
assert.ok(cookie)

const community = await get('/u/community?smoke=v546', { Cookie: cookie })
const communityHtml = await community.text()
const detailHref = communityHtml.match(/href="(\/u\/community\/[^"?#]+)"/)?.[1]
if (detailHref) {
  const detail = await get(`${detailHref}?smoke=v546`, { Cookie: cookie })
  const detailHtml = await detail.text()
  assert.match(detailHtml, /6012-community-customer-privacy-v546\.js/)
  assert.doesNotMatch(detailHtml, /公開中/)
}

console.log(JSON.stringify({
  release: 'customer-navigation-privacy-v546',
  productionVerified: true,
  customerCommunityDetailChecked: Boolean(detailHref),
  pageAwareNavigationAssets: true,
}))
